// Writes manifest.json from manifest.template.json, allowing network access to
// exactly one origin: this project's Supabase URL.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { FIGMA_DIR, loadPluginConfig } from "./env.mjs";

export function buildManifest(mode = "production") {
  const config = loadPluginConfig(mode);
  const template = JSON.parse(fs.readFileSync(path.join(FIGMA_DIR, "manifest.template.json"), "utf8"));
  const manifest = {
    ...template,
    id: config.pluginId,
    networkAccess: { ...template.networkAccess, allowedDomains: [config.supabaseUrl] },
  };
  fs.writeFileSync(path.join(FIGMA_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const m = buildManifest();
  console.log(`manifest.json written (id: ${m.id}, network: ${m.networkAccess.allowedDomains.join(", ")})`);
}
