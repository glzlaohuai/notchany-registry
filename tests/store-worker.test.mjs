import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import worker, {
  createStoreWorker,
  isCommercialPath,
  isRestrictedBackendPath,
} from "../store-worker/worker.js";

function environment(assetResponse = new Response("asset"), options = {}) {
  const seen = [];
  return {
    seen,
    COMMERCIAL: {
      async fetch(request) {
        seen.push({ binding: "commercial", request });
        if (options.failCommercial) throw new Error("commercial unavailable");
        const response = new Response("commercial", {
          status: 207,
          headers: { Location: "/account", "Set-Cookie": "na_web=one; Path=/account" },
        });
        response.headers.append("Set-Cookie", "na_csrf=two; Path=/account");
        return response;
      },
    },
    ASSETS: {
      async fetch(request) {
        seen.push({ binding: "assets", request });
        return assetResponse.clone();
      },
    },
  };
}

test("HTML 响应保留正文并设置短缓存与安全响应头", async () => {
  const response = await worker.fetch(
    new Request("https://notchany-store.example/en/"),
    environment(new Response("<h1>Store</h1>", {
      headers: { "Content-Type": "text/html; charset=utf-8", ETag: '"v1"' },
    })),
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "<h1>Store</h1>");
  assert.equal(response.headers.get("ETag"), '"v1"');
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=300, stale-while-revalidate=86400, no-transform");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.match(response.headers.get("Content-Security-Policy") ?? "", /frame-ancestors 'none'/);
});

test("静态图片使用较长缓存", async () => {
  const response = await worker.fetch(
    new Request("https://notchany-store.example/assets/icon.png"),
    environment(new Response("png", { headers: { "Content-Type": "image/png" } })),
  );
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=3600, stale-while-revalidate=86400");
});

test("未知公开路径保持真实 404 且不长时间缓存", async () => {
  const response = await worker.fetch(
    new Request("https://notchany-store.example/missing"),
    environment(new Response("not found", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })),
  );
  assert.equal(response.status, 404);
  assert.equal(await response.text(), "not found");
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=60, no-transform");
});

test("www 永久跳转到规范根域并保留路径与查询", async () => {
  const response = await worker.fetch(
    new Request("https://www.notchany.com/en/packages/owner/demo/?q=one"),
    environment(),
  );
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("Location"), "https://notchany.com/en/packages/owner/demo/?q=one");
});

test("静态站拒绝写方法", async () => {
  const response = await worker.fetch(
    new Request("https://notchany-store.example/", { method: "POST" }),
    environment(),
  );
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "GET, HEAD");
});

test("only account and auth paths are private commercial routes", () => {
  for (const path of ["/account", "/account/", "/account/api/session", "/auth/authorize", "/auth/sign-in.css"]) {
    assert.equal(isCommercialPath(path), true, path);
  }
  for (const path of ["/", "/accounting", "/authorization", "/v1/account", "/health", "/internal/market/pr-authorize"]) {
    assert.equal(isCommercialPath(path), false, path);
  }
});

test("business API namespaces are rejected at the store boundary", () => {
  for (const path of ["/v1", "/v1/account", "/v1/webhooks/lemonsqueezy", "/health", "/internal", "/internal/market/pr-authorize"]) {
    assert.equal(isRestrictedBackendPath(path), true, path);
  }
  for (const path of ["/", "/account", "/auth/authorize", "/healthcheck", "/internal-tools"]) {
    assert.equal(isRestrictedBackendPath(path), false, path);
  }
});

test("commercial forwarding preserves URL, method, body, redirects, and all cookies", async () => {
  const bindings = environment();
  const request = new Request("https://notchany.com/auth/providers/apple/callback?state=s", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Host: "notchany.com",
    },
    body: "state=s&code=c",
  });
  const response = await createStoreWorker().fetch(request, bindings);

  assert.equal(response.status, 207);
  assert.equal(response.headers.get("Location"), "/account");
  assert.deepEqual(response.headers.getSetCookie(), [
    "na_web=one; Path=/account",
    "na_csrf=two; Path=/account",
  ]);
  assert.equal(bindings.seen.length, 1);
  assert.equal(bindings.seen[0].binding, "commercial");
  assert.equal(bindings.seen[0].request.url, request.url);
  assert.equal(bindings.seen[0].request.method, "POST");
  assert.equal(bindings.seen[0].request.headers.get("Host"), "notchany.com");
  assert.equal(await bindings.seen[0].request.text(), "state=s&code=c");
});

test("public paths use assets while backend paths return a non-cacheable 404", async () => {
  const bindings = environment();
  for (const path of ["/", "/packages/alice/demo/"]) {
    const response = await worker.fetch(new Request(`https://notchany.com${path}`), bindings);
    assert.equal(await response.text(), "asset");
  }
  for (const path of ["/v1/account", "/v1/webhooks/lemonsqueezy", "/health", "/internal/market/pr-authorize"]) {
    const response = await worker.fetch(new Request(`https://notchany.com${path}`), bindings);
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get("Cache-Control"), "no-store", path);
    assert.deepEqual(await response.json(), { code: "not_found" }, path);
  }
  assert.deepEqual(bindings.seen.map((entry) => entry.binding), ["assets", "assets"]);
});

test("commercial binding failures return a non-cacheable 503", async () => {
  const bindings = environment(new Response("asset"), { failCommercial: true });
  const response = await worker.fetch(new Request("https://notchany.com/account"), bindings);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { code: "server_unavailable" });
});

test("部署工作流区分预览与生产并轮询 commit 标记", () => {
  const workflow = readFileSync(new URL("../.github/workflows/deploy-store-cloudflare.yml", import.meta.url), "utf8");
  assert.match(workflow, /target:/);
  assert.match(workflow, /notchany-store-preview\.glzlaohuai\.workers\.dev/);
  assert.match(workflow, /env\.TARGET == 'production'.*https:\/\/notchany\.com\/account/);
  assert.match(workflow, /https:\/\/notchany-store-preview\.glzlaohuai\.workers\.dev\/account/);
  assert.match(workflow, /for attempt in \{1\.\.12\}/);
  assert.match(workflow, /notchany-store\.json\?commit=\$\{\{ github\.sha \}\}&attempt=\$\{attempt\}/);
  assert.match(workflow, /sleep 5/);
});
