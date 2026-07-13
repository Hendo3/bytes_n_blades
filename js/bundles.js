/**
 * BYTE & BLADES - BUNDLE ENGINE
 * Builds coherent random bundles with dependency validation.
 */

const BUNDLE_STORAGE_KEY = "cyber_cart";
const AUTO_REFRESH_MIN_SECONDS = 45;
const AUTO_REFRESH_MAX_SECONDS = 140;

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
      fetchJson("../data/cyberwares.json"),
      fetchJson("../data/equipment.json"),
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
      ui.timer.innerHTML = `NEXT DATA DRIP IN <span style="color:var(--primary-color)">${seconds}s</span>`;
    }
  } catch (error) {
    ui.list.innerHTML = `
      <article class="item">
        <h3>[!] BUNDLE ENGINE OFFLINE</h3>
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
        id: `${sourceType}:${categoryName}:${id}`,
        key: id,
        sourceType,
        sourceCategory: categoryName,
        name: String(name).trim(),
        description: item.description || item.note || "No specs available.",
        price,
        hlRaw: item.HL || item.hl || item.humanity || "0",
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
  [...allCyber, ...allEquipment, ...allWeapons].forEach((item) => {
    const key = normalizeName(item.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(item);
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
    const coherentItems = enforceDependencies(draft.items, context);

    const tunedItems = applyOptionFilters(coherentItems, options);
    const signed = applyStoreSignature(draft, tunedItems, options);
    const subtotal = signed.items.reduce((sum, item) => sum + item.price, 0);
    const discountPct = Math.min(
      30,
      randomInt(draft.discountRange[0], draft.discountRange[1]) + signed.discountBoost,
    );
    const total = subtotal * (1 - discountPct / 100);

    return {
      title: signed.title,
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
  const required = ["Neuralware Processor", "Chipware Socket"]
    .map((name) => context.findByName(name))
    .filter(Boolean);

  const chipPool = withStyleFlavor(context, [
    ...context.findInCategory("cyber", "Chipware"),
    ...context.findInCategory("cyber", "Behaviour Chips"),
  ], options);

  const selected = pickBundleItems(required, chipPool, randomInt(3, 4));

  return {
    title: "Virgin Bundle",
    subtitle: "First neural stack with socket + starter chips.",
    perks: ["Quick-learning chip set", "Dependency-safe install"],
    vibe: "balanced",
    items: selected,
    discountRange: [10, 16],
  };
}

function buildNetrunnerBundle(context, options) {
  const required = [
    "Neuralware Processor",
    "Cybermodem Link",
    "Interface Plugs",
    "DataTerm Link",
  ]
    .map((name) => context.findByName(name))
    .filter(Boolean);

  const supportPool = withStyleFlavor(context, [
    ...context.findInCategory("equipment", "dataSystems"),
    ...context.findInCategory("equipment", "tools"),
  ], options).filter((item) =>
    ["laptop", "interface", "keyboard", "tech", "modem"].some((token) =>
      normalizeName(item.name).includes(token),
    ),
  );

  const selected = pickBundleItems(required, supportPool, 3);

  return {
    title: "Netrunner Alley Pack",
    subtitle: "Direct-link setup with deck support hardware.",
    perks: ["Datajack ready", "Signal tooling included"],
    vibe: "netrunner",
    items: selected,
    discountRange: [8, 14],
  };
}

function buildSoloBundle(context, options) {
  const required = [
    "Neuralware Processor",
    "Interface Plugs",
    "Smartgun Link",
  ]
    .map((name) => context.findByName(name))
    .filter(Boolean);

  const cyberSupport = withStyleFlavor(context, [
    ...context.findInCategory("cyber", "Cyberoptics Options"),
    ...context.findInCategory("cyber", "Bodyweapons"),
    ...context.findInCategory("equipment", "security"),
  ], options);

  const selected = pickBundleItems(required, cyberSupport, 4);

  return {
    title: "Solo Smartgun Pack",
    subtitle: "Combat link package tuned for direct-fire builds.",
    perks: ["Combat-first tuning", "Urban suppression gear"],
    vibe: "aggressive",
    items: selected,
    discountRange: [12, 20],
  };
}

function buildReconBundle(context, options) {
  const required = ["CYBEROPTIC", "Image Enhancement", "Amplified Hearing"]
    .map((name) => context.findByName(name))
    .filter(Boolean);

  const reconSupport = withStyleFlavor(context, [
    ...context.findInCategory("cyber", "Cyberaudio Options"),
    ...context.findInCategory("equipment", "surveillance"),
  ], options).filter((item) =>
    ["scope", "hearing", "binocular", "ir", "scanner", "enhancement"].some((token) =>
      normalizeName(item.name).includes(token),
    ),
  );

  const selected = pickBundleItems(required, reconSupport, 3);

  return {
    title: "Ghost Recon Bundle",
    subtitle: "Sensory stack for tracking, spotting and tactical intel.",
    perks: ["Stealth optics lane", "Recon-grade sensory fusion"],
    vibe: "stealth",
    items: selected,
    discountRange: [9, 15],
  };
}

function buildStreetMedicBundle(context, options) {
  const required = ["Biomonitor", "Pain Editor"]
    .map((name) => context.findByName(name))
    .filter(Boolean);

  const supportPool = withStyleFlavor(context, [
    ...context.findInCategory("equipment", "medical"),
    ...context.findInCategory("equipment", "tools"),
    ...context.findInCategory("cyber", "Biotech"),
  ], options);

  const selected = pickBundleItems(required, supportPool, 3);

  return {
    title: "Street Medic Kit",
    subtitle: "Patch-up stack for night runs and bad exits.",
    perks: ["Emergency triage ready", "Surgery support loadout"],
    vibe: "balanced",
    items: selected,
    discountRange: [7, 13],
  };
}

function buildChromeStarBundle(context, options) {
  const required = ["Neuralware Processor"]
    .map((name) => context.findByName(name))
    .filter(Boolean);

  const flairPool = withStyleFlavor(context, [
    ...context.findInCategory("cyber", "Fashionware"),
    ...context.findInCategory("cyber", "Cyberware Customisation"),
    ...context.findInCategory("equipment", "fashion"),
    ...context.findInCategory("equipment", "communications"),
  ], options);

  const selected = pickBundleItems(required, flairPool, 4);

  return {
    title: "Chrome Star Kit",
    subtitle: "Style-forward chrome for flex, social ops and club heat.",
    perks: ["High-presence fashionware", "Persona boost package"],
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
      label: "Combat Calibrated",
      perks: ["Pressure-first tuning"],
      discountBoost: 1,
    },
    stealth: {
      label: "Low-Profile Calibrated",
      perks: ["Silent utility bias"],
      discountBoost: 1,
    },
    netrunner: {
      label: "Netflow Calibrated",
      perks: ["Signal-chain compatibility"],
      discountBoost: 1,
    },
    balanced: {
      label: "House Balanced",
      perks: ["Cross-role coherence check"],
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
  const selectedNames = new Set();

  items.forEach((item) => {
    if (!selectedNames.has(normalizeName(item.name))) {
      selected.push(item);
      selectedNames.add(normalizeName(item.name));
    }
  });

  const rules = [
    {
      match: (item) => ["Chipware", "Behaviour Chips"].includes(item.sourceCategory),
      requires: ["Neuralware Processor", "Chipware Socket"],
    },
    {
      match: (item) => normalizeName(item.name).includes("smartgun link"),
      requires: ["Interface Plugs", "Neuralware Processor"],
    },
    {
      match: (item) => normalizeName(item.name).includes("cybermodem link"),
      requires: ["Interface Plugs", "Neuralware Processor"],
    },
  ];

  for (const rule of rules) {
    const triggered = selected.some((item) => rule.match(item));
    if (!triggered) continue;

    for (const dependencyName of rule.requires) {
      if (selectedNames.has(normalizeName(dependencyName))) continue;

      const dependencyItem = context.findByName(dependencyName);
      if (dependencyItem) {
        selected.push(dependencyItem);
        selectedNames.add(normalizeName(dependencyName));
      }
    }
  }

  return selected;
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
            <small>${item.sourceCategory} • ${formatCurrency(item.price)}</small>
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
        <div><span>Subtotal:</span> <strong>${formatCurrency(bundle.subtotal)}</strong></div>
        <div><span>Total:</span> <strong>${formatCurrency(bundle.total)}</strong></div>
      </div>
    `;

    const addBtn = document.createElement("button");
    addBtn.className = "btn-add";
    addBtn.textContent = "Add Bundle to Cart";
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
      name: `${item.name}`,
      category: `${item.sourceCategory} [${bundle.title}]`,
      price: Number(item.price.toFixed(2)),
      hl: rolled.value,
      hlRaw: rolled.raw,
      hlLog: rolled.log,
      bundleId,
      bundleTitle: bundle.title,
      bundleDiscountPct: bundle.discountPct,
    };
  });

  const updated = [...current, ...entries];
  localStorage.setItem(BUNDLE_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("stash-updated"));

  const originalText = button.textContent;
  button.textContent = "Bundle Added";
  button.disabled = true;

  if (typeof Modal !== "undefined") {
    Modal.alert(
      "BUNDLE UPLOADED",
      `${bundle.title} added to stash with ${bundle.items.length} items.`,
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
  return ((value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" }).replace("$", "") + " eb");
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
