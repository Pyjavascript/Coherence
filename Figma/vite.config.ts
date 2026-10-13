/// <reference types="vitest" />
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { FIGMA_DIR, REPO_ROOT, loadPluginConfig } from "./scripts/env.mjs";

// The plugin reuses the web app's src/lib + src/services unchanged. Only two
// web modules are swapped, by resolved file path, inside this bundle:
//   src/lib/supabase.js -> a client that keeps its session in figma.clientStorage
//   src/lib/apiKey.js   -> a stub (the plugin never sends an OpenAI key)
const key = (p: string) => path.resolve(p.split("?")[0]).toLowerCase();
const SWAPS: Record<string, string> = {
  [key(path.join(REPO_ROOT, "src/lib/supabase.js"))]: path.join(FIGMA_DIR, "src/ui/lib/supabaseClient.ts"),
  [key(path.join(REPO_ROOT, "src/lib/apiKey.js"))]: path.join(FIGMA_DIR, "src/ui/lib/apiKeyStub.ts"),
};

function swapWebModules(): Plugin {
  return {
    name: "blos-swap-web-modules",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved) return null;
      return SWAPS[key(resolved.id)] ?? null;
    },
  };
}

export default defineConfig(({ mode }) => {
  const testing = Boolean(process.env.VITEST);
  const config = testing
    ? { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "test-anon-key", webUrl: "", pluginId: "test" }
    : loadPluginConfig(mode);

  return {
    // No .env lives under src/ui, so import.meta.env stays empty: configuration
    // reaches the bundle only through __BLOS_CONFIG__ below.
    root: path.join(FIGMA_DIR, "src/ui"),
    plugins: [swapWebModules(), react(), viteSingleFile()],
    define: {
      __BLOS_CONFIG__: JSON.stringify({
        supabaseUrl: config.supabaseUrl,
        supabaseAnonKey: config.supabaseAnonKey,
        webUrl: config.webUrl,
      }),
    },
    resolve: {
      // "@web/…" = the web app's src/ (lib, services, hooks), reused as-is.
      alias: { "@web": path.join(REPO_ROOT, "src") },
      // Web modules imported from ../src must use this package's React and
      // supabase-js, never a second copy from the repo root node_modules.
      dedupe: ["react", "react-dom", "@supabase/supabase-js"],
    },
    build: {
      outDir: path.join(FIGMA_DIR, "dist"),
      emptyOutDir: false,
      target: "es2020",
      sourcemap: false,
      rollupOptions: { input: path.join(FIGMA_DIR, "src/ui/ui.html") },
    },
    test: {
      root: FIGMA_DIR,
      include: ["tests/**/*.test.ts"],
      environment: "node",
    },
  };
});
