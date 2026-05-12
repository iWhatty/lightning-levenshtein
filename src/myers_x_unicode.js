// ./src/myers_x_unicode.js

"use strict";

import { peqUnicode } from './peqUnicode.js';
import { createMyersX } from './myers_x_factory.js';

export const myers_x_unicode = createMyersX(peqUnicode);
