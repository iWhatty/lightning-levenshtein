import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

const expected = {
  ".": ["closest", "distance", "distanceMax"],
  "./v2": ["levenshteinLightning"],
  "./unicode": ["distanceUnicode"]
};

assert.equal(pkg.types, pkg.exports["."].types);

for (const [subpath, names] of Object.entries(expected)) {
  const entry = pkg.exports[subpath];
  assert.ok(entry, `missing package export: ${subpath}`);
  assert.ok(entry.types, `missing types condition for ${subpath}`);

  const typePath = entry.types.replace(/^\.\//, "");
  assert.ok(existsSync(typePath), `missing declaration file: ${entry.types}`);
  assert.ok(
    pkg.files.includes(typePath),
    `declaration file is not included in package files: ${typePath}`
  );

  const declaredNames = Array.from(
    readFileSync(typePath, "utf8").matchAll(/export function (\w+)/g),
    (match) => match[1]
  ).sort();

  assert.deepEqual(declaredNames, names.slice().sort(), `${subpath} types drift`);
}

console.log("package declaration smoke check passed");
