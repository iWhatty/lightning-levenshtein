import { distance } from "../src/index.js";
import { distanceUnicode } from "../src/unicode.js";

const levenshtein = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  if (a.length > b.length) {
    const t = a;
    a = b;
    b = t;
  }

  const row = [];
  for (let i = 0; i <= a.length; i++) {
    row[i] = i;
  }

  for (let i = 1; i <= b.length; i++) {
    let prev = i;
    for (let j = 1; j <= a.length; j++) {
      const val = b.charCodeAt(i - 1) === a.charCodeAt(j - 1)
        ? row[j - 1]
        : Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);

      row[j - 1] = prev;
      prev = val;
    }
    row[a.length] = prev;
  }

  return row[a.length];
};

test("distanceUnicode handles BMP code units below 33 chars", () => {
  const cases = [
    ["Āa", "Āb"],
    ["你a", "你b"],
    ["你a", "他a"],
    ["ĀĂĄĆ", "ĀĂZZ"],
  ];

  for (const [a, b] of cases) {
    expect(distanceUnicode(a, b)).toBe(levenshtein(a, b));
  }
});

test("distanceUnicode handles BMP code units between 33 and 64 chars", () => {
  const a = "你".repeat(40);
  const b = "你".repeat(39) + "他";

  expect(distanceUnicode(a, b)).toBe(1);
  expect(distanceUnicode(a, b)).toBe(levenshtein(a, b));
});

test("distanceUnicode handles BMP code units above 64 chars", () => {
  const a = "Ā".repeat(70);
  const b = "Ā".repeat(69) + "Ă";

  expect(distanceUnicode(a, b)).toBe(1);
  expect(distanceUnicode(a, b)).toBe(levenshtein(a, b));
});

test("default distance remains the low-memory path for wide code units", () => {
  expect(distance("你a", "你b")).not.toBe(levenshtein("你a", "你b"));
  expect(distanceUnicode("你a", "你b")).toBe(levenshtein("你a", "你b"));
});
