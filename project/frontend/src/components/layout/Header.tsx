// frontend/src/components/layout/Header.tsx

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
          <NavLink to="/"        active={pathname === "/"}>About</NavLink>
          <NavLink to="/compute" active={pathname.startsWith("/compute")}>Compute</NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link to={to} style={{ ...styles.link, ...(active ? styles.linkActive : {}) }}>
      {children}
    </Link>
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
  nav: { display: "flex", gap: "24px" },
  link: { textDecoration: "none", fontSize: "0.875rem", color: "#666" },
  linkActive: { color: "#1a1a1a", fontWeight: 500 },
} as const;
