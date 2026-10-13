// The web app signs in with Supabase Auth, so it never sends a plugin key.
// The Figma bundle swaps this module for one that returns the key saved in
// figma.clientStorage. See Figma/vite.config.ts.
export function getPluginApiKey() {
  return "";
}

export function setPluginApiKey(_value) {
  // No-op in the web app.
}
