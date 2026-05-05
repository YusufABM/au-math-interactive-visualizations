// frontend/src/components/viz/GeometryControls.tsx
import React, { useState } from "react";

interface GeometryControlsProps {
  coneLabels: string[];
  rayLabels: string[];
  validBlowdownIndices: Set<number>;
  onBlowup: (coneIndex: number) => void;
  onBlowdown: (rayIndex: number) => void;
  error?: string | null;
}

export function GeometryControls({
  coneLabels,
  rayLabels,
  validBlowdownIndices,
  onBlowup,
  onBlowdown,
  error,
}: GeometryControlsProps): React.ReactElement {
  const [selectedCone, setSelectedCone] = useState(0);
  const [selectedRay,  setSelectedRay]  = useState(0);

  const safeCone = Math.min(selectedCone, coneLabels.length - 1);
  const safeRay  = Math.min(selectedRay,  rayLabels.length  - 1);
  const canBlowdown = validBlowdownIndices.has(safeRay);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={row}>
        {/* Blow-up */}
        <div style={half}>
          <span style={lbl}>Blow-up cone</span>
          <select
            value={safeCone}
            onChange={(e) => setSelectedCone(Number(e.target.value))}
            style={sel}
          >
            {coneLabels.map((l, i) => (
              <option key={i} value={i}>{l}</option>
            ))}
          </select>
          <button style={btn} onClick={() => onBlowup(safeCone)}>
            Blow up
          </button>
        </div>

        {/* Blow-down */}
        <div style={half}>
          <span style={lbl}>Blow-down ray</span>
          <select
            value={safeRay}
            onChange={(e) => setSelectedRay(Number(e.target.value))}
            style={sel}
          >
            {rayLabels.map((l, i) => (
              <option key={i} value={i}>{l}</option>
            ))}
          </select>
          <button
            style={{ ...btn, opacity: canBlowdown ? 1 : 0.35, cursor: canBlowdown ? "pointer" : "not-allowed" }}
            onClick={() => { if (canBlowdown) onBlowdown(safeRay); }}
            disabled={!canBlowdown}
          >
            Blow down
          </button>
        </div>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: "0.78rem", color: "#cc2222" }}>{error}</p>
      )}
    </div>
  );
}

const row:  React.CSSProperties = { display: "flex", gap: 8 };
const half: React.CSSProperties = { flex: 1, display: "flex", flexDirection: "column", gap: 4 };
const lbl:  React.CSSProperties = { fontSize: "0.72rem", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" };
const sel:  React.CSSProperties = { width: "100%", padding: "3px 5px", fontSize: "0.76rem", border: "1px solid #ccc", borderRadius: 3 };
const btn:  React.CSSProperties = { padding: "4px 6px", fontSize: "0.76rem", border: "1px solid #ccc", borderRadius: 3, background: "#f5f5f5", cursor: "pointer" };
