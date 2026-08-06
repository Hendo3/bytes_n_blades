const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const english = JSON.parse(fs.readFileSync(path.join(root, "data/equipment.json"), "utf8"));
const portuguese = JSON.parse(fs.readFileSync(path.join(root, "data/equipment.pt-BR.json"), "utf8"));

function numericSignature(value) {
  return (String(value).match(/\d+(?:\.\d+)?/g) || []).map(Number);
}

const enCategoryKeys = Object.keys(english.data);
const ptCategoryKeys = Object.keys(portuguese.data);
assert.deepEqual(ptCategoryKeys, enCategoryKeys, "localized category IDs changed");

let itemCount = 0;
for (const categoryKey of enCategoryKeys) {
  const enItems = english.data[categoryKey].list;
  const ptItems = portuguese.data[categoryKey].list;
  assert.deepEqual(Object.keys(ptItems), Object.keys(enItems), `${categoryKey}: localized item IDs changed`);

  for (const itemKey of Object.keys(enItems)) {
    const enItem = enItems[itemKey];
    const ptItem = ptItems[itemKey];
    itemCount += 1;

    assert.equal(typeof enItem, "object", `${categoryKey}/${itemKey}: non-item entry in English catalog`);
    assert.equal(typeof ptItem, "object", `${categoryKey}/${itemKey}: non-item entry in Portuguese catalog`);
    assert.ok(enItem.name, `${categoryKey}/${itemKey}: missing English name`);
    assert.ok(ptItem.name, `${categoryKey}/${itemKey}: missing Portuguese name`);
    assert.deepEqual(
      numericSignature(ptItem.price),
      numericSignature(enItem.price),
      `${categoryKey}/${itemKey}: localized price values changed`,
    );
    assert.equal(
      Object.hasOwn(ptItem, "description"),
      Object.hasOwn(enItem, "description"),
      `${categoryKey}/${itemKey}: description coverage changed`,
    );
    assert.equal(
      Object.hasOwn(ptItem, "note"),
      Object.hasOwn(enItem, "note"),
      `${categoryKey}/${itemKey}: note coverage changed`,
    );
  }
}

assert.equal(itemCount, 133, "unexpected equipment item count");
assert.equal(english.data.security.list.cardlock.price, "100.0");
assert.equal(english.data.medical.list.criotank.price, "100000.0");
assert.equal(english.data.medical.list.medkit.price, "50.0");
assert.equal(english.data.medical.list.surgicalKit.price, "400.0");
assert.equal(english.data.medical.list.medscanner.price, "300.0");
assert.equal(english.data.medical.list.clinicVisit.price, "200.0");
assert.ok(english.data.tools.list.breakingEnteringTools);
assert.ok(english.data.medical.list.dayInHospital);
assert.ok(english.data.vehicles.list.mediumSedan);
assert.ok(!Object.hasOwn(english.data.vehicles.list, "TODO"));

console.log(`equipment localization validated (${itemCount} items)`);
