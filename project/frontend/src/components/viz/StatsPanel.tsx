// frontend/src/components/viz/StatsPanel.tsx
// Role: Displays β, anticanonical value, min/max values, and divisor counts
//       for the current 2D slice. All values rendered via KaTeX where appropriate.
// Assumptions:
//   - stats values exclude sentinel cells (already filtered by the backend).
//   - antican_position / min_position / max_position are [α_b_val, α_c_val].
//   - Divisor counts use period as thousands separator (1.234.567).

import React from "react";
import { MathDisplay } from "../ui/MathDisplay";
import type { SliceStats, ExperimentMeta } from "../../types/index";

const AXIS_LETTERS = "abcdefghijklmnopqrstuvwxyz";

function axisLabel(k: number): string {
  return `\\alpha_{${AXIS_LETTERS[k] ?? String(k)}}`;
}

// β = β_H·H − β_E1·E_1 − β_E2·E_2 − …
function buildBetaTex(coeffs: number[]): string {
  if (coeffs.length === 0) return "\\beta = 0";
  const BASES = ["H", "E_1", "E_2", "E_3", "E_4", "E_5", "E_6"];
  const terms = coeffs.map(
    (c, i) => `${c.toFixed(4)} \\cdot ${BASES[i] ?? `E_{${i}}`}`
  );
  const head = terms[0];
  const tail = terms.slice(1).map((t) => ` - ${t}`).join("");
  return `\\beta = ${head}${tail}`;
}

// Position shown as: (α_b, α_c) = (0.3500, 0.6000) — heatmap axes N-2 and N-1.
function buildPositionTex(pos: number[], N: number): string {
  const lb = axisLabel(N - 2);
  const lc = axisLabel(N - 1);
  return `(${lb},\\, ${lc}) = (${pos[0].toFixed(4)},\\, ${pos[1].toFixed(4)})`;
}

// Period-separated thousands: 1234567 → 1.234.567
function formatCount(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

interface StatsPanelProps {
  stats: SliceStats;
  meta: ExperimentMeta;
}

export function StatsPanel({ stats, meta }: StatsPanelProps): React.ReactElement {
  const N = meta.num_dimensions;

  return (
    <div style={styles.container}>
      {/* ── Section 1: β ─────────────────────────────────────────────────── */}
      <section style={styles.section}>
        <h4 style={styles.sectionTitle}>Anticanonical class</h4>
        <MathDisplay tex={buildBetaTex(stats.beta_coeffs)} display />
      </section>

      {/* ── Section 2: Slice statistics ───────────────────────────────────── */}
      <section style={styles.section}>
        <h4 style={styles.sectionTitle}>Slice statistics</h4>

        <StatRow
          label="Antican. value"
          value={stats.antican_value.toFixed(10)}
          positionTex={buildPositionTex(stats.antican_position, N)}
        />
        <StatRow
          label="Minimum value"
          value={stats.min_value.toFixed(10)}
          positionTex={buildPositionTex(stats.min_position, N)}
        />
        <StatRow
          label="Maximum value"
          value={stats.max_value.toFixed(10)}
          positionTex={buildPositionTex(stats.max_position, N)}
        />
      </section>

      {/* ── Section 3: Divisor table ──────────────────────────────────────── */}
      {stats.unique_divisors.length > 0 && (
        <section style={styles.section}>
          <h4 style={styles.sectionTitle}>Divisors (current slice)</h4>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Divisor</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {stats.unique_divisors.map(({ divisor, count }) => (
                <tr key={divisor}>
                  <td style={styles.td}>{divisor}</td>
                  <td style={{ ...styles.td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {formatCount(count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

interface StatRowProps {
  label: string;
  value: string;
  positionTex: string;
}

function StatRow({ label, value, positionTex }: StatRowProps): React.ReactElement {
  return (
    <div style={styles.statRow}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
      <span style={styles.statPosition}>
        <MathDisplay tex={positionTex} />
      </span>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  section: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "#888",
  },
  statRow: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1px",
    paddingBottom: "6px",
    borderBottom: "1px solid #f0f0f0",
  },
  statLabel: {
    fontSize: "0.75rem",
    color: "#999",
    fontWeight: 500,
  },
  statValue: {
    fontSize: "0.8rem",
    fontFamily: "ui-monospace, monospace",
    color: "#222",
    fontVariantNumeric: "tabular-nums",
  },
  statPosition: {
    fontSize: "0.75rem",
    color: "#666",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.8rem",
  },
  th: {
    padding: "3px 6px",
    textAlign: "left" as const,
    fontWeight: 600,
    color: "#666",
    borderBottom: "1px solid #ddd",
    fontSize: "0.75rem",
  },
  td: {
    padding: "2px 6px",
    color: "#333",
    borderBottom: "1px solid #f4f4f4",
  },
} as const;
