import { useEffect, useState } from "react";

// Keep in sync with the breakpoints in styles/layout.css.
const QUERIES = {
  mobile: "(max-width: 767.98px)",
  tablet: "(min-width: 768px) and (max-width: 1023.98px)",
};

const read = () => {
  if (typeof window === "undefined" || !window.matchMedia) return "desktop";
  if (window.matchMedia(QUERIES.mobile).matches) return "mobile";
  if (window.matchMedia(QUERIES.tablet).matches) return "tablet";
  return "desktop";
};

// "mobile" | "tablet" | "desktop"
export function useBreakpoint() {
  const [bp, setBp] = useState(read);

  useEffect(() => {
    const lists = Object.values(QUERIES).map((q) => window.matchMedia(q));
    const update = () => setBp(read());
    lists.forEach((l) => l.addEventListener("change", update));
    return () => lists.forEach((l) => l.removeEventListener("change", update));
  }, []);

  return bp;
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
