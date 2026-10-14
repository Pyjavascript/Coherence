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
  | { type: "cta"; label: string; text: string } //                Rewritten CTA: "Discover…"
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
// "Coherence Score: 8/10", "Score - 8 out of 10", "Coherence score is 7.5/10."
const SCORE = /^(.*?\bscore\b)\s*(?:[:\-–]|\bis\b)?\s*(\d+(?:\.\d+)?)\s*(?:\/|\bout of\b)\s*(\d+)\s*\.?$/i;
const QUOTED = /^["“'].+["”']$/;
// "Rewritten CTA", "Suggested call-to-action", "Revised CTA", …
const CTA_LABEL = /^(?:(?:rewritten|revised|suggested|improved|better|new|alternative|recommended)\s+)+(?:cta|call[\s-]to[\s-]action)\b/i;
// "Specific Mismatches:" on a line of its own — a short label, not a sentence.
const PLAIN_HEADING = /^[A-Z][^.!?]{0,60}:$/;
// "Rewritten CTA: text" with no markdown — a short label before the colon.
const PLAIN_LEAD = /^([A-Z][\w'’()/& -]{0,40}?)\s*:\s+(.+)$/;

const unquote = (s: string) => s.replace(/^["“'‘]+|["”'’]+$/g, "").trim();

function scoreOf(text: string): ReviewBlock | null {
  const m = text.match(SCORE);
  return m ? { type: "score", label: m[1].trim(), value: `${m[2]}/${m[3]}` } : null;
}

export function parseReview(raw: string): ReviewBlock[] {
  const blocks: ReviewBlock[] = [];
  // A "Rewritten CTA" heading waiting for the line that holds the CTA itself.
  let pendingCta: Extract<ReviewBlock, { type: "cta" }> | null = null;

  for (const line of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const s = line.trim();
    if (!s || /^(-{3,}|\*{3,}|_{3,})$/.test(s)) continue;

    let m: RegExpMatchArray | null;
    const flat = clean(s.replace(/^#{1,6}\s+/, "").replace(/^[-*•]\s+/, ""));

    // The score, however it is marked up.
    const score = scoreOf(flat);
    if (score) {
      blocks.push(score);
      continue;
    }

    // The rewritten CTA: "Rewritten CTA: "…"" on one line, or a label line then the CTA.
    const ctaLead = flat.match(/^(.+?)\s*:\s*(.*)$/);
    if (CTA_LABEL.test(flat) && (ctaLead ? ctaLead[1].length : flat.length) <= 40) {
      const text = unquote(ctaLead ? ctaLead[2] : "");
      const cta = { type: "cta" as const, label: ctaLead ? ctaLead[1] : flat, text };
      blocks.push(cta);
      pendingCta = text ? null : cta;
      continue;
    }
    if (pendingCta) {
      const isHeading = /^#{1,6}\s/.test(s) || PLAIN_HEADING.test(plain(s));
      if (!isHeading) pendingCta.text = unquote(flat);
      pendingCta = null;
      if (!isHeading) continue;
    }

    // "# Heading"
    if ((m = s.match(/^#{1,6}\s+(.+)$/))) {
      blocks.push({ type: "heading", text: clean(m[1]) });
      continue;
    }
    // A line that is entirely bold: "**Analysis:**"
    if ((m = s.match(/^\*\*(.+?)\*\*\s*:?\s*$/))) {
      blocks.push({ type: "heading", text: clean(m[1]) });
      continue;
    }
    // A plain label on its own line: "Specific Mismatches:"
    if (PLAIN_HEADING.test(plain(s))) {
      blocks.push({ type: "heading", text: clean(s) });
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
    // "Label: text" with no markdown, when the label is a few words.
    if ((m = text.match(PLAIN_LEAD)) && m[1].trim().split(/\s+/).length <= 5) {
      blocks.push({ type: "point", title: m[1].trim(), text: m[2] });
      continue;
    }
    blocks.push(QUOTED.test(text) ? { type: "quote", text } : { type: "para", text });
  }
  // A CTA label that never got its line is just a heading.
  return blocks.map((b) => (b.type === "cta" && !b.text ? { type: "heading", text: b.label } : b));
}

// The model's rewritten CTA, if the review has one.
export function rewrittenCta(blocks: ReviewBlock[]): string {
  const cta = blocks.find((b): b is Extract<ReviewBlock, { type: "cta" }> => b.type === "cta" && Boolean(b.text));
  return cta ? cta.text : "";
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
    } else if (b.type === "cta") out.push(body(b.label, `“${b.text}”`));
    else out.push({ role: "body", text: b.text });
  }
  const usable = out.filter((b) => b.text.trim());
  // The insert request allows LIMITS.blocks layers; fold any overflow into the last one.
  if (usable.length <= LIMITS.blocks) return usable;
  const head = usable.slice(0, LIMITS.blocks - 1);
  const tail = usable.slice(LIMITS.blocks - 1).map((b) => b.text).join("\n\n");
  return [...head, { role: "body", text: tail }];
}
