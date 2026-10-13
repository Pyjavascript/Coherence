// Helpers for Node Studio variant shapes returned by generateNode():
//   { headline, body } | { pointers: [{ title, detail }] }
import type { TextBlock } from "../../shared/protocol";

export interface Pointer {
  title: string;
  detail: string;
}
export type Variant = { headline: string; body: string; pointers?: undefined } | { pointers: Pointer[] };

export const isPointers = (v: Variant): v is { pointers: Pointer[] } => Array.isArray(v.pointers);

// Layers to create for "Insert into canvas".
export function variantBlocks(v: Variant): TextBlock[] {
  const blocks: TextBlock[] = isPointers(v)
    ? v.pointers.flatMap((p) => [
        { role: "headline" as const, text: p.title },
        { role: "body" as const, text: p.detail },
      ])
    : [
        { role: "headline", text: v.headline },
        { role: "body", text: v.body },
      ];
  return blocks.filter((b) => b.text.trim());
}

export type ReplacePart = "headline" | "body" | "all";

// Text for "Replace selected layer" — the part the user picked.
export function variantText(v: Variant, part: ReplacePart = "all"): string {
  if (isPointers(v)) return v.pointers.map((p) => `${p.title} — ${p.detail}`).join("\n");
  if (part === "headline") return v.headline;
  if (part === "body") return v.body;
  return [v.headline, v.body].filter(Boolean).join("\n\n");
}
