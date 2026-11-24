// Turns a generation request from the app or the Figma plugin into a prompt.
// The browser only sends brand fields and card / node settings; the prompt is
// always built here, so the endpoint can't be used as a general-purpose
// chatbot. Every field is type-checked and length-capped first.
import {
  AI_MODELS, DEFAULT_TIER, DEFAULT_BRAND, MAX_PILLARS, MAX_PILLAR_CHARS, PERSONALITIES, WARMTH_DEFAULT, STYLE_PACKS, NODE_CATS, PLATFORMS,
  WEBSITE_COMPONENTS, GRID_WEBSITE_COMPONENTS, GEN_PLATFORMS, GEN_PLATFORMS_BY_KEY, MEDIA_BY_KEY, NODE_MAX_HEADING_WORDS,
} from "./constants.js";
import { MAX_WORDS, applyEdit, boxTargets, countWords, nodeBodyTargets, toDisplay, trimToWords, wordRange } from "./copyItems.js";
import { layoutId } from "./layouts.js";
import {
  GRID_MEDIA, buildQuickGridPrompt, buildNodePrompt, buildHookPrompt, buildCoherencePrompt,
} from "./prompts.js";
export { buildLengthFixPrompt } from "./prompts.js";

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
  name: 200, belief: 2000, message: 2000, profile: 1000, pain: 1000, objection: 1000,
  banned: 1000, must: 1000, location: 200, language: 60,
  rules: 1000, voice: 1000,
};
const BRAND_CHOICE = ["industry", "stage", "mode", "audience", "emo", "formality", "cta"];

function cleanCtx(body) {
  const src = obj(body.brand);
  const brand = { ...DEFAULT_BRAND, logo: "" };
  for (const [key, max] of Object.entries(BRAND_TEXT)) brand[key] = str(src[key], max);
  for (const key of BRAND_CHOICE) brand[key] = str(src[key], 120).trim() || DEFAULT_BRAND[key];
  brand.personality = PERSONALITIES.includes(src.personality) ? src.personality : "";
  brand.warmth = int(src.warmth, 0, 100, WARMTH_DEFAULT);
  // Drop blanks first, then keep the first MAX_PILLARS.
  brand.pillars = list(src.pillars, 20)
    .map((p) => str(p, MAX_PILLAR_CHARS).trim())
    .filter(Boolean)
    .slice(0, MAX_PILLARS);
  const notes = list(body.notes, 8)
    .map((n) => ({ type: str(obj(n).type, 60), text: str(obj(n).text, 1000) }))
    .filter((n) => n.text.trim());
  const stylePack = STYLE_PACKS[body.stylePack] ? body.stylePack : "classic";
  return { brand, notes, stylePack };
}

// A card's word targets: { headline?, sub? } per field (only the medium's own
// fields), or one number, a total across them (older clients). null = defaults.
function cleanGridWords(words, medium) {
  if (words == null || words === "") return null;
  if (typeof words !== "object") return int(words, 1, MAX_WORDS, null);
  const fields = Object.keys(MEDIA_BY_KEY[medium]?.limits || {});
  const out = {};
  for (const key of fields) {
    const n = int(obj(words)[key], 1, MAX_WORDS, null);
    if (n) out[key] = n;
  }
  return Object.keys(out).length ? out : null;
}

function cleanGridSettings(input, medium) {
  const s = obj(input);
  return {
    words: cleanGridWords(s.words, medium),
    brief: str(s.brief, 1000),
    component: medium === "website" && GRID_WEBSITE_COMPONENTS[s.component] ? s.component : "hero",
    pointerCount: int(s.pointerCount, 2, 6, 3),
    // The Social card's Platform, as on a Social node.
    platform: medium === "marketing" && PLATFORMS.includes(s.platform) ? s.platform : null,
    // The "Select a layout" tile (layouts.js): how many descriptions to write.
    layout: layoutId(s.layout),
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
    // The headline's user-set length (null = no target; the body is `words`).
    headingWords: n.headingWords == null || n.headingWords === "" ? null : int(n.headingWords, 1, NODE_MAX_HEADING_WORDS, null),
    platform: n.category === "social" && PLATFORMS.includes(n.platform) ? n.platform : null,
    component: WEBSITE_COMPONENTS[n.component] ? n.component : "hero",
    pointerCount: int(n.pointerCount, 2, 6, 3),
    // The "Select a layout" tile (layouts.js): one body, or body + body2.
    layout: layoutId(n.layout),
  };
}

function cleanVariant(input) {
  const v = obj(input);
  if (Array.isArray(v.pointers)) {
    return { pointers: list(v.pointers, 10).map((p) => ({ title: str(obj(p).title, 200), detail: str(obj(p).detail, 600) })) };
  }
  return { headline: str(v.headline, 300), body: str(v.body, 3000), ...(typeof v.body2 === "string" ? { body2: str(v.body2, 3000) } : {}) };
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

// The composer's picked platforms: known keys only, each once.
const cleanPlatforms = (input) =>
  [...new Set(list(input, GEN_PLATFORMS.length).filter((k) => typeof k === "string" && GEN_PLATFORMS_BY_KEY[k]))];

const needsMessage = (ctx) => {
  if (!ctx.brand.message.trim()) throw new RequestError("Add a message to adapt first.");
};

// Pieces of an answer that miss their user-set word count:
// [{ label, words, min, max, target }]. targets = [{ label, text, target }].
function offTarget(targets) {
  return targets.flatMap(({ label, text, target }) => {
    const words = countWords(text);
    const { min, max } = wordRange(target);
    return words < min || words > max ? [{ label, words, min, max, target }] : [];
  });
}

// Node Studio: each variant's body (or, with a two-description layout, body
// and body2, each against the full target) against the node's word count, and its
// headline against the heading target when one is set (pointer components
// have no word count).
const nodeLengthIssues = (node) => (data) =>
  offTarget(list(obj(data).variants, MAX_NODE_VARIANTS)
    .flatMap((v, i) => [
      ...nodeBodyTargets(node).map(([field, target]) => ({ label: `variant ${i + 1} ${field}`, text: obj(v)[field], target })),
      ...(node.headingWords ? [{ label: `variant ${i + 1} headline`, text: obj(v).headline, target: node.headingWords }] : []),
    ])
    .filter((t) => typeof t.text === "string"));

// The JSON field an item keeps a display field in: every medium answers with
// "headline" / "sub" (prompts.js itemShape).
const jsonField = (medium, field) => field;

// Quick Grid: each field (heading, description) of every item of a card that
// has a user-set word target for it.
const gridLengthIssues = (cards) => (data) =>
  offTarget(cards.flatMap((c) => {
    const targets = Object.entries(boxTargets(c.medium, c.settings));
    if (!targets.length) return [];
    const single = Object.keys(MEDIA_BY_KEY[c.medium]?.limits || {}).length === 1;
    return list(obj(data)[c.key], MAX_GRID_VARIANTS).flatMap((item, i) => targets.map(([field, target]) => ({
      label: single ? `${c.key} item ${i + 1}` : `${c.key} item ${i + 1} "${jsonField(c.medium, field)}"`,
      text: toDisplay(item)?.[field],
      target,
    })));
  }).filter((t) => typeof t.text === "string"));

// The last guard on a user-set word count, after the rewrites: anything still
// over its limit is cut back to it (copyItems.js trimToWords). Never lengthens.
// Node Studio: each variant's body, and its headline when it has a target.
const clampNode = (node) => (data) => {
  const d = obj(data);
  if (!Array.isArray(d.variants)) return data;
  return {
    ...d,
    variants: d.variants.map((v) => {
      const o = obj(v);
      if (typeof o.body !== "string") return v;
      const next = { ...o };
      for (const [field, max] of nodeBodyTargets(node)) {
        if (typeof o[field] === "string") next[field] = trimToWords(o[field], max);
      }
      if (node.headingWords && typeof o.headline === "string") next.headline = trimToWords(o.headline, node.headingWords);
      return next;
    }),
  };
};

// Quick Grid: each field with a user-set target, on its own.
function clampItem(item, targets) {
  return targets.reduce((it, [field, max]) => {
    const text = toDisplay(it)?.[field];
    return typeof text === "string" && countWords(text) > max ? applyEdit(it, field, trimToWords(text, max)) : it;
  }, item);
}

const clampGrid = (cards) => (data) => {
  const d = { ...obj(data) };
  for (const c of cards) {
    const targets = Object.entries(boxTargets(c.medium, c.settings));
    if (targets.length && Array.isArray(d[c.key])) d[c.key] = d[c.key].map((item) => clampItem(item, targets));
  }
  return d;
};

// Returns { prompt, credits, ctx, lengthIssues?, clampLength? } for a
// generation type, or throws RequestError. credits = what the call costs: one
// per Quick Grid card, one for anything else. lengthIssues(data) lists the
// pieces of an answer that miss a user-set word count, so the server can ask
// for a rewrite; clampLength(data) then cuts anything still over the limit.
export function buildGeneration(type, body = {}) {
  const ctx = cleanCtx(body);
  const platforms = cleanPlatforms(body.platforms);
  switch (type) {
    case "quick-grid": {
      needsMessage(ctx);
      const cards = cleanCards(body.cards);
      const n = int(body.variantCount, 1, MAX_GRID_VARIANTS, 1);
      return {
        ctx, credits: cards.length, prompt: buildQuickGridPrompt(ctx, n, cards, platforms), lengthIssues: gridLengthIssues(cards),
        clampLength: clampGrid(cards),
      };
    }
    case "regenerate": {
      needsMessage(ctx);
      if (!GRID_MEDIA.includes(body.medium)) throw new RequestError("Unknown medium.");
      const card = { key: body.medium, medium: body.medium, settings: cleanGridSettings(body.settings, body.medium) };
      const n = int(body.variantCount, 1, MAX_GRID_VARIANTS, 1);
      return {
        ctx, credits: 1, prompt: buildQuickGridPrompt(ctx, n, [card], platforms), lengthIssues: gridLengthIssues([card]),
        clampLength: clampGrid([card]),
      };
    }
    case "node": {
      const node = cleanNode(body.node);
      const linked = list(body.linkedNodes, 6)
        .filter((l) => obj(l).variant)
        .map((l) => ({ label: str(l.label, 120), variant: cleanVariant(l.variant) }));
      const n = int(body.variantCount, 1, MAX_NODE_VARIANTS, 1);
      return {
        ctx, credits: 1, prompt: buildNodePrompt(ctx, node, n, linked, cleanSource(body.source), platforms),
        lengthIssues: nodeLengthIssues(node),
        clampLength: clampNode(node),
      };
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
