// The user's own OpenAI key, kept only in this browser. When set, the generate
// Edge Function uses it instead of the server's key.
const STORAGE_KEY = "blos:openai-key";

export function getApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function setApiKey(value) {
  const key = String(value || "").trim();
  try {
    if (key) localStorage.setItem(STORAGE_KEY, key);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode etc.) — the key just won't persist.
  }
}
