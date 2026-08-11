(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const tr = (key, fallback, params = {}) => root.I18n
    ? root.I18n.t(key, params, fallback)
    : fallback.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name) => params[name] ?? `{${name}}`);
  function parseNumeric(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;

    const text = String(value || "");
    const matches = text.match(/\d+(?:\.\d+)?/g);
    if (!matches || matches.length === 0) return 0;

    const numbers = matches
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));

    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  function formatCurrency(value) {
    const safe = Number(value) || 0;
    const locale = root.I18n?.getLocale?.() || "en-US";
    return (
      safe
        .toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " eb"
    );
  }

  function normalizeName(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeId(value) {
    return String(value || "").trim().toLowerCase();
  }

  function humanizeId(value) {
    return String(value || "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_:-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function stringList(value) {
    return Array.isArray(value)
      ? value.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
  }

  function itemIds(item) {
    return [item?.id, ...stringList(item?.legacyIds)]
      .map(normalizeId)
      .filter(Boolean);
  }

  function resolveRequirementLabel(id, labels) {
    const normalized = normalizeId(id);
    if (labels instanceof Map) {
      return labels.get(normalized) || humanizeId(id);
    }
    if (labels && typeof labels === "object") {
      return labels[normalized] || labels[id] || humanizeId(id);
    }
    return humanizeId(id);
  }

  function flattenCatalog(payload, sourceCatalog = "cyberwares") {
    const catalog = payload?.data || payload || {};
    const items = [];

    Object.entries(catalog).forEach(([categoryKey, category]) => {
      if (!category || typeof category !== "object") return;
      const rawItems = category.itens || category.items || category.list || {};

      Object.entries(rawItems).forEach(([key, rawItem]) => {
        if (!rawItem || typeof rawItem !== "object") return;
        items.push({
          ...rawItem,
          id: rawItem.id || key,
          legacyIds: stringList(rawItem.legacyIds),
          name: rawItem.name || humanizeId(key),
          price: parseNumeric(rawItem.price ?? rawItem.cost ?? rawItem.value),
          hl: rawItem.HL ?? rawItem.hl ?? rawItem.humanity ?? "0",
          category: categoryKey,
          categoryLabel: category.name || categoryKey,
          sourceCatalog,
          tags: Array.isArray(rawItem.tags) ? rawItem.tags : [],
          maxPurchases: Number(rawItem.maxPurchases) || null,
          alternativeAcquisition: Boolean(rawItem.alternativeAcquisition),
          attributeBonuses: Array.isArray(rawItem.attributeBonuses) ? rawItem.attributeBonuses : [],
          skillBonuses: Array.isArray(rawItem.skillBonuses) ? rawItem.skillBonuses : [],
          attributeSet: rawItem.attributeSet && typeof rawItem.attributeSet === "object"
            ? rawItem.attributeSet
            : null,
          priceModifiers: Array.isArray(rawItem.priceModifiers) ? rawItem.priceModifiers : [],
          installation: rawItem.installation && typeof rawItem.installation === "object"
            ? rawItem.installation
            : null,
        });
      });
    });

    return items;
  }

  function createCatalogIndex(items) {
    const byId = new Map();
    (Array.isArray(items) ? items : []).forEach((item) => {
      itemIds(item).forEach((id) => {
        if (!byId.has(id)) byId.set(id, item);
      });
    });
    return {
      items: Array.isArray(items) ? items : [],
      findById(id) {
        return byId.get(normalizeId(id)) || null;
      },
    };
  }

  function providerCapacityFor(item, family) {
    const installation = item?.installation || {};
    const normalizedFamily = normalizeId(family);
    const capacities = [];
    const register = (provider) => {
      if (normalizeId(provider?.slotFamily) !== normalizedFamily) return;
      const capacity = Number(provider.slotCapacity);
      capacities.push(Number.isFinite(capacity) ? capacity : Number.POSITIVE_INFINITY);
    };

    if (installation.slotProvider) {
      register({
        slotFamily: installation.slotFamily || installation.slotProvider,
        slotCapacity: installation.slotCapacity,
      });
    }
    if (Array.isArray(installation.provides)) installation.provides.forEach(register);
    return capacities.length > 0 ? Math.max(...capacities) : 0;
  }

  function resolveInstallationPlan(target, cart, catalogItems) {
    const installed = Array.isArray(cart) ? cart : [];
    const candidates = Array.isArray(catalogItems) ? catalogItems : [];
    const index = createCatalogIndex([target, ...candidates].filter(Boolean));
    const planned = [];
    const unresolved = [];
    const unresolvedKeys = new Set();
    const resolving = new Set();

    const allWorkingItems = (extra = []) => [...installed, ...planned, ...extra];
    const isPresent = (id) => allWorkingItems().some((item) => itemIds(item).includes(normalizeId(id)));
    const purchaseCount = (item) => {
      const id = normalizeId(item?.id);
      return allWorkingItems().filter((entry) => itemIds(entry).includes(id)).length;
    };
    const canAdd = (item) => {
      const limit = Number(item?.maxPurchases);
      return !Number.isFinite(limit) || limit <= 0 || purchaseCount(item) < limit;
    };
    const addUnresolved = (key) => {
      if (!unresolvedKeys.has(key)) {
        unresolvedKeys.add(key);
        unresolved.push(key);
      }
    };
    const isResolving = (id) => {
      const found = index.findById(id);
      return resolving.has(normalizeId(found?.id || id));
    };
    const slotTotals = (family, extra = []) => {
      let used = 0;
      let capacity = 0;
      let unbounded = false;
      allWorkingItems(extra).forEach((item) => {
        const installation = item?.installation || {};
        if (normalizeId(installation.slotFamily || installation.slotProvider) === family) {
          const usage = Number(installation.slotUsage);
          if (Number.isFinite(usage) && usage > 0) used += usage;
        }
        const itemCapacity = providerCapacityFor(item, family);
        if (itemCapacity === Number.POSITIVE_INFINITY) unbounded = true;
        else capacity += itemCapacity;
      });
      return { used, capacity: unbounded ? Number.POSITIVE_INFINITY : capacity };
    };
    const alternativeGroups = (installation) => {
      const groups = [];
      const directGroup = stringList(installation?.requiresAny);
      if (directGroup.length > 0) groups.push(directGroup);
      if (Array.isArray(installation?.requiresAnyGroups)) {
        installation.requiresAnyGroups.forEach((group) => {
          const values = stringList(group);
          if (values.length > 0) groups.push(values);
        });
      }
      return groups;
    };

    function chooseAlternative(ids, consumer) {
      const family = normalizeId(consumer?.installation?.slotFamily);
      const usage = Number(consumer?.installation?.slotUsage);
      const available = ids
        .map((id) => index.findById(id))
        .filter((item) => item && !isResolving(item.id) && canAdd(item));
      if (family && Number.isFinite(usage) && usage > 0) {
        const provider = available.find((item) => providerCapacityFor(item, family) > 0);
        if (provider) return provider;
      }
      return available[0] || null;
    }

    function ensureSlotProvider(consumer) {
      const installation = consumer?.installation || {};
      const family = normalizeId(installation.slotFamily || installation.slotProvider);
      const usage = Number(installation.slotUsage);
      if (!family || !Number.isFinite(usage) || usage <= 0) return;

      let safety = 0;
      while (safety < 100) {
        const totals = slotTotals(family, [consumer]);
        if (totals.capacity >= totals.used) return;

        const preferredIds = alternativeGroups(installation).flat();
        const preferred = preferredIds
          .map((id) => index.findById(id))
          .filter(Boolean);
        const providers = [...preferred, ...index.items]
          .filter((item, position, list) => list.indexOf(item) === position)
          .filter((item) => !isResolving(item.id) && canAdd(item) && providerCapacityFor(item, family) > 0);
        const provider = providers[0];
        if (!provider) {
          addUnresolved(`provider:${family}`);
          return;
        }

        const before = planned.length;
        ensureItem(provider, { forceInstance: true });
        if (planned.length === before) {
          addUnresolved(`provider:${family}`);
          return;
        }
        safety += 1;
      }
      addUnresolved(`provider:${family}`);
    }

    function ensureItem(item, options = {}) {
      if (!item) return;
      const id = normalizeId(item.id || item.name);
      if (!options.forceInstance && isPresent(id)) return;
      if (resolving.has(id)) return;
      if (!options.requested && !canAdd(item)) {
        addUnresolved(`max:${id}`);
        return;
      }

      resolving.add(id);
      const installation = item.installation || {};
      stringList(installation.requires).forEach((requiredId) => {
        if (isPresent(requiredId) || isResolving(requiredId)) return;
        const requiredItem = index.findById(requiredId);
        if (requiredItem) ensureItem(requiredItem);
        else addUnresolved(`missing:${normalizeId(requiredId)}`);
      });

      alternativeGroups(installation).forEach((group) => {
        if (group.some((idValue) => isPresent(idValue) || isResolving(idValue))) return;
        const choice = chooseAlternative(group, item);
        if (choice) ensureItem(choice);
        else addUnresolved(`missing-any:${group.map(normalizeId).join("|")}`);
      });

      ensureSlotProvider(item);
      resolving.delete(id);
      planned.push(item);
    }

    if (target) ensureItem(target, { forceInstance: true, requested: true });
    else addUnresolved("missing:target");

    return {
      ok: unresolved.length === 0,
      items: planned,
      dependencies: planned.filter((item) => item !== target),
      unresolved,
    };
  }

  function createCartEntry(item, options = {}) {
    const hlRaw = item?.hl ?? item?.HL ?? item?.humanity ?? "0";
    const hlRoll = rollHL(hlRaw);
    return {
      id: item?.id,
      legacyIds: stringList(item?.legacyIds),
      name: item?.name || humanizeId(item?.id),
      price: Number.isFinite(Number(item?.price)) ? Number(item.price) : parseNumeric(item?.price),
      basePrice: Number.isFinite(Number(item?.price)) ? Number(item.price) : parseNumeric(item?.price),
      category: item?.category,
      categoryLabel: item?.categoryLabel || item?.category,
      sourceCatalog: item?.sourceCatalog || "cyberwares",
      locale: root.I18n?.getLocale?.() || "en-US",
      hl: hlRoll.value,
      hlOriginal: hlRaw,
      hlRaw,
      hlLog: hlRoll.log,
      tags: Array.isArray(item?.tags) ? item.tags : [],
      maxPurchases: Number(item?.maxPurchases) || null,
      alternativeAcquisition: Boolean(item?.alternativeAcquisition),
      attributeBonuses: Array.isArray(item?.attributeBonuses) ? item.attributeBonuses : [],
      skillBonuses: Array.isArray(item?.skillBonuses) ? item.skillBonuses : [],
      attributeSet: item?.attributeSet && typeof item.attributeSet === "object" ? item.attributeSet : null,
      priceModifiers: Array.isArray(item?.priceModifiers) ? item.priceModifiers : [],
      installation: item?.installation || null,
      note: item?.note || null,
      localization: item?.localization || null,
      assistedInstallation: true,
      autoAdded: Boolean(options.autoAdded),
      autoInstalledFor: options.autoInstalledFor || item?.id || null,
    };
  }

  function appendCartItems(items, storageKey = "cyber_cart") {
    const additions = Array.isArray(items) ? items : [];
    const current = safeGetArray(storageKey);
    const stored = additions.map((item) => ({
      ...item,
      uid: Date.now() + Math.random().toString(16).slice(2),
    }));
    root.localStorage.setItem(storageKey, JSON.stringify([...current, ...stored]));
    root.dispatchEvent(new root.Event("stash-updated"));
    return stored;
  }

  function analyzeConsistency(items, options = {}) {
    const cart = Array.isArray(items) ? items : [];
    const labels = options.labels;
    const warnings = [];
    const warningKeys = new Set();
    const installedIds = new Set(cart.flatMap(itemIds));
    const purchasesById = new Map();
    const providerState = new Map();
    const slotUsageByFamily = new Map();

    function addWarning(key, message) {
      if (warningKeys.has(key)) return;
      warningKeys.add(key);
      warnings.push(message);
    }

    function registerProvider(provider) {
      if (!provider || typeof provider !== "object") return;
      const family = normalizeId(provider.slotFamily);
      if (!family) return;

      if (!providerState.has(family)) {
        providerState.set(family, {
          count: 0,
          finiteCapacity: 0,
          hasUnboundedCapacity: false,
        });
      }

      const state = providerState.get(family);
      state.count += 1;

      if (provider.slotCapacity === undefined || provider.slotCapacity === null) {
        state.hasUnboundedCapacity = true;
        return;
      }

      const capacity = Number(provider.slotCapacity);
      if (Number.isFinite(capacity) && capacity >= 0) {
        state.finiteCapacity += capacity;
      }
    }

    cart.forEach((item) => {
      const itemId = normalizeId(item?.id);
      if (itemId) {
        purchasesById.set(itemId, (purchasesById.get(itemId) || 0) + 1);
      }

      const installation = item?.installation || {};
      if (installation.slotProvider || installation.slotCapacity !== undefined) {
        registerProvider({
          slotFamily: installation.slotFamily || installation.slotProvider || item?.id,
          slotCapacity: installation.slotCapacity,
        });
      }
      if (Array.isArray(installation.provides)) {
        installation.provides.forEach(registerProvider);
      }

      const usage = Number(installation.slotUsage);
      const usageFamily = normalizeId(
        installation.slotFamily || installation.slotProvider,
      );
      if (usageFamily && Number.isFinite(usage) && usage > 0) {
        slotUsageByFamily.set(
          usageFamily,
          (slotUsageByFamily.get(usageFamily) || 0) + usage,
        );
      }
    });

    cart.forEach((item) => {
      const installation = item?.installation || {};
      const itemName = item?.name || humanizeId(item?.id || "item");

      stringList(installation.requires).forEach((requiredId) => {
        const normalized = normalizeId(requiredId);
        if (!installedIds.has(normalized)) {
          addWarning(
            `required:${normalizeId(item?.id)}:${normalized}`,
            tr("consistency.missing", `${itemName}: missing ${resolveRequirementLabel(requiredId, labels)}`, {
              item: itemName,
              requirement: resolveRequirementLabel(requiredId, labels),
            }),
          );
        }
      });

      const requiresAny = stringList(installation.requiresAny);
      if (
        requiresAny.length > 0
        && !requiresAny.some((id) => installedIds.has(normalizeId(id)))
      ) {
          addWarning(
            `required-any:${normalizeId(item?.id)}:${requiresAny.map(normalizeId).join("|")}`,
            tr("consistency.missing_any", `${itemName}: missing one of [${requiresAny
              .map((id) => resolveRequirementLabel(id, labels))
              .join(", ")}]`, {
              item: itemName,
              requirements: requiresAny.map((id) => resolveRequirementLabel(id, labels)).join(", "),
            }),
        );
      }

      const requiresAnyGroups = Array.isArray(installation.requiresAnyGroups)
        ? installation.requiresAnyGroups
        : [];
      requiresAnyGroups.forEach((group, index) => {
        const candidates = stringList(group);
        if (
          candidates.length > 0
          && !candidates.some((id) => installedIds.has(normalizeId(id)))
        ) {
          addWarning(
            `required-any-group:${normalizeId(item?.id)}:${index}`,
            tr("consistency.missing_any", `${itemName}: missing one of [${candidates
              .map((id) => resolveRequirementLabel(id, labels))
              .join(", ")}]`, {
              item: itemName,
              requirements: candidates.map((id) => resolveRequirementLabel(id, labels)).join(", "),
            }),
          );
        }
      });

      const itemId = normalizeId(item?.id);
      const maxPurchases = Number(item?.maxPurchases);
      if (itemId && Number.isFinite(maxPurchases) && maxPurchases > 0) {
        const count = purchasesById.get(itemId) || 0;
        if (count > maxPurchases) {
          addWarning(
            `max:${itemId}`,
            tr("consistency.max", `${itemName}: max exceeded (${count}/${maxPurchases})`, {
              item: itemName,
              count,
              max: maxPurchases,
            }),
          );
        }
      }
    });

    slotUsageByFamily.forEach((used, family) => {
      const provider = providerState.get(family);
      const familyLabel = humanizeId(family);

      if (!provider) {
        addWarning(
          `slot-provider:${family}`,
          tr("consistency.slot_provider", `${familyLabel}: missing slot provider (${used} used)`, {
            family: familyLabel,
            used,
          }),
        );
        return;
      }

      if (!provider.hasUnboundedCapacity && used > provider.finiteCapacity) {
        addWarning(
          `slot-overflow:${family}`,
          tr("consistency.slot_overflow", `${familyLabel}: slots overflow (${used}/${provider.finiteCapacity})`, {
            family: familyLabel,
            used,
            capacity: provider.finiteCapacity,
          }),
        );
      }
    });

    return {
      warnings,
      installedIds,
      providerState,
      slotUsageByFamily,
    };
  }

  function safeGetArray(storageKey) {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function rollHL(value) {
    const raw = String(value ?? "0").trim();
    if (!raw) return { value: 0, raw: "0", log: "HL_FIXED(0)" };

    const normalized = raw.toUpperCase().replace(/\s+/g, "");
    if (normalized.includes("%")) {
      return { value: 0, raw, log: "HL_MANUAL_REVIEW(percentage expression)" };
    }

    const alternatives = normalized
      .split("/")
      .map((part) => part.replace(/[()]/g, ""))
      .filter(Boolean);

    const selected = alternatives.length > 0
      ? alternatives[Math.floor(Math.random() * alternatives.length)]
      : normalized;

    const result = evaluateDiceExpression(selected);
    return {
      value: result.value,
      raw,
      log: `HL_ROLL(${selected}) => ${result.log}`,
    };
  }

  function hlComparable(value) {
    const raw = String(value ?? "0").trim();
    if (!raw) return 0;

    const normalized = raw.toUpperCase().replace(/\s+/g, "");
    if (normalized.includes("%")) return Number.POSITIVE_INFINITY;

    const selected = normalized.split("/")[0]?.replace(/[()]/g, "") || normalized;
    return evaluateDiceExpectedValue(selected);
  }

  function evaluateDiceExpectedValue(expr) {
    const tokens = String(expr || "").match(/[+-]?[^+-]+/g) || [];
    if (tokens.length === 0) return 0;

    let total = 0;

    tokens.forEach((token) => {
      const sign = token.startsWith("-") ? -1 : 1;
      const body = token.replace(/^[+-]/, "");

      const diceMatch = body.match(/^(\d*)D(\d+)$/i);
      if (diceMatch) {
        const count = Number(diceMatch[1] || 1);
        const sides = Number(diceMatch[2] || 0);

        if (!count || !sides) return;

        total += sign * (count * ((sides + 1) / 2));
        return;
      }

      total += sign * parseNumeric(body);
    });

    return Math.max(0, Number(total.toFixed(2)));
  }

  function evaluateDiceExpression(expr) {
    const tokens = String(expr || "").match(/[+-]?[^+-]+/g) || [];
    if (tokens.length === 0) return { value: 0, log: "0" };

    let total = 0;
    const logParts = [];

    tokens.forEach((token) => {
      const sign = token.startsWith("-") ? -1 : 1;
      const body = token.replace(/^[+-]/, "");

      const diceMatch = body.match(/^(\d*)D(\d+)$/i);
      if (diceMatch) {
        const count = Number(diceMatch[1] || 1);
        const sides = Number(diceMatch[2] || 0);

        if (!count || !sides) return;

        let subtotal = 0;
        const rolls = [];

        for (let i = 0; i < count; i++) {
          const roll = Math.floor(Math.random() * sides) + 1;
          rolls.push(roll);
          subtotal += roll;
        }

        total += sign * subtotal;
        logParts.push(`${sign < 0 ? "-" : "+"}[${rolls.join(",")}]`);
        return;
      }

      const numeric = parseNumeric(body);
      total += sign * numeric;
      logParts.push(`${sign < 0 ? "-" : "+"}${numeric}`);
    });

    return {
      value: Math.max(0, Math.round(total)),
      log: logParts.join(" ").replace(/^\+/, ""),
    };
  }

  const api = {
    parseNumeric,
    formatCurrency,
    normalizeName,
    normalizeId,
    humanizeId,
    stringList,
    itemIds,
    resolveRequirementLabel,
    flattenCatalog,
    createCatalogIndex,
    providerCapacityFor,
    resolveInstallationPlan,
    createCartEntry,
    appendCartItems,
    analyzeConsistency,
    safeGetArray,
    rollHL,
    hlComparable,
  };

  root.CyberUtils = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
