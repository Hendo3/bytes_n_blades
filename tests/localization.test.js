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
} = require("./helpers/browser-env.js");

const cleanups = [];

function useBrowser(options) {
  const browser = installBrowserEnv(options);
  cleanups.push(() => browser.cleanup());
  return browser;
}

function installI18n(locale = "pt-BR") {
  if (locale) localStorage.setItem("bytes_locale", locale);
  return requireFresh("js/i18n.js");
}

afterEach(() => {
  while (cleanups.length) cleanups.pop()();
  delete global.I18n;
});

describe("global EN-US and pt-BR localization", () => {
  test("translates static content, metadata and the manifest while injecting one selector", () => {
    const { document, window, jsdomErrors } = useBrowser({
      html: `<!doctype html><html lang="en-US"><head>
        <title>Byte & Blades Store | Home</title>
        <meta name="description" content="Byte & Blades: offgrid market for edgerunners. We move everything: chrome, gear, weapons, combat chems and dirty custom jobs.">
        <link rel="manifest" href="./manifest.webmanifest">
      </head><body>
        <header class="navbar"><nav aria-label="Main Navigation"><a title="Back to home">Home</a></nav></header>
        <main><h1>Cart</h1><input placeholder="Compound Name"></main>
      </body></html>`,
    });
    const i18n = installI18n();
    dispatchDOMContentLoaded(document);

    assert.equal(document.documentElement.lang, "pt-BR");
    assert.equal(document.title, "Loja Byte & Blades | Início");
    assert.equal(document.querySelector("h1").textContent, "Carrinho");
    assert.equal(document.querySelector("a").textContent, "Início");
    assert.equal(document.querySelector("a").title, "Voltar ao início");
    assert.equal(document.querySelector("nav").getAttribute("aria-label"), "Navegação Principal");
    assert.equal(document.querySelector("input").placeholder, "Nome do Composto");
    assert.match(document.querySelector("meta[name='description']").content, /mercado fora da rede/);
    assert.match(document.querySelector("link[rel='manifest']").href, /manifest\.pt-BR\.webmanifest$/);
    assert.equal(document.querySelectorAll("#language-select").length, 1);
    assert.equal(document.querySelector("#language-select").value, "pt-BR");
    assert.equal(document.querySelector(".language-selector label").textContent, "Idioma");

    assert.equal(i18n.normalizeLocale("pt"), "pt-BR");
    assert.equal(i18n.normalizeLocale("PT-br"), "pt-BR");
    assert.equal(i18n.normalizeLocale("fr-FR"), "en-US");
    assert.equal(i18n.isPtBr(), true);
    assert.equal(i18n.dataPath("../data/drugs.json?cache=1"), "../data/drugs.pt-BR.json?cache=1");
    assert.equal(i18n.t("catalog.damage_report", { name: "Sintecoca" }, "fallback"), "RELATÓRIO DE DANO: Sintecoca");
    assert.equal(i18n.t("missing.key", { value: 7 }, "Value {value} / {kept}"), "Value 7 / {kept}");

    const fragment = document.createElement("section");
    fragment.innerHTML = "<span>Weapons</span><script>Cart</script><style>Cart</style>";
    document.body.appendChild(fragment);
    i18n.translateStatic(fragment);
    assert.equal(fragment.querySelector("span").textContent, "Armas");
    assert.equal(fragment.querySelector("script").textContent, "Cart");
    assert.equal(fragment.querySelector("style").textContent, "Cart");
    i18n.translateStatic(null);

    localStorage.setItem("cyber_cart", "[1]");
    i18n.preserveLocaleAndClear(localStorage);
    assert.equal(localStorage.getItem("bytes_locale"), "pt-BR");
    assert.equal(localStorage.getItem("cyber_cart"), null);
    sessionStorage.setItem("temporary", "1");
    i18n.preserveLocaleAndClear(sessionStorage);
    assert.equal(sessionStorage.length, 0);

    i18n.injectSelector(document);
    assert.equal(document.querySelectorAll("#language-select").length, 1);
    const selector = document.getElementById("language-select");
    selector.value = "en-US";
    selector.dispatchEvent(new window.Event("change", { bubbles: true }));
    assert.equal(localStorage.getItem("bytes_locale"), "en-US");
    assert.ok(jsdomErrors.some((error) => /navigation/i.test(error.message)));

    document.querySelector(".navbar").remove();
    document.querySelector(".language-selector")?.remove();
    const login = document.createElement("div");
    login.className = "login-container";
    document.body.appendChild(login);
    i18n.injectSelector(document);
    assert.equal(login.firstElementChild.className, "language-selector");

    login.remove();
    document.querySelector(".language-selector")?.remove();
    i18n.injectSelector(document);
    assert.equal(document.body.firstElementChild.className, "language-selector");
  });

  test("keeps English as the stable default and degrades safely without a document", () => {
    const { document } = useBrowser({
      html: "<!doctype html><html lang='en-US'><head><link rel='manifest' href='./manifest.webmanifest'></head><body><p>Weapons</p></body></html>",
    });
    const i18n = installI18n(null);
    dispatchDOMContentLoaded(document);
    assert.equal(i18n.getLocale(), "en-US");
    assert.equal(i18n.isPtBr(), false);
    assert.equal(i18n.dataPath("data/weapons.json#stock"), "data/weapons.json#stock");
    assert.equal(i18n.t("cart.total_hl", { total: 3 }, "TOTAL HL {total}"), "TOTAL HL 3");
    assert.equal(document.querySelector("p").textContent, "Weapons");
    assert.equal(document.documentElement.lang, "en-US");
    assert.match(document.querySelector("link[rel='manifest']").href, /manifest\.webmanifest$/);
    assert.equal(document.getElementById("language-select").value, "en-US");

    const localStorageDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("denied"); } });
    assert.equal(i18n.getLocale(), "en-US");
    Object.defineProperty(window, "localStorage", localStorageDescriptor);

    const previousWindow = global.window;
    delete global.window;
    try {
      const serverApi = requireFresh("js/i18n.js");
      assert.equal(serverApi.getLocale(), "en-US");
      assert.equal(serverApi.normalizeLocale(), "en-US");
    } finally {
      global.window = previousWindow;
    }
  });

  test("controllers bind localized datasets and preserve language-independent cart identity", () => {
    useBrowser({ html: "<body></body>", immediateTimers: true });
    const i18n = installI18n();
    assert.equal(i18n.getLocale(), "pt-BR");

    const catalog = requireFresh("js/script.js");
    assert.equal(catalog.PAGE_CONFIG.cyberwares.path, "../data/cyberwares.pt-BR.json");
    assert.equal(catalog.PAGE_CONFIG.accessories.path, "../data/equipment.pt-BR.json");
    assert.equal(catalog.PAGE_CONFIG.weapons.path, "../data/weapons.pt-BR.json");
    assert.equal(catalog.PAGE_CONFIG.drugs.path, "../data/drugs.pt-BR.json");
    assert.equal(catalog.AMMO_OPTIONS[0].label, "Padrão");

    const chips = requireFresh("js/chip-rates.js");
    const container = document.createElement("div");
    document.body.appendChild(container);
    chips.renderGroups(container, [{
      id: "ref_aptr",
      label: "REF (PART)",
      items: [{ id: "handgun", skill: "Armas Curtas", pricePerLevel: 100 }],
    }], "aptr");
    container.querySelector("button").click();
    const chip = JSON.parse(localStorage.getItem("cyber_cart"))[0];
    assert.equal(chip.id, "aptr_ref_aptr_handgun_lvl_1");
    assert.equal(chip.name, "PART Chip: Armas Curtas +1");
    assert.equal(chip.localization.skillId, "handgun");
    assert.equal(chip.locale, "pt-BR");
    assert.match(chip.note, /Preço 100 eb/);

    const generator = requireFresh("js/drugs-generator.js");
    generator.addBuildToCart({ id: "dose", name: "Dose de Teste", price: 25 });
    const drug = JSON.parse(localStorage.getItem("cyber_cart"))[1];
    assert.equal(drug.categoryLabel, "Drogas");
    assert.equal(drug.sourceCatalog, "drugs-generator");
    assert.equal(drug.locale, "pt-BR");

    const ptDrugs = JSON.parse(fs.readFileSync(path.join(projectRoot, "data/drugs.pt-BR.json"), "utf8"));
    assert.equal(ptDrugs.data.street_stock.items.synthcoke.duration, "1D6+1 minutos");
  });

  test("a localized catalog resolves cross-catalog labels from the matching language", async () => {
    const requests = [];
    const cyberwares = {
      data: {
        Neuralware: {
          name: "Equipamento Neural",
          items: {
            link: {
              id: "link",
              name: "Conexão de Teste",
              description: "Descrição localizada.",
              price: 100,
              HL: "1",
              installation: { requires: ["interfaceCables"] },
            },
          },
        },
      },
    };
    const equipment = {
      data: {
        Electronics: {
          name: "Eletrônicos",
          items: {
            cable: { id: "interfaceCables", name: "Cabos de Interface", price: 10 },
          },
        },
      },
    };
    const { document } = useBrowser({
      url: "https://bytes.test/html/cyberwares.html",
      html: `<body>
        <button id="filter-toggle"></button><aside id="filter-sidebar" class="hidden"><button id="close-filter"></button></aside>
        <div id="category-list"></div><h1 id="title-category"></h1><div id="items-list"></div>
        <select id="fs-category"></select><input id="fs-price-max-input"><input id="fs-hl-max-input"><input id="fs-cir-input"><input id="fs-difficulty-max-input">
        <button id="fs-apply"></button><button id="fs-clear"></button>
      </body>`,
      fetchImpl: async (url) => {
        requests.push(String(url));
        return { ok: true, status: 200, async json() { return String(url).includes("equipment") ? equipment : cyberwares; } };
      },
    });
    installI18n();
    const utils = requireFresh("js/core-utils.js");
    window.CyberUtils = utils;
    global.CyberUtils = utils;
    cleanups.push(() => delete global.CyberUtils);
    requireFresh("js/script.js");
    dispatchDOMContentLoaded(document);
    await flushPromises();

    assert.ok(requests.includes("../data/cyberwares.pt-BR.json"));
    assert.ok(requests.includes("../data/equipment.pt-BR.json"));
    assert.match(document.getElementById("items-list").textContent, /Conexão de Teste/);
    assert.match(document.getElementById("items-list").textContent, /EXIGE: Cabos de Interface/);
  });

  test("the cart rehydrates catalog, drug, weapon and chip names after a language switch", async () => {
    const requested = [];
    const payloads = Object.fromEntries([
      "cyberwares.pt-BR.json",
      "equipment.pt-BR.json",
      "weapons.pt-BR.json",
      "drugs.pt-BR.json",
      "chip-rates.pt-BR.json",
    ].map((file) => [file, JSON.parse(fs.readFileSync(path.join(projectRoot, "data", file), "utf8"))]));

    const cyberwareEntry = Object.values(payloads["cyberwares.pt-BR.json"].data)
      .flatMap((category) => Object.values(category.items || category.itens || category.list || {}))[0];
    const weaponEntry = payloads["weapons.pt-BR.json"].weapons[0];
    const chipEntry = payloads["chip-rates.pt-BR.json"].data.aptr.sections
      .flatMap((section) => section.items)
      .find((item) => item.id === "handgun");
    assert.ok(chipEntry);

    const { document } = useBrowser({
      url: "https://bytes.test/html/cart.html",
      html: `<body><div id="cart-list"></div><p id="empty-cart-msg" class="hidden"></p>
        <strong id="cart-total-value"></strong><button id="cart-clear"></button><button id="cart-export"></button></body>`,
      fetchImpl: async (url) => {
        const file = path.basename(String(url));
        requested.push(String(url));
        const payload = payloads[file];
        return { ok: Boolean(payload), status: payload ? 200 : 404, async json() { return payload || {}; } };
      },
    });
    installI18n();
    const utils = requireFresh("js/core-utils.js");
    window.CyberUtils = utils;
    global.CyberUtils = utils;
    cleanups.push(() => delete global.CyberUtils);
    global.Modal = { confirm() {}, alert() {} };
    global.HackSystem = { init() {} };
    cleanups.push(() => { delete global.Modal; delete global.HackSystem; });

    localStorage.setItem("cyber_cart", JSON.stringify([
      { id: cyberwareEntry.id, name: "Old Cyberware Name", category: "old", price: 10, hl: 0 },
      { id: weaponEntry.id, name: "Old Weapon Name", category: "old", price: 20, hl: 0 },
      { id: "synthcoke", name: "SynthCoke", category: "Drugs", price: 30, hl: 0 },
      {
        id: "aptr_ref_aptr_handgun_lvl_2",
        name: "APTR Chip: Handgun +2",
        category: "Chipware",
        price: 200,
        hl: 0,
        localization: { catalog: "chip-rates", pageType: "aptr", skillId: "handgun", level: 2 },
      },
    ]));
    requireFresh("js/cart.js");
    dispatchDOMContentLoaded(document);
    await flushPromises(8);

    assert.equal(new Set(requested).size, 5);
    assert.ok(requested.every((url) => url.includes(".pt-BR.json")));
    const content = document.getElementById("cart-list").textContent;
    assert.match(content, new RegExp(cyberwareEntry.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(content, new RegExp(weaponEntry.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(content, /Sintecoca/);
    assert.match(content, /PART Chip: Armas Curtas \+2/);
    assert.match(document.getElementById("cart-total-value").textContent, /PH TOTAL/);
  });
});
