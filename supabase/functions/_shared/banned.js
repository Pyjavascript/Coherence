// Banned words / claims from the brand's "Never use" field, and a check for
// them in generated copy. Used by the generate Edge Function (it retries once
// when copy breaks the list) and by the app (it flags copy that still does).

// "cheap, best-ever; free shipping" -> ["cheap", "best-ever", "free shipping"]
export function bannedTerms(banned) {
  const seen = new Set();
  return String(banned || "")
    .split(/[,;\n]+/)
    .map((term) => term.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim())
    .filter((term) => {
      const key = term.toLowerCase();
      if (!term || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Whole-word, case-insensitive match; spaces and hyphens inside a term match
// either, so "best-ever" also catches "best ever".
const termPattern = (term) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}])${term.split(/[\s-]+/).map(escape).join("[\\s-]+")}(?![\\p{L}\\p{N}])`,
    "iu",
  );

// Every string inside a generated answer (any JSON shape).
export function collectText(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectText(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectText(v, out));
  return out;
}

// The banned terms that appear in `value` (a string or any JSON shape).
export function findBanned(value, banned) {
  const terms = Array.isArray(banned) ? banned : bannedTerms(banned);
  if (!terms.length) return [];
  const text = collectText(value).join("\n");
  return terms.filter((term) => termPattern(term).test(text));
}
