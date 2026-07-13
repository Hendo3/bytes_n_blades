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
    label: "equipment",
    schema: path.resolve(__dirname, "../data/equipment.schema.json"),
    data: path.resolve(__dirname, "../data/equipment.json")
  },
  {
    label: "drugs",
    schema: path.resolve(__dirname, "../data/drugs.schema.json"),
    data: path.resolve(__dirname, "../data/drugs.json")
  }
];

console.log('Skipping "weapons" validation (dataset pending completion).');

const ajv = new Ajv({ allErrors: true, strict: false });

let exitCode = 0;

datasets.forEach(({ label, schema, data }) => {
  const schemaJson = JSON.parse(fs.readFileSync(schema, "utf8"));
  const dataJson = JSON.parse(fs.readFileSync(data, "utf8"));

  const validate = ajv.compile(schemaJson);
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
