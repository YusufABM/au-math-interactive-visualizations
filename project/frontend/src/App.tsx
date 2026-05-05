// frontend/src/App.tsx
// Role: Root component. Sets up React Router with a persistent Header/Footer
//       shell and routes for the Home, Compute, and Admin pages.

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Header }      from "./components/layout/Header";
import { Footer }      from "./components/layout/Footer";
import { HomePage }    from "./pages/HomePage";
import { ComputePage } from "./pages/ComputePage";
import { AdminPage }   from "./pages/AdminPage";

export function App(): React.ReactElement {
  return (
    <div style={styles.shell}>
      <Header />
      <div style={styles.content}>
        <Routes>
          <Route path="/"        element={<HomePage />} />
          <Route path="/compute" element={<ComputePage />} />
          <Route path="/admin"   element={<AdminPage />} />
          {/* Legacy redirect */}
          <Route path="/explorer" element={<Navigate to="/compute" replace />} />
          <Route path="*"         element={<HomePage />} />
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
