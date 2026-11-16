// ./src/myers_x64.js

"use strict";

import { peq, peq1 } from "./peq.js";
import { createMyersX64 } from "./myers_x64_factory.js";

export const myers_x64 = createMyersX64(peq, peq1);
