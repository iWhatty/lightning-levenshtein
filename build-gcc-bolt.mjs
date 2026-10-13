"use strict";

import { resolve } from "node:path";

import { buildClosureBundle } from "./scripts/closure-build.mjs";

// v2 source moved from bench/bolt/ to src/v2/ in 0.0.5 so bundlers can use
// raw ESM through the package import condition. See CHANGELOG 0.0.5.
const sourceDirectory = resolve("./src/v2");

buildClosureBundle({
  label: "v2 bundle",
  sourceDirectory,
  entryFile: resolve(sourceDirectory, "index.js"),
  temporaryEntryFile: resolve(sourceDirectory, "index_temp.js"),
  outputFile: resolve("./bench/lightning-levenshtein-v2.min.js"),
  exportNames: ["levenshteinLightning"],
  includeExterns: false,
  copies: [resolve("./dist/lightning-levenshtein-v2.min.js")],
});
