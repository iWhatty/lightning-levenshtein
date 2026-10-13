"use strict";

import { resolve } from "node:path";

import { buildClosureBundle } from "./scripts/closure-build.mjs";

const sourceDirectory = resolve("./src");

buildClosureBundle({
  label: "profiles bundle",
  sourceDirectory,
  entryFile: resolve(sourceDirectory, "profiles.js"),
  temporaryEntryFile: resolve(sourceDirectory, "profiles_temp.js"),
  outputFile: resolve("./dist/lightning-levenshtein-profiles.min.js"),
  exportNames: ["createDistance"],
});
