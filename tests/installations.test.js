const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Ajv = require("ajv");

const projectRoot = path.resolve(__dirname, "..");
const CyberUtils = require(path.join(projectRoot, "js/core-utils.js"));

global.window = { CyberUtils };
global.CyberUtils = CyberUtils;
global.document = { addEventListener() {} };

const {
  normalizeCatalog,
  createBundleContext,
  enforceDependencies,
  generateBundles,
} = require(path.join(projectRoot, "js/bundles.js"));

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"));
}

function flattenCatalog(data) {
  const result = [];
  Object.entries(data.data || data).forEach(([category, categoryData]) => {
    if (!categoryData || typeof categoryData !== "object") return;
    const rawItems = categoryData.itens || categoryData.items || categoryData.list || {};
    Object.entries(rawItems).forEach(([key, item]) => {
      if (!item || typeof item !== "object") return;
      result.push({
        ...item,
        id: item.id || key,
        category,
      });
    });
  });
  return result;
}

const cyberware = readJson("data/cyberwares.json");
const cyberwarePtBr = readJson("data/cyberwares.pt-BR.json");
const equipment = readJson("data/equipment.json");
const cyberwareSchema = readJson("data/cyberwares.schema.json");
const validateCyberware = new Ajv({ allErrors: true, strict: false }).compile(cyberwareSchema);
assert.ok(
  validateCyberware(cyberware),
  `cyberware schema errors: ${JSON.stringify(validateCyberware.errors, null, 2)}`,
);
assert.ok(
  validateCyberware(cyberwarePtBr),
  `pt-BR cyberware schema errors: ${JSON.stringify(validateCyberware.errors, null, 2)}`,
);

function mechanicalProjection(item) {
  const projected = structuredClone(item);
  delete projected.name;
  delete projected.description;
  delete projected.note;
  if (projected.installation) delete projected.installation.compatibilityNotes;
  (projected.attributeBonuses || []).forEach((bonus) => delete bonus.scopeLabel);
  (projected.skillBonuses || []).forEach((bonus) => {
    delete bonus.label;
    delete bonus.scopeLabel;
  });
  (projected.priceModifiers || []).forEach((modifier) => delete modifier.note);
  return projected;
}

assert.deepEqual(Object.keys(cyberwarePtBr.data), Object.keys(cyberware.data));
let localizedItemCount = 0;
Object.entries(cyberware.data).forEach(([categoryKey, sourceCategory]) => {
  const localizedCategory = cyberwarePtBr.data[categoryKey];
  assert.ok(String(localizedCategory.name || "").trim(), `${categoryKey} lacks a localized name`);
  const sourceItems = sourceCategory.itens || sourceCategory.items || sourceCategory.list || {};
  const localizedItems = localizedCategory.itens || localizedCategory.items || localizedCategory.list || {};
  assert.deepEqual(Object.keys(localizedItems), Object.keys(sourceItems));
  Object.entries(sourceItems).forEach(([itemKey, sourceItem]) => {
    const localizedItem = localizedItems[itemKey];
    assert.ok(String(localizedItem.name || "").trim(), `${categoryKey}/${itemKey} lacks a localized name`);
    assert.ok(String(localizedItem.description || "").trim(), `${categoryKey}/${itemKey} lacks a localized description`);
    assert.deepEqual(
      mechanicalProjection(localizedItem),
      mechanicalProjection(sourceItem),
      `${categoryKey}/${itemKey} changed mechanically in pt-BR`,
    );
    localizedItemCount += 1;
  });
});
assert.equal(localizedItemCount, 563);
assert.equal(cyberwarePtBr.version, cyberware.version);
assert.equal(cyberwarePtBr.author, cyberware.author);
assert.equal(cyberwarePtBr.date, cyberware.date);

const cyberItems = flattenCatalog(cyberware);
const equipmentItems = flattenCatalog(equipment);
const allItems = [...cyberItems, ...equipmentItems];
const byId = new Map(allItems.map((item) => [CyberUtils.normalizeId(item.id), item]));

function item(id) {
  const found = byId.get(CyberUtils.normalizeId(id));
  assert.ok(found, `missing fixture ${id}`);
  return found;
}

function cyberItem(category, id) {
  const found = cyberItems.find((entry) =>
    entry.category === category && CyberUtils.normalizeId(entry.id) === CyberUtils.normalizeId(id),
  );
  assert.ok(found, `missing cyberware fixture ${category}/${id}`);
  return found;
}

function missingWarnings(cart) {
  return CyberUtils.analyzeConsistency(cart).warnings.filter((warning) =>
    warning.includes("missing"),
  );
}

const smartgunLink = item("smartgun_link");
assert.deepEqual(smartgunLink.installation.requires, ["neuralware_processor"]);
assert.ok(smartgunLink.installation.requiresAny.includes("interface_plugs"));
assert.ok(!smartgunLink.installation.requiresAny.includes("braindance_plugs"));

const cybermodemLink = item("cybermodem_link");
assert.ok(!cybermodemLink.installation.requiresAny.includes("mag_duct_spots"));
assert.ok(!cybermodemLink.installation.requiresAny.includes("braindance_plugs"));

assert.equal(missingWarnings([smartgunLink]).length, 2);
assert.deepEqual(
  missingWarnings([
    smartgunLink,
    item("neuralware_processor"),
    item("interface_plugs"),
  ]),
  ["Interface Plugs: missing Interface Cables"],
);
assert.deepEqual(
  missingWarnings([
    smartgunLink,
    item("neuralware_processor"),
    item("interface_plugs"),
    item("interfaceCables"),
  ]),
  [],
);

const builtInModem = cyberItem("Cyberlimbs Builtins", "cybermodem");
assert.ok(builtInModem.installation.requiresAnyGroups.some((group) =>
  group.includes("cybermodem_link"),
));
assert.deepEqual(
  missingWarnings([
    builtInModem,
    cybermodemLink,
    item("neuralware_processor"),
    item("standard_cyberarm"),
  ]),
  [],
);

const standardHand = item("standard_hand");
const standardArm = item("standard_cyberarm");
const fingerOptions = [
  "mini_light",
  "lockpick",
  "finger_bomb",
  "mace_sprayer",
  "aip_hypo",
  "cyberfinger_dartgun",
].map((id) => cyberItem("Fingers", id));

const fiveFingerResult = CyberUtils.analyzeConsistency([
  standardArm,
  standardHand,
  ...fingerOptions.slice(0, 5),
]);
assert.ok(!fiveFingerResult.warnings.some((warning) => warning.includes("Cyberfinger")));

const sixFingerResult = CyberUtils.analyzeConsistency([
  standardArm,
  standardHand,
  ...fingerOptions,
]);
assert.ok(sixFingerResult.warnings.some((warning) =>
  warning.includes("Cyberfinger: slots overflow (6/5)"),
));

const dataStore = {
  cyberwares: normalizeCatalog(cyberware.data || cyberware, "cyberware"),
  equipment: normalizeCatalog(equipment.data || equipment, "equipment"),
  weapons: {},
};
const context = createBundleContext(dataStore);
const resolvedBundle = enforceDependencies([context.findById("smartgun_link")], context);
const resolvedIds = new Set(resolvedBundle.map((entry) => CyberUtils.normalizeId(entry.id)));

assert.ok(resolvedIds.has("smartgun_link"));
assert.ok(resolvedIds.has("neuralware_processor"));
assert.ok(
  ["interface_plugs", "mag_duct_spots", "livewires", "model_100_plugs"]
    .some((id) => resolvedIds.has(id)),
);
resolvedBundle.forEach((entry) => {
  assert.ok(entry.id, `${entry.name} lost its ID in bundle normalization`);
});
assert.deepEqual(missingWarnings(resolvedBundle), []);

for (const style of ["balanced", "aggressive", "stealth", "netrunner"]) {
  for (const budget of ["street", "pro", "opulence"]) {
    for (let iteration = 0; iteration < 10; iteration += 1) {
      const bundles = generateBundles(context, { style, budget, lowHL: false });
      bundles.forEach((bundle) => {
        const warnings = CyberUtils.analyzeConsistency(bundle.items).warnings;
        assert.deepEqual(
          warnings,
          [],
          `${bundle.title} produced an inconsistent bundle for ${style}/${budget}`,
        );
      });
    }
  }
}

console.log("installation dependency and slot tests passed");
