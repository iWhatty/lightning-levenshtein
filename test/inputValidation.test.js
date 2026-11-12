import { distance, distanceMax, closest } from "../src/index.js";
import {
  distance as distanceMin,
  distanceMax as distanceMaxMin,
  closest as closestMin
} from "../dist/lightning-levenshtein.min.js";
import { distanceUnicode } from "../src/unicode.js";
import { distanceUnicode as distanceUnicodeMin } from "../dist/lightning-levenshtein-unicode.min.js";
import { levenshteinLightning } from "../src/v2/index.js";
import { levenshteinLightning as levenshteinLightningMin } from "../dist/lightning-levenshtein-v2.min.js";
import { createDistance } from "../src/profiles.js";
import { createDistance as createDistanceMin } from "../dist/lightning-levenshtein-profiles.min.js";

// Kernels write into shared PEQ tables and clear them on return. Before the
// entry-point guards, a call that threw midway left those tables dirty and
// every later call could return a wrong distance for the rest of the process.

const twoArgument = [
  ["distance", distance],
  ["distance/min", distanceMin],
  ["distanceMax", distanceMax],
  ["distanceMax/min", distanceMaxMin],
  ["unicode", distanceUnicode],
  ["unicode/min", distanceUnicodeMin],
  ["v2", levenshteinLightning],
  ["v2/min", levenshteinLightningMin],
  ["profiles ascii", createDistance({ profile: "ascii" })],
  ["profiles/min ascii", createDistanceMin({ profile: "ascii" })],
  ["profiles latin1 assume-valid", createDistance({ profile: "latin1", outOfRange: "assume-valid" })],
  ["profiles/min latin1 assume-valid", createDistanceMin({ profile: "latin1", outOfRange: "assume-valid" })],
  ["profiles codeUnit", createDistance({ profile: "codeUnit" })],
  ["profiles/min codeUnit", createDistanceMin({ profile: "codeUnit" })]
];

// One pattern per dispatch family, so a dirty table in any tier is visible.
const patternLengths = [4, 40, 70, 100, 130, 240, 300, 600];

const nonStrings = [
  ["number", 5],
  ["null", null],
  ["undefined", undefined],
  ["array", ["a", "b", "c"]],
  ["boxed String", new String("abcd")],
  ["string-like without charCodeAt", { length: 3 }],
  [
    "string-like whose charCodeAt throws",
    { length: 3, charCodeAt() { throw new Error("charCodeAt failed"); } }
  ]
];

function expectHealthy(fn) {
  for (const length of patternLengths) {
    const pattern = "abcd".repeat(length / 4).slice(0, length);
    const disjoint = "z".repeat(length);
    expect(fn(disjoint, pattern)).toBe(length);
    expect(fn(pattern, disjoint)).toBe(length);
    expect(fn(pattern, pattern.slice(0, -1) + "x")).toBe(1);
  }
}

describe.each(twoArgument)("%s", (_, fn) => {
  test.each(nonStrings)("rejects a %s argument in either position", (__, value) => {
    for (const length of patternLengths) {
      const pattern = "abcd".repeat(length / 4).slice(0, length);
      expect(() => fn(pattern, value)).toThrow(TypeError);
      expect(() => fn(value, pattern)).toThrow(TypeError);
    }
    expect(() => fn(value, value)).toThrow(TypeError);
  });

  test("returns correct distances after rejected calls", () => {
    for (const [, value] of nonStrings) {
      for (const length of patternLengths) {
        const pattern = "abcd".repeat(length / 4).slice(0, length);
        expect(() => fn(pattern, value)).toThrow(TypeError);
        expect(() => fn(value, pattern)).toThrow(TypeError);
      }
    }
    expectHealthy(fn);
  });
});

describe.each([
  ["distanceMax", distanceMax, distance],
  ["distanceMax/min", distanceMaxMin, distanceMin]
])("%s threshold", (_, max, plain) => {
  test("rejects BigInt and Symbol thresholds without corrupting later calls", () => {
    for (const length of patternLengths) {
      const pattern = "abcd".repeat(length / 4).slice(0, length);
      const other = pattern.slice(0, -2) + "xy";
      expect(() => max(pattern, other, 5n)).toThrow(TypeError);
      expect(() => max(pattern, other, Symbol("limit"))).toThrow(TypeError);
    }
    expectHealthy(max);
    expectHealthy(plain);
  });

  test("keeps numeric threshold behavior", () => {
    expect(max("kitten", "sitting", 3)).toBe(3);
    expect(max("kitten", "sitting", 1)).toBeGreaterThan(1);
    expect(max("abcd", "ab", 0.5)).toBe(2);
    expect(max("kitten", "sitting")).toBe(3);
    expect(max("kitten", "sitting", undefined)).toBe(3);
    expect(max("kitten", "sitting", null)).toBeGreaterThan(0);
  });
});

describe.each([
  ["closest", closest, distance],
  ["closest/min", closestMin, distanceMin]
])("%s", (_, nearest, plain) => {
  test("rejects non-string queries and candidates without corrupting later calls", () => {
    expect(() => nearest(5, ["abcd"])).toThrow(TypeError);
    expect(() => nearest("abcd", ["abxd", { length: 3 }])).toThrow(TypeError);
    expect(() => nearest("abcd", ["abxd", null])).toThrow(TypeError);
    expect(() => nearest("abcd", ["abxd"], 2n)).toThrow(TypeError);

    expect(nearest("abcd", ["zzzz", "abxd"])).toBe("abxd");
    expect(nearest("zzzz", ["abcd"], 3)).toBeNull();
    expectHealthy(plain);
  });
});
