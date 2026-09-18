/**
 * BYTE & BLADES - MARKET COMPARATOR
 * Keeps a local, same-feed comparison of up to three catalog signals.
 */
(function (root) {
  const documentNode = root.document;
  const STORAGE_KEY = "cyber_comparison";
  const MAX_ITEMS = 3;
  const SUPPORTED = new Set(["weapons", "cyberwares", "programs", "cyberdecks"]);
  const state = { items: [], notice: "", previousFocus: null };

  function t(key, fallback, params = {}) {
    if (root.I18n) return root.I18n.t(key, params, fallback);
    return String(fallback).replace(/\{(\w+)\}/g, (_match, name) => params[name] ?? `{${name}}`);
  }

  function normalizeStat(stat) {
    if (!stat || typeof stat !== "object") return null;
    const key = String(stat.key || "").trim();
    const label = String(stat.label || key).trim();
    const rawValue = stat.value;
    if (!key || !label || rawValue === null || rawValue === undefined || String(rawValue).trim() === "") return null;
    return { key, label, value: String(rawValue) };
  }

  function normalizeCandidate(candidate) {
    if (!candidate || typeof candidate !== "object") return null;
    const catalog = String(candidate.catalog || "").trim();
    const id = String(candidate.id || "").trim();
    const name = String(candidate.name || "").trim();
    if (!SUPPORTED.has(catalog) || !id || !name) return null;
    const numericPrice = candidate.price === null || candidate.price === undefined || candidate.price === ""
      ? null
      : Number(candidate.price);
    return {
      catalog,
      id,
      name,
      category: String(candidate.category || catalog).trim(),
      description: String(candidate.description || "").trim(),
      price: Number.isFinite(numericPrice) ? numericPrice : null,
      url: String(candidate.url || "#"),
      stats: (Array.isArray(candidate.stats) ? candidate.stats : []).map(normalizeStat).filter(Boolean),
    };
  }

  function storage() {
    try { return root.localStorage || null; } catch { return null; }
  }

  function read() {
    try {
      const parsed = JSON.parse(storage()?.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      const normalized = parsed.map(normalizeCandidate).filter(Boolean);
      if (normalized.length === 0) return [];
      const family = normalized[0].catalog;
      const seen = new Set();
      return normalized.filter((item) => {
        const key = `${item.catalog}:${item.id}`;
        if (item.catalog !== family || seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, MAX_ITEMS);
    } catch {
      return [];
    }
  }

  function commit(items) {
    state.items = items.map(normalizeCandidate).filter(Boolean).slice(0, MAX_ITEMS);
    try { storage()?.setItem(STORAGE_KEY, JSON.stringify(state.items)); } catch {}
    render();
    root.dispatchEvent?.(new root.CustomEvent("comparison-updated", { detail: { items: current() } }));
    return current();
  }

  function current() {
    return read().map((item) => ({ ...item, stats: item.stats.map((stat) => ({ ...stat })) }));
  }

  function selected(catalog, id) {
    return read().some((item) => item.catalog === String(catalog) && item.id === String(id));
  }

  function familyLabel(catalog) {
    const labels = {
      weapons: t("compare.family.weapons", "WEAPONS"),
      cyberwares: t("compare.family.cyberwares", "CYBERWARE"),
      programs: t("compare.family.programs", "PROGRAMS"),
      cyberdecks: t("compare.family.cyberdecks", "CYBERDECKS"),
    };
    return labels[catalog] || String(catalog || "").toUpperCase();
  }

  function setNotice(message) {
    state.notice = String(message || "");
    render();
  }

  function toggle(candidate) {
    const item = normalizeCandidate(candidate);
    if (!item) {
      setNotice(t("compare.invalid", "INVALID COMPARISON SIGNAL"));
      return { ok: false, reason: "invalid" };
    }
    const items = read();
    const index = items.findIndex((entry) => entry.catalog === item.catalog && entry.id === item.id);
    state.notice = "";
    if (index >= 0) {
      items.splice(index, 1);
      commit(items);
      return { ok: true, action: "removed" };
    }
    if (items.length && items[0].catalog !== item.catalog) {
      setNotice(t("compare.same_family", "CLEAR {family} BEFORE COMPARING ANOTHER FEED", {
        family: familyLabel(items[0].catalog),
      }));
      return { ok: false, reason: "family" };
    }
    if (items.length >= MAX_ITEMS) {
      setNotice(t("compare.full", "COMPARISON BUFFER FULL // MAX {max}", { max: MAX_ITEMS }));
      return { ok: false, reason: "full" };
    }
    items.push(item);
    commit(items);
    return { ok: true, action: "added" };
  }

  function remove(catalog, id) {
    state.notice = "";
    return commit(read().filter((item) => !(item.catalog === String(catalog) && item.id === String(id))));
  }

  function clear() {
    state.notice = "";
    close();
    return commit([]);
  }

  function money(value) {
    if (!Number.isFinite(value)) return t("compare.unlisted", "NOT LISTED");
    if (root.CyberUtils?.formatCurrency) return root.CyberUtils.formatCurrency(value);
    return `${value.toLocaleString(root.I18n?.getLocale?.() || "en-US")} eb`;
  }

  function cell(value, className = "comparison-cell", role = "cell") {
    const node = documentNode.createElement("div");
    node.className = className;
    node.setAttribute("role", role);
    node.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
    return node;
  }

  function renderMatrix(items) {
    const matrix = documentNode.getElementById("comparison-matrix");
    if (!matrix) return;
    matrix.replaceChildren();
    matrix.style.setProperty("--compare-columns", items.length);
    matrix.appendChild(cell(t("compare.field", "FIELD"), "comparison-cell comparison-field comparison-header-field", "columnheader"));

    items.forEach((item) => {
      const header = documentNode.createElement("div");
      header.className = "comparison-cell comparison-item-header";
      header.setAttribute("role", "columnheader");
      const name = documentNode.createElement("strong");
      name.textContent = item.name;
      const category = documentNode.createElement("small");
      category.textContent = item.category || familyLabel(item.catalog);
      const actions = documentNode.createElement("span");
      actions.className = "comparison-header-actions";
      const source = documentNode.createElement("a");
      source.href = item.url;
      source.textContent = t("compare.open_item", "OPEN ITEM");
      const removeButton = documentNode.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = t("compare.remove", "REMOVE");
      removeButton.addEventListener("click", () => remove(item.catalog, item.id));
      actions.append(source, removeButton);
      header.append(name, category, actions);
      matrix.appendChild(header);
    });

    const rows = [
      { key: "price", label: t("compare.price", "PRICE"), values: items.map((item) => money(item.price)) },
      { key: "category", label: t("compare.category", "CATEGORY"), values: items.map((item) => item.category) },
      { key: "description", label: t("compare.description", "DESCRIPTION"), values: items.map((item) => item.description) },
    ];
    const statOrder = [];
    const statLabels = new Map();
    items.forEach((item) => item.stats.forEach((stat) => {
      if (!statLabels.has(stat.key)) statOrder.push(stat.key);
      statLabels.set(stat.key, stat.label);
    }));
    statOrder.forEach((key) => rows.push({
      key,
      label: statLabels.get(key) || key,
      values: items.map((item) => item.stats.find((stat) => stat.key === key)?.value || "—"),
    }));

    rows.forEach((row) => {
      matrix.appendChild(cell(row.label, "comparison-cell comparison-field", "rowheader"));
      row.values.forEach((value) => matrix.appendChild(cell(value)));
    });
  }

  function syncButton(button) {
    if (!button) return;
    const isSelected = selected(button.dataset.compareCatalog, button.dataset.compareId);
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
    button.textContent = isSelected
      ? t("compare.remove", "REMOVE")
      : (button.dataset.compareLabel || t("compare.add", "COMPARE"));
  }

  function syncButtons() {
    documentNode?.querySelectorAll("[data-compare-id][data-compare-catalog]").forEach(syncButton);
  }

  function render() {
    if (!documentNode) return;
    state.items = read();
    const tray = documentNode.getElementById("comparison-tray");
    const shell = documentNode.getElementById("comparison-shell");
    if (!tray) return;
    tray.classList.toggle("hidden", state.items.length === 0);
    const count = tray.querySelector("[data-comparison-count]");
    const family = tray.querySelector("[data-comparison-family]");
    const names = tray.querySelector("[data-comparison-names]");
    const notice = tray.querySelector("[data-comparison-notice]");
    const openButton = tray.querySelector("[data-comparison-open]");
    if (count) count.textContent = `${state.items.length}/${MAX_ITEMS}`;
    if (family) family.textContent = state.items.length ? familyLabel(state.items[0].catalog) : "";
    if (names) names.textContent = state.items.map((item) => item.name).join(" // ");
    if (notice) {
      notice.textContent = state.notice;
      notice.classList.toggle("hidden", !state.notice);
    }
    if (openButton) {
      openButton.disabled = state.items.length < 2;
      openButton.textContent = state.items.length < 2
        ? t("compare.need_more", "SELECT 1 MORE")
        : t("compare.open", "COMPARE NOW");
    }
    if (state.items.length < 2 && shell && !shell.classList.contains("hidden")) close();
    renderMatrix(state.items);
    syncButtons();
  }

  function open() {
    const items = read();
    const shell = documentNode?.getElementById("comparison-shell");
    if (!shell || items.length < 2) return false;
    state.previousFocus = documentNode.activeElement;
    renderMatrix(items);
    shell.classList.remove("hidden");
    documentNode.body.classList.add("compare-open");
    const closeButton = shell.querySelector(".comparison-close");
    if (root.CyberDialogs) {
      root.CyberDialogs.activate(shell, {
        dialog: shell.querySelector(".comparison-panel"),
        initialFocus: closeButton,
        returnFocus: state.previousFocus,
        onEscape: close,
      });
    } else closeButton?.focus();
    return true;
  }

  function close() {
    const shell = documentNode?.getElementById("comparison-shell");
    if (!shell || shell.classList.contains("hidden")) return false;
    shell.classList.add("hidden");
    documentNode.body.classList.remove("compare-open");
    const target = state.previousFocus;
    state.previousFocus = null;
    const restored = root.CyberDialogs?.deactivate?.(shell);
    if (!restored && target?.isConnected && typeof target.focus === "function") target.focus();
    return true;
  }

  function inject() {
    if (!documentNode || documentNode.getElementById("comparison-tray") || documentNode.querySelector(".login-container")) return;
    const tray = documentNode.createElement("aside");
    tray.id = "comparison-tray";
    tray.className = "comparison-tray hidden";
    tray.setAttribute("aria-label", t("compare.tray", "Comparison buffer"));
    tray.innerHTML = `
      <div class="comparison-tray-head"><span>${t("compare.buffer", "COMPARE BUFFER")}</span><strong data-comparison-count>0/${MAX_ITEMS}</strong></div>
      <p><span data-comparison-family></span> // <span data-comparison-names></span></p>
      <p class="comparison-notice hidden" data-comparison-notice role="status"></p>
      <div class="comparison-tray-actions">
        <button type="button" data-comparison-open>${t("compare.need_more", "SELECT 1 MORE")}</button>
        <button type="button" data-comparison-clear>${t("compare.clear", "CLEAR")}</button>
      </div>`;

    const shell = documentNode.createElement("div");
    shell.id = "comparison-shell";
    shell.className = "comparison-shell hidden";
    shell.innerHTML = `
      <section class="comparison-panel" role="dialog" aria-modal="true" aria-labelledby="comparison-title">
        <header class="comparison-header">
          <div><span class="terminal-kicker">DATATERM // SIDE-BY-SIDE</span><h2 id="comparison-title">${t("compare.title", "MARKET COMPARATOR")}</h2></div>
          <button type="button" class="comparison-close" aria-label="${t("compare.close", "Close comparator")}">ESC</button>
        </header>
        <div id="comparison-matrix" class="comparison-matrix" role="table"></div>
      </section>`;
    documentNode.body.append(tray, shell);

    tray.querySelector("[data-comparison-open]").addEventListener("click", open);
    tray.querySelector("[data-comparison-clear]").addEventListener("click", clear);
    shell.querySelector(".comparison-close").addEventListener("click", close);
    shell.addEventListener("mousedown", (event) => { if (event.target === shell) close(); });
    shell.addEventListener("keydown", (event) => {
      if (!root.CyberDialogs && event.key === "Escape") { event.preventDefault(); close(); return; }
      if (root.CyberDialogs || event.key !== "Tab") return;
      const focusable = Array.from(shell.querySelectorAll("button, a[href]"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && documentNode.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && documentNode.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
    root.addEventListener("comparator-request", (event) => toggle(event.detail));
    root.addEventListener("storage", (event) => { if (!event.key || event.key === STORAGE_KEY) render(); });
    render();
  }

  const api = {
    STORAGE_KEY, MAX_ITEMS, normalizeCandidate, read, current, selected, toggle, remove, clear,
    renderMatrix, syncButton, syncButtons, render, open, close, inject,
  };
  root.CyberComparator = api;
  if (documentNode) {
    if (documentNode.readyState === "loading") documentNode.addEventListener("DOMContentLoaded", inject);
    else inject();
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
