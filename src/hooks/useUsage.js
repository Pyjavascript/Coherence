import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { LIMITS } from "../lib/clientId";
import { creditDayStart } from "../lib/usageActivity";

const NO_USAGE = { brands: 0, generations: 0, hooks: 0 };

// Reloads whenever the signed-in user changes; zero while signed out. The user
// is read through a ref so callers holding an older refresh still load the
// current account. hooks = today's hook credits, for the free-hook limit.
export function useUsage(userId) {
  const [usage, setUsage] = useState(NO_USAGE);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const refresh = useCallback(async () => {
    const id = userIdRef.current;
    if (!supabase || !id) return setUsage(NO_USAGE);
    const [{ data }, { count, error: hookError }] = await Promise.all([
      supabase.rpc("my_usage"),
      supabase
        .from("usage_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", id)
        .eq("kind", "hook")
        .gte("created_at", creditDayStart().toISOString()),
    ]);
    if (id !== userIdRef.current) return;
    // A failed hook count keeps the last known value rather than handing out a hook.
    if (data) setUsage((prev) => ({ ...data, hooks: hookError ? prev.hooks : count ?? 0 }));
  }, []);
  useEffect(() => { refresh(); }, [refresh, userId]);
  return { usage, refresh, atGenLimit: usage.generations >= LIMITS.generations };
}
