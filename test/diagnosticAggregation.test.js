import { aggregateDiagnosticRuns } from "../bench/diagnostics/aggregate.js";
import { WORKLOAD_FAMILIES } from "../bench/workloads.js";
import { targetsForDomain } from "../bench/diagnostics/targets.js";

const TARGETS = [
  "default", "v2", "unicode", "profile-code-unit-throw", "profile-ascii-throw",
  "profile-ascii-assume-valid", "profile-latin1-throw", "profile-latin1-assume-valid",
];

describe("diagnostic aggregation", () => {
  test("validator target catalog matches diagnostic runner domains", () => {
    expect(targetsForDomain("ascii").map(([name]) => name)).toEqual(TARGETS);
    expect(targetsForDomain("latin1").map(([name]) => name)).toEqual(
      TARGETS.filter((name) => !name.startsWith("profile-ascii-"))
    );
    expect(targetsForDomain("bmp").map(([name]) => name)).toEqual(
      ["v2", "unicode", "profile-code-unit-throw"]
    );
  });
  test("combines paired repetitions by workload, length, and target", () => {
    const runs = [
      rawRun("run-0", 0, [20, 30], [10, 15]),
      rawRun("run-1", 1, [22, 33], [11, 15]),
    ];
    const aggregate = aggregateDiagnosticRuns(runs, "v2");
    const result = aggregate.results["random-ascii"][8];

    expect(aggregate.sourceRuns.map(({ runId }) => runId)).toEqual(["run-0", "run-1"]);
    expect(result.default.opsPerMs.count).toBe(4);
    expect(result.default.ratioToBaseline.median).toBe(2);
    expect(result.v2.ratioToBaseline.mean).toBe(1);
  });

  test("rejects mismatched or duplicate evidence", () => {
    const first = rawRun("run-0", 0, [20, 30], [10, 15]);
    const changed = rawRun("run-1", 1, [22, 33], [11, 15]);
    changed.results["random-ascii"][8].seeds[0].datasetChecksum = "deadbeef";

    expect(() => aggregateDiagnosticRuns([first, changed])).toThrow("different diagnostic evidence");
    expect(() => aggregateDiagnosticRuns([first, structuredClone(first)]))
      .toThrow("duplicate raw run id: run-0");
  });

  test("rejects absent checksums and provenance before comparing runs", () => {
    const run = rawRun("run-0", 0, [20, 30], [10, 15]);
    delete run.results["random-ascii"][8].seeds[0].expectedDistanceChecksum;
    expect(() => aggregateDiagnosticRuns([run])).toThrow("expectedDistanceChecksum");

    const missingRevision = rawRun("run-0", 0, [20, 30], [10, 15]);
    delete missingRevision.meta.revision;
    expect(() => aggregateDiagnosticRuns([missingRevision])).toThrow("diagnostic revision must be an object");
  });

  test("rejects incomplete and unexpected configured matrix entries", () => {
    const missingFamily = rawRun("run-0", 0, [20, 30], [10, 15]);
    missingFamily.meta.command.families.push("tiny-alphabet");
    missingFamily.meta.families["tiny-alphabet"] = WORKLOAD_FAMILIES["tiny-alphabet"];
    expect(() => aggregateDiagnosticRuns([missingFamily])).toThrow("diagnostic result families");

    const missingLength = rawRun("run-0", 0, [20, 30], [10, 15]);
    missingLength.meta.command.lengths.push(16);
    expect(() => aggregateDiagnosticRuns([missingLength])).toThrow("random-ascii lengths");

    const missingSeed = rawRun("run-0", 0, [20, 30], [10, 15]);
    missingSeed.meta.command.seeds.push(3);
    expect(() => aggregateDiagnosticRuns([missingSeed])).toThrow("random-ascii length 8 seeds");

    const unexpected = rawRun("run-0", 0, [20, 30], [10, 15]);
    unexpected.results["random-ascii"][16] = structuredClone(unexpected.results["random-ascii"][8]);
    expect(() => aggregateDiagnosticRuns([unexpected])).toThrow("random-ascii lengths");
  });

  test("rejects duplicate seeds, incomplete targets, and verification-only data", () => {
    const duplicate = rawRun("run-0", 0, [20, 30], [10, 15]);
    duplicate.results["random-ascii"][8].seeds[1].seed = 1;
    expect(() => aggregateDiagnosticRuns([duplicate])).toThrow("random-ascii length 8 seeds");

    const missingTarget = rawRun("run-0", 0, [20, 30], [10, 15]);
    delete missingTarget.results["random-ascii"][8].seeds[0].measurements.unicode;
    expect(() => aggregateDiagnosticRuns([missingTarget])).toThrow("targets");

    const verifyOnly = rawRun("run-0", 0, [20, 30], [10, 15]);
    verifyOnly.meta.mode = "verify-only";
    expect(() => aggregateDiagnosticRuns([verifyOnly])).toThrow("verification-only");
  });

  test("accepts dirty diagnostic runs but rejects mixed revision state", () => {
    const first = rawRun("run-0", 0, [20, 30], [10, 15]);
    const second = rawRun("run-1", 1, [22, 33], [11, 15]);
    first.meta.revision.dirty = true;
    second.meta.revision.dirty = true;
    expect(aggregateDiagnosticRuns([first, second]).results["random-ascii"][8].v2.opsPerMs.count).toBe(4);
    second.meta.revision.dirty = false;
    expect(() => aggregateDiagnosticRuns([first, second])).toThrow("different diagnostic evidence");
  });

  test("ignores output routing while comparing diagnostic runs", () => {
    const first = rawRun("run-0", 0, [20, 30], [10, 15]);
    const second = rawRun("run-1", 1, [22, 33], [11, 15]);
    first.meta.command.outDir = "workspace-a";
    second.meta.command.outDir = "workspace-b";
    expect(aggregateDiagnosticRuns([first, second]).results["random-ascii"][8].v2.opsPerMs.count).toBe(4);
  });
});

function rawRun(runId, repetition, defaultSamples, v2Samples) {
  return {
    schemaVersion: 1,
    meta: {
      runId,
      generatedAt: "2026-08-11T00:00:00.000Z",
      revision: { commit: "abc", dirty: false },
      mode: "measure",
      families: { "random-ascii": WORKLOAD_FAMILIES["random-ascii"] },
      runtime: {
        node: "v24", v8: "fixture", platform: "win32", release: "fixture",
        arch: "x64", cpu: "fixture", logicalCores: 8,
      },
      protocol: {
        factoryConstruction: "fixture", targetOrder: "fixture", warmup: "fixture",
        batching: "fixture", resultConsumption: "fixture",
      },
      command: {
        families: ["random-ascii"], lengths: [8], seeds: [1, 2], pairs: 2,
        durationMs: 1, warmRounds: 0, repetition, measure: true, runId: null,
      },
    },
    results: {
      "random-ascii": {
        8: {
          seeds: [1, 2].map((seed, index) => ({
            seed,
            datasetChecksum: seed.toString(16).padStart(8, "0"),
            expectedDistanceChecksum: (seed + 2).toString(16).padStart(8, "0"),
            targetOrder: TARGETS,
            measurements: Object.fromEntries(TARGETS.map((name) => [name,
              measurement(name === "default" ? defaultSamples[index] : v2Samples[index])])),
          })),
        },
      },
    },
  };
}

function measurement(opsPerMs) {
  return { calls: opsPerMs * 10, elapsed: 10, opsPerMs, timedChecksum: 0 };
}
