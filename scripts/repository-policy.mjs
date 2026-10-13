const DISABLED_WORKFLOW = ".github/workflows/ci.yml.disabled";
const ACTIVE_WORKFLOW_PATTERN = /^\.github\/workflows\/.*\.ya?ml$/i;
const NPM_CREDENTIAL_PATTERN = /(?:_authToken|_auth|password)\s*=|\bnpm_[A-Za-z0-9_-]+/i;

export function validateRepositoryPolicy({
  workflowFiles,
  hasPnpmLock,
  hasPackageLock,
  packageManager,
  npmrcContents,
}) {
  const failures = [];

  if (!workflowFiles.includes(DISABLED_WORKFLOW)) {
    failures.push(`required disabled workflow is missing: ${DISABLED_WORKFLOW}`);
  }

  for (const workflow of workflowFiles) {
    if (ACTIVE_WORKFLOW_PATTERN.test(workflow)) {
      failures.push(`active GitHub Actions workflow is forbidden by local-CI policy: ${workflow}`);
    }
  }

  if (!hasPnpmLock) failures.push("pnpm-lock.yaml is required");
  if (hasPackageLock) failures.push("package-lock.json must not be committed");
  if (!/^pnpm@\d+\.\d+\.\d+$/.test(packageManager ?? "")) {
    failures.push("package.json packageManager must pin an exact pnpm version");
  }
  if (npmrcContents !== null && NPM_CREDENTIAL_PATTERN.test(npmrcContents)) {
    failures.push("repository .npmrc must not contain npm credentials");
  }

  return failures;
}
