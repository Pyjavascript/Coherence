import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "../bridge";
import { DEFAULT_TIER } from "@web/lib/constants.js";

// Small per-machine UI preferences, kept in figma.clientStorage.
export interface Prefs {
  brandId: string | null;
  tier: string;
  category: string;
  variantCount: number;
  width: number;
  height: number;
}

const KEY = "blos-figma-prefs";
export const DEFAULT_PREFS: Prefs = {
  brandId: null,
  tier: DEFAULT_TIER,
  category: "social",
  variantCount: 3,
  width: 440,
  height: 660,
};

export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    request("storage.get", { key: KEY })
      .then(({ value }) => {
        if (value) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(value) });
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        request("storage.set", { key: KEY, value: JSON.stringify(next) }).catch(() => undefined);
      }, 300);
      return next;
    });
  }, []);

  return { prefs, loaded, update };
}
