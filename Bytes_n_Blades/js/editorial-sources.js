/**
 * BYTE & BLADES - EDITORIAL SOURCE REGISTRY
 * Resolves stable catalog IDs to official books and verified page references.
 */
(function (root) {
  const documentNode = root.document;
  const scriptSource = documentNode?.currentScript?.src || "https://bytes.invalid/js/editorial-sources.js";
  const state = { data: null, loading: null };

  function isPtBr() {
    return Boolean(root.I18n?.isPtBr?.());
  }

  function normalizeInline(source) {
    if (!source) return null;
    if (typeof source === "string") {
      const book = source.trim();
      return book ? { book, pages: null, verification: "book", kind: "official" } : null;
    }
    if (typeof source !== "object") return null;
    const book = String(source.book || source.title || source.source || "").trim();
    const pages = String(source.pages || source.page || "").trim() || null;
    if (!book) return null;
    return {
      book,
      pages,
      verification: pages ? "page" : "book",
      kind: String(source.kind || "official"),
      note: source.note ? String(source.note) : null,
    };
  }

  async function load(fetchImpl = root.fetch?.bind(root)) {
    if (state.data) return state.data;
    if (state.loading) return state.loading;
    if (typeof fetchImpl !== "function") return null;
    state.loading = fetchImpl(new URL("../data/editorial-sources.json", scriptSource).href, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        state.data = payload;
        state.loading = null;
        return payload;
      })
      .catch(() => {
        state.loading = null;
        return null;
      });
    return state.loading;
  }

  function expand(reference) {
    if (!reference || typeof reference !== "object") return null;
    const bookRecord = state.data?.books?.[reference.sourceId] || {};
    const book = String(reference.book || bookRecord.title || "").trim();
    if (!book) return null;
    return {
      sourceId: reference.sourceId || null,
      book,
      pages: reference.pages === null || reference.pages === undefined || reference.pages === ""
        ? null
        : String(reference.pages),
      verification: String(reference.verification || (reference.pages ? "page" : "book")),
      kind: String(reference.kind || bookRecord.kind || "official"),
      note: reference.note ? String(reference.note) : null,
    };
  }

  function resolve(catalog, id, inlineSource = null, category = "") {
    const inline = normalizeInline(inlineSource);
    if (inline?.pages) return inline;
    const feed = state.data?.catalogs?.[String(catalog || "")];
    const reference = feed?.items?.[String(id || "")]
      || feed?.categories?.[String(category || "")]
      || feed?.default
      || null;
    return expand(reference) || inline;
  }

  function label(source) {
    const normalized = normalizeInline(source) || source;
    if (!normalized?.book || normalized.sourceId === "unverified" || normalized.verification === "unverified" || normalized.kind === "unverified") {
      return isPtBr() ? "ORIGEM OFICIAL NÃO VERIFICADA" : "OFFICIAL ORIGIN UNVERIFIED";
    }
    if (normalized.pages) return `${normalized.book} · p. ${normalized.pages}`;
    return `${normalized.book} · ${isPtBr() ? "PÁGINA NÃO VERIFICADA" : "PAGE UNVERIFIED"}`;
  }

  function createLine(source, className = "editorial-source") {
    if (!documentNode) return null;
    const line = documentNode.createElement("p");
    line.className = className;
    line.dataset.sourceVerification = source?.verification || "unverified";
    line.textContent = `${isPtBr() ? "FONTE" : "SOURCE"} // ${label(source)}`;
    return line;
  }

  function resetForTests() {
    state.data = null;
    state.loading = null;
  }

  function decorateChipRows() {
    const container = documentNode?.getElementById("chip-rate-groups");
    if (!container) return;
    container.querySelectorAll("button[data-skill-id]").forEach((button) => {
      const row = button.closest("li");
      if (!row || row.querySelector(".editorial-source")) return;
      const id = `${button.dataset.pageType || "chip"}_${button.dataset.skillId}`;
      const source = resolve("chips", id, null, button.dataset.section || "");
      const line = createLine(source, "editorial-source editorial-source--inline");
      if (line) (button.parentElement?.parentElement || row).appendChild(line);
    });
  }

  const api = { load, resolve, label, createLine, normalizeInline, decorateChipRows, resetForTests, state };
  root.CyberSources = api;
  if (documentNode) {
    documentNode.addEventListener("DOMContentLoaded", () => {
      const container = documentNode.getElementById("chip-rate-groups");
      if (!container) return;
      load().then(decorateChipRows);
      if (typeof root.MutationObserver === "function") {
        new root.MutationObserver(decorateChipRows).observe(container, { childList: true, subtree: true });
      }
    });
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
