// The generation prompts are built by the generate Edge Function from the
// brand fields the app sends. The app still uses this module for the
// paste-ready ChatGPT brief and to describe copy for the coherence check.
export * from "../../supabase/functions/_shared/prompts.js";
