/**
 * BYTE & BLADES - BUNDLE ENGINE
 * Builds coherent random bundles with dependency validation.
 */

const BUNDLE_STORAGE_KEY = "cyber_cart";
const AUTO_REFRESH_MIN_SECONDS = 45;
const AUTO_REFRESH_MAX_SECONDS = 140;

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
    style: document.getElementById("kit-style"),
    budget: document.getElementById("kit-budget"),
    lowHL: document.getElementById("kit-low-hl"),
  };

  if (!ui.list) return;

  init(ui);
});

async function init(ui) {
  try {
    const [cyberwaresRaw, equipmentRaw] = await Promise.all([
      fetchJson(bundleDataPath("../data/cyberwares.json")),
      fetchJson(bundleDataPath("../data/equipment.json")),
    ]);

    const dataStore = {
      cyberwares: normalizeCatalog(cyberwaresRaw.data || cyberwaresRaw, "cyberware"),
      equipment: normalizeCatalog(equipmentRaw.data || equipmentRaw, "equipment"),
      weapons: {},
    };

    const context = createBundleContext(dataStore);
    let refreshTimeoutId = null;
    let countdownIntervalId = null;

    const currentOptions = () => ({
      style: ui.style?.value || "balanced",
      budget: ui.budget?.value || "street",
      lowHL: !!ui.lowHL?.checked,
    });

    const rerender = () => {
      const bundles = generateBundles(context, currentOptions());
      renderBundles(ui.list, bundles);
    };

    ui.style?.addEventListener("change", rerender);
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
        installation: item.installation && typeof item.installation === "object"
          ? item.installation
          : null,
      });
    });

    if (items.length > 0) categories[categoryName] = items;
  });

  return categories;
}

function createBundleContext(dataStore) {
  const cyberByCategory = dataStore.cyberwares;
  const equipmentByCategory = dataStore.equipment;
  const weaponsByCategory = dataStore.weapons;

  const allCyber = Object.values(cyberByCategory).flat();
  const allEquipment = Object.values(equipmentByCategory).flat();
  const allWeapons = Object.values(weaponsByCategory).flat();

  const byName = new Map();
  const byId = new Map();
  [...allCyber, ...allEquipment, ...allWeapons].forEach((item) => {
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

function generateBundles(context, options) {
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
    if (low.length >= 3) filtered = low;
  }

  const budgetCaps = {
    street: 900,
    pro: 3200,
    opulence: Infinity,
  };
  const budgetCap = budgetCaps[options?.budget || "street"] ?? Infinity;

  const budgeted = filtered.filter((item) => item.price <= budgetCap);
  if (budgeted.length >= 3) filtered = budgeted;

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

  bundles.forEach((bundle) => {
    const card = document.createElement("article");
    card.className = "item bundle-card";

    const listItems = bundle.items
      .map(
        (item) => `
          <li>
            <strong>${item.name}</strong>
            <small>${item.sourceCategoryLabel || item.sourceCategory} • ${formatCurrency(item.price)}</small>
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
        <div><span>${bundleT("bundle.subtotal", "Subtotal")}:</span> <strong>${formatCurrency(bundle.subtotal)}</strong></div>
        <div><span>${bundleT("bundle.total", "Total")}:</span> <strong>${formatCurrency(bundle.total)}</strong></div>
      </div>
    `;

    const addBtn = document.createElement("button");
    addBtn.className = "btn-add";
    addBtn.textContent = bundleT("bundle.add", "Add Bundle to Cart");
    addBtn.onclick = () => addBundleToCart(bundle, addBtn);

    card.appendChild(addBtn);
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
      installation: item.installation,
      bundleId,
      bundleTitle: bundle.title,
      bundleTitleKey: bundle.titleKey,
      bundleSignatureKey: bundle.signatureKey,
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
    init,
    fetchJson,
    normalizeCatalog,
    createBundleContext,
    enforceDependencies,
    generateBundles,
    withStyleFlavor,
    applyOptionFilters,
    applyStoreSignature,
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
