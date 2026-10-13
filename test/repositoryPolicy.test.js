import { validateRepositoryPolicy } from "../scripts/repository-policy.mjs";

const healthy = {
  workflowFiles: [".github/workflows/ci.yml.disabled"],
  hasPnpmLock: true,
  hasPackageLock: false,
  packageManager: "pnpm@10.33.1",
  npmrcContents: null,
};

describe("repository policy", () => {
  test("accepts the maintained local-CI shape", () => {
    expect(validateRepositoryPolicy(healthy)).toEqual([]);
  });

  test("rejects enabled or missing GitHub Actions workflows", () => {
    const enabled = {
      ...healthy,
      workflowFiles: [".github/workflows/ci.yml.disabled", ".github/workflows/ci.yml"],
    };
    expect(validateRepositoryPolicy(enabled)).toContain(
      "active GitHub Actions workflow is forbidden by local-CI policy: .github/workflows/ci.yml"
    );
    expect(validateRepositoryPolicy({ ...healthy, workflowFiles: [] })).toContain(
      "required disabled workflow is missing: .github/workflows/ci.yml.disabled"
    );
  });

  test("rejects lockfile, package-manager, and credential drift", () => {
    const failures = validateRepositoryPolicy({
      ...healthy,
      hasPnpmLock: false,
      hasPackageLock: true,
      packageManager: "npm@11",
      npmrcContents: "//registry.npmjs.org/:_authToken=npm_secret",
    });

    expect(failures).toEqual([
      "pnpm-lock.yaml is required",
      "package-lock.json must not be committed",
      "package.json packageManager must pin an exact pnpm version",
      "repository .npmrc must not contain npm credentials",
    ]);
  });
});
