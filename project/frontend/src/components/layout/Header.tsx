// frontend/src/components/layout/Header.tsx
// Role: Minimal site header with project title and nav link to the explorer.
// Assumptions: React Router is used for navigation. No external branding.

import React from "react";
import { Link, useLocation } from "react-router-dom";

export function Header(): React.ReactElement {
  const { pathname } = useLocation();

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <span style={styles.title}>
          cscK &amp; J-equation on Toric Blowups
        </span>
        <nav style={styles.nav}>
          <Link
            to="/"
            style={{
              ...styles.link,
              ...(pathname === "/" ? styles.linkActive : {}),
            }}
          >
            About
          </Link>
          <Link
            to="/explorer"
            style={{
              ...styles.link,
              ...(pathname.startsWith("/explorer") ? styles.linkActive : {}),
            }}
          >
            Explorer
          </Link>
        </nav>
      </div>
    </header>
  );
}

const styles = {
  header: {
    borderBottom: "1px solid #e0e0e0",
    background: "#ffffff",
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
  },
  inner: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "0 24px",
    height: "52px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#1a1a1a",
    letterSpacing: "-0.01em",
  },
  nav: {
    display: "flex",
    gap: "24px",
  },
  link: {
    textDecoration: "none",
    fontSize: "0.875rem",
    color: "#666",
  },
  linkActive: {
    color: "#1a1a1a",
    fontWeight: 500,
  },
} as const;
