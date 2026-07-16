import {
  balancedTargetOrder,
  checksumPairs,
  pairedRatios,
  summarize,
  verifyTargets,
} from "../bench/harness.js";
import { referenceDistance } from "../bench/reference-distance.js";
import { aggregateRuns } from "../bench/packages/aggregate.js";

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
    const aggregate = aggregateRuns(runs, "baseline");

    expect(aggregate.sourceRuns.map(({ runId }) => runId)).toEqual(["run-0", "run-1"]);
    expect(aggregate.results[8].lightning.opsPerMs.count).toBe(4);
    expect(aggregate.results[8].lightning.ratioToBaseline.median).toBe(2);
    expect(aggregate.results[8].baseline.ratioToBaseline.mean).toBe(1);
  });
});

function rawRun(runId, repetition, lightning, baseline) {
  return {
    schemaVersion: 2,
    meta: {
      runId,
      generatedAt: "2026-07-16T00:00:00.000Z",
      revision: { commit: "abc", dirty: false },
      runtime: { node: "v24" },
      workload: "fixture",
      command: {
        lengths: [8], seeds: [1, 2], pairs: 2, durationMs: 1,
        warmRounds: 0, repetition, verifyOnly: false,
      },
    },
    results: {
      8: {
        lightning: { seedRuns: lightning.map((opsPerMs) => ({ opsPerMs })) },
        baseline: { seedRuns: baseline.map((opsPerMs) => ({ opsPerMs })) },
      },
    },
  };
}
