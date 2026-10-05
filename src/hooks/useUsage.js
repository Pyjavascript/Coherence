import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { LIMITS } from "../lib/clientId";

export function useUsage() {
  const [usage, setUsage] = useState({ brands: 0, generations: 0 });
  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.rpc("my_usage");
    if (data) setUsage(data);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { usage, refresh, atGenLimit: usage.generations >= LIMITS.generations };
}