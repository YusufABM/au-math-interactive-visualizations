// frontend/src/components/layout/Footer.tsx
// Role: Minimal academic footer with department and project credit line.
// Assumptions: No branding logos. Plain text only.

import React from "react";

export function Footer(): React.ReactElement {
  return (
    <footer style={styles.footer}>
      <div style={styles.inner}>
        <span style={styles.text}>
          Department of Mathematics, Aarhus University · Research project on cscK metrics and the J-equation on toric surface blowups ·{" "}
          <a href="https://projects.au.dk/smkg" style={styles.link} target="_blank" rel="noreferrer">
            https://projects.au.dk/smkg
          </a>
        </span>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    borderTop: "1px solid #e0e0e0",
    background: "#fafafa",
    marginTop: "auto",
  },
  inner: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "16px 24px",
  },
  text: {
    fontSize: "0.8rem",
    color: "#888",
  },
  link: {
    color: "#888",
    textDecoration: "underline",
  },
} as const;
