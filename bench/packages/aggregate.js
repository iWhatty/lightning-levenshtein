import { balancedTargetOrder, pairedRatios, summarize } from "../harness.js";
import {
  assertChecksum, assertCompatibleRuns, assertExactMembers, assertInteger,
  assertMeasurement, assertPositiveNumber, assertProvenance, assertRecord,
  assertString, assertUniqueList, assertUniqueRunIds,
} from "../run-evidence.js";

const TARGETS = [
  "lightning-levenshtein-v2", "lightning-levenshtein-v1", "fastest-levenshtein",
  "js-levenshtein", "leven", "levenshtein-edit-distance",
];
export const PACKAGE_TARGET_COUNT = TARGETS.length;
const DEPENDENCIES = TARGETS.slice(2);

export function aggregateRuns(runs, baselineName = "fastest-levenshtein") {
  if (runs.length < 1) throw new TypeError("at least one raw run is required");
  for (const run of runs) validateRun(run);
  assertUniqueRunIds(runs, (run) => run.meta.runId, "raw run");
  assertCompatibleRuns(
    runs,
    configurationSignature,
    (run) => `run ${run.meta.runId} uses a different benchmark configuration`
  );

  const lengths = runs[0].meta.command.lengths;
  const aggregate = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    baseline: baselineName,
    sourceRuns: runs.map((run) => ({
      runId: run.meta.runId,
      repetition: run.meta.command.repetition,
      generatedAt: run.meta.generatedAt,
      revision: run.meta.revision,
      runtime: run.meta.runtime,
      packageVersion: run.meta.packageVersion,
      dependencyVersions: run.meta.dependencyVersions,
    })),
    command: runs[0].meta.command,
    workload: runs[0].meta.workload,
    results: {},
  };

  for (const length of lengths) {
    const baselineSamples = collectSamples(runs, length, baselineName);
    if (!baselineSamples.length) {
      throw new Error(`baseline ${baselineName} is missing for length ${length}`);
    }

    aggregate.results[length] = {};
    for (const targetName of Object.keys(runs[0].results[length])) {
      const samples = collectSamples(runs, length, targetName);
      if (samples.length !== baselineSamples.length ||
          samples.some((sample, index) => sample.key !== baselineSamples[index].key)) {
        throw new Error(`${targetName} has unpaired samples for length ${length}`);
      }
      const values = samples.map((sample) => sample.value);
      const baselineValues = baselineSamples.map((sample) => sample.value);
      aggregate.results[length][targetName] = {
        opsPerMs: summarize(values),
        ratioToBaseline: summarize(pairedRatios(values, baselineValues)),
      };
    }
  }

  return aggregate;
}

function collectSamples(runs, length, targetName) {
  return runs.flatMap((run) => {
    const target = run.results[length]?.[targetName];
    if (!target) throw new Error(`${targetName} is missing for length ${length}`);
    return target.seedRuns.map((sample, index) => {
      if (!Number.isFinite(sample.opsPerMs) || sample.opsPerMs <= 0) {
        throw new Error(`${targetName} has no valid measurement for length ${length}`);
      }
      return {
        key: `${run.meta.runId}:${sample.seed ?? run.meta.command.seeds[index]}`,
        value: sample.opsPerMs,
      };
    });
  });
}

function validateRun(run) {
  if (run?.schemaVersion !== 2 || !run.meta || !run.results) {
    throw new TypeError("input is not a benchmark raw-run schema v2 document");
  }
  const meta = assertRecord(run.meta, "benchmark metadata");
  assertProvenance(meta, "benchmark");
  assertKnownVersion(meta.packageVersion, "benchmark packageVersion");
  const dependencies = assertRecord(meta.dependencyVersions, "benchmark dependencyVersions");
  assertExactMembers(Object.keys(dependencies), DEPENDENCIES, "benchmark dependencies");
  for (const name of DEPENDENCIES) assertKnownVersion(dependencies[name], `${name} version`);
  for (const field of ["alphabet", "workload", "unit", "primaryMetric", "aggregation", "baseline"]) {
    assertString(meta[field], `benchmark ${field}`);
  }
  const command = assertRecord(meta.command, "benchmark command");
  if (command.verifyOnly !== false) {
    throw new TypeError("verification-only documents cannot be aggregated");
  }
  assertUniqueList(command.lengths, "benchmark lengths", (value) => assertInteger(value, "benchmark length"));
  assertUniqueList(command.seeds, "benchmark seeds", (value) => assertInteger(value, "benchmark seed"));
  assertInteger(command.pairs, "benchmark pairs", 1);
  assertPositiveNumber(command.durationMs, "benchmark durationMs");
  assertInteger(command.warmRounds, "benchmark warmRounds");
  assertInteger(command.repetition, "benchmark repetition");
  assertRecord(run.results, "benchmark results");
  validateEvidenceShape(run);
}

function assertKnownVersion(value, label) {
  assertString(value, label);
  if (value.trim().toLowerCase() === "unknown") {
    throw new TypeError(`${label} cannot be unknown`);
  }
}

function configurationSignature(run) {
  const command = { ...run.meta.command };
  delete command.repetition;
  delete command.runId;
  delete command.outDir;
  return JSON.stringify({
    command,
    workload: run.meta.workload,
    alphabet: run.meta.alphabet,
    unit: run.meta.unit,
    primaryMetric: run.meta.primaryMetric,
    aggregation: run.meta.aggregation,
    baseline: run.meta.baseline,
    protocol: run.meta.protocol,
    revision: run.meta.revision,
    runtime: run.meta.runtime,
    packageVersion: run.meta.packageVersion,
    dependencyVersions: run.meta.dependencyVersions,
    evidence: evidenceShape(run),
  });
}

function validateEvidenceShape(run) {
  const expectedSeeds = run.meta.command.seeds;
  assertExactMembers(Object.keys(run.results), run.meta.command.lengths.map(String), "benchmark result lengths");

  for (const length of run.meta.command.lengths) {
    const lengthResult = assertRecord(run.results[length], `length ${length} results`);
    assertExactMembers(Object.keys(lengthResult), TARGETS, `length ${length} target set`);
    let canonicalSignature;
    for (const targetName of TARGETS) {
      const target = assertRecord(lengthResult[targetName], `${targetName} length ${length}`);
      const seedRuns = target.seedRuns;
      if (!Array.isArray(seedRuns)) throw new TypeError(`${targetName} length ${length} seedRuns must be an array`);
      assertExactMembers(seedRuns.map((sample) => sample?.seed), expectedSeeds,
        `${targetName} length ${length} seeds`);
      if (seedRuns.some((sample, index) => sample.seed !== expectedSeeds[index])) {
        throw new Error(`${targetName} length ${length} does not follow configured seed order`);
      }
      for (const sample of seedRuns) {
        const label = `${targetName} length ${length} seed ${sample.seed}`;
        assertRecord(sample, label);
        assertChecksum(sample.datasetChecksum, `${label} datasetChecksum`);
        assertChecksum(sample.expectedDistanceChecksum, `${label} expectedDistanceChecksum`);
        assertInteger(sample.orderPosition, `${label} orderPosition`);
        if (sample.orderPosition >= TARGETS.length) throw new Error(`${label} orderPosition is out of range`);
        assertMeasurement(sample, label, true);
      }
      const signature = JSON.stringify(sampleEvidence(seedRuns));
      if (canonicalSignature === undefined) canonicalSignature = signature;
      else if (signature !== canonicalSignature) {
        throw new Error(`${targetName} uses different dataset evidence for length ${length}`);
      }
    }
    for (const seed of expectedSeeds) {
      const positions = TARGETS.map((name) => lengthResult[name].seedRuns.find((sample) => sample.seed === seed).orderPosition);
      assertExactMembers(positions, TARGETS.map((_, index) => index), `length ${length} seed ${seed} order positions`);
      const scheduled = balancedTargetOrder(TARGETS, seed ^ length, run.meta.command.repetition);
      if (TARGETS.some((name, index) => positions[index] !== scheduled.indexOf(name))) {
        throw new Error(`length ${length} seed ${seed} does not match scheduled target order`);
      }
    }
  }
}

function evidenceShape(run) {
  return Object.fromEntries(run.meta.command.lengths.map((length) => {
    const lengthResult = run.results[length];
    const targetNames = Object.keys(lengthResult).sort();
    return [length, {
      targetNames,
      samples: sampleEvidence(lengthResult[targetNames[0]].seedRuns),
    }];
  }));
}

function sampleEvidence(seedRuns) {
  return seedRuns.map(({ seed, datasetChecksum, expectedDistanceChecksum }) => ({
    seed,
    datasetChecksum,
    expectedDistanceChecksum,
  }));
}
