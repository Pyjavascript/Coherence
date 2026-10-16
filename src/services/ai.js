// The ONLY frontend module that talks to the generation Edge Function.
// The Edge Function holds the default OpenAI key; a user may set their own
// (lib/apiKey), which is sent along and used in its place.
// The prompts themselves are built by the Edge Function (supabase/functions/
// _shared): this module sends the brand fields and settings they're made from.
import { requireSupabase } from "../lib/supabase";
import { AI_MODELS, DEFAULT_TIER } from "../lib/constants";
import { getApiKey } from "../lib/apiKey";
import { getPluginApiKey } from "../lib/pluginApiKey";

export class AIError extends Error {
  constructor(message, code = "generation") {
    super(message);
    this.code = code;
  }
}

export function describeError(err) {
  if (err?.code === "limit_reached") return `Daily generation limit reached (40/day). Resets tomorrow.`;
  if (err?.code === "not_enough_credits") return `${err.message} Remove some cards, or regenerate them one at a time.`;
  if (err?.code === "hook_limit") return "Today's free hook is used. It resets with your credits.";
  if (err?.code === "unauthorized") return "That plugin key isn't valid. Generate a new one in your profile.";
  return err?.message ? `Generation failed — ${err.message}` : "Generation failed. Try again.";
}

// True inside the Figma plugin, which has a coh_ key instead of a session.
export function usesPluginKey() {
  return Boolean(getPluginApiKey());
}

// One request to the generate Edge Function; returns its `data`. Also carries
// the plugin's brand data requests (type "brands.list", "notes.create", ...),
// since row-level security hides the user's rows from a plugin with no session.
export async function callFunction(type, payload = {}) {
  const client = requireSupabase();
  const apiKey = getApiKey();
  const pluginApiKey = getPluginApiKey();
  console.log(pluginApiKey ? "[Figma AI Request]" : "[AI Request]", {
    type,
    tier: payload.tier,
    model: AI_MODELS[payload.tier],
    hasPluginKey: Boolean(pluginApiKey),
  });
  // supabase-js serialises `body` itself: pass the flat payload, never { body: {...} }.
  const { data, error } = await client.functions.invoke("generate", {
    body: {
      ...payload,
      type,
      ...(apiKey ? { apiKey } : {}),
      ...(pluginApiKey ? { pluginApiKey } : {}),
    },
  });
  if (error) throw new AIError(error.message || "Couldn't reach the generation function.", "network");
  if (!data || data.success !== true) {
    // An older deployment of the generate function doesn't know "ping" (or plugin keys).
    if (data?.code === "bad_request" && /generation type/i.test(data?.error || "")) {
      throw new AIError(`The server doesn't accept "${type}" requests yet. Redeploy the generate Edge Function.`, "bad_request");
    }
    throw new AIError(data?.error || "Generation failed.", data?.code || "generation");
  }
  return data.data;
}

// ctx = { brand, notes, stylePack }. The brand's logo (an image) never goes along.
function invoke(type, ctx, tier, params = {}) {
  const { logo, ...brand } = ctx?.brand || {};
  return callFunction(type, {
    ...params,
    brand,
    notes: (ctx?.notes || []).map(({ type: noteType, text }) => ({ type: noteType, text })),
    stylePack: ctx?.stylePack,
    tier: AI_MODELS[tier] ? tier : DEFAULT_TIER,
  });
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
// cards = [{ key, medium, settings }], one per Quick Grid card. key names the
// card's copy in the answer ("website", "website_2", ...); settings =
// { words, brief, requirements, component, pointerCount }. Costs one credit per card.
// Returns { [key]: items[] }.
export async function generateQuickGrid({ ctx, variantCount, tier, cards }) {
  const data = await invoke("quick-grid", ctx, tier, { variantCount, cards });
  const out = {};
  let any = false;
  cards.forEach(({ key, medium }) => {
    out[key] = toItems(medium, data?.[key]);
    if (out[key].length) any = true;
  });
  if (!any) throw malformed();
  return out;
}

// Returns an array of items for one medium. settings = that card's settings (optional).
export async function regenerateOutput({ ctx, medium, variantCount, tier, settings }) {
  const data = await invoke("regenerate", ctx, tier, { medium, variantCount, settings });
  const items = toItems(medium, data?.[medium]);
  if (!items.length) throw malformed();
  return items;
}

// Returns an array of variants: [{headline, body}] or [{pointers:[{title,detail}]}]
export async function generateNode({ ctx, node, variantCount, linkedNodes, source, tier }) {
  const data = await invoke("node", ctx, tier, { node, variantCount, linkedNodes, source });
  const variants = normalizeVariants(data);
  if (!variants.length) throw malformed();
  return variants;
}

// Returns the hook string.
export async function generateHook({ ctx, requirement, tier }) {
  const data = await invoke("hook", ctx, tier, { requirement });
  const hook = String(data?.hook || "").trim();
  if (!hook) throw malformed();
  return hook;
}

// Optional: run the CTA <-> copy coherence QA inside the app (returns text).
// described = { sampleCopy, sourceLabel }: the copy to check.
export async function generateCoherenceCheck({ ctx, described, tier }) {
  const data = await invoke("coherence", ctx, tier, { described });
  return String(data?.text || "").trim();
}

// Figma opens with this. It does not spend a credit. Returns
// { userId, generations, hooks, brands }.
export async function pluginPing() {
  return callFunction("ping", { tier: DEFAULT_TIER });
}
