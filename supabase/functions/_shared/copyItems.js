import { MEDIA_BY_KEY, GRID_WEBSITE_COMPONENTS } from "./constants.js";

// Helpers for the generated-copy item shapes returned by services/ai:
//   packaging / marketing      -> "string"
//   email                      -> { subject, preview }
//   advertising / website      -> { headline, sub }
//   Node Studio variants       -> { headline, body } | { pointers: [{ title, detail }] }

// Normalises Quick Grid items into { headline, sub }.
export function toDisplay(item) {
  if (item == null) return null;
  if (typeof item === "string") return { headline: item, sub: "" };
  return { headline: item.headline || item.subject || "", sub: item.sub || item.preview || "" };
}

// Writes an edited display field back into the item's own shape.
export function applyEdit(item, field, text) {
  if (typeof item === "string" || item == null) return field === "headline" ? text : item;
  if ("subject" in item || "preview" in item) {
    return { ...item, [field === "headline" ? "subject" : "preview"]: text };
  }
  return { ...item, [field]: text };
}

// Plain-text rendering of any item shape (Quick Grid or Node Studio).
export function itemToText(item) {
  if (item == null) return "";
  if (typeof item === "string") return item;
  if (Array.isArray(item.pointers)) return item.pointers.map((p) => `${p.title} — ${p.detail}`).join("\n");
  if ("body" in item) return [item.headline, item.body].filter(Boolean).join("\n\n");
  const d = toDisplay(item);
  return [d.headline, d.sub].filter(Boolean).join("\n");
}

export const countWords = (text) => String(text || "").trim().split(/\s+/).filter(Boolean).length;

// Fewest / most words a user can set as a node's total length.
export const minWordsFor = (limits) => Object.keys(limits || {}).length || 1;
export const MAX_WORDS = 200;

// Default total word budget of a medium (sum of its field limits).
export const defaultWords = (limits) => Object.values(limits || {}).reduce((sum, l) => sum + l.words, 0);

// Rescales a medium's field limits to a user-set total, keeping their proportions
// (character caps scale with them). total = null/undefined -> the defaults.
export function limitsFor(limits, total) {
  if (!limits || !total) return limits;
  const entries = Object.entries(limits);
  const base = defaultWords(limits);
  let left = total;
  return Object.fromEntries(entries.map(([key, l], i) => {
    const rest = entries.length - i - 1;
    const words = rest === 0
      ? Math.max(1, left)
      : Math.min(left - rest, Math.max(1, Math.round((total * l.words) / base)));
    left -= words;
    return [key, { ...l, words, ...(l.chars ? { chars: Math.round((l.chars * words) / l.words) } : {}) }];
  }));
}

// A Quick Grid card's effective field limits: its medium's defaults (the Website
// card's renamed and re-budgeted for its component), rescaled to the card's word total.
export function cardLimits(type, { words, component } = {}) {
  let base = MEDIA_BY_KEY[type]?.limits;
  const comp = type === "website" ? GRID_WEBSITE_COMPONENTS[component] : null;
  if (base && comp) {
    base = Object.fromEntries(Object.entries(base).map(([key, l], i) => [
      key, { ...l, label: comp.fields[i] || l.label, words: comp.words[i] || l.words },
    ]));
  }
  return limitsFor(base, words);
}

// Checks a display item against a medium's length limits (see MEDIA in constants).
// Returns { words, maxWords, level: "ok" | "near" | "over", details: [..] }.
export function measure(display, limits) {
  if (!display) return null;
  const details = [];
  let level = "ok";
  const bump = (used, max) => {
    const next = used > max ? "over" : used >= max * 0.85 ? "near" : "ok";
    if (next === "over" || (next === "near" && level === "ok")) level = next;
  };
  const fields = [
    ["headline", limits?.headline],
    ["sub", limits?.sub],
  ];
  let words = 0;
  let maxWords = 0;
  fields.forEach(([field, limit]) => {
    if (!limit) return;
    const used = countWords(display[field]);
    words += used;
    maxWords += limit.words;
    bump(used, limit.words);
    details.push(`${limit.label}: ${used}/${limit.words} words`);
    if (limit.chars) {
      const chars = String(display[field] || "").length;
      bump(chars, limit.chars);
      details.push(`${limit.label}: ${chars}/${limit.chars} characters`);
    }
  });
  return { words, maxWords, level, details };
}
