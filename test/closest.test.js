
/// test\closest.test.js
import { closest, distance } from "../dist/lightning-levenshtein.min.js";


const levenshtein = (a, b) => {
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }

  if (a.length > b.length) {
    const tmp = a;
    a = b;
    b = tmp;
  }

  const row = [];
  for (let i = 0; i <= a.length; i++) {
    row[i] = i;
  }

  for (let i = 1; i <= b.length; i++) {
    let prev = i;
    for (let j = 1; j <= a.length; j++) {
      let val = 0;
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[a.length] = prev;
  }

  return row[a.length];
};

const makeid = (length) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

test("test compare", () => {
  for (let i = 0; i < 100; i++) {
    const rnd_num1 = (Math.random() * 1000) | 0;
    const rnd_num2 = (Math.random() * 1000) | 0;
    const rnd_string1 = makeid(rnd_num1);
    const rnd_string2 = makeid(rnd_num2);
    const actual = distance(rnd_string1, rnd_string2);
    const expected = levenshtein(rnd_string1, rnd_string2);
    expect(actual).toBe(expected);
  }
});

test("test find", () => {
  const actual = closest("fast", ["slow", "faster", "fastest"]);
  const expected = "faster";
  expect(actual).toBe(expected);
});

test("returns exact match if available", () => {
  const actual = closest("fast", ["fast", "faster", "fastest"]);
  expect(actual).toBe("fast");
});

test("returns the closest by edit distance", () => {
  const actual = closest("fast", ["slow", "faster", "fastest"]);
  expect(actual).toBe("faster");
});

test("prefers shorter strings in case of tie", () => {
  const actual = closest("cat", ["cut", "cart"]);
  expect(actual).toBe("cut"); // both 1 edit away, but "cut" is shorter
});

test("handles completely unrelated strings", () => {
  const actual = closest("apple", ["banana", "carrot", "grape"]);
  expect(actual).toBe("grape"); // fewer edits than banana/carrot
});

test("handles empty list", () => {
  const actual = closest("hello", []);
  expect(actual).toBeNull();
});

test("returns first match on tie", () => {
  const actual = closest("book", ["cook", "nook", "look"]);
  expect(actual).toBe("cook");
});

test("handles case sensitivity", () => {
  const actual = closest("Fast", ["fast", "FAST", "FaSt"]);
  expect(actual).toBe("fast"); // or normalize input if needed
});

test("works with unicode characters", () => {
  const actual = closest("café", ["cafe", "caff", "cafeteria"]);
  expect(actual).toBe("cafe");
});

test("returns input itself if it's the only string", () => {
  const actual = closest("needle", ["needle"]);
  expect(actual).toBe("needle");
});

test("finds closest match at the end", () => {
  const actual = closest("code", ["road", "mode", "code"]);
  expect(actual).toBe("code");
});

test("respects maxDistance cutoff", () => {
  const actual = closest("hello", ["hellooooo", "hell", "hola"], 2);
  expect(actual).toBe("hell"); // Only "hell" is within 2 edits
});

test("resolves tie with common prefix", () => {
  const actual = closest("abc", ["adc", "abcde"]);
  expect(actual).toBe("adc"); // Same distance, but shorter string
});

test("handles empty target string", () => {
  const actual = closest("", ["a", "ab", "abc"]);
  expect(actual).toBe("a");
});

test("handles long string input", () => {
  const a = makeid(1000);
  const b = a.slice(0, 999) + "x"; // 1 char diff
  const actual = distance(a, b);
  expect(actual).toBe(1);
});

test("boundary lengths compare against reference", () => {
  const lengths = [0, 1, 2, 3, 4, 5, 31, 32, 33, 63, 64, 65, 127];

  for (const la of lengths) {
    for (const lb of lengths) {
      const a = makeid(la);
      const b = makeid(lb);
      expect(distance(a, b)).toBe(levenshtein(a, b));
    }
  }
});

function replaceAt(str, idx, ch) {
  return str.slice(0, idx) + ch + str.slice(idx + 1);
}

function insertAt(str, idx, ch) {
  return str.slice(0, idx) + ch + str.slice(idx);
}

function deleteAt(str, idx) {
  return str.slice(0, idx) + str.slice(idx + 1);
}

test("single edit mutations return 1", () => {
  for (const len of [1, 2, 3, 4, 5, 31, 32, 33, 63, 64, 65]) {
    const a = makeid(len);

    if (len > 0) {
      const sub = replaceAt(a, len - 1, a[len - 1] === "x" ? "y" : "x");
      expect(distance(a, sub)).toBe(1);

      const del = deleteAt(a, len - 1);
      expect(distance(a, del)).toBe(1);
    }

    const ins = insertAt(a, len, "z");
    expect(distance(a, ins)).toBe(1);
  }
});

test("repeated character cases", () => {
  const cases = [
    ["aaaaa", "aaaaa", 0],
    ["aaaaa", "aaaab", 1],
    ["aaaaa", "bbbbb", 5],
    ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab", 1],
    ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab", 1],
  ];

  for (const [a, b, expected] of cases) {
    expect(distance(a, b)).toBe(expected);
  }
});

test("random compare against reference", () => {
  const lengths = [0, 1, 2, 3, 4, 5, 31, 32, 33, 63, 64, 65, 100, 250];

  for (let i = 0; i < 2000; i++) {
    const la = lengths[(Math.random() * lengths.length) | 0];
    const lb = lengths[(Math.random() * lengths.length) | 0];
    const a = makeid(la);
    const b = makeid(lb);

    expect(distance(a, b)).toBe(levenshtein(a, b));
  }
});



test("prefix and suffix heavy cases", () => {
  const cases = [
    ["testing", "testings", 1],
    ["testing", "esting", 1],
    ["abcdefxyz", "abcdef123", 3],
    ["xyzabcdef", "123abcdef", 3],
    ["aaaaaaaaab", "baaaaaaaaa", 2],
  ];

  for (const [a, b, expected] of cases) {
    expect(distance(a, b)).toBe(expected);
  }
});

test("distance is symmetric", () => {
  const lengths = [0, 1, 2, 3, 4, 5, 31, 32, 33, 63, 64, 65, 100];

  for (let i = 0; i < 1000; i++) {
    const la = lengths[(Math.random() * lengths.length) | 0];
    const lb = lengths[(Math.random() * lengths.length) | 0];
    const a = makeid(la);
    const b = makeid(lb);

    expect(distance(a, b)).toBe(distance(b, a));
  }
});

test("extended boundary lengths compare against reference", () => {
  const lengths = [0, 1, 2, 3, 4, 5, 31, 32, 33, 63, 64, 65, 95, 96, 97, 127, 128];

  for (const la of lengths) {
    for (const lb of lengths) {
      const a = makeid(la);
      const b = makeid(lb);
      expect(distance(a, b)).toBe(levenshtein(a, b));
    }
  }
});

test("word-boundary single edits return 1", () => {
  const cases = [
    { len: 33, idxs: [31, 32] },
    { len: 64, idxs: [31, 32, 63] },
    { len: 65, idxs: [31, 32, 63, 64] },
    { len: 96, idxs: [31, 32, 63, 64, 95] },
    { len: 97, idxs: [31, 32, 63, 64, 95, 96] },
    { len: 128, idxs: [31, 32, 63, 64, 95, 96, 127] },
  ];

  for (const { len, idxs } of cases) {
    const base = "a".repeat(len);

    for (const idx of idxs) {
      const sub = replaceAt(base, idx, "b");
      expect(distance(base, sub)).toBe(1);

      const del = deleteAt(base, idx);
      expect(distance(base, del)).toBe(1);

      const ins = insertAt(base, idx, "b");
      expect(distance(base, ins)).toBe(1);
    }
  }
});


test("repeated character boundary stress cases", () => {
  const cases = [
    ["a".repeat(64), "a".repeat(63) + "b", 1],
    ["a".repeat(64), "b" + "a".repeat(63), 1],
    ["a".repeat(64), "a".repeat(32) + "b" + "a".repeat(31), 1],

    ["a".repeat(96), "a".repeat(95) + "b", 1],
    ["a".repeat(96), "b" + "a".repeat(95), 1],
    ["a".repeat(96), "a".repeat(64) + "b" + "a".repeat(31), 1],

    ["a".repeat(128), "a".repeat(127) + "b", 1],
    ["a".repeat(128), "b" + "a".repeat(127), 1],
    ["a".repeat(128), "a".repeat(96) + "b" + "a".repeat(31), 1],

    ["a".repeat(64), "b".repeat(64), 64],
    ["a".repeat(96), "b".repeat(96), 96],
    ["a".repeat(128), "b".repeat(128), 128],
  ];

  for (const [a, b, expected] of cases) {
    expect(distance(a, b)).toBe(expected);
  }
});


function makeidFromAlphabet(length, alphabet = "ab") {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt((Math.random() * alphabet.length) | 0);
  }
  return result;
}

test("tiny alphabet random compare near tier edges", () => {
  const lengths = [33, 64, 65, 96, 97, 128];

  for (let i = 0; i < 5000; i++) {
    const la = lengths[(Math.random() * lengths.length) | 0];
    const lb = lengths[(Math.random() * lengths.length) | 0];

    const a = makeidFromAlphabet(la, "ab");
    const b = makeidFromAlphabet(lb, "ab");

    expect(distance(a, b)).toBe(levenshtein(a, b));
  }
});


test("boundary-crossing prefix suffix scaffolds", () => {
  const cases = [
    [
      "a".repeat(31) + "bbbb" + "a".repeat(29),
      "a".repeat(31) + "bbcb" + "a".repeat(29),
      1,
    ],
    [
      "a".repeat(63) + "bbbb" + "a".repeat(29),
      "a".repeat(63) + "bbcb" + "a".repeat(29),
      1,
    ],
    [
      "a".repeat(95) + "bbbb" + "a".repeat(29),
      "a".repeat(95) + "bbcb" + "a".repeat(29),
      1,
    ],
    [
      "a".repeat(31) + "bbbb" + "a".repeat(29),
      "a".repeat(31) + "bbb" + "a".repeat(29),
      1,
    ],
    [
      "a".repeat(63) + "bbbb" + "a".repeat(29),
      "a".repeat(63) + "bbb" + "a".repeat(29),
      1,
    ],
    [
      "a".repeat(95) + "bbbb" + "a".repeat(29),
      "a".repeat(95) + "bbb" + "a".repeat(29),
      1,
    ],
  ];

  for (const [a, b, expected] of cases) {
    expect(distance(a, b)).toBe(expected);
    expect(distance(b, a)).toBe(expected);
  }
});


test("100 and 128 length random compare against reference", () => {
  const lengths = [100, 127, 128];

  for (let i = 0; i < 3000; i++) {
    const la = lengths[(Math.random() * lengths.length) | 0];
    const lb = lengths[(Math.random() * lengths.length) | 0];

    const a = makeidFromAlphabet(la, "abc");
    const b = makeidFromAlphabet(lb, "abc");

    expect(distance(a, b)).toBe(levenshtein(a, b));
  }
});

test("tier-edge adversarial cases", () => {
  const lengths = [33, 64, 65, 96, 97, 128];
  const idxs = [31, 32, 63, 64, 95, 96, 127];

  for (const len of lengths) {
    const base = "a".repeat(len);

    for (const idx of idxs) {
      if (idx >= len) continue;

      expect(distance(base, replaceAt(base, idx, "b"))).toBe(1);
      expect(distance(base, deleteAt(base, idx))).toBe(1);
      expect(distance(base, insertAt(base, idx, "b"))).toBe(1);
    }

    const alt = base.split("").map((_, i) => (i & 1 ? "a" : "b")).join("");
    expect(distance(base, alt)).toBe(levenshtein(base, alt));
  }
});
