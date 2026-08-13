import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
  // Railway (and most PaaS) inject PORT at runtime for the deployed `vite preview` process; the
  // proxy above only applies to the dev server (`vite`), not preview, since production talks to
  // the deployed API via VITE_API_URL (see apiClient.ts) rather than a proxy.
  preview: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
});
