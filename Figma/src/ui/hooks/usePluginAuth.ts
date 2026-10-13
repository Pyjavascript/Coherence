import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

// The plugin's own Supabase session (separate from any browser session),
// restored from figma.clientStorage on open and refreshed while the UI is open.
export function usePluginAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => alive && setSession(data.session))
      .catch(() => alive && setSession(null))
      .finally(() => alive && setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: new Error("Supabase is not configured for this plugin build.") };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error };
  }, []);

  // Ends this plugin session on the server and forgets it locally; the user's
  // browser sessions are unaffected.
  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) setSession(null);
  }, []);

  return { session, user: session?.user ?? null, loading, signIn, signOut };
}
