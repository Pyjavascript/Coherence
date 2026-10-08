// Free hooks per day, tracked in this browser. The Edge Function does not
// enforce this, so it is a UX limit rather than a security boundary.
export const FREE_HOOKS_PER_DAY = 1;
const KEY = "coherence.freeHook.v1";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

export function readHookQuota() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    const used = raw.date === today() ? Number(raw.used) || 0 : 0;
    return { used, left: Math.max(0, FREE_HOOKS_PER_DAY - used) };
  } catch {
    return { used: 0, left: FREE_HOOKS_PER_DAY };
  }
}

export function recordHookUse() {
  const { used } = readHookQuota();
  try {
    localStorage.setItem(KEY, JSON.stringify({ date: today(), used: used + 1 }));
  } catch {
    /* storage unavailable — the count just isn't remembered */
  }
  return readHookQuota();
}

// "6h", "45m" — time until local midnight, when the quota resets.
export function timeUntilReset(now = new Date()) {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const mins = Math.max(1, Math.round((midnight - now) / 60000));
  return mins >= 60 ? `${Math.round(mins / 60)}h` : `${mins}m`;
}
