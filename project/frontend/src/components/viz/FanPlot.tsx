// frontend/src/components/viz/FanPlot.tsx
import React from "react";

interface FanPlotProps {
  rays: [number, number][];
}

const SIZE   = 120;
const MARGIN = 16;
const CX     = SIZE / 2;
const CY     = SIZE / 2;
const SCALE  = (SIZE / 2) - MARGIN;

const COLORS = [
  "#e74c3c","#3498db","#2ecc71","#e67e22",
  "#9b59b6","#1abc9c","#f39c12","#c0392b",
];

export function FanPlot({ rays }: FanPlotProps): React.ReactElement {
  const maxMag = Math.max(...rays.map(([x, y]) => Math.sqrt(x * x + y * y)), 1);
  const scale  = SCALE / maxMag;

  return (
    <svg
      width={SIZE}
      height={SIZE}
      style={{ display: "block", margin: "0 auto", overflow: "visible" }}
    >
      <line x1={MARGIN} y1={CY} x2={SIZE - MARGIN} y2={CY} stroke="#e0e0e0" strokeWidth={0.75} />
      <line x1={CX} y1={MARGIN} x2={CX} y2={SIZE - MARGIN} stroke="#e0e0e0" strokeWidth={0.75} />
      <circle cx={CX} cy={CY} r={2} fill="#aaa" />

      {rays.map(([rx, ry], i) => {
        const ex    = CX + rx * scale;
        const ey    = CY - ry * scale;
        const color = COLORS[i % COLORS.length];
        const nmag  = Math.sqrt(rx * rx + ry * ry) || 1;
        const tx    = CX + (rx / nmag) * (SCALE + 8);
        const ty    = CY - (ry / nmag) * (SCALE + 8);
        return (
          <g key={i}>
            <line x1={CX} y1={CY} x2={ex} y2={ey} stroke={color} strokeWidth={1.5} />
            <circle cx={ex} cy={ey} r={3} fill={color} />
            <text
              x={tx} y={ty}
              fontSize={8} fill={color}
              textAnchor="middle" dominantBaseline="central"
              fontFamily="ui-monospace, monospace"
            >
              D{i}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
