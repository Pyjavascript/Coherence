import { useState } from "react";

// Appearance: "light", "dark" or "system" (follow the OS). Stored per browser;
// index.html applies it before the first paint so the page never flashes the
// wrong theme. The resolved theme lives on <html data-theme>.
const KEY = "coherence.theme";
const PREFS = ["light", "dark", "system"];
const media = typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)") : null;

export function readThemePref() {
  try {
    const value = localStorage.getItem(KEY);
    return PREFS.includes(value) ? value : "light";
  } catch {
    return "light";
  }
}

function apply(pref) {
  const root = document.documentElement;
  const theme = pref === "system" ? (media?.matches ? "dark" : "light") : pref;
  if (root.dataset.theme === theme) return;
  // Swap every colour at once: without this, each element's own colour
  // transition runs and the switch ripples across the page.
  root.classList.add("theme-switching");
  root.dataset.theme = theme;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
}

// index.html has normally done this already; this covers pages without it.
if (typeof document !== "undefined") apply(readThemePref());

// "System" follows the OS live, whether or not the profile is open.
media?.addEventListener?.("change", () => {
  if (readThemePref() === "system") apply("system");
});

export function useThemePref() {
  const [pref, setPref] = useState(readThemePref);
  const choose = (next) => {
    try { localStorage.setItem(KEY, next); } catch { /* not remembered */ }
    setPref(next);
    apply(next);
  };
  return [pref, choose];
}
