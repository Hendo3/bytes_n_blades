(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
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
    return (
      safe
        .toLocaleString("en-US", { style: "currency", currency: "USD" })
        .replace("$", "") + " eb"
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
    safeGetArray,
    rollHL,
    hlComparable,
  };

  root.CyberUtils = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
