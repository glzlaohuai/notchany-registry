const DEFAULT_REPOSITORY_URL = "https://github.com/glzlaohuai/notchany-registry";

const ICONS = {
  browse: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
  submit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l3 1.71"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/><path d="M16 19h6"/><path d="M19 16v6"/></svg>',
  github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.91-2.78.62-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.94a9.3 9.3 0 0 1 2.5.35c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.23 10.23 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"/></svg>',
  account: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/></svg>',
  language: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
};

const COPY = {
  zh: { nav: "主导航", browse: "浏览内容库", submit: "提交作品", github: "GitHub 源码", account: "我的账号", language: "切换语言", download: "下载 App" },
  en: { nav: "Main navigation", browse: "Browse library", submit: "Submit a package", github: "GitHub source", account: "My account", language: "Change language", download: "Download App" },
};

export const SHELL_DOWNLOAD_ICON = ICONS.download;

function escapeHTML(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function withLanguage(url, lang) {
  return `${url}${url.includes("?") ? "&" : "?"}lang=${lang}`;
}

export function siteHeader({
  lang,
  homeURL,
  catalogURL,
  accountURL = "https://notchany.com/account",
  assetRoot,
  languageLinks,
  downloadURL,
  repositoryURL = DEFAULT_REPOSITORY_URL,
  dynamicLanguage = false,
}) {
  const copy = COPY[lang];
  return `<header class="site-nav" data-site-shell="1"${dynamicLanguage ? ' data-dynamic-language="true"' : ""}><nav class="shell nav-inner" aria-label="${copy.nav}" data-shell-nav>
    <a class="brand" href="${escapeHTML(homeURL)}"><img src="${escapeHTML(assetRoot)}app-icon.png" alt="" width="26" height="26"><strong>NotchAny</strong><span>Store</span></a>
    <div class="nav-links">
      <a class="nav-icon-button" href="${escapeHTML(catalogURL)}" aria-label="${copy.browse}" title="${copy.browse}" data-shell-label="browse">${ICONS.browse}</a>
      <a class="nav-icon-button optional" href="${repositoryURL}#%E6%8F%90%E4%BA%A4%E4%B8%80%E4%B8%AA%E5%8C%85" aria-label="${copy.submit}" title="${copy.submit}" data-shell-label="submit">${ICONS.submit}</a>
      <a class="nav-icon-button optional" href="${repositoryURL}" aria-label="${copy.github}" title="${copy.github}" data-shell-label="github">${ICONS.github}</a>
      <a class="nav-account-button" data-account-link href="${escapeHTML(withLanguage(accountURL, lang))}" aria-label="${copy.account}" title="${copy.account}" data-shell-label="account">${ICONS.account}</a>
      <div class="language-menu" id="language-menu">
        <button class="nav-icon-button" id="language-toggle" type="button" aria-label="${copy.language}" title="${copy.language}" aria-haspopup="menu" aria-expanded="false" data-shell-label="language">${ICONS.language}</button>
        <div class="language-popover" id="language-popover" role="menu" hidden>
          <a href="${escapeHTML(languageLinks.zh)}" role="menuitem" lang="zh-Hans" data-shell-language="zh"${lang === "zh" ? ' aria-current="page"' : ""}>中文</a>
          <a href="${escapeHTML(languageLinks.en)}" role="menuitem" lang="en" data-shell-language="en"${lang === "en" ? ' aria-current="page"' : ""}>English</a>
        </div>
      </div>
      <a class="nav-download-button" href="${escapeHTML(downloadURL)}" aria-label="${copy.download}" title="${copy.download}" data-shell-label="download">${ICONS.download}<span data-shell-download>${copy.download}</span></a>
    </div>
  </nav></header>`;
}
