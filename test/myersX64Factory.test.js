import { createMyersX64 } from "../src/myers_x64_factory.js";
import { myers_x64 } from "../src/myers_x64.js";

const lengths = [65, 96, 127, 128, 191, 256, 513];

test("bound two-lane kernels match the reference across long-input tiers", () => {
  const profiles = [
    { width: 128, alphabet: "ACGTN" },
    { width: 256, alphabet: "Aaz\u00ff" },
    { width: 65536, alphabet: "A\u0100\u4f60\uffff" }
  ];

  for (const { width, alphabet } of profiles) {
    const distance = createMyersX64(
      new Uint32Array(width),
      new Uint32Array(width)
    );

    for (const length of lengths) {
      const a = patternedString(length, alphabet, 0);
      const b = patternedString(length - 3, alphabet, 1);
      expect(distance(a, b)).toBe(referenceDistance(a, b));
    }
  }
});

test("factory instances retain isolated PEQ and scratch state", () => {
  const peqA0 = new Uint32Array(128);
  const peqA1 = new Uint32Array(128);
  const peqB0 = new Uint32Array(128);
  const peqB1 = new Uint32Array(128);
  const distanceA = createMyersX64(peqA0, peqA1);
  const distanceB = createMyersX64(peqB0, peqB1);

  const cases = [
    ["A".repeat(129), "A".repeat(128)],
    ["ACGT".repeat(80), "AGGT".repeat(79)],
    ["N".repeat(513), "A".repeat(509)]
  ];

  for (const [a, b] of cases) {
    expect(distanceA(a, b)).toBe(referenceDistance(a, b));
    expect(distanceB(b, a)).toBe(referenceDistance(b, a));
  }

  expect(peqA0.every((value) => value === 0)).toBe(true);
  expect(peqA1.every((value) => value === 0)).toBe(true);
  expect(peqB0.every((value) => value === 0)).toBe(true);
  expect(peqB1.every((value) => value === 0)).toBe(true);
});

test("the legacy stable export remains correct", () => {
  const a = patternedString(700, "ABCxyz09", 0);
  const b = patternedString(637, "ABCxyz09", 2);
  expect(myers_x64(a, b)).toBe(referenceDistance(a, b));
});

function patternedString(length, alphabet, offset) {
  let value = "";
  for (let i = 0; i < length; i++) {
    value += alphabet[(i * 7 + offset) % alphabet.length];
  }
  return value;
}

function referenceDistance(a, b) {
  if (a.length > b.length) [a, b] = [b, a];
  const row = Array.from({ length: a.length + 1 }, (_, index) => index);

  for (let i = 1; i <= b.length; i++) {
    let previous = i;
    for (let j = 1; j <= a.length; j++) {
      const diagonal = row[j - 1];
      const cost = a.charCodeAt(j - 1) === b.charCodeAt(i - 1) ? 0 : 1;
      row[j - 1] = previous;
      previous = Math.min(row[j] + 1, previous + 1, diagonal + cost);
    }
    row[a.length] = previous;
  }

  return row[a.length];
}
