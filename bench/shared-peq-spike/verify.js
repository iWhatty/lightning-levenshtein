// bench/shared-peq-spike/verify.js
//
// Correctness-only check for the shared PEQ pool. No timing, no output files.
//
//   1. Pooled v2 agrees with the dynamic-programming reference and with
//      production v2 at every dispatch boundary, for several alphabets.
//   2. Calls are shuffled so consecutive calls land in different tiers; a lane
//      left dirty by one kernel would corrupt the next.
//   3. Every pool lane is zero again after every call (targeted at the code
//      units just used, with periodic full scans as a backstop).
"use strict";

import { referenceDistance } from "../reference-distance.js";
import { levenshteinLightning as production } from "../../src/v2/index.js";
import { levenshteinLightning as pooled } from "./kernels/index.js";
import { lanes } from "./peqPool.js";

// Every production dispatch edge (see src/v2/index.js) with both neighbours.
const LENGTHS = [
  0, 1, 2, 3, 4, 5, 16, 31, 32, 33, 48, 63, 64, 65, 95, 96, 97,
  127, 128, 129, 160, 223, 224, 225, 255, 256, 257, 300, 511, 512, 513, 600
];

const ALPHABETS = {
  dna: [..."ACGT"].map((c) => c.charCodeAt(0)),
  ascii: Array.from({ length: 95 }, (_, i) => 32 + i),
  codeUnit: [0, 1, 0x7f, 0x80, 0xff, 0x100, 0x3042, 0xd83d, 0xde00, 0xfffe, 0xffff]
};

let seed = 0x9e3779b9;
function random() {
  // mulberry32: deterministic so failures reproduce exactly.
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function randomString(length, alphabet) {
  const units = new Array(length);
  for (let i = 0; i < length; i++) units[i] = alphabet[(random() * alphabet.length) | 0];
  return String.fromCharCode(...units);
}

function mutate(value, edits, alphabet) {
  const units = Array.from(value, (c) => c.charCodeAt(0));
  for (let e = 0; e < edits; e++) {
    const at = (random() * (units.length + 1)) | 0;
    const kind = (random() * 3) | 0;
    const unit = alphabet[(random() * alphabet.length) | 0];
    if (kind === 0) units.splice(at, 0, unit);
    else if (kind === 1 && units.length > 0) units.splice(Math.min(at, units.length - 1), 1);
    else if (units.length > 0) units[Math.min(at, units.length - 1)] = unit;
  }
  return String.fromCharCode(...units);
}

function buildCases() {
  const cases = [];
  for (const [alphabetName, alphabet] of Object.entries(ALPHABETS)) {
    for (const n of LENGTHS) {
      const partnerLengths = new Set([n, Math.max(0, n - 1), n >> 1, Math.min(n, 1), (random() * (n + 1)) | 0]);
      for (const m of partnerLengths) {
        const a = randomString(n, alphabet);
        cases.push([alphabetName, a, randomString(m, alphabet)]);
      }
      // Low-distance pairs exercise long equal runs and carry chains.
      const base = randomString(n, alphabet);
      cases.push([alphabetName, base, mutate(base, 1, alphabet)]);
      cases.push([alphabetName, base, mutate(base, 3, alphabet)]);
      cases.push([alphabetName, base, base.slice(0, -1) + base.slice(-1)]);
    }
  }

  // Fisher-Yates: interleave tiers so pool lanes change owners constantly.
  for (let i = cases.length - 1; i > 0; i--) {
    const j = (random() * (i + 1)) | 0;
    [cases[i], cases[j]] = [cases[j], cases[i]];
  }
  return cases;
}

function assertUsedUnitsClear(a, b, label) {
  for (const value of [a, b]) {
    for (let i = 0; i < value.length; i++) {
      const unit = value.charCodeAt(i);
      for (let lane = 0; lane < lanes.length; lane++) {
        if (lanes[lane][unit] !== 0) {
          throw new Error(`${label}: lane ${lane} left dirty at code unit ${unit}`);
        }
      }
    }
  }
}

function assertPoolClear(label) {
  for (let lane = 0; lane < lanes.length; lane++) {
    const table = lanes[lane];
    for (let unit = 0; unit < table.length; unit++) {
      if (table[unit] !== 0) throw new Error(`${label}: lane ${lane} dirty at code unit ${unit}`);
    }
  }
}

function describe(alphabetName, a, b) {
  return `${alphabetName} n=${a.length} m=${b.length}`;
}

const cases = buildCases();
let checked = 0;
assertPoolClear("before first call");

for (const [alphabetName, a, b] of cases) {
  const expected = referenceDistance(a, b);

  for (const [x, y] of [[a, b], [b, a]]) {
    const label = describe(alphabetName, x, y);
    const actual = pooled(x, y);
    if (actual !== expected) {
      throw new Error(`${label}: pooled returned ${actual}, reference ${expected}`);
    }
    assertUsedUnitsClear(x, y, label);

    const current = production(x, y);
    if (current !== expected) {
      throw new Error(`${label}: production returned ${current}, reference ${expected}`);
    }
    checked++;
    if (checked % 256 === 0) assertPoolClear(`after ${checked} calls`);
  }
}

assertPoolClear("after last call");

console.log(`Shared PEQ pool verification passed: ${checked} calls, ${lanes.length} lanes, ` +
  `${(lanes.length * 65536 * 4) / 1048576} MiB pooled vs 6 MiB private. No timing was performed.`);
