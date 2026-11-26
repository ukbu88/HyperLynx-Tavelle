import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": {
        // Keep Host as the Vite origin so Better Auth cookies bind to :5173.
        target: "http://127.0.0.1:8787",
        changeOrigin: false,
      },
    },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
