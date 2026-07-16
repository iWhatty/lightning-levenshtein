// bench/packages/render-readme-relative-fastest-chart.js

import fs from "fs";
import path from "path";
import { loadPromotedBenchmark } from "./evidence.js";

const ROOT = path.resolve("bench/packages");
const OUT_FILE = path.join(ROOT, "relative-to-fastest-levenshtein.svg");


const BASELINE = "fastest-levenshtein";

const WIDTH = 1100;
const HEIGHT = 620;

const MARGIN = {
  top: 80,
  right: 180,
  bottom: 80,
  left: 100,
};

const COLORS = {
  bg: "#0f172a",
  panel: "#111827",
  grid: "#334155",
  axis: "#94a3b8",
  text: "#e5e7eb",
  muted: "#cbd5e1",
  baseline: "#ffffff",
};

const PALETTE = [
  "#38bdf8", // sky
  "#22c55e", // green
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#a78bfa", // violet
  "#14b8a6", // teal
  "#eab308", // yellow
  "#fb7185", // pink
  "#60a5fa", // blue
  "#34d399", // emerald
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function collectAlgorithms(data) {
  const lengths = data.meta.lengths;
  const firstRow = data.results[String(lengths[0])] ?? data.results[lengths[0]];
  return Object.keys(firstRow);
}

function buildRelativeSeries(data) {
  const lengths = data.meta.lengths;
  const algorithms = collectAlgorithms(data);

  if (!algorithms.includes(BASELINE)) {
    throw new Error(`Missing baseline algorithm: ${BASELINE}`);
  }

  const series = Object.fromEntries(
    algorithms.map((name) => [name, []])
  );

  for (const n of lengths) {
    const row = data.results[String(n)] ?? data.results[n];
    if (!row) {
      throw new Error(`Missing benchmark row for N=${n}`);
    }

    const baselineEntry = row[BASELINE];
    if (!baselineEntry || baselineEntry.meanOpsPerSec <= 0) {
      throw new Error(`Invalid baseline entry for N=${n}`);
    }

    const baselineOps = baselineEntry.meanOpsPerSec;

    for (const name of algorithms) {
      const entry = row[name];
      if (!entry) {
        throw new Error(`Missing entry for algo=${name} at N=${n}`);
      }

      const relativePct = (entry.meanOpsPerSec / baselineOps) * 100;

      series[name].push({
        n,
        meanOpsPerSec: entry.meanOpsPerSec,
        relativePct,
      });
    }
  }

  return { algorithms, series, lengths };
}

function formatPercent(v) {
  if (v >= 1000) return `${Math.round(v)}%`;
  if (v >= 100) return `${v.toFixed(0)}%`;
  if (v >= 10) return `${v.toFixed(0)}%`;
  return `${v.toFixed(1)}%`;
}

function renderSvg({ algorithms, series, lengths }) {
  const plotX = MARGIN.left;
  const plotY = MARGIN.top;
  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const allValues = algorithms.flatMap((algo) =>
    series[algo].map((p) => p.relativePct)
  );

  const minX = Math.min(...lengths);
  const maxX = Math.max(...lengths);

  let minY = Math.min(...allValues);
  let maxY = Math.max(...allValues);

  // padding
  minY = Math.floor(minY * 0.9);
  maxY = Math.ceil(maxY * 1.08);

  // keep the 100% reference visible
  minY = Math.min(minY, 100);
  maxY = Math.max(maxY, 100);

  const minLogX = Math.log2(minX);
  const maxLogX = Math.log2(maxX);

  const xScale = (n) => {
    const t = (Math.log2(n) - minLogX) / (maxLogX - minLogX);
    return plotX + t * plotW;
  };

  const yScale = (v) => {
    const t = (v - minY) / (maxY - minY);
    return plotY + plotH - t * plotH;
  };

  const colorByAlgo = Object.fromEntries(
    algorithms.map((name, i) => [name, PALETTE[i % PALETTE.length]])
  );

  const yTicks = [];
  const roughStep = (maxY - minY) / 6;
  const step =
    roughStep <= 10 ? 10 :
    roughStep <= 25 ? 25 :
    roughStep <= 50 ? 50 :
    roughStep <= 100 ? 100 : 200;

  const firstTick = Math.floor(minY / step) * step;
  for (let v = firstTick; v <= maxY; v += step) {
    if (v >= minY) yTicks.push(v);
  }

  const parts = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Relative benchmark performance compared with fastest-levenshtein">`
  );
  parts.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.bg}" />`);

  parts.push(
    `<text x="${WIDTH / 2}" y="36" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${COLORS.text}">Relative performance vs fastest-levenshtein</text>`
  );
  parts.push(
    `<text x="${WIDTH / 2}" y="60" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${COLORS.muted}">Y axis = mean ops/sec as % of fastest-levenshtein at the same length, X axis = string length (log2)</text>`
  );

  // Horizontal grid / y labels
  for (const tick of yTicks) {
    const y = yScale(tick);

    parts.push(
      `<line x1="${plotX}" y1="${y}" x2="${plotX + plotW}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1" opacity="0.6" />`
    );
    parts.push(
      `<text x="${plotX - 12}" y="${y + 4}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="${COLORS.axis}">${formatPercent(tick)}</text>`
    );
  }

  // 100% baseline
  const baselineY = yScale(100);
  parts.push(
    `<line x1="${plotX}" y1="${baselineY}" x2="${plotX + plotW}" y2="${baselineY}" stroke="${COLORS.baseline}" stroke-width="1.5" stroke-dasharray="6 6" opacity="0.9" />`
  );
  parts.push(
    `<text x="${plotX + plotW - 6}" y="${baselineY - 8}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="${COLORS.baseline}">100% = ${escapeXml(BASELINE)}</text>`
  );

  // Vertical grid / x labels
  for (const n of lengths) {
    const x = xScale(n);

    parts.push(
      `<line x1="${x}" y1="${plotY}" x2="${x}" y2="${plotY + plotH}" stroke="${COLORS.grid}" stroke-width="1" opacity="0.45" />`
    );
    parts.push(
      `<text x="${x}" y="${plotY + plotH + 24}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="${COLORS.axis}">${n}</text>`
    );
  }

  // Axes
  parts.push(
    `<line x1="${plotX}" y1="${plotY}" x2="${plotX}" y2="${plotY + plotH}" stroke="${COLORS.axis}" stroke-width="1.5" />`
  );
  parts.push(
    `<line x1="${plotX}" y1="${plotY + plotH}" x2="${plotX + plotW}" y2="${plotY + plotH}" stroke="${COLORS.axis}" stroke-width="1.5" />`
  );

  // Draw baseline algo first so the others can sit on top if needed
  const drawOrder = [
    BASELINE,
    ...algorithms.filter((name) => name !== BASELINE),
  ];

  for (const algo of drawOrder) {
    const points = series[algo];
    const color = algo === BASELINE ? "#e5e7eb" : colorByAlgo[algo];
    const strokeWidth = algo === BASELINE ? 2.5 : 3;

    const d = points
      .map((p, i) => {
        const x = xScale(p.n);
        const y = yScale(p.relativePct);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");

    parts.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" />`
    );

    for (const p of points) {
      const x = xScale(p.n);
      const y = yScale(p.relativePct);

      parts.push(
        `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.5" fill="${color}" stroke="${COLORS.bg}" stroke-width="1.5">` +
          `<title>${escapeXml(algo)} | N=${p.n} | ${p.relativePct.toFixed(2)}% of ${escapeXml(BASELINE)} | mean=${p.meanOpsPerSec.toFixed(2)} ops/sec</title>` +
        `</circle>`
      );
    }
  }

  // Axis labels
  parts.push(
    `<text x="${plotX + plotW / 2}" y="${HEIGHT - 24}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${COLORS.text}">String length (log2 scale)</text>`
  );

  parts.push(
    `<text x="28" y="${plotY + plotH / 2}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${COLORS.text}" transform="rotate(-90 28 ${plotY + plotH / 2})">Relative throughput (% of fastest-levenshtein)</text>`
  );

  // Legend
  const legendX = WIDTH - MARGIN.right + 10;
  const legendY = MARGIN.top + 10;
  const legendRowH = 26;

  parts.push(`<g>`);
  parts.push(
    `<text x="${legendX}" y="${legendY - 14}" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="${COLORS.text}">Algorithms</text>`
  );

  drawOrder.forEach((algo, i) => {
    const y = legendY + i * legendRowH;
    const color = algo === BASELINE ? "#e5e7eb" : colorByAlgo[algo];

    parts.push(
      `<line x1="${legendX}" y1="${y}" x2="${legendX + 20}" y2="${y}" stroke="${color}" stroke-width="3" stroke-linecap="round" />`
    );
    parts.push(
      `<circle cx="${legendX + 10}" cy="${y}" r="4" fill="${color}" stroke="${COLORS.bg}" stroke-width="1.2" />`
    );
    parts.push(
      `<text x="${legendX + 30}" y="${y + 4}" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="${COLORS.text}">${escapeXml(algo)}</text>`
    );
  });

  parts.push(`</g>`);
  parts.push(`</svg>`);

  return parts.join("\n");
}

function main() {
  const data = loadPromotedBenchmark();
  const chartData = buildRelativeSeries(data);
  const svg = renderSvg(chartData);

  fs.mkdirSync(ROOT, { recursive: true });
  fs.writeFileSync(OUT_FILE, svg, "utf8");

  console.log(`✅ Wrote ${OUT_FILE}`);
}

main();
