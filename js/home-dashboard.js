/**
 * BYTE & BLADES - DATATERM HOME DASHBOARD
 */
(function (root) {
  function t(key, fallback, params = {}) {
    return root.I18n ? root.I18n.t(key, params, fallback) : fallback;
  }

  function getCart(storage = root.localStorage) {
    try {
      const value = JSON.parse(storage.getItem("cyber_cart") || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function summarize(items) {
    return (Array.isArray(items) ? items : []).reduce((summary, item) => {
      const count = Math.max(1, Math.floor(Number(item?.cartCount) || 1));
      summary.lines += 1;
      summary.items += count;
      summary.cost += (Number(item?.price) || 0) * count;
      summary.hl += (Number(item?.hl) || 0) * count;
      return summary;
    }, { lines: 0, items: 0, cost: 0, hl: 0 });
  }

  function money(value) {
    if (root.CyberUtils?.formatCurrency) return root.CyberUtils.formatCurrency(value);
    return `${Number(value || 0).toLocaleString(root.I18n?.getLocale?.() || "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} eb`;
  }

  function renderLoadout(documentNode = root.document) {
    const summary = summarize(getCart());
    const map = {
      "home-loadout-items": String(summary.items),
      "home-loadout-cost": money(summary.cost),
      "home-loadout-hl": String(summary.hl),
      "home-loadout-saves": String(root.CyberLoadouts?.list?.().length || 0),
    };
    Object.entries(map).forEach(([id, value]) => {
      const element = documentNode.getElementById(id);
      if (element) element.textContent = value;
    });
    const state = documentNode.getElementById("home-loadout-state");
    if (state) state.textContent = summary.items
      ? t("home.loadout_active", "ACTIVE LOADOUT // {count} ITEMS", { count: summary.items })
      : t("home.loadout_empty", "NO ACTIVE LOADOUT");
    return summary;
  }

  async function renderMarketCounts(documentNode = root.document) {
    if (!root.GlobalSearch?.loadIndex) return {};
    const index = await root.GlobalSearch.loadIndex();
    const counts = index.reduce((map, item) => {
      map[item.catalogId] = (map[item.catalogId] || 0) + 1;
      return map;
    }, {});
    documentNode.querySelectorAll("[data-market-count]").forEach((element) => {
      const count = counts[element.dataset.marketCount] || 0;
      element.textContent = t("home.signals", "{count} SIGNALS", { count });
    });
    const total = documentNode.getElementById("home-index-total");
    if (total) total.textContent = t("home.indexed", "{count} INDEXED SIGNALS", { count: index.length });
    return counts;
  }

  function openSearch() {
    if (root.GlobalSearch?.open) root.GlobalSearch.open();
  }

  function boot(documentNode = root.document) {
    if (!documentNode?.getElementById("dataterm-dashboard")) return;
    renderLoadout(documentNode);
    documentNode.getElementById("home-global-search")?.addEventListener("click", openSearch);
    root.addEventListener("global-search-ready", () => renderMarketCounts(documentNode));
    root.addEventListener("stash-updated", () => renderLoadout(documentNode));
    root.addEventListener("loadouts-updated", () => renderLoadout(documentNode));
    root.addEventListener("storage", () => renderLoadout(documentNode));
    if (root.GlobalSearch) renderMarketCounts(documentNode);
  }

  const api = { getCart, summarize, renderLoadout, renderMarketCounts, openSearch, boot };
  root.HomeDashboard = api;
  if (root.document) {
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", () => boot());
    else boot();
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
