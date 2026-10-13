// Stands in for src/lib/apiKey.js inside the plugin bundle. The plugin never
// holds or sends an OpenAI key: every generation uses the key stored in the
// generate Edge Function's secrets.
export function getApiKey(): string {
  return "";
}

export function setApiKey(_value?: string): void {
  // Intentionally a no-op in the plugin.
}
