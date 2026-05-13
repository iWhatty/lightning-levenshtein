import { execFileSync } from "node:child_process";

const trackedBuildOutputs = [
  "bench/lightning-levenshtein-v2.min.js",
  "dist"
];

const git = (args) =>
  execFileSync(
    "git",
    [
      "-c",
      `safe.directory=${process.cwd()}`,
      "-c",
      "core.autocrlf=false",
      ...args
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8"
    }
  );

try {
  git(["diff", "--exit-code", "--", ...trackedBuildOutputs]);
  console.log("tracked build artifacts are up to date");
} catch (err) {
  const stat = git(["diff", "--stat", "--", ...trackedBuildOutputs]);
  throw new Error(
    `Tracked build artifacts changed after build. Commit rebuilt outputs.\n${stat}`
  );
}
