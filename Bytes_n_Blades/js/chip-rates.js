function chipT(key, fallback, params = {}) {
  if (typeof window !== "undefined" && window.I18n) return window.I18n.t(key, params, fallback);
  return String(fallback).replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name) => params[name] ?? `{${name}}`);
}

const CHIP_RATES_PATH = typeof window !== "undefined" && window.I18n
  ? window.I18n.dataPath("../data/chip-rates.json")
  : "../data/chip-rates.json";
const STORAGE_KEY = "cyber_cart";
let installationCatalogPromise = null;

document.addEventListener("DOMContentLoaded", async () => {
  const pageType = String(document.body?.dataset?.chipType || "").toLowerCase();
  const titleEl = document.getElementById("chip-title");
  const subtitleEl = document.getElementById("chip-subtitle");
  const container = document.getElementById("chip-rate-groups");

  if (!pageType || !container) return;

  try {
    const payload = await fetch(CHIP_RATES_PATH, { cache: "no-store" });
    if (!payload.ok) throw new Error(`HTTP ${payload.status}`);

    const json = await payload.json();
    const spec = json?.data?.[pageType];
    if (!spec) throw new Error(chipT("chip.unavailable", "Rate table unavailable for this type."));

    if (titleEl) titleEl.textContent = chipT("chip.title", `${spec.label} Skill Chips`, { label: spec.label });
    if (subtitleEl) subtitleEl.textContent = chipT("chip.subtitle", `Official street table loaded for ${spec.label}.`, { label: spec.label });

    renderGroups(container, spec.sections || [], pageType);
  } catch (error) {
    container.innerHTML = `<article class="item"><h3>${chipT("chip.feed_offline", "[!] RATE FEED OFFLINE")}</h3><p class="desc">${escapeHtml(error.message)}</p></article>`;
  }
});

function renderGroups(container, sections, pageType) {
  if (!Array.isArray(sections) || sections.length === 0) {
    container.innerHTML = `<article class="item"><h3>${chipT("chip.no_rates", "No rates found")}</h3><p class="desc">${chipT("chip.awaiting", "Awaiting source data.")}</p></article>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  sections.forEach((section) => {
    const card = document.createElement("article");
    card.className = "item chip-rate-card";

    const rows = (section.items || [])
      .map((entry) => {
        const rawValue = entry.pricePerLevel;
        const value = rawValue === null || rawValue === undefined || rawValue === ""
          ? Number.NaN
          : Number(rawValue);
        const levelPrices = Array.isArray(entry.levelPrices)
          ? entry.levelPrices.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0)
          : null;
        const hasLevelPrices = Array.isArray(levelPrices) && levelPrices.length >= 3;
        const priceText = hasLevelPrices
          ? `L1 ${levelPrices[0]} ed / L2 ${levelPrices[1]} ed / L3 ${levelPrices[2]} ed`
          : Number.isFinite(value)
            ? `${value} ed`
            : chipT("chip.varies", "Varies");
        const note = entry.note ? `<small>${escapeHtml(entry.note)}</small>` : "";
        const skillSlug = slugify(entry.id || entry.skill);
        const sectionSlug = slugify(section.id || section.label || "section");

        const controls = hasLevelPrices || Number.isFinite(value)
          ? `
              <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-top:6px;">
                <select data-role="chip-level" data-rate="${Number.isFinite(value) ? value : 0}" data-level-prices="${hasLevelPrices ? levelPrices.join(",") : ""}" data-page-type="${pageType}" data-section="${sectionSlug}" data-skill="${escapeHtml(entry.skill)}" style="background:rgba(0,0,0,.55); color:var(--primary-color); border:1px solid rgba(0,255,213,.45); padding:2px 4px; font-family:var(--font-stack); font-size:.72rem;">
                  <option value="1">L1</option>
                  <option value="2">L2</option>
                  <option value="3">L3</option>
                </select>
                <button type="button" class="btn-secondary" data-role="chip-add" data-rate="${Number.isFinite(value) ? value : 0}" data-level-prices="${hasLevelPrices ? levelPrices.join(",") : ""}" data-page-type="${pageType}" data-section="${sectionSlug}" data-skill-id="${escapeHtml(entry.id || skillSlug)}" data-skill="${escapeHtml(entry.skill)}" style="padding:4px 8px; font-size:.65rem;">${chipT("chip.add", "ADD")}</button>
                <button type="button" class="btn-secondary btn-install" data-role="chip-install" data-rate="${Number.isFinite(value) ? value : 0}" data-level-prices="${hasLevelPrices ? levelPrices.join(",") : ""}" data-page-type="${pageType}" data-section="${sectionSlug}" data-skill-id="${escapeHtml(entry.id || skillSlug)}" data-skill="${escapeHtml(entry.skill)}" style="padding:4px 8px; font-size:.65rem;">${chipT("chip.install", "INSTALL")}</button>
              </div>
            `
          : `<small style="display:block; margin-top:6px; color:#9aa;">${chipT("chip.ref_decision", "Set by ref decision")}</small>`;

        return `
          <li>
            <span>${escapeHtml(entry.skill)}</span>
            <span>${priceText}${note ? `<br>${note}` : ""}${controls}</span>
          </li>
        `;
      })
      .join("");

    card.innerHTML = `
      <h3>${escapeHtml(section.label)}</h3>
      <ul class="generator-content-list forge-scroll">${rows}</ul>
    `;

    fragment.appendChild(card);
  });

  container.replaceChildren(fragment);

  container.querySelectorAll("button[data-role='chip-add']").forEach((button) => {
    button.addEventListener("click", () => handleAddChip(button));
  });
  container.querySelectorAll("button[data-role='chip-install']").forEach((button) => {
    button.addEventListener("click", () => handleInstallChip(button));
  });
}

function handleAddChip(buttonEl) {
  const item = buildChipItem(buttonEl);
  addToCart(item);
  showButtonResult(buttonEl, chipT("chip.added", "ADDED"), 900);
}

function buildChipItem(buttonEl) {
  const rate = Number(buttonEl.dataset.rate || 0);
  const levelPrices = String(buttonEl.dataset.levelPrices || "")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v >= 0);
  const pageType = String(buttonEl.dataset.pageType || "chip").toLowerCase();
  const section = String(buttonEl.dataset.section || "base");
  const skillId = String(buttonEl.dataset.skillId || slugify(buttonEl.dataset.skill || "unknown_skill"));
  const skill = String(buttonEl.dataset.skill || "Unknown Skill");
  const levelSelect = buttonEl.parentElement?.querySelector("select[data-role='chip-level']");
  const level = Number(levelSelect?.value || 1);

  const finalPrice = levelPrices.length >= 3
    ? Math.max(0, levelPrices[Math.max(0, Math.min(2, level - 1))])
    : Math.max(0, rate * level);
  const tags = ["chipware", `${pageType}_chip`];
  if (pageType === "visual_recognition") tags.push("visual_recognition_chip");
  const displayType = window.I18n?.isPtBr?.() && pageType === "aptr"
    ? "PART"
    : pageType.toUpperCase();

  return {
    id: `${pageType}_${section}_${skillId}_lvl_${level}`,
    name: `${displayType} Chip: ${skill} +${level}`,
    category: window.I18n?.isPtBr?.() ? "Chipware" : "Chipware",
    categoryLabel: "Chipware",
    price: finalPrice,
    hl: 0,
    hlOriginal: "0",
    hlRaw: "0",
    tags,
    installation: {
      requires: ["chipware_socket", "neuralware_processor"],
      slotFamily: "chipware",
      slotUsage: 1,
    },
    skillBonuses: [
      {
        skill,
        value: level,
        mode: "flat",
      },
    ],
    note: levelPrices.length >= 3
      ? chipT("chip.level_table", `Level table ${levelPrices.join("/")} ed | selected L${level}`, { prices: levelPrices.join("/"), level })
      : chipT("chip.rate_note", `Rate ${rate}ed × level ${level}`, { rate, level }),
    localization: {
      catalog: "chip-rates",
      pageType,
      sectionId: section,
      skillId,
      level,
    },
    locale: window.I18n?.getLocale?.() || "en-US",
    sourceCatalog: "chip-rates",
  };
}

async function handleInstallChip(buttonEl) {
  const original = buttonEl.textContent;
  try {
    if (!window.CyberUtils) throw new Error("Installation resolver unavailable");
    const item = buildChipItem(buttonEl);
    const catalogItems = await loadInstallationCatalog();
    const plan = CyberUtils.resolveInstallationPlan(item, CyberUtils.safeGetArray(STORAGE_KEY), catalogItems);
    if (!plan.ok) throw new Error(plan.unresolved.join(", "));

    const entries = plan.items.map((plannedItem) => CyberUtils.createCartEntry(plannedItem, {
      autoAdded: plannedItem !== item,
      autoInstalledFor: item.id,
    }));
    CyberUtils.appendCartItems(entries, STORAGE_KEY);
    const totalHL = entries.reduce((total, entry) => total + (Number(entry.hl) || 0), 0);
    showButtonResult(buttonEl, chipT("chip.installed", `INSTALLED +${plan.dependencies.length} REQ ${totalHL > 0 ? `[HL -${totalHL}]` : ""}`, {
      count: plan.dependencies.length,
      hl: totalHL > 0 ? `[${window.I18n?.isPtBr?.() ? "PH" : "HL"} -${totalHL}]` : "",
    }), 1200);
  } catch (error) {
    buttonEl.title = error.message;
    showButtonResult(buttonEl, chipT("chip.install_failed", "INSTALL BLOCKED"), 1200, original);
  }
}

function showButtonResult(buttonEl, message, delay, originalText = buttonEl.textContent) {
  buttonEl.textContent = message;
  buttonEl.disabled = true;
  setTimeout(() => {
    buttonEl.textContent = originalText;
    buttonEl.disabled = false;
  }, delay);
}

function loadInstallationCatalog() {
  if (installationCatalogPromise) return installationCatalogPromise;
  if (!window.CyberUtils) return Promise.reject(new Error("Installation resolver unavailable"));

  installationCatalogPromise = Promise.all([
    fetch(chipDataPath("../data/cyberwares.json"), { cache: "no-store" }),
    fetch(chipDataPath("../data/equipment.json"), { cache: "no-store" }),
  ]).then(async ([cyberwareResponse, equipmentResponse]) => {
    if (!cyberwareResponse.ok || !equipmentResponse.ok) throw new Error("Installation catalogs unavailable");
    const [cyberware, equipment] = await Promise.all([
      cyberwareResponse.json(),
      equipmentResponse.json(),
    ]);
    return [
      ...CyberUtils.flattenCatalog(cyberware, "cyberwares"),
      ...CyberUtils.flattenCatalog(equipment, "accessories"),
    ];
  }).catch((error) => {
    installationCatalogPromise = null;
    throw error;
  });

  return installationCatalogPromise;
}

function chipDataPath(path) {
  return typeof window !== "undefined" && window.I18n ? window.I18n.dataPath(path) : path;
}

function addToCart(item) {
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(cart)) cart = [];
  } catch {
    cart = [];
  }

  item.uid = Date.now() + Math.random().toString(16).slice(2);
  cart.push(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("stash-updated"));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    renderGroups,
    handleAddChip,
    handleInstallChip,
    buildChipItem,
    loadInstallationCatalog,
    showButtonResult,
    addToCart,
    escapeHtml,
    slugify,
  };
}
