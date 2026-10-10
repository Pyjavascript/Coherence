import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { LIMITS } from "../lib/clientId";

const NO_USAGE = { brands: 0, generations: 0 };

// Reloads whenever the signed-in user changes; zero while signed out. The user
// is read through a ref so callers holding an older refresh still load the
// current account.
export function useUsage(userId) {
  const [usage, setUsage] = useState(NO_USAGE);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const refresh = useCallback(async () => {
    if (!supabase || !userIdRef.current) return setUsage(NO_USAGE);
    const { data } = await supabase.rpc("my_usage");
    if (data) setUsage(data);
  }, []);
  useEffect(() => { refresh(); }, [refresh, userId]);
  return { usage, refresh, atGenLimit: usage.generations >= LIMITS.generations };
}
