const assert = require("node:assert/strict");
const { afterEach, beforeEach, describe, test } = require("node:test");

const {
  installBrowserEnv,
  requireFresh,
} = require("./helpers/browser-env.js");

let browser;
let utils;

beforeEach(() => {
  browser = installBrowserEnv();
  utils = requireFresh("js/core-utils.js");
});

afterEach(() => {
  browser.cleanup();
});

describe("core numeric and formatting helpers", () => {
  test("parses fixed values, ranges and invalid input", () => {
    assert.equal(utils.parseNumeric(25), 25);
    assert.equal(utils.parseNumeric(Number.POSITIVE_INFINITY), 0);
    assert.equal(utils.parseNumeric("100-300 eb"), 200);
    assert.equal(utils.parseNumeric("12 / 25m"), 18.5);
    assert.equal(utils.parseNumeric("free"), 0);
    assert.equal(utils.parseNumeric(null), 0);
  });

  test("formats eurobucks without changing the numeric value", () => {
    assert.equal(utils.formatCurrency(1234.5), "1,234.50 eb");
    assert.equal(utils.formatCurrency("bad"), "0.00 eb");
  });

  test("normalizes names and identifiers independently", () => {
    assert.equal(utils.normalizeName("  Áudio—Link  "), "audiolink");
    assert.equal(utils.normalizeId(" SmartGun_Link "), "smartgun_link");
    assert.equal(utils.humanizeId("model_100-plugs:mkII"), "Model 100 Plugs Mk II");
  });

  test("normalizes list and legacy identifier data", () => {
    assert.deepEqual(utils.stringList([" a ", "", null, "b"]), ["a", "b"]);
    assert.deepEqual(utils.stringList("a"), []);
    assert.deepEqual(
      utils.itemIds({ id: "Main_ID", legacyIds: [" Legacy ", ""] }),
      ["main_id", "legacy"],
    );
  });

  test("resolves requirement labels from maps, objects and fallbacks", () => {
    assert.equal(utils.resolveRequirementLabel("plug", new Map([["plug", "Interface Plug"]])), "Interface Plug");
    assert.equal(utils.resolveRequirementLabel("plug", { plug: "Connector" }), "Connector");
    assert.equal(utils.resolveRequirementLabel("legacyId", { legacyId: "Legacy" }), "Legacy");
    assert.equal(utils.resolveRequirementLabel("missing_item"), "Missing Item");
  });
});

describe("cart consistency analysis", () => {
  test("reports mandatory, alternative and grouped requirements once", () => {
    const consumer = {
      id: "consumer",
      name: "Consumer",
      installation: {
        requires: ["processor", "processor"],
        requiresAny: ["plug_a", "plug_b"],
        requiresAnyGroups: [["cable_a", "cable_b"], [], "invalid"],
      },
    };

    const result = utils.analyzeConsistency([consumer], {
      labels: new Map([["processor", "Neural Processor"]]),
    });

    assert.deepEqual(result.warnings, [
      "Consumer: missing Neural Processor",
      "Consumer: missing one of [Plug A, Plug B]",
      "Consumer: missing one of [Cable A, Cable B]",
    ]);
  });

  test("accepts canonical and legacy IDs as installed requirements", () => {
    const consumer = {
      id: "consumer",
      installation: {
        requires: ["old_processor"],
        requiresAny: ["old_plug", "other_plug"],
      },
    };
    const processor = { id: "processor", legacyIds: ["old_processor"] };
    const plug = { id: "plug", legacyIds: ["old_plug"] };

    assert.deepEqual(utils.analyzeConsistency([consumer, processor, plug]).warnings, []);
  });

  test("enforces maximum purchase counts", () => {
    const limited = { id: "once", name: "Once", maxPurchases: 1 };
    const result = utils.analyzeConsistency([limited, { ...limited }]);
    assert.deepEqual(result.warnings, ["Once: max exceeded (2/1)"]);
  });

  test("reports missing providers and fractional slot overflow", () => {
    const halfSlot = {
      id: "half",
      installation: { slotFamily: "optic", slotUsage: 0.5 },
    };
    assert.deepEqual(
      utils.analyzeConsistency([halfSlot]).warnings,
      ["Optic: missing slot provider (0.5 used)"],
    );

    const finiteProvider = {
      id: "eye",
      installation: { slotProvider: true, slotFamily: "optic", slotCapacity: 0.5 },
    };
    const overflow = utils.analyzeConsistency([finiteProvider, halfSlot, { ...halfSlot, id: "half-2" }]);
    assert.deepEqual(overflow.warnings, ["Optic: slots overflow (1/0.5)"]);
    assert.equal(overflow.providerState.get("optic").finiteCapacity, 0.5);
    assert.equal(overflow.slotUsageByFamily.get("optic"), 1);
  });

  test("adds direct and nested capacities and honors unbounded providers", () => {
    const nested = {
      id: "arm",
      installation: {
        provides: [
          { slotFamily: "finger", slotCapacity: 2 },
          { slotFamily: "finger", slotCapacity: 3 },
        ],
      },
    };
    const fingers = Array.from({ length: 5 }, (_, index) => ({
      id: `finger-${index}`,
      installation: { slotFamily: "finger", slotUsage: 1 },
    }));
    assert.deepEqual(utils.analyzeConsistency([nested, ...fingers]).warnings, []);

    const unbounded = {
      id: "bus",
      installation: { slotProvider: "chipware", slotFamily: "chipware" },
    };
    const manyChips = Array.from({ length: 20 }, (_, index) => ({
      id: `chip-${index}`,
      installation: { slotFamily: "chipware", slotUsage: 1 },
    }));
    const result = utils.analyzeConsistency([unbounded, ...manyChips]);
    assert.deepEqual(result.warnings, []);
    assert.equal(result.providerState.get("chipware").hasUnboundedCapacity, true);
  });

  test("ignores malformed and non-positive slot metadata", () => {
    const result = utils.analyzeConsistency([
      null,
      { id: "bad-provider", installation: { provides: [null, {}, { slotFamily: "x", slotCapacity: -1 }] } },
      { id: "bad-usage", installation: { slotFamily: "x", slotUsage: -1 } },
    ]);
    assert.deepEqual(result.warnings, []);
  });
});

describe("storage and humanity-loss helpers", () => {
  test("reads only valid array payloads from storage", () => {
    localStorage.setItem("valid", "[1,2]");
    localStorage.setItem("object", "{\"x\":1}");
    localStorage.setItem("broken", "{");
    assert.deepEqual(utils.safeGetArray("valid"), [1, 2]);
    assert.deepEqual(utils.safeGetArray("object"), []);
    assert.deepEqual(utils.safeGetArray("broken"), []);
    assert.deepEqual(utils.safeGetArray("missing"), []);
  });

  test("rolls fixed, dice, modifier and alternative expressions deterministically", () => {
    const originalRandom = Math.random;
    const rolls = [0, 0, 0, 0.999, 0.999, 0.999];
    Math.random = () => rolls.shift() ?? 0;
    try {
      assert.deepEqual(utils.rollHL(""), { value: 0, raw: "0", log: "HL_FIXED(0)" });
      assert.equal(utils.rollHL("25%").log, "HL_MANUAL_REVIEW(percentage expression)");
      assert.equal(utils.rollHL("2").value, 2);
      assert.equal(utils.rollHL("1D6+2").value, 3);
      assert.equal(utils.rollHL("(1D6)/(2D6)").value, 12);
    } finally {
      Math.random = originalRandom;
    }
  });

  test("clamps negative roll totals and ignores invalid dice", () => {
    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
      assert.equal(utils.rollHL("1D1-5").value, 0);
      assert.equal(utils.rollHL("0D6+4").value, 4);
      assert.equal(utils.rollHL("bad").value, 0);
    } finally {
      Math.random = originalRandom;
    }
  });

  test("computes comparable expected values without rolling", () => {
    assert.equal(utils.hlComparable(""), 0);
    assert.equal(utils.hlComparable("2D6+1"), 8);
    assert.equal(utils.hlComparable("1D6/3D6"), 3.5);
    assert.equal(utils.hlComparable("1D1-5"), 0);
    assert.equal(utils.hlComparable("10%"), Number.POSITIVE_INFINITY);
    assert.equal(utils.hlComparable("invalid"), 0);
  });
});
