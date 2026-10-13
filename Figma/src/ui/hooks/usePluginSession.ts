import { useCallback, useEffect, useState } from "react";
import { pluginPing } from "@web/services/ai.js";
import { request } from "../bridge";
import { PLUGIN_KEY_STORAGE, setPluginApiKey } from "../lib/pluginApiKey";

export interface PluginUsage {
  generations: number;
  hooks: number;
  brands: number;
}

const EMPTY: PluginUsage = { generations: 0, hooks: 0, brands: 0 };
const KEY_PATTERN = /^coh_[\w-]{8,200}$/;

export function isPluginKey(value: string) {
  return KEY_PATTERN.test(value.trim());
}

// The menu command plus the saved coh_ key. A valid key is checked with the
// generate function (type "ping"), which also returns today's free-tier usage.
export function usePluginSession() {
  const [command, setCommand] = useState<"open-workspace" | "set-api-key">("open-workspace");
  const [key, setKey] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [usage, setUsage] = useState<PluginUsage>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apply = useCallback(async (next: string) => {
    const trimmed = next.trim();
    setPluginApiKey(trimmed);
    if (!trimmed) {
      setUserId(null);
      setUsage(EMPTY);
      return false;
    }
    try {
      const data = await pluginPing() as { userId: string; generations?: number; hooks?: number; brands?: number };
      setUserId(data.userId);
      setUsage({
        generations: data.generations ?? 0,
        hooks: data.hooks ?? 0,
        brands: data.brands ?? 0,
      });
      setError("");
      return true;
    } catch (err) {
      setUserId(null);
      setUsage(EMPTY);
      setError(err instanceof Error ? err.message : "Couldn't verify that plugin key.");
      return false;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const boot = await request("ui.boot", {});
        if (alive && boot.command === "set-api-key") setCommand("set-api-key");
        const stored = (await request("storage.get", { key: PLUGIN_KEY_STORAGE })).value || "";
        if (!alive) return;
        setKey(stored);
        if (stored) await apply(stored);
      } catch {
        if (alive) setError("Couldn't read the saved plugin key.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [apply]);

  const saveKey = useCallback(
    async (next: string) => {
      const trimmed = next.trim();
      if (!isPluginKey(trimmed)) {
        setError("Paste the key from your profile. It starts with coh_.");
        return false;
      }
      const ok = await apply(trimmed);
      if (!ok) return false;
      await request("storage.set", { key: PLUGIN_KEY_STORAGE, value: trimmed });
      setKey(trimmed);
      return true;
    },
    [apply],
  );

  const clearKey = useCallback(async () => {
    await request("storage.remove", { key: PLUGIN_KEY_STORAGE });
    setPluginApiKey("");
    setKey("");
    setUserId(null);
    setUsage(EMPTY);
    setCommand("set-api-key");
  }, []);

  const refresh = useCallback(async () => {
    if (key) await apply(key);
  }, [apply, key]);

  return { command, key, userId, usage, loading, error, saveKey, clearKey, refresh, setCommand };
}
