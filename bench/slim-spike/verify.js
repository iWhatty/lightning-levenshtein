// bench/slim-spike/verify.js
//
// Correctness-only check for the slim spike. No timing, no output files.
//
//   1. Slim agrees with the dynamic-programming reference at every slim
//      dispatch edge (2/3, 16/17, 32/33) and the blockwise word edges, in both
//      argument orders, for DNA, printable ASCII and full code-unit alphabets.
//   2. Calls are shuffled so consecutive calls land in different tiers; a
//      table entry left set by one tier would corrupt the next.
//   3. The shared table is zero again after every call, including calls
//      rejected for non-string input.
"use strict";

import { referenceDistance } from "../reference-distance.js";
import { distance, peq } from "./core/index.js";

const LENGTHS = [0, 1, 2, 3, 4, 8, 15, 16, 17, 18, 24, 31, 32, 33, 34, 63, 64, 65, 96, 128, 129, 300];

const ALPHABETS = {
  dna: [..."ACGT"].map((c) => c.charCodeAt(0)),
  ascii: Array.from({ length: 95 }, (_, i) => 32 + i),
  codeUnit: [0, 1, 0x7f, 0x80, 0xff, 0x100, 0x3042, 0xd83d, 0xde00, 0xfffe, 0xffff]
};

let seed = 0x5eed1e55;
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
        for (let r = 0; r < 4; r++) cases.push([alphabetName, randomString(n, alphabet), randomString(m, alphabet)]);
      }
      const base = randomString(n, alphabet);
      cases.push([alphabetName, base, base]);
      cases.push([alphabetName, base, mutate(base, 1, alphabet)]);
      cases.push([alphabetName, base, mutate(base, 3, alphabet)]);
    }
  }

  // Fisher-Yates: interleave tiers so the shared table changes owners constantly.
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
      if (peq[unit] !== 0) throw new Error(`${label}: table left dirty at code unit ${unit}`);
    }
  }
}

function assertTableClear(label) {
  for (let unit = 0; unit < peq.length; unit++) {
    if (peq[unit] !== 0) throw new Error(`${label}: table dirty at code unit ${unit}`);
  }
}

const cases = buildCases();
let checked = 0;
assertTableClear("before first call");

for (const [alphabetName, a, b] of cases) {
  const expected = referenceDistance(a, b);
  for (const [x, y] of [[a, b], [b, a]]) {
    const label = `${alphabetName} n=${x.length} m=${y.length}`;
    const actual = distance(x, y);
    if (actual !== expected) throw new Error(`${label}: slim returned ${actual}, reference ${expected}`);
    assertUsedUnitsClear(x, y, label);
    checked++;
    if (checked % 256 === 0) assertTableClear(`after ${checked} calls`);
  }
}

// Rejected input must throw before any kernel touches the table.
for (const [x, y] of [["abc", 123], [null, "abc"], ["日本語", undefined], [["a"], "a"]]) {
  let threw = false;
  try { distance(x, y); } catch (error) { threw = error instanceof TypeError; }
  if (!threw) throw new Error(`non-string input ${String(x)}, ${String(y)} did not throw a TypeError`);
}
assertTableClear("after last call and rejected input");

console.log(`Slim spike verification passed: ${checked} calls, one 64K-entry table (256 KiB). No timing was performed.`);
