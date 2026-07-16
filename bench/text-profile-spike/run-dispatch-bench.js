import { buildPairs, mean } from "../data.js";
import { distance } from "../../src/distance.js";
import { distanceUnicode } from "../../src/distanceUnicode.js";
import { createDistance } from "../../src/profiles.js";

const LENGTHS = [16, 48, 96, 256];
const SEEDS = [1337, 7331];
const PAIRS = 160;
const DURATION_MS = 175;
const WARM_ROUNDS = 3;

const asciiUnchecked = createDistance({
  profile: "ascii",
  outOfRange: "assume-valid"
});
const asciiChecked = createDistance({ profile: "ascii", outOfRange: "throw" });
const latin1Unchecked = createDistance({
  profile: "latin1",
  outOfRange: "assume-valid"
});
const latin1Checked = createDistance({ profile: "latin1", outOfRange: "throw" });
const codeUnit = createDistance({ profile: "codeUnit", outOfRange: "throw" });

const workloads = [
  {
    name: "ascii",
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    reference: distance,
    targets: [
      ["default", distance],
      ["ascii-unchecked", asciiUnchecked],
      ["ascii-throw", asciiChecked],
      ["latin1-unchecked", latin1Unchecked],
      ["codeUnit", codeUnit]
    ]
  },
  {
    name: "latin1",
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\u00c0\u00d1\u00e9\u00f8\u00ff",
    reference: distanceUnicode,
    targets: [
      ["default", distance],
      ["latin1-unchecked", latin1Unchecked],
      ["latin1-throw", latin1Checked],
      ["codeUnit", codeUnit]
    ]
  },
  {
    name: "bmp-code-units",
    alphabet: "ABCxyz\u0100\u03a9\u4f60\u754c\uffff",
    reference: distanceUnicode,
    targets: [
      ["unicode", distanceUnicode],
      ["codeUnit", codeUnit]
    ]
  }
];

for (const workload of workloads) {
  console.log(`\n=== ${workload.name} ===`);

  for (const length of LENGTHS) {
    const samples = new Map(workload.targets.map(([name]) => [name, []]));

    for (const seed of SEEDS) {
      const pairs = buildPairs({
        count: PAIRS,
        lenA: length,
        lenB: Math.max(0, length - 3),
        seed,
        alphabet: workload.alphabet
      });

      verify(workload.reference, workload.targets, pairs);

      for (const [name, fn] of workload.targets) {
        warm(fn, pairs);
        samples.get(name).push(benchOne(fn, pairs));
      }
    }

    const baselineName = workload.targets[0][0];
    const baseline = mean(samples.get(baselineName));
    console.log(`\nN=${length}`);
    for (const [name, values] of samples) {
      const ops = mean(values);
      console.log(
        `${name.padEnd(20)} ${ops.toFixed(2).padStart(10)} ops/ms  ${(ops / baseline).toFixed(3)}x ${baselineName}`
      );
    }
  }
}

function verify(reference, targets, pairs) {
  for (const [a, b] of pairs) {
    const expected = reference(a, b);
    for (const [name, fn] of targets) {
      const actual = fn(a, b);
      if (actual !== expected) {
        throw new Error(`${name} returned ${actual}; expected ${expected}`);
      }
    }
  }
}

function warm(fn, pairs) {
  for (let round = 0; round < WARM_ROUNDS; round++) {
    for (const [a, b] of pairs) fn(a, b);
  }
}

function benchOne(fn, pairs) {
  let calls = 0;
  const start = performance.now();
  let elapsed = 0;

  while (elapsed < DURATION_MS) {
    for (const [a, b] of pairs) {
      fn(a, b);
      calls++;
    }
    elapsed = performance.now() - start;
  }

  return calls / elapsed;
}
