// Turns a generation request from the app or the Figma plugin into a prompt.
// The browser only sends brand fields and card / node settings; the prompt is
// always built here, so the endpoint can't be used as a general-purpose
// chatbot. Every field is type-checked and length-capped first.
import {
  AI_MODELS, DEFAULT_TIER, DEFAULT_BRAND, STYLE_PACKS, NODE_CATS, PLATFORMS,
  WEBSITE_COMPONENTS, GRID_WEBSITE_COMPONENTS,
} from "./constants.js";
import { MAX_WORDS } from "./copyItems.js";
import {
  GRID_MEDIA, buildQuickGridPrompt, buildNodePrompt, buildHookPrompt, buildCoherencePrompt,
} from "./prompts.js";

export class RequestError extends Error {}

// Only these models are ever called; anything else the client names is ignored.
export const modelFor = (tier) => AI_MODELS[tier] || AI_MODELS[DEFAULT_TIER];

// Quick Grid variants per card / Node Studio (and Figma) copies per node.
export const MAX_GRID_VARIANTS = 5;
export const MAX_NODE_VARIANTS = 40; // keep in sync with MAX_COPIES in Figma/src/ui/components/GeneratePanel.tsx
export const MAX_GRID_CARDS = 10;

const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
const list = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const int = (v, min, max, fallback) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// Free-text fields and their caps. The pick-list fields (industry, stage, ...)
// only need a short cap: prompts.js falls back for values it doesn't know.
const BRAND_TEXT = {
  name: 200, belief: 2000, message: 2000, pain: 1000, objection: 1000,
  banned: 1000, must: 1000, location: 200, language: 60,
};
const BRAND_CHOICE = ["industry", "stage", "mode", "audience", "emo", "formality", "cta"];

function cleanCtx(body) {
  const src = obj(body.brand);
  const brand = { ...DEFAULT_BRAND, logo: "" };
  for (const [key, max] of Object.entries(BRAND_TEXT)) brand[key] = str(src[key], max);
  for (const key of BRAND_CHOICE) brand[key] = str(src[key], 120).trim() || DEFAULT_BRAND[key];
  const notes = list(body.notes, 8)
    .map((n) => ({ type: str(obj(n).type, 60), text: str(obj(n).text, 1000) }))
    .filter((n) => n.text.trim());
  const stylePack = STYLE_PACKS[body.stylePack] ? body.stylePack : "classic";
  return { brand, notes, stylePack };
}

function cleanGridSettings(input, medium) {
  const s = obj(input);
  return {
    words: s.words == null || s.words === "" ? null : int(s.words, 1, MAX_WORDS, null),
    brief: str(s.brief, 1000),
    requirements: str(s.requirements, 1000),
    component: medium === "website" && GRID_WEBSITE_COMPONENTS[s.component] ? s.component : "hero",
    pointerCount: int(s.pointerCount, 2, 6, 3),
  };
}

// "website", "website_2", ... : the medium, optionally numbered.
const CARD_KEY = /^([a-z]+)(_\d{1,2})?$/;

function cleanCards(input) {
  const cards = list(input, MAX_GRID_CARDS + 1);
  if (!cards.length) throw new RequestError("Add a card to generate into.");
  if (cards.length > MAX_GRID_CARDS) throw new RequestError(`At most ${MAX_GRID_CARDS} cards per request.`);
  const seen = new Set();
  return cards.map((raw) => {
    const card = obj(raw);
    const medium = card.medium;
    const key = typeof card.key === "string" ? card.key : "";
    if (!GRID_MEDIA.includes(medium) || CARD_KEY.exec(key)?.[1] !== medium || seen.has(key)) {
      throw new RequestError("A card in this request isn't valid.");
    }
    seen.add(key);
    return { key, medium, settings: cleanGridSettings(card.settings, medium) };
  });
}

function cleanNode(input) {
  const n = obj(input);
  const cat = NODE_CATS[n.category];
  if (!cat || cat.comingSoon) throw new RequestError("Unknown node category.");
  return {
    category: n.category,
    label: str(n.label, 120).trim() || cat.label,
    brief: str(n.brief, 2000),
    words: int(n.words, 4, 600, 60),
    requirements: str(n.requirements, 2000),
    platform: n.category === "social" && PLATFORMS.includes(n.platform) ? n.platform : null,
    component: WEBSITE_COMPONENTS[n.component] ? n.component : "hero",
    pointerCount: int(n.pointerCount, 2, 6, 3),
  };
}

function cleanVariant(input) {
  const v = obj(input);
  if (Array.isArray(v.pointers)) {
    return { pointers: list(v.pointers, 10).map((p) => ({ title: str(obj(p).title, 200), detail: str(obj(p).detail, 600) })) };
  }
  return { headline: str(v.headline, 300), body: str(v.body, 3000) };
}

function cleanSource(input) {
  if (!input || typeof input !== "object") return null;
  const s = obj(input);
  return {
    label: str(s.label, 120),
    category: NODE_CATS[s.category] ? s.category : "email",
    variant: s.variant ? cleanVariant(s.variant) : null,
  };
}

const needsMessage = (ctx) => {
  if (!ctx.brand.message.trim()) throw new RequestError("Add a message to adapt first.");
};

// Returns { prompt, credits, ctx } for a generation type, or throws RequestError.
// credits = what the call costs: one per Quick Grid card, one for anything else.
export function buildGeneration(type, body = {}) {
  const ctx = cleanCtx(body);
  switch (type) {
    case "quick-grid": {
      needsMessage(ctx);
      const cards = cleanCards(body.cards);
      const n = int(body.variantCount, 1, MAX_GRID_VARIANTS, 1);
      return { ctx, credits: cards.length, prompt: buildQuickGridPrompt(ctx, n, cards) };
    }
    case "regenerate": {
      needsMessage(ctx);
      if (!GRID_MEDIA.includes(body.medium)) throw new RequestError("Unknown medium.");
      const card = { key: body.medium, medium: body.medium, settings: cleanGridSettings(body.settings, body.medium) };
      const n = int(body.variantCount, 1, MAX_GRID_VARIANTS, 1);
      return { ctx, credits: 1, prompt: buildQuickGridPrompt(ctx, n, [card]) };
    }
    case "node": {
      const node = cleanNode(body.node);
      const linked = list(body.linkedNodes, 6)
        .filter((l) => obj(l).variant)
        .map((l) => ({ label: str(l.label, 120), variant: cleanVariant(l.variant) }));
      const n = int(body.variantCount, 1, MAX_NODE_VARIANTS, 1);
      return { ctx, credits: 1, prompt: buildNodePrompt(ctx, node, n, linked, cleanSource(body.source)) };
    }
    case "hook":
      return { ctx, credits: 1, prompt: buildHookPrompt(ctx, str(body.requirement, 2000)) };
    case "coherence": {
      const d = obj(body.described);
      const sampleCopy = str(d.sampleCopy, 6000);
      if (!sampleCopy.trim()) throw new RequestError("Add the copy to check first.");
      return { ctx, credits: 1, prompt: buildCoherencePrompt(ctx, { sampleCopy, sourceLabel: str(d.sourceLabel, 120) || "this brand" }) };
    }
  }
  throw new RequestError("Unknown generation type.");
}
