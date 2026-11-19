"use strict";

import { resolve } from "node:path";

import { buildClosureBundle } from "./scripts/closure-build.mjs";

const sourceDirectory = resolve("./src");

buildClosureBundle({
  label: "slim bundle",
  sourceDirectory,
  entryFile: resolve(sourceDirectory, "slim.js"),
  temporaryEntryFile: resolve(sourceDirectory, "slim_temp.js"),
  outputFile: resolve("./dist/lightning-levenshtein-slim.min.js"),
  exportNames: ["distanceSlim"],
});
