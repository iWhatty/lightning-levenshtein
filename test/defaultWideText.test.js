import { distance, distanceMax, closest } from "../src/index.js";
import {
  distance as distanceMin,
  distanceMax as distanceMaxMin,
  closest as closestMin
} from "../dist/lightning-levenshtein.min.js";
import { referenceDistance } from "../bench/reference-distance.js";

// The default API uses full-width UTF-16 code-unit tables at every length.
// Before that, a code unit above 255 never matched anything, itself included,
// so text outside Latin-1 got overstated distances and wrong closest matches.

const builds = [
  ["source", { distance, distanceMax, closest }],
  ["min", { distance: distanceMin, distanceMax: distanceMaxMin, closest: closestMin }]
];

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const alphabets = [
  ["Cyrillic", range(0x430, 0x44f)],
  ["CJK", range(0x4e00, 0x4e3f)],
  ["Latin Extended mix", [...range(97, 122), 0x141, 0x142, 0x15a, 0x17a, 0x105, 0x119]],
  ["surrogates", [0xd83d, 0xde00, 0xde01, 0xd83c, 0xdf89, 0x61, 0x62]],
  ["table edges", [0, 0xff, 0x100, 0x101, 0xfffe, 0xffff]]
];

// Both sides of each default dispatch edge.
const lengths = [1, 2, 5, 16, 31, 32, 33, 34, 63, 64, 65, 66, 130];

function createRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomString(random, length, alphabet) {
  const units = [];
  for (let i = 0; i < length; i++) units.push(alphabet[(random() * alphabet.length) | 0]);
  return String.fromCharCode(...units);
}

function substitute(random, value, edits, alphabet) {
  const units = Array.from(value, (c) => c.charCodeAt(0));
  for (let e = 0; e < edits; e++) {
    units[(random() * units.length) | 0] = alphabet[(random() * alphabet.length) | 0];
  }
  return String.fromCharCode(...units);
}

describe.each(builds)("default API on text outside Latin-1 (%s)", (_, api) => {
  test("gives the documented examples", () => {
    expect(api.distance("привет", "привед")).toBe(1);
    expect(api.distance("日本語", "日本人")).toBe(1);
    expect(api.distance("😀a", "😀b")).toBe(1);
    expect(api.distanceMax("日本語", "日本人", 2)).toBe(1);
    expect(api.closest("привет", ["zzzzzz", "привед"])).toBe("привед");
    expect(api.closest("日本語", ["abc", "日本人"])).toBe("日本人");
  });

  test.each(alphabets)("distance and distanceMax match the reference for %s", (name, alphabet) => {
    const random = createRandom(0xbeef + name.length);
    for (const length of lengths) {
      const base = randomString(random, length, alphabet);
      const partners = [
        randomString(random, length, alphabet),
        randomString(random, Math.max(1, length - 1), alphabet),
        substitute(random, base, 1, alphabet),
        substitute(random, base, 3, alphabet)
      ];
      for (const other of partners) {
        const expected = referenceDistance(base, other);
        expect(api.distance(base, other)).toBe(expected);
        expect(api.distance(other, base)).toBe(expected);
        expect(api.distanceMax(base, other)).toBe(expected);
        expect(api.distanceMax(base, other, expected)).toBe(expected);
        if (expected > 0) {
          expect(api.distanceMax(base, other, expected - 1)).toBeGreaterThan(expected - 1);
        }
      }
    }
  });

  test.each(alphabets)("closest picks the reference winner for %s", (name, alphabet) => {
    const random = createRandom(0xcafe + name.length);
    for (const length of lengths.filter((n) => n > 4)) {
      const query = randomString(random, length, alphabet);
      const candidates = [
        randomString(random, length, alphabet),
        substitute(random, query, 4, alphabet),
        substitute(random, query, 2, alphabet),
        randomString(random, length - 1, alphabet)
      ];
      let expected = null;
      let best = Infinity;
      for (const candidate of candidates) {
        const d = referenceDistance(query, candidate);
        if (d < best) {
          best = d;
          expected = candidate;
        }
      }
      expect(api.closest(query, candidates)).toBe(expected);
    }
  });
});
