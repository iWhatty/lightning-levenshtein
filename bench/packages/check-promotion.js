import fs from "fs";
import path from "path";

import {
  loadPromotedBenchmark,
  PACKAGES_DIR,
  validateGeneratedClaims,
} from "./evidence.js";

const data = loadPromotedBenchmark();
const readme = fs.readFileSync(path.resolve(PACKAGES_DIR, "../../README.md"), "utf8");
const start = readme.indexOf("<!-- benchmark-highlights:start -->");
const end = readme.indexOf("<!-- benchmark-highlights:end -->");
if (start < 0 || end < start) throw new Error("README benchmark highlight markers are missing or invalid");
validateGeneratedClaims(readme.slice(start, end), data);
console.log(
  `Promotion ${data.meta.promotion.id} is valid: ${data.meta.promotion.source} ` +
  `(${data.meta.promotion.runtime}, ${data.meta.promotion.workload}, ${data.meta.promotion.metric}).`
);
