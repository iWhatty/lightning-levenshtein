import { execFileSync, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import { balancedTargetOrder, summarize } from "../bench/harness.js";
import { WORKLOAD_FAMILIES } from "../bench/workloads.js";
import { requireExternalOutputDirectory, writeEvidenceExclusive } from "../bench/evidence-files.js";
import { aggregateRuns } from "../bench/packages/aggregate.js";
import { normalizePromotedBenchmark } from "../bench/packages/evidence.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = [
  "lightning-levenshtein-v2", "lightning-levenshtein-v1", "fastest-levenshtein",
  "js-levenshtein", "leven", "levenshtein-edit-distance",
];

test("external synthetic collection keeps three clean repetitions; source edit remains visible", () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "benchmark-git-"));
  const repo = path.join(fixture, "repo");
  const external = path.join(fixture, "evidence");
  try {
    fs.mkdirSync(repo);
    fs.writeFileSync(path.join(repo, "source.js"), "export default 1;\n");
    git(repo, "init", "-q");
    git(repo, "add", "source.js");
    git(repo, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "commit", "-qm", "fixture");
    requireExternalOutputDirectory(external, repo);
    fs.mkdirSync(external);
    for (let repetition = 0; repetition < 3; repetition++) {
      expect(git(repo, "status", "--porcelain")).toBe("");
      const raw = rawRun(repetition);
      raw.meta.revision.commit = git(repo, "rev-parse", "HEAD");
      raw.meta.revision.dirty = git(repo, "status", "--porcelain") !== "";
      writeEvidenceExclusive(path.join(external, `${raw.meta.runId}.json`), JSON.stringify(raw));
    }
    expect(fs.readdirSync(external)).toHaveLength(3);
    expect(() => writeEvidenceExclusive(path.join(external, "run-0.json"), "overwrite"))
      .toThrow();
    expect(() => requireExternalOutputDirectory(path.join(repo, "raw"), repo)).toThrow("outside");
    const outsideAlias = path.join(fixture, "repo-alias");
    fs.symlinkSync(repo, outsideAlias, "junction");
    expect(() => requireExternalOutputDirectory(path.join(outsideAlias, "raw"), repo)).toThrow("outside");
    const insideAlias = path.join(repo, "external-alias");
    fs.symlinkSync(external, insideAlias, "junction");
    expect(() => requireExternalOutputDirectory(insideAlias, repo)).toThrow("outside");
    fs.writeFileSync(path.join(repo, "source.js"), "export default 2;\n");
    expect(git(repo, "status", "--porcelain")).not.toBe("");
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("diagnostic import and aggregation roundtrip keeps external routing out of evidence", () => {
  const fixture = createFixture();
  const external = fs.mkdtempSync(path.join(os.tmpdir(), "diagnostic-import-"));
  const stamp = `workflow-diagnostic-${Date.now()}-${process.pid}`;
  const runs = [0, 1, 2].map((index) => diagnosticRun(index, `${stamp}-${index}`));
  const sources = runs.map((run) => {
    const file = path.join(external, `${run.meta.runId}.json`);
    fs.writeFileSync(file, `${JSON.stringify(run)}\n`);
    return file;
  });
  const imported = runs.map((run) => path.join(fixture, "bench/diagnostics/results/raw", `${run.meta.runId}.json`));
  const aggregateFile = path.join(fixture, "bench/diagnostics/results/aggregates", `${stamp}.json`);
  try {
    expect(cliAt(fixture, "bench/import-runs.js", "--kind=diagnostics", ...sources).status).toBe(0);
    expect(cliAt(fixture, "bench/diagnostics/aggregate-runs.js", `--set=${stamp}`, ...imported).status).toBe(0);
    const aggregate = JSON.parse(fs.readFileSync(aggregateFile, "utf8"));
    expect(aggregate.sourceRuns.map((run) => run.runId)).toEqual(runs.map((run) => run.meta.runId));
    expect(aggregate.sourceFiles).toEqual(imported.map((file) => path.relative(fixture, file).replaceAll("\\", "/")));
    expect(aggregate.results["random-ascii"][8].v2.opsPerMs.count).toBe(6);
    expect(cliAt(fixture, "bench/diagnostics/aggregate-runs.js", `--set=${stamp}`, ...imported).status).not.toBe(0);
  } finally {
    fs.rmSync(external, { recursive: true, force: true });
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("promotion CLI refuses aggregate outside qualification directory without writing manifest", () => {
  const fixture = createFixture();
  const external = fs.mkdtempSync(path.join(os.tmpdir(), "outside-aggregate-"));
  const outsideFile = path.join(external, "aggregate.json");
  const manifestFile = path.join(fixture, "bench/packages/qualification/promotion.json");
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, "fixture manifest\n");
  const before = fs.readFileSync(manifestFile, "utf8");
  try {
    fs.writeFileSync(outsideFile, "{}\n");
    expect(cliAt(fixture, "bench/packages/promote-aggregate.js", "--id=outside-fixture", `--aggregate=${outsideFile}`).status)
      .not.toBe(0);
    expect(fs.readFileSync(manifestFile, "utf8")).toBe(before);
  } finally {
    fs.rmSync(external, { recursive: true, force: true });
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("legacy promotion cannot bypass raw validation through aggregate directory", () => {
  const fixture = createFixture();
  const aggregateDir = path.join(fixture, "bench/packages/qualification/aggregates");
  const manifestFile = path.join(fixture, "bench/packages/qualification/promotion.json");
  try {
    fs.mkdirSync(aggregateDir, { recursive: true });
    fs.copyFileSync(path.join(ROOT, "bench/packages/results.json"), path.join(aggregateDir, "forged.json"));
    const legacyManifest = manifest();
    legacyManifest.status = "legacy";
    legacyManifest.source = { type: "legacy-results", path: "aggregates/forged.json" };
    fs.writeFileSync(manifestFile, `${JSON.stringify(legacyManifest)}\n`);
    const result = loadPromotionInFixture(fixture);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("legacy promotion source must be ../results.json");
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test.each([
  ["packages", "bench/packages/qualification/raw", "bench/packages/qualification/aggregates", "bench/packages/aggregate-runs.js", rawRun],
  ["diagnostics", "bench/diagnostics/results/raw", "bench/diagnostics/results/aggregates", "bench/diagnostics/aggregate-runs.js", diagnosticRun],
])("%s aggregation refuses symlinked output directory without outside write", (
  kind, rawRelative, aggregateRelative, script, makeRun
) => {
  const fixture = createFixture();
  const external = fs.mkdtempSync(path.join(os.tmpdir(), `aggregate-output-${kind}-`));
  const rawDir = path.join(fixture, rawRelative);
  const aggregateDir = path.join(fixture, aggregateRelative);
  const run = makeRun(0, `symlink-${kind}-run`);
  const rawFile = path.join(rawDir, `${run.meta.runId}.json`);
  try {
    fs.mkdirSync(rawDir, { recursive: true });
    fs.mkdirSync(path.dirname(aggregateDir), { recursive: true });
    fs.writeFileSync(rawFile, `${JSON.stringify(run)}\n`);
    fs.symlinkSync(external, aggregateDir, "junction");
    const result = cliAt(fixture, script, `--set=symlink-${kind}-set`, rawFile);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("evidence directory is outside repository");
    expect(fs.readdirSync(external)).toEqual([]);
  } finally {
    if (fs.existsSync(aggregateDir)) fs.unlinkSync(aggregateDir);
    fs.rmSync(fixture, { recursive: true, force: true });
    fs.rmSync(external, { recursive: true, force: true });
  }
});

test("measured runners reject missing or in-checkout output before timing", () => {
  expect(cli("bench/packages/run-bench.js", "--lengths=8", "--seeds=1", "--pairs=1").status).not.toBe(0);
  expect(cli("bench/diagnostics/run-workload-matrix.js", "--measure", "--lengths=8", "--seeds=1", "--pairs=1").status).not.toBe(0);
  expect(cli("bench/packages/run-bench.js", `--out-dir=${path.join(ROOT, "evidence")}`).status).not.toBe(0);
  expect(cli("bench/packages/run-bench.js", "--seeds=1,1").stderr).toContain("duplicate values");
  expect(cli("bench/diagnostics/run-workload-matrix.js", "--measure", "--lengths=8,8").stderr)
    .toContain("duplicate values");
});

test("import validates complete batch, keeps run IDs, refuses collisions and aliases", () => {
  const fixture = createFixture();
  const external = fs.mkdtempSync(path.join(os.tmpdir(), "benchmark-import-"));
  const stamp = `workflow-${Date.now()}-${process.pid}`;
  const runs = [0, 1, 2].map((index) => rawRun(index, `${stamp}-${index}`));
  const sources = runs.map((run) => {
    const file = path.join(external, `${run.meta.runId}.json`);
    fs.writeFileSync(file, `${JSON.stringify(run)}\n`);
    return file;
  });
  const imported = runs.map((run) => path.join(fixture, "bench/packages/qualification/raw", `${run.meta.runId}.json`));
  try {
    const bad = path.join(external, "bad.json");
    fs.writeFileSync(bad, "{bad json");
    expect(cliAt(fixture, "bench/import-runs.js", "--kind=packages", sources[0], bad).status).not.toBe(0);
    expect(imported.some((file) => fs.existsSync(file))).toBe(false);
    expect(cliAt(fixture, "bench/import-runs.js", "--kind=packages", sources[0], sources[0]).status).not.toBe(0);
    expect(cliAt(fixture, "bench/import-runs.js", "--kind=packages", ...sources).status).toBe(0);
    expect(imported.map((file) => JSON.parse(fs.readFileSync(file, "utf8")).meta.runId))
      .toEqual(runs.map((run) => run.meta.runId));
    expect(cliAt(fixture, "bench/import-runs.js", "--kind=packages", ...sources).status).not.toBe(0);
  } finally {
    fs.rmSync(external, { recursive: true, force: true });
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("promotion recomputes every semantic field from three actual raw files", () => {
  const fixture = createFixture();
  const stamp = `workflow-${Date.now()}-${process.pid}`;
  const runs = [0, 1, 2].map((index) => rawRun(index, `${stamp}-${index}`));
  const files = runs.map((run) => path.join(fixture, "bench/packages/qualification/raw", `${run.meta.runId}.json`));
  fs.mkdirSync(path.dirname(files[0]), { recursive: true });
  try {
    for (let index = 0; index < runs.length; index++) {
      writeEvidenceExclusive(files[index], `${JSON.stringify(runs[index])}\n`);
    }
    const aggregate = aggregateRuns(runs);
    aggregate.sourceFiles = files.map((file) => path.relative(fixture, file).replaceAll("\\", "/"));
    expect(validateInFixture(fixture, aggregate).status).toBe(0);
    expect(normalizePromotedBenchmark(manifest(), aggregate).results[8][TARGETS[0]].meanOpsPerMs)
      .toBeGreaterThan(0);

    const repeatedRuns = [0, 1, 2].map((index) => rawRun(0, `repeated-${index}`));
    expect(() => normalizePromotedBenchmark(manifest(), aggregateRuns(repeatedRuns)))
      .toThrow("duplicate qualification repetition");

    for (const mutate of [
      (copy) => { copy.results[8][TARGETS[0]].opsPerMs.mean += 1; },
      (copy) => { copy.results[8][TARGETS[0]].ratioToBaseline.mean += 1; },
      (copy) => { copy.results[8][TARGETS[0]].opsPerMs.count += 1; },
      (copy) => { copy.command.pairs += 1; },
      (copy) => { copy.sourceRuns[0].revision.commit = "edited"; },
      (copy) => { copy.workload = "edited"; },
    ]) {
      const edited = structuredClone(aggregate);
      mutate(edited);
      expect(validateInFixture(fixture, edited).stderr).toContain("recomputed raw evidence");
    }

    const missing = structuredClone(aggregate);
    missing.sourceFiles[0] = "bench/packages/qualification/raw/missing.json";
    expect(validateInFixture(fixture, missing).stderr).toContain("missing or outside");
    const escaped = structuredClone(aggregate);
    escaped.sourceFiles[0] = "../../outside.json";
    expect(validateInFixture(fixture, escaped).stderr).toContain("missing or outside");
    const duplicate = structuredClone(aggregate);
    duplicate.sourceFiles[1] = duplicate.sourceFiles[0];
    expect(validateInFixture(fixture, duplicate).stderr).toContain("duplicate qualification raw source");
    const alias = structuredClone(aggregate);
    alias.sourceFiles[1] = `bench/packages/qualification/raw/../raw/${path.basename(files[0])}`;
    expect(validateInFixture(fixture, alias).stderr).toContain("duplicate qualification raw source");
    const singleAlias = structuredClone(aggregate);
    singleAlias.sourceFiles[0] = `bench/packages/qualification/raw/../raw/${path.basename(files[0])}`;
    expect(validateInFixture(fixture, singleAlias).stderr).toContain("aliased qualification raw source");

    const tampered = structuredClone(runs[0]);
    tampered.results[8][TARGETS[0]].seedRuns[0].calls += 10;
    fs.writeFileSync(files[0], JSON.stringify(tampered));
    expect(validateInFixture(fixture, aggregate).status).not.toBe(0);
    const consistentTamper = structuredClone(runs[0]);
    const measurement = consistentTamper.results[8][TARGETS[0]].seedRuns[0];
    measurement.calls += 10;
    measurement.opsPerMs = measurement.calls / measurement.elapsed;
    measurement.opsPerSec = measurement.opsPerMs * 1000;
    const target = consistentTamper.results[8][TARGETS[0]];
    target.meanOpsPerMs = summarize(target.seedRuns.map((sample) => sample.opsPerMs)).mean;
    target.meanOpsPerSec = summarize(target.seedRuns.map((sample) => sample.opsPerSec)).mean;
    target.medianOpsPerMs = summarize(target.seedRuns.map((sample) => sample.opsPerMs)).median;
    target.medianOpsPerSec = summarize(target.seedRuns.map((sample) => sample.opsPerSec)).median;
    fs.writeFileSync(files[0], JSON.stringify(consistentTamper));
    expect(validateInFixture(fixture, aggregate).stderr).toContain("recomputed raw evidence");
    fs.writeFileSync(files[0], "{malformed");
    expect(validateInFixture(fixture, aggregate).status).not.toBe(0);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function cli(script, ...args) {
  return cliAt(ROOT, script, ...args);
}

function cliAt(root, script, ...args) {
  return spawnSync(process.execPath, [path.join(root, script), ...args], { cwd: root, encoding: "utf8" });
}

function validateInFixture(fixture, aggregate) {
  return spawnSync(process.execPath, [
    "--input-type=module", "-e",
    "import fs from 'fs'; const { validateAggregateFiles } = await import('./bench/' + 'packages/evidence.js'); validateAggregateFiles(JSON.parse(fs.readFileSync(0, 'utf8')));",
  ], { cwd: fixture, encoding: "utf8", input: JSON.stringify(aggregate) });
}

function loadPromotionInFixture(fixture) {
  return spawnSync(process.execPath, [
    "--input-type=module", "-e",
    "import { loadPromotedBenchmark } from './bench/packages/evidence.js'; loadPromotedBenchmark();",
  ], { cwd: fixture, encoding: "utf8" });
}

function createFixture() {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "benchmark-fixture-"));
  const sourceFiles = [
    "bench/data.js", "bench/harness.js", "bench/run-evidence.js", "bench/workloads.js",
    "bench/cli-arguments.js", "bench/evidence-files.js", "bench/import-runs.js",
    "bench/packages/aggregate.js", "bench/packages/aggregate-runs.js",
    "bench/packages/evidence.js", "bench/packages/promote-aggregate.js",
    "bench/diagnostics/aggregate.js", "bench/diagnostics/aggregate-runs.js",
  ];
  fs.writeFileSync(path.join(fixture, "package.json"), "{\"type\":\"module\"}\n");
  for (const relative of sourceFiles) {
    const target = path.join(fixture, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(ROOT, relative), target);
  }
  return fixture;
}

function manifest() {
  return {
    schemaVersion: 1, promotionId: "workflow-fixture", status: "qualified",
    source: { type: "qualification-aggregate", path: "aggregates/fixture.json" },
    scope: {
      runtime: "node", workload: "random-equal-length-ascii",
      target: TARGETS[0], baseline: "fastest-levenshtein",
    },
    presentation: { metric: "mean" },
  };
}

function rawRun(repetition, runId = `run-${repetition}`) {
  const seeds = [1, 2];
  const results = Object.fromEntries(TARGETS.map((target, targetIndex) => {
    const seedRuns = seeds.map((seed, seedIndex) => {
      const calls = 20 + targetIndex * 10 + seedIndex * 10 + repetition * 10;
      const elapsed = 10;
      return {
        seed, orderPosition: balancedTargetOrder(TARGETS, seed ^ 8, repetition).indexOf(target),
        datasetChecksum: seed.toString(16).padStart(8, "0"),
        expectedDistanceChecksum: (seed + 2).toString(16).padStart(8, "0"),
        calls, elapsed, opsPerMs: calls / elapsed, opsPerSec: calls / elapsed * 1000,
        timedChecksum: 0,
      };
    });
    return [target, {
      seedRuns,
      meanOpsPerMs: summarize(seedRuns.map((sample) => sample.opsPerMs)).mean,
      meanOpsPerSec: summarize(seedRuns.map((sample) => sample.opsPerSec)).mean,
      medianOpsPerMs: summarize(seedRuns.map((sample) => sample.opsPerMs)).median,
      medianOpsPerSec: summarize(seedRuns.map((sample) => sample.opsPerSec)).median,
    }];
  }));
  return {
    schemaVersion: 2,
    meta: {
      runId, generatedAt: "2026-10-05T00:00:00.000Z",
      revision: { commit: "abc123", dirty: false },
      packageVersion: "0.0.6",
      dependencyVersions: Object.fromEntries(TARGETS.slice(2).map((name) => [name, "1.0.0"])),
      command: {
        lengths: [8], seeds, pairs: 2, durationMs: 1, warmRounds: 0,
        repetition, verifyOnly: false,
      },
      alphabet: "abc", workload: "random-equal-length-ascii", unit: "ops/sec",
      primaryMetric: "meanOpsPerMs",
      aggregation: "arithmetic mean across seeds within one complete-suite repetition",
      baseline: "fastest-levenshtein",
      runtime: {
        node: "v24.0.0", v8: "fixture", platform: "win32", release: "fixture",
        arch: "x64", cpu: "fixture", logicalCores: 8,
      },
      protocol: { targetOrder: "fixture", warmup: "fixture", batching: "fixture", timerOverrun: "fixture", resultConsumption: "fixture" },
    },
    results: { 8: results },
  };
}

function diagnosticRun(repetition, runId) {
  const targets = [
    "default", "v2", "unicode", "profile-code-unit-throw", "profile-ascii-throw",
    "profile-ascii-assume-valid", "profile-latin1-throw", "profile-latin1-assume-valid",
  ];
  const seeds = [1, 2];
  const seedRuns = seeds.map((seed, seedIndex) => {
    const measurements = Object.fromEntries(targets.map((target, targetIndex) => {
      const calls = 20 + seedIndex * 10 + targetIndex * 10 + repetition * 10;
      return [target, { calls, elapsed: 10, opsPerMs: calls / 10, timedChecksum: 0 }];
    }));
    return {
      seed, datasetChecksum: seed.toString(16).padStart(8, "0"),
      expectedDistanceChecksum: (seed + 2).toString(16).padStart(8, "0"),
      targetOrder: targets, measurements,
    };
  });
  return {
    schemaVersion: 1,
    meta: {
      runId, generatedAt: "2026-10-05T00:00:00.000Z",
      revision: { commit: "abc123", dirty: false }, mode: "measure",
      command: {
        families: ["random-ascii"], lengths: [8], seeds, pairs: 2, durationMs: 1,
        warmRounds: 0, repetition, measure: true, runId: null,
      },
      families: { "random-ascii": WORKLOAD_FAMILIES["random-ascii"] },
      runtime: {
        node: "v24.0.0", v8: "fixture", platform: "win32", release: "fixture",
        arch: "x64", cpu: "fixture", logicalCores: 8,
      },
      protocol: {
        factoryConstruction: "fixture", targetOrder: "fixture", warmup: "fixture",
        batching: "fixture", resultConsumption: "fixture",
      },
    },
    results: { "random-ascii": { 8: {
      seeds: seedRuns,
      summary: Object.fromEntries(targets.map((target) => [target,
        summarize(seedRuns.map((run) => run.measurements[target].opsPerMs))])),
    } } },
  };
}
