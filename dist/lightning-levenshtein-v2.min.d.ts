/**
 * Levenshtein distance between two strings, counted in UTF-16 code units,
 * using the max-throughput v2 kernels.
 *
 * Holds about 6 MiB of lookup tables per module realm or worker.
 *
 * @throws {TypeError} If either argument is not a primitive string.
 */
export function levenshteinLightning(a: string, b: string): number;
