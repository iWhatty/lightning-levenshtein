// bench/slim-spike/derive-kernels.js
//
// Derives the slim spike's kernels from production source:
//   - core/myers32-unrolled16.js: the v2 unrolled short-string kernels for
//     lengths 1-16 only, with their one full-width table exported so the
//     other tiers can share it. Kernel bodies stay byte-identical.
//   - core/myers_32_factory.js, core/myers_x_factory.js: byte-for-byte
//     copies of the stable factories, so the Closure build sees one directory.
// core/index.js is the hand-written dispatcher and is not derived.
//
//   node bench/slim-spike/derive-kernels.js          writes core/
//   node bench/slim-spike/derive-kernels.js --check  fails on drift
"use strict";

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..", "src");
const OUTPUT_DIR = join(HERE, "core");

// Highest unrolled length kept. Longer short strings use the generic 32-bit kernel.
export const UNROLLED_MAX = 16;

const TABLE_DECLARATION = "const peq = new Uint32Array(65536);";

export function trimUnrolledSource(source, max = UNROLLED_MAX) {
  const text = source.replace(/\r\n/g, "\n");
  if (text.split(TABLE_DECLARATION).length !== 2) {
    throw new Error("myers32-unrolledA.js: expected exactly one private full-width table");
  }
  const cut = text.indexOf(`function myers_${max + 1}(`);
  if (cut < 0) throw new Error(`myers32-unrolledA.js: no myers_${max + 1} to cut at`);

  let kept = text.slice(0, cut).replace(TABLE_DECLARATION, `export ${TABLE_DECLARATION}`);
  // The original header points at the production generator; say where this copy came from.
  kept = kept.replace(/^\/\/ Auto-generated:.*\n\/\/ Source:.*\n/,
    `// Derived by bench/slim-spike/derive-kernels.js from src/v2/myers32-unrolledA.js\n` +
    `// (lengths 1-${max} only, table exported). Do not edit by hand.\n`);

  for (let n = 1; n <= max; n++) {
    if (!kept.includes(`myers_table[${n}] = myers_${n};`)) {
      throw new Error(`myers32-unrolledA.js: myers_table[${n}] missing below the cut`);
    }
  }
  if ((kept.match(/new Uint32Array\(65536\)/g) ?? []).length !== 1) {
    throw new Error("unrolled16: expected exactly one full-width table after trimming");
  }
  return kept.replace(/\n+$/, "\n");
}

export function derivedFiles() {
  const files = new Map();
  files.set(join(OUTPUT_DIR, "myers32-unrolled16.js"),
    trimUnrolledSource(readFileSync(join(SRC, "v2", "myers32-unrolledA.js"), "utf8")));
  for (const name of ["myers_32_factory.js", "myers_x_factory.js"]) {
    files.set(join(OUTPUT_DIR, name), readFileSync(join(SRC, name), "utf8").replace(/\r\n/g, "\n"));
  }
  return files;
}

function main() {
  const check = process.argv.includes("--check");
  const files = derivedFiles();
  let drift = 0;

  if (!check) mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const [path, content] of files) {
    if (check) {
      if (!existsSync(path) || readFileSync(path, "utf8").replace(/\r\n/g, "\n") !== content) {
        console.error(`drift: ${path}`);
        drift++;
      }
    } else {
      writeFileSync(path, content);
    }
  }

  if (drift > 0) {
    console.error("Slim kernels are stale; rerun derive-kernels.js.");
    process.exit(1);
  }
  console.log(check ? `slim kernels match production (${files.size} files)` : `wrote ${files.size} files to ${OUTPUT_DIR}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
