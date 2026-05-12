
/** 
 * @externs
 * @fileoverview Fastest Levenshtein exposed externs.
 **/


/**
 * @param {string} a
 * @param {string} b
 * @return {number}
 */
function distance(a, b) {}

/**
 * @param {string} a
 * @param {string} b
 * @return {number}
 */
function distanceUnicode(a, b) {}

/**
 * @param {string} a
 * @param {string} b
 * @param {number=} maxDistance
 * @return {number}
 */
function distanceMax(a, b, maxDistance) {}


/**
 * @param {string} str
 * @param {!Array<string>} arr
 * @param {number=} maxDistance
 * @return {string|null}
 */
function closest(str, arr, maxDistance) {}
