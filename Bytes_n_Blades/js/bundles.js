/**
 * BYTE & BLADES - BUNDLE ENGINE
 * Builds coherent random bundles with dependency validation.
 */

const BUNDLE_STORAGE_KEY = "cyber_cart";
const AUTO_REFRESH_MIN_SECONDS = 45;
const AUTO_REFRESH_MAX_SECONDS = 140;

const BUDGET_BANDS = {
  scrape: { itemCap: 500, extras: 0, ammoBoxes: 1, weeks: 1, discountBoost: 2 },
  street: { itemCap: 1500, extras: 1, ammoBoxes: 1, weeks: 2, discountBoost: 1 },
  professional: { itemCap: 5000, extras: 2, ammoBoxes: 2, weeks: 4, discountBoost: 0 },
  elite: { itemCap: 20000, extras: 3, ammoBoxes: 3, weeks: 6, discountBoost: 1 },
  corporate: { itemCap: Number.POSITIVE_INFINITY, extras: 4, ammoBoxes: 4, weeks: 8, discountBoost: 2 },
};

const ROLE_PROFILES = {
  rockerboy: {
    labelKey: "bundle.profile_rockerboy", label: "Rockerboy", vibe: "social",
    required: ["pocketCommo"],
    gear: ["eletricGuitar", "amplifier", "digitalRecorder", "videoCam", "cellularPhone", "jacket", "mirrorshades"],
    chrome: ["cyberaudio", "amplified_hearing", "radio_link", "sound_editing", "voice_synthesizer", "rocker_visual_rec_chip"],
    field: ["nylonCarryBag", "firstAidKit", "pocketTV", "tapePlayer", "tape"],
    weaponClasses: ["Medium Handgun", "Light Handgun"],
  },
  solo: {
    labelKey: "bundle.profile_solo", label: "Solo", vibe: "combat",
    required: ["neuralware_processor", "interface_plugs", "smartgun_link"],
    gear: ["medkit", "firstAidKit", "binocular", "lightBoosterGoogle", "plasKuffs", "pocketCommo"],
    chrome: ["cyberoptic", "targeting_scope", "low_lite", "subdermal_armor", "pain_editor", "skin_weave"],
    field: ["trackingDevice", "movementSensor", "protectiveGoggles", "breathmask"],
    weaponClasses: ["Heavy Handgun", "Very Heavy Handgun", "Medium SMG", "Heavy SMG"],
  },
  netrunner: {
    labelKey: "bundle.profile_netrunner", label: "Netrunner", vibe: "netrunner",
    required: ["neuralware_processor", "cybermodem_link", "interface_plugs", "dataterm_link"],
    gear: ["interfaceCables", "lowImpedance", "keyboard", "terminal", "laptop", "pocketComputer"],
    chrome: ["chipware_socket", "memory_compression", "crypto_chips", "cell_phone_implant"],
    field: ["techToolkit", "eletronicToolkit", "dataChip", "pocketCommo", "firstAidKit"],
    weaponClasses: ["Light Handgun", "Medium Handgun"],
  },
  techie: {
    labelKey: "bundle.profile_techie", label: "Techie", vibe: "technical",
    required: ["machine_tech_link"],
    gear: ["techToolkit", "eletronicToolkit", "techscanner", "cuttingtorch", "protectiveGoggles", "pocketComputer"],
    chrome: ["tool_hand", "socket_wrench", "cyberlimb_digital_recorder", "implant_digital_recorder"],
    field: ["breakingEnteringTools", "flashtube", "rope", "breathmask", "interfaceCables"],
    weaponClasses: ["Medium Handgun", "Heavy Handgun"],
  },
  medtechie: {
    labelKey: "bundle.profile_medtechie", label: "Medtechie", vibe: "medical",
    required: ["biomonitor"],
    gear: ["medkit", "firstAidKit", "surgicalKit", "medscanner", "drugAnalyzer", "airhypho", "dermalStapler"],
    chrome: ["pain_editor", "advanced_biomonitor", "chemical_analyser", "militech_cyberdoc", "enhanced_antibodies"],
    field: ["spraySkin", "nylonCarryBag", "cellularPhone", "protectiveGoggles"],
    weaponClasses: ["Light Handgun", "Medium Handgun"],
  },
  media: {
    labelKey: "bundle.profile_media", label: "Media", vibe: "investigation",
    required: ["digitalRecorder"],
    gear: ["digitalCamera", "videoCam", "tapePlayer", "tape", "cellularPhone", "laptop", "binglasses"],
    chrome: ["implant_digital_recorder", "audio_video_tape_recorder", "cyberoptic", "digital_camera", "microvideo_optic", "cell_phone_implant"],
    field: ["pocketCommo", "trackingDevice", "tracerButton", "firstAidKit"],
    weaponClasses: ["Light Handgun", "Medium Handgun"],
  },
  cop: {
    labelKey: "bundle.profile_cop", label: "Cop", vibe: "law",
    required: ["pocketCommo", "plasKuffs"],
    gear: ["movementSensor", "trackingDevice", "tracerButton", "securityScanner", "binocular", "medkit"],
    chrome: ["neuralware_processor", "interface_plugs", "smartgun_link", "radio_link", "voice_stress_analyser", "police_visual_rec_chip"],
    field: ["passCard", "stripwireBlinders", "lightBoosterGoogle", "breathmask"],
    weaponClasses: ["Heavy Handgun", "Medium Handgun", "Medium SMG"],
  },
  corporate: {
    labelKey: "bundle.profile_corporate", label: "Corporate", vibe: "executive",
    required: ["cellularPhone", "credChipAccount"],
    gear: ["laptop", "miniCellPhone", "pants", "jacket", "glasses", "digitalRecorder"],
    chrome: ["cell_phone_implant", "voice_stress_analyser", "corporate_visual_rec_chip", "biomonitor", "skinwatch"],
    field: ["vocolock", "passCard", "healthPlan", "traumaTeamGold"],
    weaponClasses: ["Medium Handgun", "Light Handgun"],
  },
  fixer: {
    labelKey: "bundle.profile_fixer", label: "Fixer", vibe: "street-deal",
    required: ["pocketCommo", "passCard"],
    gear: ["cellularPhone", "miniCellPhone", "trackingDevice", "tracerButton", "breakingEnteringTools", "credChipAccount"],
    chrome: ["cell_phone_implant", "voice_stress_analyser", "scrambler", "bug_detector", "digi_tone_id"],
    field: ["plasKuffs", "poisonSniffer", "jammingTransmitter", "nylonCarryBag"],
    weaponClasses: ["Medium Handgun", "Heavy Handgun", "Medium SMG"],
  },
  nomad: {
    labelKey: "bundle.profile_nomad", label: "Nomad", vibe: "road",
    required: ["nylonCarryBag", "sleepingBag"],
    gear: ["motorcycle", "scooter", "techToolkit", "firstAidKit", "rope", "breathmask", "pocketCommo"],
    chrome: ["vehicle_link", "interface_plugs", "nasal_filters", "skin_weave", "muscle_and_bone_lace"],
    field: ["logcompass", "binocular", "glowstick", "flashtube", "genericPrepak"],
    weaponClasses: ["Heavy Handgun", "Shotgun", "Medium Handgun"],
  },
};

const ROLE_BUNDLE_VARIANTS = [
  { id: "essentials", titleKey: "bundle.variant_essentials", title: "Essentials", gearCount: 2, chromeCount: 0, fieldCount: 1, weapon: false, discountRange: [5, 10] },
  { id: "field", titleKey: "bundle.variant_field", title: "Field Loadout", gearCount: 2, chromeCount: 0, fieldCount: 2, weapon: true, discountRange: [7, 13] },
  { id: "specialist", titleKey: "bundle.variant_specialist", title: "Specialist Stack", gearCount: 1, chromeCount: 3, fieldCount: 1, weapon: false, discountRange: [9, 16] },
  { id: "complete", titleKey: "bundle.variant_complete", title: "Complete Build", gearCount: 3, chromeCount: 4, fieldCount: 3, weapon: true, discountRange: [12, 20] },
];

function bundleT(key, fallback, params = {}) {
  if (typeof window !== "undefined" && window.I18n) return window.I18n.t(key, params, fallback);
  return String(fallback).replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name) => params[name] ?? `{${name}}`);
}

function bundleDataPath(path) {
  return typeof window !== "undefined" && window.I18n ? window.I18n.dataPath(path) : path;
}

document.addEventListener("DOMContentLoaded", () => {
  const ui = {
    list: document.getElementById("bundle-list"),
    timer: document.getElementById("bundle-timer"),
    profile: document.getElementById("kit-profile"),
    budget: document.getElementById("kit-budget"),
    lowHL: document.getElementById("kit-low-hl"),
  };

  if (!ui.list) return;

  init(ui);
});

async function init(ui) {
  try {
    const [cyberwaresRaw, equipmentRaw, weaponsRaw, ammoRaw] = await Promise.all([
      fetchJson(bundleDataPath("../data/cyberwares.json")),
      fetchJson(bundleDataPath("../data/equipment.json")),
      fetchJson(bundleDataPath("../data/weapons.json")),
      fetchJson(bundleDataPath("../data/ammo.json")),
    ]);

    const dataStore = {
      cyberwares: normalizeCatalog(cyberwaresRaw.data || cyberwaresRaw, "cyberware"),
      equipment: normalizeCatalog(equipmentRaw.data || equipmentRaw, "equipment"),
      weapons: normalizeWeaponCatalog(weaponsRaw.weapons || weaponsRaw.data?.weapons || []),
      ammo: normalizeAmmoCatalog(ammoRaw.items || ammoRaw.data?.items || []),
    };

    const context = createBundleContext(dataStore);
    let refreshTimeoutId = null;
    let countdownIntervalId = null;

    const currentOptions = () => ({
      profile: ui.profile?.value || "solo",
      budget: ui.budget?.value || "street",
      lowHL: !!ui.lowHL?.checked,
    });

    const rerender = () => {
      const bundles = generateBundles(context, currentOptions());
      renderBundles(ui.list, bundles);
    };

    ui.profile?.addEventListener("change", rerender);
    ui.budget?.addEventListener("change", rerender);
    ui.lowHL?.addEventListener("change", rerender);

    rerender();
    scheduleAutoRefresh();

    function scheduleAutoRefresh() {
      if (refreshTimeoutId) clearTimeout(refreshTimeoutId);
      if (countdownIntervalId) clearInterval(countdownIntervalId);

      const delaySeconds = randomInt(AUTO_REFRESH_MIN_SECONDS, AUTO_REFRESH_MAX_SECONDS);
      const nextRefreshAt = Date.now() + delaySeconds * 1000;

      updateTimerLabel(delaySeconds);

      countdownIntervalId = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((nextRefreshAt - Date.now()) / 1000));
        updateTimerLabel(remaining);
      }, 1000);

      refreshTimeoutId = setTimeout(() => {
        rerender();
        scheduleAutoRefresh();
      }, delaySeconds * 1000);
    }

    function updateTimerLabel(seconds) {
      if (!ui.timer) return;
      ui.timer.innerHTML = bundleT(
        "bundle.next_drip",
        `NEXT DATA DRIP IN <span style="color:var(--primary-color)">${seconds}s</span>`,
        { seconds: `<span style="color:var(--primary-color)">${seconds}</span>` },
      );
    }
  } catch (error) {
    ui.list.innerHTML = `
      <article class="item">
        <h3>${bundleT("bundle.offline", "[!] BUNDLE ENGINE OFFLINE")}</h3>
        <p class="desc">${error.message}</p>
      </article>
    `;
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  return response.json();
}

function normalizeCatalog(data, sourceType) {
  const categories = {};

  Object.entries(data || {}).forEach(([categoryName, categoryValue]) => {
    if (!categoryValue || typeof categoryValue !== "object") return;

    const rawList = categoryValue.itens || categoryValue.items || categoryValue.list || {};
    const items = [];

    Object.entries(rawList).forEach(([id, item]) => {
      if (!item || typeof item !== "object") return;

      const name = item.name || toTitleCase(id);
      if (!name || String(name).toUpperCase().includes("TODO")) return;

      const price = parseNumeric(item.price || item.cost || item.value || 0);
      if (price <= 0) return;
      const modifierGroup = normalizeBundleModifierGroup(categoryValue.modifierGroup, id, item.id || id);

      items.push({
        id: item.id || id,
        catalogId: `${sourceType}:${categoryName}:${id}`,
        key: id,
        legacyIds: Array.isArray(item.legacyIds) ? item.legacyIds : [],
        sourceType,
        sourceCategory: categoryName,
        sourceCategoryLabel: categoryValue.name || categoryName,
        name: String(name).trim(),
        description: item.description || item.note || bundleT("catalog.no_specs", "No specs available."),
        price,
        hlRaw: item.HL || item.hl || item.humanity || "0",
        tags: Array.isArray(item.tags) ? item.tags : [],
        maxPurchases: Number(item.maxPurchases) || null,
        alternativeAcquisition: Boolean(item.alternativeAcquisition),
        attributeBonuses: Array.isArray(item.attributeBonuses) ? item.attributeBonuses : [],
        skillBonuses: Array.isArray(item.skillBonuses) ? item.skillBonuses : [],
        attributeSet: item.attributeSet && typeof item.attributeSet === "object"
          ? item.attributeSet
          : null,
        priceModifiers: Array.isArray(item.priceModifiers) ? item.priceModifiers : [],
        modifierGroup,
        installation: item.installation && typeof item.installation === "object"
          ? item.installation
          : null,
      });
    });

    if (items.length > 0) categories[categoryName] = items;
  });

  return categories;
}

function normalizeBundleModifierGroup(group, itemKey, itemId) {
  if (!group || typeof group !== "object") return null;
  const appliesTo = Array.isArray(group.appliesTo) ? group.appliesTo.map(String) : [];
  if (!appliesTo.includes(String(itemKey)) && !appliesTo.includes(String(itemId))) return null;
  const options = (Array.isArray(group.options) ? group.options : [])
    .map((option) => ({
      id: String(option?.id || "").trim(),
      label: String(option?.label || option?.id || "").trim(),
      multiplier: Number(option?.multiplier),
    }))
    .filter((option) => option.id && option.label && Number.isFinite(option.multiplier) && option.multiplier > 0);
  if (!group.id || !group.label || options.length === 0) return null;
  return { id: String(group.id), label: String(group.label), options };
}

function normalizeWeaponCatalog(weapons) {
  const categories = {};
  (Array.isArray(weapons) ? weapons : []).forEach((weapon, index) => {
    if (!weapon || typeof weapon !== "object") return;
    const name = String(weapon.name || `Weapon ${index + 1}`).trim();
    const category = String(weapon.class || "Unsorted").trim() || "Unsorted";
    const price = parseNumeric(weapon.price);
    if (!name || name.toUpperCase().includes("TODO") || price <= 0) return;
    if (!categories[category]) categories[category] = [];
    categories[category].push({
      id: weapon.id || `weapon_${index}`,
      catalogId: `weapon:${category}:${weapon.id || index}`,
      key: weapon.id || `weapon_${index}`,
      legacyIds: Array.isArray(weapon.legacyIds) ? weapon.legacyIds : [],
      sourceType: "weapons",
      sourceCategory: category,
      sourceCategoryLabel: category,
      name,
      description: weapon.Note || weapon.note || bundleT("catalog.no_specs", "No specs available."),
      price,
      priceMaximum: Number.isFinite(Number(weapon.price_max)) ? Number(weapon.price_max) : null,
      hlRaw: "0",
      tags: ["weapon"],
      maxPurchases: null,
      alternativeAcquisition: false,
      attributeBonuses: [],
      skillBonuses: [],
      attributeSet: null,
      priceModifiers: [],
      modifierGroup: null,
      installation: weapon.installation && typeof weapon.installation === "object" ? weapon.installation : null,
      weaponClass: category,
      ammoType: weapon.ammo_type,
      typeCode: weapon.type_code,
      raw: weapon,
    });
  });
  return categories;
}

function normalizeAmmoCatalog(entries) {
  const categories = {};
  (Array.isArray(entries) ? entries : []).forEach((entry, index) => {
    const category = String(entry.category || "Ammo");
    if (!categories[category]) categories[category] = [];
    categories[category].push({
      id: entry.id || `ammo_${index}`,
      legacyIds: Array.isArray(entry.legacyIds) ? entry.legacyIds : [],
      catalogId: `ammo:${category}:${entry.id || index}`,
      key: entry.id || `ammo_${index}`,
      sourceType: "ammo",
      sourceCategory: category,
      sourceCategoryLabel: category,
      name: entry.name,
      description: entry.description || entry.effect || "",
      price: parseNumeric(entry.price),
      priceMaximum: Number.isFinite(Number(entry.price_max)) ? Number(entry.price_max) : null,
      hlRaw: "0",
      tags: ["ammo"],
      weaponClass: "Ammo",
      raw: entry,
    });
  });
  return categories;
}

function createBundleContext(dataStore) {
  const cyberByCategory = dataStore.cyberwares;
  const equipmentByCategory = dataStore.equipment;
  const weaponsByCategory = dataStore.weapons;
  const ammoByCategory = dataStore.ammo || {};

  const allCyber = Object.values(cyberByCategory).flat();
  const allEquipment = Object.values(equipmentByCategory).flat();
  const allWeapons = Object.values(weaponsByCategory).flat();
  const allAmmo = Object.values(ammoByCategory).flat();

  const byName = new Map();
  const byId = new Map();
  [...allCyber, ...allEquipment, ...allWeapons, ...allAmmo].forEach((item) => {
    const key = normalizeName(item.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(item);

    [item.id, ...(item.legacyIds || [])].forEach((candidateId) => {
      const normalizedId = normalizeItemId(candidateId);
      if (normalizedId && !byId.has(normalizedId)) {
        byId.set(normalizedId, item);
      }
    });
  });

  return {
    cyberByCategory,
    equipmentByCategory,
    weaponsByCategory,
    allCyber,
    allEquipment,
    allWeapons,
    findByName(name) {
      const found = byName.get(normalizeName(name)) || [];
      return found[0] || null;
    },
    findById(id) {
      return byId.get(normalizeItemId(id)) || null;
    },
    findInCategory(group, category) {
      if (group === "cyber") return cyberByCategory[category] || [];
      if (group === "equipment") return equipmentByCategory[category] || [];
      if (group === "weapon") return weaponsByCategory[category] || [];
      return [];
    },
    pickRandom(items, amount = 1, excludeIds = new Set()) {
      const pool = items.filter((item) => !excludeIds.has(item.id));
      if (pool.length === 0) return [];

      const shuffled = pool.slice().sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(amount, shuffled.length));
    },
  };
}

function generateLegacyBundles(context, options) {
  const templates = [
    buildVirginBundle,
    buildNetrunnerBundle,
    buildSoloBundle,
    buildReconBundle,
    buildStreetMedicBundle,
    buildChromeStarBundle,
  ];

  return templates.map((template) => {
    const draft = template(context, options);
    const tunedItems = applyOptionFilters(draft.items, options);
    const coherentItems = enforceDependencies(tunedItems, context);
    const signed = applyStoreSignature(draft, coherentItems, options);
    const subtotal = signed.items.reduce((sum, item) => sum + item.price, 0);
    const discountPct = Math.min(
      30,
      randomInt(draft.discountRange[0], draft.discountRange[1]) + signed.discountBoost,
    );
    const total = subtotal * (1 - discountPct / 100);

    return {
      title: signed.title,
      titleKey: draft.titleKey,
      signatureKey: signed.signatureKey,
      subtitle: draft.subtitle,
      perks: signed.perks,
      vibe: draft.vibe || "balanced",
      signature: signed.signature,
      discountPct,
      items: signed.items,
      subtotal,
      total,
    };
  });
}

function buildVirginBundle(context, options) {
  const required = ["neuralware_processor", "chipware_socket"]
    .map((id) => context.findById(id))
    .filter(Boolean);

  const chipPool = withStyleFlavor(context, [
    ...context.findInCategory("cyber", "Chipware"),
    ...context.findInCategory("cyber", "Behaviour Chips"),
  ], options);

  const selected = pickBundleItems(required, chipPool, randomInt(3, 4));

  return {
    titleKey: "bundle.virgin_title",
    title: bundleT("bundle.virgin_title", "Virgin Bundle"),
    subtitle: bundleT("bundle.virgin_subtitle", "First neural stack with socket + starter chips."),
    perks: [
      bundleT("bundle.virgin_perk_1", "Quick-learning chip set"),
      bundleT("bundle.virgin_perk_2", "Dependency-safe install"),
    ],
    vibe: "balanced",
    items: selected,
    discountRange: [10, 16],
  };
}

function buildNetrunnerBundle(context, options) {
  const required = [
    "neuralware_processor",
    "cybermodem_link",
    "interface_plugs",
    "dataterm_link",
  ]
    .map((id) => context.findById(id))
    .filter(Boolean);

  const supportPool = withStyleFlavor(context, [
    ...context.findInCategory("equipment", "dataSystems"),
    ...context.findInCategory("equipment", "tools"),
  ], options).filter((item) =>
    ["laptop", "interface", "keyboard", "tech", "modem"].some((token) =>
      bundleSearchText(item).includes(token),
    ),
  );

  const selected = pickBundleItems(required, supportPool, 3);

  return {
    titleKey: "bundle.netrunner_title",
    title: bundleT("bundle.netrunner_title", "Netrunner Alley Pack"),
    subtitle: bundleT("bundle.netrunner_subtitle", "Direct-link setup with deck support hardware."),
    perks: [
      bundleT("bundle.netrunner_perk_1", "Datajack ready"),
      bundleT("bundle.netrunner_perk_2", "Signal tooling included"),
    ],
    vibe: "netrunner",
    items: selected,
    discountRange: [8, 14],
  };
}

function buildSoloBundle(context, options) {
  const required = [
    "neuralware_processor",
    "interface_plugs",
    "smartgun_link",
  ]
    .map((id) => context.findById(id))
    .filter(Boolean);

  const cyberSupport = withStyleFlavor(context, [
    ...context.findInCategory("cyber", "Cyberoptics Options"),
    ...context.findInCategory("cyber", "Bodyweapons"),
    ...context.findInCategory("equipment", "security"),
  ], options);

  const selected = pickBundleItems(required, cyberSupport, 4);

  return {
    titleKey: "bundle.solo_title",
    title: bundleT("bundle.solo_title", "Solo Smartgun Pack"),
    subtitle: bundleT("bundle.solo_subtitle", "Combat link package tuned for direct-fire builds."),
    perks: [
      bundleT("bundle.solo_perk_1", "Combat-first tuning"),
      bundleT("bundle.solo_perk_2", "Urban suppression gear"),
    ],
    vibe: "aggressive",
    items: selected,
    discountRange: [12, 20],
  };
}

function buildReconBundle(context, options) {
  const required = ["cyberoptic", "image_enhancement", "amplified_hearing"]
    .map((id) => context.findById(id))
    .filter(Boolean);

  const reconSupport = withStyleFlavor(context, [
    ...context.findInCategory("cyber", "Cyberaudio Options"),
    ...context.findInCategory("equipment", "surveillance"),
  ], options).filter((item) =>
    ["scope", "hearing", "binocular", "ir", "scanner", "enhancement"].some((token) =>
      bundleSearchText(item).includes(token),
    ),
  );

  const selected = pickBundleItems(required, reconSupport, 3);

  return {
    titleKey: "bundle.recon_title",
    title: bundleT("bundle.recon_title", "Ghost Recon Bundle"),
    subtitle: bundleT("bundle.recon_subtitle", "Sensory stack for tracking, spotting and tactical intel."),
    perks: [
      bundleT("bundle.recon_perk_1", "Stealth optics lane"),
      bundleT("bundle.recon_perk_2", "Recon-grade sensory fusion"),
    ],
    vibe: "stealth",
    items: selected,
    discountRange: [9, 15],
  };
}

function buildStreetMedicBundle(context, options) {
  const required = ["biomonitor", "pain_editor"]
    .map((id) => context.findById(id))
    .filter(Boolean);

  const supportPool = withStyleFlavor(context, [
    ...context.findInCategory("equipment", "medical"),
    ...context.findInCategory("equipment", "tools"),
    ...context.findInCategory("cyber", "Biotech"),
  ], options);

  const selected = pickBundleItems(required, supportPool, 3);

  return {
    titleKey: "bundle.medic_title",
    title: bundleT("bundle.medic_title", "Street Medic Kit"),
    subtitle: bundleT("bundle.medic_subtitle", "Patch-up stack for night runs and bad exits."),
    perks: [
      bundleT("bundle.medic_perk_1", "Emergency triage ready"),
      bundleT("bundle.medic_perk_2", "Surgery support loadout"),
    ],
    vibe: "balanced",
    items: selected,
    discountRange: [7, 13],
  };
}

function buildChromeStarBundle(context, options) {
  const required = ["neuralware_processor"]
    .map((id) => context.findById(id))
    .filter(Boolean);

  const flairPool = withStyleFlavor(context, [
    ...context.findInCategory("cyber", "Fashionware"),
    ...context.findInCategory("cyber", "Cyberware Customisation"),
    ...context.findInCategory("equipment", "fashion"),
    ...context.findInCategory("equipment", "communications"),
  ], options);

  const selected = pickBundleItems(required, flairPool, 4);

  return {
    titleKey: "bundle.star_title",
    title: bundleT("bundle.star_title", "Chrome Star Kit"),
    subtitle: bundleT("bundle.star_subtitle", "Style-forward chrome for flex, social ops and club heat."),
    perks: [
      bundleT("bundle.star_perk_1", "High-presence fashionware"),
      bundleT("bundle.star_perk_2", "Persona boost package"),
    ],
    vibe: "balanced",
    items: selected,
    discountRange: [11, 18],
  };
}

function withStyleFlavor(context, pool, options) {
  const base = pool.slice();
  const style = options?.style || "balanced";

  if (style === "aggressive") {
    return base.concat(
      context.findInCategory("cyber", "Bodyweapons"),
      context.findInCategory("equipment", "security"),
    );
  }

  if (style === "stealth") {
    return base.concat(
      context.findInCategory("cyber", "Cyberoptics Options"),
      context.findInCategory("equipment", "surveillance"),
    );
  }

  if (style === "netrunner") {
    return base.concat(
      context.findInCategory("cyber", "Chipware"),
      context.findInCategory("equipment", "dataSystems"),
    );
  }

  return base;
}

function bundleSearchText(item) {
  return [item?.id, item?.key, item?.name]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");
}

function applyOptionFilters(items, options) {
  let filtered = items.slice();

  if (options?.lowHL && window.CyberUtils) {
    const low = filtered.filter((item) => CyberUtils.hlComparable(item.hlRaw) <= 4);
    if (low.length > 0) filtered = low;
  }

  const budgetCap = getBudgetBand(options).itemCap;

  const budgeted = filtered.filter((item) => item.price <= budgetCap);
  if (budgeted.length > 0) filtered = budgeted;

  return filtered;
}

function applyStoreSignature(draft, items, options) {
  const style = options?.style || "balanced";
  const budget = options?.budget || "street";

  const styleSignature = {
    aggressive: {
      key: "bundle.signature_aggressive",
      label: bundleT("bundle.signature_aggressive", "Combat Calibrated"),
      perks: [bundleT("bundle.signature_aggressive_perk", "Pressure-first tuning")],
      discountBoost: 1,
    },
    stealth: {
      key: "bundle.signature_stealth",
      label: bundleT("bundle.signature_stealth", "Low-Profile Calibrated"),
      perks: [bundleT("bundle.signature_stealth_perk", "Silent utility bias")],
      discountBoost: 1,
    },
    netrunner: {
      key: "bundle.signature_netrunner",
      label: bundleT("bundle.signature_netrunner", "Netflow Calibrated"),
      perks: [bundleT("bundle.signature_netrunner_perk", "Signal-chain compatibility")],
      discountBoost: 1,
    },
    balanced: {
      key: "bundle.signature_balanced",
      label: bundleT("bundle.signature_balanced", "House Balanced"),
      perks: [bundleT("bundle.signature_balanced_perk", "Cross-role coherence check")],
      discountBoost: 0,
    },
  };

  const budgetBoost = {
    street: 1,
    pro: 0,
    opulence: 2,
  };

  const signature = styleSignature[style] || styleSignature.balanced;
  const perks = (draft.perks || []).concat(signature.perks);
  const title = `${draft.title} // ${signature.label}`;

  return {
    signature: signature.label,
    signatureKey: signature.key,
    title,
    perks,
    items,
    discountBoost: signature.discountBoost + (budgetBoost[budget] || 0),
  };
}

function getBudgetBand(options) {
  return BUDGET_BANDS[options?.budget] || BUDGET_BANDS.street;
}

function uniqueItems(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter((item) => {
    const id = normalizeItemId(item?.id || item?.name);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function selectBundleCandidates(context, ids, count, options) {
  const candidates = uniqueItems((ids || []).map((id) => context.findById(id)).filter(Boolean));
  if (candidates.length === 0 || count <= 0) return [];
  const filtered = applyOptionFilters(candidates, options);
  const pool = filtered.length > 0 ? filtered : candidates;
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function selectRoleWeapon(context, profile, options) {
  const wanted = new Set(profile.weaponClasses || []);
  const candidates = context.allWeapons
    .filter((item) => wanted.has(item.weaponClass) && normalizeName(item.weaponClass) !== "ammo")
    .sort((a, b) => a.price - b.price);
  if (candidates.length === 0) return null;

  const cap = getBudgetBand(options).itemCap;
  const affordable = candidates.filter((item) => item.price <= cap);
  const pool = affordable.length > 0 ? affordable : candidates;
  const percentile = {
    scrape: 0,
    street: 0.25,
    professional: 0.5,
    elite: 0.75,
    corporate: 1,
  }[options?.budget] ?? 0.25;
  return pool[Math.min(pool.length - 1, Math.floor((pool.length - 1) * percentile))];
}

function findAmmoForWeapon(context, weapon) {
  const weaponClass = String(weapon?.weaponClass || "").toLowerCase();
  const ammoId = weaponClass.includes("shotgun")
    ? "weapon_shotgun_shells_box_12"
    : weaponClass.includes("very heavy handgun")
      ? "weapon_very_heavy_handgun_ammo_box_100"
      : weaponClass.includes("heavy handgun") || weaponClass.includes("heavy smg")
        ? "weapon_heavy_handgun_heavy_smg_ammo_box_100"
        : weaponClass.includes("medium handgun") || weaponClass.includes("medium smg")
          ? "weapon_medium_handgun_medium_smg_ammo_box_100"
          : "weapon_light_handgun_light_smg_ammo_box_100";
  return context.findById(ammoId);
}

function defaultModifierOption(group, budget) {
  if (!group) return null;
  const optionIds = {
    fashion_style: {
      scrape: "generic_chic", street: "urban_flash", professional: "businesswear",
      elite: "high_fashion", corporate: "high_fashion",
    },
    venue_quality: {
      scrape: "fair", street: "fair", professional: "good", elite: "excellent", corporate: "excellent",
    },
    vehicle_controls: {
      scrape: "standard_controls", street: "standard_controls", professional: "standard_controls",
      elite: "cybercontrols", corporate: "cybercontrols",
    },
    housing_location: {
      scrape: "combat_zone", street: "combat_zone", professional: "moderate_zone",
      elite: "corporate_zone", corporate: "executive_zone",
    },
  };
  const selectedId = optionIds[group.id]?.[budget];
  return group.options.find((option) => option.id === selectedId) || group.options[0] || null;
}

function priceBundleItem(item, options, quantity = 1, modifierOptionId = null) {
  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  const modifier = item.modifierGroup
    ? item.modifierGroup.options.find((option) => option.id === modifierOptionId)
      || defaultModifierOption(item.modifierGroup, options?.budget || "street")
    : null;
  const baseUnitPrice = Number(item.baseUnitPrice ?? item.price) || 0;
  const multiplier = modifier?.multiplier || 1;
  const unitPrice = Number((baseUnitPrice * multiplier).toFixed(2));

  return {
    ...item,
    baseUnitPrice,
    unitPrice,
    quantity: safeQuantity,
    price: Number((unitPrice * safeQuantity).toFixed(2)),
    selectedPriceModifier: modifier ? {
      groupId: item.modifierGroup.id,
      groupLabel: item.modifierGroup.label,
      optionId: modifier.id,
      label: modifier.label,
      multiplier: modifier.multiplier,
    } : null,
  };
}

function recalculateBundle(bundle) {
  bundle.subtotal = Number(bundle.items.reduce((sum, item) => sum + item.price, 0).toFixed(2));
  bundle.total = Number((bundle.subtotal * (1 - bundle.discountPct / 100)).toFixed(2));
  return bundle;
}

function finalizeBundleDraft(draft, rawItems, context, options, quantities = new Map()) {
  const coherent = enforceDependencies(uniqueItems(rawItems), context);
  const items = coherent.map((item) => priceBundleItem(
    item,
    options,
    quantities.get(normalizeItemId(item.id)) || 1,
  ));
  const band = getBudgetBand(options);
  const discountPct = Math.min(
    30,
    randomInt(draft.discountRange[0], draft.discountRange[1]) + band.discountBoost,
  );
  const bundle = {
    ...draft,
    discountPct,
    items,
    signature: bundleT(`bundle.budget_${options.budget}`, options.budget || "street"),
    signatureKey: `bundle.budget_${options.budget}`,
  };
  return recalculateBundle(bundle);
}

function buildRoleVariant(context, options, variant) {
  const profile = ROLE_PROFILES[options?.profile] || ROLE_PROFILES.solo;
  const band = getBudgetBand(options);
  const required = (profile.required || []).map((id) => context.findById(id)).filter(Boolean);
  const gear = selectBundleCandidates(context, profile.gear, variant.gearCount + band.extras, options);
  const chrome = selectBundleCandidates(context, profile.chrome, variant.chromeCount + band.extras, options);
  const field = selectBundleCandidates(context, profile.field, variant.fieldCount + band.extras, options);
  const selected = [...required, ...gear, ...chrome, ...field];
  const quantities = new Map();

  if (variant.weapon) {
    const weapon = selectRoleWeapon(context, profile, options);
    const ammo = findAmmoForWeapon(context, weapon);
    if (weapon) selected.push(weapon);
    if (ammo) {
      selected.push(ammo);
      quantities.set(normalizeItemId(ammo.id), band.ammoBoxes);
    }
  }

  const profileLabel = bundleT(profile.labelKey, profile.label);
  const variantLabel = bundleT(variant.titleKey, variant.title);
  return finalizeBundleDraft({
    family: "role",
    profileKey: profile.labelKey,
    profileLabel,
    titleKey: variant.titleKey,
    titleFallback: variant.title,
    title: `${profileLabel} // ${variantLabel}`,
    subtitle: bundleT(
      "bundle.role_subtitle",
      `${variantLabel} built for the ${profileLabel} role with gear, chrome and field support.`,
      { role: profileLabel, variant: variantLabel },
    ),
    perks: [
      bundleT("bundle.role_perk", "Role-focused selection"),
      bundleT("bundle.dependencies_perk", "Dependencies resolved automatically"),
    ],
    vibe: profile.vibe,
    variantId: variant.id,
    discountRange: variant.discountRange,
  }, selected, context, options, quantities);
}

function baseBundleInputs(context, options, variantId) {
  const band = getBudgetBand(options);
  const budget = options?.budget || "street";
  const foodId = {
    scrape: "kibble", street: "genericPrepak", professional: "goodPrepak",
    elite: "freshFood", corporate: "freshFood",
  }[budget];
  const homeId = {
    scrape: "coffin", street: "coffin", professional: "hotelRoom",
    elite: "apartment", corporate: "house",
  }[budget];
  const get = (id) => context.findById(id);
  const quantities = new Map();
  let ids = [];

  if (variantId === "survival") {
    ids = [homeId, foodId, "pants", "top", "footwear", "nylonCarryBag", "firstAidKit"];
    quantities.set(
      normalizeItemId(homeId),
      ["coffin", "hotelRoom"].includes(homeId)
        ? band.weeks * 7
        : Math.max(1, Math.ceil(band.weeks / 4)),
    );
    quantities.set(normalizeItemId(foodId), band.weeks);
  } else if (variantId === "month_one") {
    const permanentHome = budget === "corporate" ? "house" : "apartment";
    ids = [permanentHome, "utilities", foodId, "cellPhoneService", "futon", "lamp"];
    quantities.set(normalizeItemId(permanentHome), 1);
    quantities.set(normalizeItemId(foodId), 4);
  } else if (variantId === "road") {
    ids = ["nylonCarryBag", "sleepingBag", foodId, "firstAidKit", "flashtube", "rope", "pocketCommo"];
    quantities.set(normalizeItemId(foodId), band.weeks);
    if (["professional", "elite", "corporate"].includes(budget)) {
      ids.push(budget === "professional" ? "scooter" : "motorcycle");
    }
  } else {
    ids = ["pants", "top", "jacket", "footwear", "accessory", "mirrorshades"];
  }

  return {
    items: ids.map(get).filter(Boolean),
    quantities,
  };
}

function buildBaseBundle(context, options, spec) {
  const inputs = baseBundleInputs(context, options, spec.id);
  const title = bundleT(spec.titleKey, spec.title);
  return finalizeBundleDraft({
    family: "base",
    profileKey: "bundle.base_profile",
    profileLabel: bundleT("bundle.base_profile", "Base & Lifestyle"),
    titleKey: spec.titleKey,
    titleFallback: spec.title,
    title,
    subtitle: bundleT(spec.subtitleKey, spec.subtitle),
    perks: [bundleT("bundle.base_perk", "Housing, food and daily-life costs included")],
    vibe: "lifestyle",
    variantId: spec.id,
    discountRange: spec.discountRange,
  }, inputs.items, context, options, inputs.quantities);
}

function generateBundles(context, options = {}) {
  const normalizedOptions = {
    profile: ROLE_PROFILES[options.profile] ? options.profile : "solo",
    budget: BUDGET_BANDS[options.budget] ? options.budget : "street",
    lowHL: Boolean(options.lowHL),
  };
  const roleBundles = ROLE_BUNDLE_VARIANTS.map((variant) => buildRoleVariant(context, normalizedOptions, variant));
  const baseSpecs = [
    { id: "survival", titleKey: "bundle.base_survival", title: "Street Survival", subtitleKey: "bundle.base_survival_subtitle", subtitle: "Budget-scaled short-term housing, food, basic clothes and emergency carry gear.", discountRange: [5, 10] },
    { id: "month_one", titleKey: "bundle.base_month_one", title: "First Month", subtitleKey: "bundle.base_month_one_subtitle", subtitle: "A room, utilities, four weeks of food and basic household services.", discountRange: [7, 12] },
    { id: "road", titleKey: "bundle.base_road", title: "Road Kit", subtitleKey: "bundle.base_road_subtitle", subtitle: "Portable shelter, food, comms and travel essentials.", discountRange: [6, 11] },
    { id: "wardrobe", titleKey: "bundle.base_wardrobe", title: "Complete Wardrobe", subtitleKey: "bundle.base_wardrobe_subtitle", subtitle: "A full outfit with an official selectable fashion style.", discountRange: [8, 14] },
  ];
  const baseBundles = baseSpecs.map((spec) => buildBaseBundle(context, normalizedOptions, spec));
  return [...roleBundles, ...baseBundles];
}

function pickBundleItems(required, pool, extrasAmount) {
  const selected = [];
  const used = new Set();

  required.forEach((item) => {
    if (item && !used.has(item.id)) {
      selected.push(item);
      used.add(item.id);
    }
  });

  const shuffledPool = pool.slice().sort(() => Math.random() - 0.5);
  for (const item of shuffledPool) {
    if (selected.length >= required.length + extrasAmount) break;
    if (used.has(item.id)) continue;
    selected.push(item);
    used.add(item.id);
  }

  return selected;
}

function enforceDependencies(items, context) {
  const selected = [];
  const selectedIds = new Set();
  const selectedNames = new Set();

  function addItem(item) {
    if (!item) return false;
    const normalizedId = normalizeItemId(item.id);
    const normalizedName = normalizeName(item.name);
    if (
      (normalizedId && selectedIds.has(normalizedId))
      || (!normalizedId && selectedNames.has(normalizedName))
    ) {
      return false;
    }

    selected.push(item);
    if (normalizedId) selectedIds.add(normalizedId);
    if (normalizedName) selectedNames.add(normalizedName);
    return true;
  }

  function isSelected(id) {
    return selectedIds.has(normalizeItemId(id));
  }

  function providerCapacityFor(candidate, family) {
    const installation = candidate?.installation || {};
    const normalizedFamily = normalizeItemId(family);
    const capacities = [];

    if (
      installation.slotProvider
      && normalizeItemId(installation.slotFamily || installation.slotProvider) === normalizedFamily
    ) {
      const capacity = Number(installation.slotCapacity);
      capacities.push(Number.isFinite(capacity) ? capacity : Number.POSITIVE_INFINITY);
    }

    if (Array.isArray(installation.provides)) {
      installation.provides.forEach((provider) => {
        if (
          provider
          && normalizeItemId(provider.slotFamily) === normalizedFamily
        ) {
          const capacity = Number(provider.slotCapacity);
          capacities.push(Number.isFinite(capacity) ? capacity : Number.POSITIVE_INFINITY);
        }
      });
    }

    return capacities.length > 0 ? Math.max(...capacities) : -1;
  }

  function chooseCandidate(ids, consumerInstallation = {}) {
    const family = consumerInstallation.slotFamily;
    const usage = Number(consumerInstallation.slotUsage);
    const candidates = ids.map((id) => context.findById(id)).filter(Boolean);

    if (family && Number.isFinite(usage) && usage > 0) {
      const providers = candidates
        .map((candidate) => ({
          candidate,
          capacity: providerCapacityFor(candidate, family),
        }))
        .filter((entry) => entry.capacity >= usage)
        .sort((a, b) => {
          if (b.capacity !== a.capacity) return b.capacity - a.capacity;
          return a.candidate.price - b.candidate.price;
        });
      if (providers.length > 0) return providers[0].candidate;
    }

    return candidates.sort((a, b) => a.price - b.price)[0] || null;
  }

  function addProviderForSlotGap() {
    const usageByFamily = new Map();
    const capacityByFamily = new Map();
    const unboundedFamilies = new Set();
    const candidatesByFamily = new Map();

    selected.forEach((selectedItem) => {
      const rule = selectedItem.installation || {};
      const family = normalizeItemId(rule.slotFamily);
      const usage = Number(rule.slotUsage);
      if (family && Number.isFinite(usage) && usage > 0) {
        usageByFamily.set(family, (usageByFamily.get(family) || 0) + usage);

        const candidateIds = [
          ...listOfStrings(rule.requiresAny),
          ...(Array.isArray(rule.requiresAnyGroups)
            ? rule.requiresAnyGroups.flatMap(listOfStrings)
            : []),
        ];
        if (!candidatesByFamily.has(family)) candidatesByFamily.set(family, new Set());
        candidateIds.forEach((id) => candidatesByFamily.get(family).add(id));
      }

      const directFamily = normalizeItemId(rule.slotFamily || rule.slotProvider);
      if (rule.slotProvider && directFamily) {
        const capacity = Number(rule.slotCapacity);
        if (Number.isFinite(capacity)) {
          capacityByFamily.set(
            directFamily,
            (capacityByFamily.get(directFamily) || 0) + capacity,
          );
        } else {
          unboundedFamilies.add(directFamily);
        }
      }

      if (Array.isArray(rule.provides)) {
        rule.provides.forEach((provider) => {
          const providedFamily = normalizeItemId(provider?.slotFamily);
          if (!providedFamily) return;
          const capacity = Number(provider.slotCapacity);
          if (Number.isFinite(capacity)) {
            capacityByFamily.set(
              providedFamily,
              (capacityByFamily.get(providedFamily) || 0) + capacity,
            );
          } else {
            unboundedFamilies.add(providedFamily);
          }
        });
      }
    });

    for (const [family, used] of usageByFamily) {
      if (unboundedFamilies.has(family)) continue;
      const capacity = capacityByFamily.get(family) || 0;
      if (used <= capacity) continue;

      const candidate = [...(candidatesByFamily.get(family) || [])]
        .map((id) => context.findById(id))
        .filter((entry) => entry && !isSelected(entry.id))
        .map((entry) => ({
          entry,
          capacity: providerCapacityFor(entry, family),
        }))
        .filter((entry) => entry.capacity > 0)
        .sort((a, b) => {
          if (b.capacity !== a.capacity) return b.capacity - a.capacity;
          return a.entry.price - b.entry.price;
        })[0]?.entry;

      if (candidate && addItem(candidate)) return true;
    }

    return false;
  }

  items.forEach(addItem);

  let cursor = 0;
  let safety = 0;
  while (safety < 2000) {
    while (cursor < selected.length && safety < 2000) {
      const item = selected[cursor];
      const installation = item.installation || {};
      const requires = listOfStrings(installation.requires);

      requires.forEach((id) => {
        if (!isSelected(id)) addItem(context.findById(id));
      });

      const anyGroups = [];
      const requiresAny = listOfStrings(installation.requiresAny);
      if (requiresAny.length > 0) anyGroups.push(requiresAny);

      if (Array.isArray(installation.requiresAnyGroups)) {
        installation.requiresAnyGroups.forEach((group) => {
          const normalizedGroup = listOfStrings(group);
          if (normalizedGroup.length > 0) anyGroups.push(normalizedGroup);
        });
      }

      anyGroups.forEach((group) => {
        if (group.some(isSelected)) return;
        addItem(chooseCandidate(group, installation));
      });

      cursor += 1;
      safety += 1;
    }

    if (!addProviderForSlotGap()) break;
  }

  return selected;
}

function listOfStrings(value) {
  if (window.CyberUtils) return CyberUtils.stringList(value);
  return Array.isArray(value)
    ? value.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
}

function normalizeItemId(value) {
  if (window.CyberUtils) return CyberUtils.normalizeId(value);
  return String(value || "").trim().toLowerCase();
}

function renderBundles(container, bundles) {
  container.innerHTML = "";
  const fragment = document.createDocumentFragment();
  let activeFamily = null;

  bundles.forEach((bundle) => {
    if (bundle.family !== activeFamily) {
      activeFamily = bundle.family;
      const heading = document.createElement("h2");
      heading.className = "bundle-family-title";
      heading.textContent = activeFamily === "base"
        ? bundleT("bundle.family_base", "Base & Lifestyle Bundles")
        : bundleT("bundle.family_role", "Role Builds");
      fragment.appendChild(heading);
    }

    const card = document.createElement("article");
    card.className = "item bundle-card";

    const listItems = bundle.items
      .map(
        (item, itemIndex) => `
          <li>
            <div class="bundle-item-main">
              <strong>${Number(item.quantity) > 1 ? `${item.quantity}x ` : ""}${item.name}</strong>
              ${item.modifierGroup ? `
                <label class="bundle-modifier-label">
                  <span>${item.modifierGroup.label}</span>
                  <select data-bundle-modifier="${itemIndex}">
                    ${item.modifierGroup.options.map((option) => `
                      <option value="${option.id}" ${item.selectedPriceModifier?.optionId === option.id ? "selected" : ""}>
                        ${option.label} (${option.multiplier}x)
                      </option>
                    `).join("")}
                  </select>
                </label>
              ` : ""}
            </div>
            <small>${item.sourceCategoryLabel || item.sourceCategory} • <span data-bundle-item-price="${itemIndex}">${formatCurrency(item.price)}</span></small>
          </li>
        `,
      )
      .join("");

    card.innerHTML = `
      <div class="bundle-head">
        <h3>${bundle.title}</h3>
        <span class="bundle-discount">-${bundle.discountPct}%</span>
      </div>
      <p class="desc">${bundle.subtitle}</p>
      <div class="bundle-tags">
        <span class="bundle-tag">${bundle.vibe.toUpperCase()}</span>
        <span class="bundle-tag">${bundle.signature}</span>
        ${bundle.perks.map((perk) => `<span class="bundle-tag bundle-perk">${perk}</span>`).join("")}
      </div>
      <ul class="bundle-items">${listItems}</ul>
      <div class="bundle-summary">
        <div><span>${bundleT("bundle.subtotal", "Subtotal")}:</span> <strong data-bundle-subtotal>${formatCurrency(bundle.subtotal)}</strong></div>
        <div><span>${bundleT("bundle.total", "Total")}:</span> <strong data-bundle-total>${formatCurrency(bundle.total)}</strong></div>
      </div>
    `;

    const addBtn = document.createElement("button");
    addBtn.className = "btn-add";
    addBtn.textContent = bundleT("bundle.add", "Add Bundle to Cart");
    addBtn.onclick = () => addBundleToCart(bundle, addBtn);

    card.appendChild(addBtn);
    card.querySelectorAll("select[data-bundle-modifier]").forEach((select) => {
      select.addEventListener("change", () => {
        const itemIndex = Number(select.dataset.bundleModifier);
        const currentItem = bundle.items[itemIndex];
        bundle.items[itemIndex] = priceBundleItem(currentItem, {}, currentItem.quantity, select.value);
        recalculateBundle(bundle);
        const itemPrice = card.querySelector(`[data-bundle-item-price="${itemIndex}"]`);
        const subtotal = card.querySelector("[data-bundle-subtotal]");
        const total = card.querySelector("[data-bundle-total]");
        if (itemPrice) itemPrice.textContent = formatCurrency(bundle.items[itemIndex].price);
        if (subtotal) subtotal.textContent = formatCurrency(bundle.subtotal);
        if (total) total.textContent = formatCurrency(bundle.total);
      });
    });
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

function addBundleToCart(bundle, button) {
  const current = getCart();
  const bundleId = `bundle_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  const entries = bundle.items.map((item) => {
    const rolled = window.CyberUtils
      ? CyberUtils.rollHL(item.hlRaw)
      : { value: parseNumeric(item.hlRaw), raw: String(item.hlRaw || "0"), log: "HL_FALLBACK" };

    return {
      id: item.id,
      legacyIds: item.legacyIds,
      name: `${item.name}`,
      category: `${item.sourceCategory} [${bundle.title}]`,
      categoryLabel: `${item.sourceCategoryLabel || item.sourceCategory} [${bundle.title}]`,
      sourceCatalog: item.sourceType,
      locale: window.I18n?.getLocale?.() || "en-US",
      price: Number(item.price.toFixed(2)),
      basePrice: item.baseUnitPrice ?? item.price,
      unitPrice: item.unitPrice ?? item.price,
      quantity: item.quantity || 1,
      hl: rolled.value,
      hlRaw: rolled.raw,
      hlLog: rolled.log,
      tags: item.tags,
      maxPurchases: item.maxPurchases,
      alternativeAcquisition: item.alternativeAcquisition,
      attributeBonuses: item.attributeBonuses,
      skillBonuses: item.skillBonuses,
      attributeSet: item.attributeSet,
      priceModifiers: item.priceModifiers,
      modifierGroup: item.modifierGroup,
      selectedPriceModifier: item.selectedPriceModifier,
      installation: item.installation,
      bundleId,
      bundleTitle: bundle.title,
      bundleTitleKey: bundle.titleKey,
      bundleTitleFallback: bundle.titleFallback || bundle.title,
      bundleProfileKey: bundle.profileKey,
      bundleProfileFallback: bundle.profileLabel || "",
      bundleSignatureKey: bundle.signatureKey,
      bundleSignatureFallback: bundle.signature || "",
      bundleDiscountPct: bundle.discountPct,
    };
  });

  const updated = [...current, ...entries];
  localStorage.setItem(BUNDLE_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("stash-updated"));

  const originalText = button.textContent;
  button.textContent = bundleT("bundle.added", "Bundle Added");
  button.disabled = true;

  if (typeof Modal !== "undefined") {
    Modal.alert(
      bundleT("bundle.uploaded", "BUNDLE UPLOADED"),
      bundleT("bundle.uploaded_message", `${bundle.title} added to stash with ${bundle.items.length} items.`, {
        title: bundle.title,
        count: bundle.items.length,
      }),
    );
  }

  setTimeout(() => {
    button.textContent = originalText;
    button.disabled = false;
  }, 1200);
}

function getCart() {
  if (window.CyberUtils) return CyberUtils.safeGetArray(BUNDLE_STORAGE_KEY);
  try {
    return JSON.parse(localStorage.getItem(BUNDLE_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function parseNumeric(value) {
  if (window.CyberUtils) return CyberUtils.parseNumeric(value);
  if (typeof value === "number") return value;

  const text = String(value || "");
  const matches = text.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return 0;

  const numbers = matches.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
  if (numbers.length === 0) return 0;

  return numbers.reduce((acc, n) => acc + n, 0) / numbers.length;
}

function formatCurrency(value) {
  if (window.CyberUtils) return CyberUtils.formatCurrency(value);
  return Number(value || 0).toLocaleString(window.I18n?.getLocale?.() || "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " eb";
}

function normalizeName(value) {
  if (window.CyberUtils) return CyberUtils.normalizeName(value);
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCase(text) {
  return String(text || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BUDGET_BANDS,
    ROLE_PROFILES,
    ROLE_BUNDLE_VARIANTS,
    init,
    fetchJson,
    normalizeCatalog,
    normalizeBundleModifierGroup,
    normalizeWeaponCatalog,
    normalizeAmmoCatalog,
    createBundleContext,
    enforceDependencies,
    generateBundles,
    generateLegacyBundles,
    withStyleFlavor,
    applyOptionFilters,
    applyStoreSignature,
    getBudgetBand,
    uniqueItems,
    selectBundleCandidates,
    selectRoleWeapon,
    findAmmoForWeapon,
    defaultModifierOption,
    priceBundleItem,
    recalculateBundle,
    finalizeBundleDraft,
    buildRoleVariant,
    baseBundleInputs,
    buildBaseBundle,
    pickBundleItems,
    renderBundles,
    addBundleToCart,
    getCart,
    parseNumeric,
    formatCurrency,
    normalizeName,
    toTitleCase,
    randomInt,
  };
}
