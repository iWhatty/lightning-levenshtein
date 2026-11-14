/**
 * Levenshtein distance between two strings, counted in UTF-16 code units at
 * every length.
 *
 * A character outside the Basic Multilingual Plane is two code units, so
 * deleting one costs two edits. Text is not normalized.
 *
 * @throws {TypeError} If either argument is not a primitive string.
 */
export function distanceUnicode(a: string, b: string): number;
