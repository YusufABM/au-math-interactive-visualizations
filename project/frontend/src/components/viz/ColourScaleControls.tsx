// frontend/src/components/viz/ColourScaleControls.tsx
// Role: UI controls for overriding vmin and vmax of the global colorscale.
//       vcenter is always 0.0 and is shown as a read-only label.
//       Changing vmin/vmax triggers a colorscale recompute without a new slice fetch.
// Assumptions:
//   - onChange propagates upward; the parent passes the new config to Heatmap.
//   - Inputs are uncontrolled-style with defaultValue so typing is fluid; the
//     value is committed on blur or Enter, validated to ensure vmin < vmax.

import React, { useRef } from "react";
import type { ColourScaleConfig } from "../../types/index";

interface ColourScaleControlsProps {
  config: ColourScaleConfig;
  onChange: (config: ColourScaleConfig) => void;
}

export function ColourScaleControls({
  config,
  onChange,
}: ColourScaleControlsProps): React.ReactElement {
  const vminRef = useRef<HTMLInputElement>(null);
  const vmaxRef = useRef<HTMLInputElement>(null);

  function commit(): void {
    const rawMin = parseFloat(vminRef.current?.value ?? String(config.vmin));
    const rawMax = parseFloat(vmaxRef.current?.value ?? String(config.vmax));
    if (isNaN(rawMin) || isNaN(rawMax) || rawMin >= rawMax) return;
    onChange({ vmin: rawMin, vcenter: 0.0, vmax: rawMax });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") commit();
  }

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Colour scale</h4>

      <div style={styles.row}>
        <label style={styles.label} htmlFor="cs-vmin">
          v<sub>min</sub>
        </label>
        <input
          id="cs-vmin"
          ref={vminRef}
          type="number"
          step="0.5"
          defaultValue={config.vmin}
          key={config.vmin}          // reset when config changes externally
          onBlur={commit}
          onKeyDown={handleKeyDown}
          style={styles.input}
        />
      </div>

      <div style={styles.row}>
        <label style={styles.label} htmlFor="cs-vcenter">
          v<sub>center</sub>
        </label>
        <span style={styles.fixed}>0.0 (fixed)</span>
      </div>

      <div style={styles.row}>
        <label style={styles.label} htmlFor="cs-vmax">
          v<sub>max</sub>
        </label>
        <input
          id="cs-vmax"
          ref={vmaxRef}
          type="number"
          step="0.5"
          defaultValue={config.vmax}
          key={config.vmax}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          style={styles.input}
        />
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  title: {
    margin: 0,
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "#888",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  label: {
    fontSize: "0.8rem",
    color: "#555",
    width: "60px",
    flexShrink: 0,
  },
  input: {
    width: "90px",
    padding: "3px 6px",
    fontSize: "0.8rem",
    border: "1px solid #d0d0d0",
    borderRadius: "3px",
    background: "#fff",
    color: "#222",
  },
  fixed: {
    fontSize: "0.8rem",
    color: "#999",
    fontStyle: "italic",
  },
} as const;
