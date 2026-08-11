const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, describe, test } = require("node:test");

const {
  projectRoot,
  installBrowserEnv,
  requireFresh,
  jsonResponse,
  flushPromises,
} = require("./helpers/browser-env.js");

let cleanups = [];

function setup(options = {}) {
  const browser = installBrowserEnv(options);
  cleanups.push(() => browser.cleanup());
  const utils = requireFresh("js/core-utils.js");
  window.CyberUtils = utils;
  global.CyberUtils = utils;
  cleanups.push(() => delete global.CyberUtils);
  const bundles = requireFresh("js/bundles.js");
  return { ...browser, utils, bundles };
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"));
}

afterEach(() => {
  while (cleanups.length) cleanups.pop()();
  delete global.Modal;
});

describe("bundle catalog normalization and lookup", () => {
  test("normalizes all supported list shapes and preserves mechanical metadata", () => {
    const { bundles } = setup();
    const installation = { requires: ["processor"], slotFamily: "optic", slotUsage: 0.5 };
    const result = bundles.normalizeCatalog({
      ignored: null,
      empty: { list: { bad: null, todo: { name: "TODO item", price: 100 }, free: { name: "Free", price: 0 } } },
      category: {
        items: {
          key: {
            id: "canonical",
            legacyIds: ["old"],
            name: "Product",
            description: "Specs",
            price: "100-300",
            HL: "1D6",
            tags: ["tag"],
            maxPurchases: 2,
            alternativeAcquisition: true,
            attributeBonuses: [{ attribute: "REF", value: 1 }],
            skillBonuses: [{ skill: "Interface", value: 1 }],
            attributeSet: { BODY: 10 },
            priceModifiers: [{ id: "x" }],
            installation,
          },
          fallback_name: { price: 50, note: "Fallback note" },
        },
      },
    }, "cyberware");

    assert.deepEqual(Object.keys(result), ["category"]);
    assert.equal(result.category.length, 2);
    assert.deepEqual(result.category[0], {
      id: "canonical",
      catalogId: "cyberware:category:key",
      key: "key",
      legacyIds: ["old"],
      sourceType: "cyberware",
      sourceCategory: "category",
      sourceCategoryLabel: "category",
      name: "Product",
      description: "Specs",
      price: 200,
      hlRaw: "1D6",
      tags: ["tag"],
      maxPurchases: 2,
      alternativeAcquisition: true,
      attributeBonuses: [{ attribute: "REF", value: 1 }],
      skillBonuses: [{ skill: "Interface", value: 1 }],
      attributeSet: { BODY: 10 },
      priceModifiers: [{ id: "x" }],
      installation,
    });
    assert.equal(result.category[1].name, "Fallback Name");
    assert.equal(result.category[1].description, "Fallback note");
  });

  test("indexes names, canonical IDs and legacy IDs and supports category/random lookup", () => {
    const { bundles } = setup();
    const cyber = { Neural: [{ id: "processor", legacyIds: ["old_processor"], name: "Neural Processor", price: 100 }] };
    const equipment = { Tools: [{ id: "tool", name: "Áudio Tool", price: 50 }] };
    const weapons = { Pistols: [{ id: "pistol", name: "Pistol", price: 200 }] };
    const context = bundles.createBundleContext({ cyberwares: cyber, equipment, weapons });

    assert.equal(context.findByName("neural processor").id, "processor");
    assert.equal(context.findByName("audio tool").id, "tool");
    assert.equal(context.findById("OLD_PROCESSOR").id, "processor");
    assert.equal(context.findById("missing"), null);
    assert.deepEqual(context.findInCategory("cyber", "Neural"), cyber.Neural);
    assert.deepEqual(context.findInCategory("equipment", "Tools"), equipment.Tools);
    assert.deepEqual(context.findInCategory("weapon", "Pistols"), weapons.Pistols);
    assert.deepEqual(context.findInCategory("unknown", "Pistols"), []);
    assert.deepEqual(context.pickRandom(context.allCyber, 1, new Set(["processor"])), []);
    assert.equal(context.pickRandom(context.allEquipment, 5).length, 1);
  });

  test("fetchJson returns payloads and surfaces HTTP failures", async () => {
    const { bundles } = setup({ fetchImpl: async (url) => {
      if (url === "ok") return jsonResponse({ ok: true });
      return jsonResponse({}, { ok: false, status: 404 });
    } });
    assert.deepEqual(await bundles.fetchJson("ok"), { ok: true });
    await assert.rejects(() => bundles.fetchJson("missing"), /HTTP 404/);
  });
});

describe("bundle selection and dependency closure", () => {
  test("adds mandatory requirements and chooses the cheapest alternative", () => {
    const { bundles } = setup();
    const items = [
      { id: "consumer", name: "Consumer", price: 100, installation: {
        requires: ["required"],
        requiresAny: ["expensive", "cheap"],
        requiresAnyGroups: [["group-a", "group-b"]],
      } },
      { id: "required", name: "Required", price: 10 },
      { id: "expensive", name: "Expensive", price: 100 },
      { id: "cheap", name: "Cheap", price: 20 },
      { id: "group-a", name: "A", price: 15 },
      { id: "group-b", name: "B", price: 5 },
    ];
    const context = bundles.createBundleContext({ cyberwares: { Test: items }, equipment: {}, weapons: {} });
    const resolved = bundles.enforceDependencies([items[0], items[0]], context);
    assert.deepEqual(resolved.map((item) => item.id), ["consumer", "required", "cheap", "group-b"]);
  });

  test("selects providers with enough capacity and fills aggregate slot gaps", () => {
    const { bundles, utils } = setup();
    const largeConsumer = {
      id: "large-consumer",
      name: "Large",
      price: 50,
      installation: { requiresAny: ["small", "large"], slotFamily: "finger", slotUsage: 2 },
    };
    const small = {
      id: "small", name: "Small", price: 1,
      installation: { slotProvider: true, slotFamily: "finger", slotCapacity: 1 },
    };
    const large = {
      id: "large", name: "Large Provider", price: 100,
      installation: { provides: [{ slotFamily: "finger", slotCapacity: 5 }] },
    };
    const all = [largeConsumer, small, large];
    const context = bundles.createBundleContext({ cyberwares: { Test: all }, equipment: {}, weapons: {} });
    const selected = bundles.enforceDependencies([largeConsumer], context);
    assert.ok(selected.some((item) => item.id === "large"));
    assert.deepEqual(utils.analyzeConsistency(selected).warnings, []);

    const first = {
      id: "first", name: "First", price: 10,
      installation: { requiresAny: ["provider-a", "provider-b"], slotFamily: "optic", slotUsage: 1 },
    };
    const second = { ...first, id: "second", name: "Second" };
    const providerA = {
      id: "provider-a", name: "Provider A", price: 1,
      installation: { slotProvider: true, slotFamily: "optic", slotCapacity: 1 },
    };
    const providerB = {
      id: "provider-b", name: "Provider B", price: 2,
      installation: { slotProvider: true, slotFamily: "optic", slotCapacity: 1 },
    };
    const gapContext = bundles.createBundleContext({
      cyberwares: { Test: [first, second, providerA, providerB] }, equipment: {}, weapons: {},
    });
    const gapResolved = bundles.enforceDependencies([first, second], gapContext);
    assert.ok(gapResolved.some((item) => item.id === "provider-a"));
    assert.ok(gapResolved.some((item) => item.id === "provider-b"));
    assert.deepEqual(utils.analyzeConsistency(gapResolved).warnings, []);
  });

  test("terminates safely for missing and circular dependencies", () => {
    const { bundles } = setup();
    const a = { id: "a", name: "A", price: 1, installation: { requires: ["b", "missing"] } };
    const b = { id: "b", name: "B", price: 1, installation: { requires: ["a"] } };
    const context = bundles.createBundleContext({ cyberwares: { Test: [a, b] }, equipment: {}, weapons: {} });
    assert.deepEqual(bundles.enforceDependencies([a], context).map((item) => item.id), ["a", "b"]);
  });

  test("applies style, humanity and budget filters without starving a bundle", () => {
    const { bundles } = setup();
    const context = {
      findInCategory(group, category) { return [{ id: `${group}-${category}` }]; },
    };
    const base = [{ id: "base" }];
    assert.equal(bundles.withStyleFlavor(context, base, { style: "aggressive" }).length, 3);
    assert.equal(bundles.withStyleFlavor(context, base, { style: "stealth" }).length, 3);
    assert.equal(bundles.withStyleFlavor(context, base, { style: "netrunner" }).length, 3);
    assert.deepEqual(bundles.withStyleFlavor(context, base, { style: "balanced" }), base);

    const items = [
      { id: "a", price: 100, hlRaw: "1" },
      { id: "b", price: 200, hlRaw: "2" },
      { id: "c", price: 300, hlRaw: "3" },
      { id: "d", price: 5000, hlRaw: "10" },
    ];
    assert.deepEqual(bundles.applyOptionFilters(items, { lowHL: true, budget: "street" }).map((item) => item.id), ["a", "b", "c"]);
    assert.equal(bundles.applyOptionFilters(items.slice(0, 2).concat(items[3]), { lowHL: true, budget: "street" }).length, 3);
    assert.equal(bundles.applyOptionFilters(items, { budget: "opulence" }).length, 4);
  });

  test("applies signatures, unique picks and inclusive random bounds", () => {
    const { bundles } = setup();
    const draft = { title: "Pack", perks: ["Base"] };
    const signed = bundles.applyStoreSignature(draft, [{ id: "x" }], { style: "aggressive", budget: "opulence" });
    assert.equal(signed.title, "Pack // Combat Calibrated");
    assert.equal(signed.discountBoost, 3);
    assert.ok(signed.perks.includes("Pressure-first tuning"));
    assert.equal(bundles.applyStoreSignature(draft, [], { style: "unknown", budget: "unknown" }).signature, "House Balanced");

    const a = { id: "a" };
    const picked = bundles.pickBundleItems([a, a], [a, { id: "b" }, { id: "c" }], 2);
    assert.deepEqual(new Set(picked.map((item) => item.id)), new Set(["a", "b", "c"]));
    const originalRandom = Math.random;
    Math.random = () => 0.999999;
    try {
      assert.equal(bundles.randomInt(5, 10), 10);
    } finally {
      Math.random = originalRandom;
    }
    assert.equal(bundles.toTitleCase("smartgun_link"), "Smartgun Link");
  });
});

describe("generated bundles and browser presentation", () => {
  test("Netrunner bundles include a published deck with programs inside its MU limit", () => {
    const { bundles } = setup();
    const dataStore = {
      cyberwares: bundles.normalizeCatalog(readJson("data/cyberwares.json").data, "cyberware"),
      equipment: bundles.normalizeCatalog(readJson("data/equipment.json").data, "equipment"),
      weapons: {},
      programs: readJson("data/programs.json").programs,
      cyberdecks: readJson("data/cyberdecks.json").decks,
    };
    const context = bundles.createBundleContext(dataStore);
    for (const budget of ["street", "pro", "opulence"]) {
      const generated = bundles.generateBundles(context, { style: "netrunner", budget, lowHL: false });
      const netrunner = generated.find((bundle) => bundle.titleKey === "bundle.netrunner_title");
      const deck = netrunner.items.find((item) => item.deckConfiguration);
      assert.ok(deck, budget);
      assert.ok(deck.deckConfiguration.programIds.length > 0, budget);
      assert.ok(deck.deckConfiguration.memoryUsed <= deck.deckConfiguration.memory, budget);
      assert.equal(deck.sourceType, "cyberdecks");
    }
    const tiny = bundles.selectProgramsForDeck(dataStore.programs, 1, 10);
    assert.deepEqual(tiny, []);
  });

  test("all style/budget/HL combinations produce six coherent real bundles", () => {
    const { bundles, utils } = setup();
    const dataStore = {
      cyberwares: bundles.normalizeCatalog(readJson("data/cyberwares.json").data, "cyberware"),
      equipment: bundles.normalizeCatalog(readJson("data/equipment.json").data, "equipment"),
      weapons: {},
    };
    const context = bundles.createBundleContext(dataStore);

    for (const style of ["balanced", "aggressive", "stealth", "netrunner"]) {
      for (const budget of ["street", "pro", "opulence"]) {
        for (const lowHL of [false, true]) {
          const generated = bundles.generateBundles(context, { style, budget, lowHL });
          assert.equal(generated.length, 6);
          for (const bundle of generated) {
            assert.ok(bundle.items.length >= 1, `${style}/${budget}: empty ${bundle.title}`);
            assert.equal(new Set(bundle.items.map((item) => item.id)).size, bundle.items.length);
            assert.deepEqual(utils.analyzeConsistency(bundle.items).warnings, [], bundle.title);
            assert.equal(bundle.subtotal, bundle.items.reduce((sum, item) => sum + item.price, 0));
            assert.equal(bundle.total, bundle.subtotal * (1 - bundle.discountPct / 100));
            assert.ok(bundle.discountPct >= 0 && bundle.discountPct <= 30);
          }
        }
      }
    }
  });

  test("renders bundle cards and adds complete metadata to cart", () => {
    const { bundles, document, window } = setup({
      html: "<div id='list'></div><button id='button'>Add</button>",
      immediateTimers: true,
    });
    const alerts = [];
    global.Modal = { alert: (...args) => alerts.push(args) };
    const bundle = {
      title: "Test Pack",
      subtitle: "Complete",
      perks: ["Safe"],
      vibe: "balanced",
      signature: "House",
      discountPct: 10,
      subtotal: 100,
      total: 90,
      items: [{
        id: "item",
        legacyIds: ["old"],
        name: "Item",
        sourceCategory: "Neural",
        price: 100,
        hlRaw: "1D1",
        tags: ["tag"],
        installation: { requires: ["processor"] },
      }],
    };
    const container = document.getElementById("list");
    bundles.renderBundles(container, [bundle]);
    assert.match(container.textContent, /Test Pack/);
    assert.match(container.textContent, /100.00 eb/);
    const events = [];
    window.addEventListener("stash-updated", () => events.push(true));
    container.querySelector(".btn-add").click();

    const cart = JSON.parse(localStorage.getItem("cyber_cart"));
    assert.equal(cart.length, 1);
    assert.equal(cart[0].id, "item");
    assert.equal(cart[0].hl, 1);
    assert.equal(cart[0].bundleDiscountPct, 10);
    assert.deepEqual(cart[0].installation, { requires: ["processor"] });
    assert.equal(events.length, 1);
    assert.equal(alerts[0][0], "BUNDLE UPLOADED");
  });

  test("initializes controls and exposes an offline state", async () => {
    const cyber = readJson("data/cyberwares.json");
    const equipment = readJson("data/equipment.json");
    let call = 0;
    const { bundles, document } = setup({
      html: "<div id='list'></div><div id='timer'></div><select id='style'><option value='balanced'></option></select><select id='budget'><option value='street'></option></select><input id='low' type='checkbox'>",
      fetchImpl: async () => jsonResponse(call++ === 0 ? cyber : equipment),
    });
    const oldTimers = {
      setTimeout: global.setTimeout,
      clearTimeout: global.clearTimeout,
      setInterval: global.setInterval,
      clearInterval: global.clearInterval,
    };
    Object.assign(global, {
      setTimeout: () => 1,
      clearTimeout: () => {},
      setInterval: () => 1,
      clearInterval: () => {},
    });
    cleanups.push(() => Object.assign(global, oldTimers));
    const ui = {
      list: document.getElementById("list"),
      timer: document.getElementById("timer"),
      style: document.getElementById("style"),
      budget: document.getElementById("budget"),
      lowHL: document.getElementById("low"),
    };
    await bundles.init(ui);
    assert.equal(ui.list.querySelectorAll(".bundle-card").length, 6);
    assert.match(ui.timer.textContent, /NEXT DATA DRIP IN/);
    ui.style.dispatchEvent(new window.Event("change"));

    const failureSetup = setup({
      html: "<div id='offline'></div>",
      fetchImpl: async () => jsonResponse({}, { ok: false, status: 503 }),
    });
    await failureSetup.bundles.init({ list: failureSetup.document.getElementById("offline") });
    assert.match(failureSetup.document.getElementById("offline").textContent, /BUNDLE ENGINE OFFLINE/);
    await flushPromises();
  });
});
