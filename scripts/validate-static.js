const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const failures = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const files = walk(root);

files.filter((file) => file.endsWith(".json")).forEach((file) => {
  try {
    JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(`${path.relative(root, file)}: invalid JSON (${error.message})`);
  }
});

files.filter((file) => file.endsWith(".html")).forEach((file) => {
  const html = fs.readFileSync(file, "utf8");
  const referencePattern = /(?:src|href)=["']([^"']+)["']/g;
  for (const match of html.matchAll(referencePattern)) {
    const reference = match[1].split(/[?#]/)[0];
    if (!reference || /^(?:https?:|data:|mailto:|#)/i.test(reference)) continue;

    const resolved = path.resolve(path.dirname(file), reference);
    const relative = path.relative(root, resolved).replace(/\\/g, "/");
    if (!fs.existsSync(resolved)) {
      failures.push(`${path.relative(root, file)}: missing ${reference}`);
    }
  }
});

for (const required of [
  "index.html",
  "login.html",
  "html/cyberwares.html",
  "html/cart.html",
  "html/bundles.html",
  "js/core-utils.js",
  "js/script.js",
  "js/cart.js",
  "js/bundles.js",
  "js/i18n.js",
  "js/netrunning.js",
  "data/cyberwares.json",
  "data/cyberwares.pt-BR.json",
  "data/cyberwares.schema.json",
  "data/equipment.json",
  "data/equipment.pt-BR.json",
  "data/equipment.schema.json",
  "data/weapons.json",
  "data/weapons.pt-BR.json",
  "data/weapons-store.schema.json",
  "data/ammo.json",
  "data/ammo.pt-BR.json",
  "data/ammo.schema.json",
  "data/chip-rates.json",
  "data/chip-rates.pt-BR.json",
  "data/chip-rates.schema.json",
  "data/drugs.json",
  "data/drugs.pt-BR.json",
  "data/drugs.schema.json",
  "data/programs.json",
  "data/programs.pt-BR.json",
  "data/programs.schema.json",
  "data/cyberdecks.json",
  "data/cyberdecks.pt-BR.json",
  "data/cyberdecks.schema.json",
  "html/programs.html",
  "html/cyberdecks.html",
  "html/deck-builder.html",
  "html/ammo.html",
  "assets/svg/favicon.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "manifest.webmanifest",
  "manifest.pt-BR.webmanifest",
]) {
  if (!fs.existsSync(path.join(root, required))) {
    failures.push(`missing required artifact ${required}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`validated ${files.length} static files`);
