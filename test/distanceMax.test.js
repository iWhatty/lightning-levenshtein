import { distanceMax } from "../src/index.js";

function referenceDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const previous = row[j];
      row[j] = a[i - 1] === b[j - 1]
        ? diagonal
        : Math.min(diagonal, row[j], row[j - 1]) + 1;
      diagonal = previous;
    }
  }

  return row[b.length];
}

function binaryStrings(maxLength) {
  const strings = [""];

  for (let length = 1; length <= maxLength; length++) {
    for (let mask = 0; mask < 2 ** length; mask++) {
      let value = "";
      for (let bit = 0; bit < length; bit++) {
        value += (mask >> bit) & 1 ? "b" : "a";
      }
      strings.push(value);
    }
  }

  return strings;
}

test("returns the exact distance within the threshold and a larger value outside it", () => {
  const strings = binaryStrings(5);

  for (const a of strings) {
    for (const b of strings) {
      const expected = referenceDistance(a, b);

      for (let maxDistance = 0; maxDistance <= 5; maxDistance++) {
        const actual = distanceMax(a, b, maxDistance);

        if (expected <= maxDistance) {
          expect(actual).toBe(expected);
        } else {
          expect(actual).toBeGreaterThan(maxDistance);
        }
      }
    }
  }
});

test("preserves the bounded-distance contract across kernel boundaries", () => {
  for (const length of [31, 32, 33, 63, 64, 65, 96, 97, 128]) {
    const a = "a".repeat(length);
    const b = `${a.slice(0, -1)}b`;

    expect(distanceMax(a, b, 1)).toBe(1);
    expect(distanceMax(a, b, 0)).toBeGreaterThan(0);
  }
});

test("supports a fractional threshold", () => {
  expect(distanceMax("abcdefghij", "abcdefxhij", 0.25)).toBe(1);
  expect(distanceMax("abcdefghij", "abcxxxxxxx", 0.25)).toBeGreaterThan(3);
});
