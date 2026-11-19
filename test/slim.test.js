// Protects the /slim entry: every tier shares one full-width PEQ table, so a
// wrong answer at a dispatch edge or a table entry left set by one tier would
// corrupt later calls in every other tier.
import { referenceDistance } from "../bench/reference-distance.js";
import { distanceSlim } from "../src/slim.js";
import { distanceSlim as distanceSlimMin } from "../dist/lightning-levenshtein-slim.min.js";
import { peq } from "../src/myers_32_unrolled16.js";

// The 2/3, 16/17 and 32/33 dispatch edges plus blockwise word edges.
const LENGTHS = [0, 1, 2, 3, 4, 8, 15, 16, 17, 18, 24, 31, 32, 33, 34, 63, 64, 65, 96, 128, 129, 300];

const ALPHABETS = {
  dna: [..."ACGT"].map((c) => c.charCodeAt(0)),
  ascii: Array.from({ length: 95 }, (_, i) => 32 + i),
  codeUnit: [0, 1, 0x7f, 0x80, 0xff, 0x100, 0x3042, 0xd83d, 0xde00, 0xfffe, 0xffff]
};

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildCases() {
  const random = mulberry32(0x5eed1e55);
  const pick = (alphabet) => alphabet[(random() * alphabet.length) | 0];
  const string = (length, alphabet) => String.fromCharCode(...Array.from({ length }, () => pick(alphabet)));
  const mutate = (value, alphabet) => {
    const units = Array.from(value, (c) => c.charCodeAt(0));
    const at = (random() * (units.length + 1)) | 0;
    const kind = (random() * 3) | 0;
    const index = Math.min(at, units.length - 1);
    if (kind === 0) units.splice(at, 0, pick(alphabet)); // insertion
    else if (units.length > 0 && kind === 1) units.splice(index, 1); // deletion
    else if (units.length > 0) units[index] = pick(alphabet); // substitution
    return String.fromCharCode(...units);
  };

  const cases = [];
  for (const [name, alphabet] of Object.entries(ALPHABETS)) {
    for (const n of LENGTHS) {
      for (const m of new Set([n, Math.max(0, n - 1), n >> 1, Math.min(n, 1)])) {
        cases.push([name, string(n, alphabet), string(m, alphabet)]);
        cases.push([name, string(n, alphabet), string(m, alphabet)]);
      }
      const base = string(n, alphabet);
      cases.push([name, base, mutate(base, alphabet)]);
    }
  }
  // Shuffle so consecutive calls land in different tiers of the shared table.
  for (let i = cases.length - 1; i > 0; i--) {
    const j = (random() * (i + 1)) | 0;
    [cases[i], cases[j]] = [cases[j], cases[i]];
  }
  return cases;
}

const CASES = buildCases();

describe.each([
  ["slim", distanceSlim],
  ["slim/min", distanceSlimMin]
])("%s", (_, distance) => {
  test("matches the reference at every dispatch edge, in both argument orders", () => {
    for (const [name, a, b] of CASES) {
      const expected = referenceDistance(a, b);
      expect([name, a.length, b.length, distance(a, b)]).toEqual([name, a.length, b.length, expected]);
      expect([name, b.length, a.length, distance(b, a)]).toEqual([name, b.length, a.length, expected]);
    }
  });

  test("counts code units the default entry's 256-entry table cannot", () => {
    expect(distance("日本語", "日本人")).toBe(1);
    expect(distance("привет", "привед")).toBe(1);
    expect(distance("😀a", "a😀")).toBe(referenceDistance("😀a", "a😀"));
  });
});

test("the shared table is clear after every source-entry call", () => {
  for (const [, a, b] of CASES) {
    distanceSlim(a, b);
    for (const value of [a, b]) {
      for (let i = 0; i < value.length; i++) {
        expect(peq[value.charCodeAt(i)]).toBe(0);
      }
    }
  }
  expect(peq.every((entry) => entry === 0)).toBe(true);
});
