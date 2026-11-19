import {
  distance as distanceDefault,
  distanceMax as distanceMaxDefault
} from "../src/index.js";
import {
  distance as distanceDefaultMin,
  distanceMax as distanceMaxDefaultMin
} from "../dist/lightning-levenshtein.min.js";
import { distanceUnicode } from "../src/unicode.js";
import { distanceUnicode as distanceUnicodeMin } from "../dist/lightning-levenshtein-unicode.min.js";
import { levenshteinLightning } from "../src/v2/index.js";
import { levenshteinLightning as levenshteinLightningMin } from "../dist/lightning-levenshtein-v2.min.js";
import { createDistance } from "../src/profiles.js";
import { createDistance as createDistanceMin } from "../dist/lightning-levenshtein-profiles.min.js";
import { distanceSlim } from "../src/slim.js";
import { distanceSlim as distanceSlimMin } from "../dist/lightning-levenshtein-slim.min.js";

const implementations = [
  ["default", distanceDefault],
  ["default/min", distanceDefaultMin],
  ["default distanceMax", distanceMaxDefault],
  ["default/min distanceMax", distanceMaxDefaultMin],
  ["unicode", distanceUnicode],
  ["unicode/min", distanceUnicodeMin],
  ["v2", levenshteinLightning],
  ["v2/min", levenshteinLightningMin],
  ["profiles codeUnit", createDistance({ profile: "codeUnit" })],
  ["profiles/min codeUnit", createDistanceMin({ profile: "codeUnit" })],
  ["slim", distanceSlim],
  ["slim/min", distanceSlimMin]
];

test.each(implementations)("%s counts surrogate code units across dispatch boundaries", (_, distance) => {
  for (const length of [0, 14, 15, 16, 30, 31, 32, 62, 63, 64, 95, 127, 223, 255, 511, 512]) {
    const prefix = "a".repeat(length);
    const pair = `${prefix}\ud83d\ude00`;
    const unpaired = `${prefix}\ud83d`;

    expect(distance(pair, prefix)).toBe(2);
    expect(distance(prefix, pair)).toBe(2);
    expect(distance(pair, unpaired)).toBe(1);
    expect(distance(unpaired, pair)).toBe(1);
    expect(distance(pair, pair)).toBe(0);
  }
});

test.each(implementations)("%s does not normalize canonically equivalent text", (_, distance) => {
  expect(distance("\u00e9", "e\u0301")).toBe(2);
  expect(distance("e\u0301", "\u00e9")).toBe(2);
});

test.each(implementations)("%s preserves embedded NUL code units", (_, distance) => {
  expect(distance("a\u0000b", "ab")).toBe(1);
  expect(distance("a\u0000b", "a\u0000c")).toBe(1);
});
