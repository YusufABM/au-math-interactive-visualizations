// frontend/src/components/viz/KaehlerConditions.tsx
// Shows the non-redundant Kahler cone inequalities for the current surface.
// Colors each condition green (satisfied) or red (violated) based on
// current alpha and beta vectors.

import React from "react";
import type { EquationName } from "../../types/index";

interface KaehlerConditionsProps {
  strings: string[];
  coefficients: number[][];
  alpha: number[];
  beta: number[];
  equation: EquationName;
}

function dot(a: number[], c: number[]): number {
  return c.reduce((s, ci, i) => s + ci * (a[i] ?? 0), 0);
}

export function KaehlerConditions({
  strings,
  coefficients,
  alpha,
  beta,
  equation,
}: KaehlerConditionsProps): React.ReactElement {
  if (strings.length === 0) return <></>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {strings.map((s, i) => {
        const c        = coefficients[i] ?? [];
        const alphaOk  = dot(alpha, c) > 0;
        const betaOk   = dot(beta, c)  > 0;
        const ok       = equation === "I(alpha)" ? alphaOk : alphaOk && betaOk;
        return (
          <div
            key={i}
            title={
              equation === "I(alpha)"
                ? `α: ${alphaOk ? "✓" : "✗"}`
                : `α: ${alphaOk ? "✓" : "✗"}  β: ${betaOk ? "✓" : "✗"}`
            }
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.80rem",
              color: ok ? "#2a7a2a" : "#cc2222",
              background: ok ? "#f0faf0" : "#fdf0f0",
              borderRadius: 3,
              padding: "1px 6px",
            }}
          >
            {s}
          </div>
        );
      })}
    </div>
  );
}
