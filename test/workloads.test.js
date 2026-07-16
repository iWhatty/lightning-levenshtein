import { buildWorkloadPairs, WORKLOAD_FAMILIES } from "../bench/workloads.js";
import { referenceDistance } from "../bench/reference-distance.js";
import { verifyTargets } from "../bench/harness.js";
import { targetsForDomain } from "../bench/diagnostics/targets.js";

describe("benchmark workload generators", () => {
  test.each(Object.keys(WORKLOAD_FAMILIES))("%s is deterministic", (family) => {
    const options = { family, count: 8, length: 33, seed: 1337 };
    expect(buildWorkloadPairs(options)).toEqual(buildWorkloadPairs(options));
  });

  test("exact and one-edit pairs retain their promised distance", () => {
    const pairs = buildWorkloadPairs({ family: "exact-one-edit", count: 12, length: 16, seed: 7 });
    expect(pairs.map(([a, b]) => referenceDistance(a, b))).toEqual([
      0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1,
    ]);
  });

  test("shared-affix pairs preserve both affixes", () => {
    const length = 20;
    const pairs = buildWorkloadPairs({ family: "shared-affixes", count: 8, length, seed: 9 });
    for (const [a, b] of pairs) {
      expect(a.slice(0, 8)).toBe(b.slice(0, 8));
      expect(a.slice(-8)).toBe(b.slice(-8));
      expect(a).toHaveLength(length);
      expect(b).toHaveLength(length);
    }
  });

  test("unequal pairs alternate longer-argument direction", () => {
    const pairs = buildWorkloadPairs({ family: "unequal-length", count: 4, length: 32, seed: 11 });
    expect(pairs.map(([a, b]) => Math.sign(a.length - b.length))).toEqual([1, -1, 1, -1]);
  });

  test("profile workloads stay inside their declared code-unit domains", () => {
    const latin1 = buildWorkloadPairs({ family: "latin1", count: 20, length: 20, seed: 13 }).flat();
    const bmp = buildWorkloadPairs({ family: "bmp-code-units", count: 20, length: 20, seed: 13 }).flat();
    expect(Math.max(...latin1.flatMap(codeUnits))).toBeLessThanOrEqual(255);
    expect(Math.max(...bmp.flatMap(codeUnits))).toBeGreaterThan(255);
    expect(Math.max(...bmp.flatMap(codeUnits))).toBeLessThanOrEqual(65535);
  });

  test.each(Object.entries(WORKLOAD_FAMILIES))(
    "%s verifies against every compatible production target",
    (family, { domain }) => {
      const pairs = buildWorkloadPairs({ family, count: 8, length: 33, seed: 17 });
      expect(() => verifyTargets(referenceDistance, targetsForDomain(domain), pairs)).not.toThrow();
    }
  );
});

function codeUnits(value) {
  return Array.from({ length: value.length }, (_, index) => value.charCodeAt(index));
}
