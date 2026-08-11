const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, describe, test } = require("node:test");
const { JSDOM } = require("jsdom");

const {
  projectRoot,
  installBrowserEnv,
  requireFresh,
  dispatchDOMContentLoaded,
  jsonResponse,
  flushPromises,
} = require("./helpers/browser-env.js");

const cleanups = [];
const readText = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const sha256 = (relativePath) => crypto.createHash("sha256")
  .update(fs.readFileSync(path.join(projectRoot, relativePath)))
  .digest("hex");

afterEach(() => {
  while (cleanups.length) cleanups.pop()();
  delete global.CyberUtils;
});

describe("protected prebuilt areas", () => {
  test("keeps Cyberware and Bundles byte-for-byte", () => {
    const expected = {
      "js/bundles.js": "8151f0bede31ec1abf47bbaf0b43349bd54e27d05dad4bfec7e8c1d5a52c931e",
      "js/script.js": "f06beed80d43e51eb2cf9ca35f4fb71847df665157243ae6816151e430375a95",
      "js/core-utils.js": "c3573ac2e3f2c20b2e606fc20b317523c4fcb20bcf84854dacf454e20f971c08",
      "js/chip-rates.js": "7c4195b51c76be3be76f34e6b3b9e5bc24253d72647930539801db4ea0a51b44",
      "data/cyberwares.json": "d8c961b7c0e479a07096c70b3d4a9b3e5949fd381cdd82094c3455a078bc2776",
      "data/cyberwares.pt-BR.json": "0461c4dc89a715b90d014f004abed3d51071076e4209b36320f2faf3eeceda83",
      "data/equipment.json": "89b2c8d296b1200ab136fae8ef013793f7bc014cbfa23c10486d2ea51f177577",
      "data/equipment.pt-BR.json": "944acaaf5fc273b145aa50b007c36d779bd0170220502a4f7db66cdaea8fb537",
    };
    for (const [relativePath, hash] of Object.entries(expected)) {
      assert.equal(sha256(relativePath), hash, relativePath);
    }
  });
});

describe("global cyberpunk controls", () => {
  test("loads the shared control system on every page through i18n", () => {
    assert.match(readText("js/i18n.js"), /ui-controls\.js/);
    assert.match(readText("css/styles.css"), /GLOBAL CYBER CONTROL SYSTEM/);
    assert.ok(fs.existsSync(path.join(projectRoot, "js/ui-controls.js")));
  });

  test("turns number fields into accessible steppers without changing their identity", () => {
    const browser = installBrowserEnv({
      html: '<label for="price">Max price</label><input id="price" name="price" type="number" min="0" max="20" step="10" value="0">',
    });
    cleanups.push(browser.cleanup);
    const controls = requireFresh("js/ui-controls.js");
    controls.boot(document);
    const input = document.getElementById("price");
    const wrapper = input.closest(".cyber-stepper");
    assert.ok(wrapper);
    assert.equal(input.id, "price");
    wrapper.querySelector(".cyber-stepper__button--up").click();
    assert.equal(input.value, "10");
    wrapper.querySelector(".cyber-stepper__button--down").click();
    assert.equal(input.value, "0");
    assert.match(wrapper.querySelector(".cyber-stepper__button--up").getAttribute("aria-label"), /Max price/);
  });
});

describe("Brainware catalogs", () => {
  test("ships the complete bilingual program and cyberdeck catalogs", () => {
    for (const suffix of ["", ".pt-BR"]) {
      const programs = readJson(`data/programs${suffix}.json`);
      const cyberdecks = readJson(`data/cyberdecks${suffix}.json`);
      assert.equal(programs.programs.length, 267);
      assert.equal(programs.programs.filter((item) => item.catalog_scope === "standard").length, 160);
      assert.equal(programs.programs.filter((item) => item.catalog_scope === "netrunner_conversion").length, 107);
      assert.equal(new Set(programs.programs.map((item) => item.id)).size, 267);
      assert.equal(cyberdecks.decks.length, 32);
      assert.equal(cyberdecks.decks.filter((item) => item.catalog_scope === "standard").length, 27);
      assert.equal(cyberdecks.decks.filter((item) => item.catalog_scope === "netrunner_conversion").length, 5);
      assert.equal(new Set(cyberdecks.decks.map((item) => item.id)).size, 32);
      assert.equal(cyberdecks.builder.chassis.length, 7);
      assert.equal(cyberdecks.builder.options.length, 21);
    }
  });

  test("attributes Brainware and Guide decks without duplicating reprints", () => {
    const decks = readJson("data/cyberdecks.json").decks;
    assert.equal(decks.filter((deck) => deck.source.book === "Rache Bartmoss' Brainware Blowout").length, 26);
    const guideIds = [
      "langley_datastick_mark_vii",
      "liz_cyber_spandeck",
      "microtech_cad_4_commando",
    ];
    for (const id of guideIds) {
      const deck = decks.find((item) => item.id === id);
      assert.ok(deck, id);
      assert.equal(deck.source.book, "Rache Bartmoss' Guide to the Net");
      assert.equal(deck.reprint_source.book, "Rache Bartmoss' Brainware Blowout");
    }
    assert.equal(decks.find((deck) => deck.id === "microtech_cad_4_commando").armor_sp, 20);
  });
});

describe("connected Netrunning experience", () => {
  test("links Programs, Cyberdecks and Build a Deck in every Netrunning route", () => {
    const contracts = {
      "html/programs.html": ["program-search", "program-class", "program-conversions", "program-list"],
      "html/cyberdecks.html": ["deck-conversions", "deck-list", "netgear-list"],
      "html/deck-builder.html": ["deck-builder-form", "deck-options", "builder-programs", "builder-add"],
    };
    for (const [relativePath, ids] of Object.entries(contracts)) {
      const dom = new JSDOM(readText(relativePath));
      ids.forEach((id) => assert.ok(dom.window.document.getElementById(id), `${relativePath}: #${id}`));
      const links = [...dom.window.document.querySelectorAll(".net-tabs a")].map((link) => link.getAttribute("href"));
      assert.deepEqual(links, ["./programs.html", "./cyberdecks.html", "./deck-builder.html"]);
      assert.ok(dom.window.document.querySelector('script[src="../js/netrunning.js"]'));
      dom.window.close();
    }
    assert.match(readText("index.html"), /href="\.\/html\/cyberdecks\.html" class="btn-secondary">Netrunning/);
  });

  test("loads only deck-compatible software and enforces MU", () => {
    const browser = installBrowserEnv();
    cleanups.push(browser.cleanup);
    const utils = requireFresh("js/core-utils.js");
    window.CyberUtils = utils;
    global.CyberUtils = utils;
    const net = requireFresh("js/netrunning.js");
    const programs = readJson("data/programs.json").programs;
    const builder = readJson("data/cyberdecks.json").builder;
    const result = net.calculateDeck(builder, programs, {
      chassisId: "standard",
      expandedMemory: true,
      speed: 3,
      dataWall: 4,
      connectionId: "interface_plugs",
      programIds: ["hammer", "trailer_hitch", "systemware_cloak"],
    });
    assert.deepEqual(result.programs.map((program) => program.id), ["hammer", "trailer_hitch"]);
    assert.equal(result.memory, 24);
    assert.equal(result.speed, 2);
    assert.ok(result.memoryUsed <= result.memory);
    assert.equal(result.valid, true);
  });

  test("renders both shelves and stores programs, published decks and complete builds in the cart", async () => {
    const programs = readJson("data/programs.json");
    const cyberdecks = readJson("data/cyberdecks.json");
    const markup = `<!doctype html><body data-netrunning-page="all">
      <p id="net-status"></p><input id="program-search"><select id="program-class"><option value=""></option></select><input id="program-price"><input id="program-conversions" type="checkbox"><span id="program-count"></span><div id="program-list"></div>
      <input id="deck-conversions" type="checkbox"><span id="deck-count"></span><div id="deck-list"></div><div id="netgear-list"></div>
      <input id="builder-conversions" type="checkbox"><form id="deck-builder-form"><select name="chassis"></select><label><input name="usedStandard" type="checkbox"></label><label><input name="expandedMemory" type="checkbox"></label><select name="speed"></select><select name="dataWall"></select><select name="connection"></select><div id="deck-options"></div><div id="builder-programs"></div></form>
      <span id="builder-total"></span><span id="builder-capacity"></span><span id="builder-breakdown"></span><button id="builder-add"></button>
    </body>`;
    const browser = installBrowserEnv({
      html: markup,
      immediateTimers: true,
      fetchImpl: async (url) => jsonResponse(String(url).includes("programs") ? programs : cyberdecks),
    });
    cleanups.push(browser.cleanup);
    const utils = requireFresh("js/core-utils.js");
    window.CyberUtils = utils;
    global.CyberUtils = utils;
    window.I18n = { getLocale: () => "en-US", dataPath: (value) => value, t: (_key, _params, fallback) => fallback };
    requireFresh("js/netrunning.js");
    dispatchDOMContentLoaded(document);
    await flushPromises(8);

    assert.equal(document.querySelectorAll(".program-card").length, 160);
    assert.equal(document.querySelectorAll("#deck-list .deck-card").length, 27);
    assert.equal(document.querySelectorAll("#netgear-list .deck-card").length, 4);
    assert.equal(document.querySelectorAll(".builder-program").length, 146);
    assert.equal(document.querySelectorAll(".quantity-stepper").length, 4);
    assert.ok(document.querySelector('.builder-option input[type="checkbox"]'));

    const firstStepper = document.querySelector(".quantity-stepper");
    firstStepper.querySelector('[data-step="1"]').click();
    assert.equal(firstStepper.querySelector('input[type="number"]').value, "1");
    firstStepper.querySelector('[data-step="-1"]').click();
    assert.equal(firstStepper.querySelector('input[type="number"]').value, "0");

    document.getElementById("program-conversions").checked = true;
    document.getElementById("program-conversions").dispatchEvent(new window.Event("input"));
    document.getElementById("deck-conversions").checked = true;
    document.getElementById("deck-conversions").dispatchEvent(new window.Event("input"));
    assert.equal(document.querySelectorAll(".program-card").length, 267);
    assert.equal(document.querySelectorAll("#deck-list .deck-card").length, 32);

    document.getElementById("program-search").value = "Wizard's Book";
    document.getElementById("program-search").dispatchEvent(new window.Event("input"));
    document.querySelector(".program-card .btn-add").click();
    document.querySelector("#deck-list .deck-card .btn-add").click();
    assert.equal(JSON.parse(localStorage.getItem("cyber_cart")).length, 2);

    localStorage.removeItem("cyber_cart");
    const form = document.getElementById("deck-builder-form");
    form.elements.chassis.value = "standard";
    form.elements.expandedMemory.checked = true;
    form.elements.speed.value = "2";
    form.elements.dataWall.value = "4";
    form.elements.connection.value = "keyboard";
    form.querySelector('[data-program="hammer"]').checked = true;
    form.dispatchEvent(new window.Event("input", { bubbles: true }));
    document.getElementById("builder-add").click();
    const cart = JSON.parse(localStorage.getItem("cyber_cart"));
    assert.equal(cart.length, 1);
    assert.equal(cart[0].deckConfiguration.kind, "custom");
    assert.deepEqual(cart[0].deckConfiguration.programIds, ["hammer"]);
  });

  test("rehydrates localized programs and full deck configurations in the cart", async () => {
    const payloads = {
      "cyberwares.pt-BR.json": readJson("data/cyberwares.pt-BR.json"),
      "equipment.pt-BR.json": readJson("data/equipment.pt-BR.json"),
      "decks.pt-BR.json": readJson("data/decks.pt-BR.json"),
      "weapons.pt-BR.json": readJson("data/weapons.pt-BR.json"),
      "drugs.pt-BR.json": readJson("data/drugs.pt-BR.json"),
      "chip-rates.pt-BR.json": readJson("data/chip-rates.pt-BR.json"),
      "programs.pt-BR.json": readJson("data/programs.pt-BR.json"),
      "cyberdecks.pt-BR.json": readJson("data/cyberdecks.pt-BR.json"),
    };
    const browser = installBrowserEnv({
      url: "https://bytes.test/html/cart.html",
      html: "<div id='cart-list'></div><p id='empty-cart-msg'></p><strong id='cart-total-value'></strong><button id='cart-clear'></button><button id='cart-export'></button>",
      fetchImpl: async (url) => jsonResponse(payloads[path.basename(String(url))]),
    });
    cleanups.push(browser.cleanup);
    window.I18n = {
      getLocale: () => "pt-BR",
      isPtBr: () => true,
      dataPath: (value) => value.replace(".json", ".pt-BR.json"),
      t: (key, _params, fallback) => ({
        "net.custom_deck": "Cyberdeck Personalizado",
        "net.chassis": "CHASSI",
        "net.connection": "CONEXÃO",
        "net.options": "OPÇÕES",
        "net.loaded": "CARREGADOS",
      }[key] || fallback),
    };
    const utils = requireFresh("js/core-utils.js");
    window.CyberUtils = utils;
    global.CyberUtils = utils;
    global.Modal = { confirm() {}, alert() {} };
    global.HackSystem = { init() {} };
    cleanups.push(() => { delete global.Modal; delete global.HackSystem; });
    localStorage.setItem("cyber_cart", JSON.stringify([
      {
        id: "wizards_book",
        name: "Old Wizard",
        sourceCatalog: "programs",
        price: 400,
        hl: 0,
        program: { strength: { base: 4, situational: [] }, memory: 2, platform: "cyberdeck" },
      },
      {
        id: "custom_cyberdeck_test",
        name: "Old Custom",
        sourceCatalog: "cyberdecks",
        price: 12300,
        hl: 0,
        deckConfiguration: {
          kind: "custom",
          chassisId: "standard",
          connectionId: "trodes",
          cpu: 1,
          memory: 20,
          speed: 2,
          dataWall: 4,
          options: [{ id: "video_monitor", quantity: 2 }],
          programIds: ["hammer", "shield"],
          memoryUsed: 2,
        },
      },
    ]));
    requireFresh("js/cart.js");
    dispatchDOMContentLoaded(document);
    await flushPromises(8);
    const cartText = document.getElementById("cart-list").textContent;
    assert.match(cartText, /Grimório/);
    assert.match(cartText, /Cyberdeck Personalizado/);
    assert.match(cartText, /Padrão/);
    assert.match(cartText, /Monitor de Vídeo/);
    assert.match(cartText, /Martelo, Escudo/);
  });
});
