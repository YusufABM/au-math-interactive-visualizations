// frontend/src/pages/HomePage.tsx
// Role: Landing page with project abstract, mathematical context, and a link
//       to the Explorer. Inline KaTeX used for mathematical expressions.
// Assumptions: MathDisplay is the sole means of rendering LaTeX on this page.

import React from "react";
import { Link } from "react-router-dom";
import { MathDisplay } from "../components/ui/MathDisplay";

export function HomePage(): React.ReactElement {
  return (
    <main style={styles.main}>
      <article style={styles.article}>

        <h1 style={styles.h1}>
          cscK Metrics and the J-equation on Toric Blowups
        </h1>

        <p style={styles.lead}>
          This site presents interactive visualisations of precomputed results
          from a research project on the existence of constant scalar curvature
          Kähler (cscK) metrics and solutions to the J-equation on blowups of
          toric surfaces.
        </p>

        <div style={styles.cta}>
          <Link to="/explorer" style={styles.ctaLink}>
            Open Explorer →
          </Link>
        </div>

      </article>
    </main>
  );
}

const styles = {
  main: {
    flexGrow: 1,
    padding: "48px 24px",
  },
  article: {
    maxWidth: "720px",
    margin: "0 auto",
    lineHeight: 1.7,
  },
  h1: {
    fontSize: "1.6rem",
    fontWeight: 700,
    color: "#111",
    marginBottom: "16px",
    lineHeight: 1.25,
  },
  h2: {
    fontSize: "1.05rem",
    fontWeight: 600,
    color: "#333",
    marginTop: "32px",
    marginBottom: "10px",
  },
  lead: {
    fontSize: "1rem",
    color: "#444",
    marginBottom: "28px",
    lineHeight: 1.7,
  },
  p: {
    fontSize: "0.93rem",
    color: "#444",
    margin: "0 0 14px 0",
  },
  displayMath: {
    margin: "16px 0",
    textAlign: "center" as const,
  },
  ul: {
    paddingLeft: "20px",
    fontSize: "0.93rem",
    color: "#444",
    lineHeight: 1.8,
  },
  cta: {
    marginTop: "36px",
  },
  ctaLink: {
    display: "inline-block",
    padding: "10px 20px",
    background: "#1a1a1a",
    color: "#fff",
    textDecoration: "none",
    borderRadius: "3px",
    fontSize: "0.9rem",
    fontWeight: 500,
    letterSpacing: "0.01em",
  },
} as const;
