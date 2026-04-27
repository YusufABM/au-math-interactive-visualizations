// frontend/vite.config.ts
// Role: Vite build configuration.
// Assumptions: Backend runs on http://localhost:8000 during development.
//              /api/* requests are proxied so the frontend never hardcodes the base URL.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  cacheDir: path.resolve(__dirname, ".vite-cache"),
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
