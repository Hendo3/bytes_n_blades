/**
 * BYTE & BLADES - GLOBAL SIGNAL SEARCH
 * Lazy, bilingual lookup across every published market feed.
 */
(function (root) {
  const documentNode = root.document;
  const scriptSource = documentNode?.currentScript?.src || "https://bytes.invalid/js/global-search.js";
  const state = { index: null, loading: null, active: -1, previousFocus: null };

  function t(key, fallback, params = {}) {
    return root.I18n ? root.I18n.t(key, params, fallback) : fallback;
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function pageUrl(page, id) {
    const url = new URL(`../html/${page}`, scriptSource);
    if (id) url.searchParams.set("item", id);
    return url.href;
  }

  function indexEntry(entry) {
    const normalized = {
      id: String(entry.id || ""),
      name: String(entry.name || entry.id || "UNKNOWN SIGNAL"),
      description: String(entry.description || entry.effect || entry.note || ""),
      category: String(entry.category || "Unsorted"),
      catalog: String(entry.catalog || "Market"),
      catalogId: String(entry.catalogId || "market"),
      price: entry.price !== null && entry.price !== undefined && entry.price !== "" && Number.isFinite(Number(entry.price))
        ? Number(entry.price)
        : null,
      url: String(entry.url || "#"),
    };
    normalized.source = root.CyberSources?.resolve?.(
      normalized.catalogId,
      normalized.id,
      entry.source,
      normalized.category,
    ) || null;
    normalized.searchText = normalize([
      normalized.name,
      normalized.description,
      normalized.category,
      normalized.catalog,
      entry.extra,
      root.CyberSources?.label?.(normalized.source),
    ].join(" "));
    return normalized;
  }

  function buildIndex(payloads) {
    const entries = [];
    const push = (entry) => entries.push(indexEntry(entry));

    for (const [categoryId, category] of Object.entries(payloads.cyberwares?.data || {})) {
      const items = category?.itens || category?.items || category?.list || {};
      for (const [id, item] of Object.entries(items)) push({
        id: item.id || id,
        name: item.name || id,
        description: item.description || item.note,
        category: category.name || categoryId,
        catalog: t("search.catalog_cyberware", "Cyberware"),
        catalogId: "cyberwares",
        price: item.price,
        url: pageUrl("cyberwares.html", item.id || id),
        extra: [item.surg, item.HL, item.CIR].join(" "),
      });
    }

    for (const [categoryId, category] of Object.entries(payloads.equipment?.data || {})) {
      const items = category?.list || category?.items || category?.itens || {};
      for (const [id, item] of Object.entries(items)) push({
        id: item.id || id,
        name: item.name || id,
        description: item.description || item.note,
        category: category.name || categoryId,
        catalog: t("search.catalog_equipment", "Equipment"),
        catalogId: "accessories",
        price: item.price,
        url: pageUrl("accessories.html", item.id || id),
      });
    }

    for (const item of payloads.weapons?.weapons || []) push({
      id: item.id,
      name: item.name,
      description: item.Note || item.note,
      category: item.class,
      catalog: t("search.catalog_weapons", "Weapons"),
      catalogId: "weapons",
      price: item.price,
      url: pageUrl("weapons.html", item.id),
      extra: [item.damage, item.ammo_type, item.type_code].join(" "),
    });

    for (const item of payloads.ammo?.items || []) push({
      id: item.id,
      name: item.name,
      description: item.description || item.effect,
      category: item.category,
      catalog: t("search.catalog_ammo", "Ammo & Add-ons"),
      catalogId: "ammo",
      price: item.price,
      url: pageUrl("ammo.html", item.id),
      extra: [item.effect, item.compatibility].join(" "),
    });

    const drugItems = payloads.drugs?.data?.street_stock?.items || {};
    for (const [id, item] of Object.entries(drugItems)) push({
      id: item.id || id,
      name: item.name,
      description: item.description || item.effects,
      category: item.type || t("search.catalog_drugs", "Drugs"),
      catalog: t("search.catalog_drugs", "Drugs"),
      catalogId: "drugs",
      price: item.price,
      url: pageUrl("drugs.html", item.id || id),
      extra: [item.effects, item.strength, item.duration].join(" "),
    });

    for (const program of payloads.programs?.programs || []) push({
      id: program.id,
      name: program.name,
      description: program.effect,
      category: (program.class_ids || [program.class_id]).filter(Boolean).join(" / "),
      catalog: t("search.catalog_programs", "Programs"),
      catalogId: "programs",
      price: program.price,
      url: pageUrl("programs.html", program.id),
      extra: [program.platform, program.icon, program.availability].join(" "),
      source: program.source,
    });

    for (const deck of payloads.cyberdecks?.decks || []) push({
      id: deck.id,
      name: deck.name,
      description: deck.description,
      category: t("search.catalog_decks", "Cyberdecks"),
      catalog: t("search.catalog_decks", "Cyberdecks"),
      catalogId: "cyberdecks",
      price: deck.price,
      url: pageUrl("cyberdecks.html", deck.id),
      extra: [deck.memory, deck.speed, deck.source?.book].join(" "),
      source: deck.source,
    });

    const chipPages = {
      aptr: "aptr-chips.html",
      mram: "mram-chips.html",
      visual_recognition: "visual-rec-chips.html",
    };
    for (const [type, spec] of Object.entries(payloads.chips?.data || {})) {
      for (const section of spec.sections || []) {
        for (const item of section.items || []) push({
          id: `${type}_${item.id}`,
          name: item.skill,
          description: item.note,
          category: section.label,
          catalog: `${t("search.catalog_chips", "Skill Chips")} · ${spec.label}`,
          catalogId: "chips",
          price: item.pricePerLevel ?? item.levelPrices?.[0],
          url: pageUrl(chipPages[type] || "cyberwares.html", item.id),
        });
      }
    }

    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }

  function scoreItem(item, query) {
    const terms = normalize(query).split(" ").filter(Boolean);
    if (terms.length === 0) return 1;
    const name = normalize(item.name);
    const category = normalize(item.category);
    let score = 0;
    for (const term of terms) {
      if (!item.searchText.includes(term)) return 0;
      if (name === term) score += 120;
      else if (name.startsWith(term)) score += 80;
      else if (name.includes(term)) score += 50;
      else if (category.includes(term)) score += 20;
      else score += 8;
    }
    return score;
  }

  function searchItems(index, query, catalogId = "") {
    return (index || [])
      .map((item) => ({ item, score: scoreItem(item, query) }))
      .filter(({ item, score }) => score > 0 && (!catalogId || item.catalogId === catalogId))
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
      .slice(0, 40)
      .map(({ item }) => item);
  }

  async function loadIndex(fetchImpl = root.fetch?.bind(root)) {
    if (state.index) return state.index;
    if (state.loading) return state.loading;
    const localeSuffix = root.I18n?.isPtBr?.() ? ".pt-BR" : "";
    const files = {
      cyberwares: "cyberwares",
      equipment: "equipment",
      weapons: "weapons",
      ammo: "ammo",
      drugs: "drugs",
      programs: "programs",
      cyberdecks: "cyberdecks",
      chips: "chip-rates",
    };
    state.loading = Promise.resolve(root.CyberSources?.load?.(fetchImpl)).then(() => Promise.all(Object.entries(files).map(async ([key, file]) => {
      try {
        const response = await fetchImpl(new URL(`../data/${file}${localeSuffix}.json`, scriptSource).href, { cache: "no-store" });
        if (!response.ok) return [key, null];
        return [key, await response.json()];
      } catch {
        return [key, null];
      }
    }))).then((pairs) => {
      state.index = buildIndex(Object.fromEntries(pairs));
      state.loading = null;
      return state.index;
    });
    return state.loading;
  }

  function money(value) {
    if (!Number.isFinite(value)) return t("search.quote", "QUOTE");
    return root.CyberUtils?.formatCurrency?.(value) || `${value.toLocaleString(root.I18n?.getLocale?.() || "en-US")} eb`;
  }

  function renderResults() {
    const query = documentNode.getElementById("global-search-input")?.value || "";
    const catalog = documentNode.getElementById("global-search-catalog")?.value || "";
    const results = searchItems(state.index, query, catalog);
    const container = documentNode.getElementById("global-search-results");
    const count = documentNode.getElementById("global-search-count");
    if (!container) return;
    container.replaceChildren();
    state.active = -1;
    if (count) count.textContent = t("search.result_count", "{shown} of {total} signals", {
      shown: results.length,
      total: state.index?.length || 0,
    });
    if (results.length === 0) {
      const empty = documentNode.createElement("p");
      empty.className = "global-search-empty";
      empty.textContent = t("search.empty", "NO SIGNALS MATCH THIS QUERY");
      container.appendChild(empty);
      return;
    }
    results.forEach((item) => {
      const link = documentNode.createElement("a");
      link.className = "global-search-result";
      link.href = item.url;
      link.setAttribute("role", "option");
      const main = documentNode.createElement("span");
      main.className = "global-search-result-main";
      const name = documentNode.createElement("strong");
      name.textContent = item.name;
      const meta = documentNode.createElement("small");
      meta.textContent = `${item.catalog} // ${item.category}`;
      main.append(name, meta);
      if (item.source) {
        const source = documentNode.createElement("small");
        source.className = "global-search-source";
        source.textContent = `${t("compare.source", "SOURCE")} // ${root.CyberSources.label(item.source)}`;
        main.appendChild(source);
      }
      const price = documentNode.createElement("span");
      price.className = "global-search-price";
      price.textContent = money(item.price);
      link.append(main, price);
      container.appendChild(link);
    });
  }

  function setActive(next) {
    const results = Array.from(documentNode.querySelectorAll(".global-search-result"));
    if (results.length === 0) return;
    state.active = (next + results.length) % results.length;
    results.forEach((result, index) => result.classList.toggle("is-active", index === state.active));
    results[state.active].scrollIntoView({ block: "nearest" });
  }

  async function open() {
    const shell = documentNode?.getElementById("global-search-shell");
    if (!shell) return;
    if (shell.classList.contains("hidden")) state.previousFocus = documentNode.activeElement;
    shell.classList.remove("hidden");
    documentNode.body.classList.add("search-open");
    const input = documentNode.getElementById("global-search-input");
    if (root.CyberDialogs) {
      root.CyberDialogs.activate(shell, {
        dialog: shell.querySelector(".global-search-panel"),
        initialFocus: input,
        returnFocus: state.previousFocus,
        onEscape: close,
      });
    } else input?.focus();
    const count = documentNode.getElementById("global-search-count");
    if (count) count.textContent = t("search.loading", "SCANNING MARKET FEEDS...");
    await loadIndex();
    renderResults();
  }

  function close() {
    const shell = documentNode?.getElementById("global-search-shell");
    if (!shell || shell.classList.contains("hidden")) return;
    shell.classList.add("hidden");
    documentNode.body.classList.remove("search-open");
    const target = state.previousFocus;
    state.previousFocus = null;
    const restored = root.CyberDialogs?.deactivate?.(shell);
    if (!restored && target?.isConnected && typeof target.focus === "function") target.focus();
  }

  function inject() {
    if (!documentNode || documentNode.getElementById("global-search-shell") || documentNode.querySelector(".login-container")) return;
    const shell = documentNode.createElement("div");
    shell.id = "global-search-shell";
    shell.className = "global-search-shell hidden";
    shell.innerHTML = `
      <section class="global-search-panel" role="dialog" aria-modal="true" aria-labelledby="global-search-title">
        <header class="global-search-header">
          <div><span class="terminal-kicker">DATATERM // GLOBAL INDEX</span><h2 id="global-search-title">${t("search.title", "SIGNAL SEARCH")}</h2></div>
          <button type="button" class="global-search-close" aria-label="${t("search.close", "Close search")}">ESC</button>
        </header>
        <div class="global-search-controls">
          <label for="global-search-input">${t("search.query", "QUERY")}</label>
          <input id="global-search-input" type="search" autocomplete="off" placeholder="${t("search.placeholder", "Name, effect, category, caliber...")}">
          <label for="global-search-catalog">${t("search.feed", "FEED")}</label>
          <select id="global-search-catalog">
            <option value="">${t("search.all_feeds", "ALL FEEDS")}</option>
            <option value="cyberwares">${t("search.catalog_cyberware", "Cyberware")}</option>
            <option value="accessories">${t("search.catalog_equipment", "Equipment")}</option>
            <option value="weapons">${t("search.catalog_weapons", "Weapons")}</option>
            <option value="ammo">${t("search.catalog_ammo", "Ammo & Add-ons")}</option>
            <option value="drugs">${t("search.catalog_drugs", "Drugs")}</option>
            <option value="programs">${t("search.catalog_programs", "Programs")}</option>
            <option value="cyberdecks">${t("search.catalog_decks", "Cyberdecks")}</option>
            <option value="chips">${t("search.catalog_chips", "Skill Chips")}</option>
          </select>
        </div>
        <div class="global-search-status"><span id="global-search-count">${t("search.ready", "READY")}</span><span>↑↓ ${t("search.navigate", "NAVIGATE")} // ENTER ${t("search.open", "OPEN")}</span></div>
        <div id="global-search-results" class="global-search-results" role="listbox"></div>
      </section>`;
    documentNode.body.appendChild(shell);

    shell.querySelector(".global-search-close").addEventListener("click", close);
    shell.addEventListener("mousedown", (event) => { if (event.target === shell) close(); });
    shell.querySelector("input").addEventListener("input", renderResults);
    shell.querySelector("select").addEventListener("change", renderResults);
    shell.addEventListener("keydown", (event) => {
      if (!root.CyberDialogs && event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "ArrowDown") { event.preventDefault(); setActive(state.active + 1); }
      if (event.key === "ArrowUp") { event.preventDefault(); setActive(state.active - 1); }
      if (event.key === "Enter" && state.active >= 0) {
        event.preventDefault();
        shell.querySelectorAll(".global-search-result")[state.active]?.click();
      }
      if (!root.CyberDialogs && event.key === "Tab") {
        const focusable = Array.from(shell.querySelectorAll("button, input, select, a[href]"));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && documentNode.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && documentNode.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });

    root.addEventListener("keydown", (event) => {
      const shortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      const slash = event.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(documentNode.activeElement?.tagName || "");
      if (!shortcut && !slash) return;
      event.preventDefault();
      shell.classList.contains("hidden") ? open() : close();
    });
    root.dispatchEvent(new root.Event("global-search-ready"));
  }

  const api = { normalize, buildIndex, scoreItem, searchItems, loadIndex, renderResults, open, close, inject };
  root.GlobalSearch = api;
  if (documentNode) {
    if (documentNode.readyState === "loading") documentNode.addEventListener("DOMContentLoaded", inject);
    else inject();
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
