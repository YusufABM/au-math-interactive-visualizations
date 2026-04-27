// frontend/src/App.tsx
// Role: Root component. Sets up React Router with a persistent Header/Footer
//       shell and routes for the Home and Explorer pages.
// Assumptions: BrowserRouter is provided by main.tsx (no Router here).

import React from "react";
import { Routes, Route } from "react-router-dom";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { HomePage } from "./pages/HomePage";
import { ExplorerPage } from "./pages/ExplorerPage";
import { AdminPage } from "./pages/AdminPage";

export function App(): React.ReactElement {
  return (
    <div style={styles.shell}>
      <Header />
      <div style={styles.content}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explorer" element={<ExplorerPage />} />
          <Route path="/admin" element={<AdminPage />} />
          {/* Fallback — redirect unknown paths to home */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

const styles = {
  shell: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    background: "#ffffff",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
  },
} as const;
