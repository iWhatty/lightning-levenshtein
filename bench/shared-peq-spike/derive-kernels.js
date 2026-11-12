// bench/shared-peq-spike/derive-kernels.js
//
// Derives pooled copies of the production v2 kernels. The only edit is the
// table header: private `new Uint32Array(65536)` lanes become imports from
// peqPool.js, in declaration order. Kernel bodies stay byte-identical, so the
// spike measures table ownership and nothing else.
//
//   node bench/shared-peq-spike/derive-kernels.js          writes kernels/
//   node bench/shared-peq-spike/derive-kernels.js --check  fails on drift
"use strict";

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(HERE, "..", "..", "src", "v2");
const OUTPUT_DIR = join(HERE, "kernels");

// Expected private lane count per production kernel; a mismatch means the
// production source changed shape and this spike must be re-reviewed.
const KERNELS = new Map([
  ["myers32-unrolledA.js", 1],
  ["myers_64.js", 2],
  ["myers_96.js", 3],
  ["myers_128.js", 4],
  ["myers_256.js", 8],
  ["myers_x64.js", 2],
  ["myers_x128.js", 4]
]);

const LANE_DECLARATION = /^const (\w+) = new Uint32Array\(65536\);[ \t]*\r?$/;

export function poolKernelSource(name, source, expectedLanes) {
  const names = [];
  const output = [];
  let insertAt = -1;

  for (const line of source.split("\n")) {
    const match = LANE_DECLARATION.exec(line);
    if (match) {
      if (insertAt < 0) insertAt = output.length;
      names.push(match[1]);
    } else {
      output.push(line);
    }
  }

  if (names.length !== expectedLanes) {
    throw new Error(`${name}: expected ${expectedLanes} private PEQ lanes, found ${names.length}`);
  }

  const bindings = names
    .map((local, lane) => (local === `peq${lane}` ? local : `peq${lane} as ${local}`))
    .join(", ");
  output.splice(insertAt, 0, `import { ${bindings} } from "../peqPool.js";`);
  const pooled = output.join("\n");

  if (pooled.includes("new Uint32Array(65536)")) {
    throw new Error(`${name}: a full-width table allocation survived pooling`);
  }
  return pooled;
}

export function derivedFiles() {
  const files = new Map();
  for (const [name, expectedLanes] of KERNELS) {
    const source = readFileSync(join(SOURCE_DIR, name), "utf8");
    files.set(join(OUTPUT_DIR, name), poolKernelSource(name, source, expectedLanes));
  }

  // The dispatcher is copied unchanged; its relative imports resolve to the
  // pooled kernels because it sits beside them.
  files.set(join(OUTPUT_DIR, "index.js"), readFileSync(join(SOURCE_DIR, "index.js"), "utf8"));
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
    console.error("Pooled kernels are stale; rerun derive-kernels.js.");
    process.exit(1);
  }
  console.log(check ? `pooled kernels match production (${files.size} files)` : `wrote ${files.size} files to ${OUTPUT_DIR}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
