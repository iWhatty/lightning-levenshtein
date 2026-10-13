"use strict";

import { resolve } from "node:path";

import { buildClosureBundle } from "./scripts/closure-build.mjs";

const sourceDirectory = resolve("./src");

buildClosureBundle({
  label: "unicode bundle",
  sourceDirectory,
  entryFile: resolve(sourceDirectory, "unicode.js"),
  temporaryEntryFile: resolve(sourceDirectory, "unicode_temp.js"),
  outputFile: resolve("./dist/lightning-levenshtein-unicode.min.js"),
  exportNames: ["distanceUnicode"],
});
