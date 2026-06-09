import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Forward API calls to the Express backend so the browser only ever talks to Vite.
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
