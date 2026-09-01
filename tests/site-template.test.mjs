import test from "node:test";
import assert from "node:assert/strict";

import { readFileSync } from "node:fs";

import { detailPage, homePage } from "../scripts/site-template.mjs";

const packages = ["cpu", "image", "wifi"].map((slug, index) => ({
  package_id: `owner/${slug}`,
  names: { "zh-Hans": `包 ${index + 1}`, en: `Package ${index + 1}` },
  summaries: { "zh-Hans": "摘要", en: "Summary" },
  descriptions: {},
  version: "1.0.0",
  tags: ["example"],
  license: "MIT",
  icon_path: `packages/owner/${slug}/icon.png`,
  kind: index === 1 ? "action" : "widget",
  action_kind: "shell",
  published_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
  size_bytes: 100,
  requires: [],
  screenshots: [],
}));

test("home hero renders an interactive Mac desktop with live clock targets", () => {
  const html = homePage({
    lang: "zh",
    packages,
    featuredIDs: packages.map((item) => item.package_id),
    countsURL: "",
    css: "",
    js: "",
  });

  for (const marker of ["macbook", "mac-desktop", "keyboard-deck", "mac-menu-date", "mac-menu-time", "demo-notch"]) {
    assert.match(html, new RegExp(`(?:class|id)=\"[^\"]*${marker}`));
  }
  assert.equal((html.match(/class="demo-tray-item"/g) || []).length, 3);
  assert.equal((html.match(/class="mac-key"/g) || []).length, 77);
});

test("each hero tray icon links to its package detail page", () => {
  const html = homePage({
    lang: "en",
    packages,
    featuredIDs: packages.map((item) => item.package_id),
    countsURL: "",
    css: "",
    js: "",
  });

  for (const item of packages) {
    assert.match(html, new RegExp(`href=\"\.\./en/packages/${item.package_id}/\"`));
    assert.match(html, new RegExp(`src=\"\.\./assets/${item.icon_path.replaceAll("/", "\\/")}\"`));
  }
});

test("home navigation uses icon controls, a language menu, and two synchronized search targets", () => {
  const html = homePage({
    lang: "zh",
    packages,
    featuredIDs: packages.map((item) => item.package_id),
    countsURL: "",
    css: "",
    js: "",
  });

  assert.equal((html.match(/class="nav-icon-button/g) || []).length, 4);
  assert.match(html, /id="language-toggle"[^>]+aria-haspopup="menu"[^>]+aria-expanded="false"/);
  assert.match(html, /href="" role="menuitem" lang="zh-Hans" aria-current="page">中文<\/a>/);
  assert.match(html, /href="en\/" role="menuitem" lang="en">English<\/a>/);
  assert.equal((html.match(/data-store-search/g) || []).length, 2);
  assert.match(html, /id="library-search"/);
  assert.match(html, /id="result-count" aria-live="polite"/);
});

test("detail navigation language menu preserves the package route", () => {
  const html = detailPage({ lang: "en", item: packages[0], packages, countsURL: "", css: "", js: "" });

  assert.match(html, /href="\.\.\/\.\.\/\.\.\/\.\.\/packages\/owner\/cpu\/" role="menuitem" lang="zh-Hans">中文<\/a>/);
  assert.match(html, /href="\.\.\/\.\.\/\.\.\/\.\.\/en\/packages\/owner\/cpu\/" role="menuitem" lang="en" aria-current="page">English<\/a>/);
});

test("notch intro is session-scoped and does not schedule repeating cycles", () => {
  const source = readFileSync(new URL("../site/store.js", import.meta.url), "utf8");

  assert.match(source, /sessionStorage\.getItem\(introStorageKey\)/);
  assert.match(source, /notchany-store-intro/);
  assert.doesNotMatch(source, /scheduleCycle/);
});

test("pressing Enter in either search reveals the catalog", () => {
  const source = readFileSync(new URL("../site/store.js", import.meta.url), "utf8");

  assert.match(source, /event\.key !== "Enter"/);
  assert.match(source, /requestAnimationFrame\(revealCatalog\)/);
  assert.match(source, /behavior: reducedMotion \? "auto" : "smooth"/);
});

test("typing hides the hero shortcut hint so the native clear button stays usable", () => {
  const source = readFileSync(new URL("../site/styles.css", import.meta.url), "utf8");

  assert.match(source, /input:not\(:placeholder-shown\) ~ \.search-key \{ opacity: 0; \}/);
  assert.match(source, /pointer-events: none/);
});
