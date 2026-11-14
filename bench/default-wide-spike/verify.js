// bench/default-wide-spike/verify.js
//
// Correctness-only check for the wide default core. No timing, no output files.
//
//   1. Wide `distance`, `distanceMax` and `closest` agree with the
//      dynamic-programming reference for every alphabet, including text the
//      production default API gets wrong.
//   2. On ASCII and Latin-1 input the wide core returns exactly what the
//      production default API returns, over-threshold values included, so
//      in-contract callers see no change.
//   3. Both shared lanes are zero again after every call.
//
// It also counts how often the production default API disagrees with the
// reference on wider text, to size the problem being fixed.
"use strict";

import { referenceDistance } from "../reference-distance.js";
import * as production from "../../src/index.js";
import * as wide from "./core/index.js";
import { peq, peq1 } from "./core/peq.js";

const lanes = [peq, peq1];

// Both sides of every default dispatch edge (33 and 65), plus long inputs.
const LENGTHS = [0, 1, 2, 3, 5, 8, 16, 31, 32, 33, 34, 48, 63, 64, 65, 66, 100, 130, 200, 300];

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const NARROW = {
  ascii: range(32, 126),
  latin1: [...range(65, 90), ...range(0xc0, 0xff)]
};

const WIDE = {
  cyrillic: range(0x430, 0x44f),
  cjk: range(0x4e00, 0x4e3f),
  mixedLatinExtended: [...range(97, 122), 0x141, 0x142, 0x15a, 0x17a, 0x17c, 0x105, 0x119],
  surrogates: [0xd83d, 0xde00, 0xde01, 0xde02, 0xd83c, 0xdf89, 0x61, 0x62],
  edges: [0, 1, 0xff, 0x100, 0x101, 0xfffe, 0xffff]
};

let seed = 0x1f2e3d4c;
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

function buildPairs(alphabet) {
  const pairs = [];
  for (const n of LENGTHS) {
    for (const m of new Set([n, Math.max(0, n - 1), n >> 1, (random() * (n + 1)) | 0])) {
      pairs.push([randomString(n, alphabet), randomString(m, alphabet)]);
    }
    const base = randomString(n, alphabet);
    pairs.push([base, mutate(base, 1, alphabet)]);
    pairs.push([base, mutate(base, 3, alphabet)]);
    pairs.push([base, base.slice(0)]);
  }
  return pairs;
}

function assertLanesClear(a, b, label) {
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

function assertAllClear(label) {
  for (let lane = 0; lane < lanes.length; lane++) {
    for (let unit = 0; unit < lanes[lane].length; unit++) {
      if (lanes[lane][unit] !== 0) throw new Error(`${label}: lane ${lane} dirty at code unit ${unit}`);
    }
  }
}

// Mirrors the documented threshold rule: a fraction between 0 and 1 is taken
// relative to the original length of `a` and rounded up.
function effectiveThreshold(a, threshold) {
  if (threshold === undefined) return Number.MAX_SAFE_INTEGER;
  return threshold > 0 && threshold < 1 ? Math.ceil(threshold * a.length) : threshold;
}

function thresholdsFor(expected, n) {
  return [undefined, 0, 1, 2, expected - 1, expected, expected + 1, n, n + 1, 0.25, 0.5]
    .filter((value) => value === undefined || value >= 0);
}

function expectedClosest(query, candidates, threshold) {
  let best = null;
  let bestDistance = threshold + 1;
  for (const candidate of candidates) {
    const d = referenceDistance(query, candidate);
    if (d < bestDistance) {
      bestDistance = d;
      best = candidate;
    }
  }
  return best;
}

const stats = { calls: 0, productionWrongDistance: 0, wideTextDistanceCalls: 0, productionWrongClosest: 0, wideTextClosestCalls: 0 };
assertAllClear("before first call");

function checkAlphabet(name, alphabet, narrow) {
  for (const [a0, b0] of buildPairs(alphabet)) {
    for (const [a, b] of [[a0, b0], [b0, a0]]) {
      const label = `${name} n=${a.length} m=${b.length}`;
      const expected = referenceDistance(a, b);

      const actual = wide.distance(a, b);
      if (actual !== expected) throw new Error(`${label}: wide distance ${actual}, reference ${expected}`);
      assertLanesClear(a, b, label);
      stats.calls++;

      const current = production.distance(a, b);
      if (narrow) {
        if (current !== actual) throw new Error(`${label}: wide distance ${actual}, production ${current}`);
      } else {
        stats.wideTextDistanceCalls++;
        if (current !== expected) stats.productionWrongDistance++;
      }

      for (const threshold of thresholdsFor(expected, Math.max(a.length, b.length))) {
        const limit = effectiveThreshold(a, threshold);
        const bounded = wide.distanceMax(a, b, threshold);
        const ok = expected <= limit ? bounded === expected : bounded > limit;
        if (!ok) {
          throw new Error(`${label} max=${threshold}: wide distanceMax ${bounded}, reference ${expected}`);
        }
        assertLanesClear(a, b, label);
        stats.calls++;

        if (narrow) {
          const currentBounded = production.distanceMax(a, b, threshold);
          if (currentBounded !== bounded) {
            throw new Error(`${label} max=${threshold}: wide distanceMax ${bounded}, production ${currentBounded}`);
          }
        }
      }
    }
  }

  for (let round = 0; round < 60; round++) {
    const n = LENGTHS[1 + ((random() * (LENGTHS.length - 1)) | 0)];
    const query = randomString(n, alphabet);
    const candidates = [
      randomString(n, alphabet),
      mutate(query, 4, alphabet),
      mutate(query, 2, alphabet),
      randomString(Math.max(1, n - 2), alphabet),
      mutate(query, 2, alphabet)
    ];
    for (const threshold of [undefined, 1, 3]) {
      const label = `${name} closest n=${n} max=${threshold}`;
      const expected = expectedClosest(query, candidates, threshold ?? Number.MAX_SAFE_INTEGER);
      const actual = wide.closest(query, candidates, threshold);
      if (actual !== expected) throw new Error(`${label}: wide closest disagrees with reference`);
      stats.calls++;

      const current = production.closest(query, candidates, threshold);
      if (narrow) {
        if (current !== actual) throw new Error(`${label}: wide closest disagrees with production`);
      } else {
        stats.wideTextClosestCalls++;
        if (current !== expected) stats.productionWrongClosest++;
      }
    }
  }
  assertAllClear(`after ${name}`);
}

for (const [name, alphabet] of Object.entries(NARROW)) checkAlphabet(name, alphabet, true);
for (const [name, alphabet] of Object.entries(WIDE)) checkAlphabet(name, alphabet, false);

console.log(
  `Wide default core verification passed: ${stats.calls} calls, ` +
  `${(lanes.length * 65536 * 4) / 1024} KiB of tables (production default: 513 KiB).\n` +
  `Production default API on wider text: distance wrong in ${stats.productionWrongDistance} of ` +
  `${stats.wideTextDistanceCalls} calls, closest wrong in ${stats.productionWrongClosest} of ` +
  `${stats.wideTextClosestCalls} calls.\nNo timing was performed.`
);
