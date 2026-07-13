/**
 * BYTE & BLADES - STASH MODULE V3.1 (NO_EMOJI)
 * "Stash your loot. Export your run file."
 */

const STORAGE_KEY = "cyber_cart";

document.addEventListener("DOMContentLoaded", () => {
  const ui = {
    list: document.getElementById("cart-list"),
    total: document.getElementById("cart-total-value"),
    clearBtn: document.getElementById("cart-clear"),
    exportBtn: document.getElementById("cart-export"),
    emptyMsg: document.getElementById("empty-cart-msg"),
  };

  renderStash();

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

  function renderStash() {
    if (!ui.list) return;

    const cart = getStash();
    ui.list.innerHTML = "";

    // Empty State
    if (cart.length === 0) {
      if (ui.emptyMsg) ui.emptyMsg.classList.remove("hidden");
      if (ui.total) ui.total.textContent = "TOTAL: 0.00 eb | HL: 0";
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
      totalCost += item.price || 0;

      const itemHL = Number(item.hl) || 0;
      totalHL += itemHL;

      const row = document.createElement("div");
      row.className = "cart-item";

      // Formatando o texto do HL no item
      let hlText = "";
      if (itemHL > 0) {
        hlText = `<span style="color:var(--secondary-color); margin-left:10px;">[HL: ${itemHL}]</span>`;
        // Se quiser mostrar o log da rolagem, descomente abaixo:
        // if (item.hlLog) hlText += `<small style="font-size:0.7em; color:#666">${item.hlLog}</small>`;
      }

        let bundleTag = "";
        if (item.bundleId && item.bundleDiscountPct) {
        const bundleName = item.bundleTitle || "Bundle";
        bundleTag = `<span style="color:var(--primary-color); margin-left:10px;">[BUNDLE SYNC: ${bundleName} -${item.bundleDiscountPct}%]</span>`;
        }

      row.innerHTML = `
                <div style="flex:1">
                    <h3 style="margin:0; color:var(--primary-color); font-size:1.1rem; text-transform:uppercase; letter-spacing:1px;">
                        ${item.name}
                    </h3>
                    <small style="color:#666; font-family:monospace;">
                        TYPE: ${item.category || "UNKNOWN"} 
                        ${hlText}
                ${bundleTag}
                    </small>
              ${renderTechnicalInfo(item)}
                </div>
                <div style="text-align:right; margin:0 15px; font-weight:bold; color:#fff;">
                    ${formatCurrency(item.price)}
                </div>
            `;

      const delBtn = document.createElement("button");
      delBtn.className = "btn-danger";
      delBtn.innerHTML = "TRASH IT";
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
        hackBtn.innerHTML = "☠ BREACH PROTOCOL";
        hackBtn.style.marginLeft = "10px";

        hackBtn.onclick = () => {
          HackSystem.init((success) => {
            if (success) {
              sessionStorage.setItem("cart_hacked", "true");
              Modal.alert(
                "SYSTEM BREACH SUCCESSFUL",
                "Corp escrow spoofed.<br><span style='color:var(--neon-green)'>20% DISCOUNT APPLIED.</span>",
              );
            } else {
              sessionStorage.setItem("cart_burned", "true");
              Modal.alert(
                "BREACH DETECTED",
                "Netwatch trace completed.<br><span style='color:var(--alert-color)'>10% PENALTY FEE ADDED.</span>",
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
          title: item.bundleTitle || "Bundle",
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
        .map((entry) => `[BUNDLE SYNC: ${entry.title} -${entry.discountPct}%]`)
        .join("<br>");

      extraStatus += `<span style="color:var(--primary-color); display:block; font-size:0.6em; margin-top:4px;">${immersiveTags}</span>`;
      extraStatus += `<span style="color:#8fdfff; display:block; font-size:0.6em;">DISCOUNT OFFSET: -${formatCurrency(bundleDiscountValue)}</span>`;
    }

    if (isHacked) {
      discountedCost *= 0.8;
      extraStatus += `<span style="color:var(--neon-green); display:block; font-size:0.6em;">[ HACKED: -20% ]</span>`;
    } else if (isBurned) {
      discountedCost *= 1.1;
      extraStatus += `<span style="color:var(--alert-color); display:block; font-size:0.6em;">[ TRACED: +10% FEE ]</span>`;
    }

    // Atualiza Footer com Preço E Humanidade
    if (ui.total) {
      ui.total.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:flex-end;">
                    <div><span style="color:#fff">COST:</span> ${formatCurrency(discountedCost)}</div>
                    ${extraStatus}
                    <div style="color:var(--secondary-color); margin-top:5px;">TOTAL HL: ${totalHL}</div>
                    ${consistency.warnings.length > 0
    ? `<div style="margin-top:8px; color:var(--alert-color); font-size:0.62rem; text-align:right;">WARNINGS:<br>${consistency.warnings.map((w) => `- ${w}`).join("<br>")}</div>`
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
      details.push(`BONUS ${bonusText}`);
    }

    if (Array.isArray(item.skillBonuses) && item.skillBonuses.length > 0) {
      const skillText = item.skillBonuses
        .map((bonus) => {
          const value = Number(bonus.value) || 0;
          const signal = value >= 0 ? "+" : "";
          return `${signal}${value} ${bonus.skill}`;
        })
        .join(" | ");
      details.push(`SKILL ${skillText}`);
    }

    if (item.attributeSet && typeof item.attributeSet === "object") {
      const setText = Object.entries(item.attributeSet)
        .map(([attribute, value]) => `${attribute}=${value}`)
        .join(" | ");
      if (setText) details.push(`SET ${setText}`);
    }

    const reqs = item.installation?.requires;
    if (Array.isArray(reqs) && reqs.length > 0) {
      details.push(`REQ ${reqs.join(", ")}`);
    }

    const reqAny = item.installation?.requiresAny;
    if (Array.isArray(reqAny) && reqAny.length > 0) {
      details.push(`REQ ANY ${reqAny.join(" | ")}`);
    }

    const slotUsage = Number(item.installation?.slotUsage);
    if (!Number.isNaN(slotUsage) && slotUsage > 0) {
      const family = item.installation?.slotFamily || item.installation?.slotProvider || "GENERIC";
      details.push(`SLOTS ${slotUsage}@${family}`);
    }

    if (item.alternativeAcquisition) details.push("ALT ACQ");
    if (item.maxPurchases) details.push(`MAX ${item.maxPurchases}`);
    if (details.length === 0) return "";

    return `<div style="margin-top:6px; color:#8fdfff; font-size:0.62rem; line-height:1.4; font-family:monospace;">${details.join("<br>")}</div>`;
  }

  function analyzeConsistency(cart) {
    const warnings = [];
    const installedIds = new Set(
      cart
        .map((item) => String(item.id || "").trim().toLowerCase())
        .filter(Boolean),
    );

    const slotCapacityByFamily = new Map();
    const slotUsageByFamily = new Map();
    const purchasesById = new Map();

    cart.forEach((item) => {
      const installation = item.installation || {};
      const itemId = String(item.id || "").trim().toLowerCase();
      if (itemId) {
        purchasesById.set(itemId, (purchasesById.get(itemId) || 0) + 1);
      }

      const providerFamily = String(
        installation.slotFamily || installation.slotProvider || item.id || "",
      )
        .trim()
        .toLowerCase();

      const capacity = Number(installation.slotCapacity);
      if (providerFamily && !Number.isNaN(capacity) && capacity >= 0) {
        slotCapacityByFamily.set(providerFamily, (slotCapacityByFamily.get(providerFamily) || 0) + capacity);
      }

      const usage = Number(installation.slotUsage);
      const usageFamily = String(
        installation.slotFamily || installation.slotProvider || "",
      )
        .trim()
        .toLowerCase();
      if (usageFamily && !Number.isNaN(usage) && usage > 0) {
        slotUsageByFamily.set(usageFamily, (slotUsageByFamily.get(usageFamily) || 0) + usage);
      }

      const reqs = Array.isArray(installation.requires) ? installation.requires : [];
      reqs.forEach((req) => {
        const reqId = String(req || "").trim().toLowerCase();
        if (reqId && !installedIds.has(reqId)) {
          warnings.push(`${item.name}: missing ${req}`);
        }
      });

      const reqAny = Array.isArray(installation.requiresAny) ? installation.requiresAny : [];
      if (reqAny.length > 0) {
        const hasAny = reqAny.some((req) => installedIds.has(String(req || "").trim().toLowerCase()));
        if (!hasAny) {
          warnings.push(`${item.name}: missing one of [${reqAny.join(", ")}]`);
        }
      }
    });

    cart.forEach((item) => {
      const itemId = String(item.id || "").trim().toLowerCase();
      const maxPurchases = Number(item.maxPurchases);
      if (!itemId || Number.isNaN(maxPurchases) || maxPurchases <= 0) return;

      const count = purchasesById.get(itemId) || 0;
      if (count > maxPurchases) {
        warnings.push(`${item.name}: max exceeded (${count}/${maxPurchases})`);
      }
    });

    slotUsageByFamily.forEach((used, family) => {
      const capacity = slotCapacityByFamily.get(family) || 0;
      if (used > capacity) {
        warnings.push(`${family} slots overflow (${used}/${capacity})`);
      }
    });

    return { warnings };
  }

  function removeItem(index) {
    const cart = getStash();
    cart.splice(index, 1);
    saveStash(cart);
  }

  function burnStash() {
    Modal.confirm(
    "BURN STASH?", 
    "Are you sure you want to wipe memory banks?<br>This action cannot be undone.",
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
    return ((val || 0).toLocaleString("en-US", { style: "currency", currency: "USD" }).replace("$", "") + " eb");
  }
});
