import { useCallback, useEffect, useState } from "react";

// Briefly flips to `true` after a successful copy so a button can show "Copied".
export function useCopyFeedback(ms = 1500) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), ms);
    return () => window.clearTimeout(timer);
  }, [copied, ms]);

  const flash = useCallback(() => setCopied(true), []);
  return [copied, flash];
}
