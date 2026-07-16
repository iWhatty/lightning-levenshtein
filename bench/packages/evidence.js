import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const PACKAGES_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROMOTION_FILE = path.join(PACKAGES_DIR, "qualification/promotion.json");

export function loadPromotedBenchmark(promotionFile = PROMOTION_FILE) {
  const manifest = readJson(promotionFile);
  const sourceFile = resolveCheckedInSource(promotionFile, manifest.source?.path);
  const source = readJson(sourceFile);
  if (manifest.source.type === "qualification-aggregate") validateAggregateFiles(source);
  return normalizePromotedBenchmark(manifest, source, path.relative(PACKAGES_DIR, sourceFile));
}

export function normalizePromotedBenchmark(manifest, source, sourceLabel = "fixture") {
  validateManifest(manifest);
  if (manifest.source.type === "legacy-results") {
    validateLegacySource(manifest, source);
    return {
      ...source,
      meta: {
        ...source.meta,
        promotion: promotionMetadata(manifest, sourceLabel),
      },
    };
  }

  validateAggregateSource(manifest, source);
  const metric = manifest.presentation.metric;
  const lengths = source.command.lengths;
  const results = {};
  for (const length of lengths) {
    results[length] = {};
    for (const [name, entry] of Object.entries(source.results[length])) {
      const opsPerMs = entry.opsPerMs[metric];
      if (!Number.isFinite(opsPerMs) || opsPerMs <= 0) {
        throw new Error(`aggregate metric is invalid for ${name} at N=${length}`);
      }
      results[length][name] = {
        meanOpsPerMs: opsPerMs,
        meanOpsPerSec: opsPerMs * 1000,
      };
    }
  }

  return {
    meta: {
      generatedAt: source.generatedAt,
      pairs: source.command.pairs,
      durationMs: source.command.durationMs,
      warmRounds: source.command.warmRounds,
      lengths,
      seeds: source.command.seeds,
      unit: "ops/sec",
      primaryMetric: `${metric}OpsPerMs`,
      aggregation: `${metric} across paired seed samples from ${source.sourceRuns.length} complete runs`,
      runtime: source.sourceRuns[0].runtime,
      promotion: promotionMetadata(manifest, sourceLabel),
    },
    results,
  };
}

export function validateGeneratedClaims(lines, data) {
  const text = Array.isArray(lines) ? lines.join("\n") : String(lines);
  const promotion = data.meta?.promotion;
  if (!promotion) throw new Error("generated claims are missing promotion metadata");
  if (/\b(?:world(?:'s)? fastest|fastest in the world)\b/i.test(text)) {
    throw new Error("generated claims cannot make an unscoped world-fastest claim");
  }
  if (/highest mean throughput/i.test(text) && !/Node benchmark/i.test(text)) {
    throw new Error("throughput leadership claims must name the Node benchmark scope");
  }
  return true;
}

function validateManifest(manifest) {
  if (manifest?.schemaVersion !== 1) throw new TypeError("promotion manifest must use schema version 1");
  if (!/^[A-Za-z0-9._-]+$/.test(manifest.promotionId ?? "")) {
    throw new TypeError("promotion id is missing or unsafe");
  }
  if (!["legacy-results", "qualification-aggregate"].includes(manifest.source?.type)) {
    throw new TypeError("promotion source type is not supported");
  }
  if (!manifest.scope?.runtime || !manifest.scope?.workload || !manifest.scope?.target || !manifest.scope?.baseline) {
    throw new TypeError("promotion scope must name runtime, workload, target, and baseline");
  }
  if (manifest.scope.runtime !== "node") {
    throw new TypeError("README package benchmark promotions must use Node.js evidence");
  }
  if (manifest.scope.target !== "lightning-levenshtein-v2" ||
      manifest.scope.baseline !== "fastest-levenshtein") {
    throw new TypeError("README promotion target and baseline do not match the published comparison");
  }
  if (manifest.presentation?.metric !== "mean") {
    throw new TypeError("README presentation metric must currently be mean");
  }
  if (manifest.source.type === "qualification-aggregate" && manifest.status !== "qualified") {
    throw new TypeError("aggregate promotions must have qualified status");
  }
}

function validateLegacySource(manifest, source) {
  if (manifest.status !== "legacy") throw new TypeError("legacy results require legacy status");
  if (!source?.meta?.lengths || !source.results) throw new TypeError("legacy benchmark results are malformed");
  validateTargets(manifest, source.meta.lengths, source.results);
}

function validateAggregateSource(manifest, source) {
  if (source?.schemaVersion !== 1 || !source.command?.lengths || !source.results) {
    throw new TypeError("qualification aggregate is malformed");
  }
  if (source.workload !== manifest.scope.workload) {
    throw new Error(`aggregate workload ${source.workload} does not match promotion scope ${manifest.scope.workload}`);
  }
  if (source.baseline !== manifest.scope.baseline) {
    throw new Error(`aggregate baseline ${source.baseline} does not match promotion scope ${manifest.scope.baseline}`);
  }
  if (!Array.isArray(source.sourceRuns) || source.sourceRuns.length < 3) {
    throw new Error("qualification promotion requires at least three complete source runs");
  }
  if (source.command.verifyOnly) throw new Error("verification-only evidence cannot be promoted");

  const first = source.sourceRuns[0];
  if (typeof first.packageVersion !== "string" || !first.packageVersion ||
      !first.dependencyVersions || Object.keys(first.dependencyVersions).length === 0) {
    throw new Error("qualification source runs must identify package and dependency versions");
  }
  const runtimeSignature = JSON.stringify(first.runtime);
  const dependencySignature = JSON.stringify(first.dependencyVersions);
  const runIds = new Set();
  for (const run of source.sourceRuns) {
    if (runIds.has(run.runId)) throw new Error(`duplicate qualification run id: ${run.runId}`);
    runIds.add(run.runId);
    if (run.revision?.dirty || !run.revision?.commit || run.revision.commit === "unknown") {
      throw new Error(`source run ${run.runId} does not identify a clean revision`);
    }
    if (run.revision.commit !== first.revision.commit) {
      throw new Error("qualification source runs use different revisions");
    }
    if (JSON.stringify(run.runtime) !== runtimeSignature) {
      throw new Error("qualification source runs use different runtimes or machines");
    }
    if (run.packageVersion !== first.packageVersion ||
        JSON.stringify(run.dependencyVersions) !== dependencySignature) {
      throw new Error("qualification source runs use different package or dependency versions");
    }
  }
  if (!String(first.runtime?.node ?? "").startsWith("v")) {
    throw new Error("qualification runtime does not identify Node.js");
  }
  validateTargets(manifest, source.command.lengths, source.results);
}

export function validateAggregateFiles(source) {
  if (!Array.isArray(source.sourceFiles) || !Array.isArray(source.sourceRuns) ||
      source.sourceFiles.length !== source.sourceRuns.length) {
    throw new Error("qualification aggregate must identify every raw source file");
  }
  const root = path.resolve(PACKAGES_DIR, "../..");
  const seen = new Set();
  for (let index = 0; index < source.sourceFiles.length; index++) {
    const file = source.sourceFiles[index];
    if (seen.has(file)) throw new Error(`duplicate qualification raw source: ${file}`);
    seen.add(file);
    const resolved = path.resolve(root, file);
    if (!resolved.startsWith(`${root}${path.sep}`) || !fs.existsSync(resolved)) {
      throw new Error(`qualification raw source is missing or outside the repository: ${file}`);
    }
    const raw = readJson(resolved);
    if (raw.schemaVersion !== 2 || raw.meta?.runId !== source.sourceRuns[index].runId) {
      throw new Error(`qualification raw source does not match aggregate run: ${file}`);
    }
  }
}

function validateTargets(manifest, lengths, results) {
  for (const length of lengths) {
    const row = results[length];
    if (!row?.[manifest.scope.target]) throw new Error(`promotion target is missing at N=${length}`);
    if (!row?.[manifest.scope.baseline]) throw new Error(`promotion baseline is missing at N=${length}`);
  }
}

function promotionMetadata(manifest, sourceLabel) {
  return {
    id: manifest.promotionId,
    status: manifest.status,
    source: sourceLabel.replaceAll("\\", "/"),
    runtime: manifest.scope.runtime,
    workload: manifest.scope.workload,
    target: manifest.scope.target,
    baseline: manifest.scope.baseline,
    metric: manifest.presentation.metric,
  };
}

function resolveCheckedInSource(promotionFile, sourcePath) {
  if (!sourcePath || path.isAbsolute(sourcePath)) throw new TypeError("promotion source must be a relative path");
  const resolved = path.resolve(path.dirname(promotionFile), sourcePath);
  const relative = path.relative(PACKAGES_DIR, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("promotion source must remain inside bench/packages");
  }
  return resolved;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
