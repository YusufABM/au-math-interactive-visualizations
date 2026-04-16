// frontend/src/pages/ExplorerPage.tsx
// Role: Two-column explorer layout. Left panel holds controls; right panel
//       holds the heatmap. Owns all shared state: selectedId, sliderIndices,
//       colourConfig, showDivisors. Delegates API access to hooks.
// Assumptions:
//   - useExperiments returns { experiments, loading, error }.
//   - useSlice clears data immediately on experiment change and debounces
//     the POST request by 150ms on slider index changes.
//   - All components receive typed props — no prop drilling of raw state.

import React, { useState } from "react";
import { useExperiments } from "../hooks/useExperiments";
import { useSlice } from "../hooks/useSlice";
import { Heatmap } from "../components/viz/Heatmap";
import { SliderPanel } from "../components/viz/SliderPanel";
import { StatsPanel } from "../components/viz/StatsPanel";
import { ColourScaleControls } from "../components/viz/ColourScaleControls";
import { ExperimentSelector } from "../components/viz/ExperimentSelector";
import { Toggle } from "../components/ui/Toggle";
import type { ExperimentMeta, ColourScaleConfig } from "../types/index";

const DEFAULT_COLOUR: ColourScaleConfig = { vmin: -5.0, vcenter: 0.0, vmax: 1.0 };

export function ExplorerPage(): React.ReactElement {
  // ── Experiment catalogue ────────────────────────────────────────────────────
  const { experiments, loading: expLoading, error: expError } = useExperiments();

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sliderIndices, setSliderIndices] = useState<number[]>([]);
  const [colourConfig, setColourConfig] = useState<ColourScaleConfig>(DEFAULT_COLOUR);
  const [showDivisors, setShowDivisors] = useState(false);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const selectedMeta: ExperimentMeta | null =
    experiments.find((e) => e.id === selectedId) ?? null;

  // ── Slice data ──────────────────────────────────────────────────────────────
  const { data: slice, loading: sliceLoading, error: sliceError } = useSlice(
    selectedId,
    sliderIndices
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleExperimentChange(id: string): void {
    const meta = experiments.find((e) => e.id === id);
    setSelectedId(id);
    // Reset sliders for the new experiment dimensions.
    setSliderIndices(
      meta ? Array<number>(meta.num_dimensions - 2).fill(0) : []
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* ── Left panel ───────────────────────────────────────────────────────── */}
      <aside style={styles.sidebar}>

        {expLoading && <p style={styles.statusText}>Loading experiments…</p>}
        {expError && <p style={styles.errorText}>Error: {expError}</p>}

        {!expLoading && (
          <ExperimentSelector
            experiments={experiments}
            selectedId={selectedId}
            onChange={handleExperimentChange}
          />
        )}

        {selectedMeta && (
          <>
            <Divider />
            <SliderPanel
              meta={selectedMeta}
              sliderIndices={sliderIndices}
              onChange={setSliderIndices}
            />
          </>
        )}

        <Divider />
        <Toggle
          label="Show divisor annotations"
          checked={showDivisors}
          onChange={setShowDivisors}
        />

        {slice && selectedMeta && (
          <>
            <Divider />
            <StatsPanel stats={slice.stats} meta={selectedMeta} />
          </>
        )}

        {sliceError && (
          <p style={styles.errorText}>Slice error: {sliceError}</p>
        )}

        <Divider />
        <ColourScaleControls config={colourConfig} onChange={setColourConfig} />

      </aside>

      {/* ── Right panel — heatmap ─────────────────────────────────────────────── */}
      <section style={styles.heatmapPanel}>
        {selectedMeta ? (
          <Heatmap
            slice={slice}
            meta={selectedMeta}
            colourConfig={colourConfig}
            showDivisors={showDivisors}
            loading={sliceLoading}
          />
        ) : (
          <div style={styles.emptyHeatmap}>
            Select an experiment from the panel on the left.
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Tiny layout helper ────────────────────────────────────────────────────────

function Divider(): React.ReactElement {
  return <hr style={styles.divider} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0",
    flex: 1,
    minHeight: 0,
  },
  sidebar: {
    width: "30%",
    minWidth: "260px",
    padding: "24px 20px",
    borderRight: "1px solid #e8e8e8",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0",
    overflowY: "auto" as const,
    // Stack below heatmap on small screens via media-query fallback:
    // (full media-query support requires CSS-in-JS or a stylesheet)
  },
  heatmapPanel: {
    flex: 1,
    minWidth: "300px",
    padding: "24px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  emptyHeatmap: {
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
    maxWidth: "700px",
  },
  divider: {
    border: "none",
    borderTop: "1px solid #efefef",
    margin: "16px 0",
  },
  statusText: {
    fontSize: "0.85rem",
    color: "#888",
    margin: "0 0 12px 0",
  },
  errorText: {
    fontSize: "0.82rem",
    color: "#c00",
    margin: "0 0 12px 0",
  },
} as const;
