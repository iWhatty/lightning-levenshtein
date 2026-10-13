export function assertUniqueRunIds(runs, getRunId, label) {
  const seen = new Set();
  for (const run of runs) {
    const runId = getRunId(run);
    if (seen.has(runId)) throw new Error(`duplicate ${label} id: ${runId}`);
    seen.add(runId);
  }
}

export function assertCompatibleRuns(runs, signatureFor, errorFor) {
  const expected = signatureFor(runs[0]);
  for (const run of runs.slice(1)) {
    if (signatureFor(run) !== expected) throw new Error(errorFor(run));
  }
}

export function assertRecord(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

export function assertString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} must be a nonempty string`);
  }
}

export function assertChecksum(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}$/.test(value)) {
    throw new TypeError(`${label} must be an eight-digit lowercase hexadecimal checksum`);
  }
}

export function assertInteger(value, label, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${label} must be an integer at least ${minimum}`);
  }
}

export function assertPositiveNumber(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${label} must be a finite positive number`);
  }
}

export function assertUniqueList(value, label, validate) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${label} must be a nonempty array`);
  }
  const seen = new Set();
  for (const entry of value) {
    validate(entry);
    if (seen.has(entry)) throw new TypeError(`${label} contains duplicate value ${entry}`);
    seen.add(entry);
  }
}

export function assertExactMembers(actual, expected, label) {
  if (!Array.isArray(actual) || actual.length !== expected.length ||
      actual.some((entry) => !expected.includes(entry)) || new Set(actual).size !== actual.length) {
    throw new Error(`${label} does not match configured entries`);
  }
}

export function assertProvenance(meta, label) {
  assertString(meta.runId, `${label} run id`);
  assertString(meta.generatedAt, `${label} generatedAt`);
  if (!Number.isFinite(Date.parse(meta.generatedAt))) {
    throw new TypeError(`${label} generatedAt must be a timestamp`);
  }
  const revision = assertRecord(meta.revision, `${label} revision`);
  assertString(revision.commit, `${label} revision commit`);
  if (revision.commit === "unknown") throw new TypeError(`${label} revision commit is unknown`);
  if (typeof revision.dirty !== "boolean") {
    throw new TypeError(`${label} revision dirty must be a boolean`);
  }
  const runtime = assertRecord(meta.runtime, `${label} runtime`);
  for (const field of ["node", "v8", "platform", "release", "arch", "cpu"]) {
    assertString(runtime[field], `${label} runtime ${field}`);
  }
  assertInteger(runtime.logicalCores, `${label} runtime logicalCores`, 1);
  const protocol = assertRecord(meta.protocol, `${label} protocol`);
  const fields = label === "diagnostic"
    ? ["factoryConstruction", "targetOrder", "warmup", "batching", "resultConsumption"]
    : ["targetOrder", "warmup", "batching", "timerOverrun", "resultConsumption"];
  for (const field of fields) assertString(protocol[field], `${label} protocol ${field}`);
}

export function assertMeasurement(value, label, hasOpsPerSec = false) {
  const measurement = assertRecord(value, `${label} measurement`);
  assertInteger(measurement.calls, `${label} calls`, 1);
  assertPositiveNumber(measurement.elapsed, `${label} elapsed`);
  assertPositiveNumber(measurement.opsPerMs, `${label} opsPerMs`);
  if (hasOpsPerSec) assertPositiveNumber(measurement.opsPerSec, `${label} opsPerSec`);
  assertInteger(measurement.timedChecksum, `${label} timedChecksum`);
  if (!approximatelyEqual(measurement.opsPerMs, measurement.calls / measurement.elapsed)) {
    throw new Error(`${label} opsPerMs does not match calls and elapsed`);
  }
  if (hasOpsPerSec && !approximatelyEqual(measurement.opsPerSec, measurement.opsPerMs * 1000)) {
    throw new Error(`${label} opsPerSec does not match opsPerMs`);
  }
}

function approximatelyEqual(actual, expected) {
  return Number.isFinite(expected) &&
    Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-10;
}
