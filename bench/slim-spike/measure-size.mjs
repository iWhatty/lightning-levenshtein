// bench/slim-spike/measure-size.mjs
//
// Builds the slim spike with the production Closure pipeline, compares its
// bundle with the checked-in default and v2 bundles, and measures the typed-
// array memory each entry allocates when imported in a fresh process. No timing.
//
//   node bench/slim-spike/measure-size.mjs --out-dir=<external-directory>
//
// Run from the repository root. The output directory must be outside the
// checkout so the build never leaves files in the working tree.
"use strict";

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

import { buildClosureBundle } from "../../scripts/closure-build.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const CORE = join(HERE, "core");

const outArgument = process.argv.find((argument) => argument.startsWith("--out-dir="));
if (!outArgument) throw new Error("measure-size requires --out-dir=<external-directory>");
const outDirectory = resolve(outArgument.slice("--out-dir=".length));
// A path on another Windows drive comes back absolute instead of "..\\…".
const fromRoot = relative(REPO_ROOT, outDirectory);
if (!fromRoot.startsWith("..") && !isAbsolute(fromRoot)) {
  throw new Error("--out-dir must be outside the repository checkout");
}

const slimBundle = join(outDirectory, "slim.min.js");
buildClosureBundle({
  label: "slim spike bundle",
  sourceDirectory: CORE,
  entryFile: join(CORE, "index.js"),
  temporaryEntryFile: join(CORE, "index_temp.js"),
  outputFile: slimBundle,
  exportNames: ["distance"]
});

function sizes(file) {
  const bytes = Buffer.from(readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
  return { raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length };
}

// Typed-array bytes held after importing an entry and calling it on a short
// and a long pair, measured in a child process so entries never share a realm.
function tableKiB(entry, exportName) {
  const script = `
    const before = process.memoryUsage().arrayBuffers;
    const m = await import(${JSON.stringify(pathToFileURL(entry).href)});
    m[${JSON.stringify(exportName)}]("kitten", "sitting");
    m[${JSON.stringify(exportName)}]("a".repeat(600), "b".repeat(600));
    globalThis.gc();
    console.log(Math.round((process.memoryUsage().arrayBuffers - before) / 1024));`;
  return Number(execFileSync(process.execPath, ["--expose-gc", "--input-type=module", "-e", script], { encoding: "utf8" }).trim());
}

const rows = [
  ["production default", join(REPO_ROOT, "dist", "lightning-levenshtein.min.js"), join(REPO_ROOT, "src", "index.js"), "distance"],
  ["production v2", join(REPO_ROOT, "dist", "lightning-levenshtein-v2.min.js"), join(REPO_ROOT, "src", "v2", "index.js"), "levenshteinLightning"],
  ["slim spike", slimBundle, join(CORE, "index.js"), "distance"]
];

for (const [label, bundle, entry, exportName] of rows) {
  const { raw, gzip } = sizes(bundle);
  console.log(`${label.padEnd(20)} ${String(raw).padStart(6)} bytes  ${String(gzip).padStart(5)} gzip  ${String(tableKiB(entry, exportName)).padStart(5)} KiB tables`);
}
