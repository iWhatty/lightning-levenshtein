// ./src/myers_x64.js

"use strict";

import { createMyersX64 } from "./myers_x64_factory.js";

const peq0 = new Uint32Array(65536);
const peq1 = new Uint32Array(65536);

export const myers_x64 = createMyersX64(peq0, peq1);
