import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const workspaceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const DEFAULT_TYPESCRIPT_COMPILER_PATH = resolve(
  workspaceRoot,
  "node_modules/typescript/bin/tsc"
);

export function runTypeScriptProject({
  cwd,
  project,
  label,
  compilerPath = DEFAULT_TYPESCRIPT_COMPILER_PATH,
}) {
  const result = spawnSync(
    process.execPath,
    [compilerPath, "--project", project, "--noEmit", "--pretty", "false"],
    {
      cwd,
      stdio: "inherit",
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.signal) {
    throw new Error(
      `${label} failed: TypeScript compiler terminated by signal ${result.signal}`
    );
  }

  if (result.status !== 0) {
    throw new Error(
      `${label} failed: TypeScript compiler exited with status ${result.status}`
    );
  }

  return result;
}
