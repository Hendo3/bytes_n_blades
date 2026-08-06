function drugT(key, fallback, params = {}) {
  if (typeof window !== "undefined" && window.I18n) return window.I18n.t(key, params, fallback);
  return String(fallback).replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name) => params[name] ?? `{${name}}`);
}

const DRUGS_DATA_PATH = typeof window !== "undefined" && window.I18n
  ? window.I18n.dataPath("../data/drugs.json")
  : "../data/drugs.json";
const CART_STORAGE_KEY = "cyber_cart";

document.addEventListener("DOMContentLoaded", async () => {
  const ui = {
    form: document.getElementById("drug-generator-form"),
    name: document.getElementById("dg-name"),
    type: document.getElementById("dg-type"),
    strength: document.getElementById("dg-strength"),
    duration: document.getElementById("dg-duration"),
    effects: document.getElementById("dg-effects"),
    risks: document.getElementById("dg-risks"),
    generate: document.getElementById("dg-generate"),
    random: document.getElementById("dg-random"),
    result: document.getElementById("dg-result"),
    sheet: document.getElementById("dg-sheet"),
    addCart: document.getElementById("dg-add-cart"),
  };

  if (!ui.form) return;

  try {
    const payload = await fetchDrugsData();
    const options = payload?.data?.generatorOptions;
    if (!options) throw new Error(drugT("drug.generator_missing", "Generator options not found."));

    hydrateForm(ui, options);
    bindNamePlaceholder(ui, options);
    refreshNamePlaceholder(ui, options);

    ui.generate.addEventListener("click", () => {
      const build = generateDrug(ui, options);
      renderResult(ui, build);
    });

    ui.random.addEventListener("click", () => {
      randomizeSelections(ui, options);
      refreshNamePlaceholder(ui, options);
      const build = generateDrug(ui, options);
      renderResult(ui, build);
    });

    ui.addCart.addEventListener("click", () => {
      const build = ui.addCart.dataset.build
        ? JSON.parse(ui.addCart.dataset.build)
        : generateDrug(ui, options);
      addBuildToCart(build);
    });

    const firstBuild = generateDrug(ui, options);
    renderResult(ui, firstBuild);
  } catch (error) {
    if (ui.result) {
      ui.result.innerHTML = `<h3>${drugT("drug.forge_offline", "[!] FORGE OFFLINE")}</h3><p class="desc">${error.message}</p>`;
    }
  }
});

async function fetchDrugsData() {
  const response = await fetch(DRUGS_DATA_PATH, { cache: "no-store" });
  if (!response.ok) throw new Error(drugT("drug.load_error", `Failed to load drugs data: HTTP ${response.status}`, { status: response.status }));
  return response.json();
}

function hydrateForm(ui, options) {
  fillSelect(
    ui.type,
    Object.entries(options.types || {}).map(([id, entry]) => ({
      value: id,
      label: entry.label || id,
    })),
  );

  fillSelect(
    ui.strength,
    (options.strengthOptions || []).map((entry) => ({
      value: entry.value,
      label: drugT("drug.strength_option", `STR ${entry.value} (mod ${entry.difficultyMod})`, {
        value: entry.value,
        mod: entry.difficultyMod,
      }),
    })),
  );

  fillSelect(
    ui.duration,
    (options.durationOptions || []).map((entry, index) => ({
      value: String(index),
      label: `${entry.value} (x${entry.multiplier || 1})`,
    })),
  );

  ui.effects.innerHTML = renderChecklist(options.effectOptions || [], "fx");
  ui.risks.innerHTML = renderChecklist(options.riskOptions || [], "risk");
}

function fillSelect(selectEl, entries) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  entries.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.value;
    option.textContent = entry.label;
    selectEl.appendChild(option);
  });
}

function renderChecklist(entries, prefix) {
  return entries
    .map((entry, index) => {
      const id = `${prefix}-${index}`;
      const mod = Number(entry.difficultyMod || 0);
      const modText = mod >= 0 ? `+${mod}` : `${mod}`;
      return `
        <label class="generator-checkitem" for="${id}">
          <input id="${id}" type="checkbox" data-key="${entry.id}" data-mod="${mod}" />
          <span>${entry.label}</span>
          <small>${drugT("drug.diff", "DIFF")} ${modText}</small>
        </label>
      `;
    })
    .join("");
}

function selectedChecklist(containerEl) {
  if (!containerEl) return [];
  return Array.from(containerEl.querySelectorAll("input[type='checkbox']:checked")).map((el) => ({
    id: el.dataset.key,
    difficultyMod: Number(el.dataset.mod || 0),
    label: el.parentElement?.querySelector("span")?.textContent || el.dataset.key,
  }));
}

function generateDrug(ui, options) {
  const selectedType = ui.type.value;
  const typeEntry = options.types?.[selectedType] || { label: selectedType };

  const strengthEntry = (options.strengthOptions || []).find((entry) => entry.value === ui.strength.value)
    || (options.strengthOptions || [])[0]
    || { value: "1", difficultyMod: 1 };

  const durationIndex = Number(ui.duration.value || 0);
  const durationEntry = (options.durationOptions || [])[durationIndex]
    || (options.durationOptions || [])[0]
    || { value: "1D10+1 turns", multiplier: 1 };

  const effects = selectedChecklist(ui.effects);
  const risks = selectedChecklist(ui.risks);

  const strengthScore = Number(strengthEntry.value || 1);
  const effectsScore = effects.reduce((sum, entry) => sum + Number(entry.difficultyMod || 0), 0);
  const risksScore = risks.reduce((sum, entry) => sum + Number(entry.difficultyMod || 0), 0);

  const baseScore = strengthScore + effectsScore + risksScore;
  const finalDifficulty = Math.max(1, baseScore * Number(durationEntry.multiplier || 1));
  const finalCost = finalDifficulty * 25;
  const durationMultiplier = Number(durationEntry.multiplier || 1);

  const normalizedType = normalizeName(selectedType).replace(/\s+/g, "-");
  const formulaCoreName = buildFormulaCore({
    type: normalizedType,
    difficulty: finalDifficulty,
    strengthScore,
    effectsScore,
    sideEffectsScore: risksScore,
    durationMultiplier,
    effectsCount: effects.length,
  });
  const finalName = ui.name.value?.trim() || formulaCoreName;
  const normalizedName = normalizeName(finalName).replace(/\s+/g, "-");

  return {
    id: normalizedName,
    name: finalName,
    type: normalizedType,
    strength: `+${strengthEntry.value}`,
    difficulty: finalDifficulty,
    price: String(finalCost),
    duration: durationEntry.value,
    effects: effects.map((entry) => entry.label),
    sideEffects: risks.map((entry) => entry.label),
    description: drugT("drug.custom_description", `${typeEntry.label} custom build generated from official street table.`, { type: typeEntry.label }),
    buildMeta: {
      baseScore,
      strengthScore,
      effectsScore,
      sideEffectsScore: risksScore,
      durationMultiplier,
      formulaCoreName,
      formula: "(strength + effects + sideEffects) * durationMultiplier",
    },
  };
}

function bindNamePlaceholder(ui, options) {
  const update = () => refreshNamePlaceholder(ui, options);

  [ui.type, ui.strength, ui.duration].forEach((el) => {
    if (el) el.addEventListener("change", update);
  });

  if (ui.effects) ui.effects.addEventListener("change", update);
  if (ui.risks) ui.risks.addEventListener("change", update);
}

function refreshNamePlaceholder(ui, options) {
  if (!ui.name) return;
  const formulaCore = previewFormulaCoreName(ui, options);
  ui.name.placeholder = `ex.: ${formulaCore}`;
}

function previewFormulaCoreName(ui, options) {
  const selectedType = ui.type.value;

  const strengthEntry = (options.strengthOptions || []).find((entry) => entry.value === ui.strength.value)
    || (options.strengthOptions || [])[0]
    || { value: "1", difficultyMod: 1 };

  const durationIndex = Number(ui.duration.value || 0);
  const durationEntry = (options.durationOptions || [])[durationIndex]
    || (options.durationOptions || [])[0]
    || { value: "1D10+1 turns", multiplier: 1 };

  const effects = selectedChecklist(ui.effects);
  const risks = selectedChecklist(ui.risks);

  const strengthScore = Number(strengthEntry.value || 1);
  const effectsScore = effects.reduce((sum, entry) => sum + Number(entry.difficultyMod || 0), 0);
  const risksScore = risks.reduce((sum, entry) => sum + Number(entry.difficultyMod || 0), 0);

  const baseScore = strengthScore + effectsScore + risksScore;
  const finalDifficulty = Math.max(1, baseScore * Number(durationEntry.multiplier || 1));
  const durationMultiplier = Number(durationEntry.multiplier || 1);
  const normalizedType = normalizeName(selectedType).replace(/\s+/g, "-");

  return buildFormulaCore({
    type: normalizedType,
    difficulty: finalDifficulty,
    strengthScore,
    effectsScore,
    sideEffectsScore: risksScore,
    durationMultiplier,
    effectsCount: effects.length,
  });
}

function randomizeSelections(ui, options) {
  const types = Object.keys(options.types || {});
  if (types.length > 0) ui.type.value = types[Math.floor(Math.random() * types.length)];

  const strengths = options.strengthOptions || [];
  if (strengths.length > 0) {
    const randomStrength = strengths[Math.floor(Math.random() * strengths.length)];
    ui.strength.value = randomStrength.value;
  }

  const durations = options.durationOptions || [];
  if (durations.length > 0) {
    ui.duration.value = String(Math.floor(Math.random() * durations.length));
  }

  const randomizeGroup = (containerEl, maxSelected) => {
    const inputs = Array.from(containerEl.querySelectorAll("input[type='checkbox']"));
    inputs.forEach((input) => {
      input.checked = false;
    });

    const picks = Math.floor(Math.random() * (maxSelected + 1));
    const shuffled = inputs.sort(() => Math.random() - 0.5);
    shuffled.slice(0, picks).forEach((input) => {
      input.checked = true;
    });
  };

  randomizeGroup(ui.effects, 3);
  randomizeGroup(ui.risks, 2);
}

function renderResult(ui, build) {
  const summary = `
    <h3>${escapeHtml(build.name)}</h3>
    <p class="desc">${drugT("drug.summary", `Type: ${escapeHtml(build.type)} | STR ${escapeHtml(build.strength)} | Difficulty ${build.difficulty} | Cost ${build.price} eb`, {
      type: escapeHtml(build.type),
      strength: escapeHtml(build.strength),
      difficulty: build.difficulty,
      cost: build.price,
    })}</p>
    <div class="bundle-tags forge-scroll">
      <span class="bundle-tag">${escapeHtml(build.duration)}</span>
      ${build.effects.map((label) => `<span class="bundle-tag bundle-perk">FX: ${escapeHtml(label)}</span>`).join("")}
      ${build.sideEffects.map((label) => `<span class="bundle-tag bundle-risk">SE: ${escapeHtml(label)}</span>`).join("")}
    </div>
  `;

  const fakeFormula = buildFakeFormula(build);
  const compositionItems = [
    [drugT("drug.type", "Type"), build.type],
    [drugT("drug.strength", "Strength"), build.strength],
    [drugT("drug.duration", "Duration"), build.duration],
    [drugT("drug.difficulty", "Difficulty"), String(build.difficulty)],
    [drugT("drug.street_cost", "Street Cost"), `${build.price} eb`],
    [drugT("drug.effects", "Effects"), build.effects.length ? build.effects.join(" | ") : drugT("common.none", "none")],
    [drugT("drug.side_effects", "Side Effects"), build.sideEffects.length ? build.sideEffects.join(" | ") : drugT("common.none", "none")],
  ];

  const compositionList = compositionItems
    .map(([label, value]) => `<li><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></li>`)
    .join("");

  ui.result.innerHTML = `
    ${summary}
    <div id="dg-sheet" class="generator-sheet">
      <div class="generator-formula">
        <p class="formula-label">${drugT("drug.compound_formula", "Compound Formula //")}</p>
        <p class="formula-value">${escapeHtml(fakeFormula)}</p>
      </div>
      <ul class="generator-content-list forge-scroll">
        ${compositionList}
      </ul>
    </div>
    <button id="dg-add-cart" type="button" class="btn-primary">${drugT("drug.send_cart", "Send to Cart")}</button>
  `;

  const addCartBtn = ui.result.querySelector("#dg-add-cart");
  if (addCartBtn) {
    addCartBtn.dataset.build = JSON.stringify(build);
    addCartBtn.addEventListener("click", () => {
      const payload = addCartBtn.dataset.build
        ? JSON.parse(addCartBtn.dataset.build)
        : build;
      addBuildToCart(payload);
    });
  }
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

function buildFakeFormula(build) {
  const meta = build.buildMeta || {};
  const strengthScore = Number(meta.strengthScore || 1);
  const effectsScore = Number(meta.effectsScore || 0);
  const sideEffectsScore = Number(meta.sideEffectsScore || 0);
  const durationMultiplier = Number(meta.durationMultiplier || 1);
  const formulaCore = meta.formulaCoreName || buildFormulaCore({
    type: build.type,
    difficulty: build.difficulty,
    strengthScore,
    effectsScore,
    sideEffectsScore,
    durationMultiplier,
    effectsCount: Array.isArray(build.effects) ? build.effects.length : 0,
  });

  return `${formulaCore} // µ-${durationMultiplier} // SYN-${strengthScore}${effectsScore}${Math.abs(sideEffectsScore)}`;
}

function buildFormulaCore({
  type,
  difficulty,
  strengthScore,
  effectsScore,
  sideEffectsScore,
  durationMultiplier,
  effectsCount,
}) {
  const carbonCount = 14 + Number(difficulty || 1);
  const hydrogenCount = 16 + Number(strengthScore || 1) * 3 + Number(effectsScore || 0);
  const nitrogenCount = 2 + Number(effectsCount || 0);
  const oxygenCount = 1 + Math.abs(Number(sideEffectsScore || 0)) + Number(durationMultiplier || 1);
  const batchCode = String(type || "street").slice(0, 3).toUpperCase();

  return `C${carbonCount}H${hydrogenCount}N${nitrogenCount}O${oxygenCount}-${batchCode}`;
}

function addBuildToCart(build) {
  if (!build) return;

  let stash = [];
  try {
    stash = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    if (!Array.isArray(stash)) stash = [];
  } catch {
    stash = [];
  }

  const cartItem = {
    id: `drug-${build.id}-${Date.now()}`,
    name: build.name,
    price: Number(build.price || 0),
    category: "drugs",
    categoryLabel: window.I18n?.isPtBr?.() ? "Drogas" : "Drugs",
    sourceCatalog: "drugs-generator",
    locale: window.I18n?.getLocale?.() || "en-US",
    hl: 0,
    hlOriginal: "0",
    hlRaw: "0",
    hlLog: "",
  };

  stash.push(cartItem);
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(stash));

  if (typeof Modal !== "undefined") {
    Modal.alert(
      drugT("drug.pushed_title", "PUSHED TO CART"),
      drugT("drug.pushed_message", `${build.name} linked to cart stash.`, { name: build.name }),
    );
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    fetchDrugsData,
    hydrateForm,
    fillSelect,
    renderChecklist,
    selectedChecklist,
    generateDrug,
    bindNamePlaceholder,
    refreshNamePlaceholder,
    previewFormulaCoreName,
    randomizeSelections,
    renderResult,
    normalizeName,
    buildFakeFormula,
    buildFormulaCore,
    addBuildToCart,
    escapeHtml,
  };
}
