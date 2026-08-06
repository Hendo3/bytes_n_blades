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
  const ui = {
    list: document.getElementById("cart-list"),
    total: document.getElementById("cart-total-value"),
    clearBtn: document.getElementById("cart-clear"),
    exportBtn: document.getElementById("cart-export"),
    emptyMsg: document.getElementById("empty-cart-msg"),
  };

  renderStash();
  hydrateRequirementLabels().then(renderStash).catch(() => {});

  if (ui.clearBtn) ui.clearBtn.onclick = burnStash;
  if (ui.exportBtn) ui.exportBtn.onclick = exportDataChip;

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
  }

  async function hydrateRequirementLabels() {
    const sources = window.I18n
      ? [
          ["catalog", cartDataPath("../data/cyberwares.json")],
          ["catalog", cartDataPath("../data/equipment.json")],
          ["weapons", cartDataPath("../data/weapons.json")],
          ["drugs", cartDataPath("../data/drugs.json")],
          ["chips", cartDataPath("../data/chip-rates.json")],
        ]
      : [
          ["catalog", "../data/cyberwares.json"],
          ["catalog", "../data/equipment.json"],
        ];
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
    return localizedItems.get(String(item.id || "").trim().toLowerCase()) || item;
  }

  function localizedBundleTitle(item) {
    if (!item.bundleTitleKey) return item.bundleTitle || cartT("common.bundle", "Bundle");
    const baseTitle = cartT(item.bundleTitleKey, item.bundleTitle || "Bundle");
    const signature = item.bundleSignatureKey
      ? cartT(item.bundleSignatureKey, "")
      : "";
    return signature ? `${baseTitle} // ${signature}` : baseTitle;
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
      if (ui.exportBtn) {
        ui.exportBtn.disabled = true;
        ui.exportBtn.style.opacity = "0.5";
      }
      return;
    } else {
      if (ui.emptyMsg) ui.emptyMsg.classList.add("hidden");
      if (ui.exportBtn) {
        ui.exportBtn.disabled = false;
        ui.exportBtn.style.opacity = "1";
      }
    }

    let totalCost = 0;
    let totalHL = 0;
    const isHacked = sessionStorage.getItem("cart_hacked") === "true";
    const isBurned = sessionStorage.getItem("cart_burned") === "true";
    const fragment = document.createDocumentFragment();

    cart.forEach((item, index) => {
      const displayItem = localizedDisplay(item);
      totalCost += item.price || 0;

      const itemHL = Number(item.hl) || 0;
      totalHL += itemHL;

      const row = document.createElement("div");
      row.className = "cart-item";

      // Formatando o texto do HL no item
      let hlText = "";
      if (itemHL > 0) {
        hlText = `<span style="color:var(--secondary-color); margin-left:10px;">[${window.I18n?.isPtBr?.() ? "PH" : "HL"}: ${itemHL}]</span>`;
        // Se quiser mostrar o log da rolagem, descomente abaixo:
        // if (item.hlLog) hlText += `<small style="font-size:0.7em; color:#666">${item.hlLog}</small>`;
      }

        let bundleTag = "";
        if (item.bundleId && item.bundleDiscountPct) {
        const bundleName = localizedBundleTitle(item);
        bundleTag = `<span style="color:var(--primary-color); margin-left:10px;">[${cartT("cart.bundle_sync", "BUNDLE SYNC")}: ${bundleName} -${item.bundleDiscountPct}%]</span>`;
        }

      row.innerHTML = `
                <div style="flex:1">
                    <h3 style="margin:0; color:var(--primary-color); font-size:1.1rem; text-transform:uppercase; letter-spacing:1px;">
                        ${displayItem.name || item.name}
                    </h3>
                    <small style="color:#666; font-family:monospace;">
                        ${cartT("cart.type", "TYPE")}: ${displayItem.categoryLabel || item.categoryLabel || item.category || cartT("common.unknown", "UNKNOWN")} 
                        ${hlText}
                ${bundleTag}
                    </small>
              ${renderTechnicalInfo({ ...item, installation: displayItem.installation || item.installation })}
                </div>
                <div style="text-align:right; margin:0 15px; font-weight:bold; color:#fff;">
                    ${formatCurrency(item.price)}
                </div>
            `;

      const delBtn = document.createElement("button");
      delBtn.className = "btn-danger";
      delBtn.textContent = cartT("cart.trash", "TRASH IT");
      delBtn.style.padding = "5px 10px";
      delBtn.style.fontSize = "0.7rem";
      delBtn.onclick = () => removeItem(index);

      row.appendChild(delBtn);
      fragment.appendChild(row);
    });

    ui.list.appendChild(fragment);

    if (cart.length > 0 && !isHacked && !isBurned) {
      let hackBtn = document.getElementById("cart-hack-btn");
      if (!hackBtn) {
        hackBtn = document.createElement("button");
        hackBtn.id = "cart-hack-btn";
        hackBtn.className = "btn-secondary";
        hackBtn.style.borderColor = "var(--alert-color)";
        hackBtn.style.color = "var(--alert-color)";
        hackBtn.textContent = cartT("cart.breach", "BREACH PROTOCOL");
        hackBtn.style.marginLeft = "10px";

        hackBtn.onclick = () => {
          HackSystem.init((success) => {
            if (success) {
              sessionStorage.setItem("cart_hacked", "true");
              Modal.alert(
                cartT("cart.breach_success", "SYSTEM BREACH SUCCESSFUL"),
                cartT("cart.breach_success_message", "Corp escrow spoofed.<br><span style='color:var(--neon-green)'>20% DISCOUNT APPLIED.</span>"),
              );
            } else {
              sessionStorage.setItem("cart_burned", "true");
              Modal.alert(
                cartT("cart.breach_failed", "BREACH DETECTED"),
                cartT("cart.breach_failed_message", "Netwatch trace completed.<br><span style='color:var(--alert-color)'>10% PENALTY FEE ADDED.</span>"),
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
      entry.subtotal += item.price || 0;
    });

    const bundleDiscountValue = Array.from(bundleMeta.values()).reduce(
      (sum, entry) => sum + entry.subtotal * (entry.discountPct / 100),
      0,
    );

    const consistency = analyzeConsistency(cart);

    let discountedCost = totalCost - bundleDiscountValue;
    let extraStatus = "";

    if (bundleMeta.size > 0) {
      const immersiveTags = Array.from(bundleMeta.values())
        .map((entry) => `[${cartT("cart.bundle_sync", "BUNDLE SYNC")}: ${entry.title} -${entry.discountPct}%]`)
        .join("<br>");

      extraStatus += `<span style="color:var(--primary-color); display:block; font-size:0.6em; margin-top:4px;">${immersiveTags}</span>`;
      extraStatus += `<span style="color:#8fdfff; display:block; font-size:0.6em;">${cartT("cart.discount_offset", "DISCOUNT OFFSET")}: -${formatCurrency(bundleDiscountValue)}</span>`;
    }

    if (isHacked) {
      discountedCost *= 0.8;
      extraStatus += `<span style="color:var(--neon-green); display:block; font-size:0.6em;">[ ${cartT("cart.hacked", "HACKED: -20%")} ]</span>`;
    } else if (isBurned) {
      discountedCost *= 1.1;
      extraStatus += `<span style="color:var(--alert-color); display:block; font-size:0.6em;">[ ${cartT("cart.traced", "TRACED: +10% FEE")} ]</span>`;
    }

    // Atualiza Footer com Preço E Humanidade
    if (ui.total) {
      ui.total.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:flex-end;">
                    <div><span style="color:#fff">${cartT("cart.cost", "COST")}:</span> ${formatCurrency(discountedCost)}</div>
                    ${extraStatus}
                    <div style="color:var(--secondary-color); margin-top:5px;">${cartT("cart.total_hl", "TOTAL HL")}: ${totalHL}</div>
                    ${consistency.warnings.length > 0
    ? `<div style="margin-top:8px; color:var(--alert-color); font-size:0.62rem; text-align:right;">${cartT("cart.warnings", "WARNINGS")}:<br>${consistency.warnings.map((w) => `- ${w}`).join("<br>")}</div>`
    : ""}
                </div>
            `;
    }
  }

  function renderTechnicalInfo(item) {
    const details = [];

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
    if (details.length === 0) return "";

    return `<div style="margin-top:6px; color:#8fdfff; font-size:0.62rem; line-height:1.4; font-family:monospace;">${details.join("<br>")}</div>`;
  }

  function analyzeConsistency(cart) {
    if (window.CyberUtils) {
      return CyberUtils.analyzeConsistency(cart, { labels: dependencyLabels });
    }
    return { warnings: [] };
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

    const totalCost = cart.reduce((acc, i) => acc + (i.price || 0), 0);
    const totalHL = cart.reduce((acc, i) => acc + (Number(i.hl) || 0), 0);

    const exportData = {
      runner_id: runnerID, // <--- AQUI ESTÁ A MUDANÇA
      timestamp: new Date().toISOString(),
      summary: {
        total_cost: totalCost,
        total_humanity_loss: totalHL,
        item_count: cart.length,
        consistency_warnings: analyzeConsistency(cart).warnings,
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
