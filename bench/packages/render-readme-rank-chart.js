// bench/packages/render-readme-rank-chart.js

import fs from "fs";
import path from "path";
import { loadPromotedBenchmark } from "./evidence.js";

const ROOT = path.resolve("bench/packages");
const OUT_FILE = path.join(ROOT, "mean-rank-log-chart.svg");

const WIDTH = 1100;
const HEIGHT = 620;

const MARGIN = {
  top: 80,
  right: 180,
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

function buildRankSeries(data) {
  const lengths = data.meta.lengths;
  const algorithms = collectAlgorithms(data);

  const series = Object.fromEntries(
    algorithms.map((name) => [name, []])
  );

  for (const n of lengths) {
    const row = data.results[String(n)] ?? data.results[n];
    if (!row) {
      throw new Error(`Missing benchmark row for N=${n}`);
    }

    const ranked = algorithms
      .map((name) => {
        const entry = row[name];
        if (!entry) {
          throw new Error(`Missing entry for algo=${name} at N=${n}`);
        }

        return {
          name,
          meanOpsPerSec: entry.meanOpsPerSec,
        };
      })
      .sort((a, b) => b.meanOpsPerSec - a.meanOpsPerSec);

    for (let i = 0; i < ranked.length; i++) {
      const { name, meanOpsPerSec } = ranked[i];
      series[name].push({
        n,
        rank: i + 1,
        meanOpsPerSec,
      });
    }
  }

  return { algorithms, series, lengths };
}

function renderSvg({ algorithms, series, lengths }) {
  const plotX = MARGIN.left;
  const plotY = MARGIN.top;
  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const minX = Math.min(...lengths);
  const maxX = Math.max(...lengths);
  const minLog = Math.log2(minX);
  const maxLog = Math.log2(maxX);

  const maxRank = algorithms.length;

  const xScale = (n) => {
    const t = (Math.log2(n) - minLog) / (maxLog - minLog);
    return plotX + t * plotW;
  };

  // rank 1 at the top
  const yScale = (rank) => {
    if (maxRank === 1) return plotY + plotH / 2;
    const t = (rank - 1) / (maxRank - 1);
    return plotY + t * plotH;
  };

  const colorByAlgo = Object.fromEntries(
    algorithms.map((name, i) => [name, PALETTE[i % PALETTE.length]])
  );

  const parts = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Algorithm ranking by string length">`
  );
  parts.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.bg}" />`);

  parts.push(
    `<text x="${WIDTH / 2}" y="36" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${COLORS.text}">Levenshtein benchmark rank by string length</text>`
  );
  parts.push(
    `<text x="${WIDTH / 2}" y="60" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${COLORS.muted}">Y axis = rank from mean ops/sec at each length (1 = fastest), X axis = string length on log2 scale</text>`
  );

  // Horizontal grid / rank labels
  for (let rank = 1; rank <= maxRank; rank++) {
    const y = yScale(rank);

    parts.push(
      `<line x1="${plotX}" y1="${y}" x2="${plotX + plotW}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1" opacity="0.6" />`
    );
    parts.push(
      `<text x="${plotX - 12}" y="${y + 4}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="${COLORS.axis}">${rank}</text>`
    );
  }

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

  // Lines + points
  for (const algo of algorithms) {
    const points = series[algo];
    const color = colorByAlgo[algo];

    const d = points
      .map((p, i) => {
        const x = xScale(p.n);
        const y = yScale(p.rank);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");

    parts.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" />`
    );

    for (const p of points) {
      const x = xScale(p.n);
      const y = yScale(p.rank);

      parts.push(
        `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.5" fill="${color}" stroke="${COLORS.bg}" stroke-width="1.5">` +
          `<title>${escapeXml(algo)} | N=${p.n} | rank=${p.rank} | mean=${p.meanOpsPerSec.toFixed(2)} ops/sec</title>` +
        `</circle>`
      );
    }
  }

  // Axis labels
  parts.push(
    `<text x="${plotX + plotW / 2}" y="${HEIGHT - 24}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${COLORS.text}">String length (log2 scale)</text>`
  );

  parts.push(
    `<text x="28" y="${plotY + plotH / 2}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${COLORS.text}" transform="rotate(-90 28 ${plotY + plotH / 2})">Rank by mean ops/sec (1 = fastest)</text>`
  );

  // Legend
  const legendX = WIDTH - MARGIN.right + 10;
  const legendY = MARGIN.top + 10;
  const legendRowH = 26;

  parts.push(`<g>`);
  parts.push(
    `<text x="${legendX}" y="${legendY - 14}" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="${COLORS.text}">Algorithms</text>`
  );

  algorithms.forEach((algo, i) => {
    const y = legendY + i * legendRowH;
    const color = colorByAlgo[algo];

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
  const chartData = buildRankSeries(data);
  const svg = renderSvg(chartData);

  fs.mkdirSync(ROOT, { recursive: true });
  fs.writeFileSync(OUT_FILE, svg, "utf8");

  console.log(`✅ Wrote ${OUT_FILE}`);
}

main();
