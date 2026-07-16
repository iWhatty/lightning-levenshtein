import { mean, median, mulberry32 } from "./data.js";

export function balancedTargetOrder(targets, seed, repetition = 0) {
  if (!Number.isInteger(repetition) || repetition < 0) {
    throw new TypeError("repetition must be a non-negative integer");
  }

  const ordered = [...targets];
  const random = mulberry32(seed);
  for (let i = ordered.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  }

  if (ordered.length < 2) return ordered;
  const offset = repetition % ordered.length;
  return ordered.slice(offset).concat(ordered.slice(0, offset));
}

export function verifyTargets(reference, targets, pairs, invoke = defaultInvoke) {
  const expected = pairs.map(([a, b]) => reference(a, b));
  const expectedChecksum = checksum(expected);

  for (const [name, fn] of targets) {
    const actual = new Array(pairs.length);
    for (let i = 0; i < pairs.length; i++) {
      const [a, b] = pairs[i];
      actual[i] = invoke(fn, a, b);
      if (actual[i] !== expected[i]) {
        throw new Error(
          `${name} returned ${actual[i]} for pair ${i}; expected ${expected[i]}`
        );
      }
    }

    if (checksum(actual) !== expectedChecksum) {
      throw new Error(`${name} produced an unexpected verification checksum`);
    }
  }

  return expectedChecksum;
}

export function summarize(values) {
  if (!values.length) {
    throw new TypeError("cannot summarize an empty sample");
  }

  const average = mean(values);
  let squaredDifferenceTotal = 0;
  for (const value of values) {
    squaredDifferenceTotal += (value - average) ** 2;
  }
  const standardDeviation = Math.sqrt(squaredDifferenceTotal / values.length);

  return {
    count: values.length,
    mean: average,
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
    standardDeviation,
    coefficientOfVariation: average === 0 ? 0 : standardDeviation / average,
  };
}

export function pairedRatios(values, baselineValues) {
  if (values.length !== baselineValues.length || values.length === 0) {
    throw new TypeError("paired samples must have the same non-zero length");
  }

  return values.map((value, index) => {
    const baseline = baselineValues[index];
    if (baseline === 0) throw new RangeError("baseline sample cannot be zero");
    return value / baseline;
  });
}

function defaultInvoke(fn, a, b) {
  return fn(a, b);
}

function checksum(values) {
  let hash = 2166136261;
  for (let i = 0; i < values.length; i++) {
    hash ^= (values[i] + Math.imul(i, 16777619)) >>> 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
