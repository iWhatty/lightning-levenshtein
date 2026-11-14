// ./src/myers_x.js

"use strict";

import { peq } from './peq.js';
import { createMyersX } from './myers_x_factory.js';

export const myers_x = createMyersX(peq);
