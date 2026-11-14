/**
 * Levenshtein distance between two strings.
 *
 * Intended for ASCII/Latin-1 input (code units 0–255). For wider text use
 * `lightning-levenshtein/unicode` or `lightning-levenshtein/profiles`.
 *
 * @throws {TypeError} If either argument is not a primitive string.
 */
export function distance(a: string, b: string): number;

/**
 * Levenshtein distance with an upper bound.
 *
 * Returns the exact distance when it is within `maxDistance`. Otherwise
 * returns some value greater than `maxDistance`, not a sentinel such as `-1`,
 * so compare the result against the threshold.
 *
 * Intended for ASCII/Latin-1 input (code units 0–255).
 *
 * @param maxDistance Largest distance of interest. A fraction between 0 and 1
 * is taken relative to the length of `a` and rounded up. Omit for no bound.
 * @throws {TypeError} If either string argument is not a primitive string, or
 * the threshold is a `BigInt` or `Symbol`.
 */
export function distanceMax(
  a: string,
  b: string,
  maxDistance?: number
): number;

/**
 * Returns the candidate closest to `str`, or `null` if none is within
 * `maxDistance`. The earliest candidate wins a tie.
 *
 * Intended for ASCII/Latin-1 input (code units 0–255).
 *
 * @param maxDistance Largest acceptable distance, as an integer. Omit for no
 * bound.
 * @throws {TypeError} If `str` or any compared candidate is not a primitive
 * string.
 */
export function closest(
  str: string,
  arr: readonly string[],
  maxDistance?: number
): string | null;
