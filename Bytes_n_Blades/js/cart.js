/**
 * BYTE & BLADES - STASH MODULE V3.1 (NO_EMOJI)
 * "Stash your loot. Export your run file."
 */

const STORAGE_KEY = "cyber_cart";

function cartT(key, fallback, params = {}) {
  if (typeof window !== "undefined" && window.I18n) return window.I18n.t(key, params, fallback);
  return String(fallback).replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name) => params[name] ?? `{${name}}`);
}

function cartDataPath(path) {
  return typeof window !== "undefined" && window.I18n ? window.I18n.dataPath(path) : path;
}

document.addEventListener("DOMContentLoaded", () => {
  const dependencyLabels = new Map();
  const localizedItems = new Map();
  const localizedSkills = new Map();
  const localizedDeckParts = new Map();
  const ui = {
    list: document.getElementById("cart-list"),
    total: document.getElementById("cart-total-value"),
    clearBtn: document.getElementById("cart-clear"),
    exportBtn: document.getElementById("cart-export"),
    emptyMsg: document.getElementById("empty-cart-msg"),
    loadoutName: document.getElementById("loadout-name"),
    loadoutSave: document.getElementById("loadout-save"),
    loadoutImport: document.getElementById("loadout-import"),
    loadoutStatus: document.getElementById("loadout-vault-status"),
    loadoutCount: document.getElementById("loadout-vault-count"),
    savedLoadouts: document.getElementById("saved-loadouts"),
  };

  renderStash();
  renderSavedLoadouts();
  hydrateRequirementLabels().then(renderStash).catch(() => {});

  if (ui.clearBtn) ui.clearBtn.onclick = burnStash;
  if (ui.exportBtn) ui.exportBtn.onclick = exportDataChip;
  if (ui.loadoutSave) ui.loadoutSave.onclick = saveCurrentLoadout;
  if (ui.loadoutImport) ui.loadoutImport.onchange = importLoadoutFile;
  window.addEventListener("loadouts-updated", renderSavedLoadouts);
  window.addEventListener("stash-updated", renderStash);

  function getStash() {
    if (window.CyberUtils) return CyberUtils.safeGetArray(STORAGE_KEY);
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveStash(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    renderStash();
    window.dispatchEvent(new Event("stash-updated"));
  }

  async function hydrateRequirementLabels() {
    await window.CyberSources?.load?.();
    const sources = window.I18n
      ? [
          ["catalog", cartDataPath("../data/cyberwares.json")],
          ["catalog", cartDataPath("../data/equipment.json")],
          ["catalog", cartDataPath("../data/decks.json")],
          ["weapons", cartDataPath("../data/weapons.json")],
          ["ammo", cartDataPath("../data/ammo.json")],
          ["drugs", cartDataPath("../data/drugs.json")],
          ["chips", cartDataPath("../data/chip-rates.json")],
        ]
      : [
          ["catalog", "../data/cyberwares.json"],
          ["catalog", "../data/equipment.json"],
        ];
    if (window.I18n) {
      const cartSources = new Set(getStash().map((item) => item.sourceCatalog));
      if (cartSources.has("programs") || cartSources.has("cyberdecks")) {
        sources.push(["programs", cartDataPath("../data/programs.json")]);
      }
      if (cartSources.has("cyberdecks")) {
        sources.push(["cyberdecks", cartDataPath("../data/cyberdecks.json")]);
      }
    }
    const responses = await Promise.allSettled(
      sources.map(([_type, url]) => fetch(url, { cache: "no-store" })),
    );

    for (let index = 0; index < responses.length; index += 1) {
      const result = responses[index];
      if (result.status !== "fulfilled" || !result.value.ok) continue;
      const payload = await result.value.json();
      const sourceType = sources[index][0];
      if (sourceType === "weapons") {
        (payload.weapons || payload.data?.weapons || []).forEach((item) => registerLocalizedItem(item.id, {
          name: item.name,
          categoryLabel: item.class,
          installation: item.installation,
        }));
        continue;
      }
      if (sourceType === "ammo") {
        (payload.items || payload.data?.items || []).forEach((item) => registerLocalizedItem(item.id, {
          name: item.name,
          categoryLabel: item.category,
        }));
        continue;
      }
      if (sourceType === "drugs") {
        const items = payload.data?.street_stock?.items || {};
        Object.entries(items).forEach(([id, item]) => registerLocalizedItem(item.id || id, {
          name: item.name,
          categoryLabel: window.I18n?.isPtBr?.() ? "Drogas" : "Drugs",
          installation: item.installation,
        }));
        continue;
      }
      if (sourceType === "chips") {
        Object.entries(payload.data || {}).forEach(([pageType, spec]) => {
          (spec.sections || []).forEach((section) => {
            (section.items || []).forEach((item) => {
              localizedSkills.set(`${pageType}:${item.id}`, {
                skill: item.skill,
                label: spec.label,
              });
            });
          });
        });
        continue;
      }
      if (sourceType === "programs") {
        const classes = new Map((payload.classes || []).map((entry) => [entry.id, entry.label]));
        (payload.programs || []).forEach((item) => registerLocalizedItem(item.id, {
          name: item.name,
          categoryLabel: (item.class_ids || [item.class_id])
            .map((id) => classes.get(id) || id)
            .join(" / "),
        }));
        continue;
      }
      if (sourceType === "cyberdecks") {
        (payload.decks || []).forEach((item) => registerLocalizedItem(item.id, {
          name: item.name,
          categoryLabel: cartT("net.decks", "Cyberdecks"),
        }));
        const builder = payload.builder || {};
        [...(builder.chassis || []), ...(builder.connections || []), ...(builder.options || [])]
          .forEach((entry) => localizedDeckParts.set(entry.id, entry.name));
        (builder.options || []).forEach((entry) => (entry.choices || [])
          .forEach((choice) => localizedDeckParts.set(`${entry.id}:${choice.id}`, choice.name)));
        (builder.external_products || []).forEach((entry) => registerLocalizedItem(entry.id, {
          name: entry.name,
          categoryLabel: cartT("net.netgear", "Deck Support"),
        }));
        continue;
      }
      const catalog = payload.data || payload;

      Object.values(catalog || {}).forEach((category) => {
        if (!category || typeof category !== "object") return;
        const rawItems = category.itens || category.items || category.list || {};
        Object.entries(rawItems).forEach(([key, item]) => {
          if (!item || typeof item !== "object") return;
          const id = String(item.id || key).trim().toLowerCase();
          if (id) dependencyLabels.set(id, item.name || key);
          registerLocalizedItem(item.id || key, {
            name: item.name || key,
            categoryLabel: category.name,
            installation: item.installation,
            deck: item.stats ? {
              stats: item.stats,
              features: item.features || {},
              options: Array.isArray(item.options) ? item.options : [],
              source: item.source || null,
              approximatePrice: Boolean(item.approximatePrice),
            } : null,
            modifierGroup: category.modifierGroup && Array.isArray(category.modifierGroup.appliesTo)
              && (category.modifierGroup.appliesTo.includes(key) || category.modifierGroup.appliesTo.includes(item.id))
              ? category.modifierGroup
              : null,
          });
          if (Array.isArray(item.legacyIds)) {
            item.legacyIds.forEach((legacyId) => {
              const normalized = String(legacyId || "").trim().toLowerCase();
              if (normalized) dependencyLabels.set(normalized, item.name || key);
            });
          }
        });
      });
    }
  }

  function registerLocalizedItem(id, item) {
    const normalized = String(id || "").trim().toLowerCase();
    if (normalized) localizedItems.set(normalized, item);
  }

  function localizedDisplay(item) {
    const chipMeta = item.localization?.catalog === "chip-rates" ? item.localization : null;
    if (chipMeta) {
      const spec = localizedSkills.get(`${chipMeta.pageType}:${chipMeta.skillId}`);
      if (spec) {
        return {
          name: `${spec.label} Chip: ${spec.skill} +${chipMeta.level}`,
          categoryLabel: "Chipware",
          installation: item.installation,
        };
      }
    }
    if (item.deckConfiguration?.kind === "custom") {
      return {
        name: cartT("net.custom_deck", "Custom Cyberdeck"),
        categoryLabel: cartT("net.decks", "Cyberdecks"),
        installation: item.installation,
      };
    }
    return localizedItems.get(String(item.id || "").trim().toLowerCase()) || item;
  }

  function localizedBundleTitle(item) {
    if (!item.bundleTitleKey) return item.bundleTitle || cartT("common.bundle", "Bundle");
    const baseTitle = cartT(item.bundleTitleKey, item.bundleTitleFallback || item.bundleTitle || "Bundle");
    const profile = item.bundleProfileKey
      ? cartT(item.bundleProfileKey, item.bundleProfileFallback || "")
      : "";
    const signature = item.bundleSignatureKey
      ? cartT(item.bundleSignatureKey, item.bundleSignatureFallback || "")
      : "";
    return [profile, baseTitle, signature].filter(Boolean).join(" // ");
  }

  function requirementLabel(id) {
    if (window.CyberUtils) {
      return CyberUtils.resolveRequirementLabel(id, dependencyLabels);
    }
    return String(id || "").replace(/[_-]+/g, " ");
  }

  function renderStash() {
    if (!ui.list) return;

    const cart = getStash();
    ui.list.innerHTML = "";

    // Empty State
    if (cart.length === 0) {
      if (ui.emptyMsg) ui.emptyMsg.classList.remove("hidden");
      if (ui.total) ui.total.textContent = cartT("cart.empty_total", "TOTAL: 0.00 eb | HL: 0");
      if (ui.exportBtn) ui.exportBtn.disabled = true;
      return;
    } else {
      if (ui.emptyMsg) ui.emptyMsg.classList.add("hidden");
      if (ui.exportBtn) ui.exportBtn.disabled = false;
    }

    let totalCost = 0;
    let totalHL = 0;
    const isHacked = sessionStorage.getItem("cart_hacked") === "true";
    const isBurned = sessionStorage.getItem("cart_burned") === "true";
    const fragment = document.createDocumentFragment();

    cart.forEach((item, index) => {
      const displayItem = localizedDisplay(item);
      const cartCount = lineCount(item);
      totalCost += (item.price || 0) * cartCount;

      const itemHL = Number(item.hl) || 0;
      totalHL += itemHL * cartCount;

      const row = document.createElement("div");
      row.className = "cart-item";

      // Formatando o texto do HL no item
      let hlText = "";
      if (itemHL > 0) {
        hlText = `<span class="cart-badge-hl">[${window.I18n?.isPtBr?.() ? "PH" : "HL"}: ${itemHL}]</span>`;
      }

        let bundleTag = "";
        if (item.bundleId && item.bundleDiscountPct) {
        const bundleName = localizedBundleTitle(item);
        bundleTag = `<span class="cart-badge-bundle">[${cartT("cart.bundle_sync", "BUNDLE SYNC")}: ${bundleName} -${item.bundleDiscountPct}%]</span>`;
        }

      row.innerHTML = `
                <div class="cart-item-main">
                    <h3 class="cart-item-name">
                        ${displayItem.name || item.name}
                    </h3>
                    <small class="cart-item-meta">
                        ${cartT("cart.type", "TYPE")}: ${displayItem.categoryLabel || item.categoryLabel || item.category || cartT("common.unknown", "UNKNOWN")} 
                        ${hlText}
                ${bundleTag}
                    </small>
              ${renderTechnicalInfo({
                ...item,
                installation: displayItem.installation || item.installation,
                deck: displayItem.deck || item.deck,
                modifierGroup: displayItem.modifierGroup || item.modifierGroup,
                })}
                </div>
                <div class="cart-item-price">
                    ${formatCurrency((item.price || 0) * cartCount)}
                </div>
            `;

      const actions = document.createElement("div");
      actions.className = "cart-item-actions";
      const stepper = document.createElement("div");
      stepper.className = "cart-line-stepper";
      const decrease = document.createElement("button");
      decrease.type = "button";
      decrease.textContent = "−";
      decrease.setAttribute("aria-label", cartT("cart.decrease_quantity", `Decrease quantity of ${displayItem.name || item.name}`, { name: displayItem.name || item.name }));
      decrease.onclick = () => changeLineCount(index, -1);
      const count = document.createElement("output");
      count.textContent = String(cartCount);
      count.setAttribute("aria-label", cartT("cart.line_quantity", "Line quantity"));
      const increase = document.createElement("button");
      increase.type = "button";
      increase.textContent = "+";
      increase.setAttribute("aria-label", cartT("cart.increase_quantity", `Increase quantity of ${displayItem.name || item.name}`, { name: displayItem.name || item.name }));
      increase.onclick = () => changeLineCount(index, 1);
      stepper.append(decrease, count, increase);

      const delBtn = document.createElement("button");
      delBtn.className = "btn-danger cart-trash";
      delBtn.textContent = cartT("cart.trash", "TRASH IT");
      delBtn.onclick = () => removeItem(index);

      actions.append(stepper, delBtn);
      row.appendChild(actions);
      fragment.appendChild(row);
    });

    ui.list.appendChild(fragment);

    if (cart.length > 0 && !isHacked && !isBurned) {
      let hackBtn = document.getElementById("cart-hack-btn");
      if (!hackBtn) {
        hackBtn = document.createElement("button");
        hackBtn.id = "cart-hack-btn";
        hackBtn.className = "btn-secondary cart-hack-action";
        hackBtn.textContent = cartT("cart.breach", "BREACH PROTOCOL");

        hackBtn.onclick = () => {
          HackSystem.init((success) => {
            if (success) {
              sessionStorage.setItem("cart_hacked", "true");
              Modal.alert(
                cartT("cart.breach_success", "SYSTEM BREACH SUCCESSFUL"),
                cartT("cart.breach_success_message", "Corp escrow spoofed.<br><span class='modal-success'>20% DISCOUNT APPLIED.</span>"),
              );
            } else {
              sessionStorage.setItem("cart_burned", "true");
              Modal.alert(
                cartT("cart.breach_failed", "BREACH DETECTED"),
                cartT("cart.breach_failed_message", "Netwatch trace completed.<br><span class='modal-alert'>10% PENALTY FEE ADDED.</span>"),
              );
            }
            renderStash();
          });
        };

        if (ui.exportBtn && ui.exportBtn.parentNode) {
          ui.exportBtn.parentNode.insertBefore(hackBtn, ui.exportBtn);
        }
      }
    } else {
      const oldBtn = document.getElementById("cart-hack-btn");
      if (oldBtn) oldBtn.remove();
    }

    const bundleMeta = new Map();
    cart.forEach((item) => {
      if (!item.bundleId || !item.bundleDiscountPct) return;

      if (!bundleMeta.has(item.bundleId)) {
        bundleMeta.set(item.bundleId, {
          title: localizedBundleTitle(item),
          discountPct: Number(item.bundleDiscountPct) || 0,
          subtotal: 0,
        });
      }

      const entry = bundleMeta.get(item.bundleId);
      entry.subtotal += (item.price || 0) * lineCount(item);
    });

    const bundleDiscountValue = Array.from(bundleMeta.values()).reduce(
      (sum, entry) => sum + entry.subtotal * (entry.discountPct / 100),
      0,
    );

    const consistency = analyzeConsistency(expandCart(cart));

    let discountedCost = totalCost - bundleDiscountValue;
    let extraStatus = "";

    if (bundleMeta.size > 0) {
      const immersiveTags = Array.from(bundleMeta.values())
        .map((entry) => `[${cartT("cart.bundle_sync", "BUNDLE SYNC")}: ${entry.title} -${entry.discountPct}%]`)
        .join("<br>");

      extraStatus += `<span class="cart-total-status bundle">${immersiveTags}</span>`;
      extraStatus += `<span class="cart-total-status discount">${cartT("cart.discount_offset", "DISCOUNT OFFSET")}: -${formatCurrency(bundleDiscountValue)}</span>`;
    }

    if (isHacked) {
      discountedCost *= 0.8;
      extraStatus += `<span class="cart-total-status hacked">[ ${cartT("cart.hacked", "HACKED: -20%")} ]</span>`;
    } else if (isBurned) {
      discountedCost *= 1.1;
      extraStatus += `<span class="cart-total-status traced">[ ${cartT("cart.traced", "TRACED: +10% FEE")} ]</span>`;
    }

    // Atualiza Footer com Preço E Humanidade
    if (ui.total) {
      ui.total.innerHTML = `
                <div class="cart-total-stack">
                    <div><span class="cart-total-label">${cartT("cart.cost", "COST")}:</span> ${formatCurrency(discountedCost)}</div>
                    ${extraStatus}
                    <div class="cart-total-hl">${cartT("cart.total_hl", "TOTAL HL")}: ${totalHL}</div>
                    ${consistency.warnings.length > 0
    ? `<div class="cart-warnings">${cartT("cart.warnings", "WARNINGS")}:<br>${consistency.warnings.map((w) => `- ${w}`).join("<br>")}</div>`
    : ""}
                </div>
            `;
    }
  }

  function renderTechnicalInfo(item) {
    const details = [];
    const inlineSource = item.program?.source || item.deck?.source || item.source;
    const editorialSource = item.editorialSource || window.CyberSources?.resolve?.(
      item.sourceCatalog,
      item.id,
      inlineSource,
      item.categoryLabel || item.category,
    ) || inlineSource;

    if (editorialSource) {
      const sourceLabel = window.CyberSources?.label?.(editorialSource)
        || [
          editorialSource.book || editorialSource.title || editorialSource.source,
          editorialSource.pages || editorialSource.page
            ? `p. ${editorialSource.pages || editorialSource.page}`
            : null,
        ].filter(Boolean).join(", ");
      if (sourceLabel) details.push(`${cartT("compare.source", "SOURCE")} ${sourceLabel}`);
    }

    if (item.program) {
      const situational = (item.program.strength?.situational || [])
        .map((entry) => `${entry.value} ${entry.when}`)
        .join("; ");
      const strength = `${item.program.strength?.base ?? "?"}${situational ? ` (${situational})` : ""}`;
      details.push(`${cartT("net.strength", "STR")} ${strength} | MU ${item.program.memory ?? cartT("net.variable", "Variable")}`);
      if (item.program.platform) details.push(`${cartT("net.platform", "PLATFORM")} ${item.program.platform}`);
    }

    if (item.netgear) {
      const unit = item.netgear.unit ? ` ${item.netgear.unit}` : "";
      details.push(`${cartT("net.quantity", "QUANTITY")} ${item.netgear.quantity}${unit}`);
    }

    if (item.deckConfiguration) {
      const deck = item.deckConfiguration;
      const value = (candidate) => candidate == null ? cartT("net.unspecified", "Not specified") : candidate;
      details.push(`CPU ${value(deck.cpu)} | MU ${value(deck.memory)} | ${cartT("net.speed", "Speed")} ${value(deck.speed)} | ${cartT("net.data_wall", "Data Wall")} ${value(deck.dataWall)}`);
      if (deck.chassisId) details.push(`${cartT("net.chassis", "CHASSIS")} ${localizedDeckParts.get(deck.chassisId) || deck.chassisId}`);
      if (deck.connectionId) details.push(`${cartT("net.connection", "CONNECTION")} ${localizedDeckParts.get(deck.connectionId) || deck.connectionId}`);
      if (Array.isArray(deck.options) && deck.options.length > 0) {
        const optionText = deck.options.map((entry) => {
          const label = localizedDeckParts.get(entry.id) || entry.name || entry.id;
          const choice = entry.choiceId
            ? localizedDeckParts.get(`${entry.id}:${entry.choiceId}`) || entry.choiceName || entry.choiceId
            : null;
          return `${label}${choice ? `: ${choice}` : ""}${entry.quantity > 1 ? ` x${entry.quantity}` : ""}`;
        }).join(" // ");
        details.push(`${cartT("net.options", "OPTIONS")} ${optionText}`);
      }
      if (Array.isArray(deck.programIds) && deck.programIds.length > 0) {
        const loaded = deck.programIds
          .map((id) => localizedItems.get(String(id).toLowerCase())?.name || id)
          .join(", ");
        details.push(`${cartT("net.loaded", "LOADED")} ${loaded} (${deck.memoryUsed ?? "?"}/${deck.memory} MU)`);
      }
    }

    if (item.deck && typeof item.deck === "object") {
      const stats = item.deck.stats || {};
      const notListed = cartT("deck.not_listed", "Not listed");
      const valueOrMissing = (value, formatter = String) => (
        value === undefined || value === null ? notListed : formatter(value)
      );
      details.push(`${cartT("deck.speed", "SPEED")} ${valueOrMissing(stats.speed, (value) => `+${value}`)}`);
      details.push(`${cartT("deck.cpu", "CPU")} ${valueOrMissing(stats.cpu)}`);
      details.push(`${cartT("deck.memory", "MEMORY")} ${valueOrMissing(stats.memoryUnits, (value) => `${value} ${cartT("deck.mu", "MU")}`)}`);
      details.push(`${cartT("deck.data_wall", "DATA WALL")} ${valueOrMissing(stats.dataWall, (value) => `+${value}`)}`);
      if (item.deck.features?.cellular) details.push(cartT("deck.cellular_link", "CELLULAR LINK"));
      if (item.deck.features?.portable === true) details.push(cartT("deck.portable_unit", "PORTABLE UNIT"));
      const options = Array.isArray(item.deck.options)
        ? item.deck.options.map((option) => option?.label).filter(Boolean)
        : [];
      if (options.length > 0) details.push(`${cartT("deck.options", "OPTIONS")} ${options.join(" // ")}`);
    }

    if (Array.isArray(item.attributeBonuses) && item.attributeBonuses.length > 0) {
      const bonusText = item.attributeBonuses
        .map((bonus) => {
          const value = Number(bonus.value) || 0;
          const signal = value >= 0 ? "+" : "";
          return `${signal}${value} ${bonus.attribute}`;
        })
        .join(" | ");
      details.push(`${cartT("catalog.bonus", "BONUS")} ${bonusText}`);
    }

    if (Array.isArray(item.skillBonuses) && item.skillBonuses.length > 0) {
      const skillText = item.skillBonuses
        .map((bonus) => {
          const value = Number(bonus.value) || 0;
          const signal = value >= 0 ? "+" : "";
          return `${signal}${value} ${bonus.label || bonus.skill}`;
        })
        .join(" | ");
      details.push(`${cartT("catalog.skill", "SKILL")} ${skillText}`);
    }

    if (item.attributeSet && typeof item.attributeSet === "object") {
      const setText = Object.entries(item.attributeSet)
        .map(([attribute, value]) => `${attribute}=${value}`)
        .join(" | ");
      if (setText) details.push(`${cartT("catalog.set", "SET")} ${setText}`);
    }

    const reqs = item.installation?.requires;
    if (Array.isArray(reqs) && reqs.length > 0) {
      details.push(`${cartT("catalog.req", "REQ")} ${reqs.map(requirementLabel).join(", ")}`);
    }

    const reqAny = item.installation?.requiresAny;
    if (Array.isArray(reqAny) && reqAny.length > 0) {
      details.push(`${cartT("catalog.req_any", "REQ ANY")} ${reqAny.map(requirementLabel).join(" | ")}`);
    }

    const reqAnyGroups = item.installation?.requiresAnyGroups;
    if (Array.isArray(reqAnyGroups)) {
      reqAnyGroups.forEach((group) => {
        if (Array.isArray(group) && group.length > 0) {
          details.push(`${cartT("catalog.req_any", "REQ ANY")} ${group.map(requirementLabel).join(" | ")}`);
        }
      });
    }

    const slotUsage = Number(item.installation?.slotUsage);
    if (!Number.isNaN(slotUsage) && slotUsage > 0) {
      const family = item.installation?.slotFamily || item.installation?.slotProvider || "GENERIC";
      details.push(`${cartT("catalog.slots", "SLOTS")} ${slotUsage}@${requirementLabel(family)}`);
    }

    if (item.installation?.slotProvider) {
      const family = item.installation.slotFamily || item.installation.slotProvider;
      const capacity = Number(item.installation.slotCapacity);
      const suffix = Number.isFinite(capacity) ? ` (${capacity})` : "";
      details.push(`${cartT("catalog.provider", "PROVIDER")} ${requirementLabel(family)}${suffix}`);
    }

    const nestedProviders = item.installation?.provides;
    if (Array.isArray(nestedProviders)) {
      nestedProviders.forEach((provider) => {
        if (!provider || typeof provider !== "object" || !provider.slotFamily) return;
        const capacity = Number(provider.slotCapacity);
        const suffix = Number.isFinite(capacity) ? ` (${capacity})` : "";
        details.push(`${cartT("catalog.provider", "PROVIDER")} ${requirementLabel(provider.slotFamily)}${suffix}`);
      });
    }

    const compatibilityNotes = item.installation?.compatibilityNotes;
    if (Array.isArray(compatibilityNotes)) {
      compatibilityNotes.forEach((note) => {
        if (String(note || "").trim()) details.push(`${cartT("catalog.note", "NOTE")} ${note}`);
      });
    }

    if (item.alternativeAcquisition) details.push(cartT("catalog.alt_acq_short", "ALT ACQ"));
    if (item.maxPurchases) details.push(`${cartT("catalog.max", "MAX")} ${item.maxPurchases}`);
    if (item.Smartchipped) details.push(cartT("cart.smartchipped", "SMARTCHIPPED x2"));
    if (item.ammoOptionLabel && item.ammoOptionKey !== "base") {
      const ammoLabel = cartT(`catalog.${item.ammoOptionKey}`, item.ammoOptionLabel);
      if (item.ammoOptionPricingModel === "fixed") {
        details.push(`${cartT("cart.ammo_mod", "AMMO MOD")} ${ammoLabel} ${formatCurrency(item.ammoOptionFixedPrice || 0)}`);
      } else {
        details.push(`${cartT("cart.ammo_mod", "AMMO MOD")} ${ammoLabel} x${item.ammoOptionMultiplier}`);
      }
    }
    if (item.selectedPriceModifier) {
      const localizedGroup = item.modifierGroup;
      const localizedOption = localizedGroup?.options?.find(
        (option) => option.id === item.selectedPriceModifier.optionId,
      );
      const groupLabel = localizedGroup?.label || item.selectedPriceModifier.groupLabel || "Modifier";
      const optionLabel = localizedOption?.label || item.selectedPriceModifier.label;
      details.push(
        `${cartT("cart.price_modifier", "PRICE MODIFIER")} ${groupLabel}: ${optionLabel} x${item.selectedPriceModifier.multiplier}`,
      );
    }
    if (Number(item.quantity) > 1) {
      details.push(`${cartT("cart.quantity", "QUANTITY")} ${item.quantity}`);
    }
    if (details.length === 0) return "";

    return `<div class="cart-technical-info">${details.join("<br>")}</div>`;
  }

  function analyzeConsistency(cart) {
    if (window.CyberUtils) {
      return CyberUtils.analyzeConsistency(cart, { labels: dependencyLabels });
    }
    return { warnings: [] };
  }

  function lineCount(item) {
    return Math.max(1, Math.floor(Number(item?.cartCount) || 1));
  }

  function expandCart(cart) {
    return (Array.isArray(cart) ? cart : []).flatMap((item) => (
      Array.from({ length: lineCount(item) }, () => ({ ...item, cartCount: 1 }))
    ));
  }

  function changeLineCount(index, delta) {
    const cart = getStash();
    const item = cart[index];
    if (!item) return;
    const next = lineCount(item) + Number(delta || 0);
    if (next <= 0) cart.splice(index, 1);
    else item.cartCount = next;
    saveStash(cart);
  }

  function setLoadoutStatus(message, isError = false) {
    if (!ui.loadoutStatus) return;
    ui.loadoutStatus.textContent = message;
    ui.loadoutStatus.classList.toggle("is-error", isError);
  }

  function saveCurrentLoadout() {
    if (!window.CyberLoadouts) return;
    const cart = getStash();
    if (cart.length === 0) {
      setLoadoutStatus(cartT("loadout.no_items", "CURRENT LOADOUT IS EMPTY"), true);
      return;
    }
    const saved = window.CyberLoadouts.save(ui.loadoutName?.value, cart);
    if (ui.loadoutName) ui.loadoutName.value = saved.name;
    setLoadoutStatus(cartT("loadout.saved", `LOADOUT SAVED: ${saved.name}`, { name: saved.name }));
    renderSavedLoadouts();
  }

  async function importLoadoutFile(event) {
    const file = event?.target?.files?.[0];
    if (!file || !window.CyberLoadouts) return;
    try {
      const imported = window.CyberLoadouts.importToCart(await file.text());
      if (ui.loadoutName) ui.loadoutName.value = imported.name;
      setLoadoutStatus(cartT("loadout.imported", `JSON IMPORTED: ${imported.items.length} ITEMS`, { count: imported.items.length }));
      renderStash();
    } catch (error) {
      setLoadoutStatus(cartT("loadout.invalid", `INVALID FILE: ${error.message}`, { message: error.message }), true);
    } finally {
      event.target.value = "";
    }
  }

  function loadSavedLoadout(entry) {
    const apply = () => {
      const loaded = window.CyberLoadouts.load(entry.id);
      if (!loaded) return;
      if (ui.loadoutName) ui.loadoutName.value = loaded.name;
      setLoadoutStatus(cartT("loadout.loaded", `LOADOUT LOADED: ${loaded.name}`, { name: loaded.name }));
      renderStash();
    };
    if (getStash().length > 0 && typeof Modal !== "undefined" && Modal?.confirm) {
      Modal.confirm(
        cartT("loadout.replace_title", "REPLACE CURRENT LOADOUT?"),
        cartT("loadout.replace_message", `Loading ${entry.name} will replace the current loadout.`, { name: entry.name }),
        apply,
      );
    } else apply();
  }

  function removeSavedLoadout(entry) {
    const remove = () => {
      window.CyberLoadouts.remove(entry.id);
      setLoadoutStatus(cartT("loadout.removed", `LOADOUT REMOVED: ${entry.name}`, { name: entry.name }));
      renderSavedLoadouts();
    };
    if (typeof Modal !== "undefined" && Modal?.confirm) {
      Modal.confirm(
        cartT("loadout.delete_title", "DELETE SAVED LOADOUT?"),
        cartT("loadout.delete_message", `${entry.name} will be removed from the local vault.`, { name: entry.name }),
        remove,
      );
    } else remove();
  }

  function renderSavedLoadouts() {
    if (!ui.savedLoadouts || !window.CyberLoadouts) return;
    const entries = window.CyberLoadouts.list();
    if (ui.loadoutCount) {
      ui.loadoutCount.textContent = cartT("loadout.saved_count", `${entries.length} SAVED`, { count: entries.length });
    }
    ui.savedLoadouts.replaceChildren();
    if (entries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "saved-loadout-empty";
      empty.textContent = cartT("loadout.empty", "NO SAVED LOADOUTS ON THIS DEVICE");
      ui.savedLoadouts.appendChild(empty);
      return;
    }
    entries.forEach((entry) => {
      const row = document.createElement("article");
      row.className = "saved-loadout";
      const name = document.createElement("div");
      name.className = "saved-loadout-name";
      const title = document.createElement("strong");
      title.textContent = entry.name;
      const meta = document.createElement("small");
      meta.textContent = cartT("loadout.item_count", "{count} ITEMS", {
        count: entry.items.reduce((sum, item) => sum + lineCount(item), 0),
      });
      name.append(title, meta);

      const loadButton = document.createElement("button");
      loadButton.type = "button";
      loadButton.className = "btn-primary";
      loadButton.textContent = cartT("loadout.load", "LOAD");
      loadButton.onclick = () => loadSavedLoadout(entry);

      const exportButton = document.createElement("button");
      exportButton.type = "button";
      exportButton.className = "btn-secondary";
      exportButton.textContent = cartT("loadout.export", "EXPORT");
      exportButton.onclick = () => window.CyberLoadouts.download(
        entry,
        localStorage.getItem("cyber_runner_id") || "UNKNOWN_RUNNER",
      );

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "btn-danger";
      deleteButton.textContent = cartT("loadout.delete", "DELETE");
      deleteButton.onclick = () => removeSavedLoadout(entry);
      row.append(name, loadButton, exportButton, deleteButton);
      ui.savedLoadouts.appendChild(row);
    });
  }

  function removeItem(index) {
    const cart = getStash();
    cart.splice(index, 1);
    saveStash(cart);
  }

  function burnStash() {
    Modal.confirm(
    cartT("cart.burn_title", "BURN STASH?"), 
    cartT("cart.burn_message", "Are you sure you want to wipe memory banks?<br>This action cannot be undone."),
    () => { // Callback do SIM
        localStorage.removeItem(STORAGE_KEY);
        renderStash();
    }
);
  }

  function exportDataChip() {
    const cart = getStash();
    if (cart.length === 0) return;

    // Recupera o ID salvo no Login, ou usa "UNKNOWN" se não tiver
    const runnerID =
      localStorage.getItem("cyber_runner_id") || "UNKNOWN_RUNNER";

    const totalCost = cart.reduce((acc, item) => acc + (item.price || 0) * lineCount(item), 0);
    const totalHL = cart.reduce((acc, item) => acc + (Number(item.hl) || 0) * lineCount(item), 0);

    const exportData = {
      runner_id: runnerID, // <--- AQUI ESTÁ A MUDANÇA
      timestamp: new Date().toISOString(),
      summary: {
        total_cost: totalCost,
        total_humanity_loss: totalHL,
        item_count: cart.reduce((count, item) => count + lineCount(item), 0),
        consistency_warnings: analyzeConsistency(expandCart(cart)).warnings,
      },
      items: cart,
    };

    const dataStr = JSON.stringify(exportData, null, 4);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    // Nome do arquivo agora inclui o nome do runner
    a.download = `STASH_${runnerID}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function formatCurrency(val) {
    if (window.CyberUtils) return CyberUtils.formatCurrency(val);
    return Number(val || 0).toLocaleString(window.I18n?.getLocale?.() || "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " eb";
  }
});
