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
