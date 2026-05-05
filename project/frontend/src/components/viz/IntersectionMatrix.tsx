// frontend/src/components/viz/IntersectionMatrix.tsx
import React from "react";

interface IntersectionMatrixProps {
  matrix: number[][];
}

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

function diagBg(val: number): string {
  if (val === -1) return "#d4edda";
  if (val < -1)  return "#f8d7da";
  return "#fff3cd";
}

export function IntersectionMatrix({ matrix }: IntersectionMatrixProps): React.ReactElement {
  const n = matrix.length;

  const cell: React.CSSProperties = {
    border: "1px solid #ddd",
    padding: "2px 7px",
    textAlign: "center",
    fontSize: "0.76rem",
    fontFamily: "ui-monospace, monospace",
    minWidth: 26,
  };
  const hdr: React.CSSProperties = {
    ...cell,
    fontWeight: 600,
    background: "#f5f5f5",
    color: "#555",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", margin: "0 auto" }}>
        <thead>
          <tr>
            <th style={hdr} />
            {Array.from({ length: n }, (_, k) => (
              <th key={k} style={hdr}>
                D<sub>{LETTERS[k] ?? k}</sub>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td style={hdr}>
                D<sub>{LETTERS[i] ?? i}</sub>
              </td>
              {row.map((val, j) => (
                <td
                  key={j}
                  style={{ ...cell, background: i === j ? diagBg(val) : "transparent" }}
                >
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
