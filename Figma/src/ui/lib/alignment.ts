// Free, instant brand checks on copy from the canvas. They use the same brand
// fields the prompts use (banned / must) and cost no credits; the AI review is
// the existing coherence check in src/services/ai.js.
import { countWords } from "@web/lib/copyItems.js";

export type CheckStatus = "pass" | "warn" | "fail";
export interface LocalCheck {
  id: "banned" | "must" | "length";
  status: CheckStatus;
  title: string;
  detail: string;
}

interface BrandRules {
  banned?: string;
  must?: string;
}

// "cheap, best-ever; free" -> ["cheap", "best-ever", "free"]
export const splitTerms = (list = "") =>
  list
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Whole-word, case-insensitive match that also works for accented letters.
export function containsTerm(text: string, term: string): boolean {
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escape(term)}(?=$|[^\\p{L}\\p{N}])`, "iu");
  return re.test(text);
}

export function localAlignment(text: string, brand: BrandRules, targetWords?: number): LocalCheck[] {
  if (!text.trim()) return [];
  const checks: LocalCheck[] = [];

  const banned = splitTerms(brand.banned);
  if (banned.length) {
    const found = banned.filter((t) => containsTerm(text, t));
    checks.push(
      found.length
        ? { id: "banned", status: "fail", title: "Banned words used", detail: found.join(", ") }
        : { id: "banned", status: "pass", title: "No banned words", detail: `Checked ${banned.length} term(s).` },
    );
  }

  const must = splitTerms(brand.must);
  if (must.length) {
    const missing = must.filter((t) => !containsTerm(text, t));
    checks.push(
      missing.length
        ? { id: "must", status: "warn", title: "Missing must-include terms", detail: missing.join(", ") }
        : { id: "must", status: "pass", title: "All must-include terms present", detail: must.join(", ") },
    );
  }

  if (targetWords && targetWords > 0) {
    const words = countWords(text);
    const within = Math.abs(words - targetWords) <= Math.max(2, targetWords * 0.2);
    checks.push({
      id: "length",
      status: within ? "pass" : "warn",
      title: within ? "Length on target" : "Length off target",
      detail: `${words} words (target about ${targetWords}).`,
    });
  }

  return checks;
}
