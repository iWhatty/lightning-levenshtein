// bench/default-wide-spike/measure-size.mjs
//
// Builds the wide default core with the production Closure pipeline and
// compares its size with the checked-in default bundle. No timing.
//
//   node bench/default-wide-spike/measure-size.mjs --out-dir=<external-directory>
//
// Run from the repository root. The output directory must be outside the
// checkout so the build never leaves files in the working tree.
"use strict";

import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { buildClosureBundle } from "../../scripts/closure-build.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");

const outArgument = process.argv.find((argument) => argument.startsWith("--out-dir="));
if (!outArgument) throw new Error("measure-size requires --out-dir=<external-directory>");
const outDirectory = resolve(outArgument.slice("--out-dir=".length));
// A path on another Windows drive comes back absolute instead of "..\\…".
const fromRoot = relative(REPO_ROOT, outDirectory);
if (!fromRoot.startsWith("..") && !isAbsolute(fromRoot)) {
  throw new Error("--out-dir must be outside the repository checkout");
}

const sourceDirectory = join(HERE, "core");
const wideBundle = join(outDirectory, "default-wide.min.js");

buildClosureBundle({
  label: "wide default spike bundle",
  sourceDirectory,
  entryFile: join(sourceDirectory, "index.js"),
  temporaryEntryFile: join(sourceDirectory, "index_temp.js"),
  outputFile: wideBundle,
  exportNames: ["distance", "distanceMax", "closest"]
});

function sizes(file) {
  // Normalize line endings so a CRLF checkout does not skew the comparison.
  const bytes = Buffer.from(readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
  return { raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length };
}

const current = sizes(join(REPO_ROOT, "dist", "lightning-levenshtein.min.js"));
const wide = sizes(wideBundle);

console.log(`production default bundle: ${current.raw} bytes, ${current.gzip} gzip`);
console.log(`wide default spike bundle: ${wide.raw} bytes, ${wide.gzip} gzip`);
console.log(`difference: ${wide.raw - current.raw} bytes, ${wide.gzip - current.gzip} gzip`);
