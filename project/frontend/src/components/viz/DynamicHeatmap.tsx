// frontend/src/components/viz/DynamicHeatmap.tsx
import React, { useRef, useState, useEffect, useMemo } from "react";
import Plot from "react-plotly.js";
import type { Layout, Annotations } from "plotly.js";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { buildColorscale, buildColourbarTicks } from "./colourscale";
import type { ComputeResult, ColourScaleConfig } from "../../types/index";

const AXIS_LETTERS = "abcdefghijklmnopqrstuvwxyz";

const TAB10 = [
  "#4e79a7","#f28e2b","#e15759","#76b7b2",
  "#59a14f","#edc948","#b07aa1","#ff9da7",
  "#9c755f","#bab0ac",
];

function specLabel(vector: "alpha" | "beta", k: number): string {
  const sym = vector === "alpha" ? "α" : "β";
  return `${sym}[${AXIS_LETTERS[k] ?? String(k)}]`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DivisorTraceResult {
  type: "heatmap";
  x: number[];
  y: number[];
  z: (number | null)[][];
  zmin: number;
  zmax: number;
  colorscale: [number, string][];
  opacity: number;
  showscale: boolean;
  hoverongaps: boolean;
  unique: number[];
}

interface DynamicHeatmapProps {
  result: ComputeResult | null;
  xVector: "alpha" | "beta";
  xK: number;
  yVector: "alpha" | "beta";
  yK: number;
  title: string;
  colourConfig: ColourScaleConfig;
  showDivisors: boolean;
  showZeroLocus: boolean;
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Divisor overlay helpers
// ---------------------------------------------------------------------------

function buildDivisorTrace(result: ComputeResult): DivisorTraceResult | null {
  const flat = result.div_matrix.flat().filter((d) => d >= 0);
  if (flat.length === 0) return null;

  const unique = [...new Set(flat)].sort((a, b) => a - b);
  if (unique.length < 2) return null;

  const k      = unique.length;
  const idxMap = new Map(unique.map((d, i) => [d, i]));
  const z      = result.div_matrix.map((row) =>
    row.map((d) => (d < 0 ? null : (idxMap.get(d) ?? 0)))
  );

  const eps         = 1e-9;
  const colorscale: [number, string][] = [];
  unique.forEach((_, i) => {
    const color = TAB10[i % TAB10.length];
    colorscale.push([i / k, color]);
    colorscale.push([(i + 1) / k - eps, color]);
  });
  colorscale[colorscale.length - 1][0] = 1.0;

  return {
    type: "heatmap",
    x: result.x_values,
    y: result.y_values,
    z,
    zmin: 0,
    zmax: k - 1,
    colorscale,
    opacity: 0.30,
    showscale: false,
    hoverongaps: false,
    unique,
  };
}

function buildCentroidAnnotations(
  result: ComputeResult,
  unique: number[]
): Partial<Annotations>[] {
  const sums: Record<number, { sx: number; sy: number; count: number }> = {};

  for (let m = 0; m < result.div_matrix.length; m++) {
    for (let n = 0; n < result.div_matrix[m].length; n++) {
      const d = result.div_matrix[m][n];
      if (d < 0) continue;
      if (!sums[d]) sums[d] = { sx: 0, sy: 0, count: 0 };
      sums[d].sx += result.x_values[n];
      sums[d].sy += result.y_values[m];
      sums[d].count++;
    }
  }

  return Object.entries(sums)
    .filter(([, v]) => v.count >= 3)
    .map(([dStr, { sx, sy, count }]) => {
      const d   = Number(dStr);
      const idx = unique.indexOf(d);
      return {
        x: sx / count,
        y: sy / count,
        text: `D${d}`,
        font: { color: TAB10[idx % TAB10.length], size: 11, family: "ui-monospace, monospace" },
        bgcolor: "rgba(255,255,255,0.75)",
        borderpad: 2,
        showarrow: false,
        xref: "x" as const,
        yref: "y" as const,
      };
    });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DynamicHeatmap({
  result,
  xVector,
  xK,
  yVector,
  yK,
  title,
  colourConfig,
  showDivisors,
  showZeroLocus,
  loading,
}: DynamicHeatmapProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [plotSize, setPlotSize] = useState(500);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setPlotSize(Math.max(200, Math.floor(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const colorscale = useMemo(() => buildColorscale(colourConfig), [colourConfig]);
  const ticks      = useMemo(() => buildColourbarTicks(colourConfig), [colourConfig]);

  const divisorInfo = useMemo(() => {
    if (!showDivisors || !result) return null;
    const trace = buildDivisorTrace(result);
    if (!trace) return null;
    return { trace, annots: buildCentroidAnnotations(result, trace.unique) };
  }, [showDivisors, result]);

  const zeroLocusTrace = useMemo(() => {
    if (!showZeroLocus || !result) return null;
    const finite = result.sign_matrix.flat().filter((v) => v !== null) as number[];
    if (finite.length === 0 || finite.every((v) => v >= 0) || finite.every((v) => v <= 0)) return null;
    return {
      type: "contour" as const,
      x: result.x_values,
      y: result.y_values,
      z: result.sign_matrix,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contours: { start: 0, end: 0, size: 1, coloring: "none" as any },
      line: { color: "black", width: 2.5 },
      showscale: false,
      hoverongaps: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hoverinfo: "skip" as any,
    };
  }, [showZeroLocus, result]);

  if (!result) {
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
        {loading ? "" : "Configure parameters and the heatmap will appear here."}
      </div>
    );
  }

  const mainTrace = {
    type: "heatmap" as const,
    x: result.x_values,
    y: result.y_values,
    z: result.sign_matrix,
    zmin: colourConfig.vmin,
    zmax: colourConfig.vmax,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    zmid: 0 as any,
    colorscale,
    colorbar: {
      tickvals: ticks,
      ticktext: ticks.map((t) => t.toFixed(3)),
      thickness: 20,
    },
    hoverongaps: false,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = [mainTrace];
  if (divisorInfo) {
    const { unique: _unused, ...plotlyTrace } = divisorInfo.trace;
    void _unused;
    data.push(plotlyTrace);
  }
  if (zeroLocusTrace) data.push(zeroLocusTrace);

  const annotations: Partial<Annotations>[] = divisorInfo?.annots ?? [];

  const layout: Partial<Layout> = {
    title: { text: title, font: { size: 13 } },
    xaxis: { title: specLabel(xVector, xK) },
    yaxis: { title: specLabel(yVector, yK), autorange: "reversed" },
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
        data={data}
        layout={layout}
        config={{ displayModeBar: false, responsive: false }}
        style={{ display: "block" }}
      />
      {loading && <LoadingSpinner />}
    </div>
  );
}
