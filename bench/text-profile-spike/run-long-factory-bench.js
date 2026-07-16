import { buildPairs, mean } from "../data.js";
import { myers_x64 as historical } from "../myers-x-variants/myers_x64.js";
import { myers_x64 as stable } from "../../src/myers_x64.js";
import { createMyersX64 } from "../../src/myers_x64_factory.js";

const LENGTHS = [96, 256, 700];
const SEEDS = [1337, 7331];
const PAIRS = 120;
const DURATION_MS = 200;
const WARM_ROUNDS = 3;

const profiles = {
  ascii: createMyersX64(new Uint32Array(128), new Uint32Array(128)),
  latin1: createMyersX64(new Uint32Array(256), new Uint32Array(256)),
  codeUnit: createMyersX64(new Uint32Array(65536), new Uint32Array(65536))
};

const workloads = [
  {
    name: "ascii",
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    targets: [
      ["historical", historical],
      ["stable-bound", stable],
      ["profile-ascii", profiles.ascii],
      ["profile-latin1", profiles.latin1],
      ["profile-codeUnit", profiles.codeUnit]
    ]
  },
  {
    name: "latin1",
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\u00c0\u00d1\u00e9\u00f8\u00ff",
    targets: [
      ["historical", historical],
      ["stable-bound", stable],
      ["profile-latin1", profiles.latin1],
      ["profile-codeUnit", profiles.codeUnit]
    ]
  },
  {
    name: "bmp-code-units",
    alphabet: "ABCxyz\u0100\u03a9\u4f60\u754c\uffff",
    targets: [
      ["historical", historical],
      ["stable-bound", stable],
      ["profile-codeUnit", profiles.codeUnit]
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
        lenB: length - 7,
        seed,
        alphabet: workload.alphabet
      });

      verify(workload.targets, pairs);

      for (const [name, fn] of workload.targets) {
        warm(fn, pairs);
        samples.get(name).push(benchOne(fn, pairs));
      }
    }

    const baseline = mean(samples.get("historical"));
    console.log(`\nN=${length}`);
    for (const [name, values] of samples) {
      const ops = mean(values);
      const relative = ops / baseline;
      console.log(
        `${name.padEnd(20)} ${ops.toFixed(2).padStart(10)} ops/ms  ${relative.toFixed(3)}x historical`
      );
    }
  }
}

function verify(targets, pairs) {
  for (const [a, b] of pairs) {
    const expected = historical(a, b);
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
