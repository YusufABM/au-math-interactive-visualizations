// frontend/src/pages/HomePage.tsx
// Fetches homepage content (title + body) from the backend and renders it.
// Body supports $...$ inline and $$...$$ display LaTeX.

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LatexText, LatexLine } from "../components/ui/LatexText";

interface HomepageContent {
  title: string;
  body: string;
}

export function HomePage(): React.ReactElement {
  const [content, setContent] = useState<HomepageContent | null>(null);

  useEffect(() => {
    fetch("/api/homepage")
      .then((r) => r.json())
      .then(setContent)
      .catch(() => {
        setContent({
          title: "cscK Metrics and the $J$-equation on Toric Blowups",
          body: "Interactive visualisations of precomputed research results.",
        });
      });
  }, []);

  return (
    <main style={styles.main}>
      <article style={styles.article}>

        <h1 style={styles.h1}>
          {content ? <LatexLine text={content.title} /> : " "}
        </h1>

        <div style={styles.body}>
          {content && <LatexText text={content.body} paragraphStyle={styles.p} />}
        </div>

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
  body: {
    marginBottom: "28px",
  },
  p: {
    fontSize: "1rem",
    color: "#444",
    margin: "0 0 14px 0",
    lineHeight: 1.7,
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
