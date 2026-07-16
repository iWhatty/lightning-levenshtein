import fs from "fs";
import path from "path";

import {
  normalizePromotedBenchmark,
  PACKAGES_DIR,
  PROMOTION_FILE,
  validateAggregateFiles,
} from "./evidence.js";

const options = parseArguments(process.argv.slice(2));
const aggregateFile = path.resolve(options.aggregate);
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
if (sourceRelativeToPackages.startsWith("..") || path.isAbsolute(sourceRelativeToPackages)) {
  throw new Error("aggregate must be inside bench/packages");
}
normalizePromotedBenchmark(manifest, aggregate, sourceRelativeToPackages);
validateAggregateFiles(aggregate);
fs.writeFileSync(PROMOTION_FILE, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
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
  if (!/^[A-Za-z0-9._-]+$/.test(values.id)) throw new TypeError("promotion id contains unsafe characters");
  return {
    id: values.id,
    aggregate: values.aggregate,
    metric: "mean",
  };
}
