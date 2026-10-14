// Shared motion helpers for the polish layer (styles/polish). Easings match the
// --pl-ease-* tokens in styles/polish/tokens.css.
export const EASE_OUT = "cubic-bezier(.22, 1, .36, 1)";
export const EASE_SPRING = "cubic-bezier(.34, 1.56, .64, 1)";

export const reducedMotion = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

// Reads a duration token (e.g. --pl-d-3) in ms, so JS timings follow the CSS
// (and collapse with it under reduced motion).
export function tokenMs(name, fallback) {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return /ms$/.test(raw) ? n : /s$/.test(raw) ? n * 1000 : n;
}
