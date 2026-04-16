// frontend/src/components/ui/LoadingSpinner.tsx
// Role: CSS-only spinner shown while a slice fetch is in flight.
//       Overlaid on the previous heatmap — does not clear the chart.
// Assumptions: Parent must have position: relative for the overlay to work.

import React from "react";

const keyframes = `
@keyframes csck-spin {
  to { transform: rotate(360deg); }
}
`;

// Inject keyframes once into the document head.
if (typeof document !== "undefined") {
  const id = "csck-spinner-keyframes";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = keyframes;
    document.head.appendChild(style);
  }
}

export function LoadingSpinner(): React.ReactElement {
  return (
    <div style={styles.overlay}>
      <div style={styles.spinner} />
    </div>
  );
}

const styles = {
  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.55)",
    zIndex: 10,
    pointerEvents: "none",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: "3px solid #ddd",
    borderTop: "3px solid #666",
    borderRadius: "50%",
    animation: "csck-spin 0.75s linear infinite",
  },
} as const;
