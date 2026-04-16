// frontend/src/components/viz/SliderPanel.tsx
// Role: Renders one range slider per slider axis (axes 0 … N−3).
//       Labels show actual stored α values from axis_values, not i/(M−1).
// Assumptions:
//   - For N=2 (pure 2D data), no sliders are rendered.
//   - sliderIndices.length === meta.num_dimensions − 2.
//   - onChange is called with the full updated indices array.

import React from "react";
import type { ExperimentMeta } from "../../types/index";

const AXIS_LETTERS = "abcdefghijklmnopqrstuvwxyz";

function axisLabel(k: number): string {
  return `\u03b1_${AXIS_LETTERS[k] ?? String(k)}`;
}

interface SliderPanelProps {
  meta: ExperimentMeta;
  sliderIndices: number[];
  onChange: (indices: number[]) => void;
}

export function SliderPanel({
  meta,
  sliderIndices,
  onChange,
}: SliderPanelProps): React.ReactElement | null {
  const numSliders = meta.num_dimensions - 2;
  if (numSliders <= 0) return null;

  function handleChange(k: number, rawValue: number): void {
    const updated = [...sliderIndices];
    updated[k] = rawValue;
    onChange(updated);
  }

  return (
    <div style={styles.container}>
      {Array.from({ length: numSliders }, (_, k) => {
        const idx = sliderIndices[k] ?? 0;
        const val = meta.axis_values[k]?.[idx] ?? 0;
        const label = `${axisLabel(k)} = ${val.toFixed(4)}`;

        return (
          <div key={k} style={styles.row}>
            <label style={styles.label} htmlFor={`slider-${k}`}>
              {label}
            </label>
            <input
              id={`slider-${k}`}
              type="range"
              min={0}
              max={meta.grid_size - 1}
              step={1}
              value={idx}
              onChange={(e) => handleChange(k, Number(e.target.value))}
              style={styles.input}
            />
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  row: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  label: {
    fontSize: "0.825rem",
    color: "#444",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "0.01em",
  },
  input: {
    width: "100%",
    accentColor: "#555",
    cursor: "pointer",
  },
} as const;
