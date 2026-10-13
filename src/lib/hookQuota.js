import { nextCreditReset } from "./usageActivity";

// Free hooks per credit day. Each hook is also one of the day's credits, and
// the generate Edge Function enforces both limits from usage_events, so the
// free hook resets with the credits at UTC midnight on every device.
export const FREE_HOOKS_PER_DAY = 1;

// hooksUsed = today's usage_events rows with kind "hook" (hooks/useUsage).
export const hookQuotaFrom = (hooksUsed = 0) => ({
  used: hooksUsed,
  left: Math.max(0, FREE_HOOKS_PER_DAY - hooksUsed),
});

// "6h", "45m" — time until the credits (and the free hook) reset.
export function timeUntilReset(now = new Date()) {
  const mins = Math.max(1, Math.round((nextCreditReset(now) - now) / 60000));
  return mins >= 60 ? `${Math.round(mins / 60)}h` : `${mins}m`;
}
