const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("catalog UI exposes no manual dice controls", () => {
  const script = read("js/script.js");
  const i18n = read("js/i18n.js");

  assert.doesNotMatch(script, /createButton\s*\(/);
  assert.doesNotMatch(script, /btn-dice|dice-area|catalog\.roll/);
  assert.doesNotMatch(i18n, /"catalog\.roll"/);
  assert.match(script, /automatic HL calculation/);
});

test("JACK OUT is a fixed single-line navigation action", () => {
  const auth = read("js/auth.js");
  const css = read("css/styles.css");

  assert.match(auth, /logoutLi\.className = "nav-session-action"/);
  assert.match(auth, /logoutBtn\.className = "jack-out-link"/);
  assert.match(css, /\.nav-links \.nav-session-action\s*\{[^}]*flex:\s*0 0 auto/s);
  assert.match(css, /\.nav-links \.jack-out-link\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(css, /\.nav-links \.jack-out-link\s*\{[^}]*min-width:\s*max-content/s);
});
