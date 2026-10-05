// import { createClient } from "@supabase/supabase-js";
// import { getClientId } from "./clientId";

// // Frontend-safe values only. The OpenAI key lives in Supabase Edge Function secrets.
// const url = import.meta.env.VITE_SUPABASE_URL;
// const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// export const isSupabaseConfigured = Boolean(
//   url &&
//   anonKey &&
//   !url.includes("your_supabase") &&
//   !anonKey.includes("your_supabase"),
// );

// export const supabase = isSupabaseConfigured
//   ? createClient(url, anonKey, {
//       global: {
//         headers: { "x-client-id": getClientId() },
//       },
//     })
//   : null;
// // export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;

// export function requireSupabase() {
//   if (!supabase) {
//     throw new Error(
//       "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env",
//     );
//   }
//   return supabase;
// }


import { createClient } from "@supabase/supabase-js";

// Frontend-safe values only.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes("your_supabase") && !anonKey.includes("your_supabase")
);

// Standard Supabase client (handles auth headers automatically now!)
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env"
    );
  }
  return supabase;
}