// frontend/src/components/viz/ExperimentSelector.tsx
// Role: Grouped <select> for choosing an experiment. Options are grouped by
//       surface type; option text is a plain-text rendering of latex_label.
// Assumptions:
//   - Experiments arrive pre-sorted (type → surface → num_points → file_index)
//     from the backend, matching the desired display order within each group.
//   - onChange triggers slider reset and slice clear in the parent.

import React from "react";
import type { ExperimentMeta } from "../../types/index";

// ─── Group definitions (order determines display order) ───────────────────────

interface Group {
  label: string;
  type: "CSCK" | "Jeq";
  surface: string;
}

const GROUPS: Group[] = [
  { label: "CSCK \u2014 \u2119\u00b2",           type: "CSCK", surface: "BlP2" },
  { label: "CSCK \u2014 \u2119\u00b9\u00d7\u2119\u00b9", type: "CSCK", surface: "BlP1xP1" },
  { label: "CSCK \u2014 Hirzebruch(r=2)",          type: "CSCK", surface: "BlHirzebruch2" },
  { label: "J-eq \u2014 \u2119\u00b2",            type: "Jeq",  surface: "BlP2" },
  { label: "J-eq \u2014 \u2119\u00b9\u00d7\u2119\u00b9", type: "Jeq",  surface: "BlP1xP1" },
];

// Strip LaTeX markup to produce a readable plain-text option label.
function stripLatex(tex: string): string {
  return tex
    .replace(/\\mathrm\{([^}]*)\}/g, "$1")
    .replace(/\\mathbb\{([^}]*)\}/g, "$1")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\times/g, "\u00d7")
    .replace(/\\[,;!: ]/g, " ")
    .replace(/\{([^}]*)\}/g, "$1")
    .replace(/\\_/g, "_")
    .replace(/\\#/g, "#")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ExperimentSelectorProps {
  experiments: ExperimentMeta[];
  selectedId: string | null;
  onChange: (id: string) => void;
}

export function ExperimentSelector({
  experiments,
  selectedId,
  onChange,
}: ExperimentSelectorProps): React.ReactElement {
  return (
    <div style={styles.container}>
      <label style={styles.label} htmlFor="experiment-select">
        Experiment
      </label>
      <select
        id="experiment-select"
        value={selectedId ?? ""}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        style={styles.select}
      >
        <option value="" disabled>
          — select an experiment —
        </option>

        {GROUPS.map((group) => {
          const members = experiments.filter(
            (e) => e.type === group.type && e.surface === group.surface
          );
          if (members.length === 0) return null;

          return (
            <optgroup key={`${group.type}-${group.surface}`} label={group.label}>
              {members.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {stripLatex(exp.latex_label)}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  label: {
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "#888",
  },
  select: {
    width: "100%",
    padding: "5px 8px",
    fontSize: "0.85rem",
    border: "1px solid #ccc",
    borderRadius: "3px",
    background: "#fff",
    color: "#222",
    cursor: "pointer",
  },
} as const;
