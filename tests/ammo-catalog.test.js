const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, test } = require("node:test");
const {
  installBrowserEnv, requireFresh, dispatchDOMContentLoaded, jsonResponse, flushPromises,
} = require("./helpers/browser-env.js");

const root = path.resolve(__dirname, "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const cleanups = [];
afterEach(() => { while (cleanups.length) cleanups.pop()(); });

test("weapons and ammunition are separate catalogs", () => {
  for (const locale of ["", ".pt-BR"]) {
    const weapons = readJson(`data/weapons${locale}.json`).weapons;
    const ammo = readJson(`data/ammo${locale}.json`).items;
    assert.equal(weapons.length, 184);
    assert.equal(weapons.some((item) => /ammo|muni/i.test(`${item.class} ${item.type_code}`)), false);
    assert.equal(ammo.length, 336);
    assert.equal(new Set(ammo.map((item) => item.id)).size, ammo.length);
  }
});

test("includes every family from Ammo & Add-ons", () => {
  const ammo = readJson("data/ammo.json").items;
  const categories = new Set(ammo.map((item) => item.category));
  for (const required of [
    "Ammunition Reloads", "Ammunition Types", "12 Gauge", "Hand Grenades",
    "Militech 25mm Grenades", "40mm Launched Grenades", "Rifle Grenades",
    "Special Projectiles", "Rocket and Missile Reloads", "Arrowheads",
    "Firearm Accessories", "Bow Accessories", "Melee Accessories", "Gun Customization",
  ]) assert.ok(categories.has(required), required);
});

test("preserves old bundle ammo ids as aliases", () => {
  const ammo = readJson("data/ammo.json").items;
  const aliases = new Set(ammo.flatMap((item) => item.legacyIds || []));
  for (const id of [
    "weapon_light_handgun_light_smg_ammo_box_100",
    "weapon_medium_handgun_medium_smg_ammo_box_100",
    "weapon_heavy_handgun_heavy_smg_ammo_box_100",
    "weapon_very_heavy_handgun_ammo_box_100",
    "weapon_assault_rifle_ammo_box_100",
  ]) assert.ok(aliases.has(id), id);
});

test("ships the dedicated page and navigation", () => {
  const ammoPage = fs.readFileSync(path.join(root, "html/ammo.html"), "utf8");
  const weaponsPage = fs.readFileSync(path.join(root, "html/weapons.html"), "utf8");
  assert.match(ammoPage, /data\/ammo\.json|js\/script\.js/);
  assert.match(weaponsPage, /href="\.\/ammo\.html"/);
});

test("renders ammo separately and prices bullet types against a base reload", async () => {
  const browser = installBrowserEnv({
    url: "https://bytes.test/html/ammo.html",
    html: "<div id='category-list'></div><h1 id='title-category'></h1><div id='items-list'></div><select id='fs-category'></select><button id='fs-apply'></button><button id='fs-clear'></button>",
    fetchImpl: async () => jsonResponse(readJson("data/ammo.json")),
  });
  cleanups.push(browser.cleanup);
  window.I18n = { getLocale: () => "en-US", dataPath: (value) => value, t: (_key, _params, fallback) => fallback };
  global.Modal = { alert() {} };
  cleanups.push(() => { delete global.Modal; });
  requireFresh("js/script.js");
  dispatchDOMContentLoaded(document);
  await flushPromises(6);
  assert.equal(document.getElementById("title-category").textContent, "Ammunition Reloads");
  const options = document.querySelector(".item select");
  assert.ok(options);
  assert.ok(options.options.length >= 20);
  options.value = [...options.options].find((option) => option.textContent.includes("Armor Piercing"))?.value;
  options.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.match(document.querySelector(".item strong").textContent, /45/);
});
