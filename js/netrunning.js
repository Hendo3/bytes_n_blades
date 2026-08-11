/**
 * BYTE & BLADES - NETRUNNING MARKET
 * Program catalog, published cyberdecks and custom deck assembly.
 */
(function (root) {
  const CART_KEY = "cyber_cart";

  function t(key, fallback, params = {}) {
    if (root.I18n) return root.I18n.t(key, params, fallback);
    return String(fallback).replace(/\{(\w+)\}/g, (_match, name) => params[name] ?? `{${name}}`);
  }

  function dataPath(path) {
    return root.I18n ? root.I18n.dataPath(path) : path;
  }

  function money(value) {
    if (root.CyberUtils) return root.CyberUtils.formatCurrency(value);
    return `${Number(value || 0).toLocaleString(root.I18n?.getLocale?.() || "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} eb`;
  }

  function strengthLabel(program) {
    if (program?.strength?.display) return String(program.strength.display);
    const base = Number(program?.strength?.base) || 0;
    const extras = (program?.strength?.situational || [])
      .map((entry) => `${entry.value} ${entry.when}`)
      .join("; ");
    return extras ? `${base} (${extras})` : String(base);
  }

  function memoryLabel(program) {
    if (Number.isFinite(program?.memory)) return String(program.memory);
    return String(program?.memory_model?.label || t("net.variable", "Variable"));
  }

  function priceLabel(item) {
    const model = item?.price_model || (Number.isFinite(item?.price) ? { kind: "fixed", amount: item.price } : {});
    if (model.kind === "fixed") {
      const prefix = item?.price_qualifier === "approximate" ? "≈ " : "";
      return `${prefix}${money(model.amount ?? item.price)}`;
    }
    if (model.label) return model.label;
    if (model.kind === "not_for_sale") return t("net.not_for_sale", "NOT FOR SALE");
    return t("net.quote", "CONTACT FIXER");
  }

  function isPurchasable(item) {
    const kind = item?.price_model?.kind || (Number.isFinite(item?.price) ? "fixed" : "unknown");
    return kind === "fixed" && Number.isFinite(item?.price)
      && !["not_for_sale", "quote"].includes(item?.availability);
  }

  function programClasses(program) {
    return Array.isArray(program?.class_ids) && program.class_ids.length
      ? program.class_ids
      : [program?.class_id].filter(Boolean);
  }

  function filterPrograms(programs, filters = {}) {
    const query = String(filters.query || "").trim().toLowerCase();
    const classId = String(filters.classId || "");
    const maxPrice = filters.maxPrice === "" || filters.maxPrice == null
      ? Number.POSITIVE_INFINITY
      : Number(filters.maxPrice);
    return (programs || []).filter((program) => {
      if (!filters.includeConversions && program.catalog_scope === "netrunner_conversion") return false;
      if (classId && !programClasses(program).includes(classId)) return false;
      if (Number.isFinite(maxPrice) && (!Number.isFinite(program.price) || program.price > maxPrice)) return false;
      if (!query) return true;
      return [program.name, program.effect, program.icon, program.platform, program.availability, ...programClasses(program)]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }

  function calculateDeck(builder, programs, selection = {}) {
    const chassis = builder.chassis.find((entry) => entry.id === selection.chassisId)
      || builder.chassis[0];
    const connection = builder.connections.find((entry) => entry.id === selection.connectionId)
      || builder.connections[0];
    const selectedSpeed = Math.min(builder.limits.speed[1], Math.max(builder.limits.speed[0], Number(selection.speed) || 0));
    const dataWall = Math.min(builder.limits.data_wall[1], Math.max(builder.limits.data_wall[0], Number(selection.dataWall) || builder.base_stats.data_wall));
    const expandedMemory = Boolean(selection.expandedMemory);
    const baseMemory = expandedMemory ? builder.upgrades.expanded_memory.memory : builder.base_stats.memory;
    const usedStandard = chassis.id === "standard" && Boolean(selection.usedStandard);
    const chosenOptions = [];
    let price = usedStandard ? chassis.used_price : chassis.price;
    let memoryBonus = 0;
    let cellular = Boolean(chassis.cellular);
    const bundledOptionIds = new Set(chassis.bundled_option_ids || []);
    const percentageOptions = [];

    if (expandedMemory) price += builder.upgrades.expanded_memory.price;
    price += selectedSpeed * builder.upgrades.speed_per_level;
    price += (dataWall - builder.base_stats.data_wall) * builder.upgrades.data_wall_per_level;
    price += connection.price || 0;

    for (const option of builder.options) {
      const value = selection.options?.[option.id];
      if (!value) continue;
      if (option.pricing === "per_unit" && Number(value) <= 0) continue;
      if (bundledOptionIds.has(option.id)) continue;
      if (option.pricing === "fixed") {
        price += option.price;
        chosenOptions.push({ id: option.id, name: option.name, quantity: 1, price: option.price });
      } else if (option.pricing === "per_unit") {
        const quantity = Math.min(option.max, Math.max(option.min, Number(value) || option.min));
        const optionPrice = quantity * option.price_per_unit;
        price += optionPrice;
        chosenOptions.push({ id: option.id, name: option.name, quantity, unit: option.unit, price: optionPrice });
      } else if (option.pricing === "range") {
        const choice = option.choices.find((entry) => entry.id === value) || option.choices[0];
        price += choice.price;
        chosenOptions.push({ id: option.id, name: option.name, choiceId: choice.id, choiceName: choice.name, quantity: 1, price: choice.price });
      } else if (option.pricing === "percentage") {
        percentageOptions.push(option);
      }
      memoryBonus += Number(option.effects?.memory_bonus) || 0;
      if (option.effects?.cellular) cellular = true;
    }

    for (const option of percentageOptions) {
      const optionPrice = price * (Number(option.percent) || 0) / 100;
      price += optionPrice;
      chosenOptions.push({ id: option.id, name: option.name, quantity: 1, percent: option.percent, price: optionPrice });
    }

    const selectedIds = new Set(selection.programIds || []);
    const loadedPrograms = (programs || []).filter((program) => selectedIds.has(program.id)
      && program.loadable !== false
      && program.platform === "cyberdeck"
      && Number.isFinite(program.memory)
      && Number.isFinite(program.price));
    const memoryUsed = loadedPrograms.reduce((sum, program) => sum + program.memory, 0);
    const programsPrice = loadedPrograms.reduce((sum, program) => sum + program.price, 0);
    price += programsPrice;

    const programEffects = loadedPrograms.map((program) => program.deck_effects || {});
    let memory = baseMemory;
    if (programEffects.some((effect) => effect.double_remaining_memory)) memory = (baseMemory * 2) - 4;
    else if (programEffects.some((effect) => effect.memory_multiplier)) {
      memory = Math.floor(baseMemory * Math.max(...programEffects.map((effect) => effect.memory_multiplier || 1)));
    }
    memory += memoryBonus;
    const speed = selectedSpeed + programEffects.reduce((sum, effect) => sum + (Number(effect.speed_modifier) || 0), 0);

    return {
      chassis, connection, cpu: builder.base_stats.cpu, memory, speed, dataWall,
      baseMemory, armorSp: chassis.armor_sp, portable: chassis.portable, cellular,
      usedStandard, expandedMemory, options: chosenOptions, programs: loadedPrograms,
      memoryUsed, memoryFree: memory - memoryUsed, programsPrice, price,
      valid: memoryUsed <= memory,
    };
  }

  function createProgramCartItem(program, classLabel) {
    return {
      id: program.id,
      name: program.name,
      category: "programs",
      categoryLabel: classLabel || program.class_id,
      sourceCatalog: "programs",
      locale: root.I18n?.getLocale?.() || "en-US",
      price: program.price,
      hl: 0,
      program: {
        classId: program.class_id,
        classIds: programClasses(program),
        strength: program.strength,
        memory: program.memory,
        platform: program.platform,
        catalogScope: program.catalog_scope,
      },
    };
  }

  function createDeckCartItem(deck) {
    return {
      id: deck.id,
      name: deck.name,
      category: "cyberdecks",
      categoryLabel: t("net.decks", "Cyberdecks"),
      sourceCatalog: "cyberdecks",
      locale: root.I18n?.getLocale?.() || "en-US",
      price: deck.price,
      hl: 0,
      deckConfiguration: {
        kind: "published", cpu: deck.cpu, memory: deck.memory, speed: deck.speed,
        dataWall: deck.data_wall, armorSp: deck.armor_sp, portable: deck.portable,
        cellular: deck.cellular, optionIds: deck.options || [], programIds: [],
        source: deck.source ? { ...deck.source } : null,
        reprintSource: deck.reprint_source ? { ...deck.reprint_source } : null,
      },
    };
  }

  function createNetgearCartItem(item, quantity = 1) {
    const unitPrice = item.pricing === "per_unit" ? item.price_per_unit : item.price;
    const safeQuantity = item.pricing === "per_unit"
      ? Math.min(item.max, Math.max(item.min, Number(quantity) || item.min))
      : 1;
    return {
      id: item.id,
      name: item.name,
      category: "netgear",
      categoryLabel: t("net.netgear", "Deck Support"),
      sourceCatalog: "cyberdecks",
      locale: root.I18n?.getLocale?.() || "en-US",
      price: unitPrice * safeQuantity,
      hl: 0,
      netgear: { quantity: safeQuantity, unit: item.unit || null, unitPrice },
    };
  }

  function createCustomDeckCartItem(result) {
    return {
      id: `custom_cyberdeck_${Date.now()}`,
      name: t("net.custom_deck", "Custom Cyberdeck"),
      category: "cyberdecks",
      categoryLabel: t("net.decks", "Cyberdecks"),
      sourceCatalog: "cyberdecks",
      locale: root.I18n?.getLocale?.() || "en-US",
      price: Number(result.price.toFixed(2)),
      hl: 0,
      deckConfiguration: {
        kind: "custom", chassisId: result.chassis.id, usedStandard: result.usedStandard,
        cpu: result.cpu, memory: result.memory, baseMemory: result.baseMemory, speed: result.speed, dataWall: result.dataWall,
        armorSp: result.armorSp, portable: result.portable, cellular: result.cellular,
        expandedMemory: result.expandedMemory, connectionId: result.connection.id,
        options: result.options.map((entry) => ({ ...entry })),
        programIds: result.programs.map((program) => program.id),
        memoryUsed: result.memoryUsed,
      },
    };
  }

  function selectProgramsForDeck(programs, memory, budget = Number.POSITIVE_INFINITY, random = Math.random) {
    const priorities = ["intrusion", "protection", "detection_alarm", "evasion_stealth", "anti_personnel", "utility"];
    const shuffled = (programs || []).filter((program) => program.loadable !== false
      && program.platform === "cyberdeck"
      && program.catalog_scope !== "netrunner_conversion"
      && Number.isFinite(program.memory)
      && Number.isFinite(program.price)).sort(() => random() - 0.5);
    const ordered = shuffled.sort((a, b) => {
      const ai = priorities.indexOf(a.class_id);
      const bi = priorities.indexOf(b.class_id);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
    const selected = [];
    let used = 0;
    let spent = 0;
    for (const program of ordered) {
      if (used + program.memory > memory || spent + program.price > budget) continue;
      selected.push(program);
      used += program.memory;
      spent += program.price;
      if (used === memory) break;
    }
    return selected;
  }

  function getCart() {
    try { return JSON.parse(root.localStorage?.getItem(CART_KEY) || "[]"); } catch { return []; }
  }

  function addItem(item, button) {
    root.localStorage?.setItem(CART_KEY, JSON.stringify([...getCart(), item]));
    root.dispatchEvent?.(new Event("stash-updated"));
    if (button) {
      const old = button.textContent;
      button.textContent = t("net.added", "ADDED");
      button.disabled = true;
      root.setTimeout(() => { button.textContent = old; button.disabled = false; }, 900);
    }
  }

  async function loadData() {
    const [programResponse, deckResponse] = await Promise.all([
      fetch(dataPath("../data/programs.json"), { cache: "no-store" }),
      fetch(dataPath("../data/cyberdecks.json"), { cache: "no-store" }),
    ]);
    if (!programResponse.ok || !deckResponse.ok) throw new Error(t("net.offline", "Netrunning feed offline"));
    return { programs: await programResponse.json(), decks: await deckResponse.json() };
  }

  function renderProgramCard(program, classes) {
    const card = document.createElement("article");
    card.className = "item program-card";
    const classLabel = programClasses(program).map((id) => classes.get(id) || id).join(" / ");
    const scopeBadge = program.catalog_scope === "netrunner_conversion"
      ? `<span>${t("net.optional_conversion", "OPTIONAL CONVERSION")}</span>`
      : "";
    const platformBadge = program.platform === "data_fortress"
      ? `<span>${t("net.fortress_product", "FORTRESS PRODUCT")}</span>`
      : `<span>${t("net.deck_software", "DECK SOFTWARE")}</span>`;
    card.innerHTML = `
      ${program.icon ? `<p class="program-icon" aria-label="${t("net.icon", "Icon")}">${program.icon}</p>` : ""}
      <h3>${program.name}</h3>
      <div class="net-statline"><span>${classLabel}</span><span>${t("net.strength", "STR")}: ${strengthLabel(program)}</span><span>MU: ${memoryLabel(program)}</span>${platformBadge}${scopeBadge}</div>
      <p class="desc">${program.effect}</p>
      ${program.capacity ? `<p class="net-note">${t("net.capacity", "Capacity")}: ${program.capacity}</p>` : ""}
      <p class="net-note">${program.source.book} · p. ${program.source.pages}</p>
      <strong class="net-price">${priceLabel(program)}</strong>`;
    const button = document.createElement("button");
    button.className = "btn-add";
    const purchasable = isPurchasable(program);
    button.textContent = purchasable
      ? t("catalog.snag", "SNAG IT")
      : program.availability === "not_for_sale"
        ? t("net.not_for_sale", "NOT FOR SALE")
        : t("net.quote", "CONTACT FIXER");
    button.disabled = !purchasable;
    if (purchasable) button.onclick = () => addItem(createProgramCartItem(program, classLabel), button);
    card.appendChild(button);
    return card;
  }

  function initPrograms(data) {
    const list = document.getElementById("program-list");
    if (!list) return;
    const classSelect = document.getElementById("program-class");
    const search = document.getElementById("program-search");
    const maxPrice = document.getElementById("program-price");
    const conversions = document.getElementById("program-conversions");
    const count = document.getElementById("program-count");
    const classes = new Map(data.classes.map((entry) => [entry.id, entry.label]));
    data.classes.forEach((entry) => classSelect?.append(new root.Option(entry.label, entry.id)));
    const render = () => {
      const visible = filterPrograms(data.programs, {
        query: search?.value,
        classId: classSelect?.value,
        maxPrice: maxPrice?.value,
        includeConversions: conversions?.checked,
      });
      list.replaceChildren(...visible.map((program) => renderProgramCard(program, classes)));
      if (count) count.textContent = t("net.program_count", "{count} programs online", { count: visible.length });
    };
    [classSelect, search, maxPrice, conversions].forEach((field) => field?.addEventListener("input", render));
    render();
  }

  function initDecks(data) {
    const list = document.getElementById("deck-list");
    if (!list) return;
    const unknown = t("net.unspecified", "Not specified");
    const conversionToggle = document.getElementById("deck-conversions");
    const count = document.getElementById("deck-count");
    const renderDeck = (deck) => {
      const card = document.createElement("article");
      card.className = "item deck-card";
      card.innerHTML = `
        <h3>${deck.name}</h3><p class="desc">${deck.description}</p>
        <dl class="deck-stats"><div><dt>CPU</dt><dd>${deck.cpu ?? unknown}</dd></div><div><dt>MU</dt><dd>${deck.memory}</dd></div><div><dt>${t("net.speed", "Speed")}</dt><dd>${deck.speed}</dd></div><div><dt>${t("net.data_wall", "Data Wall")}</dt><dd>${deck.data_wall ?? unknown}</dd></div></dl>
        <p class="net-note">${deck.options.join(" · ") || t("net.no_options", "No listed options")}</p>
        ${deck.catalog_scope === "netrunner_conversion" ? `<p class="net-note net-warning">${t("net.referee_approval", "OPTIONAL · REFEREE APPROVAL")}</p>` : ""}
        <p class="net-note deck-source">${deck.source.book} · p. ${deck.source.pages}</p>
        ${deck.reprint_source ? `<p class="net-note deck-reprint">${t("net.reprinted_in", "Reprinted in")} ${deck.reprint_source.book} · p. ${deck.reprint_source.pages}</p>` : ""}
        <strong class="net-price">${priceLabel(deck)}</strong>`;
      const button = document.createElement("button");
      button.className = "btn-add";
      const purchasable = isPurchasable(deck);
      button.textContent = purchasable ? t("catalog.snag", "SNAG IT") : t("net.quote", "CONTACT FIXER");
      button.disabled = !purchasable;
      if (purchasable) button.onclick = () => addItem(createDeckCartItem(deck), button);
      card.appendChild(button);
      return card;
    };
    const render = () => {
      const visible = data.decks.filter((deck) => conversionToggle?.checked || deck.catalog_scope !== "netrunner_conversion");
      list.replaceChildren(...visible.map(renderDeck));
      if (count) count.textContent = t("net.deck_count", "{count} decks online", { count: visible.length });
    };
    conversionToggle?.addEventListener("input", render);
    render();

    const netgearList = document.getElementById("netgear-list");
    if (netgearList) {
      const cards = (data.builder.external_products || []).map((item) => {
        const card = document.createElement("article");
        card.className = "item deck-card";
        card.innerHTML = `<h3>${item.name}</h3><p class="desc">${item.description}</p><strong class="net-price">${item.pricing === "per_unit" ? `${money(item.price_per_unit)}/${item.unit}` : money(item.price)}</strong>`;
        let quantity = null;
        if (item.pricing === "per_unit") {
          quantity = document.createElement("input");
          quantity.type = "number";
          quantity.min = item.min;
          quantity.max = item.max;
          quantity.value = item.min;
          quantity.setAttribute("aria-label", `${item.name} ${item.unit}`);
          card.appendChild(quantity);
        }
        const button = document.createElement("button");
        button.className = "btn-add";
        button.textContent = t("catalog.snag", "SNAG IT");
        button.onclick = () => addItem(createNetgearCartItem(item, quantity?.value), button);
        card.appendChild(button);
        return card;
      });
      netgearList.replaceChildren(...cards);
    }
  }

  function optionControl(option) {
    const wrapper = document.createElement("label");
    wrapper.className = "builder-option";
    if (option.pricing === "fixed") {
      wrapper.innerHTML = `<input type="checkbox" data-option="${option.id}"> <span>${option.name} — ${money(option.price)}${option.description ? `<small>${option.description}</small>` : ""}</span>`;
    } else if (option.pricing === "per_unit") {
      wrapper.innerHTML = `<span>${option.name} — ${money(option.price_per_unit)}/${option.unit}${option.description ? `<small>${option.description}</small>` : ""}</span><span class="quantity-stepper"><button type="button" data-step="-1" aria-label="Decrease ${option.name}">−</button><input type="number" data-option="${option.id}" min="0" max="${option.max}" value="0" aria-label="${option.name}"><button type="button" data-step="1" aria-label="Increase ${option.name}">+</button></span>`;
    } else if (option.pricing === "percentage") {
      wrapper.innerHTML = `<input type="checkbox" data-option="${option.id}"> <span>${option.name} — +${option.percent}%${option.description ? `<small>${option.description}</small>` : ""}</span>`;
    } else {
      wrapper.innerHTML = `<span>${option.name}${option.description ? `<small>${option.description}</small>` : ""}</span><select data-option="${option.id}"><option value="">—</option>${option.choices.map((choice) => `<option value="${choice.id}">${choice.name} — ${money(choice.price)}</option>`).join("")}</select>`;
    }
    return wrapper;
  }

  function readBuilderSelection(form) {
    const options = {};
    form.querySelectorAll("[data-option]").forEach((field) => {
      options[field.dataset.option] = field.type === "checkbox" ? field.checked : field.value;
    });
    return {
      chassisId: form.elements.chassis.value,
      usedStandard: form.elements.usedStandard.checked,
      expandedMemory: form.elements.expandedMemory.checked,
      speed: form.elements.speed.value,
      dataWall: form.elements.dataWall.value,
      connectionId: form.elements.connection.value,
      options,
      programIds: [...form.querySelectorAll("[data-program]:checked")].map((field) => field.dataset.program),
    };
  }

  function initBuilder(programData, deckData) {
    const form = document.getElementById("deck-builder-form");
    if (!form) return;
    const builder = deckData.builder;
    const chassis = form.elements.chassis;
    const connection = form.elements.connection;
    builder.chassis.forEach((entry) => chassis.append(new root.Option(`${entry.name} — ${money(entry.price)}`, entry.id)));
    builder.connections.forEach((entry) => connection.append(new root.Option(`${entry.name} (${entry.modifier >= 0 ? "+" : ""}${entry.modifier} REF) — ${money(entry.price)}`, entry.id)));
    const speed = form.elements.speed;
    for (let value = builder.limits.speed[0]; value <= builder.limits.speed[1]; value += 1) speed.append(new root.Option(`${value} — +${money(value * builder.upgrades.speed_per_level)}`, value));
    const wall = form.elements.dataWall;
    for (let value = builder.limits.data_wall[0]; value <= builder.limits.data_wall[1]; value += 1) wall.append(new root.Option(`${value} — +${money((value - builder.base_stats.data_wall) * builder.upgrades.data_wall_per_level)}`, value));
    wall.value = String(builder.base_stats.data_wall);
    document.getElementById("deck-options")?.replaceChildren(...builder.options.map(optionControl));

    form.addEventListener("click", (event) => {
      const stepButton = event.target.closest("[data-step]");
      if (!stepButton || !form.contains(stepButton)) return;
      const field = stepButton.closest(".quantity-stepper")?.querySelector('input[type="number"]');
      if (!field) return;
      const minimum = Number(field.min || 0);
      const maximum = Number(field.max || Number.MAX_SAFE_INTEGER);
      field.value = String(Math.min(maximum, Math.max(minimum, Number(field.value || 0) + Number(stepButton.dataset.step))));
      field.dispatchEvent(new root.Event("input", { bubbles: true }));
    });

    const classes = new Map(programData.classes.map((entry) => [entry.id, entry.label]));
    const programContainer = document.getElementById("builder-programs");
    const conversionToggle = document.getElementById("builder-conversions");
    const renderPrograms = () => {
      const selected = new Set([...form.querySelectorAll("[data-program]:checked")].map((field) => field.dataset.program));
      const visiblePrograms = programData.programs.filter((program) => program.loadable !== false
        && program.platform === "cyberdeck"
        && Number.isFinite(program.memory)
        && Number.isFinite(program.price)
        && (conversionToggle?.checked || program.catalog_scope !== "netrunner_conversion"));
      const programs = visiblePrograms.map((program) => {
        const label = document.createElement("label");
        label.className = "builder-program";
        const checked = selected.has(program.id) ? " checked" : "";
        const classLabel = programClasses(program).map((id) => classes.get(id) || id).join(" / ");
        label.innerHTML = `<input type="checkbox" data-program="${program.id}"${checked}> <span><strong>${program.name}</strong><small>${classLabel} · ${program.memory} MU · ${money(program.price)}</small></span>`;
        return label;
      });
      programContainer?.replaceChildren(...programs);
    };
    renderPrograms();

    const total = document.getElementById("builder-total");
    const capacity = document.getElementById("builder-capacity");
    const breakdown = document.getElementById("builder-breakdown");
    const addButton = document.getElementById("builder-add");
    let current;
    const update = () => {
      current = calculateDeck(builder, programData.programs, readBuilderSelection(form));
      total.textContent = money(current.price);
      capacity.textContent = `${current.memoryUsed}/${current.memory} MU`;
      capacity.classList.toggle("over-capacity", !current.valid);
      addButton.disabled = !current.valid;
      breakdown.textContent = `${current.chassis.name} · CPU ${current.cpu} · ${t("net.speed", "Speed")} ${current.speed} · ${t("net.data_wall", "Data Wall")} ${current.dataWall} · ${current.programs.length} ${t("net.programs", "programs")}`;
      form.elements.usedStandard.closest("label").classList.toggle("hidden", current.chassis.id !== "standard");
    };
    conversionToggle?.addEventListener("input", () => { renderPrograms(); update(); });
    form.addEventListener("input", update);
    addButton.addEventListener("click", () => { if (current?.valid) addItem(createCustomDeckCartItem(current), addButton); });
    update();
  }

  async function boot() {
    const pageRoot = document.querySelector("[data-netrunning-page]");
    if (!pageRoot || pageRoot.dataset.netrunningReady) return;
    pageRoot.dataset.netrunningReady = "loading";
    const status = document.getElementById("net-status");
    try {
      const data = await loadData();
      initPrograms(data.programs);
      initDecks(data.decks);
      initBuilder(data.programs, data.decks);
      pageRoot.dataset.netrunningReady = "ready";
      status?.classList.add("hidden");
    } catch (error) {
      pageRoot.dataset.netrunningReady = "error";
      if (status) status.textContent = error.message;
    }
  }

  const api = {
    strengthLabel, memoryLabel, priceLabel, isPurchasable, filterPrograms, calculateDeck, createProgramCartItem,
    createDeckCartItem, createNetgearCartItem, createCustomDeckCartItem, selectProgramsForDeck,
    readBuilderSelection, initPrograms, initDecks, initBuilder, loadData,
  };
  root.Netrunning = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root.document) root.document.addEventListener("DOMContentLoaded", boot);
})(typeof window !== "undefined" ? window : globalThis);
