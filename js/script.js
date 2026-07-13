/**
 * BYTE & BLADES - CORE ENGINE V3.1 (NO_EMOJI_EDITION)
 * "Talk cheap, ammo expensive."
 */

const PAGE_CONFIG = {
  cyberwares: {
    path: "../data/cyberwares.json",
    title: "CHROME_CATALOG",
  },
  accessories: {
    path: "../data/equipment.json",
    title: "GEAR_STASH",
  },
  drugs: {
    path: "../data/drugs.json",
    title: "CHEM_FEED",
    dataSelector: "data.street_stock",
  },
  // weapons intentionally disabled for now (dataset pending completion)
};


const STORAGE_KEY = "cyber_cart";

// --- DICE ENGINE ---
const DiceEngine = {
  regex: /(\d+)[dD](\d+)(?:([+-])(\d+))?/g,

  // Rola e retorna objeto com total e log
  roll(str) {
    // Se for número fixo, retorna ele mesmo
    if (!isNaN(str)) return { total: parseInt(str), details: `FIXED(${str})` };

    let total = 0;
    let details = [];

    const matches = [...str.matchAll(/(\d+)[dD](\d+)(?:([+-])(\d+))?/g)];

    if (matches.length === 0) {
      const val = parseInt(str);
      return isNaN(val)
        ? { total: 0, details: "N/A" }
        : { total: val, details: "FIXED" };
    }

    matches.forEach((match) => {
      const count = parseInt(match[1]);
      const sides = parseInt(match[2]);
      const operator = match[3] || "+";
      const modifier = parseInt(match[4]) || 0;

      let subtotal = 0;
      let rolls = [];

      for (let i = 0; i < count; i++) {
        const r = Math.floor(Math.random() * sides) + 1;
        rolls.push(r);
        subtotal += r;
      }

      if (operator === "+") subtotal += modifier;
      else subtotal -= modifier;

      total += subtotal;

      let log = `[${rolls.join(", ")}]`;
      if (modifier > 0) log += ` ${operator} ${modifier}`;
      details.push(log);
    });

    return { total, details: details.join(" | ") };
  },

  createButton(damageStr, contextName) {
    if (!damageStr || !damageStr.match(this.regex)) return null;

    const btn = document.createElement("button");
    btn.className = "btn-secondary btn-dice";
    btn.innerHTML = `[ROLL] ${damageStr}`;
    btn.style.fontSize = "0.7rem";
    btn.style.marginTop = "5px";
    btn.style.width = "100%";
    btn.onclick = (e) => {
      e.stopPropagation();
      const result = this.roll(damageStr);
      Modal.alert(
        `DAMAGE REPORT: ${contextName}`,
        `<strong>TOTAL DAMAGE: ${result.total}</strong><br><br><small style="color:#888">LOG: ${result.details}</small>`,
      );
    };
    return btn;
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

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
  const pageId = detectPage();
  if (!pageId || !PAGE_CONFIG[pageId]) return;

  const config = PAGE_CONFIG[pageId];
  const ui = captureUI();

  let fullCatalog = {};
  let activeCategory = null;

  init();

  async function init() {
    try {
      fullCatalog = await fetchData(config.path);
      setupCategories(fullCatalog);
      setupFilters(fullCatalog);
      setupEvents();

      const firstCategory = Object.keys(fullCatalog)[0];
      if (firstCategory) selectCategory(firstCategory);
    } catch (err) {
      console.error("Netrun Failed:", err);
      ui.itemsList.innerHTML = `
                <div class="error-box" style="border: 1px solid red; padding: 20px; color: red;">
                    <h3>[!] SIGNAL LOST</h3>
                    <p>Can't sync with DataTerm at <strong>${config.path}</strong>.</p>
                    <p>Debug info: ${err.message}</p>
                    ${window.location.protocol === "file:" ? "<br><p><strong>PRO TIP:</strong> Local file usage detected. Check CORS settings.</p>" : ""}
                </div>`;
    }
  }

  // --- CORE FUNCTIONS ---

  async function fetchData(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (config.dataSelector === "data.street_stock") {
      return { street_stock: (json.data && json.data.street_stock) ? json.data.street_stock : {} };
    }
    return json.data || json;
  }

  function getItemsFromCategory(categoryKey) {
    const categoryData = fullCatalog[categoryKey];
    if (!categoryData) return [];

    const categoryLower = String(categoryKey || "").toLowerCase();
    const inferredMeta = inferCategoryMeta(categoryLower);

    const rawList =
      categoryData.itens || categoryData.items || categoryData.list || {};

    return Object.entries(rawList).map(([key, item]) => {
      const itemHL = resolveItemHL(item, categoryLower);

      return {
        id: item.id || key,
        name: item.name || formatName(key),
        description:
          item.description || item.note || item.desc || "No specs available.",
        price: parsePrice(item.price || item.cost || item.value),
        hl: itemHL,
        cir: item.surg || item.cir || null,
        tags: Array.isArray(item.tags) ? item.tags : inferredMeta.tags,
        maxPurchases: Number(item.maxPurchases) || null,
        alternativeAcquisition: Boolean(item.alternativeAcquisition),
        attributeBonuses: Array.isArray(item.attributeBonuses) ? item.attributeBonuses : [],
        skillBonuses: Array.isArray(item.skillBonuses) ? item.skillBonuses : [],
        attributeSet: item.attributeSet && typeof item.attributeSet === "object" ? item.attributeSet : null,
        priceModifiers: Array.isArray(item.priceModifiers) ? item.priceModifiers : [],
        installation: item.installation && typeof item.installation === "object" ? item.installation : inferredMeta.installation,
        raw: item,
        category: categoryKey,
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
  // --- RENDER ---
  function setupCategories(catalog) {
    if (!ui.categoryList) return;
    const fragment = document.createDocumentFragment();

    Object.keys(catalog).forEach((key) => {
      if (typeof catalog[key] !== "object") return;
      const btn = document.createElement("button");
      btn.textContent = key.toUpperCase();
      btn.dataset.category = key;
      btn.onclick = () => selectCategory(key);
      fragment.appendChild(btn);
    });

    ui.categoryList.replaceChildren(fragment);
  }

  function selectCategory(key) {
    activeCategory = key;

    if (ui.titleCategory) ui.titleCategory.textContent = key;

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
  }

  function renderItems(items) {
    if (!ui.itemsList) return;
    ui.itemsList.innerHTML = "";

    if (items.length === 0) {
      ui.itemsList.innerHTML = `<p class="no-results">Nothing here, Choom. Try another stream.</p>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "item";

      let badges = "";
      if (item.hl)
        badges += `<span style="color:var(--secondary-color)">HL: ${item.hl}</span>`;
      if (item.cir)
        badges += `<span style="margin-left:10px; color:#888">CIR: ${item.cir}</span>`;
      if (item.maxPurchases)
        badges += `<span style="margin-left:10px; color:#8fdfff">MAX: ${item.maxPurchases}</span>`;

      const techMeta = renderTechnicalMeta(item);

      const { statsHtml, damageVal } = renderWeaponStats(item.raw);

      let diceButton = null;
      if (damageVal) {
        diceButton = DiceEngine.createButton(damageVal, item.name);
      } else {
        const descDmg = item.description.match(DiceEngine.regex);
        if (descDmg)
          diceButton = DiceEngine.createButton(descDmg[0], item.name);
      }

      card.innerHTML = `
                <h3>${item.name}</h3>
                <p class="desc">${item.description}</p>
                ${badges ? `<div class="meta">${badges}</div>` : ""}
                ${techMeta}
                ${statsHtml}
                <div id="dice-area-${item.id}"></div>
                <div class="meta" style="margin-top:auto; display:flex; justify-content:space-between; align-items:flex-end;">
              <strong id="price-${item.id}" style="color:var(--primary-color); font-size:1.2em;">${formatCurrency(item.price)}</strong>
                </div>
            `;

      if (diceButton) {
        card.querySelector(`#dice-area-${item.id}`).appendChild(diceButton);
      }

      const btn = document.createElement("button");
      btn.className = "btn-add";
      if (item.id === "aptr_reflex_chips") {
        btn.textContent = "OPEN APTR TABLE";
      } else if (item.id === "mram_memory_chips") {
        btn.textContent = "OPEN MRAM TABLE";
      } else if (isVisualRecognitionItem(item)) {
        btn.textContent = "OPEN VISUAL TABLE";
      } else {
        btn.textContent = "SNAG IT";
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
        handlePurchase(item, btn);
      };

      card.appendChild(btn);
      fragment.appendChild(card);
    });

    ui.itemsList.appendChild(fragment);
  }

  function renderWeaponStats(raw) {
    const stats = raw.code || raw;
    if (!stats.accuracy && !stats.damage && !stats.danoMunicao)
      return { statsHtml: "", damageVal: null };

    const map = [
      { l: "WA", v: stats.accuracy || stats.precision || stats.wa },
      { l: "DMG", v: stats.damage || stats.danoMunicao, isDamage: true },
      { l: "SHT", v: stats.shots || stats.disparos },
      { l: "ROF", v: stats.rof || stats.cadencia },
      { l: "REL", v: stats.reliability || stats.confiabilidade },
    ];

    let html = `<ul class="weapon-code">`;
    let hasData = false;
    let damageVal = null;

    map.forEach((f) => {
      if (f.v) {
        html += `<li><span>${f.l}</span> <span>${f.v}</span></li>`;
        hasData = true;
        if (f.isDamage) damageVal = f.v;
      }
    });
    html += `</ul>`;

    return { statsHtml: hasData ? html : "", damageVal: damageVal };
  }

  function renderTechnicalMeta(item) {
    const lines = [];

    const reqs = item.installation?.requires;
    if (Array.isArray(reqs) && reqs.length > 0) {
      lines.push(`REQ: ${reqs.join(", ")}`);
    }

    const slotUsage = Number(item.installation?.slotUsage);
    if (!Number.isNaN(slotUsage) && slotUsage > 0) {
      const family = item.installation?.slotFamily || item.installation?.slotProvider || "GENERIC";
      lines.push(`SLOTS: ${slotUsage} @ ${family}`);
    }

    const slotCapacity = Number(item.installation?.slotCapacity);
    if (!Number.isNaN(slotCapacity) && slotCapacity >= 0) {
      const family = item.installation?.slotFamily || item.id;
      lines.push(`PROVIDER: ${family} (${slotCapacity})`);
    }

    if (Array.isArray(item.attributeBonuses) && item.attributeBonuses.length > 0) {
      const bonusText = item.attributeBonuses
        .map((bonus) => {
          const value = Number(bonus.value) || 0;
          const signal = value >= 0 ? "+" : "";
          return `${signal}${value} ${bonus.attribute}`;
        })
        .join(" | ");
      lines.push(`BONUS: ${bonusText}`);
    }

    if (Array.isArray(item.skillBonuses) && item.skillBonuses.length > 0) {
      const skillText = item.skillBonuses
        .map((bonus) => {
          const value = Number(bonus.value) || 0;
          const signal = value >= 0 ? "+" : "";
          return `${signal}${value} ${bonus.skill}`;
        })
        .join(" | ");
      lines.push(`SKILL: ${skillText}`);
    }

    if (item.attributeSet && typeof item.attributeSet === "object") {
      const setText = Object.entries(item.attributeSet)
        .map(([attribute, value]) => `${attribute}=${value}`)
        .join(" | ");
      if (setText) lines.push(`SET: ${setText}`);
    }

    if (item.alternativeAcquisition) {
      lines.push("ALT ACQ: FAVORS/TRADE");
    }

    if (lines.length === 0) return "";
    return `<div class="meta" style="margin-top:8px; color:#8fdfff; font-size:0.72rem; line-height:1.4;">${lines.join("<br>")}</div>`;
  }

  function isVisualRecognitionItem(item) {
    return Array.isArray(item.tags) && item.tags.includes("visual_recognition_chip");
  }

  // --- PURCHASE LOGIC (AUTO-ROLL HL) ---
  function handlePurchase(item, btn) {
    let finalHL = 0;
    let rollLog = "";

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
      name: item.name,
      price: item.price,
      category: item.category,
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
      installation: item.installation,
    });

    const originalText = btn.textContent;
    btn.textContent = `COPPED! ${finalHL > 0 ? `[HL -${finalHL}]` : ""}`;
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
    return (val || 0).toLocaleString("en-US", { style: "currency", currency: "USD" }).replace("$", "") + " eb";
  }

  function formatName(slug) {
    return slug.replace(/_/g, " ").toUpperCase();
  }

  function detectPage() {
    const path = window.location.pathname;
    if (path.includes("cyberwares")) return "cyberwares";
    if (path.includes("accessories")) return "accessories";
    if (path.includes("drugs")) return "drugs";
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
    all.textContent = "ALL SIGNALS";
    frag.appendChild(all);
    Object.keys(catalog).forEach((k) => {
      if (typeof catalog[k] !== "object") return;
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      frag.appendChild(opt);
    });
    ui.fsCategory.replaceChildren(frag);
  }

  function setupEvents() {
    if (ui.filterToggle)
      ui.filterToggle.onclick = () =>
        ui.filterSidebar.classList.toggle("hidden");
    if (ui.closeFilter)
      ui.closeFilter.onclick = () => ui.filterSidebar.classList.add("hidden");

    if (ui.fsApply) {
      ui.fsApply.onclick = () => {
        const targetCat = ui.fsCategory.value || activeCategory;
        const maxPrice =
          parseFloat(document.getElementById("fs-price-max-input")?.value) ||
          Infinity;
          const maxHL =
            parseFloat(document.getElementById("fs-hl-max-input")?.value) ||
            Infinity;
          const cirFilter =
            (document.getElementById("fs-cir-input")?.value || "").trim().toLowerCase();
          const maxDifficulty =
            parseFloat(document.getElementById("fs-difficulty-max-input")?.value) ||
            Infinity;

        let list = getItemsFromCategory(targetCat);
          list = list.filter((i) => i.price <= maxPrice);

          if (Number.isFinite(maxHL)) {
            list = list.filter((i) => {
              if (!i.hl) return true;
              if (window.CyberUtils) return CyberUtils.hlComparable(i.hl) <= maxHL;
              return parseFloat(i.hl) <= maxHL;
            });
          }

          if (cirFilter) {
            list = list.filter((i) =>
              String(i.cir || "").toLowerCase().includes(cirFilter),
            );
          }

          if (Number.isFinite(maxDifficulty)) {
            list = list.filter((i) => {
              const itemDiff = Number(i.raw?.difficulty);
              if (Number.isNaN(itemDiff)) return true;
              return itemDiff <= maxDifficulty;
            });
          }

        renderItems(list);
        if (window.innerWidth < 800) ui.filterSidebar.classList.add("hidden");
      };
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
      };
    }
  }
});
