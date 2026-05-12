//  ./src/index.js

// Core algorithms
export { myers_32 } from './myers_32.js';
export { myers_32_max } from './myers_32_max.js';
export { myers_x } from './myers_x.js';
export { myers_x_max } from './myers_x_max.js';

// Public APIs
import { distanceMax } from './distanceMax.js';
import { distance } from './distance.js';
import { closest } from './closest.js';

export { distance, distanceMax, closest };
