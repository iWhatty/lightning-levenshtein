import { Worker } from "node:worker_threads";
import { performance } from "node:perf_hooks";

const profile = process.argv[2];
const workerCount = Number(process.argv[3]);
const durationMs = Number(process.argv[4]);

if (!profile || !Number.isInteger(workerCount) || workerCount < 1 || !durationMs) {
  throw new TypeError("Usage: worker-memory-scenario.js <profile> <workers> <duration-ms>");
}

globalThis.gc?.();
const baseline = process.memoryUsage();
const started = performance.now();
const states = [];
const ready = [];

// Start sequentially so module-startup buffer churn cannot contaminate
// another worker's before/after factory delta. Work still runs concurrently.
for (let index = 0; index < workerCount; index++) {
  const state = createWorkerState();
  states.push(state);
  ready.push(await state.ready);
}

const readyAt = performance.now();
const afterReady = process.memoryUsage();

for (const state of states) state.worker.postMessage({ durationMs });
const results = await Promise.all(states.map((state) => state.result));
const afterWork = process.memoryUsage();
await Promise.all(states.map((state) => state.worker.terminate()));

const totalCalls = results.reduce((sum, result) => sum + result.calls, 0);
const wallElapsed = Math.max(...results.map((result) => result.elapsed));

process.stdout.write(JSON.stringify({
  profile,
  workerCount,
  aggregateOpsPerSecond: totalCalls / wallElapsed * 1000,
  spawnToReadyMs: readyAt - started,
  meanFactoryMs: ready.reduce((sum, value) => sum + value.factoryMs, 0) / workerCount,
  rssDeltaReady: afterReady.rss - baseline.rss,
  rssDeltaAfterWork: afterWork.rss - baseline.rss,
  workerArrayBuffersAfterFactory: sumDelta(ready, "afterFactory", "beforeFactory", "arrayBuffers"),
  workerArrayBuffersAfterScratch: sumDelta(ready, "afterScratch", "beforeFactory", "arrayBuffers"),
  workerExternalAfterFactory: sumDelta(ready, "afterFactory", "beforeFactory", "external"),
  workerArrayBuffersAfterWork: results.reduce(
    (sum, result, index) => sum + result.afterWork.arrayBuffers - ready[index].beforeFactory.arrayBuffers,
    0
  ),
  workerExternalAfterWork: results.reduce(
    (sum, result, index) => sum + result.afterWork.external - ready[index].beforeFactory.external,
    0
  ),
  workerHeapUsedAfterWork: results.reduce(
    (sum, result, index) => sum + result.afterWork.heapUsed - ready[index].beforeFactory.heapUsed,
    0
  ),
  checksum: results.reduce((sum, result) => sum + result.checksum, 0)
}));

function createWorkerState() {
  const worker = new Worker(new URL("./worker-memory-worker.js", import.meta.url), {
    workerData: { profile }
  });

  let resolveReady;
  let rejectReady;
  let resolveResult;
  let rejectResult;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const result = new Promise((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  worker.on("message", (message) => {
    if (message.type === "ready") resolveReady(message);
    if (message.type === "result") resolveResult(message);
  });
  worker.on("error", (error) => {
    rejectReady(error);
    rejectResult(error);
  });

  return { worker, ready, result };
}

function sumDelta(values, afterKey, beforeKey, metric) {
  return values.reduce(
    (sum, value) => sum + value[afterKey][metric] - value[beforeKey][metric],
    0
  );
}
