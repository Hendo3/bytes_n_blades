const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, describe, test } = require("node:test");

const {
  projectRoot,
  installBrowserEnv,
  requireFresh,
  dispatchDOMContentLoaded,
  flushPromises,
  jsonResponse,
} = require("./helpers/browser-env.js");

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

function silenceConsole(...methods) {
  const originals = Object.fromEntries(methods.map((method) => [method, console[method]]));
  methods.forEach((method) => { console[method] = () => {}; });
  cleanups.push(() => Object.assign(console, originals));
}

afterEach(() => {
  while (cleanups.length) cleanups.pop()();
  delete global.Modal;
  delete global.HackSystem;
});

describe("modal system", () => {
  test("alert renders, focuses and invokes its callback", () => {
    const { document } = useBrowser();
    const Modal = requireFresh("js/modal.js");
    let called = 0;

    Modal.alert("SYSTEM", "line one\nline two", () => called += 1);
    const overlay = document.getElementById("custom-modal");
    assert.ok(overlay);
    assert.match(overlay.querySelector(".modal-body").innerHTML, /line one<br>line two/);
    const button = overlay.querySelector("button");
    assert.equal(document.activeElement, button);
    button.click();
    assert.equal(called, 1);
    assert.equal(document.getElementById("custom-modal"), null);
  });

  test("confirm supports cancel, confirm and replacement", () => {
    const { document } = useBrowser();
    const Modal = requireFresh("js/modal.js");
    const events = [];

    Modal.alert("OLD", "old");
    Modal.confirm("NEW", "new", () => events.push("confirm"), () => events.push("cancel"));
    assert.equal(document.querySelectorAll("#custom-modal").length, 1);
    assert.equal(document.querySelector(".modal-header").textContent, "NEW");
    document.querySelectorAll(".modal-footer button")[0].click();
    assert.deepEqual(events, ["cancel"]);

    Modal.confirm("AGAIN", "new", () => events.push("confirm"));
    document.querySelectorAll(".modal-footer button")[1].click();
    assert.deepEqual(events, ["cancel", "confirm"]);
    Modal.close();
  });
});

describe("breach protocol", () => {
  test("runs both successful and failed stop paths", () => {
    const { document } = useBrowser({ immediateTimers: true });
    global.requestAnimationFrame = () => 11;
    global.cancelAnimationFrame = () => {};
    const HackSystem = requireFresh("js/hack.js");
    const results = [];

    HackSystem.onComplete = (success) => results.push(success);
    HackSystem.createUI();
    const screen = document.getElementById("hack-screen");
    Object.defineProperty(screen, "offsetWidth", { configurable: true, value: 200 });
    HackSystem.startRound();
    HackSystem.targetStart = 40;
    HackSystem.targetWidth = 20;
    HackSystem.cursorPos = 50;
    document.getElementById("btn-hack-stop").click();
    assert.deepEqual(results, [true]);
    assert.equal(document.getElementById("hack-overlay"), null);

    HackSystem.init((success) => results.push(success));
    HackSystem.targetStart = 100;
    HackSystem.targetWidth = 10;
    HackSystem.cursorPos = 0;
    HackSystem.stop();
    assert.deepEqual(results, [true, false]);
  });

  test("moves the cursor, bounces and stops when UI disappears", () => {
    const { document } = useBrowser();
    global.requestAnimationFrame = () => 12;
    const HackSystem = requireFresh("js/hack.js");
    HackSystem.createUI();
    const screen = document.getElementById("hack-screen");
    Object.defineProperty(screen, "offsetWidth", { configurable: true, value: 100 });
    HackSystem.isRunning = true;
    HackSystem.cursorPos = 99;
    HackSystem.speed = 5;
    HackSystem.direction = 1;
    HackSystem.loop();
    assert.equal(HackSystem.direction, -1);
    assert.equal(document.getElementById("hack-cursor").style.left, "104px");
    HackSystem.isRunning = false;
    HackSystem.loop();
    screen.remove();
    HackSystem.isRunning = true;
    HackSystem.loop();
  });
});

describe("chip rate UI", () => {
  test("renders rate, level-table and referee-priced rows", () => {
    const { document } = useBrowser({
      html: "<main id='rates'></main>",
    });
    installCyberUtils();
    const chips = requireFresh("js/chip-rates.js");
    const container = document.getElementById("rates");

    chips.renderGroups(container, [{
      id: "visual_profiles",
      label: "Profiles <safe>",
      items: [
        { skill: "Techie", pricePerLevel: 100 },
        { skill: "Corporate", levelPrices: [50, 100, 150], note: "table" },
        { skill: "Expert <pick>", pricePerLevel: null, note: "Ref decision" },
      ],
    }], "visual_recognition");

    assert.equal(container.querySelectorAll("li").length, 3);
    assert.equal(container.querySelectorAll("button[data-role='chip-add']").length, 2);
    assert.match(container.textContent, /L1 50 ed \/ L2 100 ed \/ L3 150 ed/);
    assert.match(container.innerHTML, /Profiles &lt;safe&gt;/);
    assert.doesNotMatch(container.innerHTML, /<pick>/);
  });

  test("adds rate-based and table-based chip levels to the cart", () => {
    const { document, window } = useBrowser({
      html: "<div id='rates'></div>",
      immediateTimers: true,
    });
    installCyberUtils();
    const chips = requireFresh("js/chip-rates.js");
    const events = [];
    window.addEventListener("stash-updated", () => events.push("updated"));

    chips.renderGroups(document.getElementById("rates"), [{
      id: "section",
      label: "Section",
      items: [
        { skill: "Pilot (Gyro)", pricePerLevel: 300 },
        { skill: "Corporate", levelPrices: [50, 100, 150] },
      ],
    }], "visual_recognition");

    const [rateButton, tableButton] = document.querySelectorAll("button[data-role='chip-add']");
    rateButton.parentElement.querySelector("select").value = "3";
    rateButton.click();
    tableButton.parentElement.querySelector("select").value = "2";
    tableButton.click();

    const cart = JSON.parse(localStorage.getItem("cyber_cart"));
    assert.equal(cart.length, 2);
    assert.equal(cart[0].price, 900);
    assert.equal(cart[1].price, 100);
    assert.deepEqual(cart[0].installation.requires, ["chipware_socket", "neuralware_processor"]);
    assert.ok(cart[0].tags.includes("visual_recognition_chip"));
    assert.equal(events.length, 2);
  });

  test("recovers from corrupted storage and handles an empty rate table", () => {
    const { document } = useBrowser({ html: "<div id='rates'></div>" });
    const chips = requireFresh("js/chip-rates.js");
    localStorage.setItem("cyber_cart", "{");
    chips.addToCart({ id: "x" });
    assert.equal(JSON.parse(localStorage.getItem("cyber_cart")).length, 1);
    chips.renderGroups(document.getElementById("rates"), [], "aptr");
    assert.match(document.getElementById("rates").textContent, /No rates found/);
    assert.equal(chips.slugify("Áudio & Vídeo"), "audio_video");
    assert.equal(chips.escapeHtml("<&\"'>"), "&lt;&amp;&quot;&#039;&gt;");
  });

  test("loads the page specification and reports fetch failures", async () => {
    const payload = JSON.parse(fs.readFileSync(path.join(projectRoot, "data/chip-rates.json"), "utf8"));
    const success = useBrowser({
      html: "<body data-chip-type='aptr'><h1 id='chip-title'></h1><p id='chip-subtitle'></p><div id='chip-rate-groups'></div></body>",
      fetchImpl: async () => jsonResponse(payload),
    });
    requireFresh("js/chip-rates.js");
    dispatchDOMContentLoaded(success.document);
    await flushPromises();
    assert.match(success.document.getElementById("chip-title").textContent, /APTR/);
    assert.ok(success.document.querySelectorAll(".chip-rate-card").length >= 1);

    const failure = useBrowser({
      html: "<body data-chip-type='missing'><div id='chip-rate-groups'></div></body>",
      fetchImpl: async () => jsonResponse({}, { ok: false, status: 503 }),
    });
    requireFresh("js/chip-rates.js");
    dispatchDOMContentLoaded(failure.document);
    await flushPromises();
    assert.match(failure.document.getElementById("chip-rate-groups").textContent, /RATE FEED OFFLINE/);
  });
});

describe("drug generator", () => {
  function generatorMarkup() {
    return `
      <form id="drug-generator-form">
        <input id="dg-name">
        <select id="dg-type"></select>
        <select id="dg-strength"></select>
        <select id="dg-duration"></select>
        <div id="dg-effects"></div>
        <div id="dg-risks"></div>
        <button id="dg-generate" type="button">generate</button>
        <button id="dg-random" type="button">random</button>
      </form>
      <article id="dg-result"><div id="dg-sheet"></div><button id="dg-add-cart" type="button">cart</button></article>
    `;
  }

  function captureUi(document) {
    return {
      form: document.getElementById("drug-generator-form"),
      name: document.getElementById("dg-name"),
      type: document.getElementById("dg-type"),
      strength: document.getElementById("dg-strength"),
      duration: document.getElementById("dg-duration"),
      effects: document.getElementById("dg-effects"),
      risks: document.getElementById("dg-risks"),
      generate: document.getElementById("dg-generate"),
      random: document.getElementById("dg-random"),
      result: document.getElementById("dg-result"),
      addCart: document.getElementById("dg-add-cart"),
    };
  }

  test("hydrates options, computes official difficulty and renders a cart-ready result", () => {
    const { document } = useBrowser({ html: generatorMarkup() });
    installCyberUtils();
    const generator = requireFresh("js/drugs-generator.js");
    const options = readDrugOptions();
    const ui = captureUi(document);
    generator.hydrateForm(ui, options);

    ui.type.value = Object.keys(options.types)[0];
    ui.strength.value = options.strengthOptions[1].value;
    ui.duration.value = "1";
    ui.effects.querySelector("input").checked = true;
    ui.risks.querySelector("input").checked = true;
    ui.name.value = "Custom Dose";

    const build = generator.generateDrug(ui, options);
    const strength = Number(options.strengthOptions[1].value);
    const effectMod = Number(options.effectOptions[0].difficultyMod);
    const riskMod = Number(options.riskOptions[0].difficultyMod);
    const multiplier = Number(options.durationOptions[1].multiplier || 1);
    assert.equal(build.difficulty, Math.max(1, (strength + effectMod + riskMod) * multiplier));
    assert.equal(Number(build.price), build.difficulty * 25);
    assert.equal(build.name, "Custom Dose");
    assert.match(build.buildMeta.formulaCoreName, /^C\d+H\d+N\d+O\d+-/);

    generator.renderResult(ui, build);
    assert.match(ui.result.textContent, /Custom Dose/);
    ui.result.querySelector("#dg-add-cart").click();
    const cart = JSON.parse(localStorage.getItem("cyber_cart"));
    assert.equal(cart.length, 1);
    assert.equal(cart[0].name, "Custom Dose");
  });

  test("uses formula defaults, placeholders, escaping and corrupted-cart recovery", () => {
    const { document } = useBrowser({ html: generatorMarkup() });
    const generator = requireFresh("js/drugs-generator.js");
    const options = readDrugOptions();
    const ui = captureUi(document);
    generator.hydrateForm(ui, options);
    generator.bindNamePlaceholder(ui, options);
    generator.refreshNamePlaceholder(ui, options);
    assert.match(ui.name.placeholder, /^ex\.: C/);

    const build = generator.generateDrug(ui, options);
    assert.equal(build.name, build.buildMeta.formulaCoreName);
    assert.match(generator.buildFakeFormula(build), /\/\/ µ-/);
    assert.match(generator.buildFakeFormula({
      type: "stim",
      difficulty: 2,
      effects: [],
      buildMeta: {},
    }), /^C\d+H\d+N\d+O\d+-STI/);
    assert.equal(generator.escapeHtml("<&\"'>"), "&lt;&amp;&quot;&#39;&gt;");
    assert.equal(generator.normalizeName("Áudio Dose"), "audio dose");

    localStorage.setItem("cyber_cart", "not-json");
    generator.addBuildToCart(build);
    assert.equal(JSON.parse(localStorage.getItem("cyber_cart")).length, 1);
    localStorage.setItem("cyber_cart", "{}");
    generator.addBuildToCart(build);
    assert.equal(JSON.parse(localStorage.getItem("cyber_cart")).length, 1);
    generator.addBuildToCart(null);
    generator.fillSelect(null, []);
    assert.deepEqual(generator.selectedChecklist(null), []);
  });

  test("randomizes every option group within its supported limits", () => {
    const { document } = useBrowser({ html: generatorMarkup() });
    const generator = requireFresh("js/drugs-generator.js");
    const options = readDrugOptions();
    const ui = captureUi(document);
    generator.hydrateForm(ui, options);
    const originalRandom = Math.random;
    Math.random = () => 0.999;
    try {
      generator.randomizeSelections(ui, options);
    } finally {
      Math.random = originalRandom;
    }
    assert.equal(ui.type.value, Object.keys(options.types).at(-1));
    assert.equal(ui.strength.value, options.strengthOptions.at(-1).value);
    assert.equal(ui.duration.value, String(options.durationOptions.length - 1));
    assert.ok(ui.effects.querySelectorAll("input:checked").length <= 3);
    assert.ok(ui.risks.querySelectorAll("input:checked").length <= 2);
  });

  test("uses defensive defaults for an incomplete generator table", () => {
    const { document } = useBrowser({ html: generatorMarkup() });
    const generator = requireFresh("js/drugs-generator.js");
    const ui = captureUi(document);
    generator.hydrateForm(ui, {});
    ui.type.innerHTML = "<option value='unknown'>unknown</option>";
    ui.strength.innerHTML = "<option value=''>empty</option>";
    ui.duration.innerHTML = "<option value='99'>missing</option>";
    const build = generator.generateDrug(ui, {});
    assert.equal(build.difficulty, 1);
    assert.equal(build.price, "25");
    assert.equal(build.duration, "1D10+1 turns");
    assert.deepEqual(build.effects, []);
    assert.deepEqual(build.sideEffects, []);
    assert.match(generator.previewFormulaCoreName(ui, {}), /^C/);
    assert.equal(generator.buildFormulaCore({}), "C15H19N2O2-STR");
  });

  test("initializes from JSON and shows the offline state", async () => {
    const drugs = JSON.parse(fs.readFileSync(path.join(projectRoot, "data/drugs.json"), "utf8"));
    const success = useBrowser({ html: generatorMarkup(), fetchImpl: async () => jsonResponse(drugs) });
    installCyberUtils();
    const alerts = [];
    global.Modal = { alert: (...args) => alerts.push(args) };
    const initialAddButton = success.document.getElementById("dg-add-cart");
    requireFresh("js/drugs-generator.js");
    await flushPromises();
    assert.ok(success.document.querySelector("#dg-result #dg-add-cart"));
    success.document.getElementById("dg-generate").click();
    success.document.getElementById("dg-random").click();
    initialAddButton.click();
    assert.equal(JSON.parse(success.window.localStorage.getItem("cyber_cart")).length, 1);
    assert.equal(alerts.length, 1);

    const failure = useBrowser({
      html: generatorMarkup(),
      fetchImpl: async () => jsonResponse({}, { ok: false, status: 500 }),
    });
    requireFresh("js/drugs-generator.js");
    await flushPromises();
    assert.match(failure.document.getElementById("dg-result").textContent, /FORGE OFFLINE/);

    const missingOptions = useBrowser({
      html: generatorMarkup(),
      fetchImpl: async () => jsonResponse({ data: {} }),
    });
    requireFresh("js/drugs-generator.js");
    await flushPromises();
    assert.match(missingOptions.document.getElementById("dg-result").textContent, /Generator options not found/);
  });

  function readDrugOptions() {
    return JSON.parse(fs.readFileSync(path.join(projectRoot, "data/drugs.json"), "utf8")).data.generatorOptions;
  }
});

describe("login and authentication", () => {
  test("validates handles, stores an uppercase identity and clears stale state", () => {
    silenceConsole("log", "warn");
    const { document } = useBrowser({
      html: "<form id='login-form'><input id='runner-handle'><button id='btn-jack-in'></button></form>",
      url: "https://bytes.test/login.html",
      immediateTimers: true,
    });
    localStorage.setItem("stale", "1");
    sessionStorage.setItem("stale", "1");
    requireFresh("js/login.js");
    dispatchDOMContentLoaded(document);
    assert.equal(localStorage.getItem("stale"), null);
    assert.equal(sessionStorage.getItem("stale"), null);

    const input = document.getElementById("runner-handle");
    const button = document.getElementById("btn-jack-in");
    input.value = "bad handle!";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    assert.equal(input.value, "badhandle!");
    assert.equal(button.disabled, true);
    assert.equal(button.textContent, "INVALID CHARACTERS");

    input.value = "runner_01";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    assert.equal(button.disabled, false);
    document.getElementById("login-form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    assert.equal(localStorage.getItem("cyber_runner_id"), "RUNNER_01");
    assert.equal(button.textContent, "ACCESS GRANTED...");
  });

  test("authorized pages display identity and jack-out clears all state", () => {
    silenceConsole("log", "warn");
    const { document } = useBrowser({
      html: "<p class='tagline'></p><ul class='nav-links'></ul>",
      url: "https://bytes.test/html/cart.html",
    });
    localStorage.setItem("cyber_runner_id", "EDUARDO");
    localStorage.setItem("cyber_cart", "[1]");
    sessionStorage.setItem("cart_hacked", "true");
    let confirmation;
    global.Modal = { confirm(...args) { confirmation = args; } };
    requireFresh("js/auth.js");
    dispatchDOMContentLoaded(document);

    assert.match(document.querySelector(".tagline").textContent, /EDUARDO/);
    const logout = document.querySelector(".nav-links a");
    assert.equal(logout.textContent, "[ JACK OUT ]");
    logout.click();
    assert.equal(confirmation[0], "JACK OUT?");
    confirmation[2]();
    assert.equal(localStorage.length, 0);
    assert.equal(sessionStorage.length, 0);
  });

  test("unauthorized pages wipe local state and cookies", () => {
    silenceConsole("log", "warn");
    useBrowser({ url: "https://bytes.test/html/weapons.html" });
    localStorage.setItem("cyber_cart", "[1]");
    sessionStorage.setItem("cart_hacked", "true");
    document.cookie = "token=secret; path=/";
    requireFresh("js/auth.js");
    assert.equal(localStorage.length, 0);
    assert.equal(sessionStorage.length, 0);
    assert.equal(document.cookie, "");
  });

  test("login redirects an already authenticated runner", () => {
    const browser = useBrowser({ url: "https://bytes.test/login.html" });
    localStorage.setItem("cyber_runner_id", "RUNNER");
    requireFresh("js/login.js");
    assert.ok(browser.jsdomErrors.length >= 1);
  });
});

describe("debug console", () => {
  test("captures console, storage, network, errors, clear/pause and export actions", async () => {
    const html = `
      <div id="debug-output"></div>
      <button id="dbg-clear"></button><button id="dbg-pause"></button><button id="dbg-export"></button>
      <button id="dbg-check-cyberwares"></button><button id="dbg-check-equipment"></button><button id="dbg-check-weapons"></button>
      <button id="dbg-snapshot-storage"></button><button id="dbg-test-error"></button>
    `;
    const { document, window } = useBrowser({
      html,
      fetchImpl: async (url) => {
        if (String(url).includes("weapons")) throw new Error("offline");
        return jsonResponse({ data: {} });
      },
    });
    localStorage.setItem("x", "1");
    const originalConsole = Object.fromEntries(["log", "info", "warn", "error"].map((key) => [key, console[key]]));
    cleanups.push(() => Object.assign(console, originalConsole));
    Object.assign(console, { log() {}, info() {}, warn() {}, error() {} });
    const oldCreate = URL.createObjectURL;
    const oldRevoke = URL.revokeObjectURL;
    const oldClick = window.HTMLAnchorElement.prototype.click;
    URL.createObjectURL = () => "blob:test";
    URL.revokeObjectURL = () => {};
    window.HTMLAnchorElement.prototype.click = () => {};
    cleanups.push(() => {
      URL.createObjectURL = oldCreate;
      URL.revokeObjectURL = oldRevoke;
      window.HTMLAnchorElement.prototype.click = oldClick;
    });

    requireFresh("js/debug.js");
    await flushPromises();
    assert.match(document.getElementById("debug-output").textContent, /Debug console initialized/);
    console.info("captured", { ok: true });
    assert.match(document.getElementById("debug-output").textContent, /captured/);

    document.getElementById("dbg-snapshot-storage").click();
    assert.match(document.getElementById("debug-output").textContent, /localStorage/);
    document.getElementById("dbg-check-cyberwares").click();
    document.getElementById("dbg-check-weapons").click();
    await window.fetch("../data/equipment.json");
    await assert.rejects(() => window.fetch("../data/weapons.json"), /offline/);
    await flushPromises();
    assert.match(document.getElementById("debug-output").textContent, /NETWORK/);
    assert.match(document.getElementById("debug-output").textContent, /offline/);

    window.dispatchEvent(new window.ErrorEvent("error", { message: "boom", filename: "x.js", lineno: 1 }));
    const rejection = new window.Event("unhandledrejection");
    Object.defineProperty(rejection, "reason", { value: "reject" });
    window.dispatchEvent(rejection);
    const circular = {};
    circular.self = circular;
    const circularRejection = new window.Event("unhandledrejection");
    Object.defineProperty(circularRejection, "reason", { value: circular });
    window.dispatchEvent(circularRejection);
    assert.match(document.getElementById("debug-output").textContent, /boom/);
    assert.match(document.getElementById("debug-output").textContent, /unhandledrejection/);

    document.getElementById("dbg-pause").click();
    assert.equal(document.getElementById("dbg-pause").textContent, "Resume");
    console.log("hidden while paused");
    assert.doesNotMatch(document.getElementById("debug-output").textContent, /hidden while paused/);
    document.getElementById("dbg-pause").click();
    document.getElementById("dbg-export").click();
    assert.match(document.getElementById("debug-output").textContent, /Logs exported/);
    document.getElementById("dbg-clear").click();
    assert.match(document.getElementById("debug-output").textContent, /Console cleared/);
    document.getElementById("dbg-test-error").click();
    assert.match(document.getElementById("debug-output").textContent, /Manual debug error/);
  });
});
