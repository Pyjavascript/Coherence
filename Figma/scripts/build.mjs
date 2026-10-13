// Builds the plugin: manifest.json, dist/code.js (main thread) and dist/ui.html
// (single-file UI). `--watch` rebuilds both on change for Figma's hot reload.
import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";
import { build as viteBuild } from "vite";
import { FIGMA_DIR, loadPluginConfig } from "./env.mjs";
import { buildManifest } from "./build-manifest.mjs";
import { checkBundle } from "./check-bundle.mjs";

const watch = process.argv.includes("--watch");
const mode = watch ? "development" : "production";

const config = loadPluginConfig(mode);
fs.mkdirSync(path.join(FIGMA_DIR, "dist"), { recursive: true });
buildManifest(mode);
console.log(`manifest.json → network access: ${config.supabaseUrl}`);

const mainOptions = {
  entryPoints: [path.join(FIGMA_DIR, "src/main/code.ts")],
  outfile: path.join(FIGMA_DIR, "dist/code.js"),
  bundle: true,
  format: "iife",
  // Figma's main-thread sandbox: stay conservative with syntax.
  target: "es2017",
  logLevel: "info",
  define: { __BLOS_WEB_URL__: JSON.stringify(config.webUrl) },
};

const viteOptions = { configFile: path.join(FIGMA_DIR, "vite.config.ts"), mode, logLevel: "info" };

if (watch) {
  const ctx = await esbuild.context(mainOptions);
  await ctx.watch();
  await viteBuild({ ...viteOptions, build: { watch: {} } });
  console.log("Watching. Turn on Plugins > Development > Hot reload plugin in Figma.");
} else {
  await esbuild.build(mainOptions);
  await viteBuild(viteOptions);
  checkBundle();
  console.log("Done. Import Figma/manifest.json in Figma Desktop (Plugins > Development > Import plugin from manifest…).");
}
