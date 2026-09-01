(() => {
  const config = window.__NOTCHANY_STORE__;
  if (!config) return;

  const byId = (id) => document.getElementById(id);
  const locale = config.language === "zh" ? "zh-CN" : "en-US";
  const text = config.copy;
  let counts = null;
  let countsStatus = "loading";

  function normalizeState(params = new URLSearchParams(location.search)) {
    const sort = ["all", "recent", "popular"].includes(params.get("sort")) ? params.get("sort") : "all";
    const kind = ["all", "widget", "action"].includes(params.get("kind")) ? params.get("kind") : "all";
    const rawPage = Number.parseInt(params.get("page") || "1", 10);
    return {
      q: (params.get("q") || "").trim(),
      sort,
      kind,
      tag: (params.get("tag") || "").trim().toLocaleLowerCase(),
      page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
    };
  }

  let state = normalizeState();

  function serializeState(next) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.sort !== "all") params.set("sort", next.sort);
    if (next.kind !== "all") params.set("kind", next.kind);
    if (next.tag) params.set("tag", next.tag);
    if (next.page > 1) params.set("page", String(next.page));
    return params.toString();
  }

  function syncURL(mode = "replace") {
    const query = serializeState(state);
    const url = `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
    history[mode === "push" ? "pushState" : "replaceState"](null, "", url);
  }

  function stableCompare(a, b) {
    return a.package_id.localeCompare(b.package_id, "en");
  }

  function catalog() {
    const query = state.q.toLocaleLowerCase();
    const items = config.packages.filter((item) => {
      if (state.kind !== "all" && item.kind !== state.kind) return false;
      if (state.tag && !item.tags.some((tag) => tag.toLocaleLowerCase() === state.tag)) return false;
      return !query || item.search.includes(query);
    });
    items.sort((a, b) => {
      if (state.sort === "recent") {
        return Date.parse(b.published_at) - Date.parse(a.published_at) || stableCompare(a, b);
      }
      if (state.sort === "popular" && counts) {
        return (counts[b.package_id] || 0) - (counts[a.package_id] || 0)
          || Date.parse(b.updated_at) - Date.parse(a.updated_at)
          || stableCompare(a, b);
      }
      return stableCompare(a, b);
    });
    const pageCount = Math.max(1, Math.ceil(items.length / 12));
    state.page = Math.min(Math.max(state.page, 1), pageCount);
    return {
      items: items.slice((state.page - 1) * 12, state.page * 12),
      total: items.length,
      pageCount,
    };
  }

  function escapeHTML(value) {
    const node = document.createElement("span");
    node.textContent = String(value);
    return node.innerHTML;
  }

  function formatCount(value) {
    return new Intl.NumberFormat(locale, { notation: value >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
  }

  function packageRow(item) {
    const count = counts?.[item.package_id];
    return `<article class="package-row">
      <img class="package-icon" src="${item.icon}" alt="" width="54" height="54">
      <div class="row-copy">
        <div class="row-title"><h3>${escapeHTML(item.name)}</h3><span class="kind-mark">${escapeHTML(item.kind_label)}</span></div>
        <p class="row-summary">${escapeHTML(item.summary)}</p>
        <div class="row-meta"><span>${escapeHTML(item.owner)}</span>${count === undefined ? "" : `<span>${formatCount(count)} ${escapeHTML(text.downloads)}</span>`}</div>
      </div>
      <a class="open-button" href="${item.href}" aria-label="${escapeHTML(`${text.open} ${item.name}`)}">${escapeHTML(text.open)}</a>
    </article>`;
  }

  function renderDetailCount() {
    const target = document.querySelector("[data-download-count]");
    if (!target) return;
    const count = counts?.[target.dataset.downloadCount];
    target.textContent = count === undefined ? "" : `${formatCount(count)} ${text.downloads}`;
  }

  function renderPagination(pageCount) {
    const root = byId("pagination");
    root.hidden = pageCount <= 1;
    if (pageCount <= 1) {
      root.replaceChildren();
      return;
    }
    const buttons = [];
    for (let page = 1; page <= pageCount; page += 1) {
      buttons.push(`<button class="page-button" type="button" data-page="${page}" ${page === state.page ? 'aria-current="page"' : ""}>${page}</button>`);
    }
    root.innerHTML = buttons.join("");
  }

  function render() {
    if (!byId("catalog-list")) {
      renderDetailCount();
      return;
    }
    const input = byId("store-search");
    if (input && input.value !== state.q) input.value = state.q;
    document.querySelectorAll("[data-sort]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.sort === state.sort)));
    document.querySelectorAll("[data-kind]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.kind === state.kind)));
    document.querySelectorAll("[data-tag]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.tag === state.tag)));
    byId("featured-section").hidden = Boolean(state.q);
    byId("clear-filters").hidden = !state.q && state.sort === "all" && state.kind === "all" && !state.tag;

    const result = catalog();
    syncURL();
    const resultCount = byId("result-count");
    resultCount.innerHTML = text.result.replace("{count}", `<strong>${result.total}</strong>`);

    const status = byId("popular-status");
    status.hidden = state.sort !== "popular" || countsStatus === "ready";
    if (!status.hidden) {
      status.innerHTML = countsStatus === "loading"
        ? escapeHTML(text.popular_loading)
        : `${escapeHTML(text.popular_unavailable)} <button class="retry-button" id="retry-counts" type="button">${escapeHTML(text.retry)}</button>`;
    }

    const list = byId("catalog-list");
    if (state.sort === "popular" && countsStatus === "error") {
      list.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><strong>${escapeHTML(text.popular_unavailable_title)}</strong>${escapeHTML(text.popular_unavailable_body)}</div>`;
      renderPagination(1);
    } else if (result.total === 0) {
      list.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><strong>${escapeHTML(text.empty_title)}</strong>${escapeHTML(text.empty_body)}</div>`;
      renderPagination(1);
    } else {
      list.innerHTML = result.items.map(packageRow).join("");
      renderPagination(result.pageCount);
    }
  }

  function update(patch, mode = "replace") {
    state = { ...state, ...patch };
    syncURL(mode);
    render();
  }

  async function loadCounts() {
    countsStatus = "loading";
    render();
    if (!config.counts_url) {
      countsStatus = "error";
      render();
      return;
    }
    try {
      const response = await fetch(config.counts_url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid counts");
      counts = body;
      countsStatus = "ready";
    } catch {
      countsStatus = "error";
    }
    render();
  }

  const search = byId("store-search");
  search?.addEventListener("input", () => update({ q: search.value, page: 1 }));
  document.addEventListener("click", (event) => {
    const sort = event.target.closest("[data-sort]");
    if (sort) update({ sort: sort.dataset.sort, page: 1 }, "push");
    const kind = event.target.closest("[data-kind]");
    if (kind) update({ kind: kind.dataset.kind, page: 1 }, "push");
    const tag = event.target.closest("[data-tag]");
    if (tag) update({ tag: state.tag === tag.dataset.tag ? "" : tag.dataset.tag, page: 1 }, "push");
    const page = event.target.closest("[data-page]");
    if (page) {
      update({ page: Number(page.dataset.page) }, "push");
      byId("catalog").scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (event.target.closest("#clear-filters")) update({ q: "", sort: "all", kind: "all", tag: "", page: 1 }, "push");
    if (event.target.closest("#retry-counts")) loadCounts();
  });
  document.addEventListener("keydown", (event) => {
    if ((event.key === "/" && !/input|textarea|select/i.test(document.activeElement?.tagName)) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) {
      event.preventDefault();
      search?.focus();
      search?.select();
    }
    if (event.key === "Escape" && search && (document.activeElement === search || state.q)) {
      event.preventDefault();
      update({ q: "", page: 1 }, "push");
      search.focus();
    }
  });
  addEventListener("popstate", () => {
    state = normalizeState();
    render();
  });

  const stage = byId("notch-stage");
  if (stage && !matchMedia("(prefers-reduced-motion: reduce)").matches && !sessionStorage.getItem("notchany-store-intro")) {
    sessionStorage.setItem("notchany-store-intro", "1");
    requestAnimationFrame(() => stage.classList.add("intro"));
    setTimeout(() => stage.classList.remove("intro"), 360);
  }

  const launch = byId("open-in-notchany");
  launch?.addEventListener("click", () => {
    const help = byId("launch-help");
    help.hidden = true;
    let timer = setTimeout(() => { help.hidden = false; }, 1400);
    const cancel = () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", cancel);
    };
    document.addEventListener("visibilitychange", cancel, { once: true });
  });

  render();
  loadCounts();
})();
