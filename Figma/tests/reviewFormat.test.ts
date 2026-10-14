import { describe, expect, it } from "vitest";
import { parseReview, rewrittenCta } from "../src/ui/lib/reviewFormat";

describe("coherence review parsing", () => {
  it("formats a plain-text review and finds the rewritten CTA", () => {
    const blocks = parseReview(`Coherence Score: 8 out of 10

1) The call-to-action (CTA) to "Unlock Your Ultimate Shopping Experience" logically follows.
2) The intensity and urgency of the CTA are consistent with the soft tone.

Specific Mismatches:

The term "Ultimate" could be seen as slightly more forceful.
Rewritten CTA: "Discover a World of Shopping Possibilities"

This revised CTA suggests openness and exploration.`);

    expect(blocks[0]).toEqual({ type: "score", label: "Coherence Score", value: "8/10" });
    expect(blocks[1]).toMatchObject({ type: "point", n: "1" });
    expect(blocks[3]).toEqual({ type: "heading", text: "Specific Mismatches" });
    expect(blocks[5]).toEqual({ type: "cta", label: "Rewritten CTA", text: "Discover a World of Shopping Possibilities" });
    expect(blocks[6]).toMatchObject({ type: "para" });
    expect(rewrittenCta(blocks)).toBe("Discover a World of Shopping Possibilities");
  });

  it("reads markdown reviews with the CTA on the line after its label", () => {
    const blocks = parseReview(`**Coherence Score: 7/10**

**Analysis:**
- **Tone**: fine

### Rewritten CTA
"Start your journey today"`);

    expect(blocks[0]).toEqual({ type: "score", label: "Coherence Score", value: "7/10" });
    expect(blocks[1]).toEqual({ type: "heading", text: "Analysis" });
    expect(blocks[2]).toEqual({ type: "bullet", title: "Tone", text: "fine" });
    expect(rewrittenCta(blocks)).toBe("Start your journey today");
  });

  it("has no CTA when the review does not suggest one", () => {
    expect(rewrittenCta(parseReview("Coherence Score: 10/10\nNo mismatches found."))).toBe("");
  });
});
