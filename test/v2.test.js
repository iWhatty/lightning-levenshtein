import { levenshteinLightning } from "../src/v2/index.js";
import { levenshteinLightning as levenshteinLightningMin } from "../dist/lightning-levenshtein-v2.min.js";

const implementations = [levenshteinLightning, levenshteinLightningMin];

function expectDistance(a, b, expected) {
  for (const implementation of implementations) {
    expect(implementation(a, b)).toBe(expected);
  }
}

function referenceDistance(a, b) {
  if (a.length > b.length) {
    const temporary = a;
    a = b;
    b = temporary;
  }

  const row = Array.from({ length: a.length + 1 }, (_, i) => i);

  for (let i = 1; i <= b.length; i++) {
    let diagonal = row[0];
    row[0] = i;

    for (let j = 1; j <= a.length; j++) {
      const previous = row[j];
      row[j] = b.charCodeAt(i - 1) === a.charCodeAt(j - 1)
        ? diagonal
        : Math.min(diagonal, row[j], row[j - 1]) + 1;
      diagonal = previous;
    }
  }

  return row[a.length];
}

function createRandom(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomString(length, random, alphabet = "abc") {
  let value = "";
  for (let i = 0; i < length; i++) {
    value += alphabet[(random() * alphabet.length) | 0];
  }
  return value;
}

test("matches the reference around short and fixed-width dispatch boundaries", () => {
  const random = createRandom(0x5eed1234);
  const lengths = [0, 1, 2, 3, 4, 31, 32, 33, 63, 64, 65, 95, 96, 97, 127, 128, 129];

  for (const lengthA of lengths) {
    for (const lengthB of lengths) {
      const a = randomString(lengthA, random);
      const b = randomString(lengthB, random);
      expectDistance(a, b, referenceDistance(a, b));
    }
  }
});

test("matches the reference across generalized and 256-character tiers", () => {
  const random = createRandom(0x256257);
  const longerLengths = [129, 223, 224, 225, 255, 256, 257, 511, 512, 513, 640];
  const shorterLengths = [1, 31, 32, 33, 63, 64, 65, 127];

  for (const lengthA of longerLengths) {
    for (const lengthB of shorterLengths) {
      const a = randomString(lengthA, random);
      const b = randomString(Math.min(lengthA, lengthB), random);
      const expected = referenceDistance(a, b);

      expectDistance(a, b, expected);
      expectDistance(b, a, expected);
    }
  }
});

test("handles single edits at every production dispatch edge", () => {
  const lengths = [1, 2, 3, 31, 32, 33, 63, 64, 65, 95, 96, 97, 127, 128, 129, 223, 224, 225, 255, 256, 257, 511, 512, 513];

  for (const length of lengths) {
    const base = "a".repeat(length);
    const middle = length >> 1;
    const substitution = `${base.slice(0, middle)}b${base.slice(middle + 1)}`;
    const deletion = `${base.slice(0, middle)}${base.slice(middle + 1)}`;
    const insertion = `${base.slice(0, middle)}b${base.slice(middle)}`;

    expectDistance(base, substitution, 1);
    expectDistance(base, deletion, 1);
    expectDistance(base, insertion, 1);
  }
});

test("matches the reference for adversarial repeated patterns in large tiers", () => {
  for (const length of [224, 225, 256, 257, 512, 513]) {
    const repeated = "a".repeat(length);
    const alternating = Array.from(
      { length },
      (_, i) => (i & 1 ? "a" : "b")
    ).join("");

    expectDistance(repeated, alternating, referenceDistance(repeated, alternating));
  }
});

test("matches seeded equal-length inputs in every nontrivial tier", () => {
  const random = createRandom(0xdecafbad);

  for (const length of [33, 64, 65, 96, 97, 128, 129, 224, 225, 256, 257, 512, 513]) {
    for (let iteration = 0; iteration < 4; iteration++) {
      const a = randomString(length, random, "abcd");
      const b = randomString(length, random, "abcd");
      expectDistance(a, b, referenceDistance(a, b));
    }
  }
});

test("uses full UTF-16 code-unit equality tables", () => {
  const cases = [
    ["你a", "你b"],
    ["Ā".repeat(64), `${"Ā".repeat(63)}Ă`],
    ["你".repeat(225), `${"你".repeat(224)}他`],
    ["😀alpha", "😃alpha"],
  ];

  for (const [a, b] of cases) {
    expectDistance(a, b, referenceDistance(a, b));
  }
});
