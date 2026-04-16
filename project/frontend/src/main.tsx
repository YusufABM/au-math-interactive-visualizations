// frontend/src/main.tsx
// Role: React application entry point. Mounts the App inside BrowserRouter.
// Assumptions: #root exists in index.html. React 18 createRoot API is used.

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("No #root element found in the document.");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
