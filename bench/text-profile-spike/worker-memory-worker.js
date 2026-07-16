import { parentPort, workerData } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import { createDistance } from "../../src/profiles.js";

globalThis.gc?.();
const beforeFactory = memorySnapshot();
const factoryStarted = performance.now();
const distance = createDistance({
  profile: workerData.profile,
  outOfRange: "assume-valid"
});
const factoryMs = performance.now() - factoryStarted;
const afterFactory = memorySnapshot();

const alphabet = workerData.profile === "ascii"
  ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  : workerData.profile === "latin1"
    ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\u00c0\u00d1\u00e9\u00f8\u00ff"
    : "ABCxyz\u0100\u03a9\u4f60\u754c\uffff";

// Touch every dispatcher tier and retain scratch sized for the largest case.
for (const length of [16, 48, 96, 256, 1024]) {
  distance(patternedString(length, 0), patternedString(length - 3, 2));
}

const afterScratch = memorySnapshot();
const pairs = Array.from({ length: 64 }, (_, index) => [
  patternedString(256, index),
  patternedString(253, index + 3)
]);

parentPort.postMessage({
  type: "ready",
  beforeFactory,
  afterFactory,
  afterScratch,
  factoryMs
});

parentPort.once("message", ({ durationMs }) => {
  let calls = 0;
  let checksum = 0;
  const start = performance.now();
  let elapsed = 0;

  while (elapsed < durationMs) {
    for (const [a, b] of pairs) {
      checksum += distance(a, b);
      calls++;
    }
    elapsed = performance.now() - start;
  }

  globalThis.gc?.();
  parentPort.postMessage({
    type: "result",
    calls,
    elapsed,
    checksum,
    afterWork: memorySnapshot()
  });
});

function patternedString(length, offset) {
  let value = "";
  for (let index = 0; index < length; index++) {
    value += alphabet[(index * 7 + offset) % alphabet.length];
  }
  return value;
}

function memorySnapshot() {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers
  };
}
