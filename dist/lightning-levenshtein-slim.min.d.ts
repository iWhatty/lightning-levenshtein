/**
 * Levenshtein distance between two strings, counted in UTF-16 code units at
 * every length, using one shared 256 KiB lookup table.
 *
 * Tuned for short strings such as words and identifiers: up to 16 code units
 * it runs v2's unrolled kernels. Longer input uses the stable kernels.
 *
 * A character outside the Basic Multilingual Plane is two code units, so
 * deleting one costs two edits. Text is not normalized.
 *
 * @throws {TypeError} If either argument is not a primitive string.
 */
export function distanceSlim(a: string, b: string): number;
