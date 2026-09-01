import { pick, relatedPackages, searchText } from "./site-lib.mjs";

const SITE_URL = "https://glzlaohuai.github.io/notchany-registry";
const REPO_URL = "https://github.com/glzlaohuai/notchany-registry";
const APP_URL = "https://github.com/glzlaohuai/NotchAny";

const COPY = {
  zh: {
    browse: "浏览内容库", submit: "提交作品", github: "GitHub 源码", language: "English", language_menu: "切换语言", featured: "精选", featured_note: "来自不同使用场景的三个起点。",
    hero_kicker: "为 macOS 刘海而生", hero_title: "NotchAny Store", hero_body: "发现小组件与动作，把常用信息和工作流放进刘海。每个包都可检查、可调整、由你确认安装。",
    search: "搜索名称、简介、作者、包 ID 或标签", all_packages: "内容库", all_packages_note: "浏览社区发布的小组件与动作。",
    sort: "排序", all: "全部", recent: "最新", popular: "热门", type: "类型", widget: "小组件", action: "动作", tags: "标签",
    clear: "清除条件", result: "找到 {count} 个包", downloads: "下载", open: "打开", retry: "重试",
    popular_loading: "正在读取下载量…", popular_unavailable: "热门排序暂不可用。", popular_unavailable_title: "暂时无法读取热门排序", popular_unavailable_body: "下载计数服务没有响应。你仍可使用全部、最新、搜索和筛选。",
    empty_title: "没有匹配的包", empty_body: "换个关键词，或清除一项筛选条件。", featured_kind: "精选",
    footer: "NotchAny Store · 公开 registry 的静态视图", source: "源码", privacy: "隐私与发布规则",
    back: "返回 Store", by: "作者", version: "版本", updated: "更新", size: "包大小", license: "许可", requirements: "依赖", none: "无额外依赖",
    open_app: "在 NotchAny 中打开", launch_help: "没有唤起 NotchAny？请先从项目主页获取 App，再返回此页重试。", project_home: "项目主页",
    about: "关于这个包", safety: "运行与安全", safety_shell: "此包包含可执行脚本。NotchAny 会在安装前展示完整脚本，并要求你确认；请只运行你已阅读并信任的内容。",
    safety_plain: "安装前可检查包内容，NotchAny 仍会要求你确认安装。", screenshots: "实际界面", no_screenshot: "该包尚未提供界面截图",
    info: "包信息", package_id: "包 ID", source_code: "查看包源码", report: "反馈问题", improve: "提出改进", related: "你可能也需要",
  },
  en: {
    browse: "Browse library", submit: "Submit a package", github: "GitHub source", language: "中文", language_menu: "Change language", featured: "Featured", featured_note: "Three starting points for different workflows.",
    hero_kicker: "Built for the macOS notch", hero_title: "NotchAny Store", hero_body: "Discover widgets and actions that put useful information and workflows in the notch. Every package stays inspectable, editable, and yours to approve.",
    search: "Search names, descriptions, authors, package IDs, or tags", all_packages: "Library", all_packages_note: "Browse community widgets and actions.",
    sort: "Sort", all: "All", recent: "Latest", popular: "Popular", type: "Type", widget: "Widgets", action: "Actions", tags: "Tags",
    clear: "Clear filters", result: "{count} packages", downloads: "downloads", open: "Open", retry: "Retry",
    popular_loading: "Loading download counts…", popular_unavailable: "Popular sorting is unavailable.", popular_unavailable_title: "Popular sorting is temporarily unavailable", popular_unavailable_body: "The download-count service did not respond. All, Latest, search, and filters still work.",
    empty_title: "No matching packages", empty_body: "Try another term or clear one of the filters.", featured_kind: "Featured",
    footer: "NotchAny Store · A static view of the public registry", source: "Source", privacy: "Privacy and publishing rules",
    back: "Back to Store", by: "By", version: "Version", updated: "Updated", size: "Package size", license: "License", requirements: "Requirements", none: "No extra requirements",
    open_app: "Open in NotchAny", launch_help: "NotchAny did not open? Get the app from the project page, then return here and try again.", project_home: "Project page",
    about: "About this package", safety: "Runtime and safety", safety_shell: "This package contains an executable script. NotchAny shows the full script and asks for confirmation before installation. Run only code you have read and trust.",
    safety_plain: "You can inspect the package before installing, and NotchAny still asks you to confirm.", screenshots: "Actual interface", no_screenshot: "No interface screenshot has been provided yet",
    info: "Package information", package_id: "Package ID", source_code: "View package source", report: "Report an issue", improve: "Suggest an improvement", related: "You may also need",
  },
};

function escapeHTML(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function inlineJSON(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}

function renderInline(value) {
  return escapeHTML(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function renderMarkdown(value) {
  const output = [];
  for (const block of String(value || "").split(/\n{2,}/)) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.every((line) => /^[-*] /.test(line))) {
      output.push(`<ul>${lines.map((line) => `<li>${renderInline(line.replace(/^[-*] /, ""))}</li>`).join("")}</ul>`);
    } else {
      output.push(`<p>${lines.map(renderInline).join("<br>")}</p>`);
    }
  }
  return output.join("\n");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function date(value, lang) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "—";
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(parsed);
}

function kindLabel(item, lang) {
  return item.kind === "widget" ? COPY[lang].widget.replace(/s$/, "") : COPY[lang].action.replace(/s$/, "");
}

function pageHead({ lang, title, description, canonicalPath, alternatePath, imagePath, css }) {
  const canonical = `${SITE_URL}${canonicalPath}`;
  const alternate = `${SITE_URL}${alternatePath}`;
  const zhURL = lang === "zh" ? canonical : alternate;
  const enURL = lang === "en" ? canonical : alternate;
  return `<!doctype html>
<html lang="${lang === "zh" ? "zh-Hans" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="description" content="${escapeHTML(description)}">
  <meta name="theme-color" content="#09090A">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="zh-Hans" href="${zhURL}">
  <link rel="alternate" hreflang="en" href="${enURL}">
  <link rel="alternate" hreflang="x-default" href="${zhURL}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="NotchAny Store">
  <meta property="og:title" content="${escapeHTML(title)}">
  <meta property="og:description" content="${escapeHTML(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE_URL}/${imagePath}">
  <meta property="og:locale" content="${lang === "zh" ? "zh_CN" : "en_US"}">
  <title>${escapeHTML(title)}</title>
  <style>${css}</style>
</head>`;
}

const NAV_ICONS = {
  browse: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
  submit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l3 1.71"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/><path d="M16 19h6"/><path d="M19 16v6"/></svg>',
  github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.91-2.78.62-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.94a9.3 9.3 0 0 1 2.5.35c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.23 10.23 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"/></svg>',
  language: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>',
};

function nav({ lang, root, detailPackageID = "" }) {
  const copy = COPY[lang];
  const home = `${root}${lang === "en" ? "en/" : ""}`;
  const pagePath = detailPackageID ? `packages/${detailPackageID}/` : "";
  const languageLinks = { zh: `${root}${pagePath}`, en: `${root}en/${pagePath}` };
  return `<header class="site-nav"><nav class="shell nav-inner" aria-label="${lang === "zh" ? "主导航" : "Main navigation"}">
    <a class="brand" href="${home}"><img src="${root}assets/app-icon.png" alt="" width="26" height="26"><strong>NotchAny</strong><span>Store</span></a>
    <div class="nav-links">
      <a class="nav-icon-button" href="${home}#catalog" aria-label="${copy.browse}" title="${copy.browse}">${NAV_ICONS.browse}</a>
      <a class="nav-icon-button optional" href="${REPO_URL}#%E6%8F%90%E4%BA%A4%E4%B8%80%E4%B8%AA%E5%8C%85" aria-label="${copy.submit}" title="${copy.submit}">${NAV_ICONS.submit}</a>
      <a class="nav-icon-button optional" href="${REPO_URL}" aria-label="${copy.github}" title="${copy.github}">${NAV_ICONS.github}</a>
      <div class="language-menu" id="language-menu">
        <button class="nav-icon-button" id="language-toggle" type="button" aria-label="${copy.language_menu}" title="${copy.language_menu}" aria-haspopup="menu" aria-expanded="false">${NAV_ICONS.language}</button>
        <div class="language-popover" id="language-popover" role="menu" hidden>
          <a href="${languageLinks.zh}" role="menuitem" lang="zh-Hans"${lang === "zh" ? ' aria-current="page"' : ""}>中文</a>
          <a href="${languageLinks.en}" role="menuitem" lang="en"${lang === "en" ? ' aria-current="page"' : ""}>English</a>
        </div>
      </div>
    </div>
  </nav></header>`;
}

function footer({ lang }) {
  const copy = COPY[lang];
  return `<footer class="site-footer"><div class="shell footer-inner"><span>${copy.footer}</span><div class="footer-links"><a href="${REPO_URL}">${copy.source}</a><a href="${REPO_URL}#%E4%B8%8B%E8%BD%BD%E8%AE%A1%E6%95%B0">${copy.privacy}</a></div></div></footer>`;
}

function icon(item, root, className = "package-icon") {
  if (item.icon_path) return `<img class="${className}" src="${root}assets/${item.icon_path}" alt="" width="54" height="54">`;
  return `<span class="${className} fallback" aria-hidden="true">${item.kind === "widget" ? "▦" : "▶"}</span>`;
}

const KEYBOARD_ROWS = [
  [
    ["esc", "Escape", "escape"], ["F1", "F1"], ["F2", "F2"], ["F3", "F3"],
    ["F4", "F4"], ["F5", "F5"], ["F6", "F6"], ["F7", "F7"],
    ["F8", "F8"], ["F9", "F9"], ["F10", "F10"], ["F11", "F11"], ["F12", "F12"],
  ],
  [
    ["`", "Backquote"], ["1", "Digit1"], ["2", "Digit2"], ["3", "Digit3"], ["4", "Digit4"],
    ["5", "Digit5"], ["6", "Digit6"], ["7", "Digit7"], ["8", "Digit8"], ["9", "Digit9"],
    ["0", "Digit0"], ["−", "Minus"], ["=", "Equal"], ["delete", "Backspace", "delete"],
  ],
  [
    ["tab", "Tab", "tab"], ["Q", "KeyQ"], ["W", "KeyW"], ["E", "KeyE"], ["R", "KeyR"],
    ["T", "KeyT"], ["Y", "KeyY"], ["U", "KeyU"], ["I", "KeyI"], ["O", "KeyO"],
    ["P", "KeyP"], ["[", "BracketLeft"], ["]", "BracketRight"], ["\\", "Backslash", "backslash"],
  ],
  [
    ["caps", "CapsLock", "caps"], ["A", "KeyA"], ["S", "KeyS"], ["D", "KeyD"], ["F", "KeyF"],
    ["G", "KeyG"], ["H", "KeyH"], ["J", "KeyJ"], ["K", "KeyK"], ["L", "KeyL"],
    [";", "Semicolon"], ["'", "Quote"], ["return", "Enter", "return"],
  ],
  [
    ["shift", "ShiftLeft", "shift"], ["Z", "KeyZ"], ["X", "KeyX"], ["C", "KeyC"], ["V", "KeyV"],
    ["B", "KeyB"], ["N", "KeyN"], ["M", "KeyM"], [",", "Comma"], [".", "Period"],
    ["/", "Slash"], ["shift", "ShiftRight", "shift"],
  ],
  [
    ["fn", "Fn"], ["control", "ControlLeft", "control"], ["option", "AltLeft", "option"],
    ["command", "MetaLeft", "command"], ["", "Space", "space"], ["command", "MetaRight", "command"],
    ["option", "AltRight", "option"], ["◀", "ArrowLeft"], ["▲", "ArrowUp"], ["▼", "ArrowDown"], ["▶", "ArrowRight"],
  ],
];

function keyboard() {
  return KEYBOARD_ROWS.map((row) => `<div class="keyboard-row">${row.map(([label, code, width = ""]) =>
    `<button class="mac-key" type="button" data-code="${code}" data-width="${width}" aria-label="${label || "Space"}"><span>${label}</span></button>`
  ).join("")}</div>`).join("");
}

function packageClientData(item, lang, root) {
  return {
    package_id: item.package_id,
    owner: item.package_id.split("/")[0],
    kind: item.kind,
    kind_label: kindLabel(item, lang),
    name: pick(item.names, lang),
    summary: pick(item.summaries, lang),
    tags: item.tags || [],
    published_at: item.published_at,
    updated_at: item.updated_at,
    search: searchText(item),
    icon: item.icon_path ? `${root}assets/${item.icon_path}` : `${root}assets/app-icon.png`,
    href: `${root}${lang === "en" ? "en/" : ""}packages/${item.package_id}/`,
  };
}

export function homePage({ lang, packages, featuredIDs, countsURL, css, js }) {
  const copy = COPY[lang];
  const root = lang === "zh" ? "" : "../";
  const current = lang === "zh" ? "/" : "/en/";
  const alternate = lang === "zh" ? "/en/" : "/";
  const featured = featuredIDs.map((id) => packages.find((item) => item.package_id === id));
  const tags = [...new Set(packages.flatMap((item) => item.tags || []))].sort();
  const clientData = packages.map((item) => packageClientData(item, lang, root));
  const featuredCards = featured.map((item) => `<a class="featured-card" href="${root}${lang === "en" ? "en/" : ""}packages/${item.package_id}/">
    ${icon(item, root)}<div><span class="eyebrow">${copy.featured_kind} · ${kindLabel(item, lang)}</span><h3>${escapeHTML(pick(item.names, lang))}</h3><p>${escapeHTML(pick(item.summaries, lang))}</p></div>
  </a>`).join("");
  const tray = featured.map((item) => `<a class="demo-tray-item" href="${root}${lang === "en" ? "en/" : ""}packages/${item.package_id}/" title="${escapeHTML(pick(item.names, lang))}">
    ${icon(item, root, "demo-tray-icon")}<span>${escapeHTML(pick(item.names, lang))}</span>
  </a>`).join("");

  return `${pageHead({ lang, title: copy.hero_title, description: copy.hero_body, canonicalPath: current, alternatePath: alternate, imagePath: "assets/app-icon.png", css })}
<body>
${nav({ lang, root })}
<main>
  <section class="hero-band"><div class="shell hero">
    <div class="hero-copy"><p class="hero-kicker">${copy.hero_kicker}</p><h1>${copy.hero_title}</h1><p class="hero-subtitle">${copy.hero_body}</p>
      <label class="search-box"><span hidden>${copy.search}</span><input id="store-search" data-store-search type="search" autocomplete="off" aria-label="${escapeHTML(copy.search)}" placeholder="${escapeHTML(copy.search)}"><span class="search-key"><kbd>⌘ K</kbd> / <kbd>/</kbd></span></label>
    </div>
    <div class="mac-scene" id="mac-scene">
      <div class="macbook">
        <div class="mac-display">
          <div class="mac-desktop" style="--desktop-wallpaper:url('${root}assets/macos-desktop-wallpaper.webp')">
            <div class="mac-menu-bar">
              <div class="menu-left"><img src="${root}assets/app-icon.png" alt="" width="14" height="14"><strong>NotchAny</strong><span>${lang === "zh" ? "文件" : "File"}</span><span>${lang === "zh" ? "编辑" : "Edit"}</span><span>${lang === "zh" ? "显示" : "View"}</span></div>
              <div class="menu-right"><span class="menu-control" aria-hidden="true"></span><span id="mac-menu-date"></span><strong id="mac-menu-time"></strong></div>
            </div>
            <div class="notch-hot-zone" id="notch-stage">
              <div class="demo-notch" id="demo-notch" aria-expanded="false">
                <span class="notch-camera" aria-hidden="true"></span>
                <div class="demo-tray-items">${tray}</div>
              </div>
            </div>
            <div class="desktop-dock" aria-hidden="true"><img src="${root}assets/app-icon.png" alt=""><span class="dock-app dock-app-coral"></span><span class="dock-app dock-app-paper"></span><span class="dock-divider"></span><span class="dock-trash"></span></div>
          </div>
        </div>
        <div class="mac-hinge"></div>
        <div class="keyboard-deck" id="keyboard-deck">
          <div class="speaker speaker-left"></div><div class="speaker speaker-right"></div>
          <div class="keyboard">${keyboard()}</div>
          <button class="trackpad" id="trackpad" type="button" aria-label="${lang === "zh" ? "触控板" : "Trackpad"}"></button>
        </div>
        <div class="mac-lip"></div>
      </div>
    </div>
  </div></section>
  <section class="section" id="featured-section"><div class="shell"><div class="section-head"><div><h2>${copy.featured}</h2><p>${copy.featured_note}</p></div></div><div class="featured-grid">${featuredCards}</div></div></section>
  <section class="section" id="catalog"><div class="shell">
    <div class="section-head"><div><h2>${copy.all_packages}</h2><p>${copy.all_packages_note}</p></div><label class="search-box catalog-search"><span hidden>${copy.search}</span><input id="library-search" data-store-search type="search" autocomplete="off" aria-label="${escapeHTML(copy.search)}" placeholder="${escapeHTML(copy.search)}"></label></div>
    <div class="catalog-tools">
      <div class="tool-row"><span class="tool-label">${copy.sort}</span><div class="segment" aria-label="${copy.sort}"><button type="button" data-sort="all">${copy.all}</button><button type="button" data-sort="recent">${copy.recent}</button><button type="button" data-sort="popular">${copy.popular}</button></div></div>
      <div class="tool-row"><span class="tool-label">${copy.type}</span><div class="segment" aria-label="${copy.type}"><button type="button" data-kind="all">${copy.all}</button><button type="button" data-kind="widget">${copy.widget}</button><button type="button" data-kind="action">${copy.action}</button></div></div>
      <div class="tool-row"><span class="tool-label">${copy.tags}</span>${tags.map((tag) => `<button class="chip" type="button" data-tag="${escapeHTML(tag)}">${escapeHTML(tag)}</button>`).join("")}<button class="clear-button" id="clear-filters" type="button">${copy.clear}</button></div>
    </div>
    <div class="result-line"><span id="result-count"></span><span class="popular-status" id="popular-status"></span></div>
    <div class="catalog-list" id="catalog-list"></div><nav class="pagination" id="pagination" aria-label="${lang === "zh" ? "分页" : "Pagination"}"></nav>
  </div></section>
</main>
${footer({ lang, root })}
<script>window.__NOTCHANY_STORE__=${inlineJSON({ language: lang, copy, packages: clientData, counts_url: countsURL || "" })};</script>
<script>${js}</script>
</body></html>`;
}

export function detailPage({ lang, item, packages, countsURL, css, js }) {
  const copy = COPY[lang];
  const root = lang === "zh" ? "../../../" : "../../../../";
  const path = `${lang === "zh" ? "" : "/en"}/packages/${item.package_id}/`;
  const alternate = `${lang === "zh" ? "/en" : ""}/packages/${item.package_id}/`;
  const name = pick(item.names, lang);
  const summary = pick(item.summaries, lang);
  const owner = item.package_id.split("/")[0];
  const related = relatedPackages(item, packages).map((other) => `<a class="related-item" href="${root}${lang === "en" ? "en/" : ""}packages/${other.package_id}/">${icon(other, root)}<span><strong>${escapeHTML(pick(other.names, lang))}</strong><span>${kindLabel(other, lang)}</span></span></a>`).join("");
  const screenshots = item.screenshots?.length
    ? item.screenshots.map((shot) => `<img class="screenshot" src="${root}assets/${shot}" alt="${escapeHTML(`${name} · ${copy.screenshots}`)}">`).join("")
    : `<div class="screenshot-placeholder">${copy.no_screenshot}</div>`;
  const requirements = item.requires?.length ? item.requires.map(escapeHTML).join(", ") : copy.none;
  const sourceURL = `${REPO_URL}/tree/main/packages/${item.package_id}`;
  const issueURL = `${REPO_URL}/issues/new?title=${encodeURIComponent(`[${item.package_id}] `)}`;
  const home = `${root}${lang === "en" ? "en/" : ""}`;
  const description = pick(item.descriptions, lang) || summary;
  return `${pageHead({ lang, title: `${name} · NotchAny Store`, description: summary, canonicalPath: path, alternatePath: alternate, imagePath: `assets/${item.icon_path || "app-icon.png"}`, css })}
<body>
${nav({ lang, root, detailPackageID: item.package_id })}
<main class="shell detail-main">
  <div class="breadcrumbs"><a href="${home}">${copy.back}</a></div>
  <header class="detail-hero">
    ${icon(item, root)}
    <div class="detail-title"><h1>${escapeHTML(name)}</h1><p>${escapeHTML(summary)}</p><div class="detail-meta"><span>${copy.by} ${escapeHTML(owner)}</span><span data-download-count="${escapeHTML(item.package_id)}"></span></div></div>
    <div class="detail-action"><a class="primary-button" id="open-in-notchany" href="notchany://market/package/${escapeHTML(item.package_id)}">${copy.open_app}</a><p class="launch-help" id="launch-help" hidden>${copy.launch_help} <a href="${APP_URL}">${copy.project_home}</a></p></div>
  </header>
  <div class="detail-layout"><article>
    <section aria-labelledby="screenshots-title"><h2 id="screenshots-title">${copy.screenshots}</h2><div class="screenshots">${screenshots}</div></section>
    <div class="prose"><h2>${copy.about}</h2>${renderMarkdown(description)}<h2>${copy.safety}</h2><p class="risk-note"><strong>${item.action_kind === "shell" ? copy.safety_shell : copy.safety_plain}</strong></p></div>
  </article>
  <aside class="side-info" aria-label="${copy.info}">
    <div class="info-group"><span class="info-label">${copy.package_id}</span><code class="info-value">${escapeHTML(item.package_id)}</code></div>
    <div class="info-group"><span class="info-label">${copy.version}</span><span class="info-value">${escapeHTML(item.version)}</span></div>
    <div class="info-group"><span class="info-label">${copy.updated}</span><span class="info-value">${date(item.updated_at, lang)}</span></div>
    <div class="info-group"><span class="info-label">${copy.size}</span><span class="info-value">${formatBytes(item.size_bytes)}</span></div>
    <div class="info-group"><span class="info-label">${copy.license}</span><span class="info-value">${escapeHTML(item.license)}</span></div>
    <div class="info-group"><span class="info-label">${copy.requirements}</span><span class="info-value">${requirements}</span></div>
    <div class="info-group"><a class="info-link" href="${sourceURL}">${copy.source_code}</a><a class="info-link" href="${issueURL}">${copy.report}</a><a class="info-link" href="${issueURL}">${copy.improve}</a></div>
  </aside></div>
  ${related ? `<section class="related"><h2>${copy.related}</h2><div class="related-list">${related}</div></section>` : ""}
</main>
${footer({ lang, root })}
<script>window.__NOTCHANY_STORE__=${inlineJSON({ language: lang, copy, packages: [], counts_url: countsURL || "" })};</script>
<script>${js}</script>
</body></html>`;
}
