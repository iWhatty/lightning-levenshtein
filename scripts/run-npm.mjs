import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

function verifiedNpmCli(candidate) {
  if (!candidate) return null;

  try {
    const cli = realpathSync(candidate);
    if (basename(cli) !== "npm-cli.js" || basename(dirname(cli)) !== "bin") {
      return null;
    }

    const packageRoot = dirname(dirname(cli));
    const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
    if (manifest.name !== "npm" || typeof manifest.bin?.npm !== "string") {
      return null;
    }

    return realpathSync(resolve(packageRoot, manifest.bin.npm)) === cli ? cli : null;
  } catch {
    return null;
  }
}

export function resolveNpmCli({
  env = process.env,
  nodePath = process.execPath,
  platform = process.platform,
} = {}) {
  const pathValue = platform === "win32"
    ? Object.entries(env).find(([key]) => key.toLowerCase() === "path")?.[1] ?? ""
    : env.PATH ?? "";
  const nodeDirectory = dirname(nodePath);
  const candidates = [
    env.npm_execpath,
    join(nodeDirectory, "node_modules", "npm", "bin", "npm-cli.js"),
    join(nodeDirectory, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ];

  for (const directory of pathValue.split(platform === "win32" ? ";" : ":").filter(Boolean)) {
    candidates.push(join(directory, "node_modules", "npm", "bin", "npm-cli.js"));
    if (platform !== "win32") candidates.push(join(directory, "npm"));
  }

  for (const candidate of candidates) {
    const cli = verifiedNpmCli(candidate);
    if (cli) return cli;
  }

  throw new Error(
    "npm CLI not found. Install npm with Node.js or put an npm installation on PATH; pnpm alone is not npm."
  );
}

export function runNpm(args, { cwd = process.cwd(), encoding } = {}) {
  return execFileSync(process.execPath, [resolveNpmCli(), ...args], {
    cwd,
    encoding,
    stdio: encoding ? ["ignore", "pipe", "pipe"] : "pipe",
  });
}
