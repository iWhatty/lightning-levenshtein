/**
 * Range of UTF-16 code units a distance function accepts: `ascii` is 0–127,
 * `latin1` is 0–255, `codeUnit` is 0–65535.
 */
export type TextProfile = "ascii" | "latin1" | "codeUnit";

/**
 * What to do with input outside the profile. `throw` checks both strings on
 * every call. `assume-valid` skips that check; out-of-profile input then has
 * undefined results.
 */
export type OutOfRangePolicy = "throw" | "assume-valid";

export interface DistanceProfileOptions {
  profile: TextProfile;
  /** Defaults to `"throw"`. */
  outOfRange?: OutOfRangePolicy;
}

/**
 * Creates a Levenshtein distance function bound to one text profile.
 *
 * Each returned function owns its lookup tables. Create one per worker and
 * reuse it; calls are synchronous.
 *
 * The returned function throws a `TypeError` unless both arguments are
 * primitive strings, and under `outOfRange: "throw"` a `RangeError` for input
 * outside the profile.
 *
 * @throws {TypeError} If the profile or out-of-range policy is unknown.
 */
export function createDistance(
  options: DistanceProfileOptions
): (a: string, b: string) => number;
