import fs from "fs";
import path from "path";

import { stripArgumentSeparator, validateSafeName } from "../cli-arguments.js";
import { requireEvidenceDirectory, requireFileWithin, writeEvidenceReplace } from "../evidence-files.js";
import {
  normalizePromotedBenchmark,
  PACKAGES_DIR,
  PROMOTION_FILE,
  validateAggregateFiles,
} from "./evidence.js";

const options = parseArguments(stripArgumentSeparator(process.argv.slice(2)));
const aggregateDir = path.join(PACKAGES_DIR, "qualification/aggregates");
requireEvidenceDirectory(aggregateDir, PACKAGES_DIR);
const aggregateFile = requireFileWithin(
  path.resolve(options.aggregate),
  aggregateDir,
  "promotion aggregate"
);
const relativeSource = path.relative(path.dirname(PROMOTION_FILE), aggregateFile).replaceAll("\\", "/");
const aggregate = JSON.parse(fs.readFileSync(aggregateFile, "utf8"));
const manifest = {
  schemaVersion: 1,
  promotionId: options.id,
  status: "qualified",
  source: { type: "qualification-aggregate", path: relativeSource },
  scope: {
    runtime: "node",
    workload: aggregate.workload,
    target: "lightning-levenshtein-v2",
    baseline: "fastest-levenshtein",
  },
  presentation: { metric: options.metric },
};

const sourceRelativeToPackages = path.relative(PACKAGES_DIR, aggregateFile);
normalizePromotedBenchmark(manifest, aggregate, sourceRelativeToPackages);
validateAggregateFiles(aggregate);
requireEvidenceDirectory(path.dirname(PROMOTION_FILE), PACKAGES_DIR);
writeEvidenceReplace(PROMOTION_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Promoted ${options.id}; run pnpm run bench:packages:render to refresh checked-in outputs.`);

function parseArguments(args) {
  const values = Object.fromEntries(args.map((argument) => {
    const match = /^--([a-z-]+)=(.+)$/.exec(argument);
    if (!match) throw new Error(`invalid argument: ${argument}`);
    return [match[1], match[2]];
  }));
  const unknown = Object.keys(values).filter((key) => !["id", "aggregate"].includes(key));
  if (unknown.length) throw new Error(`unknown promotion argument: --${unknown[0]}`);
  if (!values.id || !values.aggregate) {
    throw new Error("Usage: node bench/packages/promote-aggregate.js --id=<id> --aggregate=<file>");
  }
  return {
    id: validateSafeName(values.id, "promotion id"),
    aggregate: values.aggregate,
    metric: "mean",
  };
}
