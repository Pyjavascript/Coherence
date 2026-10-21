import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Scan only the web app for dependencies. By default Vite crawls every .html
  // in the repo, including Figma/src/ui/ui.html, whose "@web/…" imports only
  // resolve under Figma/vite.config.ts.
  optimizeDeps: {
    entries: ["index.html"],
  },
   server: {
    allowedHosts: ['.ngrok-free.dev','.vercel.run']
  }
});
