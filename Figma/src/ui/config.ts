// Public build-time configuration injected by vite.config.ts (see scripts/env.mjs).
declare const __BLOS_CONFIG__: { supabaseUrl: string; supabaseAnonKey: string; webUrl: string };

export const config = __BLOS_CONFIG__;
