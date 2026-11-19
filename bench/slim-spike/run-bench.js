// bench/slim-spike/run-bench.js
//
// Paired throughput comparison: the /slim entry against production default,
// production v2 and fastest-levenshtein, on the repository's workload
// families. Entries run in rotating order within each round, and each cell
// reports the median of the rounds. Prints to stdout only; nothing is written.
//
//   node bench/slim-spike/run-bench.js [--rounds=7] [--pairs=2000]
//
// Treat a single run as a probe, not promotion evidence: repeat on a quiet
// host and across Node versions before quoting a number.
"use strict";

import { distance as fastest } from "fastest-levenshtein";
import { distance as productionDefault } from "../../src/index.js";
import { levenshteinLightning as productionV2 } from "../../src/v2/index.js";
import { distanceSlim as slim } from "../../src/slim.js";
import { buildWorkloadPairs } from "../workloads.js";

const argument = (name, fallback) => {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? Number(found.slice(name.length + 3)) : fallback;
};
const ROUNDS = argument("rounds", 7);
const PAIRS = argument("pairs", 2000);

const ENTRIES = [
  ["fastest-levenshtein", fastest],
  ["default", productionDefault],
  ["v2", productionV2],
  ["slim", slim]
];
const FAMILIES = ["exact-one-edit", "random-ascii", "unequal-length", "latin1", "bmp-code-units"];
const LENGTHS = [4, 8, 12, 16, 24, 32, 64, 128];

function opsPerSecond(fn, pairs) {
  // Repeat until at least 20 ms elapse so short strings are not timer noise.
  let sink = 0;
  let calls = 0;
  const start = performance.now();
  let elapsed = 0;
  do {
    for (let i = 0; i < pairs.length; i++) sink += fn(pairs[i][0], pairs[i][1]);
    calls += pairs.length;
    elapsed = performance.now() - start;
  } while (elapsed < 20);
  if (sink < 0) throw new Error("unreachable");
  return calls / (elapsed / 1000);
}

const median = (values) => {
  const sorted = [...values].sort((x, y) => x - y);
  return sorted[sorted.length >> 1];
};

console.log(`node ${process.version}, ${ROUNDS} rounds, ${PAIRS} pairs per cell. Ratios are against fastest-levenshtein.`);
console.log(["family", "len", ...ENTRIES.map(([name]) => name)].join("\t"));

for (const family of FAMILIES) {
  for (const length of LENGTHS) {
    const pairs = buildWorkloadPairs({ family, count: PAIRS, length, seed: 0x51a7 + length });
    for (const [, fn] of ENTRIES) opsPerSecond(fn, pairs); // warm up

    const samples = ENTRIES.map(() => []);
    for (let round = 0; round < ROUNDS; round++) {
      for (let k = 0; k < ENTRIES.length; k++) {
        const index = (k + round) % ENTRIES.length;
        samples[index].push(opsPerSecond(ENTRIES[index][1], pairs));
      }
    }
    const medians = samples.map(median);
    const cells = medians.map((value) => `${(value / medians[0]).toFixed(2)}x`);
    console.log([family, length, ...cells].join("\t"));
  }
}
