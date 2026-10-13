import { existsSync, readFileSync, readdirSync } from "node:fs";

import { validateRepositoryPolicy } from "./repository-policy.mjs";

const workflowsDirectory = ".github/workflows";
const workflowFiles = existsSync(workflowsDirectory)
  ? readdirSync(workflowsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => `${workflowsDirectory}/${entry.name}`)
  : [];
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const npmrcContents = existsSync(".npmrc") ? readFileSync(".npmrc", "utf8") : null;
const failures = validateRepositoryPolicy({
  workflowFiles,
  hasPnpmLock: existsSync("pnpm-lock.yaml"),
  hasPackageLock: existsSync("package-lock.json"),
  packageManager: pkg.packageManager,
  npmrcContents,
});

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("repository policy smoke check passed");
}
