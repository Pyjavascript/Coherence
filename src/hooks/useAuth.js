// import { useState, useEffect } from "react";
// import { supabase } from "../lib/supabase";

// export function useAuth() {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!supabase) {
//       setLoading(false);
//       return;
//     }

//     // Get initial session
//     supabase.auth.getSession().then(({ data: { session } }) => {
//       setUser(session?.user ?? null);
//       setLoading(false);
//     });

//     // Listen for login/logout events
//     const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
//       setUser(session?.user ?? null);
//     });

//     return () => subscription.unsubscribe();
//   }, []);

//   const login = (email, password) => supabase.auth.signInWithPassword({ email, password });
//   const signup = (email, password) => supabase.auth.signUp({ email, password });
//   const logout = () => supabase.auth.signOut();

//   return { user, loading, login, signup, logout };
// }

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signup = (email, password) => supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  });
  const logout = () => supabase.auth.signOut();

  // --- NEW: Google Sign In ---
  const signInWithGoogle = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    return { error };
  };

  // Name and photo live in user_metadata; onAuthStateChange (USER_UPDATED)
  // pushes the new user to every useAuth() instance.
  const updateProfile = (fields) => {
    if (!supabase) return Promise.resolve({ error: new Error("Supabase is not configured.") });
    return supabase.auth.updateUser({ data: fields });
  };

  // The browser can't delete an auth user with the anon key, so this calls
  // public.delete_own_account() (supabase/migrations/20261010000000_delete_account.sql).
  const deleteAccount = async () => {
    if (!supabase) return { error: new Error("Supabase is not configured.") };
    const { error } = await supabase.rpc("delete_own_account");
    if (error) return { error };
    // The session's user is gone server-side; just drop it locally.
    await supabase.auth.signOut({ scope: "local" });
    return { error: null };
  };

  return { user, loading, login, signup, logout, signInWithGoogle, updateProfile, deleteAccount };
}