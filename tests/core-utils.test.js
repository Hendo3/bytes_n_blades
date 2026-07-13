const assert = require("assert");
const {
  parseNumeric,
  formatCurrency,
  normalizeName,
  rollHL,
  hlComparable,
} = require("../js/core-utils.js");

function testParseNumeric() {
  assert.strictEqual(parseNumeric(10), 10);
  assert.strictEqual(parseNumeric("200.50"), 200.5);
  assert.strictEqual(parseNumeric("between 100.0 and 500.0"), 300);
  assert.strictEqual(parseNumeric("N/A"), 0);
}

function testFormatCurrency() {
  assert.strictEqual(formatCurrency(1000), "1,000.00 eb");
  assert.strictEqual(formatCurrency(0), "0.00 eb");
}

function testNormalizeName() {
  assert.strictEqual(normalizeName("Neuralware Processor"), "neuralware processor");
  assert.strictEqual(normalizeName("Óptica+ Mk.II"), "optica mkii");
}

function testRollHL() {
  const fixed = rollHL("2");
  assert.strictEqual(fixed.value, 2);

  const dice = rollHL("1D6");
  assert.ok(dice.value >= 1 && dice.value <= 6);

  const dicePlus = rollHL("1D6+4");
  assert.ok(dicePlus.value >= 5 && dicePlus.value <= 10);

  const alt = rollHL("1D6/2D6");
  assert.ok(alt.value >= 1 && alt.value <= 12);

  const pct = rollHL("50% HC");
  assert.strictEqual(pct.value, 0);
  assert.ok(String(pct.log).includes("HL_MANUAL_REVIEW"));
}

function testHlComparable() {
  assert.strictEqual(hlComparable("2"), 2);
  assert.strictEqual(hlComparable("1D6"), 3.5);
  assert.strictEqual(hlComparable("1D6+4"), 7.5);
  assert.strictEqual(hlComparable("1D6/2D6"), 3.5);
  assert.strictEqual(hlComparable("50% HC"), Infinity);
}

function run() {
  testParseNumeric();
  testFormatCurrency();
  testNormalizeName();
  testRollHL();
  testHlComparable();
  console.log("core-utils tests passed");
}

run();
