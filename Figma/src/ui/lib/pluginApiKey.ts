// Swapped in for src/lib/pluginApiKey.js. The UI loads the key from
// figma.clientStorage and keeps it here so services/ai.js can attach it.
let current = "";

export const PLUGIN_KEY_STORAGE = "blos-figma-plugin-key";

export function getPluginApiKey(): string {
  return current;
}

export function setPluginApiKey(value?: string): void {
  current = (value || "").trim();
}
