const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { afterEach, describe, test } = require("node:test");

const root = path.resolve(__dirname, "..");
const tempRoot = path.join(root, "tmp", "test-runtime");
const temporaryDirectories = [];

function makeTemp(prefix) {
  fs.mkdirSync(tempRoot, { recursive: true });
  const directory = fs.mkdtempSync(path.join(tempRoot, prefix));
  temporaryDirectories.push(directory);
  return directory;
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: "utf8",
    env: { ...process.env, TMPDIR: tempRoot },
  });
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory()
      ? listFiles(absolute)
      : [path.relative(directory, absolute).replace(/\\/g, "/")];
  });
}

function listFilesFrom(base, directory = base) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory()
      ? listFilesFrom(base, absolute)
      : [path.relative(base, absolute).replace(/\\/g, "/")];
  });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

afterEach(() => {
  while (temporaryDirectories.length) {
    fs.rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

describe("static build and artifact validation", () => {
  test("build copies every publishable source byte-for-byte and nothing else", () => {
    const result = run(process.execPath, ["scripts/build-static.js"]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const dist = path.join(root, "dist");

    const expected = [];
    for (const directory of ["assets", "css", "data", "html", "js"]) {
      expected.push(...listFilesFrom(root, path.join(root, directory)));
    }
    expected.push("index.html", "login.html", "manifest.webmanifest", "manifest.pt-BR.webmanifest");
    expected.sort();

    const actual = listFilesFrom(dist).sort();
    assert.deepEqual(actual, expected);
    for (const relative of expected) {
      assert.deepEqual(
        fs.readFileSync(path.join(dist, relative)),
        fs.readFileSync(path.join(root, relative)),
        relative,
      );
    }
  });

  test("validator accepts the real build and rejects broken JSON, links and artifacts", () => {
    let result = run(process.execPath, ["scripts/build-static.js"]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    result = run(process.execPath, ["scripts/validate-static.js", "dist"]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /validated \d+ static files/);

    const broken = makeTemp("broken-build-");
    fs.cpSync(path.join(root, "dist"), broken, { recursive: true });
    fs.writeFileSync(path.join(broken, "data", "broken.json"), "{");
    fs.appendFileSync(path.join(broken, "index.html"), "<script src='./js/missing.js'></script>");
    fs.rmSync(path.join(broken, "assets", "icons", "icon-192.png"));
    const invalid = run(process.execPath, [path.join(root, "scripts/validate-static.js"), broken]);
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /invalid JSON/);
    assert.match(invalid.stderr, /missing \.\/js\/missing\.js/);
    assert.match(invalid.stderr, /missing required artifact assets\/icons\/icon-192\.png/);
  });

  test("dataset validator covers every base and localized catalog", () => {
    const valid = run(process.execPath, ["js/validate_data.js"]);
    assert.equal(valid.status, 0, valid.stderr || valid.stdout);
    for (const label of [
      "cyberwares",
      "cyberwares.pt-BR",
      "equipment",
      "equipment.pt-BR",
      "weapons",
      "weapons.pt-BR",
      "drugs",
      "drugs.pt-BR",
      "chip-rates",
      "chip-rates.pt-BR",
    ]) {
      assert.match(valid.stdout, new RegExp(`Dataset "${label.replace(".", "\\.")}"`));
    }

    const invalidRoot = makeTemp("invalid-data-");
    fs.mkdirSync(path.join(invalidRoot, "js"));
    fs.cpSync(path.join(root, "js/validate_data.js"), path.join(invalidRoot, "js/validate_data.js"));
    fs.cpSync(path.join(root, "data"), path.join(invalidRoot, "data"), { recursive: true });
    const equipmentPath = path.join(invalidRoot, "data/equipment.json");
    const equipment = readJson(equipmentPath);
    delete equipment.data;
    fs.writeFileSync(equipmentPath, JSON.stringify(equipment));
    const invalid = run(process.execPath, [path.join(invalidRoot, "js/validate_data.js")], { cwd: invalidRoot });
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /Inconsistências em "equipment"/);
  });
});

describe("restoration and localization generators", () => {
  test("all catalog generators are deterministic and idempotent", () => {
    const sandbox = makeTemp("generators-");
    fs.cpSync(path.join(root, "data"), path.join(sandbox, "data"), { recursive: true });
    fs.cpSync(path.join(root, "scripts"), path.join(sandbox, "scripts"), { recursive: true });

    const commands = [
      ["scripts/repair-equipment-en.py", "data/equipment.json"],
      ["scripts/build-equipment-ptbr.py", "data/equipment.pt-BR.json"],
      ["scripts/repair-weapons-en.py", "data/weapons.json"],
      ["scripts/build-weapons-ptbr.py", "data/weapons.pt-BR.json"],
      ["scripts/repair-drugs-en.py", "data/drugs.json"],
      ["scripts/build-drugs-ptbr.py", "data/drugs.pt-BR.json"],
      ["scripts/build-chip-rates-ptbr.py", "data/chip-rates.pt-BR.json"],
      ["scripts/build-cyberwares-ptbr.py", "data/cyberwares.pt-BR.json"],
    ];

    for (const [script, target] of commands) {
      const result = run("python3", [script], { cwd: sandbox });
      assert.equal(result.status, 0, `${script}: ${result.stderr || result.stdout}`);
      assert.deepEqual(
        readJson(path.join(sandbox, target)),
        readJson(path.join(root, target)),
        `${script} is not idempotent`,
      );
    }

    const finalized = run("python3", [
      "scripts/finalize_installation_data.py",
      "data/cyberwares.json",
      "data/cyberwares.schema.json",
      "data/equipment.json",
    ], { cwd: sandbox });
    assert.equal(finalized.status, 0, finalized.stderr || finalized.stdout);
    assert.deepEqual(readJson(path.join(sandbox, "data/cyberwares.json")), readJson(path.join(root, "data/cyberwares.json")));
    assert.deepEqual(readJson(path.join(sandbox, "data/cyberwares.schema.json")), readJson(path.join(root, "data/cyberwares.schema.json")));
  });
});
