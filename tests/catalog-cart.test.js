const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, describe, test } = require("node:test");

const {
  installBrowserEnv,
  requireFresh,
  flushPromises,
  jsonResponse,
} = require("./helpers/browser-env.js");

const projectRoot = path.resolve(__dirname, "..");

let cleanups = [];

function useBrowser(options) {
  const browser = installBrowserEnv(options);
  cleanups.push(() => browser.cleanup());
  return browser;
}

function installCyberUtils() {
  const utils = requireFresh("js/core-utils.js");
  window.CyberUtils = utils;
  global.CyberUtils = utils;
  cleanups.push(() => delete global.CyberUtils);
  return utils;
}

function catalogMarkup() {
  return `
    <button id="filter-toggle"></button>
    <aside id="filter-sidebar" class="hidden"><button id="close-filter"></button></aside>
    <div id="category-list"></div><h1 id="title-category"></h1><div id="items-list"></div>
    <select id="fs-category"></select>
    <input id="fs-price-max-input"><input id="fs-hl-max-input"><input id="fs-cir-input"><input id="fs-difficulty-max-input">
    <button id="fs-apply"></button><button id="fs-clear"></button>
  `;
}

afterEach(() => {
  while (cleanups.length) cleanups.pop()();
  delete global.Modal;
  delete global.HackSystem;
});

describe("catalog controller and purchase flow", () => {
  test("renders cyberware metadata, filters it, rolls damage and preserves mechanics in cart", async () => {
    const catalog = {
      data: {
        Neuralware: {
          name: "Neuralware",
          itens: {
            test_link: {
              id: "test_link",
              legacyIds: ["old_link"],
              name: "Test Link",
              description: "Interface that deals 1D6 damage.",
              price: "100",
              HL: "1D1",
              surg: "M",
              maxPurchases: 1,
              alternativeAcquisition: true,
              attributeBonuses: [{ attribute: "REF", value: 1 }],
              skillBonuses: [{ skill: "Interface", label: "Interface", value: 2 }],
              attributeSet: { BODY: 10 },
              installation: {
                requires: ["processor"],
                requiresAny: ["plug_a", "plug_b"],
                requiresAnyGroups: [["cable_a", "cable_b"]],
                slotFamily: "neural",
                slotUsage: 0.5,
                provides: [{ slotFamily: "child", slotCapacity: 2 }],
                compatibilityNotes: ["Test note"],
              },
            },
            cheap: { id: "cheap", name: "Cheap", description: "basic", price: 10, HL: "0", surg: "N" },
          },
        },
      },
    };
    const { document, window } = useBrowser({
      html: catalogMarkup(),
      url: "https://bytes.test/html/cyberwares.html",
      fetchImpl: async () => jsonResponse(catalog),
      immediateTimers: true,
    });
    installCyberUtils();
    const alerts = [];
    global.Modal = { alert: (...args) => alerts.push(args) };
    const stashEvents = [];
    window.addEventListener("stash-updated", () => stashEvents.push(true));
    requireFresh("js/script.js");
    await flushPromises();

    assert.equal(document.querySelectorAll("#category-list button").length, 1);
    assert.equal(document.querySelectorAll("#items-list article").length, 2);
    const testCard = [...document.querySelectorAll("#items-list article")]
      .find((card) => card.textContent.includes("Test Link"));
    assert.match(testCard.textContent, /REQ: Processor/);
    assert.match(testCard.textContent, /REQ ANY: Plug A \| Plug B/);
    assert.match(testCard.textContent, /SLOTS: 0.5 @ neural/);
    assert.match(testCard.textContent, /PROVIDER: Child \(2\)/);
    assert.match(testCard.textContent, /BONUS: \+1 REF/);
    assert.match(testCard.textContent, /SKILL: \+2 Interface/);
    assert.match(testCard.textContent, /ALT ACQ/);

    testCard.querySelector(".btn-dice").click();
    assert.equal(alerts[0][0], "DAMAGE REPORT: Test Link");
    testCard.querySelector(".btn-add").click();
    const cart = JSON.parse(localStorage.getItem("cyber_cart"));
    assert.equal(cart.length, 1);
    assert.equal(cart[0].id, "test_link");
    assert.equal(cart[0].hl, 1);
    assert.deepEqual(cart[0].installation, catalog.data.Neuralware.itens.test_link.installation);
    assert.equal(stashEvents.length, 1);

    document.getElementById("filter-toggle").click();
    assert.equal(document.getElementById("filter-sidebar").classList.contains("hidden"), false);
    document.getElementById("close-filter").click();
    assert.equal(document.getElementById("filter-sidebar").classList.contains("hidden"), true);

    document.getElementById("fs-price-max-input").value = "20";
    document.getElementById("fs-apply").click();
    assert.equal(document.querySelectorAll("#items-list article").length, 1);
    assert.match(document.getElementById("items-list").textContent, /Cheap/);
    document.getElementById("fs-clear").click();
    assert.equal(document.querySelectorAll("#items-list article").length, 2);
  });

  test("normalizes weapons, ignores placeholders and prices smartchips and ammunition", async () => {
    const payload = {
      weapons: [
        { id: "todo", name: "TODO", class: "Pistol", price: 1 },
        {
          id: "pistol",
          name: "Range Pistol",
          class: "Pistol",
          price: 100,
          price_max: 150,
          type_code: "P",
          accuracy: 1,
          concealment: "J",
          availability: "C",
          damage: "2D6",
          ammo_type: "10mm",
          weapon_range_m: [12, 25],
          magazine_capacity: [8, 12],
          cadence_full_auto: 2,
          reliability: "ST",
        },
        {
          id: "ammo",
          name: "Ammo Box",
          class: "Ammo",
          price: 30,
          type_code: "AMMO",
          ammo_type: "10mm",
        },
        {
          id: "shotgun-ammo",
          name: "Shotgun Shells",
          class: "Shotgun Ammo",
          price: 15,
          type_code: "AMMO",
          ammo_type: "shotgun",
        },
      ],
    };
    const { document } = useBrowser({
      html: catalogMarkup(),
      url: "https://bytes.test/html/weapons.html",
      fetchImpl: async () => jsonResponse(payload),
      immediateTimers: true,
    });
    installCyberUtils();
    requireFresh("js/script.js");
    await flushPromises();

    assert.equal(document.querySelectorAll("#category-list button").length, 3);
    assert.doesNotMatch(document.body.textContent, /TODO/);
    const pistolCard = document.querySelector("#items-list article");
    assert.match(pistolCard.textContent, /100.00 eb - 150.00 eb/);
    assert.match(pistolCard.textContent, /Range: 12m \/ 25m/);
    pistolCard.querySelector("input[type='checkbox']").click();
    pistolCard.querySelector(".btn-add").click();

    const ammoCategory = [...document.querySelectorAll("#category-list button")]
      .find((button) => button.textContent === "AMMO");
    ammoCategory.click();
    const ammoCard = document.querySelector("#items-list article");
    const ammoSelect = ammoCard.querySelector("select");
    ammoSelect.value = "ap";
    ammoSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
    assert.match(ammoCard.textContent, /90.00 eb/);
    ammoCard.querySelector(".btn-add").click();

    const shotgunCategory = [...document.querySelectorAll("#category-list button")]
      .find((button) => button.textContent === "SHOTGUN AMMO");
    shotgunCategory.click();
    const shotgunCard = document.querySelector("#items-list article");
    const shotgunSelect = shotgunCard.querySelector("select");
    shotgunSelect.value = "flash_bang";
    shotgunCard.querySelector(".btn-add").click();

    const cart = JSON.parse(localStorage.getItem("cyber_cart"));
    assert.equal(cart.length, 3);
    assert.equal(cart[0].price, 200);
    assert.equal(cart[0].Smartchipped, true);
    assert.equal(cart[1].price, 90);
    assert.equal(cart[1].ammoOptionKey, "ap");
    assert.equal(cart[2].price, 50);
    assert.equal(cart[2].ammoOptionPricingModel, "fixed");
  });

  test("keeps ammunition selectors separate from smartchips in both real catalogs", async () => {
    for (const [locale, fileName, ammoClass] of [
      ["en-US", "weapons.json", "Ammo"],
      ["pt-BR", "weapons.pt-BR.json", "Munição"],
    ]) {
      const payload = JSON.parse(fs.readFileSync(path.join(projectRoot, "data", fileName), "utf8"));
      const expectedAmmo = payload.weapons.filter((weapon) => weapon.type_code === "AMMO");
      const { document, window } = useBrowser({
        html: catalogMarkup(),
        url: "https://bytes.test/html/weapons.html",
        fetchImpl: async () => jsonResponse(payload),
        immediateTimers: true,
      });
      localStorage.setItem("preferred_locale", locale);
      installCyberUtils();
      requireFresh("js/script.js");
      await flushPromises();

      const ammoCategory = [...document.querySelectorAll("#category-list button")]
        .find((button) => button.textContent === ammoClass.toUpperCase());
      assert.ok(ammoCategory, `${locale}: ammunition category exists`);
      ammoCategory.click();

      const ammoCards = [...document.querySelectorAll("#items-list article")];
      assert.equal(ammoCards.length, expectedAmmo.length, `${locale}: every ammunition item renders`);
      for (const card of ammoCards) {
        assert.ok(card.querySelector("select[id^='ammo-option-']"), `${locale}: ${card.querySelector("h3").textContent} keeps its selector`);
        assert.equal(card.querySelector("input[id^='smartchipped-']"), null, `${locale}: ammunition never gets Smartchip`);
      }

      const weaponCategory = [...document.querySelectorAll("#category-list button")]
        .find((button) => button.textContent !== ammoClass.toUpperCase());
      weaponCategory.click();
      const weaponCards = [...document.querySelectorAll("#items-list article")];
      assert.ok(weaponCards.length > 0, `${locale}: weapon category renders`);
      for (const card of weaponCards) {
        assert.ok(card.querySelector("input[id^='smartchipped-']"), `${locale}: ${card.querySelector("h3").textContent} keeps Smartchip`);
        assert.equal(card.querySelector("select[id^='ammo-option-']"), null, `${locale}: weapons do not receive ammunition selectors`);
      }

    }
  });

  test("recognizes localized ammunition categories even without a type code", async () => {
    const payload = {
      weapons: [
        { id: "english-ammo", name: "English Box", class: "Ammunition", price: 10 },
        { id: "portuguese-ammo", name: "Caixa Brasileira", class: "Munição", price: 20 },
      ],
    };
    const { document } = useBrowser({
      html: catalogMarkup(),
      url: "https://bytes.test/html/weapons.html",
      fetchImpl: async () => jsonResponse(payload),
      immediateTimers: true,
    });
    installCyberUtils();
    requireFresh("js/script.js");
    await flushPromises();

    for (const categoryButton of document.querySelectorAll("#category-list button")) {
      categoryButton.click();
      const card = document.querySelector("#items-list article");
      assert.ok(card.querySelector("select[id^='ammo-option-']"));
      assert.equal(card.querySelector("input[id^='smartchipped-']"), null);
    }
  });

  test("filters drug difficulty and renders fetch failures through the error route", async () => {
    const originalError = console.error;
    console.error = () => {};
    cleanups.push(() => { console.error = originalError; });
    const payload = {
      data: {
        street_stock: {
          name: "Street Stock",
          items: {
            easy: { name: "Easy Drug", price: 25, difficulty: 5, description: "easy" },
            hard: { name: "Hard Drug", price: 50, difficulty: 20, description: "hard" },
          },
        },
      },
    };
    const success = useBrowser({
      html: catalogMarkup(),
      url: "https://bytes.test/html/drugs.html",
      fetchImpl: async () => jsonResponse(payload),
    });
    installCyberUtils();
    requireFresh("js/script.js");
    await flushPromises();
    success.document.getElementById("fs-difficulty-max-input").value = "10";
    success.document.getElementById("fs-apply").click();
    assert.match(success.document.getElementById("items-list").textContent, /Easy Drug/);
    assert.doesNotMatch(success.document.getElementById("items-list").textContent, /Hard Drug/);

    const failure = useBrowser({
      html: catalogMarkup(),
      url: "https://bytes.test/html/accessories.html",
      fetchImpl: async () => jsonResponse({}, { ok: false, status: 503 }),
    });
    requireFresh("js/script.js");
    await flushPromises();
    assert.ok(failure.jsdomErrors.length >= 1, "failed catalog should attempt the 404 route");
  });

  test("exports deterministic dice and resilient stash helpers", () => {
    const { document, window } = useBrowser({ immediateTimers: true });
    const alerts = [];
    global.Modal = { alert: (...args) => alerts.push(args) };
    const { DiceEngine, Stash, PAGE_CONFIG, AMMO_OPTIONS, SHOTGUN_AMMO_OPTIONS } = requireFresh("js/script.js");
    assert.ok(PAGE_CONFIG.weapons.weaponCatalog);
    assert.ok(AMMO_OPTIONS.some((entry) => entry.key === "ap"));
    assert.ok(SHOTGUN_AMMO_OPTIONS.some((entry) => entry.pricingModel === "fixed"));
    assert.deepEqual(DiceEngine.roll("7"), { total: 7, details: "FIXED(7)" });
    assert.deepEqual(DiceEngine.roll("bad"), { total: 0, details: "N/A" });

    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
      assert.equal(DiceEngine.roll("2D6+3").total, 5);
      assert.equal(DiceEngine.roll("1D6-2").total, -1);
    } finally {
      Math.random = originalRandom;
    }
    assert.equal(DiceEngine.createButton("fixed", "x"), null);
    const diceButton = DiceEngine.createButton("1D1", "Knife");
    document.body.appendChild(diceButton);
    diceButton.click();
    assert.equal(alerts[0][0], "DAMAGE REPORT: Knife");

    localStorage.setItem("cyber_cart", "{");
    const events = [];
    window.addEventListener("stash-updated", () => events.push(true));
    Stash.add({ id: "item" });
    assert.equal(Stash.get().length, 1);
    assert.equal(events.length, 1);
  });

  test("supports chip navigation, inferred chip slots and controller fallbacks without shared utilities", async () => {
    const payload = {
      data: {
        Chipware: {
          name: "Chipware",
          items: {
            aptr_reflex_chips: { id: "aptr_reflex_chips", name: "APTR", description: "table", price: 10 },
            mram_memory_chips: { id: "mram_memory_chips", name: "MRAM", description: "table", price: 10 },
            visual: { id: "visual", name: "Visual", description: "table", price: 10, tags: ["visual_recognition_chip"] },
            provider: {
              id: "provider",
              name: "Provider",
              description: "direct",
              price: "25 eb",
              HL: "5",
              surg: "M",
              damage: "1D1",
              installation: { slotProvider: "chipware", slotCapacity: 4 },
            },
            uncapped: {
              id: "uncapped",
              name: "Uncapped Provider",
              description: "unbounded",
              price: 20,
              installation: { slotProvider: "neural" },
            },
            fallback_name: { description: "fallback", price: 15 },
          },
        },
      },
    };
    const browser = useBrowser({
      html: catalogMarkup(),
      url: "https://bytes.test/html/cyberwares.html",
      fetchImpl: async () => jsonResponse(payload),
      immediateTimers: true,
    });
    global.Modal = { alert() {} };
    requireFresh("js/script.js");
    await flushPromises();

    const cards = [...browser.document.querySelectorAll("#items-list article")];
    assert.equal(cards.length, 6);
    assert.match(cards.find((card) => card.textContent.includes("APTR")).textContent, /SLOTS: 1 @ chipware/);
    assert.match(cards.find((card) => card.textContent.includes("Provider")).textContent, /PROVIDER: provider \(4\)/i);
    assert.match(cards.find((card) => card.textContent.includes("Uncapped Provider")).textContent, /PROVIDER: Neural/i);
    assert.match(browser.document.body.textContent, /FALLBACK NAME/);
    cards.find((card) => card.textContent.includes("Provider")).querySelector(".btn-dice").click();
    cards.find((card) => card.querySelector("h3").textContent === "Provider").querySelector(".btn-add").click();

    for (const name of ["APTR", "MRAM", "Visual"]) {
      cards.find((card) => card.querySelector("h3").textContent === name).querySelector(".btn-add").click();
    }
    assert.ok(browser.jsdomErrors.length >= 3);

    browser.document.getElementById("fs-hl-max-input").value = "1";
    browser.document.getElementById("fs-cir-input").value = "n";
    browser.document.getElementById("fs-difficulty-max-input").value = "10";
    browser.document.getElementById("fs-apply").click();
    assert.doesNotMatch(browser.document.getElementById("items-list").textContent, /Provider/);
  });
});

describe("cart controller", () => {
  function cartMarkup() {
    return `
      <div id="cart-list"></div><p id="empty-cart-msg" class="hidden"></p>
      <div><strong id="cart-total-value"></strong><button id="cart-clear"></button><button id="cart-export"></button></div>
    `;
  }

  const labelCatalogs = {
    cyber: {
      data: {
        Neuralware: {
          items: {
            processor: { id: "processor", name: "Neural Processor" },
          },
        },
      },
    },
    equipment: {
      data: {
        cables: {
          list: {
            plug: { id: "plug", name: "Interface Plug", legacyIds: ["old_plug"] },
          },
        },
      },
    },
  };

  test("renders technical data, dependency labels, bundle discount and hack discount", async () => {
    let fetchCount = 0;
    const { document } = useBrowser({
      html: cartMarkup(),
      url: "https://bytes.test/html/cart.html",
      fetchImpl: async () => jsonResponse(fetchCount++ === 0 ? labelCatalogs.cyber : labelCatalogs.equipment),
    });
    installCyberUtils();
    global.Modal = { alert() {}, confirm() {} };
    global.HackSystem = { init(callback) { callback(true); } };
    localStorage.setItem("cyber_cart", JSON.stringify([
      {
        id: "linked",
        name: "Linked Item",
        category: "Neuralware",
        price: 100,
        hl: 2,
        bundleId: "b1",
        bundleTitle: "Test Bundle",
        bundleDiscountPct: 10,
        attributeBonuses: [{ attribute: "REF", value: 1 }],
        skillBonuses: [{ skill: "Interface", label: "Interface", value: 2 }],
        attributeSet: { BODY: 10 },
        installation: {
          requires: ["processor"],
          requiresAny: ["old_plug"],
          slotFamily: "neural",
          slotUsage: 1,
          provides: [{ slotFamily: "child", slotCapacity: 2 }],
          compatibilityNotes: ["Internal only"],
        },
        alternativeAcquisition: true,
        maxPurchases: 1,
        Smartchipped: true,
      },
      {
        id: "second",
        name: "Second",
        price: 50,
        hl: 1,
        ammoOptionLabel: "Flash Bang",
        ammoOptionKey: "flash_bang",
        ammoOptionPricingModel: "fixed",
        ammoOptionFixedPrice: 50,
        bundleId: "b1",
        bundleTitle: "Test Bundle",
        bundleDiscountPct: 10,
      },
    ]));
    requireFresh("js/cart.js");
    await flushPromises();

    assert.equal(document.querySelectorAll(".cart-item").length, 2);
    assert.match(document.getElementById("cart-list").textContent, /REQ Neural Processor/);
    assert.match(document.getElementById("cart-list").textContent, /REQ ANY Interface Plug/);
    assert.match(document.getElementById("cart-list").textContent, /BONUS \+1 REF/);
    assert.match(document.getElementById("cart-list").textContent, /PROVIDER Child \(2\)/);
    assert.match(document.getElementById("cart-total-value").textContent, /135.00 eb/);
    assert.match(document.getElementById("cart-total-value").textContent, /TOTAL HL: 3/);
    assert.match(document.getElementById("cart-total-value").textContent, /WARNINGS/);

    document.getElementById("cart-hack-btn").click();
    assert.equal(sessionStorage.getItem("cart_hacked"), "true");
    assert.match(document.getElementById("cart-total-value").textContent, /108.00 eb/);
  });

  test("supports trace fees, removal, burn confirmation and empty state", async () => {
    const { document } = useBrowser({
      html: cartMarkup(),
      url: "https://bytes.test/html/cart.html",
      fetchImpl: async () => jsonResponse({}, { ok: false, status: 500 }),
    });
    installCyberUtils();
    let burnConfirm;
    global.Modal = { alert() {}, confirm(_title, _message, callback) { burnConfirm = callback; } };
    global.HackSystem = { init(callback) { callback(false); } };
    localStorage.setItem("cyber_cart", JSON.stringify([{ id: "x", name: "X", price: 100, hl: 0 }]));
    requireFresh("js/cart.js");
    await flushPromises();
    document.getElementById("cart-hack-btn").click();
    assert.equal(sessionStorage.getItem("cart_burned"), "true");
    assert.match(document.getElementById("cart-total-value").textContent, /110.00 eb/);

    document.querySelector(".btn-danger").click();
    assert.deepEqual(JSON.parse(localStorage.getItem("cyber_cart")), []);
    assert.equal(document.getElementById("empty-cart-msg").classList.contains("hidden"), false);
    assert.equal(document.getElementById("cart-export").disabled, true);

    localStorage.setItem("cyber_cart", JSON.stringify([{ id: "y", name: "Y", price: 1 }]));
    document.getElementById("cart-clear").click();
    burnConfirm();
    assert.equal(localStorage.getItem("cyber_cart"), null);
  });

  test("exports a complete data chip with totals and warnings", async () => {
    const { document, window } = useBrowser({
      html: cartMarkup(),
      url: "https://bytes.test/html/cart.html",
      fetchImpl: async () => jsonResponse({ data: {} }),
    });
    installCyberUtils();
    global.Modal = { confirm() {} };
    global.HackSystem = { init() {} };
    localStorage.setItem("cyber_runner_id", "RUNNER");
    localStorage.setItem("cyber_cart", JSON.stringify([{
      id: "consumer",
      name: "Consumer",
      price: 125,
      hl: 3,
      installation: { requires: ["missing"] },
    }]));

    let blobParts;
    let revoked;
    let downloadName;
    const OriginalBlob = global.Blob;
    global.Blob = class BlobCapture {
      constructor(parts) { blobParts = parts; }
    };
    const oldCreate = URL.createObjectURL;
    const oldRevoke = URL.revokeObjectURL;
    const oldClick = window.HTMLAnchorElement.prototype.click;
    URL.createObjectURL = () => "blob:stash";
    URL.revokeObjectURL = (url) => { revoked = url; };
    window.HTMLAnchorElement.prototype.click = function click() { downloadName = this.download; };
    cleanups.push(() => {
      global.Blob = OriginalBlob;
      URL.createObjectURL = oldCreate;
      URL.revokeObjectURL = oldRevoke;
      window.HTMLAnchorElement.prototype.click = oldClick;
    });

    requireFresh("js/cart.js");
    await flushPromises();
    document.getElementById("cart-export").click();
    const exported = JSON.parse(blobParts.join(""));
    assert.equal(exported.runner_id, "RUNNER");
    assert.deepEqual(exported.summary, {
      total_cost: 125,
      total_humanity_loss: 3,
      item_count: 1,
      consistency_warnings: ["Consumer: missing Missing"],
    });
    assert.match(downloadName, /^STASH_RUNNER_\d{4}-\d{2}-\d{2}\.json$/);
    assert.equal(revoked, "blob:stash");
  });

  test("falls back safely when shared utilities are absent", async () => {
    const { document } = useBrowser({
      html: cartMarkup(),
      url: "https://bytes.test/html/cart.html",
      fetchImpl: async () => jsonResponse({ data: {} }),
    });
    global.Modal = { confirm() {} };
    global.HackSystem = { init() {} };
    localStorage.setItem("cyber_cart", "{");
    requireFresh("js/cart.js");
    await flushPromises();
    assert.equal(document.getElementById("cart-export").disabled, true);

    localStorage.setItem("cyber_cart", JSON.stringify([{
      id: "ammo",
      name: "Ammo",
      price: 10,
      installation: {
        requiresAnyGroups: [["plug_a", "plug_b"]],
        slotProvider: "ammo",
        slotCapacity: 2,
      },
      ammoOptionLabel: "Armor Piercing",
      ammoOptionKey: "ap",
      ammoOptionPricingModel: "multiplier",
      ammoOptionMultiplier: 3,
    }]));
    document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
    await flushPromises();
    assert.match(document.getElementById("cart-list").textContent, /REQ ANY plug a \| plug b/i);
    assert.match(document.getElementById("cart-list").textContent, /PROVIDER ammo \(2\)/i);
    assert.match(document.getElementById("cart-list").textContent, /AMMO MOD Armor Piercing x3/);
  });
});
