// Valida datasets JSON usando AJV.
// Pré-requisito: npm install ajv
// Execução: node js/validate_data.js

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");

const datasets = [
  {
    label: "cyberwares",
    schema: path.resolve(__dirname, "../data/cyberwares.schema.json"),
    data: path.resolve(__dirname, "../data/cyberwares.json")
  },
  {
    label: "cyberwares.pt-BR",
    schema: path.resolve(__dirname, "../data/cyberwares.schema.json"),
    data: path.resolve(__dirname, "../data/cyberwares.pt-BR.json")
  },
  {
    label: "equipment",
    schema: path.resolve(__dirname, "../data/equipment.schema.json"),
    data: path.resolve(__dirname, "../data/equipment.json")
  },
  {
    label: "equipment.pt-BR",
    schema: path.resolve(__dirname, "../data/equipment.schema.json"),
    data: path.resolve(__dirname, "../data/equipment.pt-BR.json")
  },
  {
    label: "decks",
    schema: path.resolve(__dirname, "../data/decks.schema.json"),
    data: path.resolve(__dirname, "../data/decks.json")
  },
  {
    label: "decks.pt-BR",
    schema: path.resolve(__dirname, "../data/decks.schema.json"),
    data: path.resolve(__dirname, "../data/decks.pt-BR.json")
  },
  {
    label: "weapons",
    schema: path.resolve(__dirname, "../data/weapons-store.schema.json"),
    data: path.resolve(__dirname, "../data/weapons.json")
  },
  {
    label: "weapons.pt-BR",
    schema: path.resolve(__dirname, "../data/weapons-store.schema.json"),
    data: path.resolve(__dirname, "../data/weapons.pt-BR.json")
  },
  {
    label: "drugs",
    schema: path.resolve(__dirname, "../data/drugs.schema.json"),
    data: path.resolve(__dirname, "../data/drugs.json")
  },
  {
    label: "drugs.pt-BR",
    schema: path.resolve(__dirname, "../data/drugs.schema.json"),
    data: path.resolve(__dirname, "../data/drugs.pt-BR.json")
  },
  {
    label: "chip-rates",
    schema: path.resolve(__dirname, "../data/chip-rates.schema.json"),
    data: path.resolve(__dirname, "../data/chip-rates.json")
  },
  {
    label: "chip-rates.pt-BR",
    schema: path.resolve(__dirname, "../data/chip-rates.schema.json"),
    data: path.resolve(__dirname, "../data/chip-rates.pt-BR.json")
  }
];

const ajv = new Ajv({ allErrors: true, strict: false });
const validators = new Map();

let exitCode = 0;

datasets.forEach(({ label, schema, data }) => {
  const schemaJson = JSON.parse(fs.readFileSync(schema, "utf8"));
  const dataJson = JSON.parse(fs.readFileSync(data, "utf8"));

  const validate = validators.get(schema) || ajv.compile(schemaJson);
  validators.set(schema, validate);
  const valid = validate(dataJson);

  if (valid) {
    console.log(`Dataset "${label}" válido.`);
  } else {
    console.error(`Inconsistências em "${label}":`);
    console.error(validate.errors);
    exitCode = 1;
  }
});

process.exitCode = exitCode;
