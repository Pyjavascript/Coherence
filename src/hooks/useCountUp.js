import { useEffect, useState } from "react";
import { reducedMotion } from "../lib/motion";

const animates = (value) => typeof value === "number" && value > 0 && !reducedMotion();

// Counts a number up from 0 to `value` (ease-out) whenever it changes.
// Returns the number to show; anything that isn't a positive number (a "–"
// placeholder, 0) passes straight through.
export function useCountUp(value, ms = 700) {
  const [shown, setShown] = useState(() => (animates(value) ? 0 : value));

  useEffect(() => {
    if (!animates(value)) {
      setShown(value);
      return undefined;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    setShown(0);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);

  return shown;
}

export function CountUp({ value }) {
  return useCountUp(value);
}
