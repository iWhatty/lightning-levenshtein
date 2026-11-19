// bench/paired-ab/stats.js
//
// Small-sample statistics for paired benchmark comparisons. No dependencies.
"use strict";

export function mean(values) {
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Sample standard deviation (n - 1 denominator). */
export function standardDeviation(values) {
  if (values.length < 2) return NaN;
  const center = mean(values);
  let squares = 0;
  for (const value of values) squares += (value - center) ** 2;
  return Math.sqrt(squares / (values.length - 1));
}

function logGamma(x) {
  // Lanczos approximation, g = 7, n = 9.
  const coefficients = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let sum = coefficients[0];
  for (let i = 1; i < 9; i++) sum += coefficients[i] / (x + i);
  const t = x + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(sum);
}

/** Regularized incomplete beta function I_x(a, b), by continued fraction. */
export function incompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x > (a + 1) / (a + b + 2)) return 1 - incompleteBeta(1 - x, b, a);

  // Modified Lentz evaluation.
  const tiny = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let fraction = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let numerator = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + numerator * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + numerator / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    fraction *= d * c;

    numerator = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + numerator * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + numerator / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    fraction *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }
  return (front * fraction) / a;
}

/** Two-sided p-value for Student's t with `df` degrees of freedom. */
export function tTwoSidedP(t, df) {
  if (Number.isNaN(t)) return 1;
  if (!Number.isFinite(t)) return 0;
  return incompleteBeta(df / (df + t * t), df / 2, 0.5);
}

/** Positive t with two-sided tail probability `p` (bisection). */
export function tCritical(p, df) {
  let low = 0;
  let high = 1000;
  for (let i = 0; i < 200; i++) {
    const middle = (low + high) / 2;
    if (tTwoSidedP(middle, df) > p) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

/**
 * One-sample t-test of `values` against zero, with a confidence interval.
 * Used on per-process mean log time ratios, so zero means "no difference".
 */
export function tTest(values, confidence = 0.95) {
  const n = values.length;
  const center = mean(values);
  const sd = standardDeviation(values);
  const standardError = sd / Math.sqrt(n);
  const df = n - 1;
  const t = standardError === 0 ? (center === 0 ? 0 : Infinity * Math.sign(center)) : center / standardError;
  const halfWidth = tCritical(1 - confidence, df) * standardError;
  return {
    n,
    mean: center,
    median: median(values),
    sd,
    standardError,
    df,
    t,
    p: tTwoSidedP(t, df),
    low: center - halfWidth,
    high: center + halfWidth
  };
}

/** Two-sided exact sign test: probability of a split at least this lopsided. */
export function signTestP(values) {
  const positive = values.filter((value) => value > 0).length;
  const negative = values.filter((value) => value < 0).length;
  const n = positive + negative;
  if (n === 0) return 1;
  const k = Math.min(positive, negative);
  let tail = 0;
  let term = 0.5 ** n;
  for (let i = 0; i <= k; i++) {
    tail += term;
    term = (term * (n - i)) / (i + 1);
  }
  return Math.min(1, 2 * tail);
}
