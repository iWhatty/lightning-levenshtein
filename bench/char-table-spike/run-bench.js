// bench/char-table-spike/run-bench.js

import { buildPairs, mean } from "../data.js";
import { distance as fastestLevenshtein } from "fastest-levenshtein";

const LENGTHS = [3, 8, 16, 32];
const SEEDS = [1337, 7331, 20250321];
const PAIRS = 500;
const DURATION_MS = 350;
const WARM_ROUNDS = 3;

const ALPHABETS = [
  ["ascii", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"],
  ["latin1", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ñéøß"],
  ["bmp", "ĀĂĄĆĈĊČĎĐĒĔĖĘĚĞĠĢĤĦĨĪĬĮİ你我他她它"],
];

const peq256 = new Uint32Array(256);
const peq65536 = new Uint32Array(65536);

function hasWideCodeUnit(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a.charCodeAt(i) > 255) return true;
  }
  for (let i = 0; i < b.length; i++) {
    if (b.charCodeAt(i) > 255) return true;
  }
  return false;
}

function myers32WithPeq(a, b, peq) {
  if (a === b) return 0;

  if (a.length < b.length) {
    const t = a;
    a = b;
    b = t;
  }

  const n = a.length;
  const m = b.length;

  if (m === 0) return n;

  let mv = 0;
  let pv = -1;
  let score = n;
  const lastMask = 1 << (n - 1);

  let i = n;
  while (i--) {
    peq[a.charCodeAt(i)] |= 1 << i;
  }

  for (i = 0; i < m; i++) {
    const eq = peq[b.charCodeAt(i)];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;

    score += ((ph & lastMask) !== 0) - ((mh & lastMask) !== 0);

    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);

    pv = newPv;
    mv = newMv & xv;
  }

  i = n;
  while (i--) {
    peq[a.charCodeAt(i)] = 0;
  }

  return score;
}

function distance256(a, b) {
  return myers32WithPeq(a, b, peq256);
}

function distance65536(a, b) {
  return myers32WithPeq(a, b, peq65536);
}

function distanceAuto(a, b) {
  return hasWideCodeUnit(a, b)
    ? myers32WithPeq(a, b, peq65536)
    : myers32WithPeq(a, b, peq256);
}

const targets = [
  ["peq-256", distance256],
  ["peq-65536", distance65536],
  ["peq-auto", distanceAuto],
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

function countMismatches(fn, pairs) {
  let mismatches = 0;
  for (const [a, b] of pairs) {
    if (fn(a, b) !== fastestLevenshtein(a, b)) {
      mismatches++;
    }
  }
  return mismatches;
}

for (const [alphabetName, alphabet] of ALPHABETS) {
  console.log(`\n=== alphabet: ${alphabetName} ===`);

  for (const len of LENGTHS) {
    const results = new Map(targets.map(([name]) => [name, []]));
    const mismatchTotals = new Map(targets.map(([name]) => [name, 0]));

    for (const seed of SEEDS) {
      const pairs = buildPairs({
        count: PAIRS,
        lenA: len,
        lenB: len,
        seed,
        alphabet,
      });

      for (const [name, fn] of targets) {
        mismatchTotals.set(name, mismatchTotals.get(name) + countMismatches(fn, pairs));
        warm(fn, pairs);
        results.get(name).push(benchOne(fn, pairs));
      }
    }

    console.log(`\nN=${len}`);
    const ranked = [...results.entries()]
      .map(([name, values]) => [name, mean(values), mismatchTotals.get(name)])
      .sort((a, b) => b[1] - a[1]);

    for (const [name, value, mismatches] of ranked) {
      console.log(`${name.padEnd(22)} ${value.toFixed(2).padStart(12)} ops/ms  mismatches=${mismatches}`);
    }
  }
}
