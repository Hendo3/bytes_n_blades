const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, describe, test } = require("node:test");
const {
  projectRoot, installBrowserEnv, requireFresh, dispatchDOMContentLoaded,
  jsonResponse, flushPromises,
} = require("./helpers/browser-env.js");

const read = (file) => JSON.parse(fs.readFileSync(path.join(projectRoot, file), "utf8"));
let cleanups = [];

function browser(options = {}) {
  const instance = installBrowserEnv(options);
  cleanups.push(instance.cleanup);
  return instance;
}

afterEach(() => {
  while (cleanups.length) cleanups.pop()();
  delete global.CyberUtils;
});

describe("Netrunning data and rules", () => {
  test("contains the complete bilingual retail and optional conversion catalogs", () => {
    const en = read("data/programs.json");
    const pt = read("data/programs.pt-BR.json");
    assert.equal(en.programs.length, 267);
    assert.equal(en.classes.length, 24);
    assert.equal(new Set(en.programs.map((program) => program.id)).size, 267);
    assert.equal(en.programs.filter((program) => program.catalog_scope === "standard").length, 160);
    assert.equal(en.programs.filter((program) => program.catalog_scope === "netrunner_conversion").length, 107);
    const mechanics = (program) => ({
      id: program.id,
      strength: {
        base: program.strength.base,
        display: program.strength.display,
        situational: (program.strength.situational || []).map((entry) => entry.value),
      },
      memory: program.memory,
      memoryModel: {
        kind: program.memory_model.kind,
        amount: program.memory_model.amount,
      },
      price: program.price,
      priceModel: {
        kind: program.price_model.kind,
        amount: program.price_model.amount,
        base: program.price_model.base,
      },
      capacity: program.capacity,
      platform: program.platform,
      loadable: program.loadable,
      availability: program.availability,
      catalogScope: program.catalog_scope,
    });
    assert.deepEqual(pt.programs.map(mechanics), en.programs.map(mechanics));
    assert.deepEqual(en.classes.map((entry) => entry.id), pt.classes.map((entry) => entry.id));
    assert.equal(en.programs.find((program) => program.id === "replicator").price, 320);
    assert.equal(en.programs.find((program) => program.id === "netmap").price, 150);
    assert.equal(en.programs.find((program) => program.id === "sword").price, 6250);
    assert.ok(en.programs.some((program) => program.id === "cerebus"));
    assert.ok(!en.programs.some((program) => program.id === "cerberus"));
    assert.deepEqual(en.programs.find((program) => program.id === "trailer_hitch").deck_effects, {
      memory_multiplier: 1.2, speed_modifier: -1,
    });
    assert.equal(en.programs.find((program) => program.id === "systemware_cloak").platform, "data_fortress");
    assert.equal(en.programs.find((program) => program.id === "systemware_cloak").loadable, false);

    const decks = read("data/cyberdecks.json");
    assert.equal(decks.decks.length, 32);
    assert.equal(decks.decks.filter((deck) => deck.catalog_scope === "standard").length, 27);
    assert.equal(decks.decks.filter((deck) => deck.catalog_scope === "netrunner_conversion").length, 5);
    assert.equal(decks.builder.chassis.length, 7);
    assert.equal(decks.builder.options.length, 21);
    assert.equal(decks.builder.external_products.length, 4);
    assert.equal(decks.decks.find((deck) => deck.id === "kirama_lpd_12").data_wall, null);
    const commando = decks.decks.find((deck) => deck.id === "microtech_cad_4_commando");
    assert.equal(commando.availability, "quote");
    assert.equal(commando.price_model.kind, "black_market_markup");
    assert.equal(commando.armor_sp, 20);
    const guideDecks = decks.decks.filter((deck) => deck.source.book === "Rache Bartmoss' Guide to the Net");
    assert.deepEqual(guideDecks.map((deck) => deck.id), [
      "langley_datastick_mark_vii",
      "liz_cyber_spandeck",
      "microtech_cad_4_commando",
    ]);
    assert.deepEqual(guideDecks.map((deck) => deck.source.pages), ["150-151", "151", "151"]);
    assert.ok(guideDecks.every((deck) => deck.reprint_source.book === "Rache Bartmoss' Brainware Blowout"));
    assert.equal(decks.builder.options.find((option) => option.id === "hardened_circuitry").percent, 20);
  });

  test("filters, labels strength and prices valid deck configurations", () => {
    browser();
    const net = requireFresh("js/netrunning.js");
    const data = read("data/programs.json");
    const decks = read("data/cyberdecks.json");
    const wizard = data.programs.find((program) => program.id === "wizards_book");
    assert.match(net.strengthLabel(wizard), /4 \(6 against Code Gates\)/);
    assert.equal(net.strengthLabel({ strength: { base: 3 } }), "3");
    assert.equal(net.strengthLabel({ strength: { display: "variable" } }), "variable");
    assert.equal(net.memoryLabel(data.programs.find((program) => program.id === "systemware_cloak")), "5 MU per CPU");
    assert.match(net.priceLabel(data.programs.find((program) => program.id === "shrouded_gate")), /3,000 \+ 1,000 eb\/STR/);
    assert.equal(net.isPurchasable(data.programs.find((program) => program.id === "shrouded_gate")), false);
    assert.equal(net.filterPrograms(data.programs, { query: "robotic worm", classId: "intrusion", maxPrice: 700 }).length, 1);
    assert.equal(net.filterPrograms(data.programs, { classId: "demon", maxPrice: 1100 }).length, 2);
    assert.equal(net.filterPrograms(data.programs, { maxPrice: "" }).length, 160);
    assert.equal(net.filterPrograms(data.programs, { maxPrice: "", includeConversions: true }).length, 267);

    const selectedIds = ["hammer", "shield", "see_ya"];
    const result = net.calculateDeck(decks.builder, data.programs, {
      chassisId: "standard", usedStandard: true, expandedMemory: true,
      speed: 9, dataWall: 99, connectionId: "trodes",
      options: { video_monitor: 2, printer: true, scanner: "standard", extra_chips: 0 },
      programIds: selectedIds,
    });
    assert.equal(result.speed, 5);
    assert.equal(result.dataWall, 10);
    assert.equal(result.memory, 20);
    assert.equal(result.memoryUsed, 3);
    assert.equal(result.memoryFree, 17);
    assert.ok(result.valid);
    assert.equal(result.price, 500 + 5000 + 10000 + 8000 + 10 + 2000 + 300 + 200 + 400 + 150 + 280);
    assert.equal(result.options.length, 3);

    const overloaded = net.calculateDeck(decks.builder, data.programs, {
      chassisId: "missing", connectionId: "missing", speed: -2, dataWall: 0,
      programIds: data.programs.filter((program) => program.memory >= 5).map((program) => program.id),
    });
    assert.equal(overloaded.chassis.id, "standard");
    assert.equal(overloaded.connection.id, "interface_plugs");
    assert.equal(overloaded.valid, false);
    assert.ok(overloaded.memoryFree < 0);

    const transport = net.calculateDeck(decks.builder, data.programs, {
      chassisId: "standard", expandedMemory: true, speed: 3, dataWall: 4,
      connectionId: "interface_plugs",
      options: { ebm_xr10_chip_rack: true, hardened_circuitry: true },
      programIds: ["trailer_hitch", "systemware_cloak"],
    });
    assert.equal(transport.memory, 34);
    assert.equal(transport.speed, 2);
    assert.equal(transport.memoryUsed, 3);
    assert.deepEqual(transport.programs.map((program) => program.id), ["trailer_hitch"]);
    assert.equal(transport.price, 23100);
    assert.equal(transport.options.find((option) => option.id === "hardened_circuitry").price, 3800);

    const hauler = net.calculateDeck(decks.builder, data.programs, {
      chassisId: "standard", speed: 3, dataWall: 2,
      connectionId: "interface_plugs", programIds: ["eighteen_wheeler"],
    });
    assert.equal(hauler.memory, 16);
    assert.equal(hauler.speed, 2);
  });

  test("creates standalone and nested cart records and coherent bundle loadouts", () => {
    browser();
    const net = requireFresh("js/netrunning.js");
    const programs = read("data/programs.json").programs;
    const decks = read("data/cyberdecks.json");
    const programItem = net.createProgramCartItem(programs[0], "Intrusion");
    assert.equal(programItem.sourceCatalog, "programs");
    assert.equal(programItem.program.memory, 1);
    const published = net.createDeckCartItem(decks.decks[0]);
    assert.equal(published.deckConfiguration.kind, "published");
    const guidePublished = net.createDeckCartItem(decks.decks.find((deck) => deck.id === "langley_datastick_mark_vii"));
    assert.equal(guidePublished.deckConfiguration.source.book, "Rache Bartmoss' Guide to the Net");
    assert.equal(guidePublished.deckConfiguration.reprintSource.book, "Rache Bartmoss' Brainware Blowout");
    const fiber = net.createNetgearCartItem(decks.builder.external_products[0], 12);
    assert.equal(fiber.price, 12);
    assert.deepEqual(fiber.netgear, { quantity: 12, unit: "meter", unitPrice: 1 });
    const result = net.calculateDeck(decks.builder, programs, { chassisId: "combat", connectionId: "keyboard", programIds: ["hammer"] });
    const custom = net.createCustomDeckCartItem(result);
    assert.equal(custom.deckConfiguration.kind, "custom");
    assert.deepEqual(custom.deckConfiguration.programIds, ["hammer"]);
    assert.ok(custom.id.startsWith("custom_cyberdeck_"));
    const selected = net.selectProgramsForDeck(programs, 10, 2000, () => 0.5);
    assert.ok(selected.length > 0);
    assert.ok(selected.reduce((sum, program) => sum + program.memory, 0) <= 10);
    assert.ok(selected.reduce((sum, program) => sum + program.price, 0) <= 2000);
  });
});

describe("Netrunning browser flows", () => {
  const markup = `<!doctype html><html><body data-netrunning-page="all">
    <p id="net-status"></p><input id="program-search"><select id="program-class"><option value="">All</option></select><input id="program-price"><input id="program-conversions" type="checkbox"><span id="program-count"></span><div id="program-list"></div>
    <input id="deck-conversions" type="checkbox"><span id="deck-count"></span><div id="deck-list"></div><div id="netgear-list"></div>
    <input id="builder-conversions" type="checkbox">
    <form id="deck-builder-form"><select name="chassis"></select><label><input name="usedStandard" type="checkbox"></label><label><input name="expandedMemory" type="checkbox"></label><select name="speed"></select><select name="dataWall"></select><select name="connection"></select><div id="deck-options"></div><div id="builder-programs"></div></form>
    <span id="builder-total"></span><span id="builder-capacity"></span><span id="builder-breakdown"></span><button id="builder-add"></button>
  </body></html>`;

  test("loads, renders, filters and purchases programs and decks", async () => {
    const programData = read("data/programs.json");
    const deckData = read("data/cyberdecks.json");
    const { document, window } = browser({
      html: markup, immediateTimers: true,
      fetchImpl: async (url) => jsonResponse(String(url).includes("programs") ? programData : deckData),
    });
    const utils = requireFresh("js/core-utils.js");
    window.CyberUtils = utils;
    global.CyberUtils = utils;
    window.I18n = { getLocale: () => "en-US", dataPath: (value) => value, t: (_key, _params, fallback) => fallback };
    const net = requireFresh("js/netrunning.js");
    dispatchDOMContentLoaded(document);
    await flushPromises(8);

    assert.equal(document.querySelectorAll(".program-card").length, 160);
    assert.equal(document.querySelectorAll("#deck-list .deck-card").length, 27);
    assert.equal(document.querySelectorAll("#deck-list .deck-source").length, 27);
    assert.equal(document.querySelectorAll("#deck-list .deck-reprint").length, 3);
    assert.equal([...document.querySelectorAll("#deck-list .deck-source")]
      .filter((entry) => entry.textContent.includes("Rache Bartmoss' Guide to the Net")).length, 3);
    assert.equal(document.querySelectorAll("#netgear-list .deck-card").length, 4);
    assert.equal(document.querySelectorAll(".builder-program").length, 146);
    assert.ok(document.getElementById("net-status").classList.contains("hidden"));

    document.getElementById("program-conversions").checked = true;
    document.getElementById("program-conversions").dispatchEvent(new window.Event("input"));
    assert.equal(document.querySelectorAll(".program-card").length, 267);
    document.getElementById("deck-conversions").checked = true;
    document.getElementById("deck-conversions").dispatchEvent(new window.Event("input"));
    assert.equal(document.querySelectorAll("#deck-list .deck-card").length, 32);
    document.getElementById("builder-conversions").checked = true;
    document.getElementById("builder-conversions").dispatchEvent(new window.Event("input"));
    assert.equal(document.querySelectorAll(".builder-program").length, 222);

    document.getElementById("program-search").value = "Wizard's Book";
    document.getElementById("program-search").dispatchEvent(new window.Event("input"));
    assert.equal(document.querySelectorAll(".program-card").length, 1);
    document.querySelector(".program-card .btn-add").click();
    assert.equal(JSON.parse(localStorage.getItem("cyber_cart")).length, 1);
    document.querySelector("#deck-list .deck-card .btn-add").click();
    assert.equal(JSON.parse(localStorage.getItem("cyber_cart")).length, 2);

    localStorage.removeItem("cyber_cart");
    const form = document.getElementById("deck-builder-form");
    form.elements.chassis.value = "standard";
    form.elements.usedStandard.checked = true;
    form.elements.expandedMemory.checked = true;
    form.elements.speed.value = "2";
    form.elements.dataWall.value = "4";
    form.elements.connection.value = "keyboard";
    form.querySelector("[data-option='printer']").checked = true;
    form.querySelector("[data-option='video_monitor']").value = "2";
    form.querySelector("[data-option='scanner']").value = "professional";
    form.querySelector("[data-program='hammer']").checked = true;
    form.dispatchEvent(new window.Event("input", { bubbles: true }));
    assert.match(document.getElementById("builder-capacity").textContent, /1\/20 MU/);
    document.getElementById("builder-add").click();
    const cart = JSON.parse(localStorage.getItem("cyber_cart"));
    assert.equal(cart.length, 1);
    assert.equal(cart[0].deckConfiguration.kind, "custom");
    assert.deepEqual(cart[0].deckConfiguration.programIds, ["hammer"]);

    const selection = net.readBuilderSelection(form);
    assert.equal(selection.options.video_monitor, "2");
    assert.equal(selection.options.printer, true);
  });

  test("disables an overloaded build and reports an offline feed", async () => {
    const programData = read("data/programs.json");
    const deckData = read("data/cyberdecks.json");
    const online = browser();
    const net = requireFresh("js/netrunning.js");
    online.document.body.innerHTML = markup;
    net.initBuilder(programData, deckData);
    [...online.document.querySelectorAll("[data-program]")].forEach((field) => { field.checked = true; });
    online.document.getElementById("deck-builder-form").dispatchEvent(new online.window.Event("input", { bubbles: true }));
    assert.equal(online.document.getElementById("builder-add").disabled, true);
    assert.ok(online.document.getElementById("builder-capacity").classList.contains("over-capacity"));

    online.cleanup();
    cleanups.pop();
    const offline = browser({ html: "<body data-netrunning-page='programs'><p id='net-status'></p></body>", fetchImpl: async () => jsonResponse({}, { ok: false, status: 503 }) });
    requireFresh("js/netrunning.js");
    dispatchDOMContentLoaded(offline.document);
    await flushPromises(6);
    assert.match(offline.document.getElementById("net-status").textContent, /offline/);
  });

  test("rehydrates localized program and nested deck details in the cart", async () => {
    const payloads = {
      "cyberwares.pt-BR.json": read("data/cyberwares.pt-BR.json"),
      "equipment.pt-BR.json": read("data/equipment.pt-BR.json"),
      "weapons.pt-BR.json": read("data/weapons.pt-BR.json"),
      "drugs.pt-BR.json": read("data/drugs.pt-BR.json"),
      "chip-rates.pt-BR.json": read("data/chip-rates.pt-BR.json"),
      "programs.pt-BR.json": read("data/programs.pt-BR.json"),
      "cyberdecks.pt-BR.json": read("data/cyberdecks.pt-BR.json"),
    };
    const { document, window } = browser({
      url: "https://bytes.test/html/cart.html",
      html: "<div id='cart-list'></div><p id='empty-cart-msg'></p><strong id='cart-total-value'></strong><button id='cart-clear'></button><button id='cart-export'></button>",
      fetchImpl: async (url) => jsonResponse(payloads[path.basename(String(url))]),
    });
    window.I18n = {
      getLocale: () => "pt-BR", isPtBr: () => true,
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
        id: "wizards_book", name: "Old Wizard", sourceCatalog: "programs", price: 400, hl: 0,
        program: { strength: { base: 4, situational: [{ value: 6, when: "against Code Gates" }] }, memory: 2 },
      },
      {
        id: "custom_cyberdeck_1", name: "Old Custom", sourceCatalog: "cyberdecks", price: 12300, hl: 0,
        deckConfiguration: {
          kind: "custom", chassisId: "standard", connectionId: "trodes", cpu: 1, memory: 20,
          speed: 2, dataWall: 4, options: [
            { id: "video_monitor", quantity: 2 },
            { id: "scanner", choiceId: "professional", quantity: 1 },
          ], programIds: ["hammer", "shield"], memoryUsed: 2,
        },
      },
    ]));
    requireFresh("js/cart.js");
    dispatchDOMContentLoaded(document);
    await flushPromises(8);
    const text = document.getElementById("cart-list").textContent;
    assert.match(text, /Grimório/);
    assert.match(text, /Cyberdeck Personalizado/);
    assert.match(text, /Padrão/);
    assert.match(text, /Monitor de Vídeo/);
    assert.match(text, /Martelo, Escudo/);
  });

  test("applies equipment category price modifiers to display and cart", async () => {
    const catalog = { data: { fashion: { name: "Fashion", modifiers: { Generic: "1x", Luxury: "4x" }, items: {
      coat: { id: "coat", name: "Coat", description: "Sharp", price: 100 },
    } } } };
    const html = `<button id="filter-toggle"></button><aside id="filter-sidebar" class="hidden"><button id="close-filter"></button></aside>
      <div id="category-list"></div><h1 id="title-category"></h1><div id="items-list"></div><select id="fs-category"></select>
      <input id="fs-price-max-input"><input id="fs-hl-max-input"><input id="fs-cir-input"><input id="fs-difficulty-max-input"><button id="fs-apply"></button><button id="fs-clear"></button>`;
    const { document, window } = browser({
      html, url: "https://bytes.test/html/accessories.html", immediateTimers: true,
      fetchImpl: async () => jsonResponse(catalog),
    });
    const utils = requireFresh("js/core-utils.js");
    window.CyberUtils = utils;
    global.CyberUtils = utils;
    const script = requireFresh("js/script.js");
    await flushPromises(5);
    const select = document.querySelector("select[id^='price-modifier-']");
    assert.ok(select);
    select.value = "luxury";
    select.dispatchEvent(new window.Event("change"));
    assert.match(document.querySelector("[id^='price-']").textContent, /400\.00 eb/);
    document.querySelector(".btn-add").click();
    const item = JSON.parse(localStorage.getItem("cyber_cart"))[0];
    assert.equal(item.price, 400);
    assert.equal(item.selectedPriceModifier.multiplier, 4);
    assert.equal(script.AMMO_OPTIONS.find((entry) => entry.key === "electrothermal").multiplier, 2);
  });
});
