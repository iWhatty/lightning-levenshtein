import {
  balancedTargetOrder,
  checksumPairs,
  pairedRatios,
  summarize,
  verifyTargets,
} from "../bench/harness.js";
import { referenceDistance } from "../bench/reference-distance.js";
import { aggregateRuns } from "../bench/packages/aggregate.js";

const BASELINE = "fastest-levenshtein";
const LIGHTNING = "lightning-levenshtein-v2";
const TARGETS = [
  LIGHTNING, "lightning-levenshtein-v1", BASELINE,
  "js-levenshtein", "leven", "levenshtein-edit-distance",
];

describe("benchmark harness", () => {
  test("target scheduling is deterministic and balanced across a cycle", () => {
    const targets = [["a"], ["b"], ["c"], ["d"]];
    const schedules = targets.map((_, repetition) =>
      balancedTargetOrder(targets, 1337, repetition).map(([name]) => name)
    );

    expect(schedules).toEqual(
      targets.map((_, repetition) =>
        balancedTargetOrder(targets, 1337, repetition).map(([name]) => name)
      )
    );
    for (let position = 0; position < targets.length; position++) {
      expect(new Set(schedules.map((schedule) => schedule[position])).size).toBe(4);
    }
  });

  test("verification returns a stable checksum and rejects incorrect targets", () => {
    const pairs = [["kitten", "sitting"], ["same", "same"], ["", "abc"]];
    const targets = [["reference-copy", referenceDistance]];

    expect(verifyTargets(referenceDistance, targets, pairs)).toBe("7aaf502e");
    expect(() => verifyTargets(
      referenceDistance,
      [["incorrect", () => 0]],
      pairs
    )).toThrow("incorrect returned 0 for pair 0; expected 3");
  });

  test("dataset checksums identify inputs independently from their distances", () => {
    const first = [["abc", "axc"]];
    const second = [["def", "dxf"]];
    expect(referenceDistance(...first[0])).toBe(referenceDistance(...second[0]));
    expect(checksumPairs(first)).not.toBe(checksumPairs(second));
    expect(checksumPairs(first)).toBe(checksumPairs(first));
  });

  test("summary and paired-ratio statistics retain raw sample meaning", () => {
    expect(summarize([2, 4, 6])).toEqual({
      count: 3,
      mean: 4,
      median: 4,
      min: 2,
      max: 6,
      standardDeviation: Math.sqrt(8 / 3),
      coefficientOfVariation: Math.sqrt(8 / 3) / 4,
    });
    expect(pairedRatios([10, 15], [5, 10])).toEqual([2, 1.5]);
  });

  test("raw repetitions aggregate into paired stability statistics", () => {
    const runs = [
      rawRun("run-0", 0, [20, 30], [10, 15]),
      rawRun("run-1", 1, [22, 33], [11, 15]),
    ];
    const aggregate = aggregateRuns(runs);

    expect(aggregate.sourceRuns.map(({ runId }) => runId)).toEqual(["run-0", "run-1"]);
    expect(aggregate.sourceRuns.map(({ repetition }) => repetition)).toEqual([0, 1]);
    expect(aggregate.results[8][LIGHTNING].opsPerMs.count).toBe(4);
    expect(aggregate.results[8][LIGHTNING].ratioToBaseline.median).toBe(2);
    expect(aggregate.results[8][BASELINE].ratioToBaseline.mean).toBe(1);
  });

  test("package aggregation rejects duplicate raw run ids", () => {
    const run = rawRun("run-0", 0, [20, 30], [10, 15]);
    expect(() => aggregateRuns([run, structuredClone(run)]))
      .toThrow("duplicate raw run id: run-0");
  });

  test("package aggregation rejects mixed or invalid evidence", () => {
    const first = rawRun("run-0", 0, [20, 30], [10, 15]);
    const changedDataset = rawRun("run-1", 1, [22, 33], [11, 15]);
    changedDataset.results[8][LIGHTNING].seedRuns[0].datasetChecksum = "deadbeef";
    expect(() => aggregateRuns([first, changedDataset]))
      .toThrow("uses different dataset evidence for length 8");

    const changedAcrossRun = rawRun("run-1", 1, [22, 33], [11, 15]);
    for (const target of Object.values(changedAcrossRun.results[8])) {
      target.seedRuns[0].datasetChecksum = "deadbeef";
    }
    expect(() => aggregateRuns([first, changedAcrossRun]))
      .toThrow("different benchmark configuration");

    const invalidMeasurement = rawRun("run-1", 1, [22, 33], [11, 15]);
    invalidMeasurement.results[8][LIGHTNING].seedRuns[0].opsPerMs = 0;
    expect(() => aggregateRuns([first, invalidMeasurement]))
      .toThrow("opsPerMs must be a finite positive number");

    const relabeledRepetition = rawRun("run-1", 1, [22, 33], [11, 15]);
    relabeledRepetition.meta.command.repetition = 2;
    expect(() => aggregateRuns([relabeledRepetition]))
      .toThrow("does not match scheduled target order");
  });

  test("rejects absent or invalid checksums even when runs agree", () => {
    const first = rawRun("run-0", 0, [20, 30], [10, 15]);
    const matchingOmission = rawRun("run-1", 1, [22, 33], [11, 15]);
    for (const run of [first, matchingOmission]) {
      for (const target of Object.values(run.results[8])) {
        delete target.seedRuns[0].datasetChecksum;
      }
    }
    expect(() => aggregateRuns([first, matchingOmission])).toThrow("datasetChecksum");

    const second = rawRun("run-1", 1, [22, 33], [11, 15]);
    for (const target of Object.values(second.results[8])) {
      target.seedRuns[0].expectedDistanceChecksum = "invalid";
    }
    expect(() => aggregateRuns([second, structuredClone(second)])).toThrow("expectedDistanceChecksum");
  });

  test("rejects missing provenance and incomplete configured matrix", () => {
    const run = rawRun("run-0", 0, [20, 30], [10, 15]);
    delete run.meta.revision;
    expect(() => aggregateRuns([run])).toThrow("benchmark revision must be an object");

    const missingLength = rawRun("run-0", 0, [20, 30], [10, 15]);
    missingLength.meta.command.lengths = [8, 16];
    expect(() => aggregateRuns([missingLength])).toThrow("benchmark result lengths");

    const missingSeed = rawRun("run-0", 0, [20, 30], [10, 15]);
    missingSeed.meta.command.seeds = [1, 2, 3];
    expect(() => aggregateRuns([missingSeed])).toThrow("length 8 seeds");

    const missingProtocol = rawRun("run-0", 0, [20, 30], [10, 15]);
    delete missingProtocol.meta.protocol.targetOrder;
    expect(() => aggregateRuns([missingProtocol])).toThrow("benchmark protocol targetOrder");
  });

  test("rejects unknown package and dependency versions shared by every run", () => {
    const runs = [
      rawRun("run-0", 0, [20, 30], [10, 15]),
      rawRun("run-1", 1, [22, 33], [11, 15]),
      rawRun("run-2", 2, [24, 36], [12, 18]),
    ];
    for (const run of runs) run.meta.packageVersion = "unknown";
    expect(() => aggregateRuns(runs)).toThrow("benchmark packageVersion cannot be unknown");

    for (const run of runs) {
      run.meta.packageVersion = "0.0.6-next.1";
      run.meta.dependencyVersions[BASELINE] = "unknown";
    }
    expect(() => aggregateRuns(runs)).toThrow(`${BASELINE} version cannot be unknown`);

    for (const run of runs) run.meta.dependencyVersions[BASELINE] = "1.0.0-rc.1";
    expect(aggregateRuns(runs).sourceRuns).toHaveLength(3);
  });

  test("rejects duplicate seeds, unexpected targets, and verification-only documents", () => {
    const duplicate = rawRun("run-0", 0, [20, 30], [10, 15]);
    for (const target of Object.values(duplicate.results[8])) target.seedRuns[1].seed = 1;
    expect(() => aggregateRuns([duplicate])).toThrow("length 8 seeds");

    const unexpected = rawRun("run-0", 0, [20, 30], [10, 15]);
    unexpected.results[8].rogue = structuredClone(unexpected.results[8][BASELINE]);
    expect(() => aggregateRuns([unexpected])).toThrow("target set");

    const inconsistent = rawRun("run-0", 0, [20, 30], [10, 15]);
    inconsistent.meta.command.lengths.push(16);
    inconsistent.results[16] = structuredClone(inconsistent.results[8]);
    delete inconsistent.results[16].leven;
    expect(() => aggregateRuns([inconsistent])).toThrow("length 16 target set");

    const verifyOnly = rawRun("run-0", 0, [20, 30], [10, 15]);
    verifyOnly.meta.command.verifyOnly = true;
    expect(() => aggregateRuns([verifyOnly])).toThrow("verification-only");
  });
});

function rawRun(runId, repetition, lightning, baseline) {
  return {
    schemaVersion: 2,
    meta: {
      runId,
      generatedAt: "2026-07-16T00:00:00.000Z",
      revision: { commit: "abc", dirty: false },
      runtime: {
        node: "v24", v8: "fixture", platform: "win32", release: "fixture",
        arch: "x64", cpu: "fixture", logicalCores: 8,
      },
      packageVersion: "0.0.6",
      dependencyVersions: Object.fromEntries(TARGETS.slice(2).map((name) => [name, "1.0.0"])),
      alphabet: "abc",
      unit: "ops/sec",
      primaryMetric: "meanOpsPerMs",
      aggregation: "arithmetic mean across seeds within one complete-suite repetition",
      baseline: BASELINE,
      protocol: {
        targetOrder: "fixture", warmup: "fixture", batching: "fixture",
        timerOverrun: "fixture", resultConsumption: "fixture",
      },
      workload: "fixture",
      command: {
        lengths: [8], seeds: [1, 2], pairs: 2, durationMs: 1,
        warmRounds: 0, repetition, verifyOnly: false,
        runId,
        outDir: `workspace-${repetition}/raw`,
      },
    },
    results: {
      8: {
        ...Object.fromEntries(TARGETS.map((name) => [name, {
          seedRuns: samples(name === LIGHTNING ? lightning : baseline, name, repetition),
        }])),
      },
    },
  };
}

function samples(values, targetName, repetition) {
  return values.map((opsPerMs, index) => ({
    seed: index + 1,
    orderPosition: balancedTargetOrder(TARGETS, (index + 1) ^ 8, repetition).indexOf(targetName),
    datasetChecksum: (index + 1).toString(16).padStart(8, "0"),
    expectedDistanceChecksum: (index + 3).toString(16).padStart(8, "0"),
    calls: opsPerMs * 10,
    elapsed: 10,
    opsPerMs,
    opsPerSec: opsPerMs * 1000,
    timedChecksum: 0,
  }));
}
