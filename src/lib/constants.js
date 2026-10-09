// Central model configuration. Change models here (the Edge Function accepts any
// OpenAI model id matching its safety pattern). No keys here, ever.
export const AI_MODELS = {
  fast: "gpt-4o-mini",
  balanced: "gpt-4o",
  quality: "gpt-4.1",
};
export const MODEL_OPTIONS = [
  { value: "fast", label: "Fast" },
  { value: "balanced", label: "Balanced" },
  { value: "quality", label: "Max quality" },
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

export const SPECS = {
  packaging: "2-6 words only, no full sentence, immediate and concrete",
  marketing:
    "one short punchy campaign line under 12 words, sells identity not features",
  advertising:
    "a headline under 8 words plus one supporting line under 12 words",
  website:
    "a hero headline under 10 words plus one supporting sentence under 20 words",
  email: "a subject line under 8 words plus a preview line under 14 words",
};

// Quick Grid node types (order, tags and placeholders match the prototype).
// `full` nodes span the whole grid row; `color` drives the node indicator.
// `limits` mirror SPECS (max words per field) plus inbox truncation for email.
export const MEDIA = [
  {
    key: "packaging",
    label: "Packaging",
    tag: "2–6 words",
    color: "#f47a2c",
    placeholder: "What it is, felt instantly.",
    limits: { headline: { label: "Pack line", words: 6 } },
  },
  {
    key: "marketing",
    label: "Marketing",
    tag: "<12 words",
    color: "#f3245c",
    placeholder: "One line. Identity over feature.",
    limits: { headline: { label: "Campaign line", words: 12 } },
  },
  {
    key: "advertising",
    label: "Advertising",
    tag: "headline + subtext",
    color: "#f72fbd",
    placeholder: "Headline plus one-line subtext.",
    limits: { headline: { label: "Headline", words: 8 }, sub: { label: "Subtext", words: 12 } },
  },
  {
    key: "website",
    label: "Website",
    tag: "hero + support",
    color: "#07b67c",
    placeholder: "Hero headline plus supporting line.",
    limits: { headline: { label: "Hero", words: 10 }, sub: { label: "Support", words: 20 } },
  },
  {
    key: "email",
    label: "Email",
    tag: "subject + preview",
    color: "#2b2f8c",
    placeholder: "Subject line plus preview text.",
    full: true,
    limits: { headline: { label: "Subject", words: 8, chars: 60 }, sub: { label: "Preview", words: 14, chars: 110 } },
  },
];
export const MEDIA_BY_KEY = Object.fromEntries(MEDIA.map((m) => [m.key, m]));

// Node Studio
export const NODE_CATS = {
  email: { label: "Email", color: "#4653FF" },
  social: { label: "Social", color: "#B7539E" },
  website: { label: "Website", color: "#1F9C6E" },
  packaging: { label: "Packaging", color: "#B4590A" },
  advertising: { label: "Advertising", color: "#0EA5B7" },
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
export const NODE_DEFAULT_WORDS = {
  email: 120,
  social: 40,
  website: 70,
  packaging: 8,
  advertising: 22,
};
export const WEBSITE_COMPONENTS = {
  hero: { label: "Hero (headline + support)" },
  pointers: { label: "Feature pointers (list)" },
  faq: { label: "FAQ item" },
  testimonial: { label: "Testimonial" },
  cta: { label: "CTA block" },
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
export const TONE_MODES = [
  "Emotional",
  "Rational",
  "Cultural",
  "Instructional",
];
export const AUDIENCES = [
  "Cold — scrolling, distracted",
  "Warm — comparing options",
  "Returning — already a customer",
  "In-store — glancing at shelf",
];
export const EMOTIONS = [
  "Curiosity",
  "Trust",
  "Urgency",
  "Comfort",
  "Status",
  "Belonging",
];
export const FORMALITIES = ["Conversational", "Casual", "Formal", "Technical"];
export const CTA_LEVELS = ["Soft", "Direct", "Urgent"];
export const NOTE_TYPES = [
  "Competitor example",
  "Customer quote",
  "Trend",
  "Keyword",
];

export const DEFAULT_BRAND = {
  name: "",
  logo: "",
  belief: "",
  message: "",
  industry: "general",
  stage: "Discovery",
  mode: "Emotional",
  audience: AUDIENCES[0],
  pain: "",
  emo: "Curiosity",
  formality: "Conversational",
  objection: "",
  cta: "Soft",
  banned: "",
  must: "",
};

// "Try a sample brand" on the last step of the product tour.
export const SAMPLE_BRAND = {
  name: "Ember & Oak",
  belief: "Scent is memory, not marketing — every candle should feel like a place you've been.",
  message: "Our autumn candle collection is hand-poured in small batches with natural soy wax.",
  industry: "retail",
  stage: "Discovery",
  mode: "Emotional",
  audience: AUDIENCES[0],
  pain: "Mass-market candles smell synthetic and burn out in a week.",
  emo: "Comfort",
  formality: "Conversational",
  objection: "Worried it won't be worth the price",
  cta: "Soft",
  banned: "cheap, best-ever",
};
