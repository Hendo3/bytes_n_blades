/**
 * BYTE & BLADES - CORE ENGINE V3.1 (NO_EMOJI_EDITION)
 * "Talk cheap, ammo expensive."
 */

function catalogT(key, fallback, params = {}) {
  if (typeof window !== "undefined" && window.I18n) {
    return window.I18n.t(key, params, fallback);
  }
  return String(fallback).replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name) => params[name] ?? `{${name}}`);
}

function catalogDataPath(path) {
  return typeof window !== "undefined" && window.I18n ? window.I18n.dataPath(path) : path;
}

function getApplicableModifierGroup(category, itemKey, itemId) {
  const group = category?.modifierGroup;
  if (!group || typeof group !== "object") return null;
  const appliesTo = Array.isArray(group.appliesTo) ? group.appliesTo.map(String) : [];
  if (!appliesTo.includes(String(itemKey)) && !appliesTo.includes(String(itemId || ""))) return null;

  const options = (Array.isArray(group.options) ? group.options : [])
    .map((option) => ({
      id: String(option?.id || "").trim(),
      label: String(option?.label || option?.id || "").trim(),
      multiplier: Number(option?.multiplier),
    }))
    .filter((option) => option.id && option.label && Number.isFinite(option.multiplier) && option.multiplier > 0);

  if (!group.id || !group.label || options.length === 0) return null;
  return {
    id: String(group.id),
    label: String(group.label),
    options,
  };
}

function getPriceModifierOption(item, optionKey) {
  const options = item?.modifierGroup?.options || [];
  return options.find((option) => option.id === optionKey) || options[0] || null;
}

const PAGE_CONFIG = {
  cyberwares: {
    path: catalogDataPath("../data/cyberwares.json"),
    title: "CHROME_CATALOG",
  },
  accessories: {
    path: catalogDataPath("../data/equipment.json"),
    title: "GEAR_STASH",
  },
  cyberdecks: {
    path: catalogDataPath("../data/decks.json"),
    title: "DECK_EXCHANGE",
    deckCatalog: true,
  },
  drugs: {
    path: catalogDataPath("../data/drugs.json"),
    title: "CHEM_FEED",
    dataSelector: "data.street_stock",
  },
  weapons: {
    path: catalogDataPath("../data/weapons.json"),
    title: "ARMORY_FEED",
    weaponCatalog: true,
  },
  ammo: {
    path: catalogDataPath("../data/ammo.json"),
    title: "AMMO_FEED",
    ammoCatalog: true,
  },
};


const STORAGE_KEY = "cyber_cart";

const AMMO_OPTIONS = [
  { key: "base", label: catalogT("catalog.standard", "Standard"), multiplier: 1 },
  { key: "api", label: catalogT("catalog.api", "API (Armor Piercing Incendiary)"), multiplier: 4 },
  { key: "ap", label: catalogT("catalog.ap", "Armor Piercing"), multiplier: 3 },
  { key: "dual_purpose", label: catalogT("catalog.dual_purpose", "Dual Purpose"), multiplier: 4 },
  { key: "electrothermal", label: catalogT("catalog.electrothermal", "Electrothermal Ammo Enhancement"), multiplier: 1.5 },
  { key: "hollow_point", label: catalogT("catalog.hollow_point", "Hollow Point"), multiplier: 1.125 },
  { key: "kendachi_fragmentation", label: catalogT("catalog.kendachi_fragmentation", "Kendachi Fragmentation Flechette"), multiplier: 5 },
  { key: "rubber", label: catalogT("catalog.rubber", "Rubber Bullets (box of 50)"), multiplier: 1 / 3 },
];

const SHOTGUN_AMMO_OPTIONS = [
  { key: "shotgun_shells", label: catalogT("catalog.shotgun_shells", "Shotgun shells"), pricingModel: "fixed", fixedPrice: 15 },
  { key: "apfsds", label: catalogT("catalog.apfsds", "APFSDS"), pricingModel: "fixed", fixedPrice: 10 },
  { key: "flare_rounds", label: catalogT("catalog.flare_rounds", "Flare rounds"), pricingModel: "fixed", fixedPrice: 25 },
  { key: "flash_bang", label: catalogT("catalog.flash_bang", "Flash bang"), pricingModel: "fixed", fixedPrice: 50 },
  { key: "flash", label: catalogT("catalog.flash", "Flash"), pricingModel: "fixed", fixedPrice: 35 },
];

// Internal fallback used only for the automatic HL calculation in the cart.
// Dice controls are intentionally not exposed in the catalog UI.
const DiceEngine = {
  roll(str) {
    if (!isNaN(str)) return { total: parseInt(str), details: `FIXED(${str})` };

    let total = 0;
    const details = [];
    const matches = [...String(str).matchAll(/(\d+)[dD](\d+)(?:([+-])(\d+))?/g)];

    if (matches.length === 0) {
      const value = parseInt(str);
      return Number.isNaN(value)
        ? { total: 0, details: "N/A" }
        : { total: value, details: "FIXED" };
    }

    matches.forEach((match) => {
      const count = parseInt(match[1]);
      const sides = parseInt(match[2]);
      const operator = match[3] || "+";
      const modifier = parseInt(match[4]) || 0;
      const rolls = [];
      let subtotal = 0;

      for (let index = 0; index < count; index += 1) {
        const value = Math.floor(Math.random() * sides) + 1;
        rolls.push(value);
        subtotal += value;
      }

      subtotal += operator === "+" ? modifier : -modifier;
      total += subtotal;
      details.push(`[${rolls.join(", ")}]${modifier > 0 ? ` ${operator} ${modifier}` : ""}`);
    });

    return { total, details: details.join(" | ") };
  },
};

// --- STASH MANAGER ---
const Stash = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  },
  add(item) {
    const current = this.get();
    item.uid = Date.now() + Math.random().toString(16).slice(2);
    current.push(item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new Event("stash-updated"));
  },
};

function compareSourceLabel(source) {
  if (!source) return null;
  if (typeof source === "string") return source;
  const book = source.book || source.title || source.source;
  const pages = source.pages || source.page;
  return [book, pages ? `p. ${pages}` : null].filter(Boolean).join(" · ") || null;
}

function compareItemUrl(itemId) {
  if (typeof window !== "undefined" && window.CyberPermalinks) {
    return window.CyberPermalinks.catalogItemUrl(itemId);
  }
  if (typeof window === "undefined" || !window.location) return `?item=${encodeURIComponent(itemId)}`;
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("item", itemId);
  return url.href;
}

function buildCatalogComparison(item, pageId) {
  if (!item || !["weapons", "cyberwares"].includes(pageId)) return null;
  const raw = item.raw?.raw && typeof item.raw.raw === "object" ? item.raw.raw : (item.raw || {});
  const stats = [];
  const add = (key, label, value) => {
    if (value === null || value === undefined || String(value).trim() === "") return;
    stats.push({ key, label, value });
  };

  if (pageId === "weapons") {
    add("type", catalogT("weapon.code.type", "TYP"), raw.type ?? raw.type_code);
    add("accuracy", catalogT("weapon.code.accuracy", "ACC"), raw.accuracy ?? raw.precision ?? raw.wa);
    add("damage", catalogT("weapon.code.damage", "DMG"), raw.damage ?? raw.danoMunicao);
    add("range", catalogT("weapon.code.range", "RNG"), raw.range ?? raw.weapon_range_m);
    add("magazine", catalogT("weapon.code.magazine", "MAG"), raw.numberOfShots ?? raw.magazine_capacity ?? raw.shots ?? raw.disparos);
    add("rof", catalogT("weapon.code.rof", "ROF"), raw.rateOfFire ?? raw.cadence_full_auto ?? raw.rof ?? raw.cadencia);
    add("ammo", catalogT("weapon.code.ammo", "AMMO"), raw.damageAmmo ?? raw.ammo_type);
    add("availability", catalogT("weapon.code.availability", "AVA"), raw.availability);
    add("reliability", catalogT("weapon.code.reliability", "REL"), raw.reliability ?? raw.confiabilidade);
    add("concealment", catalogT("weapon.code.concealment", "CON"), raw.concealability ?? raw.concealment);
  } else {
    add("humanity", "HL", item.hl ?? raw.HL ?? raw.hl);
    add("surgery", "CIR", item.cir ?? raw.surg ?? raw.cir);
    const installation = item.installation || raw.installation || {};
    const requirements = [
      ...(Array.isArray(installation.requires) ? installation.requires : []),
      ...(Array.isArray(installation.requiresAny) ? installation.requiresAny : []),
    ];
    add("requirements", catalogT("compare.requirements", "REQUIREMENTS"), requirements.join(" / "));
    if (installation.slotFamily && installation.slotUsage) {
      add("slot_usage", catalogT("compare.slot_usage", "SLOT USAGE"), `${installation.slotUsage} ${installation.slotFamily}`);
    }
    add("purchase_limit", catalogT("compare.purchase_limit", "PURCHASE LIMIT"), item.maxPurchases);
  }
  add("source", catalogT("compare.source", "SOURCE"), compareSourceLabel(item.source || raw.source));

  return {
    catalog: pageId,
    id: item.id,
    name: item.name,
    category: item.categoryLabel || item.category || item.weaponClass || pageId,
    description: item.description,
    price: item.price,
    url: compareItemUrl(item.id),
    stats,
  };
}

function appendCatalogCompareButton(card, item, pageId) {
  const candidate = buildCatalogComparison(item, pageId);
  if (!candidate) return null;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn-secondary btn-compare";
  button.dataset.compareId = candidate.id;
  button.dataset.compareCatalog = candidate.catalog;
  button.dataset.compareLabel = catalogT("compare.add", "COMPARE");
  button.textContent = button.dataset.compareLabel;
  button.addEventListener("click", () => {
    if (window.CyberComparator) window.CyberComparator.toggle(candidate);
    else window.dispatchEvent(new CustomEvent("comparator-request", { detail: candidate }));
  });
  card.appendChild(button);
  window.CyberComparator?.syncButton(button);
  return button;
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
  const pageId = detectPage();
  if (!pageId || !PAGE_CONFIG[pageId]) return;

  const config = PAGE_CONFIG[pageId];
  const ui = captureUI();
  const dependencyLabels = new Map();

  let fullCatalog = {};
  let installationCatalogItems = [];
  let activeCategory = null;

  init();

  async function init() {
    try {
      const [catalog] = await Promise.all([
        fetchData(config.path),
        window.CyberSources?.load?.(),
      ]);
      fullCatalog = catalog;
      attachEditorialSources(fullCatalog);
      indexRequirementLabels(fullCatalog);
      await hydrateRequirementLabels(pageId);
      await prepareInstallationCatalog();
      setupCategories(fullCatalog);
      setupFilters(fullCatalog);
      hydrateCatalogLinkState();
      setupEvents();

      const firstCategory = Object.keys(fullCatalog)[0];
      const linkState = readCatalogLinkState();
      const requestedItem = linkState.item;
      const requestedCategory = requestedItem
        ? Object.keys(fullCatalog).find((category) => getItemsFromCategory(category)
          .some((item) => String(item.id) === requestedItem))
        : null;
      const linkedCategory = fullCatalog[linkState.category] ? linkState.category : null;
      if (requestedCategory || linkedCategory || firstCategory) {
        selectCategory(requestedCategory || linkedCategory || firstCategory);
        if (linkState.price || linkState.hl || linkState.cir || linkState.difficulty) {
          applyCatalogFilters(false);
        }
      }
    } catch (err) {
      console.error("Netrun Failed:", err);
      const isHtmlPage = window.location.pathname.includes("/html/");
      const errorPagePath = isHtmlPage ? "./404.html" : "./html/404.html";
      const errorUrl = new URL(errorPagePath, window.location.href);
      errorUrl.searchParams.set("source", config.path);
      errorUrl.searchParams.set("message", err.message);
      if (window.location.protocol === "file:") {
        errorUrl.searchParams.set("hint", catalogT("catalog.file_hint", "Local file usage detected. Check CORS settings."));
      }
      window.location.href = errorUrl.toString();
    }
  }

  // --- CORE FUNCTIONS ---

  async function fetchData(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (config.weaponCatalog) {
      return normalizeWeaponCatalog(json.weapons || json.data?.weapons || []);
    }
    if (config.ammoCatalog) {
      return normalizeAmmoCatalog(json.items || json.data?.items || []);
    }
    if (config.dataSelector === "data.street_stock") {
      return { street_stock: (json.data && json.data.street_stock) ? json.data.street_stock : {} };
    }
    return json.data || json;
  }

  function normalizeWeaponCatalog(weapons) {
    const catalog = {};

    (Array.isArray(weapons) ? weapons : []).forEach((weapon, index) => {
      if (!weapon || typeof weapon !== "object") return;
      if (isPlaceholderWeapon(weapon)) return;

      const categoryKey = String(weapon.class || "UNSORTED").trim() || "UNSORTED";
      if (!catalog[categoryKey]) {
        catalog[categoryKey] = {
          name: categoryKey,
          description: catalogT("catalog.weapon_lane", `Weapon lane for ${categoryKey}.`, { category: categoryKey }),
          items: {},
        };
      }

      const name = String(weapon.name || catalogT("catalog.weapon_default", `Weapon ${index + 1}`, { index: index + 1 })).trim();
      const itemId = String(weapon.id || `weapon_${categoryKey}_${index}_${slugify(name)}`).trim();
      const priceValue = weapon.price !== undefined && weapon.price !== null ? parsePrice(weapon.price) : null;
      const priceMaximum = weapon.price_max !== undefined && weapon.price_max !== null
        ? parsePrice(weapon.price_max)
        : null;
      const priceLabel = priceValue === null
        ? catalogT("catalog.price_pending", "PRICE PENDING")
        : priceMaximum !== null && priceMaximum > priceValue
          ? `${formatCurrency(priceValue)} - ${formatCurrency(priceMaximum)}`
          : null;

      catalog[categoryKey].items[itemId] = {
        id: itemId,
        name,
        weaponClass: categoryKey,
        description: buildWeaponDescription(weapon),
        price: priceValue,
        priceMaximum,
        priceLabel,
        raw: weapon,
      };
    });

    return catalog;
  }

  function normalizeAmmoCatalog(entries) {
    const catalog = {};
    (Array.isArray(entries) ? entries : []).forEach((entry, index) => {
      if (!entry || typeof entry !== "object") return;
      const categoryKey = String(entry.category || "Unsorted").trim() || "Unsorted";
      if (!catalog[categoryKey]) {
        catalog[categoryKey] = {
          name: categoryKey,
          description: entry.category_description || "Ammunition and weapon add-ons.",
          items: {},
        };
      }
      const name = String(entry.name || `Ammo ${index + 1}`).trim();
      const itemId = String(entry.id || `ammo_${index}_${slugify(name)}`);
      catalog[categoryKey].items[itemId] = {
        id: itemId,
        name,
        weaponClass: categoryKey,
        description: entry.description || entry.effect || "No field notes available.",
        price: entry.price ?? 0,
        priceMaximum: entry.price_max ?? null,
        priceLabel: entry.price_label || null,
        raw: entry,
      };
    });
    return catalog;
  }

  function attachEditorialSources(catalog) {
    if (!window.CyberSources) return;
    Object.entries(catalog || {}).forEach(([categoryKey, category]) => {
      if (!category || typeof category !== "object") return;
      const rawItems = category.itens || category.items || category.list || {};
      Object.entries(rawItems).forEach(([key, item]) => {
        if (!item || typeof item !== "object") return;
        const id = item.id || key;
        item.editorialSource = window.CyberSources.resolve(
          pageId,
          id,
          item.source,
          category.name || categoryKey,
        );
      });
    });
  }

  function isPlaceholderWeapon(weapon) {
    const placeholderFields = [
      weapon.name,
      weapon.class,
      weapon.type_code,
      weapon.concealment,
      weapon.availability,
      weapon.damage,
      weapon.ammo_type,
      weapon.reliability,
    ];

    return placeholderFields.some((value) => String(value || "").trim().toUpperCase() === "TODO");
  }

  function getItemsFromCategory(categoryKey) {
    const categoryData = fullCatalog[categoryKey];
    if (!categoryData) return [];

    const categoryLabel = categoryData.name || categoryKey;
    const categoryLower = String(categoryKey || "").toLowerCase();
    const inferredMeta = inferCategoryMeta(categoryLower);

    const rawList =
      categoryData.itens || categoryData.items || categoryData.list || {};

    return Object.entries(rawList).map(([key, item]) => {
      const itemHL = resolveItemHL(item, categoryLower);

      return {
        id: item.id || key,
        legacyIds: Array.isArray(item.legacyIds) ? item.legacyIds : [],
        name: item.name || formatName(key),
        weaponClass: item.weaponClass || categoryLabel,
        description:
          item.description || item.note || item.desc || catalogT("catalog.no_specs", "No specs available."),
        price: parsePrice(item.price || item.cost || item.value),
        priceMaximum: item.priceMaximum ?? null,
        priceLabel: item.priceLabel || null,
        hl: itemHL,
        cir: item.surg || item.cir || null,
        tags: Array.isArray(item.tags) ? item.tags : inferredMeta.tags,
        maxPurchases: Number(item.maxPurchases) || null,
        alternativeAcquisition: Boolean(item.alternativeAcquisition),
        attributeBonuses: Array.isArray(item.attributeBonuses) ? item.attributeBonuses : [],
        skillBonuses: Array.isArray(item.skillBonuses) ? item.skillBonuses : [],
        attributeSet: item.attributeSet && typeof item.attributeSet === "object" ? item.attributeSet : null,
        priceModifiers: Array.isArray(item.priceModifiers) ? item.priceModifiers : [],
        modifierGroup: getApplicableModifierGroup(categoryData, key, item.id || key),
        installation: item.installation && typeof item.installation === "object" ? item.installation : inferredMeta.installation,
        source: item.editorialSource || window.CyberSources?.resolve?.(
          pageId,
          item.id || key,
          item.source,
          categoryLabel,
        ) || null,
        sourceCatalog: pageId,
        raw: item,
        category: categoryKey,
        categoryLabel,
      };
    });
  }

  function resolveItemHL(item, categoryLower) {
    const rawHL = item.HL || item.hl || item.humanity || null;
    if (rawHL !== null && rawHL !== undefined && String(rawHL).trim() !== "") {
      return rawHL;
    }

    if (categoryLower === "chipware") return "0";
    return null;
  }

  function inferCategoryMeta(categoryLower) {
    if (categoryLower === "chipware" || categoryLower === "behaviour chips") {
      return {
        tags: ["chipware", "requires_socket", "requires_processor"],
        installation: {
          requires: ["chipware_socket", "neuralware_processor"],
          slotFamily: "chipware",
          slotUsage: 1,
        },
      };
    }

    return {
      tags: [],
      installation: null,
    };
  }

  function indexRequirementLabels(catalog) {
    Object.values(catalog || {}).forEach((category) => {
      if (!category || typeof category !== "object") return;
      const rawItems = category.itens || category.items || category.list || {};
      Object.entries(rawItems).forEach(([key, item]) => {
        if (!item || typeof item !== "object") return;
        const label = item.name || key;
        [item.id || key, ...(item.legacyIds || [])].forEach((id) => {
          const normalized = String(id || "").trim().toLowerCase();
          if (normalized) dependencyLabels.set(normalized, label);
        });
      });
    });
  }

  async function hydrateRequirementLabels(page) {
    if (!window.I18n || !["cyberwares", "accessories"].includes(page)) return;
    const otherPath = page === "cyberwares"
      ? catalogDataPath("../data/equipment.json")
      : catalogDataPath("../data/cyberwares.json");
    try {
      const response = await fetch(otherPath, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      indexRequirementLabels(payload.data || payload);
    } catch {
      // Cross-catalog labels are an enhancement; the catalog remains usable offline.
    }
  }

  async function prepareInstallationCatalog() {
    if (pageId !== "cyberwares" || !window.CyberUtils) return;
    installationCatalogItems = CyberUtils.flattenCatalog(
      { data: fullCatalog },
      "cyberwares",
    );

    try {
      const response = await fetch(catalogDataPath("../data/equipment.json"), { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      installationCatalogItems.push(...CyberUtils.flattenCatalog(payload, "accessories"));
    } catch {
      // Cross-catalog requirements remain detectable and fail atomically if unavailable.
    }
  }

  // --- RENDER ---
  function setupCategories(catalog) {
    if (!ui.categoryList) return;
    const fragment = document.createDocumentFragment();

    Object.keys(catalog).forEach((key) => {
      if (typeof catalog[key] !== "object") return;
      const btn = document.createElement("button");
      btn.textContent = String(catalog[key].name || key).toUpperCase();
      btn.dataset.category = key;
      btn.onclick = () => selectCategory(key, true);
      fragment.appendChild(btn);
    });

    ui.categoryList.replaceChildren(fragment);
  }

  function selectCategory(key, syncLink = false) {
    activeCategory = key;

    if (ui.titleCategory) ui.titleCategory.textContent = fullCatalog[key]?.name || key;

    Array.from(ui.categoryList.children).forEach((btn) => {
      if (btn.dataset.category === key) {
        btn.style.borderColor = "var(--primary-color)";
        btn.style.color = "#fff";
        btn.style.background = "var(--teal-transparent)";
        btn.style.paddingLeft = "20px";
        btn.style.textShadow = "var(--glow-soft)";
      } else {
        btn.style.borderColor = "";
        btn.style.color = "";
        btn.style.background = "";
        btn.style.paddingLeft = "";
        btn.style.textShadow = "";
      }
    });

    renderItems(getItemsFromCategory(key));
    if (syncLink && window.CyberPermalinks) {
      window.CyberPermalinks.replace(window.CyberPermalinks.catalogFilterUrl({ category: key }));
    }
  }

  function renderItems(items) {
    if (!ui.itemsList) return;
    ui.itemsList.innerHTML = "";

    if (items.length === 0) {
      ui.itemsList.innerHTML = `<p class="no-results">${catalogT("catalog.no_results", "Nothing here, Choom. Try another stream.")}</p>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "item";
      const domId = slugify(item.id || item.name || "item");
      card.id = `item-${domId}`;
      card.dataset.itemId = String(item.id || "");
      const isAmmo = config.ammoCatalog || (config.weaponCatalog && isAmmoItem(item));
      const hasAmmoOptions = (config.weaponCatalog && isAmmoItem(item))
        || (config.ammoCatalog && isAmmoReloadItem(item));
      const isShotgunAmmo = hasAmmoOptions && isShotgunAmmoItem(item);
      const ammoOptionSet = hasAmmoOptions ? getAmmoOptionSet(item) : [];

      let badges = "";
      if (item.weaponClass)
        badges += `<span style="color:#8fdfff">${catalogT("catalog.class", "CLASS")}: ${item.weaponClass}</span>`;
      if (item.hl)
        badges += `<span style="color:var(--secondary-color)">HL: ${item.hl}</span>`;
      if (item.cir)
        badges += `<span style="margin-left:10px; color:#888">CIR: ${item.cir}</span>`;
      if (item.maxPurchases)
        badges += `<span style="margin-left:10px; color:#8fdfff">${catalogT("catalog.max", "MAX")}: ${item.maxPurchases}</span>`;

      const techMeta = renderTechnicalMeta(item);

      const { statsHtml, damageVal } = renderWeaponStats(item.raw);
      const deckStatsHtml = renderDeckStats(item.raw);
      const smartchippedId = `smartchipped-${domId}`;
      const ammoOptionId = `ammo-option-${domId}`;
      const modifierOptionId = `price-modifier-${domId}`;

      card.innerHTML = `
                <h3>${item.name}</h3>
                <p class="desc">${item.description}</p>
                ${badges ? `<div class="meta">${badges}</div>` : ""}
                ${techMeta}
                ${statsHtml}
                ${deckStatsHtml}
                <div class="meta" style="margin-top:auto; display:flex; justify-content:space-between; align-items:flex-end;">
              <strong id="price-${domId}" style="color:var(--primary-color); font-size:1.2em;">${formatDisplayedCatalogPrice(item, item.price, false)}</strong>
                </div>
                ${config.weaponCatalog && !isAmmo ? `
                <label style="display:flex; align-items:center; gap:8px; margin-top:12px; font-size:0.75rem; color:#8fdfff; cursor:pointer;">
                    <input id="${smartchippedId}" type="checkbox" style="accent-color: var(--primary-color);">
                    ${catalogT("catalog.smartchipped", "Smartchipped (x2 price)")}
                </label>` : ""}
                ${hasAmmoOptions ? `
                <label for="${ammoOptionId}" style="display:block; margin-top:12px; font-size:0.75rem; color:#8fdfff;">${catalogT("catalog.ammo_option", "Ammo Option")}</label>
                <select id="${ammoOptionId}" style="width:100%; margin-top:6px; background:#080b15; color:var(--primary-color); border:1px solid #0f2e4a; padding:8px; font-family:inherit;">
                  ${ammoOptionSet.map((option) => {
                    if (option.pricingModel === "fixed") {
                      return `<option value="${option.key}">${option.label} (${formatCurrency(option.fixedPrice)})</option>`;
                    }
                    return `<option value="${option.key}">${option.label} (${option.multiplier}x)</option>`;
                  }).join("")}
                </select>` : ""}
                ${item.modifierGroup ? `
                <label for="${modifierOptionId}" class="item-modifier-label">${item.modifierGroup.label}</label>
                <select id="${modifierOptionId}" class="item-modifier-select">
                  ${item.modifierGroup.options.map((option) => `
                    <option value="${option.id}">${option.label} (${option.multiplier}x)</option>
                  `).join("")}
                </select>` : ""}
            `;

      const priceEl = card.querySelector(`#price-${domId}`);
      const smartchippedEl = config.weaponCatalog && !isAmmo ? card.querySelector(`#${smartchippedId}`) : null;
      const ammoOptionEl = hasAmmoOptions ? card.querySelector(`#${ammoOptionId}`) : null;
      const modifierOptionEl = item.modifierGroup ? card.querySelector(`#${modifierOptionId}`) : null;

      const sourceLine = window.CyberSources?.createLine?.(item.source);
      const priceRow = card.querySelector(".meta[style*='margin-top:auto']");
      if (sourceLine) card.insertBefore(sourceLine, priceRow || null);

      if (smartchippedEl && priceEl) {
        smartchippedEl.addEventListener("change", () => {
          const selectedAmmoOption = ammoOptionEl ? ammoOptionEl.value : "base";
          const finalPrice = computeCatalogPrice(item, smartchippedEl.checked, selectedAmmoOption, modifierOptionEl?.value);
          priceEl.textContent = formatDisplayedCatalogPrice(item, finalPrice, smartchippedEl.checked);
        });
      }

      if (ammoOptionEl && priceEl) {
        ammoOptionEl.addEventListener("change", () => {
          const isSmartchipped = smartchippedEl ? smartchippedEl.checked : false;
          const finalPrice = computeCatalogPrice(item, isSmartchipped, ammoOptionEl.value, modifierOptionEl?.value);
          priceEl.textContent = formatDisplayedCatalogPrice(item, finalPrice, isSmartchipped);
        });
      }

      if (modifierOptionEl && priceEl) {
        modifierOptionEl.addEventListener("change", () => {
          const isSmartchipped = smartchippedEl ? smartchippedEl.checked : false;
          const selectedAmmoOption = ammoOptionEl ? ammoOptionEl.value : "base";
          const finalPrice = computeCatalogPrice(item, isSmartchipped, selectedAmmoOption, modifierOptionEl.value);
          priceEl.textContent = formatDisplayedCatalogPrice(item, finalPrice, isSmartchipped);
        });
      }

      const linkedState = readCatalogLinkState();
      if (linkedState.item === String(item.id)) {
        if (smartchippedEl) smartchippedEl.checked = linkedState.smartchipped;
        if (ammoOptionEl && [...ammoOptionEl.options].some((option) => option.value === linkedState.ammoOptionKey)) {
          ammoOptionEl.value = linkedState.ammoOptionKey;
        }
        if (modifierOptionEl && [...modifierOptionEl.options].some((option) => option.value === linkedState.priceModifierKey)) {
          modifierOptionEl.value = linkedState.priceModifierKey;
        }
        if (priceEl) {
          const finalPrice = computeCatalogPrice(
            item,
            smartchippedEl?.checked,
            ammoOptionEl?.value,
            modifierOptionEl?.value,
          );
          priceEl.textContent = formatDisplayedCatalogPrice(item, finalPrice, smartchippedEl?.checked);
        }
      }

      const btn = document.createElement("button");
      btn.className = "btn-add";
      if (item.id === "aptr_reflex_chips") {
        btn.textContent = catalogT("catalog.open_aptr", "OPEN APTR TABLE");
      } else if (item.id === "mram_memory_chips") {
        btn.textContent = catalogT("catalog.open_mram", "OPEN MRAM TABLE");
      } else if (isVisualRecognitionItem(item)) {
        btn.textContent = catalogT("catalog.open_visual", "OPEN VISUAL TABLE");
      } else {
        btn.textContent = catalogT("catalog.snag", "SNAG IT");
      }
      const referenceOnly = config.ammoCatalog && Boolean(item.priceLabel) && !isAmmoReloadItem(item);
      if (referenceOnly) {
        btn.textContent = catalogT("catalog.reference_only", "REFERENCE // APPLY TO BASE ITEM");
        btn.disabled = true;
      }
      btn.style.width = "100%";
      btn.style.marginTop = "15px";
      btn.onclick = () => {
        if (item.id === "aptr_reflex_chips") {
          window.location.href = "./aptr-chips.html";
          return;
        }
        if (item.id === "mram_memory_chips") {
          window.location.href = "./mram-chips.html";
          return;
        }
        if (isVisualRecognitionItem(item)) {
          window.location.href = "./visual-rec-chips.html";
          return;
        }
        handlePurchase(item, btn, {
          smartchipped: smartchippedEl ? smartchippedEl.checked : false,
          ammoOptionKey: ammoOptionEl ? ammoOptionEl.value : (isShotgunAmmo ? "shotgun_shells" : "base"),
          priceModifierKey: modifierOptionEl?.value || null,
        });
      };

      card.appendChild(btn);
      if (window.CyberPermalinks) {
        card.appendChild(window.CyberPermalinks.createButton(
          () => window.CyberPermalinks.catalogItemUrl(item.id, {
            smartchipped: smartchippedEl?.checked,
            ammoOptionKey: ammoOptionEl?.value,
            priceModifierKey: modifierOptionEl?.value,
          }),
          catalogT("permalink.item", "COPY ITEM LINK"),
        ));
      }
      appendCatalogCompareButton(card, item, pageId);

      const isCatalogRedirect = item.id === "aptr_reflex_chips"
        || item.id === "mram_memory_chips"
        || isVisualRecognitionItem(item);
      if (pageId === "cyberwares" && !isCatalogRedirect && window.CyberUtils) {
        const installBtn = document.createElement("button");
        installBtn.className = "btn-secondary btn-install";
        installBtn.textContent = catalogT("catalog.install_complete", "COMPLETE INSTALL");
        installBtn.style.width = "100%";
        installBtn.style.marginTop = "8px";
        installBtn.onclick = () => handleAssistedPurchase(item, installBtn);
        card.appendChild(installBtn);
      }
      fragment.appendChild(card);
    });

    ui.itemsList.appendChild(fragment);
    focusRequestedItem();
  }

  function focusRequestedItem() {
    const requestedItem = new URLSearchParams(window.location.search).get("item");
    if (!requestedItem || !ui.itemsList) return;
    const target = Array.from(ui.itemsList.querySelectorAll("[data-item-id]"))
      .find((card) => card.dataset.itemId === requestedItem);
    if (!target) return;
    target.classList.add("search-target");
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    target.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }

  function renderWeaponStats(raw) {
    const stats = raw.code || raw;
    if (!stats || typeof stats !== "object") return { statsHtml: "", damageVal: null };

    const map = [
      { l: catalogT("weapon.code.type", "TYP"), v: stats.type || stats.type_code },
      { l: catalogT("weapon.code.accuracy", "ACC"), v: stats.accuracy || stats.precision || stats.wa },
      { l: catalogT("weapon.code.damage", "DMG"), v: stats.damage || stats.danoMunicao, isDamage: true },
      { l: catalogT("weapon.code.range", "RNG"), v: stats.range || stats.weapon_range_m },
      { l: catalogT("weapon.code.magazine", "MAG"), v: stats.numberOfShots || stats.magazine_capacity || stats.shots || stats.disparos },
      { l: catalogT("weapon.code.rof", "ROF"), v: stats.rateOfFire || stats.cadence_full_auto || stats.rof || stats.cadencia },
      { l: catalogT("weapon.code.ammo", "AMMO"), v: stats.damageAmmo || stats.ammo_type },
      { l: catalogT("weapon.code.availability", "AVA"), v: stats.availability },
      { l: catalogT("weapon.code.reliability", "REL"), v: stats.reliability || stats.confiabilidade },
      { l: catalogT("weapon.code.concealment", "CON"), v: stats.concealability || stats.concealment },
    ];

    let html = `<ul class="weapon-code">`;
    let hasData = false;
    let damageVal = null;

    map.forEach((f) => {
      if (f.v !== undefined && f.v !== null && String(f.v).trim() !== "") {
        html += `<li><span>${f.l}</span> <span>${f.v}</span></li>`;
        hasData = true;
        if (f.isDamage) damageVal = f.v;
      }
    });
    html += `</ul>`;

    return { statsHtml: hasData ? html : "", damageVal: damageVal };
  }

  function renderDeckStats(raw) {
    if (!config.deckCatalog || !raw || typeof raw !== "object") return "";

    const stats = raw.stats || {};
    const notListed = catalogT("deck.not_listed", "Not listed");
    const valueOrMissing = (value, formatter = String) => (
      value === undefined || value === null ? notListed : formatter(value)
    );
    const rows = [
      [catalogT("deck.speed", "Speed"), valueOrMissing(stats.speed, (value) => `+${value}`)],
      [catalogT("deck.cpu", "CPU"), valueOrMissing(stats.cpu)],
      [catalogT("deck.memory", "Memory"), valueOrMissing(stats.memoryUnits, (value) => `${value} ${catalogT("deck.mu", "MU")}`)],
      [catalogT("deck.data_wall", "Data Wall"), valueOrMissing(stats.dataWall, (value) => `+${value}`)],
      [catalogT("deck.cellular", "Cellular"), raw.features?.cellular
        ? catalogT("common.yes", "Yes")
        : catalogT("common.no", "No")],
      [catalogT("deck.portable", "Portable"), raw.features?.portable === null || raw.features?.portable === undefined
        ? notListed
        : raw.features.portable
          ? catalogT("common.yes", "Yes")
          : catalogT("common.no", "No")],
    ];

    const options = Array.isArray(raw.options)
      ? raw.options.map((option) => option?.label).filter(Boolean)
      : [];
    const source = raw.source && typeof raw.source === "object"
      ? `${raw.source.book}, ${catalogT("deck.page", "p.")} ${raw.source.page}`
      : null;

    return `
      <dl class="deck-specs">
        ${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}
      </dl>
      ${options.length > 0 ? `<p class="deck-options"><strong>${catalogT("deck.options", "Options")}:</strong> ${options.join(" // ")}</p>` : ""}
      ${source ? `<p class="deck-source">${catalogT("deck.source", "SOURCE")}: ${source}</p>` : ""}
    `;
  }

  function renderTechnicalMeta(item) {
    const lines = [];
    const labelFor = (value) => dependencyLabels.get(String(value || "").trim().toLowerCase())
      || (window.CyberUtils ? CyberUtils.humanizeId(value) : formatName(String(value || "")));

    if (item.raw?.compatibility) {
      lines.push(`${catalogT("catalog.compatibility", "COMPATIBILITY")}: ${item.raw.compatibility}`);
    }

    const reqs = item.installation?.requires;
    if (Array.isArray(reqs) && reqs.length > 0) {
      lines.push(`${catalogT("catalog.req", "REQ")}: ${reqs.map(labelFor).join(", ")}`);
    }

    const reqAny = item.installation?.requiresAny;
    if (Array.isArray(reqAny) && reqAny.length > 0) {
      lines.push(`${catalogT("catalog.req_any", "REQ ANY")}: ${reqAny.map(labelFor).join(" | ")}`);
    }

    const reqAnyGroups = item.installation?.requiresAnyGroups;
    if (Array.isArray(reqAnyGroups)) {
      reqAnyGroups.forEach((group) => {
        if (Array.isArray(group) && group.length > 0) {
          lines.push(`${catalogT("catalog.req_any", "REQ ANY")}: ${group.map(labelFor).join(" | ")}`);
        }
      });
    }

    const slotUsage = Number(item.installation?.slotUsage);
    if (!Number.isNaN(slotUsage) && slotUsage > 0) {
      const family = item.installation?.slotFamily || item.installation?.slotProvider || "GENERIC";
      const familyLabel = window.I18n?.isPtBr?.() ? labelFor(family) : family;
      lines.push(`${catalogT("catalog.slots", "SLOTS")}: ${slotUsage} @ ${familyLabel}`);
    }

    const slotCapacity = Number(item.installation?.slotCapacity);
    if (!Number.isNaN(slotCapacity) && slotCapacity >= 0) {
      const family = item.installation?.slotFamily || item.id;
      lines.push(`${catalogT("catalog.provider", "PROVIDER")}: ${labelFor(family)} (${slotCapacity})`);
    } else if (item.installation?.slotProvider) {
      const family = item.installation?.slotFamily || item.installation.slotProvider;
      lines.push(`${catalogT("catalog.provider", "PROVIDER")}: ${labelFor(family)}`);
    }

    const nestedProviders = item.installation?.provides;
    if (Array.isArray(nestedProviders)) {
      nestedProviders.forEach((provider) => {
        if (!provider || typeof provider !== "object" || !provider.slotFamily) return;
        const capacity = Number(provider.slotCapacity);
        const suffix = Number.isFinite(capacity) ? ` (${capacity})` : "";
        lines.push(`${catalogT("catalog.provider", "PROVIDER")}: ${labelFor(provider.slotFamily)}${suffix}`);
      });
    }

    const compatibilityNotes = item.installation?.compatibilityNotes;
    if (Array.isArray(compatibilityNotes)) {
      compatibilityNotes.forEach((note) => {
        if (String(note || "").trim()) lines.push(`${catalogT("catalog.note", "NOTE")}: ${note}`);
      });
    }

    if (Array.isArray(item.attributeBonuses) && item.attributeBonuses.length > 0) {
      const bonusText = item.attributeBonuses
        .map((bonus) => {
          const value = Number(bonus.value) || 0;
          const signal = value >= 0 ? "+" : "";
          return `${signal}${value} ${bonus.attribute}`;
        })
        .join(" | ");
      lines.push(`${catalogT("catalog.bonus", "BONUS")}: ${bonusText}`);
    }

    if (Array.isArray(item.skillBonuses) && item.skillBonuses.length > 0) {
      const skillText = item.skillBonuses
        .map((bonus) => {
          const value = Number(bonus.value) || 0;
          const signal = value >= 0 ? "+" : "";
          return `${signal}${value} ${bonus.label || bonus.skill}`;
        })
        .join(" | ");
      lines.push(`${catalogT("catalog.skill", "SKILL")}: ${skillText}`);
    }

    if (item.attributeSet && typeof item.attributeSet === "object") {
      const setText = Object.entries(item.attributeSet)
        .map(([attribute, value]) => `${attribute}=${value}`)
        .join(" | ");
      if (setText) lines.push(`${catalogT("catalog.set", "SET")}: ${setText}`);
    }

    if (item.alternativeAcquisition) {
      lines.push(catalogT("catalog.alt_acq", "ALT ACQ: FAVORS/TRADE"));
    }

    if (lines.length === 0) return "";
    return `<div class="meta" style="margin-top:8px; color:#8fdfff; font-size:0.72rem; line-height:1.4;">${lines.join("<br>")}</div>`;
  }

  function isVisualRecognitionItem(item) {
    return Array.isArray(item.tags) && item.tags.includes("visual_recognition_chip");
  }

  function isAmmoItem(item) {
    const category = normalizeCatalogToken(item.weaponClass || item.category);
    const typeCode = normalizeCatalogToken(item.raw?.type_code || item.type_code);
    const ammoTypeCodes = new Set(["ammo", "ammunition", "munition", "municao", "municoes"]);

    if (ammoTypeCodes.has(typeCode)) return true;

    return category === "ammo"
      || /(^|\s)ammo($|\s)/.test(category)
      || category.includes("ammunition")
      || category.includes("munition")
      || category.includes("municao")
      || category.includes("municoes");
  }

  function isShotgunAmmoItem(item) {
    const category = normalizeCatalogToken(item.weaponClass || item.category);
    const ammoType = normalizeCatalogToken(item.raw?.ammo_type);
    const name = normalizeCatalogToken(item.name);
    return category.includes("shotgun")
      || category.includes("espingarda")
      || ammoType.includes("shotgun")
      || ammoType.includes("espingarda")
      || ammoType.includes("cartucho")
      || ammoType.includes("apfsds")
      || ammoType.includes("flare")
      || ammoType.includes("flash")
      || name.includes("shotgun")
      || name.includes("espingarda")
      || name.includes("cartucho")
      || name.includes("apfsds")
      || name.includes("flare")
      || name.includes("flash");
  }

  function isAmmoReloadItem(item) {
    const category = normalizeCatalogToken(item.weaponClass || item.category);
    return category === "ammunition reloads" || category === "recargas de municao";
  }

  function normalizeCatalogToken(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function getAmmoOptionSet(item) {
    if (config.ammoCatalog && isAmmoReloadItem(item)) {
      const category = Object.values(fullCatalog).find((entry) => {
        const label = normalizeCatalogToken(entry?.name);
        return label === "ammunition types" || label === "tipos de municao";
      });
      const items = Object.values(category?.items || {});
      const options = items
        .filter((entry) => /x$/i.test(String(entry.priceLabel || "").trim()))
        .map((entry) => ({
          key: entry.id,
          label: entry.name,
          multiplier: Number(entry.price) || 1,
          pricingModel: "multiplier",
        }));
      if (options.length > 0) return options;
    }
    return isShotgunAmmoItem(item) ? SHOTGUN_AMMO_OPTIONS : AMMO_OPTIONS;
  }

  function getAmmoOption(item, key) {
    const options = getAmmoOptionSet(item);
    return options.find((option) => option.key === key) || options[0];
  }

  function computeCatalogPrice(item, smartchipped, ammoOptionKey, priceModifierKey) {
    let finalPrice = Number(item.price || 0);
    if (!Number.isFinite(finalPrice)) finalPrice = 0;

    if (Boolean(smartchipped) && !config.ammoCatalog && !isAmmoItem(item)) {
      finalPrice *= 2;
    }

    if ((!config.ammoCatalog && isAmmoItem(item)) || (config.ammoCatalog && isAmmoReloadItem(item))) {
      const ammoOption = getAmmoOption(item, ammoOptionKey);
      if (ammoOption.pricingModel === "fixed") {
        finalPrice = Number(ammoOption.fixedPrice || 0);
      } else {
        finalPrice *= Number(ammoOption.multiplier || 1);
      }
    }

    const priceModifier = getPriceModifierOption(item, priceModifierKey);
    if (priceModifier && !isAmmoItem(item)) {
      finalPrice *= priceModifier.multiplier;
    }

    return Number(finalPrice.toFixed(2));
  }

  function formatDisplayedCatalogPrice(item, finalPrice, smartchipped) {
    if (item.priceLabel) return item.priceLabel;
    const maximum = Number(item.priceMaximum);
    if (!(config.ammoCatalog || isAmmoItem(item)) && Number.isFinite(maximum) && maximum > Number(item.price || 0)) {
      const multiplier = smartchipped ? 2 : 1;
      return `${formatCurrency(Number(item.price || 0) * multiplier)} - ${formatCurrency(maximum * multiplier)}`;
    }
    const formatted = formatCurrency(finalPrice);
    if (config.deckCatalog && item.raw?.approximatePrice) {
      return catalogT("deck.approx_price", `About ${formatted}`, { price: formatted });
    }
    return formatted;
  }

  // --- PURCHASE LOGIC (AUTO-ROLL HL) ---
  function handleAssistedPurchase(item, btn) {
    const plan = CyberUtils.resolveInstallationPlan(item, Stash.get(), installationCatalogItems);
    const originalText = btn.textContent;

    if (!plan.ok) {
      const unresolved = plan.unresolved.map((entry) => formatName(entry.replace(/^[^:]+:/, ""))).join(", ");
      btn.textContent = catalogT("catalog.install_failed", "INSTALL BLOCKED");
      if (typeof Modal !== "undefined" && Modal?.alert) {
        Modal.alert(
          catalogT("catalog.install_failed_title", "INCOMPLETE INSTALLATION"),
          catalogT("catalog.install_failed_message", `Missing catalog requirements: ${unresolved}`, { requirements: unresolved }),
        );
      }
      setTimeout(() => { btn.textContent = originalText; }, 1200);
      return;
    }

    const cartEntries = plan.items.map((plannedItem) => CyberUtils.createCartEntry(plannedItem, {
      autoAdded: plannedItem !== item,
      autoInstalledFor: item.id,
    }));
    CyberUtils.appendCartItems(cartEntries, STORAGE_KEY);

    const totalHL = cartEntries.reduce((total, entry) => total + (Number(entry.hl) || 0), 0);
    btn.textContent = catalogT(
      "catalog.installed_complete",
      `INSTALLED +${plan.dependencies.length} REQ ${totalHL > 0 ? `[HL -${totalHL}]` : ""}`,
      {
        count: plan.dependencies.length,
        hl: totalHL > 0 ? `[${window.I18n?.isPtBr?.() ? "PH" : "HL"} -${totalHL}]` : "",
      },
    );
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 1200);
  }

  function handlePurchase(item, btn, options = {}) {
    let finalHL = 0;
    let rollLog = "";
    const ammoEntry = config.ammoCatalog || isAmmoItem(item);
    const smartchipped = Boolean(options.smartchipped) && !ammoEntry;
    const ammoOption = ammoEntry
      ? getAmmoOption(item, options.ammoOptionKey)
      : { key: "base", label: catalogT("catalog.standard", "Standard"), multiplier: 1, pricingModel: "multiplier" };
    const selectedPriceModifier = getPriceModifierOption(item, options.priceModifierKey);
    const pricedTotal = computeCatalogPrice(item, smartchipped, ammoOption.key, selectedPriceModifier?.id);

    if (item.hl && item.hl !== "0") {
      if (window.CyberUtils) {
        const rollResult = CyberUtils.rollHL(item.hl);
        finalHL = rollResult.value;
        rollLog = rollResult.log;
      } else {
        const rollResult = DiceEngine.roll(String(item.hl));
        finalHL = rollResult.total;
        rollLog =
          rollResult.details !== "FIXED"
            ? ` (Rolled: ${rollResult.details})`
            : "";
      }
    }

    Stash.add({
      id: item.id,
      legacyIds: item.legacyIds,
      name: item.name,
      price: pricedTotal,
      basePrice: item.price,
      category: item.category,
      categoryLabel: item.categoryLabel,
      sourceCatalog: pageId,
      editorialSource: item.source || null,
      locale: window.I18n?.getLocale?.() || "en-US",
      hl: finalHL, // Salva o valor numérico rolado
      hlOriginal: item.hl, // Salva a fórmula original para referência
      hlRaw: item.hl,
      hlLog: rollLog,
      tags: item.tags,
      maxPurchases: item.maxPurchases,
      alternativeAcquisition: item.alternativeAcquisition,
      attributeBonuses: item.attributeBonuses,
      skillBonuses: item.skillBonuses,
      attributeSet: item.attributeSet,
      priceModifiers: item.priceModifiers,
      modifierGroup: item.modifierGroup,
      selectedPriceModifier: selectedPriceModifier ? {
        groupId: item.modifierGroup.id,
        optionId: selectedPriceModifier.id,
        label: selectedPriceModifier.label,
        multiplier: selectedPriceModifier.multiplier,
      } : null,
      installation: item.installation,
      deck: config.deckCatalog ? {
        stats: item.raw?.stats || {},
        features: item.raw?.features || {},
        options: Array.isArray(item.raw?.options) ? item.raw.options : [],
        source: item.raw?.source || null,
        approximatePrice: Boolean(item.raw?.approximatePrice),
      } : null,
      Smartchipped: Boolean(smartchipped),
      ammoOptionKey: ammoEntry ? ammoOption.key : null,
      ammoOptionLabel: ammoEntry ? ammoOption.label : null,
      ammoOptionMultiplier: ammoEntry && ammoOption.pricingModel !== "fixed"
        ? Number(ammoOption.multiplier || 1)
        : null,
      ammoOptionPricingModel: ammoEntry ? (ammoOption.pricingModel || "multiplier") : null,
      ammoOptionFixedPrice: ammoEntry && ammoOption.pricingModel === "fixed"
        ? Number(ammoOption.fixedPrice || 0)
        : null,
    });

    const originalText = btn.textContent;
    btn.textContent = catalogT("catalog.copped", `COPPED! ${finalHL > 0 ? `[HL -${finalHL}]` : ""}`, {
      hl: finalHL > 0 ? `[${window.I18n?.isPtBr?.() ? "PH" : "HL"} -${finalHL}]` : "",
    });
    btn.style.background = "var(--primary-color)";
    btn.style.color = "#000";
    btn.style.boxShadow = "var(--glow-strong)";

    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = "";
      btn.style.color = "";
      btn.style.boxShadow = "";
    }, 1500);
  }

  function parsePrice(val) {
    if (window.CyberUtils) return CyberUtils.parseNumeric(val);
    if (typeof val === "number") return val;
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^0-9.]/g, "")) || 0;
  }

  function formatCurrency(val) {
    if (window.CyberUtils) return CyberUtils.formatCurrency(val);
    return Number(val || 0).toLocaleString(window.I18n?.getLocale?.() || "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " eb";
  }

  function formatName(slug) {
    return slug.replace(/_/g, " ").toUpperCase();
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "item";
  }

  function buildWeaponDescription(weapon) {
    const formatField = (value, suffix = "") => {
      if (value === undefined || value === null || String(value).trim() === "") {
        return "N/A";
      }
      const values = Array.isArray(value) ? value : [value];
      return values.map((entry) => `${entry}${suffix}`).join(" / ");
    };

    const bits = [
      `${catalogT("weapon.type", "Type")}: ${formatField(weapon.type_code)}`,
      `${catalogT("weapon.accuracy", "Accuracy")}: ${formatField(weapon.accuracy)}`,
      `${catalogT("weapon.concealment", "Concealment")}: ${formatField(weapon.concealment)}`,
      `${catalogT("weapon.availability", "Availability")}: ${formatField(weapon.availability)}`,
      `${catalogT("weapon.damage", "Damage")}: ${formatField(weapon.damage)}`,
      `${catalogT("weapon.ammo_type", "Ammo Type")}: ${formatField(weapon.ammo_type)}`,
      `${catalogT("weapon.range", "Range")}: ${formatField(weapon.weapon_range_m, "m")}`,
      `${catalogT("weapon.capacity", "Capacity")}: ${formatField(weapon.magazine_capacity)}`,
      `${catalogT("weapon.cadence", "Cadence")}: ${formatField(weapon.cadence_full_auto)}`,
      `${catalogT("weapon.reliability", "Reliability")}: ${formatField(weapon.reliability)}`,
    ];

    return bits.join(" // ");
  }

  function detectPage() {
    const path = window.location.pathname;
    if (path.includes("cyberwares")) return "cyberwares";
    if (path.includes("accessories")) return "accessories";
    if (path.includes("cyberdecks")) return "cyberdecks";
    if (path.includes("drugs")) return "drugs";
    if (path.includes("weapons")) return "weapons";
    if (path.includes("ammo")) return "ammo";
    return null;
  }

  function captureUI() {
    return {
      categoryList: document.getElementById("category-list"),
      itemsList: document.getElementById("items-list"),
      titleCategory: document.getElementById("title-category"),
      filterToggle: document.getElementById("filter-toggle"),
      filterSidebar: document.getElementById("filter-sidebar"),
      closeFilter: document.getElementById("close-filter"),
      fsCategory: document.getElementById("fs-category"),
      fsApply: document.getElementById("fs-apply"),
      fsClear: document.getElementById("fs-clear"),
    };
  }

  // --- EVENTS ---
  function setupFilters(catalog) {
    if (!ui.fsCategory) return;
    const frag = document.createDocumentFragment();
    const all = document.createElement("option");
    all.value = "";
    all.textContent = catalogT("catalog.all_signals", "ALL SIGNALS");
    frag.appendChild(all);
    Object.keys(catalog).forEach((k) => {
      if (typeof catalog[k] !== "object") return;
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = catalog[k].name || k;
      frag.appendChild(opt);
    });
    ui.fsCategory.replaceChildren(frag);
  }

  function readCatalogLinkState() {
    if (window.CyberPermalinks) return window.CyberPermalinks.readCatalogState();
    const params = new URLSearchParams(window.location.search);
    return {
      item: params.get("item") || "",
      category: params.get("category") || "",
      price: params.get("price") || "",
      hl: params.get("hl") || "",
      cir: params.get("cir") || "",
      difficulty: params.get("difficulty") || "",
      smartchipped: params.get("smartchip") === "1",
      ammoOptionKey: params.get("ammo") || "",
      priceModifierKey: params.get("modifier") || "",
      level: params.get("level") || "",
    };
  }

  function readCatalogFilters() {
    return {
      category: ui.fsCategory?.value || activeCategory || "",
      price: document.getElementById("fs-price-max-input")?.value || "",
      hl: document.getElementById("fs-hl-max-input")?.value || "",
      cir: document.getElementById("fs-cir-input")?.value || "",
      difficulty: document.getElementById("fs-difficulty-max-input")?.value || "",
    };
  }

  function hydrateCatalogLinkState() {
    const state = readCatalogLinkState();
    if (ui.fsCategory && fullCatalog[state.category]) ui.fsCategory.value = state.category;
    const values = {
      "fs-price-max-input": state.price,
      "fs-hl-max-input": state.hl,
      "fs-cir-input": state.cir,
      "fs-difficulty-max-input": state.difficulty,
    };
    Object.entries(values).forEach(([id, value]) => {
      const field = document.getElementById(id);
      if (field && value !== "") field.value = value;
    });
  }

  function applyCatalogFilters(syncLink = true) {
    const filters = readCatalogFilters();
    const targetCat = fullCatalog[filters.category] ? filters.category : activeCategory;
    const maxPrice = parseFloat(filters.price) || Infinity;
    const maxHL = parseFloat(filters.hl) || Infinity;
    const cirFilter = filters.cir.trim().toLowerCase();
    const maxDifficulty = parseFloat(filters.difficulty) || Infinity;

    if (targetCat && targetCat !== activeCategory) selectCategory(targetCat);
    let list = getItemsFromCategory(targetCat);
    list = list.filter((item) => item.price <= maxPrice);

    if (Number.isFinite(maxHL)) {
      list = list.filter((item) => {
        if (!item.hl) return true;
        if (window.CyberUtils) return CyberUtils.hlComparable(item.hl) <= maxHL;
        return parseFloat(item.hl) <= maxHL;
      });
    }
    if (cirFilter) list = list.filter((item) => String(item.cir || "").toLowerCase().includes(cirFilter));
    if (Number.isFinite(maxDifficulty)) {
      list = list.filter((item) => {
        const itemDifficulty = Number(item.raw?.difficulty);
        return Number.isNaN(itemDifficulty) || itemDifficulty <= maxDifficulty;
      });
    }

    renderItems(list);
    if (syncLink && window.CyberPermalinks) {
      window.CyberPermalinks.replace(window.CyberPermalinks.catalogFilterUrl(filters));
    }
    if (window.innerWidth < 800) ui.filterSidebar.classList.add("hidden");
  }

  function setupEvents() {
    if (ui.filterToggle)
      ui.filterToggle.onclick = () =>
        ui.filterSidebar.classList.toggle("hidden");
    if (ui.closeFilter)
      ui.closeFilter.onclick = () => ui.filterSidebar.classList.add("hidden");

    if (ui.fsApply) {
      ui.fsApply.onclick = () => applyCatalogFilters();
      if (window.CyberPermalinks && !document.querySelector("[data-share-filter]")) {
        const share = window.CyberPermalinks.createButton(
          () => window.CyberPermalinks.catalogFilterUrl(readCatalogFilters()),
          catalogT("permalink.filter", "COPY FILTER LINK"),
        );
        share.dataset.shareFilter = "true";
        ui.fsApply.closest(".action-row")?.appendChild(share);
      }
    }
    if (ui.fsClear) {
      ui.fsClear.onclick = () => {
        document.getElementById("fs-price-max-input").value = "";
          const hlInput = document.getElementById("fs-hl-max-input");
          if (hlInput) hlInput.value = "";
          const cirInput = document.getElementById("fs-cir-input");
          if (cirInput) cirInput.value = "";
          const difficultyInput = document.getElementById("fs-difficulty-max-input");
          if (difficultyInput) difficultyInput.value = "";
        ui.fsCategory.value = "";
        if (activeCategory) renderItems(getItemsFromCategory(activeCategory));
        if (window.CyberPermalinks) {
          window.CyberPermalinks.replace(window.CyberPermalinks.catalogFilterUrl({ category: activeCategory }));
        }
      };
    }
  }
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PAGE_CONFIG,
    AMMO_OPTIONS,
    SHOTGUN_AMMO_OPTIONS,
    DiceEngine,
    Stash,
    getApplicableModifierGroup,
    getPriceModifierOption,
    compareSourceLabel,
    buildCatalogComparison,
  };
}
