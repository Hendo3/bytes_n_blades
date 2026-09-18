/**
 * BYTE & BLADES - PERMANENT SIGNAL LINKS
 * Canonical URLs for catalog items, filters and custom cyberdeck builds.
 */
(function (root) {
  const MAX_PROGRAMS = 200;
  const MAX_OPTIONS = 64;

  function t(key, fallback) {
    return root.I18n ? root.I18n.t(key, {}, fallback) : fallback;
  }

  function baseUrl(base) {
    return new URL(base || root.location?.href || "https://bytes.invalid/");
  }

  function cleanUrl(base) {
    const url = baseUrl(base);
    url.search = "";
    url.hash = "";
    return url;
  }

  function setValue(params, key, value) {
    if (value === null || value === undefined || value === "" || value === false) return;
    params.set(key, value === true ? "1" : String(value));
  }

  function catalogItemUrl(itemId, configuration = {}, base) {
    const url = cleanUrl(base);
    setValue(url.searchParams, "item", itemId);
    setValue(url.searchParams, "smartchip", configuration.smartchipped ? "1" : "");
    setValue(url.searchParams, "ammo", configuration.ammoOptionKey === "base" ? "" : configuration.ammoOptionKey);
    setValue(url.searchParams, "modifier", configuration.priceModifierKey);
    setValue(url.searchParams, "level", configuration.level);
    return url.href;
  }

  function catalogFilterUrl(filters = {}, base) {
    const url = cleanUrl(base);
    setValue(url.searchParams, "category", filters.category);
    setValue(url.searchParams, "price", filters.price);
    setValue(url.searchParams, "hl", filters.hl);
    setValue(url.searchParams, "cir", filters.cir);
    setValue(url.searchParams, "difficulty", filters.difficulty);
    return url.href;
  }

  function programFilterUrl(filters = {}, base) {
    const url = cleanUrl(base);
    setValue(url.searchParams, "q", filters.query);
    setValue(url.searchParams, "class", filters.classId);
    setValue(url.searchParams, "price", filters.maxPrice);
    setValue(url.searchParams, "conversions", filters.includeConversions ? "1" : "");
    return url.href;
  }

  function builderUrl(selection = {}, includeConversions = false, base) {
    const url = cleanUrl(base);
    const params = url.searchParams;
    params.set("build", "1");
    setValue(params, "chassis", selection.chassisId);
    setValue(params, "used", selection.usedStandard ? "1" : "");
    setValue(params, "memory", selection.expandedMemory ? "1" : "");
    setValue(params, "speed", selection.speed);
    setValue(params, "wall", selection.dataWall);
    setValue(params, "connection", selection.connectionId);
    setValue(params, "conversions", includeConversions ? "1" : "");

    Object.entries(selection.options || {})
      .filter(([id, value]) => id && value !== false && value !== "" && value !== null && value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(0, MAX_OPTIONS)
      .forEach(([id, value]) => params.append("option", `${id}:${value === true ? "1" : value}`));

    [...new Set(selection.programIds || [])]
      .filter(Boolean)
      .sort()
      .slice(0, MAX_PROGRAMS)
      .forEach((id) => params.append("program", id));
    return url.href;
  }

  function paramsFrom(value) {
    if (value instanceof URLSearchParams) return value;
    if (value instanceof URL) return value.searchParams;
    return new URLSearchParams(value ?? root.location?.search ?? "");
  }

  function readBoolean(params, key) {
    return ["1", "true", "yes"].includes(String(params.get(key) || "").toLowerCase());
  }

  function readCatalogState(value) {
    const params = paramsFrom(value);
    return {
      item: params.get("item") || "",
      category: params.get("category") || "",
      price: params.get("price") || "",
      hl: params.get("hl") || "",
      cir: params.get("cir") || "",
      difficulty: params.get("difficulty") || "",
      smartchipped: readBoolean(params, "smartchip"),
      ammoOptionKey: params.get("ammo") || "",
      priceModifierKey: params.get("modifier") || "",
      level: params.get("level") || "",
    };
  }

  function readProgramState(value) {
    const params = paramsFrom(value);
    return {
      query: params.get("q") || "",
      classId: params.get("class") || "",
      maxPrice: params.get("price") || "",
      includeConversions: readBoolean(params, "conversions"),
    };
  }

  function readBuilderState(value) {
    const params = paramsFrom(value);
    if (!readBoolean(params, "build")) return null;
    const options = {};
    params.getAll("option").slice(0, MAX_OPTIONS).forEach((entry) => {
      const separator = entry.indexOf(":");
      if (separator <= 0) return;
      const id = entry.slice(0, separator);
      const rawValue = entry.slice(separator + 1);
      if (!/^[a-z0-9_-]{1,80}$/i.test(id) || rawValue.length > 120) return;
      options[id] = rawValue === "1" ? true : rawValue;
    });
    return {
      chassisId: params.get("chassis") || "",
      usedStandard: readBoolean(params, "used"),
      expandedMemory: readBoolean(params, "memory"),
      speed: params.get("speed") || "",
      dataWall: params.get("wall") || "",
      connectionId: params.get("connection") || "",
      includeConversions: readBoolean(params, "conversions"),
      options,
      programIds: [...new Set(params.getAll("program"))]
        .filter((id) => /^[a-z0-9_-]{1,120}$/i.test(id))
        .slice(0, MAX_PROGRAMS),
    };
  }

  function replace(url) {
    try {
      root.history?.replaceState?.(null, "", String(url));
    } catch {}
    return String(url);
  }

  async function copyText(value, documentNode = root.document) {
    const text = String(value);
    if (root.navigator?.clipboard?.writeText) {
      await root.navigator.clipboard.writeText(text);
      return text;
    }
    if (!documentNode?.body || typeof documentNode.execCommand !== "function") {
      throw new Error("Clipboard unavailable");
    }
    const field = documentNode.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.className = "permalink-copy-buffer";
    documentNode.body.appendChild(field);
    field.select();
    const copied = documentNode.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("Clipboard unavailable");
    return text;
  }

  function createButton(getUrl, label = t("permalink.copy", "COPY LINK"), documentNode = root.document) {
    const button = documentNode.createElement("button");
    button.type = "button";
    button.className = "btn-secondary btn-share-link";
    button.textContent = label;
    button.addEventListener("click", async () => {
      const original = button.textContent;
      try {
        await copyText(getUrl());
        button.textContent = t("permalink.copied", "LINK COPIED");
        button.classList.remove("is-error");
      } catch {
        button.textContent = t("permalink.failed", "COPY FAILED");
        button.classList.add("is-error");
      }
      root.setTimeout?.(() => {
        button.textContent = original;
        button.classList.remove("is-error");
      }, 1200);
    });
    return button;
  }

  function enhanceChipRates(container = root.document?.getElementById("chip-rate-groups")) {
    if (!container) return 0;
    const linked = readCatalogState();
    let added = 0;
    container.querySelectorAll("button[data-role='chip-add']").forEach((addButton) => {
      const controls = addButton.parentElement;
      const row = addButton.closest("li");
      const itemId = addButton.dataset.skillId;
      if (!controls || !row || !itemId) return;
      row.dataset.itemId = itemId;
      if (!controls.querySelector(".btn-share-link")) {
        const level = controls.querySelector("select[data-role='chip-level']");
        controls.appendChild(createButton(
          () => catalogItemUrl(itemId, { level: level?.value }),
          t("permalink.item", "COPY ITEM LINK"),
        ));
        added += 1;
      }
      if (linked.item !== itemId || row.classList.contains("search-target")) return;
      const level = controls.querySelector("select[data-role='chip-level']");
      if (level && [...level.options].some((option) => option.value === linked.level)) level.value = linked.level;
      row.classList.add("search-target");
      row.setAttribute("tabindex", "-1");
      row.focus({ preventScroll: true });
      row.scrollIntoView?.({ block: "center", behavior: "smooth" });
    });
    return added;
  }

  function observeChipRates() {
    const container = root.document?.getElementById("chip-rate-groups");
    if (!container || container.dataset.permalinksObserved) return;
    container.dataset.permalinksObserved = "true";
    enhanceChipRates(container);
    if (typeof root.MutationObserver !== "function") return;
    const observer = new root.MutationObserver(() => enhanceChipRates(container));
    observer.observe(container, { childList: true, subtree: true });
  }

  const api = {
    MAX_PROGRAMS,
    MAX_OPTIONS,
    catalogItemUrl,
    catalogFilterUrl,
    programFilterUrl,
    builderUrl,
    readCatalogState,
    readProgramState,
    readBuilderState,
    replace,
    copyText,
    createButton,
    enhanceChipRates,
    observeChipRates,
  };

  root.CyberPermalinks = api;
  if (root.document) root.document.addEventListener("DOMContentLoaded", observeChipRates);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
