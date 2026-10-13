// Shared by vite.config.ts, build.mjs and build-manifest.mjs: the plugin's
// public configuration, read from the repo root .env and then Figma/.env.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

export const FIGMA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_ROOT = path.resolve(FIGMA_DIR, "..");

const PREFIXES = ["VITE_", "FIGMA_"];

function httpsOrigin(value, name, { required }) {
  const raw = String(value || "").trim();
  if (!raw) {
    if (required) throw new Error(`${name} is missing. Set it in the repo root .env or Figma/.env.`);
    return "";
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} is not a valid URL.`);
  }
  if (url.protocol !== "https:") throw new Error(`${name} must use https.`);
  return url.origin;
}

// Returns only values that are safe to ship inside the plugin.
export function loadPluginConfig(mode = "production") {
  const env = { ...loadEnv(mode, REPO_ROOT, PREFIXES), ...loadEnv(mode, FIGMA_DIR, PREFIXES) };
  const supabaseAnonKey = String(env.VITE_SUPABASE_ANON_KEY || "").trim();
  if (!supabaseAnonKey) throw new Error("VITE_SUPABASE_ANON_KEY is missing. Set it in the repo root .env or Figma/.env.");
  if (/^sb_secret_/.test(supabaseAnonKey)) throw new Error("VITE_SUPABASE_ANON_KEY is a secret key. Use the anon / publishable key.");
  return {
    supabaseUrl: httpsOrigin(env.VITE_SUPABASE_URL, "VITE_SUPABASE_URL", { required: true }),
    supabaseAnonKey,
    webUrl: httpsOrigin(env.VITE_BLOS_WEB_URL, "VITE_BLOS_WEB_URL", { required: false }),
    pluginId: String(env.FIGMA_PLUGIN_ID || "brand-language-os-local").trim(),
  };
}
