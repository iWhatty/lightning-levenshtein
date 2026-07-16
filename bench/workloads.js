import { mulberry32, randomString } from "./data.js";

export const WORKLOAD_FAMILIES = Object.freeze({
  "random-ascii": Object.freeze({
    domain: "ascii",
    description: "Independent equal-length strings drawn from printable keyboard-oriented ASCII.",
  }),
  "exact-one-edit": Object.freeze({
    domain: "ascii",
    description: "Equal strings alternating with one deterministic substitution, insertion, or deletion.",
  }),
  "shared-affixes": Object.freeze({
    domain: "ascii",
    description: "Equal-length strings sharing deterministic prefix and suffix regions around independent middles.",
  }),
  "unequal-length": Object.freeze({
    domain: "ascii",
    description: "Random ASCII pairs whose lengths differ by roughly one quarter, with direction alternating.",
  }),
  "tiny-alphabet": Object.freeze({
    domain: "ascii",
    description: "Equal-length strings drawn from the repeated two-symbol alphabet a/b.",
  }),
  latin1: Object.freeze({
    domain: "latin1",
    description: "Equal-length strings drawn from ASCII plus selected Latin-1 code units up through 255.",
  }),
  "bmp-code-units": Object.freeze({
    domain: "bmp",
    description: "Equal-length strings containing non-surrogate BMP code units above 255.",
  }),
});

const ASCII = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'-_ ";
const LATIN1 = `${ASCII}\u00a1\u00bf\u00c0\u00d1\u00d8\u00df\u00e9\u00f8\u00ff`;
const BMP = `ABCxyz\u0100\u017d\u03a9\u0416\u4f60\u754c\uffff`;

export function buildWorkloadPairs({ family, count, length, seed }) {
  if (!WORKLOAD_FAMILIES[family]) throw new TypeError(`unknown workload family: ${family}`);
  if (!Number.isInteger(count) || count < 1) throw new TypeError("count must be a positive integer");
  if (!Number.isInteger(length) || length < 0) throw new TypeError("length must be a non-negative integer");
  if (!Number.isInteger(seed)) throw new TypeError("seed must be an integer");

  const random = mulberry32(seed);
  switch (family) {
    case "random-ascii": return randomPairs(count, length, length, random, ASCII);
    case "exact-one-edit": return exactAndOneEditPairs(count, length, random);
    case "shared-affixes": return sharedAffixPairs(count, length, random);
    case "unequal-length": return unequalLengthPairs(count, length, random);
    case "tiny-alphabet": return randomPairs(count, length, length, random, "ab");
    case "latin1": return randomPairs(count, length, length, random, LATIN1);
    case "bmp-code-units": return randomPairs(count, length, length, random, BMP);
  }
}

function randomPairs(count, lengthA, lengthB, random, alphabet) {
  return Array.from({ length: count }, () => [
    randomString(lengthA, random, alphabet),
    randomString(lengthB, random, alphabet),
  ]);
}

function exactAndOneEditPairs(count, length, random) {
  const pairs = new Array(count);
  for (let i = 0; i < count; i++) {
    const base = randomString(length, random, ASCII);
    const mode = i & 3;
    if (mode === 0) {
      pairs[i] = [base, base];
      continue;
    }

    const position = length === 0 ? 0 : Math.floor(random() * length);
    if (mode === 1 && length > 0) {
      const replacement = base.charAt(position) === "~" ? "!" : "~";
      pairs[i] = [base, `${base.slice(0, position)}${replacement}${base.slice(position + 1)}`];
    } else if (mode === 2) {
      pairs[i] = [base, `${base.slice(0, position)}~${base.slice(position)}`];
    } else if (length > 0) {
      pairs[i] = [base, `${base.slice(0, position)}${base.slice(position + 1)}`];
    } else {
      pairs[i] = [base, "~"];
    }
  }
  return pairs;
}

function sharedAffixPairs(count, length, random) {
  const prefixLength = Math.floor(length * 0.4);
  const suffixLength = Math.floor(length * 0.4);
  const middleLength = length - prefixLength - suffixLength;
  const pairs = new Array(count);
  for (let i = 0; i < count; i++) {
    const prefix = randomString(prefixLength, random, ASCII);
    const suffix = randomString(suffixLength, random, ASCII);
    const middleA = randomString(middleLength, random, ASCII);
    let middleB = randomString(middleLength, random, ASCII);
    if (middleLength > 0 && middleA === middleB) {
      middleB = `${middleB.slice(0, -1)}~`;
    }
    pairs[i] = [`${prefix}${middleA}${suffix}`, `${prefix}${middleB}${suffix}`];
  }
  return pairs;
}

function unequalLengthPairs(count, length, random) {
  const shorterLength = Math.max(0, length - Math.max(1, Math.floor(length / 4)));
  const pairs = randomPairs(count, length, shorterLength, random, ASCII);
  for (let i = 1; i < pairs.length; i += 2) pairs[i].reverse();
  return pairs;
}
