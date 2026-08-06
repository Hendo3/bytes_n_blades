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
    ["chip-rates", "data/chip-rates.schema.json", "data/chip-rates.json"],
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
      "login.html": ["login-form", "runner-handle", "btn-jack-in"],
    };

    for (const [relativeFile, ids] of Object.entries(contracts)) {
      const dom = new JSDOM(fs.readFileSync(path.join(root, relativeFile), "utf8"));
      for (const id of ids) assert.ok(dom.window.document.getElementById(id), `${relativeFile}: #${id}`);
      dom.window.close();
    }
  });

  test("manifest routes and icon declarations point to valid artifacts", () => {
    const manifest = readJson("manifest.webmanifest");
    assert.equal(manifest.lang, "en-US");
    assert.equal(manifest.start_url, "./login.html");
    assert.equal(manifest.display, "standalone");

    const declaredPaths = [
      manifest.start_url,
      ...manifest.icons.map((icon) => icon.src),
      ...manifest.shortcuts.map((shortcut) => shortcut.url),
    ];
    for (const declared of declaredPaths) {
      assert.ok(fs.existsSync(path.resolve(root, declared)), `manifest: ${declared}`);
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
