// frontend/src/components/viz/Heatmap.tsx
// Role: Main Plotly heatmap component. Renders a 2D slice with a fixed global
//       colorscale, optional divisor annotations, and a loading overlay.
// Assumptions:
//   - Sentinel values (50000, 1000) are already replaced with null by the backend.
//   - plotSize is derived from a ResizeObserver so the plot is always square.
//   - All Plotly types come from @types/plotly.js — no `any`.

import React, { useRef, useState, useEffect, useMemo } from "react";
import Plot from "react-plotly.js";
import type { Data, Layout, Annotations } from "plotly.js";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import type { HeatmapSlice, ExperimentMeta, ColourScaleConfig } from "../../types/index";

// ─── Shared utilities (exported so SliderPanel / StatsPanel can import) ───────

const AXIS_LETTERS = "abcdefghijklmnopqrstuvwxyz";

export function axisLabel(k: number): string {
  return `α_${AXIS_LETTERS[k] ?? String(k)}`;
}

export function buildColorscale(cfg: ColourScaleConfig): [number, string][] {
  const range = cfg.vmax - cfg.vmin;
  const zp = range === 0 ? 0.5 : Math.max(0, Math.min(1, (0 - cfg.vmin) / range));
  return [
    [0.0, "rgb(165,0,38)"],
    [zp,  "rgb(255,255,0)"],
    [1.0, "rgb(0,104,55)"],
  ];
}

export function buildColourbarTicks(cfg: ColourScaleConfig): number[] {
  const step = (cfg.vmax - cfg.vmin) / 9;
  return Array.from({ length: 10 }, (_, i) => cfg.vmax - i * step);
}

function buildTitle(titleAlpha: number[]): string {
  if (titleAlpha.length === 0) return "";
  const BASES = ["H", "E\u2081", "E\u2082", "E\u2083", "E\u2084", "E\u2085", "E\u2086"];
  const terms = titleAlpha.map((v, i) => `${v.toFixed(4)}\u00b7${BASES[i] ?? `E${i}`}`);
  return (
    "\u03b1 = " +
    terms[0] +
    (terms.length > 1 ? " \u2212 " + terms.slice(1).join(" \u2212 ") : "")
  );
}

// Fixed tick arrays — same regardless of M.
const X_TICKS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const Y_TICKS = Array.from({ length: 21 }, (_, i) =>
  parseFloat((i * 0.05).toFixed(2))
);

// ─── Component ────────────────────────────────────────────────────────────────

interface HeatmapProps {
  slice: HeatmapSlice | null;
  meta: ExperimentMeta;
  colourConfig: ColourScaleConfig;
  showDivisors: boolean;
  loading: boolean;
}

export function Heatmap({
  slice,
  meta,
  colourConfig,
  showDivisors,
  loading,
}: HeatmapProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [plotSize, setPlotSize] = useState(500);

  // Keep the plot square by tracking the container's content width.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setPlotSize(Math.max(200, Math.floor(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const N = meta.num_dimensions;
  const colorscale = useMemo(() => buildColorscale(colourConfig), [colourConfig]);
  const ticks = useMemo(() => buildColourbarTicks(colourConfig), [colourConfig]);

  // Build divisor annotations only when needed — can be large for big grids.
  const annotations = useMemo((): Partial<Annotations>[] => {
    if (!showDivisors || !slice) return [];
    const fontSize = N <= 3 ? 2 : 5;
    const out: Partial<Annotations>[] = [];
    for (let m = 0; m < slice.div_matrix.length; m++) {
      const row = slice.div_matrix[m];
      for (let n = 0; n < row.length; n++) {
        const v = row[n];
        if (v > 0) {
          out.push({
            x: meta.axis_values[N - 1][n],
            y: meta.axis_values[N - 2][m],
            text: String(v),
            font: { color: "black", size: fontSize },
            showarrow: false,
            xref: "x",
            yref: "y",
          });
        }
      }
    }
    return out;
  }, [showDivisors, slice, meta.axis_values, N]);

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!slice) {
    return (
      <div
        ref={containerRef}
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafafa",
          border: "1px solid #e8e8e8",
          color: "#bbb",
          fontSize: "0.9rem",
          borderRadius: "2px",
        }}
      >
        Select an experiment to begin
      </div>
    );
  }

  // ── Plotly trace ─────────────────────────────────────────────────────────────
  const trace: Data = {
    type: "heatmap",
    x: meta.axis_values[N - 1],
    y: meta.axis_values[N - 2],
    // sign_matrix is (number | null)[][] — null cells render transparent.
    z: slice.sign_matrix as Exclude<Data, { type?: string }>["z"],
    zmin: colourConfig.vmin,
    zmax: colourConfig.vmax,
    zmid: 0,
    colorscale,
    colorbar: {
      tickvals: ticks,
      ticktext: ticks.map((t) => t.toFixed(3)),
      thickness: 20,
    },
    hoverongaps: false,
  };

  const layout: Partial<Layout> = {
    title: { text: buildTitle(slice.title_alpha), font: { size: 13 } },
    xaxis: {
      title: axisLabel(N - 1),
      tickvals: X_TICKS,
      ticktext: X_TICKS.map((t) => t.toFixed(1)),
    },
    yaxis: {
      title: axisLabel(N - 2),
      tickvals: Y_TICKS,
      ticktext: Y_TICKS.map((t) => t.toFixed(2)),
      autorange: "reversed",
    },
    paper_bgcolor: "white",
    plot_bgcolor: "white",
    margin: { l: 60, r: 20, t: 60, b: 60 },
    annotations,
    width: plotSize,
    height: plotSize,
  };

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      <Plot
        data={[trace]}
        layout={layout}
        config={{ displayModeBar: false, responsive: false }}
        style={{ display: "block" }}
      />
      {loading && <LoadingSpinner />}
    </div>
  );
}
