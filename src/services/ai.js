// The ONLY frontend module that talks to the generation Edge Function.
// The Edge Function holds the OpenAI key; nothing secret exists in the browser.
import { requireSupabase } from "../lib/supabase";
import { AI_MODELS, DEFAULT_TIER } from "../lib/constants";
import {
  buildQuickGridPrompt, buildNodePrompt, buildHookPrompt, buildCoherencePrompt,
} from "../lib/prompts";

export class AIError extends Error {
  constructor(message, code = "generation") {
    super(message);
    this.code = code;
  }
}

export function describeError(err) {
  if (err?.code === "limit_reached") return "Generation limit reached (40 per browser).";
  return err?.message ? `Generation failed — ${err.message}` : "Generation failed. Try again.";
}

async function invoke(type, prompt, tier) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke("generate", {
    body: { type, prompt, tier, model: AI_MODELS[tier] || AI_MODELS[DEFAULT_TIER] },
  });
  if (error) throw new AIError(error.message || "Couldn't reach the generation function.", "network");
  if (!data || data.success !== true) throw new AIError(data?.error || "Generation failed.", data?.code || "generation");
  return data.data;
}

/* ---------- response normalisation (handles malformed AI output) ---------- */
function shapeItem(medium, v) {
  if (v == null) return null;
  if (medium === "packaging" || medium === "marketing") {
    if (typeof v === "string") return v.trim() || null;
    if (typeof v === "object") return String(v.text || v.headline || "").trim() || null;
    return String(v);
  }
  if (typeof v !== "object") return null;
  if (medium === "email") {
    const subject = v.subject || v.headline || "";
    const preview = v.preview || v.sub || "";
    return subject || preview ? { subject, preview } : null;
  }
  const headline = v.headline || v.subject || "";
  const sub = v.sub || v.preview || "";
  return headline || sub ? { headline, sub } : null;
}
function toItems(medium, value) {
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => shapeItem(medium, v)).filter(Boolean);
}
function normalizeVariants(data) {
  const raw = Array.isArray(data?.variants) ? data.variants : data?.variants ? [data.variants] : data ? [data] : [];
  return raw
    .map((v) => {
      if (v && Array.isArray(v.pointers)) {
        const pointers = v.pointers
          .filter((p) => p && (p.title || p.detail))
          .map((p) => ({ title: String(p.title || ""), detail: String(p.detail || "") }));
        return pointers.length ? { pointers } : null;
      }
      if (v && (v.headline || v.body)) return { headline: String(v.headline || ""), body: String(v.body || "") };
      return null;
    })
    .filter(Boolean);
}
const malformed = () => new AIError("The AI returned an unexpected format. Try again.", "malformed");

/* ---------- public API ---------- */
// Returns { packaging:[...], marketing:[...], advertising:[...], website:[...], email:[...] }
export async function generateQuickGrid({ ctx, variantCount, tier }) {
  const data = await invoke("quick-grid", buildQuickGridPrompt(ctx, variantCount), tier);
  const out = {};
  let any = false;
  ["packaging", "marketing", "advertising", "website", "email"].forEach((m) => {
    out[m] = toItems(m, data?.[m]);
    if (out[m].length) any = true;
  });
  if (!any) throw malformed();
  return out;
}

// Returns an array of items for one medium.
export async function regenerateOutput({ ctx, medium, variantCount, tier }) {
  const data = await invoke("regenerate", buildQuickGridPrompt(ctx, variantCount, medium), tier);
  const items = toItems(medium, data?.[medium]);
  if (!items.length) throw malformed();
  return items;
}

// Returns an array of variants: [{headline, body}] or [{pointers:[{title,detail}]}]
export async function generateNode({ ctx, node, variantCount, linkedNodes, tier }) {
  const data = await invoke("node", buildNodePrompt(ctx, node, variantCount, linkedNodes), tier);
  const variants = normalizeVariants(data);
  if (!variants.length) throw malformed();
  return variants;
}

// Returns the hook string.
export async function generateHook({ ctx, requirement, tier }) {
  const data = await invoke("hook", buildHookPrompt(ctx, requirement), tier);
  const hook = String(data?.hook || "").trim();
  if (!hook) throw malformed();
  return hook;
}

// Optional: run the CTA <-> copy coherence QA inside the app (returns text).
export async function generateCoherenceCheck({ ctx, described, tier }) {
  const data = await invoke("coherence", buildCoherencePrompt(ctx, described), tier);
  return String(data?.text || "").trim();
}
