const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Ajv = require("ajv");

const root = path.resolve(__dirname, "..");
const english = JSON.parse(fs.readFileSync(path.join(root, "data/weapons.json"), "utf8"));
const portuguese = JSON.parse(fs.readFileSync(path.join(root, "data/weapons.pt-BR.json"), "utf8"));
const schema = JSON.parse(fs.readFileSync(path.join(root, "data/weapons-store.schema.json"), "utf8"));

const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
assert.ok(validate(english), `English weapons failed schema: ${JSON.stringify(validate.errors)}`);
assert.ok(validate(portuguese), `Portuguese weapons failed schema: ${JSON.stringify(validate.errors)}`);

assert.equal(english.weapons.length, 195, "unexpected English weapon count");
assert.equal(portuguese.weapons.length, 195, "unexpected Portuguese weapon count");

const enById = new Map(english.weapons.map((weapon) => [weapon.id, weapon]));
const ptById = new Map(portuguese.weapons.map((weapon) => [weapon.id, weapon]));
assert.equal(enById.size, english.weapons.length, "English weapon IDs are not unique");
assert.equal(ptById.size, portuguese.weapons.length, "Portuguese weapon IDs are not unique");
assert.deepEqual([...ptById.keys()], [...enById.keys()], "localized weapon IDs or ordering changed");

const localizedFields = new Set(["name", "class", "Note"]);
for (const [id, enWeapon] of enById) {
  const ptWeapon = ptById.get(id);
  assert.ok(ptWeapon, `${id}: missing Portuguese item`);
  assert.ok(ptWeapon.name, `${id}: missing Portuguese name`);
  assert.ok(ptWeapon.class, `${id}: missing Portuguese class`);

  for (const key of Object.keys(enWeapon)) {
    if (localizedFields.has(key)) continue;
    assert.deepEqual(ptWeapon[key], enWeapon[key], `${id}: mechanical field ${key} changed`);
  }

  assert.equal(Object.hasOwn(ptWeapon, "Note"), Object.hasOwn(enWeapon, "Note"), `${id}: note coverage changed`);
  if (enWeapon.Note) {
    assert.notEqual(ptWeapon.Note, enWeapon.Note, `${id}: note was not localized`);
  }
}

function item(id) {
  const weapon = enById.get(id);
  assert.ok(weapon, `missing restored item ${id}`);
  return weapon;
}

assert.equal(item("weapon_tsunami_arms_type_17_anti_armor_rifle").magazine_capacity, 12);
assert.equal(item("weapon_heavy_handgun_heavy_smg_ammo_box_100").price, 36);
assert.equal(item("weapon_federated_arms_x_38").damage, "2D6");
assert.equal(item("weapon_nova_model_338_citygun").Note.includes("7eb"), true);
assert.equal(item("weapon_rheinmetall_emg_85_railgun").cadence_full_auto, 0.5);
assert.deepEqual(item("weapon_militech_crusher_ssg").weapon_range_m, [12, 25]);
assert.ok(item("weapon_tsunami_express_racegun"));
assert.ok(item("weapon_wondernines"));
assert.ok(item("weapon_assault_rifle_ammo_box_100"));

console.log(`weapons localization validated (${english.weapons.length} items)`);
