import { describe, expect, it } from "vitest";
import { containsTerm, localAlignment, splitTerms } from "../src/ui/lib/alignment";
import { variantBlocks, variantText } from "../src/ui/lib/variants";

describe("local alignment checks", () => {
  it("splits brand term lists", () => {
    expect(splitTerms("cheap, best-ever; free\n deal ")).toEqual(["cheap", "best-ever", "free", "deal"]);
    expect(splitTerms("")).toEqual([]);
  });

  it("matches whole words only, case-insensitively", () => {
    expect(containsTerm("So CHEAP today", "cheap")).toBe(true);
    expect(containsTerm("cheapest ever", "cheap")).toBe(false);
    expect(containsTerm("the best-ever candle", "best-ever")).toBe(true);
    expect(containsTerm("Crème brûlée", "brûlée")).toBe(true);
  });

  it("flags banned words, missing terms and length", () => {
    const checks = localAlignment("A cheap candle that smells great", { banned: "cheap, best-ever", must: "soy wax" }, 20);
    expect(checks.find((c) => c.id === "banned")).toMatchObject({ status: "fail", detail: "cheap" });
    expect(checks.find((c) => c.id === "must")).toMatchObject({ status: "warn", detail: "soy wax" });
    expect(checks.find((c) => c.id === "length")?.status).toBe("warn");
  });

  it("passes clean copy and returns nothing for empty text", () => {
    const checks = localAlignment("Hand-poured soy wax candles", { banned: "cheap", must: "soy wax" });
    expect(checks.every((c) => c.status === "pass")).toBe(true);
    expect(localAlignment("   ", { banned: "cheap" })).toEqual([]);
  });
});

describe("variant helpers", () => {
  it("turns variants into canvas blocks and replace text", () => {
    const v = { headline: "Small bottle.", body: "Big impression." };
    expect(variantBlocks(v)).toEqual([
      { role: "headline", text: "Small bottle." },
      { role: "body", text: "Big impression." },
    ]);
    expect(variantText(v, "headline")).toBe("Small bottle.");
    expect(variantText(v, "all")).toBe("Small bottle.\n\nBig impression.");
    const p = { pointers: [{ title: "Fast", detail: "Ships today." }] };
    expect(variantBlocks(p)).toHaveLength(2);
    expect(variantText(p)).toBe("Fast — Ships today.");
  });
});
