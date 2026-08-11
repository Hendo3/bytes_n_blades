const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, test } = require("node:test");
const Ajv = require("ajv");
const cssTree = require("css-tree");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function flattenCatalog(payload, source) {
  const items = [];
  for (const [category, categoryData] of Object.entries(payload.data || payload)) {
    if (!categoryData || typeof categoryData !== "object") continue;
    const list = categoryData.itens || categoryData.items || categoryData.list || {};
    for (const [key, item] of Object.entries(list)) {
      if (!item || typeof item !== "object") continue;
      items.push({ ...item, id: item.id || key, key, category, source });
    }
  }
  return items;
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

describe("JSON schemas and semantic integrity", () => {
  const datasets = [
    ["cyberwares", "data/cyberwares.schema.json", "data/cyberwares.json"],
    ["cyberwares.pt-BR", "data/cyberwares.schema.json", "data/cyberwares.pt-BR.json"],
    ["equipment", "data/equipment.schema.json", "data/equipment.json"],
    ["equipment.pt-BR", "data/equipment.schema.json", "data/equipment.pt-BR.json"],
    ["weapons", "data/weapons-store.schema.json", "data/weapons.json"],
    ["weapons.pt-BR", "data/weapons-store.schema.json", "data/weapons.pt-BR.json"],
    ["drugs", "data/drugs.schema.json", "data/drugs.json"],
    ["drugs.pt-BR", "data/drugs.schema.json", "data/drugs.pt-BR.json"],
    ["chip-rates", "data/chip-rates.schema.json", "data/chip-rates.json"],
    ["chip-rates.pt-BR", "data/chip-rates.schema.json", "data/chip-rates.pt-BR.json"],
    ["programs", "data/programs.schema.json", "data/programs.json"],
    ["programs.pt-BR", "data/programs.schema.json", "data/programs.pt-BR.json"],
    ["cyberdecks", "data/cyberdecks.schema.json", "data/cyberdecks.json"],
    ["cyberdecks.pt-BR", "data/cyberdecks.schema.json", "data/cyberdecks.pt-BR.json"],
  ];

  for (const [label, schemaPath, dataPath] of datasets) {
    test(`${label} conforms to its Draft-07 schema`, () => {
      const ajv = new Ajv({ allErrors: true, strict: false });
      const validate = ajv.compile(readJson(schemaPath));
      const valid = validate(readJson(dataPath));
      assert.ok(valid, `${label}: ${JSON.stringify(validate.errors, null, 2)}`);
    });
  }

  test("catalog item IDs are non-empty and unique inside each source", () => {
    for (const file of ["data/cyberwares.json", "data/equipment.json"]) {
      const items = flattenCatalog(readJson(file), file);
      const ids = items.map((item) => String(item.id || "").trim().toLowerCase());
      assert.ok(ids.every(Boolean), `${file}: empty item ID`);
      assert.equal(new Set(ids).size, ids.length, `${file}: duplicate item ID`);
      assert.ok(items.every((item) => String(item.name || "").trim()), `${file}: empty item name`);
      assert.ok(items.every((item) => !String(item.name).toUpperCase().includes("TODO")), `${file}: TODO item leaked`);
    }

    for (const file of ["data/weapons.json", "data/weapons.pt-BR.json"]) {
      const weapons = readJson(file).weapons;
      const ids = weapons.map((weapon) => String(weapon.id || "").trim());
      assert.ok(ids.every(Boolean), `${file}: empty weapon ID`);
      assert.equal(new Set(ids).size, ids.length, `${file}: duplicate weapon ID`);
      assert.ok(weapons.every((weapon) => !Object.values(weapon).some((value) => value === "TODO")));
    }
  });

  test("every cyberware requirement resolves to a canonical or legacy catalog ID", () => {
    const cyberware = flattenCatalog(readJson("data/cyberwares.json"), "cyberware");
    const equipment = flattenCatalog(readJson("data/equipment.json"), "equipment");
    const items = [...cyberware, ...equipment];
    const availableIds = new Set(items.flatMap((item) => [item.id, ...(item.legacyIds || [])])
      .map((id) => String(id).trim().toLowerCase()));
    const missing = [];

    for (const item of items) {
      const installation = item.installation || {};
      const references = [
        ...(installation.requires || []),
        ...(installation.requiresAny || []),
        ...(installation.requiresAnyGroups || []).flat(),
      ];
      for (const reference of references) {
        if (!availableIds.has(String(reference).trim().toLowerCase())) {
          missing.push(`${item.id} -> ${reference}`);
        }
      }
    }

    assert.deepEqual(missing, []);
  });

  test("every used slot family has a provider and capacities are valid", () => {
    const items = [
      ...flattenCatalog(readJson("data/cyberwares.json"), "cyberware"),
      ...flattenCatalog(readJson("data/equipment.json"), "equipment"),
    ];
    const usedFamilies = new Set();
    const providedFamilies = new Set();

    for (const item of items) {
      const installation = item.installation || {};
      const usage = Number(installation.slotUsage);
      if (Number.isFinite(usage) && usage > 0) {
        assert.ok(installation.slotFamily || installation.slotProvider, `${item.id}: usage without family`);
        usedFamilies.add(String(installation.slotFamily || installation.slotProvider).toLowerCase());
      }

      if (installation.slotProvider || installation.slotCapacity !== undefined) {
        const family = installation.slotFamily || installation.slotProvider || item.id;
        providedFamilies.add(String(family).toLowerCase());
        if (installation.slotCapacity !== undefined) {
          assert.ok(Number.isFinite(Number(installation.slotCapacity)) && Number(installation.slotCapacity) >= 0);
        }
      }

      for (const provider of installation.provides || []) {
        assert.ok(provider && provider.slotFamily, `${item.id}: malformed nested provider`);
        providedFamilies.add(String(provider.slotFamily).toLowerCase());
        if (provider.slotCapacity !== undefined) {
          assert.ok(Number.isFinite(Number(provider.slotCapacity)) && Number(provider.slotCapacity) >= 0);
        }
      }
    }

    assert.deepEqual([...usedFamilies].filter((family) => !providedFamilies.has(family)), []);
  });

  test("chip tables have unique section IDs and skills with usable pricing", () => {
    const data = readJson("data/chip-rates.json").data;
    for (const [type, spec] of Object.entries(data)) {
      const sectionIds = spec.sections.map((section) => section.id);
      assert.equal(new Set(sectionIds).size, sectionIds.length, `${type}: duplicate section`);
      for (const section of spec.sections) {
        const skills = section.items.map((item) => item.skill.toLowerCase());
        assert.equal(new Set(skills).size, skills.length, `${type}/${section.id}: duplicate skill`);
        for (const item of section.items) {
          const priced = Number.isFinite(item.pricePerLevel) || Array.isArray(item.levelPrices);
          assert.ok(priced || item.pricePerLevel === null, `${type}/${item.skill}: missing pricing state`);
        }
      }
    }
  });

  test("drug generator option IDs and values are internally unique", () => {
    const options = readJson("data/drugs.json").data.generatorOptions;
    assert.equal(new Set(Object.keys(options.types)).size, Object.keys(options.types).length);
    for (const key of ["strengthOptions", "durationOptions"]) {
      const values = options[key].map((entry) => entry.value);
      assert.equal(new Set(values).size, values.length, `${key}: duplicate value`);
    }
    for (const key of ["effectOptions", "riskOptions"]) {
      const ids = options[key].map((entry) => entry.id);
      assert.equal(new Set(ids).size, ids.length, `${key}: duplicate ID`);
    }
  });

  test("drug localization preserves every mechanical value and official stock identity", () => {
    const en = readJson("data/drugs.json").data;
    const pt = readJson("data/drugs.pt-BR.json").data;
    const enStock = en.street_stock.items;
    const ptStock = pt.street_stock.items;
    assert.deepEqual(Object.keys(ptStock), Object.keys(enStock));

    for (const id of Object.keys(enStock)) {
      for (const field of ["price", "difficulty", "strength"]) {
        assert.deepEqual(ptStock[id][field], enStock[id][field], `${id}.${field}`);
      }
      assert.equal(
        ptStock[id].duration.replace("turnos", "turns").replace("minutos", "minutes").replace("horas", "hours"),
        enStock[id].duration,
        `${id}.duration`,
      );
    }

    assert.equal(ptStock.synthcoke.name, "Sintecoca");
    assert.equal(ptStock.dorph.name, "Endorfina");
    assert.equal(Object.keys(enStock).length, 9);

    const enOptions = en.generatorOptions;
    const ptOptions = pt.generatorOptions;
    assert.deepEqual(Object.keys(ptOptions.types), Object.keys(enOptions.types));
    for (const id of Object.keys(enOptions.types)) {
      assert.equal(ptOptions.types[id].baseDifficulty, enOptions.types[id].baseDifficulty, id);
      assert.equal(ptOptions.types[id].basePrice, enOptions.types[id].basePrice, id);
    }
    for (const optionKey of ["strengthOptions", "durationOptions", "effectOptions", "riskOptions"]) {
      assert.equal(ptOptions[optionKey].length, enOptions[optionKey].length, optionKey);
      for (let index = 0; index < enOptions[optionKey].length; index += 1) {
        const source = enOptions[optionKey][index];
        const localized = ptOptions[optionKey][index];
        for (const field of ["id", "difficultyMod", "priceMod", "multiplier"]) {
          if (source[field] !== undefined) assert.deepEqual(localized[field], source[field], `${optionKey}.${index}.${field}`);
        }
      }
    }
    assert.deepEqual(ptOptions.formula, { ...enOptions.formula, notes: ptOptions.formula.notes });
  });

  test("chip localization preserves stable skill IDs and all pricing rules", () => {
    const en = readJson("data/chip-rates.json").data;
    const pt = readJson("data/chip-rates.pt-BR.json").data;
    assert.deepEqual(Object.keys(pt), Object.keys(en));
    let count = 0;

    for (const type of Object.keys(en)) {
      assert.equal(pt[type].sections.length, en[type].sections.length, type);
      for (let sectionIndex = 0; sectionIndex < en[type].sections.length; sectionIndex += 1) {
        const sourceSection = en[type].sections[sectionIndex];
        const localizedSection = pt[type].sections[sectionIndex];
        assert.equal(localizedSection.id, sourceSection.id, `${type}.section`);
        assert.equal(localizedSection.items.length, sourceSection.items.length, sourceSection.id);
        for (let itemIndex = 0; itemIndex < sourceSection.items.length; itemIndex += 1) {
          const source = sourceSection.items[itemIndex];
          const localized = localizedSection.items[itemIndex];
          assert.equal(localized.id, source.id, `${type}.${source.skill}`);
          assert.ok(localized.id, `${type}.${source.skill}: missing stable ID`);
          assert.deepEqual(localized.pricePerLevel, source.pricePerLevel, localized.id);
          assert.deepEqual(localized.levelPrices, source.levelPrices, localized.id);
          count += 1;
        }
      }
    }

    assert.equal(count, 60);
    assert.equal(pt.aptr.label, "PART");
    assert.equal(pt.aptr.sections[1].items.find((item) => item.id === "handgun").skill, "Armas Curtas");
    assert.equal(pt.visual_recognition.label, "Reconhecimento Visual");
  });
});

describe("static page and manifest contracts", () => {
  const htmlFiles = ["index.html", "login.html", ...walk(path.join(root, "html"))
    .filter((file) => file.endsWith(".html"))
    .map((file) => path.relative(root, file))];

  test("all local HTML references resolve", () => {
    const missing = [];
    for (const relativeFile of htmlFiles) {
      const absolute = path.join(root, relativeFile);
      const html = fs.readFileSync(absolute, "utf8");
      const dom = new JSDOM(html);
      for (const element of dom.window.document.querySelectorAll("[src], [href]")) {
        const reference = element.getAttribute("src") || element.getAttribute("href");
        const clean = String(reference || "").split(/[?#]/)[0];
        if (!clean || /^(?:https?:|data:|mailto:|#)/i.test(clean)) continue;
        const resolved = path.resolve(path.dirname(absolute), clean);
        if (!fs.existsSync(resolved)) missing.push(`${relativeFile} -> ${reference}`);
      }
      dom.window.close();
    }
    assert.deepEqual(missing, []);
  });

  test("the complete stylesheet parses without syntax errors", () => {
    const css = fs.readFileSync(path.join(root, "css/styles.css"), "utf8");
    assert.doesNotThrow(() => cssTree.parse(css, { positions: true }));
  });

  test("every page exposes the declared locale, stylesheet, icon and manifest", () => {
    for (const relativeFile of htmlFiles) {
      const dom = new JSDOM(fs.readFileSync(path.join(root, relativeFile), "utf8"));
      const document = dom.window.document;
      assert.equal(document.documentElement.lang, "en-US", relativeFile);
      assert.ok(document.querySelector("link[rel='stylesheet']"), `${relativeFile}: stylesheet`);
      assert.ok(document.querySelector("link[rel~='icon']"), `${relativeFile}: icon`);
      assert.ok(document.querySelector("link[rel='manifest']"), `${relativeFile}: manifest`);
      dom.window.close();
    }
  });

  test("every page loads localization before its page controllers", () => {
    for (const relativeFile of htmlFiles) {
      const dom = new JSDOM(fs.readFileSync(path.join(root, relativeFile), "utf8"));
      const sources = [...dom.window.document.querySelectorAll("script[src]")]
        .map((script) => script.getAttribute("src"));
      const i18nIndex = sources.findIndex((source) => source.endsWith("/i18n.js") || source === "js/i18n.js");
      assert.ok(i18nIndex >= 0, `${relativeFile}: missing i18n.js`);
      for (const controller of sources.filter((source) => !source.endsWith("/i18n.js") && !source.endsWith("/modal.js"))) {
        assert.ok(i18nIndex < sources.indexOf(controller), `${relativeFile}: i18n.js must precede ${controller}`);
      }
      dom.window.close();
    }
  });

  test("pages contain the DOM contract required by their controller", () => {
    const contracts = {
      "html/cyberwares.html": ["category-list", "items-list", "title-category"],
      "html/accessories.html": ["category-list", "items-list", "title-category"],
      "html/weapons.html": ["category-list", "items-list", "title-category"],
      "html/drugs.html": ["category-list", "items-list", "title-category"],
      "html/cart.html": ["cart-list", "cart-total-value", "cart-clear", "cart-export"],
      "html/bundles.html": ["bundle-list", "bundle-timer", "kit-style", "kit-budget", "kit-low-hl"],
      "html/aptr-chips.html": ["chip-rate-groups"],
      "html/mram-chips.html": ["chip-rate-groups"],
      "html/visual-rec-chips.html": ["chip-rate-groups"],
      "html/drugs-generator.html": ["drug-generator-form", "dg-type", "dg-strength", "dg-duration", "dg-result"],
      "html/programs.html": ["program-search", "program-class", "program-price", "program-conversions", "program-count", "program-list"],
      "html/cyberdecks.html": ["deck-conversions", "deck-count", "deck-list", "netgear-list"],
      "html/deck-builder.html": ["deck-builder-form", "deck-options", "builder-conversions", "builder-programs", "builder-capacity", "builder-total", "builder-add"],
      "login.html": ["login-form", "runner-handle", "btn-jack-in"],
    };

    for (const [relativeFile, ids] of Object.entries(contracts)) {
      const dom = new JSDOM(fs.readFileSync(path.join(root, relativeFile), "utf8"));
      for (const id of ids) assert.ok(dom.window.document.getElementById(id), `${relativeFile}: #${id}`);
      dom.window.close();
    }
  });

  test("localized manifests expose identical routes and valid icon declarations", () => {
    const en = readJson("manifest.webmanifest");
    const pt = readJson("manifest.pt-BR.webmanifest");
    assert.equal(en.lang, "en-US");
    assert.equal(pt.lang, "pt-BR");
    assert.equal(en.start_url, "./login.html");
    assert.equal(pt.start_url, en.start_url);
    assert.equal(en.display, "standalone");
    assert.equal(pt.display, en.display);
    assert.deepEqual(pt.icons, en.icons);
    assert.deepEqual(pt.shortcuts.map((shortcut) => shortcut.url), en.shortcuts.map((shortcut) => shortcut.url));

    for (const [label, manifest] of [["en-US", en], ["pt-BR", pt]]) {
      const declaredPaths = [
        manifest.start_url,
        ...manifest.icons.map((icon) => icon.src),
        ...manifest.shortcuts.map((shortcut) => shortcut.url),
      ];
      for (const declared of declaredPaths) {
        assert.ok(fs.existsSync(path.resolve(root, declared)), `${label} manifest: ${declared}`);
      }
    }

    for (const [relativeFile, expectedSize] of [
      ["assets/icons/icon-192.png", 192],
      ["assets/icons/icon-512.png", 512],
    ]) {
      const png = fs.readFileSync(path.join(root, relativeFile));
      assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.equal(png.readUInt32BE(16), expectedSize);
      assert.equal(png.readUInt32BE(20), expectedSize);
    }
  });
});
