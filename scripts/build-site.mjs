#!/usr/bin/env node
// 生成 Web 市场静态站：读 index/v1/index.json 与各包截图，输出纯静态 HTML 到 site/dist/。
// 零第三方依赖，Node ≥18。用法：node scripts/build-site.mjs（在仓库根目录执行）。
//
// 页面特性：
// - 首页：搜索框（纯前端过滤）+ 类型筛选（小组件/动作）+ 卡片列表
// - 详情页：截图、双语描述（浏览器语言 zh→中文，否则英文）、「用 NotchAny 安装」
//   深链按钮（notchany://market/package/<owner>/<slug>，1.5 秒未唤起则显示下载引导）
// - 无外部资源：CSS/JS 全部内联，系统字体栈，深浅色自适应（prefers-color-scheme）
// - 下载计数（渐进增强）：页面运行时 fetch 下方 COUNTS_URL，取到就显示「安装量 N」，
//   取不到静默隐藏。部署 worker/ 后把占位子域改成实际 workers.dev 子域并重新构建。

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";

// ---------- 配置（部署后按需回填） ----------

// Cloudflare Worker 的 counts.json 地址（见 worker/README.md）。含 REPLACE_ME 时页面跳过请求。
const COUNTS_URL = "https://notchany-market.REPLACE_ME.workers.dev/counts.json";
const REPO_URL = "https://github.com/glzlaohuai/notchany-registry";
const APP_URL = "https://github.com/glzlaohuai";

const ROOT = process.cwd();
const INDEX_PATH = join(ROOT, "index", "v1", "index.json");
const DIST = join(ROOT, "site", "dist");

function fail(message) {
  console.error(`build-site: ${message}`);
  process.exit(1);
}

if (!existsSync(INDEX_PATH)) {
  fail("缺少 index/v1/index.json，请先运行 node scripts/build-index.mjs");
}
let index;
try {
  index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
} catch (error) {
  fail(`index/v1/index.json 不是合法 JSON：${error.message}`);
}
const packages = Array.isArray(index.packages) ? index.packages : [];

// ---------- 工具 ----------

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// 语言选取：zh 优先 zh-Hans，en 优先 en，都缺时回落任意已有语言。
function pick(map, lang) {
  if (!map || typeof map !== "object") return "";
  const fallback = Object.values(map)[0] ?? "";
  if (lang === "zh") return map["zh-Hans"] ?? map["zh"] ?? map["en"] ?? fallback;
  return map["en"] ?? map["zh-Hans"] ?? fallback;
}

// 极简 markdown 渲染（先转义再上标记）：段落、无序列表、`code`、**bold**、[文](链)。
function renderInline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
}

function renderMarkdown(text) {
  const html = [];
  for (const block of String(text).split(/\n{2,}/)) {
    const lines = block.split("\n").filter((line) => line.trim() !== "");
    if (lines.length === 0) continue;
    let listRun = [];
    const flushList = () => {
      if (listRun.length === 0) return;
      html.push(`<ul>${listRun.join("")}</ul>`);
      listRun = [];
    };
    let paragraphRun = [];
    const flushParagraph = () => {
      if (paragraphRun.length === 0) return;
      html.push(`<p>${paragraphRun.join("<br>")}</p>`);
      paragraphRun = [];
    };
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^[-*] /.test(trimmed)) {
        flushParagraph();
        listRun.push(`<li>${renderInline(trimmed.replace(/^[-*] /, ""))}</li>`);
      } else {
        flushList();
        paragraphRun.push(renderInline(trimmed));
      }
    }
    flushList();
    flushParagraph();
  }
  return html.join("\n");
}

function kindLabel(kind, lang) {
  if (kind === "widget") return lang === "zh" ? "小组件" : "Widget";
  return lang === "zh" ? "动作" : "Action";
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// ---------- 共享样式与脚本 ----------

const CSS = `
:root {
  color-scheme: light dark;
  --bg: #f5f5f7; --card: #ffffff; --text: #1d1d1f; --muted: #6e6e73;
  --border: rgba(0, 0, 0, 0.1); --chip: rgba(0, 0, 0, 0.05);
  --accent: #0a7cff; --accent-text: #ffffff;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #161618; --card: #1f1f22; --text: #f2f2f4; --muted: #9b9ba1;
    --border: rgba(255, 255, 255, 0.12); --chip: rgba(255, 255, 255, 0.08);
    --accent: #3d95ff;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font: 15px/1.65 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC",
    "Helvetica Neue", "Segoe UI", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
code {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.9em; background: var(--chip); padding: 1px 5px; border-radius: 5px;
}
.wrap { max-width: 960px; margin: 0 auto; padding: 36px 20px 72px; }
.site-head h1 { font-size: 28px; margin: 0 0 4px; letter-spacing: -0.02em; }
.site-head p { margin: 0; color: var(--muted); }
.controls { display: flex; gap: 10px; flex-wrap: wrap; margin: 24px 0 20px; }
.controls input {
  flex: 1; min-width: 220px; padding: 9px 14px; font: inherit;
  color: var(--text); background: var(--card);
  border: 1px solid var(--border); border-radius: 10px; outline: none;
}
.controls input:focus { border-color: var(--accent); }
.filter {
  padding: 8px 16px; font: inherit; color: var(--text); background: var(--card);
  border: 1px solid var(--border); border-radius: 10px; cursor: pointer;
}
.filter.active { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.card {
  display: block; background: var(--card); border: 1px solid var(--border);
  border-radius: 14px; padding: 16px 18px; color: inherit;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.card:hover { border-color: var(--accent); text-decoration: none; transform: translateY(-1px); }
.card .thumb {
  width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 8px;
  border: 1px solid var(--border); margin-bottom: 12px; background: var(--chip);
}
.card-title { display: flex; align-items: baseline; gap: 8px; }
.card-title .name { font-weight: 600; font-size: 16px; }
.badge {
  font-size: 12px; color: var(--muted); background: var(--chip);
  padding: 2px 8px; border-radius: 999px; white-space: nowrap;
}
.card .summary { margin: 6px 0 10px; color: var(--muted); font-size: 13.5px; min-height: 2.6em; }
.card-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12.5px; color: var(--muted); }
.card-meta .count { color: var(--accent); }
.empty { color: var(--muted); text-align: center; padding: 48px 0; }
.site-foot { margin-top: 48px; font-size: 13px; color: var(--muted); }
.back { display: inline-block; margin-bottom: 20px; font-size: 14px; }
.detail-head h1 { font-size: 26px; margin: 0; letter-spacing: -0.02em; }
.detail-head .en-name { font-size: 16px; font-weight: 400; color: var(--muted); margin-left: 8px; }
.detail-head .summary { color: var(--muted); margin: 8px 0 0; }
.actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 20px 0; }
.btn {
  display: inline-block; padding: 9px 20px; font: inherit; font-weight: 500;
  color: var(--text); background: var(--card); border: 1px solid var(--border);
  border-radius: 10px; cursor: pointer;
}
.btn:hover { text-decoration: none; border-color: var(--accent); }
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
.actions .count { font-size: 13.5px; color: var(--muted); }
.notice {
  background: var(--card); border: 1px solid var(--border); border-left: 3px solid var(--accent);
  border-radius: 10px; padding: 12px 16px; margin: 0 0 20px; font-size: 14px;
}
.notice p { margin: 4px 0 0; color: var(--muted); }
.shots { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; margin: 0 0 24px; }
.shots img {
  height: 220px; border-radius: 10px; border: 1px solid var(--border); background: var(--chip);
}
.desc { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 4px 22px; margin-bottom: 24px; }
.desc ul { padding-left: 20px; }
.meta h2 { font-size: 16px; margin: 0 0 10px; }
.meta dl {
  display: grid; grid-template-columns: auto 1fr; gap: 8px 20px; margin: 0;
  background: var(--card); border: 1px solid var(--border); border-radius: 14px;
  padding: 18px 22px; font-size: 14px;
}
.meta dt { color: var(--muted); white-space: nowrap; }
.meta dd { margin: 0; overflow-wrap: anywhere; }
`.trim();

// 下载计数（渐进增强）：取到 counts.json 就点亮 [data-count-id]，失败静默。
const COUNTS_JS = `
(function () {
  var COUNTS_URL = ${JSON.stringify(COUNTS_URL)};
  if (COUNTS_URL.indexOf("REPLACE_ME") !== -1) return;
  fetch(COUNTS_URL)
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (counts) {
      if (!counts) return;
      var nodes = document.querySelectorAll("[data-count-id]");
      for (var i = 0; i < nodes.length; i++) {
        var n = counts[nodes[i].getAttribute("data-count-id")];
        if (typeof n === "number") {
          nodes[i].textContent = "\\u5b89\\u88c5\\u91cf " + n; // 安装量 N
          nodes[i].hidden = false;
        }
      }
    })
    .catch(function () {});
})();
`.trim();

function page({ title, description, body, script }) {
  return `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<style>
${CSS}
</style>
</head>
<body>
<div class="wrap">
${body}
</div>
<script>
${script}
</script>
</body>
</html>
`;
}

function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

// ---------- 构建 ----------

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// 详情页 + 截图拷贝
let screenshotCount = 0;
for (const entry of packages) {
  const [owner, slug] = entry.package_id.split("/");
  const pkgDir = join(DIST, "pkg", owner, slug);

  const shots = [];
  for (const shot of entry.screenshots ?? []) {
    const src = join(ROOT, shot);
    if (!existsSync(src)) continue;
    const name = shot.split("/").pop();
    const dest = join(pkgDir, "screenshots", name);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    shots.push(`screenshots/${name}`);
    screenshotCount++;
  }

  const zhName = pick(entry.names, "zh");
  const enName = pick(entry.names, "en");
  const installUrl = `notchany://market/package/${owner}/${slug}`;
  const sourceUrl = `${REPO_URL}/tree/main/packages/${owner}/${slug}`;

  const metaRows = [
    ["作者", `<a href="https://github.com/${escapeHtml(owner)}" target="_blank" rel="noopener">${escapeHtml(owner)}</a>`],
    ["类型", escapeHtml(kindLabel(entry.kind, "zh"))],
    ["版本", escapeHtml(entry.version ?? "")],
    ["许可证", escapeHtml(entry.license ?? "")],
    ...(entry.homepage
      ? [["主页", `<a href="${escapeHtml(entry.homepage)}" target="_blank" rel="noopener">${escapeHtml(entry.homepage)}</a>`]]
      : []),
    ...(entry.min_app_version ? [["最低 App 版本", escapeHtml(entry.min_app_version)]] : []),
    [
      "依赖",
      (entry.requires ?? []).length > 0
        ? entry.requires.map((r) => `<code>${escapeHtml(r)}</code>`).join(" ")
        : "无",
    ],
    ["包体大小", escapeHtml(formatBytes(entry.size_bytes ?? 0))],
    ["更新于", escapeHtml((entry.updated_at ?? "").slice(0, 10))],
  ];

  const detailBody = `
<a class="back" href="../../../">&larr; NotchAny 市场</a>
<header class="detail-head">
  <h1>${escapeHtml(zhName)}${enName && enName !== zhName ? `<span class="en-name">${escapeHtml(enName)}</span>` : ""}
    <span class="badge">${escapeHtml(kindLabel(entry.kind, "zh"))}</span></h1>
  <p class="summary" data-lang="zh">${escapeHtml(pick(entry.summaries, "zh"))}</p>
  <p class="summary" data-lang="en" hidden>${escapeHtml(pick(entry.summaries, "en"))}</p>
</header>
<div class="actions">
  <button id="install-btn" class="btn primary" type="button">用 NotchAny 安装</button>
  <a class="btn" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">查看源码</a>
  <span class="count" data-count-id="${escapeHtml(entry.package_id)}" hidden></span>
</div>
<div id="no-app" class="notice" hidden>
  <strong>尚未安装 NotchAny？</strong>
  <p>「用 NotchAny 安装」需要本机已安装 NotchAny（macOS 刘海工具）。
  前往 <a href="${escapeHtml(APP_URL)}" target="_blank" rel="noopener">GitHub</a>
  获取应用后回到本页，再点一次即可一键安装。</p>
</div>
${shots.length > 0 ? `<div class="shots">${shots.map((s) => `<img src="${escapeHtml(s)}" alt="${escapeHtml(zhName)} 截图" loading="lazy">`).join("")}</div>` : ""}
<section class="desc">
  <div data-lang="zh">${renderMarkdown(pick(entry.descriptions, "zh") || pick(entry.summaries, "zh"))}</div>
  <div data-lang="en" hidden>${renderMarkdown(pick(entry.descriptions, "en") || pick(entry.summaries, "en"))}</div>
</section>
<section class="meta">
  <h2>信息</h2>
  <dl>
${metaRows.map(([dt, dd]) => `    <dt>${dt}</dt><dd>${dd}</dd>`).join("\n")}
  </dl>
</section>
<footer class="site-foot">
  <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">在 GitHub 查看本包源码与历史</a>
  · 安装前 NotchAny 会展示完整脚本源码供确认
</footer>
`.trim();

  // 详情页脚本：浏览器语言 zh→中文否则英文；安装按钮触发深链，1.5 秒未唤起显示引导。
  const detailScript = `
(function () {
  var zh = (navigator.language || "").toLowerCase().indexOf("zh") === 0;
  if (!zh) {
    document.documentElement.lang = "en";
    var nodes = document.querySelectorAll("[data-lang]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].hidden = nodes[i].getAttribute("data-lang") !== "en";
    }
  }
  var btn = document.getElementById("install-btn");
  var notice = document.getElementById("no-app");
  btn.addEventListener("click", function () {
    notice.hidden = true;
    location.href = ${JSON.stringify(installUrl)};
    setTimeout(function () {
      if (!document.hidden) notice.hidden = false; // 1.5 秒后页面仍可见 → 大概率未安装
    }, 1500);
  });
})();
${COUNTS_JS}
`.trim();

  writeFile(
    join(pkgDir, "index.html"),
    page({
      title: `${zhName} · NotchAny 市场`,
      description: pick(entry.summaries, "zh"),
      body: detailBody,
      script: detailScript,
    })
  );
}

// 首页
const cards = packages
  .map((entry) => {
    const [owner, slug] = entry.package_id.split("/");
    const zhName = pick(entry.names, "zh");
    const enName = pick(entry.names, "en");
    const searchText = [
      zhName,
      enName,
      pick(entry.summaries, "zh"),
      pick(entry.summaries, "en"),
      entry.package_id,
      ...(entry.tags ?? []),
    ]
      .join(" ")
      .toLowerCase();
    const firstShot = (entry.screenshots ?? [])[0];
    const thumb = firstShot
      ? `<img class="thumb" src="pkg/${owner}/${slug}/screenshots/${escapeHtml(firstShot.split("/").pop())}" alt="${escapeHtml(zhName)} 截图" loading="lazy">`
      : "";
    return `<a class="card" href="pkg/${owner}/${slug}/" data-kind="${escapeHtml(entry.kind)}" data-search="${escapeHtml(searchText)}">
  ${thumb}
  <div class="card-title"><span class="name">${escapeHtml(zhName)}</span><span class="badge">${escapeHtml(kindLabel(entry.kind, "zh"))}</span></div>
  <p class="summary">${escapeHtml(pick(entry.summaries, "zh"))}</p>
  <div class="card-meta">
    <span>v${escapeHtml(entry.version ?? "")}</span>
    <span class="count" data-count-id="${escapeHtml(entry.package_id)}" hidden></span>
    <span>${(entry.tags ?? []).map((t) => `#${escapeHtml(t)}`).join(" ")}</span>
  </div>
</a>`;
  })
  .join("\n");

const indexBody = `
<header class="site-head">
  <h1>NotchAny 市场</h1>
  <p>macOS 刘海工具 NotchAny 的动作 / 小组件市场 — PR 上架 · CI 校验 · 脚本可审计
    · <a href="${escapeHtml(REPO_URL)}" target="_blank" rel="noopener">GitHub</a></p>
</header>
<div class="controls">
  <input id="search" type="search" placeholder="搜索名称、简介、标签…" autocomplete="off">
  <button class="filter active" type="button" data-filter="all">全部</button>
  <button class="filter" type="button" data-filter="widget">小组件</button>
  <button class="filter" type="button" data-filter="action">动作</button>
</div>
<div class="grid" id="grid">
${cards}
</div>
<p class="empty" id="empty" hidden>没有匹配的包</p>
<footer class="site-foot">
  共 ${packages.length} 个包 · 索引生成于 ${escapeHtml((index.generated_at ?? "").slice(0, 10))}
  · <a href="${escapeHtml(REPO_URL)}" target="_blank" rel="noopener">上架你的动作 / 小组件</a>
</footer>
`.trim();

const indexScript = `
(function () {
  var input = document.getElementById("search");
  var buttons = document.querySelectorAll(".filter");
  var cards = document.querySelectorAll(".card");
  var empty = document.getElementById("empty");
  var kind = "all";
  function apply() {
    var q = input.value.trim().toLowerCase();
    var shown = 0;
    for (var i = 0; i < cards.length; i++) {
      var okKind = kind === "all" || cards[i].getAttribute("data-kind") === kind;
      var okText = q === "" || cards[i].getAttribute("data-search").indexOf(q) !== -1;
      var show = okKind && okText;
      cards[i].hidden = !show;
      if (show) shown++;
    }
    empty.hidden = shown !== 0;
  }
  input.addEventListener("input", apply);
  function onFilter() {
    kind = this.getAttribute("data-filter");
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].className = buttons[j] === this ? "filter active" : "filter";
    }
    apply();
  }
  for (var i = 0; i < buttons.length; i++) buttons[i].addEventListener("click", onFilter);
})();
${COUNTS_JS}
`.trim();

writeFile(
  join(DIST, "index.html"),
  page({
    title: "NotchAny 市场",
    description: "NotchAny（macOS 刘海工具）的动作 / 小组件市场：搜索、浏览并一键安装。",
    body: indexBody,
    script: indexScript,
  })
);

console.log(
  `已生成 site/dist（首页 + ${packages.length} 个详情页，拷贝截图 ${screenshotCount} 张）`
);
