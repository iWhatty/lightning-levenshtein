// ./src/myers_32.js

"use strict";

import { peq } from './peq.js';
import { createMyers32 } from './myers_32_factory.js';

export const myers_32 = createMyers32(peq);
