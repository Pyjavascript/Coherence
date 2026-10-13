import { describe, expect, it } from "vitest";
import { parseReview, plain, reviewTextBlocks } from "../src/ui/lib/reviewFormat";
import { parseRequest } from "../src/shared/protocol";

const SAMPLE = `**Coherence Score: 8/10**

**Analysis:**

1) **CTA Logic**: The CTA, "Find, explore, and experience a world at your fingertips," logically follows the argument.

2) **CTA Intensity**: The intensity of the CTA is soft.

**Specific Mismatches:**

- None found in terms of logic, intensity, or brand alignment.

**Rewritten CTA:**

"Embark on a journey of discovery, all from the comfort of home."

This revised CTA maintains the soft and inviting tone.`;

describe("parseReview", () => {
  it("reads the score, headings, points, bullets and the quoted rewrite", () => {
    expect(parseReview(SAMPLE)).toEqual([
      { type: "score", label: "Coherence Score", value: "8/10" },
      { type: "heading", text: "Analysis" },
      { type: "point", n: "1", title: "CTA Logic", text: 'The CTA, "Find, explore, and experience a world at your fingertips," logically follows the argument.' },
      { type: "point", n: "2", title: "CTA Intensity", text: "The intensity of the CTA is soft." },
      { type: "heading", text: "Specific Mismatches" },
      { type: "bullet", text: "None found in terms of logic, intensity, or brand alignment." },
      { type: "heading", text: "Rewritten CTA" },
      { type: "quote", text: '"Embark on a journey of discovery, all from the comfort of home."' },
      { type: "para", text: "This revised CTA maintains the soft and inviting tone." },
    ]);
  });

  it("handles # headings, '1.' lists and inline bold labels", () => {
    expect(parseReview("## Verdict\n1. No title here\n**Note:** keep it short")).toEqual([
      { type: "heading", text: "Verdict" },
      { type: "point", n: "1", title: "", text: "No title here" },
      { type: "point", title: "Note", text: "keep it short" },
    ]);
  });

  it("strips leftover markdown emphasis", () => {
    expect(plain("a **bold** and *soft* `code` word")).toBe("a bold and soft code word");
  });
});

describe("reviewTextBlocks", () => {
  it("maps to Figma layers with no asterisks, bolding point titles", () => {
    const blocks = reviewTextBlocks(parseReview(SAMPLE));
    expect(blocks[0]).toEqual({ role: "headline", text: "Coherence Score: 8/10" });
    expect(blocks[1]).toEqual({ role: "subhead", text: "Analysis" });
    expect(blocks[2].role).toBe("body");
    expect(blocks[2].text.startsWith("1. CTA Logic: The CTA")).toBe(true);
    expect(blocks[2].text.slice(0, blocks[2].boldPrefix)).toBe("1. CTA Logic:");
    expect(blocks.some((b) => b.text.includes("**"))).toBe(false);
    expect(blocks.find((b) => b.text.startsWith("•"))).toEqual({ role: "body", text: "• None found in terms of logic, intensity, or brand alignment." });
  });

  it("produces blocks the insert request accepts", () => {
    const blocks = reviewTextBlocks(parseReview(SAMPLE));
    const msg = { v: 1, kind: "request", id: "abc123", type: "text.insert", payload: { name: "Coherence review", blocks } };
    expect(parseRequest(msg).ok).toBe(true);
  });

  it("folds overflow into the last layer to stay within the block limit", () => {
    const long = Array.from({ length: 50 }, (_, i) => `- item ${i}`).join("\n");
    const blocks = reviewTextBlocks(parseReview(long));
    expect(blocks.length).toBe(30);
    expect(blocks[29].text).toContain("item 49");
  });
});

describe("text.insert validation", () => {
  const req = (blocks: unknown) => ({ v: 1, kind: "request", id: "abc123", type: "text.insert", payload: { name: "x", blocks } });
  it("accepts subheads and a body boldPrefix, rejects bad ones", () => {
    expect(parseRequest(req([{ role: "subhead", text: "Analysis" }])).ok).toBe(true);
    expect(parseRequest(req([{ role: "body", text: "Lead: rest", boldPrefix: 5 }])).ok).toBe(true);
    expect(parseRequest(req([{ role: "body", text: "abc", boldPrefix: 9 }])).ok).toBe(false);
    expect(parseRequest(req([{ role: "headline", text: "abc", boldPrefix: 1 }])).ok).toBe(false);
  });
});
