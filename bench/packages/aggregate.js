import { pairedRatios, summarize } from "../harness.js";

export function aggregateRuns(runs, baselineName = "fastest-levenshtein") {
  if (runs.length < 1) throw new TypeError("at least one raw run is required");
  for (const run of runs) validateRun(run);

  const signature = configurationSignature(runs[0]);
  for (const run of runs.slice(1)) {
    if (configurationSignature(run) !== signature) {
      throw new Error(`run ${run.meta.runId} uses a different benchmark configuration`);
    }
  }

  const lengths = runs[0].meta.command.lengths;
  const aggregate = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    baseline: baselineName,
    sourceRuns: runs.map((run) => ({
      runId: run.meta.runId,
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
    return target.seedRuns.map((sample, index) => ({
      key: `${run.meta.runId}:${sample.seed ?? run.meta.command.seeds[index]}`,
      value: sample.opsPerMs,
    }));
  });
}

function validateRun(run) {
  if (run?.schemaVersion !== 2 || !run.meta?.runId || !run.meta?.command || !run.results) {
    throw new TypeError("input is not a benchmark raw-run schema v2 document");
  }
  if (run.meta.command.verifyOnly) throw new TypeError("verification-only documents cannot be aggregated");
}

function configurationSignature(run) {
  const command = { ...run.meta.command };
  delete command.repetition;
  return JSON.stringify({ command, workload: run.meta.workload });
}
