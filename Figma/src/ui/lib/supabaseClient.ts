// Stands in for src/lib/supabase.js inside the plugin bundle (see the swap in
// vite.config.ts), so src/services/* run unchanged against this client.
//
// Differences from the web client, all forced by Figma's null-origin iframe:
//  - the session is persisted in figma.clientStorage via the main thread,
//    because localStorage isn't available to plugin iframes;
//  - an in-memory lock replaces navigator.locks;
//  - no URL-based session detection (there is no redirect back to a plugin).
import { createClient } from "@supabase/supabase-js";
import { config } from "../config";
import { request } from "../bridge";

export const AUTH_STORAGE_KEY = "blos-figma-auth";

const clientStorage = {
  getItem: async (key: string) => (await request("storage.get", { key })).value,
  setItem: async (key: string, value: string) => {
    await request("storage.set", { key, value });
  },
  removeItem: async (key: string) => {
    await request("storage.remove", { key });
  },
};

// One auth operation at a time per lock name, like navigator.locks would give.
const lockChains = new Map<string, Promise<unknown>>();
async function memoryLock<R>(name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  const previous = lockChains.get(name) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(fn);
  lockChains.set(name, run);
  try {
    return await run;
  } finally {
    if (lockChains.get(name) === run) lockChains.delete(name);
  }
}

export const isSupabaseConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: clientStorage,
        storageKey: AUTH_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        lock: memoryLock,
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) throw new Error("Supabase is not configured for this plugin build.");
  return supabase;
}
