// bench/small-dispatch-spike/run-bench.js

import { buildPairs, mean } from "../data.js";
import { distance as fastestLevenshtein } from "fastest-levenshtein";
import { levenshteinLightning } from "../lightning-levenshtein-v2.min.js";
import { levenshteinLightning as levenshteinLightningSource } from "../../src/v2/index.js";
import { lev3_dispatch, lev4_dispatch } from "../bolt/lev-dispatch.js";
import { levenshteinLightningDirect3 } from "./levenshtein-v2-direct3.js";

const LENGTHS = [1, 2, 3, 4, 5, 8, 16, 32];
const SEEDS = [1337, 7331, 20250321];
const PAIRS = 500;
const DURATION_MS = 350;
const WARM_ROUNDS = 3;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function tinyDirect34(a, b) {
  if (a === b) return 0;

  if (a.length < b.length) {
    const t = a;
    a = b;
    b = t;
  }

  const n = a.length;
  const m = b.length;

  if (m === 0) return n;
  if (n < 2) return +(a !== b);

  if (n < 3) {
    if (m > 1) {
      return (a.charCodeAt(0) !== b.charCodeAt(0)) + (a.charCodeAt(1) !== b.charCodeAt(1));
    }
    const b0 = b.charCodeAt(0);
    return (a.charCodeAt(0) === b0 || a.charCodeAt(1) === b0) ? 1 : 2;
  }

  if (n < 4) return lev3_dispatch(a, b);
  if (n < 5) return lev4_dispatch(a, b);

  return levenshteinLightning(a, b);
}

function tinyDirect3(a, b) {
  if (a === b) return 0;

  if (a.length < b.length) {
    const t = a;
    a = b;
    b = t;
  }

  const n = a.length;
  const m = b.length;

  if (m === 0) return n;
  if (n === 3) return lev3_dispatch(a, b);

  return levenshteinLightning(a, b);
}

const targets = [
  ["lightning-v2", levenshteinLightning],
  ["source-v2", levenshteinLightningSource],
  ["v2-inline-direct-3", levenshteinLightningDirect3],
  ["tiny-direct-3", tinyDirect3],
  ["tiny-direct-3-4", tinyDirect34],
  ["fastest-levenshtein", fastestLevenshtein],
];

function warm(fn, pairs) {
  for (let r = 0; r < WARM_ROUNDS; r++) {
    for (let i = 0; i < pairs.length; i++) {
      const [a, b] = pairs[i];
      fn(a, b);
    }
  }
}

function benchOne(fn, pairs) {
  let calls = 0;
  const t0 = performance.now();
  let elapsed = 0;

  while (elapsed < DURATION_MS) {
    for (let i = 0; i < pairs.length; i++) {
      const [a, b] = pairs[i];
      fn(a, b);
      calls++;
    }
    elapsed = performance.now() - t0;
  }

  return calls / elapsed;
}

function assertCorrect(pairs) {
  for (const [a, b] of pairs) {
    const expected = fastestLevenshtein(a, b);
    const actualInline3 = levenshteinLightningDirect3(a, b);
    const actual3 = tinyDirect3(a, b);
    const actual34 = tinyDirect34(a, b);
    if (actualInline3 !== expected) {
      throw new Error(`levenshteinLightningDirect3 mismatch for ${a}/${b}: ${actualInline3} !== ${expected}`);
    }
    if (actual3 !== expected) {
      throw new Error(`tinyDirect3 mismatch for ${a}/${b}: ${actual3} !== ${expected}`);
    }
    if (actual34 !== expected) {
      throw new Error(`tinyDirect34 mismatch for ${a}/${b}: ${actual34} !== ${expected}`);
    }
  }
}

for (const len of LENGTHS) {
  const results = new Map(targets.map(([name]) => [name, []]));

  for (const seed of SEEDS) {
    const pairs = buildPairs({
      count: PAIRS,
      lenA: len,
      lenB: len,
      seed,
      alphabet: ALPHABET,
    });

    assertCorrect(pairs);

    for (const [name, fn] of targets) {
      warm(fn, pairs);
      results.get(name).push(benchOne(fn, pairs));
    }
  }

  console.log(`\nN=${len}`);
  const ranked = [...results.entries()]
    .map(([name, values]) => [name, mean(values)])
    .sort((a, b) => b[1] - a[1]);

  for (const [name, value] of ranked) {
    console.log(`${name.padEnd(22)} ${value.toFixed(2).padStart(12)} ops/ms`);
  }
}
