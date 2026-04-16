// frontend/src/components/ui/Toggle.tsx
// Role: Labelled checkbox toggle for boolean UI controls.
// Assumptions: Caller owns the checked state and onChange handler.

import React from "react";

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps): React.ReactElement {
  return (
    <label style={styles.label}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={styles.input}
      />
      <span>{label}</span>
    </label>
  );
}

const styles = {
  label: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "0.875rem",
    color: "#444",
  },
  input: {
    cursor: "pointer",
    width: "16px",
    height: "16px",
    accentColor: "#555",
  },
} as const;
