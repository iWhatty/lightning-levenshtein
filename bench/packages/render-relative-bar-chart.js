// bench/packages/render-relative-bar-chart.js

import fs from "fs";
import path from "path";
import { loadPromotedBenchmark } from "./evidence.js";

const ROOT = path.resolve("bench/packages");
const OUT_FILE = path.join(ROOT, "relative-performance.svg");

const TARGET = "lightning-levenshtein-v2";
const BASELINE = "fastest-levenshtein";

const WIDTH = 980;
const HEIGHT = 560;

const MARGIN = {
  top: 70,
  right: 30,
  bottom: 80,
  left: 90,
};

const COLORS = {
  bg: "#0f172a",
  panel: "#111827",
  grid: "#334155",
  axis: "#94a3b8",
  text: "#e5e7eb",
  muted: "#cbd5e1",
  bar: "#38bdf8",
  barDim: "#64748b",
};

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildRatios(data) {
  const lengths = data.meta.lengths;
  const results = data.results;

  const rows = [];

  for (const n of lengths) {
    const row = results[String(n)] ?? results[n];
    if (!row || !row[TARGET]) {
      throw new Error(`Missing benchmark row for N=${n} or target=${TARGET}`);
    }
    if (!row[BASELINE]) {
      throw new Error(`Missing benchmark row for N=${n} or baseline=${BASELINE}`);
    }

    const targetVal = row[TARGET].meanOpsPerSec;
    const baselineVal = row[BASELINE].meanOpsPerSec;
    const ratio = baselineVal > 0 ? targetVal / baselineVal : 0;

    const ranked = Object.entries(row)
      .map(([name, entry]) => [name, entry.meanOpsPerSec])
      .sort((a, b) => b[1] - a[1]);

    const [leader] = ranked[0];

    rows.push({
      n,
      ratio,
      targetVal,
      baselineVal,
      leader,
      isWinner: leader === TARGET,
    });
  }

  return rows;
}

function renderSvg(rows) {
  const plotX = MARGIN.left;
  const plotY = MARGIN.top;
  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const maxRatio = Math.max(1, ...rows.map((r) => r.ratio));
  const yMax = Math.max(1.1, Math.ceil(maxRatio * 10) / 10);
  const yTicks = 6;

  const slotW = plotW / rows.length;
  const barW = Math.min(52, slotW * 0.62);

  const yScale = (v) => plotY + plotH - (v / yMax) * plotH;

  const parts = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Relative performance chart">`
  );
  parts.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.bg}" />`);
  parts.push(
    `<text x="${WIDTH / 2}" y="34" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${COLORS.text}">${escapeXml(TARGET)} relative performance</text>`
  );
  parts.push(
    `<text x="${WIDTH / 2}" y="58" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${COLORS.muted}">ratio vs ${escapeXml(BASELINE)} at each string length (mean ops/sec across seeds)</text>`
  );

  for (let i = 0; i <= yTicks; i++) {
    const value = (yMax / yTicks) * i;
    const y = yScale(value);

    parts.push(
      `<line x1="${plotX}" y1="${y}" x2="${plotX + plotW}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1" opacity="0.6" />`
    );
    parts.push(
      `<text x="${plotX - 10}" y="${y + 4}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="${COLORS.axis}">${value.toFixed(1)}x</text>`
    );
  }

  parts.push(
    `<line x1="${plotX}" y1="${plotY}" x2="${plotX}" y2="${plotY + plotH}" stroke="${COLORS.axis}" stroke-width="1.5" />`
  );
  parts.push(
    `<line x1="${plotX}" y1="${plotY + plotH}" x2="${plotX + plotW}" y2="${plotY + plotH}" stroke="${COLORS.axis}" stroke-width="1.5" />`
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cx = plotX + slotW * i + slotW / 2;
    const x = cx - barW / 2;
    const y = yScale(row.ratio);
    const h = plotY + plotH - y;

    const fill = row.isWinner ? COLORS.bar : COLORS.barDim;

    parts.push(
      `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" rx="6" fill="${fill}">` +
        `<title>N=${row.n} | ratio=${row.ratio.toFixed(2)}x | target=${row.targetVal.toFixed(2)} | baseline=${row.baselineVal.toFixed(2)} | leader=${escapeXml(row.leader)}</title>` +
      `</rect>`
    );

    parts.push(
      `<text x="${cx}" y="${plotY + plotH + 22}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="${COLORS.axis}">${row.n}</text>`
    );

    parts.push(
      `<text x="${cx}" y="${y - 8}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="${COLORS.text}">${row.ratio.toFixed(2)}x</text>`
    );
  }

  parts.push(
    `<text x="${plotX + plotW / 2}" y="${HEIGHT - 24}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${COLORS.text}">String length (N)</text>`
  );

  parts.push(
    `<text x="24" y="${plotY + plotH / 2}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${COLORS.text}" transform="rotate(-90 24 ${plotY + plotH / 2})">Times faster vs ${escapeXml(BASELINE)}</text>`
  );

  parts.push(`<g transform="translate(${WIDTH - 250}, ${HEIGHT - 30})">`);
  parts.push(`<rect x="0" y="-12" width="18" height="18" rx="4" fill="${COLORS.bar}" />`);
  parts.push(
    `<text x="26" y="2" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="${COLORS.text}">${escapeXml(TARGET)}</text>`
  );
  parts.push(`</g>`);

  parts.push(`</svg>`);

  return parts.join("\n");
}

function main() {
  const data = loadPromotedBenchmark();
  const rows = buildRatios(data);
  const svg = renderSvg(rows);

  fs.mkdirSync(ROOT, { recursive: true });
  fs.writeFileSync(OUT_FILE, svg, "utf8");

  console.log(`✅ Wrote ${OUT_FILE}`);
}

main();
