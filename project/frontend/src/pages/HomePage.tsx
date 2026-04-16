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

        <h2 style={styles.h2}>Background</h2>

        <p style={styles.p}>
          Let{" "}
          <MathDisplay tex="(X, \omega)" /> be a compact Kähler manifold. The
          cscK equation asks for a Kähler metric in the class{" "}
          <MathDisplay tex="[\omega]" /> with constant scalar curvature. By
          the Yau–Tian–Donaldson conjecture (established in many cases), the
          existence of such a metric is expected to be equivalent to an
          algebro-geometric stability condition called{" "}
          <MathDisplay tex="K" />-polystability.
        </p>

        <p style={styles.p}>
          The <em>J-equation</em> of Chen is a fully nonlinear PDE whose
          solvability is related to the cscK problem via the{" "}
          <em>inverse{" "}
          <MathDisplay tex="\sigma_k" />-conjecture</em>. On a surface{" "}
          <MathDisplay tex="X" />, the J-equation in class{" "}
          <MathDisplay tex="\alpha" /> with reference class{" "}
          <MathDisplay tex="\hat{\omega}" /> reads:
        </p>

        <div style={styles.displayMath}>
          <MathDisplay
            tex="\mathrm{tr}_{\alpha}\,\hat{\omega} = c"
            display
          />
        </div>

        <p style={styles.p}>
          for a topological constant <MathDisplay tex="c" />. Lejmi and
          Székelyhidi showed the solvability is equivalent to a positivity
          condition on the anticanonical class.
        </p>

        <h2 style={styles.h2}>What is visualised</h2>

        <p style={styles.p}>
          The Explorer presents two-dimensional cross-sections of a
          sign/obstruction function over the Kähler cone. The domain is
          parameterised by coordinates{" "}
          <MathDisplay tex="\alpha_a, \alpha_b, \alpha_c, \ldots" /> in the
          basis of <MathDisplay tex="H, E_1, E_2, \ldots" />, where{" "}
          <MathDisplay tex="H" /> is the hyperplane class and{" "}
          <MathDisplay tex="E_i" /> are exceptional divisors of the blowup.
        </p>

        <p style={styles.p}>
          Each heatmap slice shows the value of the obstruction function over
          the <MathDisplay tex="(\alpha_b, \alpha_c)" /> plane at a fixed
          value of the remaining parameters. Regions where the function is{" "}
          <strong>negative</strong> (red) indicate the obstruction does not
          vanish; regions where it is <strong>positive</strong> (green)
          indicate potential solvability; the <strong>zero locus</strong>{" "}
          (yellow) is the boundary. Grey cells indicate out-of-domain or
          non-convergent computations.
        </p>

        <h2 style={styles.h2}>Surfaces studied</h2>
        <ul style={styles.ul}>
          <li>
            Blowups of <MathDisplay tex="\mathbb{P}^2" /> in up to 6 points
          </li>
          <li>
            Blowups of{" "}
            <MathDisplay tex="\mathbb{P}^1 \times \mathbb{P}^1" /> in up to
            5 points
          </li>
          <li>
            Blowups of the Hirzebruch surface{" "}
            <MathDisplay tex="\mathbb{F}_2" /> in up to 5 points
          </li>
        </ul>

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
