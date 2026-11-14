// bench/default-wide-spike/derive-core.js
//
// Derives a copy of the default entry point whose short and blockwise kernels
// use full-width UTF-16 code-unit tables. Production already allocates two
// 65,536-entry lanes for its long-string kernel; here every default kernel
// shares those two lanes and the 256-entry table disappears.
//
// Only two modules differ from production: peq.js (the table) and myers_x64.js
// (which now borrows its lanes instead of owning them). Everything else is a
// byte-for-byte copy, so the spike measures the table change and nothing else.
//
//   node bench/default-wide-spike/derive-core.js          writes core/
//   node bench/default-wide-spike/derive-core.js --check  fails on drift
"use strict";

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(HERE, "..", "..", "src");
const OUTPUT_DIR = join(HERE, "core");

const VERBATIM = [
  "index.js",
  "distance.js",
  "distanceMax.js",
  "closest.js",
  "myers_32.js",
  "myers_32_factory.js",
  "myers_32_max.js",
  "myers_x.js",
  "myers_x_factory.js",
  "myers_x_max.js",
  "myers_x64_factory.js"
];

const WIDE_PEQ = `// Derived by bench/default-wide-spike/derive-core.js. Do not edit.
//
// Two full-width UTF-16 code-unit lanes shared by every default kernel. Calls
// are synchronous and each kernel zeroes what it wrote before returning, so
// the short, blockwise and long tiers can take turns on the same tables.
export const peq = new Uint32Array(0x10000);
export const peq1 = new Uint32Array(0x10000);
`;

const SHARED_X64 = `// Derived by bench/default-wide-spike/derive-core.js. Do not edit.

"use strict";

import { peq, peq1 } from "./peq.js";
import { createMyersX64 } from "./myers_x64_factory.js";

export const myers_x64 = createMyersX64(peq, peq1);
`;

function assertProductionShape() {
  const peqSource = readFileSync(join(SOURCE_DIR, "peq.js"), "utf8");
  if (!/export const peq = new Uint32Array\(256\);/.test(peqSource)) {
    throw new Error("src/peq.js no longer exports a 256-entry table; re-review this spike");
  }
  const x64Source = readFileSync(join(SOURCE_DIR, "myers_x64.js"), "utf8");
  const lanes = x64Source.match(/new Uint32Array\(65536\)/g) ?? [];
  if (lanes.length !== 2 || !x64Source.includes("createMyersX64(peq0, peq1)")) {
    throw new Error("src/myers_x64.js changed shape; re-review this spike");
  }
}

export function derivedFiles() {
  assertProductionShape();
  const files = new Map();
  for (const name of VERBATIM) {
    files.set(join(OUTPUT_DIR, name), readFileSync(join(SOURCE_DIR, name), "utf8"));
  }
  files.set(join(OUTPUT_DIR, "peq.js"), WIDE_PEQ);
  files.set(join(OUTPUT_DIR, "myers_x64.js"), SHARED_X64);
  return files;
}

function main() {
  const check = process.argv.includes("--check");
  const files = derivedFiles();
  let drift = 0;

  if (!check) mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const [path, content] of files) {
    if (check) {
      if (!existsSync(path) || readFileSync(path, "utf8") !== content) {
        console.error(`drift: ${path}`);
        drift++;
      }
    } else {
      writeFileSync(path, content);
    }
  }

  if (drift > 0) {
    console.error("Wide default core is stale; rerun derive-core.js.");
    process.exit(1);
  }
  console.log(check ? `wide default core matches production (${files.size} files)` : `wrote ${files.size} files to ${OUTPUT_DIR}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
