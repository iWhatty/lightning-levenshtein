import {
  loadPromotedBenchmark,
  normalizePromotedBenchmark,
  validateGeneratedClaims,
} from "../bench/packages/evidence.js";

describe("benchmark evidence promotion", () => {
  test("the current legacy promotion preserves published benchmark values", () => {
    const data = loadPromotedBenchmark();
    expect(data.meta.promotion).toMatchObject({
      id: "legacy-windows-intel-node24-2026-07-16",
      status: "legacy",
      workload: "random-equal-length-ascii",
    });
    expect(data.results[32]["lightning-levenshtein-v2"].meanOpsPerMs)
      .toBeCloseTo(6558.537198315183);
  });

  test("a qualified aggregate normalizes into the renderer contract", () => {
    const data = normalizePromotedBenchmark(manifest(), aggregate());
    expect(data.meta.promotion.id).toBe("fixture-001");
    expect(data.meta.runtime.node).toBe("v24.0.0");
    expect(data.results[8]["lightning-levenshtein-v2"].meanOpsPerMs).toBe(20);
    expect(data.results[8]["lightning-levenshtein-v2"].meanOpsPerSec).toBe(20000);
  });

  test("qualification rejects mixed or weak evidence", () => {
    const tooFew = aggregate();
    tooFew.sourceRuns.pop();
    expect(() => normalizePromotedBenchmark(manifest(), tooFew)).toThrow("at least three");

    const dirty = aggregate();
    dirty.sourceRuns[1].revision.dirty = true;
    expect(() => normalizePromotedBenchmark(manifest(), dirty)).toThrow("clean revision");

    const mixedRuntime = aggregate();
    mixedRuntime.sourceRuns[2].runtime = { node: "v18.0.0", cpu: "fixture" };
    expect(() => normalizePromotedBenchmark(manifest(), mixedRuntime)).toThrow("different runtimes");

    const mixedDependencies = aggregate();
    mixedDependencies.sourceRuns[2].dependencyVersions = { competitor: "2.0.0" };
    expect(() => normalizePromotedBenchmark(manifest(), mixedDependencies)).toThrow("dependency versions");

    const missingVersions = aggregate();
    missingVersions.sourceRuns[0].dependencyVersions = {};
    expect(() => normalizePromotedBenchmark(manifest(), missingVersions)).toThrow("identify package");
  });

  test("claim validation rejects unscoped world-fastest wording", () => {
    const data = normalizePromotedBenchmark(manifest(), aggregate());
    expect(() => validateGeneratedClaims("The world's fastest implementation.", data))
      .toThrow("world-fastest");
    expect(() => validateGeneratedClaims("Highest mean throughput everywhere.", data))
      .toThrow("Node benchmark scope");
    expect(validateGeneratedClaims(
      "Highest mean throughput in this checked-in Node benchmark.",
      data
    )).toBe(true);
  });
});

function manifest() {
  return {
    schemaVersion: 1,
    promotionId: "fixture-001",
    status: "qualified",
    source: { type: "qualification-aggregate", path: "aggregates/fixture.json" },
    scope: {
      runtime: "node",
      workload: "random-equal-length-ascii",
      target: "lightning-levenshtein-v2",
      baseline: "fastest-levenshtein",
    },
    presentation: { metric: "mean" },
  };
}

function aggregate() {
  const run = (index) => ({
    runId: `run-${index}`,
    generatedAt: "2026-07-16T00:00:00.000Z",
    revision: { commit: "abc123", dirty: false },
    runtime: { node: "v24.0.0", cpu: "fixture" },
    packageVersion: "0.0.5",
    dependencyVersions: { competitor: "1.0.0" },
  });
  return {
    schemaVersion: 1,
    generatedAt: "2026-07-16T01:00:00.000Z",
    baseline: "fastest-levenshtein",
    workload: "random-equal-length-ascii",
    sourceRuns: [run(0), run(1), run(2)],
    sourceFiles: ["raw/0.json", "raw/1.json", "raw/2.json"],
    command: {
      lengths: [8], seeds: [1], pairs: 10, durationMs: 100,
      warmRounds: 2, verifyOnly: false,
    },
    results: {
      8: {
        "lightning-levenshtein-v2": { opsPerMs: stats(20), ratioToBaseline: stats(2) },
        "fastest-levenshtein": { opsPerMs: stats(10), ratioToBaseline: stats(1) },
      },
    },
  };
}

function stats(value) {
  return {
    count: 3, mean: value, median: value, min: value, max: value,
    standardDeviation: 0, coefficientOfVariation: 0,
  };
}
