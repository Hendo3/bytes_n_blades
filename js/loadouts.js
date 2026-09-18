/**
 * BYTE & BLADES - LOCAL LOADOUT VAULT
 * Named, device-local stash snapshots with deterministic JSON import/export.
 */
(function (root) {
  const CART_KEY = "cyber_cart";
  const LOADOUTS_KEY = "cyber_loadouts";
  const MAX_ITEMS = 1000;
  const MAX_NAME = 48;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeArray(storage, key) {
    try {
      const value = JSON.parse(storage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function normalizeName(value, fallback = "UNTITLED RUN") {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, MAX_NAME) || fallback;
  }

  function sanitizeItems(value) {
    if (!Array.isArray(value)) throw new Error("Loadout items must be an array");
    if (value.length > MAX_ITEMS) throw new Error(`Loadout exceeds ${MAX_ITEMS} items`);
    return clone(value.filter((item) => item && typeof item === "object" && !Array.isArray(item)));
  }

  function parseImport(value) {
    const payload = typeof value === "string" ? JSON.parse(value) : value;
    const items = Array.isArray(payload) ? payload : payload?.items;
    return {
      name: normalizeName(payload?.name || payload?.runner_id || "IMPORTED RUN"),
      items: sanitizeItems(items),
    };
  }

  function list(storage = root.localStorage) {
    return safeArray(storage, LOADOUTS_KEY)
      .filter((entry) => entry && typeof entry === "object" && Array.isArray(entry.items) && entry.id)
      .map((entry) => ({ ...entry, name: normalizeName(entry.name) }))
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }

  function current(storage = root.localStorage) {
    return sanitizeItems(safeArray(storage, CART_KEY));
  }

  function notify(type) {
    if (typeof root.dispatchEvent !== "function" || typeof root.Event !== "function") return;
    root.dispatchEvent(new root.Event(type));
  }

  function save(name, items = current(), storage = root.localStorage, now = new Date()) {
    const safeName = normalizeName(name, "CURRENT RUN");
    const safeItems = sanitizeItems(items);
    const entries = list(storage);
    const timestamp = now.toISOString();
    const existing = entries.find((entry) => entry.name.toLowerCase() === safeName.toLowerCase());
    const saved = existing
      ? { ...existing, name: safeName, items: safeItems, updatedAt: timestamp }
      : {
          id: `loadout_${timestamp.replace(/[^0-9]/g, "")}_${entries.length + 1}`,
          name: safeName,
          items: safeItems,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
    const next = existing
      ? entries.map((entry) => entry.id === existing.id ? saved : entry)
      : [saved, ...entries];
    storage.setItem(LOADOUTS_KEY, JSON.stringify(next));
    notify("loadouts-updated");
    return clone(saved);
  }

  function load(id, storage = root.localStorage) {
    const entry = list(storage).find((candidate) => candidate.id === id);
    if (!entry) return null;
    storage.setItem(CART_KEY, JSON.stringify(sanitizeItems(entry.items)));
    notify("stash-updated");
    return clone(entry);
  }

  function remove(id, storage = root.localStorage) {
    const entries = list(storage);
    const next = entries.filter((entry) => entry.id !== id);
    if (next.length === entries.length) return false;
    storage.setItem(LOADOUTS_KEY, JSON.stringify(next));
    notify("loadouts-updated");
    return true;
  }

  function importToCart(value, storage = root.localStorage) {
    const imported = parseImport(value);
    storage.setItem(CART_KEY, JSON.stringify(imported.items));
    notify("stash-updated");
    return imported;
  }

  function exportPayload(entry, runnerId = "UNKNOWN_RUNNER", now = new Date()) {
    const items = sanitizeItems(entry?.items || []);
    return {
      format: "bytes-and-blades-loadout-v1",
      name: normalizeName(entry?.name || "CURRENT RUN"),
      runner_id: String(runnerId || "UNKNOWN_RUNNER"),
      timestamp: now.toISOString(),
      summary: {
        total_cost: items.reduce((sum, item) => sum + (Number(item.price) || 0) * Math.max(1, Number(item.cartCount) || 1), 0),
        total_humanity_loss: items.reduce((sum, item) => sum + (Number(item.hl) || 0) * Math.max(1, Number(item.cartCount) || 1), 0),
        item_count: items.reduce((sum, item) => sum + Math.max(1, Number(item.cartCount) || 1), 0),
      },
      items,
    };
  }

  function download(entry, runnerId, documentNode = root.document, now = new Date()) {
    const payload = exportPayload(entry, runnerId, now);
    const blob = new root.Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = root.URL.createObjectURL(blob);
    const anchor = documentNode.createElement("a");
    anchor.href = url;
    anchor.download = `LOADOUT_${normalizeName(payload.name).replace(/[^a-z0-9]+/gi, "_").toUpperCase()}_${now.toISOString().slice(0, 10)}.json`;
    documentNode.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    root.URL.revokeObjectURL(url);
    return payload;
  }

  const api = {
    CART_KEY,
    LOADOUTS_KEY,
    MAX_ITEMS,
    normalizeName,
    sanitizeItems,
    parseImport,
    list,
    current,
    save,
    load,
    remove,
    importToCart,
    exportPayload,
    download,
  };

  root.CyberLoadouts = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
