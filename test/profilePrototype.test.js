import { createProfileDistance } from "../bench/text-profile-spike/create-profile-distance.js";

const boundaries = [0, 1, 2, 3, 31, 32, 33, 63, 64, 65, 96, 128, 257];

test("every prototype profile matches the reference across stable dispatch boundaries", () => {
  const cases = [
    ["ascii", "AZaz09\u007f"],
    ["latin1", "AZaz09\u00c0\u00e9\u00ff"],
    ["codeUnit", "AZ\u0100\u4f60\uffff"]
  ];

  for (const [profile, alphabet] of cases) {
    for (const outOfRange of ["throw", "assume-valid"]) {
      const distance = createProfileDistance({ profile, outOfRange });
      for (const length of boundaries) {
        const a = patternedString(length, alphabet, 0);
        const b = patternedString(Math.max(0, length - 3), alphabet, 2);
        expect(distance(a, b)).toBe(referenceDistance(a, b));
        expect(distance(b, a)).toBe(referenceDistance(b, a));
      }
    }
  }
});

test("throw policy rejects the first out-of-profile code unit before dispatch", () => {
  const ascii = createProfileDistance({ profile: "ascii", outOfRange: "throw" });
  const latin1 = createProfileDistance({ profile: "latin1", outOfRange: "throw" });

  expect(() => ascii("same\u0080", "same\u0080")).toThrow(RangeError);
  expect(() => ascii("valid", "x\u0080y")).toThrow(/code unit 128 at index 1/);
  expect(() => latin1("x\u0100y", "valid")).toThrow(/code unit 256 at index 1/);
});

test("each profile accepts its maximum code unit at every stable tier", () => {
  const cases = [
    ["ascii", "\u007f"],
    ["latin1", "\u00ff"],
    ["codeUnit", "\uffff"]
  ];

  for (const [profile, symbol] of cases) {
    const distance = createProfileDistance({ profile, outOfRange: "throw" });
    for (const length of [32, 64, 65]) {
      const a = symbol.repeat(length);
      const b = `${symbol.repeat(length - 1)}A`;
      expect(distance(a, b)).toBe(1);
    }
  }
});

test("factory rejects unknown configuration values", () => {
  expect(() => createProfileDistance({ profile: "utf8" })).toThrow(TypeError);
  expect(() => createProfileDistance({ profile: "ascii", outOfRange: "fallback" })).toThrow(TypeError);
  expect(() => createProfileDistance()).toThrow(TypeError);
});

test("separate profile instances retain isolated mutable state", () => {
  const first = createProfileDistance({ profile: "ascii", outOfRange: "assume-valid" });
  const second = createProfileDistance({ profile: "ascii", outOfRange: "assume-valid" });
  const pairs = [
    ["A".repeat(32), "B".repeat(29)],
    ["ACGT".repeat(16), "AGGT".repeat(15)],
    ["N".repeat(257), "A".repeat(253)]
  ];

  for (const [a, b] of pairs) {
    expect(first(a, b)).toBe(referenceDistance(a, b));
    expect(second(b, a)).toBe(referenceDistance(b, a));
  }
});

function patternedString(length, alphabet, offset) {
  let value = "";
  for (let index = 0; index < length; index++) {
    value += alphabet[(index * 7 + offset) % alphabet.length];
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
