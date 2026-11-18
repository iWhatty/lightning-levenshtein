// bench/slim-spike/measure-size.mjs
//
// Compares the checked-in default, v2 and slim bundles by bytes, and measures
// the typed-array memory each source entry holds after import in a fresh
// process. No timing, no output files. Rebuild dist with `pnpm run build:all`
// first if the source has changed.
//
//   node bench/slim-spike/measure-size.mjs
"use strict";

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

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
  ["default", "lightning-levenshtein.min.js", "src/index.js", "distance"],
  ["/v2", "lightning-levenshtein-v2.min.js", "src/v2/index.js", "levenshteinLightning"],
  ["/slim", "lightning-levenshtein-slim.min.js", "src/slim.js", "distanceSlim"]
];

for (const [label, bundle, entry, exportName] of rows) {
  const { raw, gzip } = sizes(join(REPO_ROOT, "dist", bundle));
  const kib = tableKiB(join(REPO_ROOT, entry), exportName);
  console.log(`${label.padEnd(8)} ${String(raw).padStart(6)} bytes  ${String(gzip).padStart(5)} gzip  ${String(kib).padStart(5)} KiB tables`);
}
