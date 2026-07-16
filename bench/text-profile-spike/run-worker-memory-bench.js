import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const profiles = ["ascii", "latin1", "codeUnit"];
const workerCounts = [1, 2, 4, 8];
const durationMs = 600;
const scenarioPath = fileURLToPath(new URL("./worker-memory-scenario.js", import.meta.url));
const results = [];

console.log("profile   workers     ops/s   ready ms   RSS ready   RSS worked   arrays factory   arrays after largest");

for (const profile of profiles) {
  for (const workerCount of workerCounts) {
    const output = execFileSync(
      process.execPath,
      ["--expose-gc", scenarioPath, profile, String(workerCount), String(durationMs)],
      { encoding: "utf8" }
    );
    const result = JSON.parse(output);
    results.push(result);

    console.log([
      profile.padEnd(10),
      String(workerCount).padStart(7),
      formatInteger(result.aggregateOpsPerSecond).padStart(10),
      result.spawnToReadyMs.toFixed(1).padStart(10),
      formatBytes(result.rssDeltaReady).padStart(11),
      formatBytes(result.rssDeltaAfterWork).padStart(12),
      formatBytes(result.workerArrayBuffersAfterFactory).padStart(16),
      formatBytes(result.workerArrayBuffersAfterScratch).padStart(20)
    ].join(" "));
  }
}

console.log("\nprofile   workers   factory ms   worker heap delta   factory external total");
for (const result of results) {
  console.log([
    result.profile.padEnd(10),
    String(result.workerCount).padStart(7),
    result.meanFactoryMs.toFixed(3).padStart(12),
    formatBytes(result.workerHeapUsedAfterWork).padStart(19),
    formatBytes(result.workerExternalAfterFactoryTotal).padStart(24)
  ].join(" "));
}

function formatInteger(value) {
  return Math.round(value).toLocaleString("en-US");
}

function formatBytes(value) {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  if (absolute >= 1024 * 1024) return `${sign}${(absolute / (1024 * 1024)).toFixed(2)} MiB`;
  if (absolute >= 1024) return `${sign}${(absolute / 1024).toFixed(2)} KiB`;
  return `${value} B`;
}
