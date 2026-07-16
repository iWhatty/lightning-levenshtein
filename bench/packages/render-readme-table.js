// bench/packages/render-readme-table.js

import fs from "fs";
import path from "path";
import { loadPromotedBenchmark, validateGeneratedClaims } from "./evidence.js";

const OUT_FILE = path.resolve("bench/packages/README-benchmark.md");
const README_FILE = path.resolve("README.md");
const START_MARKER = "<!-- benchmark-table:start -->";
const END_MARKER = "<!-- benchmark-table:end -->";
const HIGHLIGHTS_START_MARKER = "<!-- benchmark-highlights:start -->";
const HIGHLIGHTS_END_MARKER = "<!-- benchmark-highlights:end -->";
const ENVIRONMENT_START_MARKER = "<!-- benchmark-environment:start -->";
const ENVIRONMENT_END_MARKER = "<!-- benchmark-environment:end -->";

const data = loadPromotedBenchmark();
const lengths = data.meta.lengths;

const targetNames = Object.keys(data.results[lengths[0]]);

const fmt = (n) => {
  if (n >= 1000) return Number(n.toFixed(0)).toString();
  if (n >= 100) return n.toFixed(1);
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(3);
};

const lines = [];

lines.push("## Benchmark");
lines.push("");
lines.push(
  `I generated ${data.meta.pairs} pairs of strings with length N. I measured the throughput each library achieved across the same dataset. Higher is better.`
);
lines.push("");
lines.push(
  `Reported values are mean ops/ms across ${data.meta.seeds.length} seeds.`
);
lines.push("");

const runtime = data.meta.runtime;
const environmentLine = runtime
  ? `Node ${runtime.node} on ${runtime.platform} ${runtime.arch}, ${runtime.cpu}.`
  : "Runtime details were not recorded for this benchmark run.";

lines.push(environmentLine);
lines.push("");

const tableLines = [];

tableLines.push(
  `| Test Target | ${lengths.map((n) => `N=${n}`).join(" | ")} |`
);
tableLines.push(
  `|---|${lengths.map(() => "---:").join("|")}|`
);

for (const name of targetNames) {
  const row = lengths.map((len) =>
    fmt(data.results[len][name].meanOpsPerMs)
  );
  tableLines.push(`| ${name} | ${row.join(" | ")} |`);
}

lines.push(...tableLines);
lines.push("");

const fastestName = "lightning-levenshtein-v2";
lines.push("## Relative Performance");
lines.push("");
lines.push(
  `This chart shows how many times faster ${fastestName} is than the second-fastest package at each tested length.`
);
lines.push("");

fs.writeFileSync(OUT_FILE, lines.join("\n"), "utf8");

const readme = fs.readFileSync(README_FILE, "utf8");
const generatedBlock = [
  START_MARKER,
  "**Mean ops/ms:**",
  "",
  ...tableLines,
  "",
  END_MARKER,
].join("\n");

let updatedReadme = replaceMarkedBlock(
  readme,
  START_MARKER,
  END_MARKER,
  generatedBlock
);

const baselineName = "fastest-levenshtein";
const winningLengths = lengths.filter((len) => {
  const row = data.results[len];
  const leader = Object.entries(row)
    .sort(([, a], [, b]) => b.meanOpsPerMs - a.meanOpsPerMs)[0][0];
  return leader === fastestName;
});

const highlightLines = [
  HIGHLIGHTS_START_MARKER,
  winningLengths.length === lengths.length
    ? `- \`${fastestName}\` records the highest mean throughput in this checked-in Node benchmark at every tested length.`
    : `- \`${fastestName}\` leads at ${winningLengths.length} of ${lengths.length} tested lengths.`,
  `- Winning lengths: ${winningLengths.map((len) => `\`N=${len}\``).join(", ")}.`,
  ...[1024, 32, 8].map((len) => {
    const row = data.results[len];
    return `- At \`N=${len}\`, mean throughput is **${fmt(row[fastestName].meanOpsPerMs)} ops/ms** versus **${fmt(row[baselineName].meanOpsPerMs)} ops/ms** for \`${baselineName}\`.`;
  }),
  HIGHLIGHTS_END_MARKER,
];

validateGeneratedClaims(highlightLines, data);

updatedReadme = replaceMarkedBlock(
  updatedReadme,
  HIGHLIGHTS_START_MARKER,
  HIGHLIGHTS_END_MARKER,
  highlightLines.join("\n")
);

const environmentBlock = [
  ENVIRONMENT_START_MARKER,
  `${environmentLine} Results generated ${data.meta.generatedAt.slice(0, 10)}.`,
  ENVIRONMENT_END_MARKER,
].join("\n");

updatedReadme = replaceMarkedBlock(
  updatedReadme,
  ENVIRONMENT_START_MARKER,
  ENVIRONMENT_END_MARKER,
  environmentBlock
);

fs.writeFileSync(README_FILE, updatedReadme, "utf8");

console.log(`Wrote ${OUT_FILE} and refreshed README benchmark data`);

function replaceMarkedBlock(content, startMarker, endMarker, replacement) {
  const blockStart = content.indexOf(startMarker);
  const blockEnd = content.indexOf(endMarker);

  if (blockStart < 0 || blockEnd < blockStart) {
    throw new Error(`Missing or invalid README markers: ${startMarker}`);
  }

  return (
    content.slice(0, blockStart) +
    replacement +
    content.slice(blockEnd + endMarker.length)
  );
}
