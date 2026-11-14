//  ./src/closest.js


import { distanceMax } from './distanceMax.js';

/**
 * Returns the closest matching string from a list based on Levenshtein distance.
 * Efficiently short-circuits if an exact match (distance = 0) is found during search.
 *
 * @param {string} str - The input string to match.
 * @param {readonly string[]} arr - An array of candidate strings to compare against.
 * @param {number} [maxDistance=Number.MAX_SAFE_INTEGER] - Optional upper bound on acceptable distance.
 * @returns {string | null} The closest match found, or `null` if no string is within the threshold.
 */
export function closest(
  str,
  arr,
  maxDistance = Number.MAX_SAFE_INTEGER
) {
  let minIndex = -1;
  let minDist = maxDistance + 1;

  for (let i = 0; i < arr.length; i++) {
    const dist = distanceMax(str, arr[i], minDist);

    if (dist < minDist) {
      minDist = dist;
      minIndex = i;
      if (dist === 0) break;
    }
  }

  return minIndex >= 0 ? arr[minIndex] : null;
}

