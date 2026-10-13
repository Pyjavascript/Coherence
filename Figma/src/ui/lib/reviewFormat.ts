// Turns the coherence review (markdown-ish text from the model) into blocks:
// shown as headings / points / bullets in the plugin, and inserted into Figma
// as headline / subhead / body layers instead of text full of ** marks.
import { LIMITS, type TextBlock } from "../../shared/protocol";

export type ReviewBlock =
  | { type: "score"; label: string; value: string } // **Coherence Score: 8/10**
  | { type: "heading"; text: string } //              **Analysis:**  or  ## Analysis
  | { type: "point"; n?: string; title: string; text: string } // 1) **CTA Logic**: …
  | { type: "bullet"; title?: string; text: string } //            - None found…
  | { type: "quote"; text: string } //                             "Embark on a journey…"
  | { type: "para"; text: string };

// Drops markdown emphasis (**bold**, __bold__, *em*, `code`) but keeps the words.
export function plain(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

const clean = (s: string) => plain(s).replace(/\s*:\s*$/, "").trim();
const SCORE = /^(.*?\bscore\b)\s*[:\-–]?\s*(\d+(?:\.\d+)?\s*\/\s*\d+)\s*$/i;
const QUOTED = /^["“'].+["”']$/;

export function parseReview(raw: string): ReviewBlock[] {
  const blocks: ReviewBlock[] = [];
  for (const line of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const s = line.trim();
    if (!s || /^(-{3,}|\*{3,}|_{3,})$/.test(s)) continue;

    let m: RegExpMatchArray | null;
    // "# Heading"
    if ((m = s.match(/^#{1,6}\s+(.+)$/))) {
      const text = clean(m[1]);
      const score = text.match(SCORE);
      blocks.push(score ? { type: "score", label: score[1].trim(), value: score[2].replace(/\s+/g, "") } : { type: "heading", text });
      continue;
    }
    // A line that is entirely bold: "**Analysis:**", "**Coherence Score: 8/10**"
    if ((m = s.match(/^\*\*(.+?)\*\*\s*:?\s*$/))) {
      const text = clean(m[1]);
      const score = text.match(SCORE);
      blocks.push(score ? { type: "score", label: score[1].trim(), value: score[2].replace(/\s+/g, "") } : { type: "heading", text });
      continue;
    }
    // "1) **CTA Logic**: explanation"  /  "1. CTA Logic: explanation"
    if ((m = s.match(/^(\d+)[.)]\s+(.*)$/))) {
      const rest = m[2];
      const lead = rest.match(/^\*\*(.+?)\*\*\s*[:\-–]?\s*(.*)$/);
      if (lead) blocks.push({ type: "point", n: m[1], title: clean(lead[1]), text: plain(lead[2]) });
      else blocks.push({ type: "point", n: m[1], title: "", text: plain(rest) });
      continue;
    }
    // "- item" / "* item" / "• item"
    if ((m = s.match(/^[-*•]\s+(.*)$/))) {
      const lead = m[1].match(/^\*\*(.+?)\*\*\s*[:\-–]?\s*(.*)$/);
      blocks.push(lead ? { type: "bullet", title: clean(lead[1]), text: plain(lead[2]) } : { type: "bullet", text: plain(m[1]) });
      continue;
    }
    // "**Label:** text on the same line"
    if ((m = s.match(/^\*\*(.+?)\*\*\s*[:\-–]?\s*(.+)$/))) {
      blocks.push({ type: "point", title: clean(m[1]), text: plain(m[2]) });
      continue;
    }
    const text = plain(s);
    blocks.push(QUOTED.test(text) ? { type: "quote", text } : { type: "para", text });
  }
  return blocks;
}

// Figma layers: the score as the headline, section headings as subheads,
// and every point / bullet / paragraph as body text with a bold lead-in.
export function reviewTextBlocks(blocks: ReviewBlock[]): TextBlock[] {
  const out: TextBlock[] = [];
  const body = (lead: string, text: string) => {
    if (!lead) return { role: "body" as const, text };
    const full = text ? `${lead}: ${text}` : lead;
    return { role: "body" as const, text: full, boldPrefix: lead.length + (text ? 1 : 0) };
  };
  for (const b of blocks) {
    if (b.type === "score") out.push({ role: "headline", text: `${b.label}: ${b.value}` });
    else if (b.type === "heading") out.push({ role: "subhead", text: b.text });
    else if (b.type === "point") {
      if (b.title) out.push(body([b.n && `${b.n}.`, b.title].filter(Boolean).join(" "), b.text));
      else out.push({ role: "body", text: b.n ? `${b.n}. ${b.text}` : b.text });
    }
    else if (b.type === "bullet") {
      const item = body(b.title || "", b.text);
      out.push({ ...item, text: `• ${item.text}`, ...(item.boldPrefix ? { boldPrefix: item.boldPrefix + 2 } : {}) });
    } else out.push({ role: "body", text: b.text });
  }
  const usable = out.filter((b) => b.text.trim());
  // The insert request allows LIMITS.blocks layers; fold any overflow into the last one.
  if (usable.length <= LIMITS.blocks) return usable;
  const head = usable.slice(0, LIMITS.blocks - 1);
  const tail = usable.slice(LIMITS.blocks - 1).map((b) => b.text).join("\n\n");
  return [...head, { role: "body", text: tail }];
}
