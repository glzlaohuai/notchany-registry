(() => {
  const header = document.querySelector("[data-site-shell]");
  if (!header) return;

  const params = new URLSearchParams(location.search);
  const requested = params.get("lang");
  const english = requested === "en" || (requested !== "zh" && document.documentElement.lang.startsWith("en"));
  const lang = english ? "en" : "zh";
  const copy = {
    zh: { nav: "主导航", browse: "浏览内容库", submit: "提交作品", github: "GitHub 源码", account: "我的账号", language: "切换语言", download: "下载 App" },
    en: { nav: "Main navigation", browse: "Browse library", submit: "Submit a package", github: "GitHub source", account: "My account", language: "Change language", download: "Download App" },
  }[lang];

  document.documentElement.lang = english ? "en" : "zh-Hans";
  header.querySelector("[data-shell-nav]")?.setAttribute("aria-label", copy.nav);
  header.querySelectorAll("[data-shell-label]").forEach((node) => {
    const value = copy[node.dataset.shellLabel];
    if (!value) return;
    node.setAttribute("aria-label", value);
    node.setAttribute("title", value);
  });
  const download = header.querySelector("[data-shell-download]");
  if (download) download.textContent = copy.download;

  if (header.dataset.dynamicLanguage === "true") {
    header.querySelectorAll("[data-shell-language]").forEach((link) => {
      const target = new URL(location.href);
      target.searchParams.set("lang", link.dataset.shellLanguage);
      link.href = target.href;
      if (link.dataset.shellLanguage === lang) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    const account = header.querySelector("[data-account-link]");
    if (account) {
      const target = new URL(account.href);
      target.searchParams.set("lang", lang);
      account.href = target.href;
    }
  }

  const menu = header.querySelector("#language-menu");
  const toggle = header.querySelector("#language-toggle");
  const popover = header.querySelector("#language-popover");
  const options = [...(popover?.querySelectorAll('[role="menuitem"]') || [])];
  const setOpen = (open, focusOption = false) => {
    if (!toggle || !popover) return;
    toggle.setAttribute("aria-expanded", String(open));
    popover.hidden = !open;
    if (open && focusOption) (popover.querySelector('[aria-current="page"]') || options[0])?.focus();
  };

  document.addEventListener("click", (event) => {
    if (event.target.closest("#language-toggle")) {
      setOpen(toggle?.getAttribute("aria-expanded") !== "true");
    } else if (menu && !menu.contains(event.target)) {
      setOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    const open = toggle?.getAttribute("aria-expanded") === "true";
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      toggle.focus();
      return;
    }
    if (toggle && document.activeElement === toggle && ["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setOpen(true, true);
      return;
    }
    if (!open || !options.includes(document.activeElement) || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = options.indexOf(document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
    options[next]?.focus();
  });
})();
