// Central model configuration. Change models here (the Edge Function accepts any
// OpenAI model id matching its safety pattern). No keys here, ever.
export const AI_MODELS = {
  fast: "gpt-4o-mini",
  balanced: "gpt-4o",
  quality: "gpt-4.1",
};
export const MODEL_OPTIONS = [
  { value: "fast", label: "gpt-4o-mini", description: "Everyday tasks" },
  { value: "balanced", label: "gpt-4o", description: "Speed and quality" },
  { value: "quality", label: "gpt-4.1", description: "Complex tasks" },
];
export const DEFAULT_TIER = "balanced";

export const STYLE_PACKS = {
  classic: {
    label: "Classic",
    rules: "Balanced, versatile brand voice — no strong stylistic bias.",
  },
  heritage: {
    label: "Heritage Luxury",
    rules:
      "Formal register, provenance and craft cues, restrained superlatives, no slang or emoji.",
  },
  genz: {
    label: "Gen-Z Discovery",
    rules:
      "Lowercase-friendly, conversational, first/second person, light humour, no corporate jargon.",
  },
  mintech: {
    label: "Minimal Tech",
    rules:
      "Short declarative sentences, functional and precise, no metaphor, specs-first tone.",
  },
};

export const INDUSTRY_LAYERS = {
  general: {
    label: "General / cross-industry",
    rules: "No industry bias; keep claims universally understandable.",
  },
  beauty: {
    label: "Beauty & personal care",
    rules:
      "Sensory, tactile language; ingredient and result specificity; avoid unverifiable clinical claims.",
  },
  fashion: {
    label: "Fashion & apparel",
    rules:
      "Visual, identity-driven; season/trend awareness; fit and material cues; confident register.",
  },
  food: {
    label: "Food & beverage",
    rules:
      "Appetite appeal through taste, texture and origin; ingredient transparency; avoid unverified health claims.",
  },
  wellness: {
    label: "Health & wellness",
    rules:
      "Calm, credible tone; avoid medical or diagnostic claims; emphasise routine and self-care framing.",
  },
  tech: {
    label: "Tech & SaaS",
    rules:
      "Precision over hype; feature-to-benefit translation; avoid jargon unless audience is technical.",
  },
  finance: {
    label: "Finance & fintech",
    rules:
      "Trust and compliance-aware register; no guaranteed-return language; plain-language risk framing.",
  },
  realestate: {
    label: "Real estate",
    rules:
      "Lifestyle plus specification balance; location and space cues; avoid overstated investment promises.",
  },
  hospitality: {
    label: "Hospitality & travel",
    rules:
      "Sensory scene-setting; local/cultural texture; booking urgency without pressure tactics.",
  },
  retail: {
    label: "Retail & e-commerce",
    rules:
      "Value and immediacy; product-forward with clear differentiation; promotion-aware CTA language.",
  },
  auto: {
    label: "Automotive",
    rules:
      "Performance specifics balanced with lifestyle framing; safety and reliability cues; avoid unverified superlatives.",
  },
};

// Each medium's writing style. Lengths are not here: they come from the
// card's limits (below), so a Quick Grid card and a Node Studio node of the
// same medium ask for the same heading + description lengths.
export const SPECS = {
  packaging: "the pack line is immediate and concrete, never a full sentence",
  marketing: "the line sells identity, not features",
  advertising: "the headline stops the scroll; the description backs it up",
  website: "the hero headline leads; the description supports it",
  email: "the subject line earns the open; the body is the email itself",
};

// Node Studio's default lengths per category: the body (description) and the
// headline. A node's `words` is its body alone; `headingWords` (null = this
// default, not enforced) is the headline's. The Quick Grid uses the same
// numbers (MEDIA limits below), so both start from identical settings.
export const NODE_DEFAULT_WORDS = {
  email: 120,
  social: 40,
  website: 70,
  packaging: 8,
  advertising: 22,
};
export const NODE_DEFAULT_HEADING_WORDS = {
  email: 8,
  social: 10,
  website: 10,
  packaging: 4,
  advertising: 8,
};

// A Quick Grid medium's fields: a heading and a description, at its Node
// Studio category's default lengths. category = the node category it matches.
const nodeLimits = (category, heading, description) => ({
  headline: { label: heading, words: NODE_DEFAULT_HEADING_WORDS[category] },
  sub: { label: description, words: NODE_DEFAULT_WORDS[category] },
});

// Quick Grid node types, in Node Studio's column order (COL_ORDER): email,
// marketing (labelled Social, in Social's place), website, packaging, advertising.
// `full` nodes span the whole grid row; `color` drives the node indicator.
// `limits`: every medium is a heading plus a description, at the same default
// lengths as its Node Studio node.
export const MEDIA = [
  {
    key: "email",
    label: "Email",
    tag: "subject + body",
    color: "#4653FF",
    placeholder: "Subject line plus the email body.",
    full: true,
    limits: nodeLimits("email", "Subject", "Body"),
  },
  {
    key: "marketing",
    label: "Social",
    tag: "headline + description",
    color: "#1FB6C9",
    placeholder: "Headline plus the post copy.",
    limits: nodeLimits("social", "Headline", "Description"),
  },
  {
    key: "website",
    label: "Website",
    tag: "hero + support",
    color: "#12A08E",
    placeholder: "Hero headline plus supporting copy.",
    limits: nodeLimits("website", "Hero", "Support"),
  },
  {
    key: "packaging",
    label: "Packaging",
    tag: "pack line + description",
    color: "#2C93D8",
    placeholder: "Pack line plus a short description.",
    limits: nodeLimits("packaging", "Pack line", "Description"),
  },
  {
    key: "advertising",
    label: "Advertising",
    tag: "headline + subtext",
    color: "#B04FC7",
    placeholder: "Headline plus subtext.",
    limits: nodeLimits("advertising", "Headline", "Subtext"),
  },
];
export const MEDIA_BY_KEY = Object.fromEntries(MEDIA.map((m) => [m.key, m]));

// Node Studio
export const NODE_CATS = {
  email: { label: "Email", color: "#4653FF" },
  social: { label: "Social", color: "#8E57E0" },
  website: { label: "Website", color: "#12A08E" },
  packaging: { label: "Packaging", color: "#2C93D8" },
  advertising: { label: "Advertising", color: "#B04FC7" },
  script: { label: "Video / ad script", color: "#84848D", comingSoon: true },
};
export const COL_ORDER = [
  "email",
  "social",
  "website",
  "packaging",
  "advertising",
  "script",
];
export const PLATFORMS = [
  "Instagram",
  "X / Twitter",
  "LinkedIn",
  "Facebook",
  "TikTok",
  "Pinterest",
];
// Platforms picked in the message composer. Picking some limits Generate to the
// Quick Grid cards (`media`) and Node Studio nodes (`nodes`) they need, and
// `rules` tells the model how to write natively for each. Nothing picked =
// every card and node, with no platform bias. Social labels match PLATFORMS.
export const GEN_PLATFORMS = [
  {
    key: "instagram", label: "Instagram", color: "#E1306C",
    media: ["marketing", "advertising"], nodes: ["social", "advertising"],
    rules: "Instagram (feed and Reels): a thumb-stopping first line, visual and sensory, warm and conversational; no hashtags in headlines.",
  },
  {
    key: "tiktok", label: "TikTok", color: "#111111",
    media: ["marketing", "advertising"], nodes: ["social", "advertising"],
    rules: "TikTok: native and spoken-feeling, the hook lands in the first three words, casual and playful, never sounds like an ad.",
  },
  {
    key: "linkedin", label: "LinkedIn", color: "#0A66C2",
    media: ["marketing", "advertising"], nodes: ["social", "advertising"],
    rules: "LinkedIn: professional and insight-led, open with an outcome or a sharp observation, credible, no slang or emoji.",
  },
  {
    key: "x", label: "X / Twitter", color: "#000000",
    media: ["marketing", "advertising"], nodes: ["social", "advertising"],
    rules: "X / Twitter: punchy and witty, one idea that reads at a glance, a conversational edge.",
  },
  {
    key: "facebook", label: "Facebook", color: "#0866FF",
    media: ["marketing", "advertising"], nodes: ["social", "advertising"],
    rules: "Facebook: warm and community-minded, a clear everyday benefit, easy to share.",
  },
  {
    key: "pinterest", label: "Pinterest", color: "#E60023",
    media: ["marketing", "advertising"], nodes: ["social", "advertising"],
    rules: "Pinterest: aspirational and idea-led, describe the outcome or the look, discovery-friendly keywords.",
  },
  {
    key: "google", label: "Google Ads", color: "#4285F4",
    media: ["advertising"], nodes: ["advertising"],
    rules: "Google search ads: intent-driven, lead with the searcher's need and a concrete benefit, a clear action, headline within 30 characters.",
  },
];
export const GEN_PLATFORMS_BY_KEY = Object.fromEntries(GEN_PLATFORMS.map((p) => [p.key, p]));

// The picked platforms (keys) that write for a Quick Grid medium
// (field "media") or a Node Studio category (field "nodes").
export const platformsFor = (keys, field, value) =>
  (keys || []).map((k) => GEN_PLATFORMS_BY_KEY[k]).filter((p) => p && p[field].includes(value));

// NODE_DEFAULT_WORDS / NODE_DEFAULT_HEADING_WORDS sit above MEDIA, which
// uses them. The most a headline can be set to:
export const NODE_MAX_HEADING_WORDS = 60;
export const WEBSITE_COMPONENTS = {
  hero: { label: "Hero (headline + support)" },
  pointers: { label: "Feature pointers (list)" },
  faq: { label: "FAQ item" },
  testimonial: { label: "Testimonial" },
  cta: { label: "CTA block" },
};

// The same components on the Quick Grid's Website card, which is always a
// heading + description: `fields` names those two, `guide` tells the model
// what goes in them. Lengths are the Website node's (10 + 70, MEDIA limits)
// unless `words` sets them (Feature pointers: a title plus a short list).
export const GRID_WEBSITE_COMPONENTS = {
  hero: { fields: ["Hero", "Support"], guide: "a hero headline plus supporting copy" },
  pointers: { fields: ["Section title", "Pointers"], words: [6, 24], guide: "headline is a short section title; sub lists the feature pointers as short benefit-led phrases separated by ' · '" },
  faq: { fields: ["Question", "Answer"], guide: "headline is a question a customer would ask; sub is a clear, direct answer" },
  testimonial: { fields: ["Quote", "Testimonial"], guide: "headline is a short pull-quote from the customer; sub is the full testimonial in their own voice, ending with their name and role" },
  cta: { fields: ["CTA line", "Supporting copy"], guide: "headline is the call-to-action line; sub is the copy that backs it up, ending with the button text" },
};

// Brand panel options (labels identical to the prototype)
export const FUNNEL_STAGES = [
  "Discovery",
  "Consideration",
  "Trust",
  "Purchase",
  "Experience",
  "Loyalty",
];
// Customer tab → Funnel Stage: what the copy does at each stage. Shown under
// the dropdown and sent with the stage in the prompt.
export const FUNNEL_STAGE_JOBS = {
  Discovery: "introduce the brand and earn a first look",
  Consideration: "help them compare and see why this fits",
  Trust: "reassure them with proof and answer their doubts",
  Purchase: "sell: make the reason and the next step clear",
  Experience: "help them get the most from what they bought",
  Loyalty: "bring them back and make them feel valued",
};
export const TONE_MODES = [
  "Emotional",
  "Rational",
  "Cultural",
  "Instructional",
];
// Brand panel → Language: the brand's personality (one, or none).
export const PERSONALITIES = [
  "Emotional",
  "Premium",
  "Authoritative",
  "Warm",
  "Playful",
  "Bold",
  "Minimal",
  "Rational",
  "Witty",
  "Inspiring",
];
// Language → the Cold / Neutral / Warm slider (0 = coldest, 100 = warmest).
export const WARMTH_DEFAULT = 50;

export const AUDIENCES = [
  "Cold — scrolling, distracted",
  "Warm — comparing options",
  "Returning — already a customer",
  "In-store — glancing at shelf",
];
// Customer tab → Desired Emotions: the preset tags (up to MAX_EMOTIONS are
// picked; custom ones can be added). Saved comma-separated in brand.emo.
export const EMOTIONS = [
  "Curiosity",
  "Trust",
  "Comfort",
  "Excitement",
  "Confidence",
  "Belonging",
  "Relief",
  "Joy",
  "Status",
  "Urgency",
];
export const MAX_EMOTIONS = 3;
export const MAX_EMOTION_CHARS = 24;
// Legacy pick-lists (saved values on older brands still reach the prompt).
export const FORMALITIES = ["Conversational", "Casual", "Formal", "Technical"];
export const CTA_LEVELS = ["Soft", "Direct", "Urgent"];
// Customer tab → Advanced Behaviour. Customer Language Preference (saved in
// brand.formality): the words the customer is used to.
export const LANGUAGE_PREFS = {
  Everyday: "plain, everyday words anyone understands; no jargon",
  Professional: "the vocabulary of someone at work: precise, businesslike, light on slang",
  Expert: "the field's own technical terms, used precisely, without explaining the basics",
};
// CTA Strength (saved in brand.cta): how hard the copy pushes to act.
export const CTA_STRENGTHS = {
  Gentle: "a soft invitation with no pressure",
  Clear: "a plain, direct ask",
  Loud: "a bold, emphatic push",
  "Right now": "urgent: act immediately, with a real reason why now",
};
// Older brands saved the legacy values: shown as their nearest new option.
export const LEGACY_LANGUAGE_PREF = { Conversational: "Everyday", Casual: "Everyday", Formal: "Professional", Technical: "Expert" };
export const LEGACY_CTA = { Soft: "Gentle", Direct: "Clear", Urgent: "Right now" };
// The language the generated copy is written in (Advanced Behaviour).
export const LANGUAGES = [
  "English",
  "Hindi",
  "Hinglish",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Dutch",
  "Arabic",
  "Japanese",
  "Korean",
  "Chinese (Simplified)",
  "Indonesian",
  "Turkish",
];
export const NOTE_TYPES = [
  "Competitor example",
  "Customer quote",
  "Trend",
  "Keyword",
];

// Brand pillars: up to this many short statements the copy should embody
// (brand panel, "Create brand pillars").
export const MAX_PILLARS = 3;
export const MAX_PILLAR_CHARS = 200;

export const DEFAULT_BRAND = {
  name: "",
  logo: "",
  belief: "",
  pillars: [],
  message: "",
  personality: "",
  rules: "",
  voice: "",
  warmth: WARMTH_DEFAULT,
  industry: "general",
  stage: "Discovery",
  mode: "Emotional",
  audience: AUDIENCES[0],
  profile: "",
  pain: "",
  emo: "Curiosity",
  formality: "Everyday",
  objection: "",
  cta: "Gentle",
  banned: "",
  must: "",
  location: "",
  language: "English",
};

// "Try a sample brand" on the last step of the product tour.
export const SAMPLE_BRAND = {
  name: "Ember & Oak",
  belief: "Scent is memory, not marketing — every candle should feel like a place you've been.",
  pillars: ["Hand-made in small batches", "Every scent tells a story"],
  personality: "Warm",
  rules: "Short sentences, active voice, no exclamation marks",
  warmth: 70,
  message: "Our autumn candle collection is hand-poured in small batches with natural soy wax.",
  industry: "retail",
  stage: "Discovery",
  mode: "Emotional",
  audience: AUDIENCES[0],
  profile: "Women 28-45 who light a candle to unwind after work. They care about natural ingredients and a scent that lasts.",
  pain: "Mass-market candles smell synthetic and burn out in a week.",
  emo: "Comfort, Joy",
  formality: "Everyday",
  objection: "Worried it won't be worth the price",
  cta: "Gentle",
  banned: "cheap, best-ever",
};
