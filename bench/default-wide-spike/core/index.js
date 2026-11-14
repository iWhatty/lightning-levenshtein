//  ./src/index.js
//
// Public API of the default `lightning-levenshtein` entry. Bundlers see
// these named exports and tree-shake unused ones. For unbundled
// <script type="module"> consumption of the full pre-minified bundle,
// import from `lightning-levenshtein/min` instead.

import { distance } from './distance.js';
import { distanceMax } from './distanceMax.js';
import { closest } from './closest.js';

export { distance, distanceMax, closest };
