import { pairedRatios, summarize } from "../harness.js";
import {
  assertChecksum, assertCompatibleRuns, assertExactMembers, assertInteger,
  assertMeasurement, assertPositiveNumber, assertProvenance, assertRecord,
  assertString, assertUniqueList, assertUniqueRunIds,
} from "../run-evidence.js";
import { WORKLOAD_FAMILIES } from "../workloads.js";

// Mirrors domain target identities from targets.js without importing runtime kernels.
const UNIVERSAL = ["v2", "unicode", "profile-code-unit-throw"];
const LATIN1 = ["profile-latin1-throw", "profile-latin1-assume-valid"];
const TARGETS_BY_DOMAIN = {
  ascii: ["default", ...UNIVERSAL, "profile-ascii-throw", "profile-ascii-assume-valid", ...LATIN1],
  latin1: ["default", ...UNIVERSAL, ...LATIN1],
  bmp: UNIVERSAL,
};

export function aggregateDiagnosticRuns(runs, baselineName = "v2") {
  if (runs.length < 1) throw new TypeError("at least one diagnostic raw run is required");
  for (const run of runs) validateRun(run);

  assertUniqueRunIds(runs, (run) => run.meta.runId, "raw run");
  assertCompatibleRuns(
    runs,
    configurationSignature,
    (run) => `run ${run.meta.runId} uses different diagnostic evidence`
  );

  const aggregate = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    baseline: baselineName,
    sourceRuns: runs.map((run) => ({
      runId: run.meta.runId,
      generatedAt: run.meta.generatedAt,
      revision: run.meta.revision,
      runtime: run.meta.runtime,
    })),
    command: runs[0].meta.command,
    families: runs[0].meta.families,
    results: {},
  };

  for (const [family, lengths] of Object.entries(runs[0].results)) {
    aggregate.results[family] = {};
    for (const [length, result] of Object.entries(lengths)) {
      const baselineSamples = collectSamples(runs, family, length, baselineName);
      const targetNames = Object.keys(result.seeds[0].measurements);
      aggregate.results[family][length] = {};

      for (const targetName of targetNames) {
        const samples = collectSamples(runs, family, length, targetName);
        if (samples.some((sample, index) => sample.key !== baselineSamples[index].key)) {
          throw new Error(`${targetName} has unpaired samples for ${family} length ${length}`);
        }

        const values = samples.map((sample) => sample.value);
        const baselineValues = baselineSamples.map((sample) => sample.value);
        aggregate.results[family][length][targetName] = {
          opsPerMs: summarize(values),
          ratioToBaseline: summarize(pairedRatios(values, baselineValues)),
        };
      }
    }
  }

  return aggregate;
}

function collectSamples(runs, family, length, targetName) {
  return runs.flatMap((run) => {
    const result = run.results[family]?.[length];
    if (!result) throw new Error(`${family} length ${length} is missing from ${run.meta.runId}`);
    return result.seeds.map((seedResult) => {
      const measurement = seedResult.measurements[targetName];
      if (!measurement || !Number.isFinite(measurement.opsPerMs) || measurement.opsPerMs <= 0) {
        throw new Error(`${targetName} has no valid measurement for ${family} length ${length}`);
      }
      return { key: `${run.meta.runId}:${seedResult.seed}`, value: measurement.opsPerMs };
    });
  });
}

function validateRun(run) {
  if (run?.schemaVersion !== 1 || !run.meta || !run.results) {
    throw new TypeError("input is not a measured diagnostic raw-run schema v1 document");
  }
  const meta = assertRecord(run.meta, "diagnostic metadata");
  if (meta.mode !== "measure") throw new TypeError("verification-only documents cannot be aggregated");
  assertProvenance(meta, "diagnostic");
  const command = assertRecord(meta.command, "diagnostic command");
  if (command.measure !== true) throw new TypeError("verification-only documents cannot be aggregated");
  assertUniqueList(command.families, "diagnostic families", (value) => assertString(value, "diagnostic family"));
  assertUniqueList(command.lengths, "diagnostic lengths", (value) => assertInteger(value, "diagnostic length"));
  assertUniqueList(command.seeds, "diagnostic seeds", (value) => assertInteger(value, "diagnostic seed"));
  assertInteger(command.pairs, "diagnostic pairs", 1);
  assertPositiveNumber(command.durationMs, "diagnostic durationMs");
  assertInteger(command.warmRounds, "diagnostic warmRounds");
  assertInteger(command.repetition, "diagnostic repetition");
  const families = assertRecord(meta.families, "diagnostic family definitions");
  assertExactMembers(Object.keys(families), command.families, "diagnostic family definitions");
  for (const family of command.families) {
    if (!WORKLOAD_FAMILIES[family] ||
        JSON.stringify(families[family]) !== JSON.stringify(WORKLOAD_FAMILIES[family])) {
      throw new Error(`${family} has an invalid diagnostic family definition`);
    }
  }
  assertRecord(run.results, "diagnostic results");
  validateEvidenceShape(run);
}

function configurationSignature(run) {
  const command = { ...run.meta.command };
  delete command.repetition;
  delete command.runId;
  delete command.outDir;
  return JSON.stringify({
    command,
    families: run.meta.families,
    revision: run.meta.revision,
    runtime: run.meta.runtime,
    protocol: run.meta.protocol,
    evidence: evidenceShape(run),
  });
}

function evidenceShape(run) {
  return Object.fromEntries(Object.entries(run.results).map(([family, lengths]) => [
    family,
    Object.fromEntries(Object.entries(lengths).map(([length, result]) => [
      length,
      result.seeds.map((seedResult) => ({
        seed: seedResult.seed,
        datasetChecksum: seedResult.datasetChecksum,
        expectedDistanceChecksum: seedResult.expectedDistanceChecksum,
        targets: Object.keys(seedResult.measurements).sort(),
      })),
    ])),
  ]));
}

function validateEvidenceShape(run) {
  const { families, lengths, seeds } = run.meta.command;
  assertExactMembers(Object.keys(run.results), families, "diagnostic result families");
  for (const family of families) {
    const familyResults = assertRecord(run.results[family], `${family} results`);
    assertExactMembers(Object.keys(familyResults), lengths.map(String), `${family} lengths`);
    const targets = TARGETS_BY_DOMAIN[run.meta.families[family].domain];
    for (const length of lengths) {
      const result = assertRecord(familyResults[length], `${family} length ${length}`);
      if (!Array.isArray(result.seeds)) throw new TypeError(`${family} length ${length} seeds must be an array`);
      assertExactMembers(result.seeds.map((entry) => entry?.seed), seeds, `${family} length ${length} seeds`);
      if (result.seeds.some((entry, index) => entry.seed !== seeds[index])) {
        throw new Error(`${family} length ${length} does not follow configured seed order`);
      }
      for (const seedResult of result.seeds) {
        const label = `${family} length ${length} seed ${seedResult.seed}`;
        assertRecord(seedResult, label);
        assertChecksum(seedResult.datasetChecksum, `${label} datasetChecksum`);
        assertChecksum(seedResult.expectedDistanceChecksum, `${label} expectedDistanceChecksum`);
        assertExactMembers(seedResult.targetOrder, targets, `${label} targetOrder`);
        const measurements = assertRecord(seedResult.measurements, `${label} measurements`);
        assertExactMembers(Object.keys(measurements), targets, `${label} targets`);
        for (const name of targets) assertMeasurement(measurements[name], `${label} ${name}`);
      }
    }
  }
}
