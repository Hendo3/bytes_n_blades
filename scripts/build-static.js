const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const directory of ["assets", "css", "data", "html", "js"]) {
  fs.cpSync(path.join(root, directory), path.join(output, directory), {
    recursive: true,
  });
}

for (const filename of ["index.html", "login.html", "manifest.webmanifest"]) {
  fs.copyFileSync(path.join(root, filename), path.join(output, filename));
}

console.log("static site built in dist/");
