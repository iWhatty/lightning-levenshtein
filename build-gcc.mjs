"use strict";

import { resolve } from "node:path";

import { buildClosureBundle } from "./scripts/closure-build.mjs";

const sourceDirectory = resolve("./src");

buildClosureBundle({
  label: "default bundle",
  sourceDirectory,
  entryFile: resolve(sourceDirectory, "index.js"),
  temporaryEntryFile: resolve(sourceDirectory, "index_temp.js"),
  outputFile: resolve("./dist/lightning-levenshtein.min.js"),
  exportNames: ["distance", "distanceMax", "closest"],
});
