
/** 
 * @externs
* @fileoverview Public lightning-levenshtein exports preserved by Closure builds.
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

/**
 * @param {!Object} options
 * @return {function(string, string): number}
 */
function createDistance(options) {}
