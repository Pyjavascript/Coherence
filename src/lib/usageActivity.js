// Turns usage_events rows (services/brands getUsageActivity) into the Usage
// dialog's credit-line data. One row = one credit, so the lines always add up
// to the credits used. Generation types without their own colour show as "other".
export const ACTIVITY_KINDS = [
  { key: "quick", label: "Quick Grid" },
  { key: "node", label: "Node Studio" },
  { key: "regen", label: "Regenerations" },
  { key: "hook", label: "Hooks" },
];

const KIND_BY_TYPE = { "quick-grid": "quick", node: "node", regenerate: "regen", hook: "hook" };

const DAY_MS = 24 * 60 * 60 * 1000;

// Credits reset at UTC midnight, the boundary the generate Edge Function counts from.
export const creditDayStart = (now = new Date()) => {
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  return day;
};

export const nextCreditReset = (now = new Date()) => new Date(creditDayStart(now).getTime() + DAY_MS);

export const toKinds = (rows) => (rows || []).map((row) => KIND_BY_TYPE[row.kind] || "other");
