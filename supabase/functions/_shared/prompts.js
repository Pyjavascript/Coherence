import {
  STYLE_PACKS,
  INDUSTRY_LAYERS,
  MAX_PILLARS,
  PERSONALITIES,
  WARMTH_DEFAULT,
  FUNNEL_STAGE_JOBS,
  LANGUAGE_PREFS,
  CTA_STRENGTHS,
  SPECS,
  NODE_CATS,
  NODE_DEFAULT_HEADING_WORDS,
  WEBSITE_COMPONENTS,
  GRID_WEBSITE_COMPONENTS,
  GEN_PLATFORMS,
  platformsFor,
} from "./constants.js";
import { aimFor, boxLimits, boxTargets, cardLayout, compactHeadingWords, nodeBodyTargets, wordRange } from "./copyItems.js";
import { NODE_DESC_FIELDS, layoutGuide } from "./layouts.js";

// ctx = { brand, notes, stylePack }
const t = (s) => (s || "").trim();

function clean(ctx) {
  const b = ctx.brand || {};
  return {
    name: t(b.name),
    belief: t(b.belief),
    pillars: (Array.isArray(b.pillars) ? b.pillars : []).map(t).filter(Boolean).slice(0, MAX_PILLARS),
    message: t(b.message),
    industry: b.industry,
    stage: b.stage,
    mode: b.mode,
    audience: b.audience,
    profile: t(b.profile),
    pain: t(b.pain),
    emo: b.emo,
    formality: b.formality,
    objection: t(b.objection),
    cta: b.cta,
    banned: t(b.banned),
    must: t(b.must),
    location: t(b.location),
    language: t(b.language) || "English",
    personality: PERSONALITIES.includes(b.personality) ? b.personality : "",
    rules: t(b.rules),
    voice: t(b.voice),
    warmth: Number.isFinite(Number(b.warmth)) ? Math.min(100, Math.max(0, Math.round(Number(b.warmth)))) : WARMTH_DEFAULT,
  };
}

// Brand panel → Language: personality, writing rules, a voice sample and the
// Cold / Neutral / Warm slider. Only what's set is added; the slider only
// when it's off Neutral, so untouched brands get the same prompt as before.
const warmthLabel = (w) =>
  w <= 15 ? "very cool: detached and matter-of-fact, no emotional language"
    : w <= 40 ? "cool: restrained and factual, light on emotional language"
      : w <= 60 ? "neutral: balanced, neither cold nor gushing"
        : w <= 85 ? "warm: friendly, human and caring"
          : "very warm: affectionate, intimate and emotionally open";
const languageBlock = (c) =>
  (c.personality ? `\nBrand personality: ${c.personality}. Every line should sound like this personality.` : "") +
  (c.warmth !== WARMTH_DEFAULT ? `\nWarmth of the voice (${c.warmth}/100, cold to warm): ${warmthLabel(c.warmth)}.` : "") +
  (c.rules ? `\nWriting rules (follow every one): ${c.rules}` : "") +
  (c.voice ? `\nVoice sample (match its rhythm, vocabulary and attitude; never reuse its words): ${c.voice}` : "");

// Brand panel → Customer. The funnel stage carries what the copy should do
// there; the language preference and CTA strength carry what they mean.
// Older brands' legacy values (Conversational, Soft, ...) pass through as is.
const stageText = (c) => (FUNNEL_STAGE_JOBS[c.stage] ? `${c.stage} (the copy should ${FUNNEL_STAGE_JOBS[c.stage]})` : c.stage);
const customerLine = (c) =>
  `Customer context: funnel stage = ${stageText(c)}, language mode = ${c.mode}, audience posture = ${c.audience}.` +
  (c.profile ? `\nCustomer profile (write to this person): ${c.profile}` : "");
const vocabText = (c) =>
  LANGUAGE_PREFS[c.formality] ? `Customer vocabulary: ${c.formality}, ${LANGUAGE_PREFS[c.formality]}.` : `Formality: ${c.formality}.`;
const ctaText = (c) =>
  CTA_STRENGTHS[c.cta] ? `CTA strength: ${c.cta}, ${CTA_STRENGTHS[c.cta]}.` : `CTA intensity: ${c.cta}.`;
const feelText = (c) => `Desired emotional response (how the reader should feel after reading): ${c.emo}.`;
const mustLine = (c) => (c.must ? `\nEvery piece must include (work it in naturally): ${c.must}` : "");

// The brand's pillars (brand panel): what every piece should stand on. "" when none.
const pillarList = (c) => c.pillars.map((p, i) => `${i + 1}) ${p}`).join("; ");
const pillarsLine = (c) =>
  c.pillars.length
    ? `\nBrand pillars (every piece must reflect at least one of them and never contradict any): ${pillarList(c)}`
    : "";

// Market + output language. JSON keys stay English so the response still parses.
const localeBlock = (c) =>
  (c.location
    ? `\nTarget location/market: ${c.location}. Use spelling, currency, units, references and cultural cues natural to this market.`
    : "") +
  `\nWrite all copy in ${c.language}${c.language === "English" ? "" : " (only the text values; keep every JSON key in English)"}.`;
const industryOf = (c) =>
  INDUSTRY_LAYERS[c.industry] || INDUSTRY_LAYERS.general;
// Plain wording only: internal product names here (e.g. "Pixels Intelligence
// Layer") get read as content and end up in the copy.
const industryLine = (c) => `Industry conventions (${industryOf(c).label}): ${industryOf(c).rules}`;
const packOf = (ctx) => STYLE_PACKS[ctx.stylePack] || STYLE_PACKS.classic;
const researchBlock = (notes = []) =>
  notes.length
    ? `\nResearch context:\n` +
      notes
        .slice(0, 8)
        .map((n) => `- [${n.type}] ${n.text}`)
        .join("\n")
    : "";

function sharedExtras(ctx, c) {
  let extra = `\n${industryLine(c)}`;
  extra += `\nStyle pack — ${packOf(ctx).label}: ${packOf(ctx).rules}`;
  if (c.pain) extra += `\nCustomer pain point: ${c.pain}`;
  extra += `\n${feelText(c)} ${vocabText(c)} ${ctaText(c)}`;
  if (c.objection) extra += `\nObjection to pre-empt: ${c.objection}`;
  if (c.banned) extra += `\nNever use these words/claims: ${c.banned}`;
  extra += mustLine(c);
  extra += languageBlock(c);
  extra += localeBlock(c);
  extra += researchBlock(ctx.notes);
  return extra;
}

export function buildBasePrompt(ctx) {
  const c = clean(ctx);
  return `You are a brand language engine that adapts one constant message into channel-correct copy while preserving the brand's core belief.
Brand: ${c.name || "the brand"}
Core belief (must stay true across every output): ${c.belief}${pillarsLine(c)}
Message to adapt: ${c.message}
${customerLine(c)}${sharedExtras(ctx, c)}
Never explain your choices. Never use quotation marks in the output text. Keep the core belief's point of view recognisable in every version, even though wording, length and register change per channel.${c.pillars.length ? " Let the brand pillars show through what each version says, without naming them as pillars." : ""}`;
}

// The website card's component, unless it's the default hero.
const gridComponent = (medium, s) =>
  medium === "website" && s?.component && s.component !== "hero" ? s.component : null;

// The medium's format + length constraint, worded as Node Studio's: a heading
// ("headline") of about its default length, or strict when the user set one,
// plus a description ("sub", the main copy) held strictly to its length, the
// card's default or the user's, which is the node's "body" rule. Then the
// medium's style (SPECS) or the Website card's component.
// The card's layout (layouts.js) splits the description into sub + sub2 when
// it has two description boxes, each with the full word target, and says
// where each box sits; a small heading box gets a shorter default heading.
function lengthSpec(medium, s = {}) {
  const comp = gridComponent(medium, s);
  const targets = boxTargets(medium, s);
  const limits = boxLimits(medium, s);
  const layout = cardLayout(medium, s);
  if (!limits) return SPECS[medium];
  const parts = Object.entries(limits).map(([key, l]) => {
    const label = l.label.toLowerCase();
    const name = label === key ? key : `${key} (${label})`;
    if (!targets[key]) return `${name} of about ${key === "headline" ? compactHeadingWords(l.words, layout) : l.words} words`;
    const { min, max } = wordRange(targets[key]);
    return `${name} of ${min}-${max} words (strict: never more than ${max}; aim for about ${aimFor(targets[key])})`;
  });
  let spec = parts.join(" plus ");
  if (comp) {
    const pointers = comp === "pointers" ? ` (exactly ${s.pointerCount || 3} pointers)` : "";
    spec = `a "${WEBSITE_COMPONENTS[comp].label}" website component${pointers}: ${GRID_WEBSITE_COMPONENTS[comp].guide}; ${spec}`;
  } else if (SPECS[medium]) {
    spec += `; ${SPECS[medium]}`;
  }
  if (limits.sub2) {
    spec += `; layout: ${layoutGuide(layout)}; sub and sub2 are separate boxes, so each says something different and neither repeats the other or the headline`;
    if (targets.sub) spec += "; write enough to reach each box's length with concrete detail, benefits, proof or a clear call to action, never filler or repetition";
  } else {
    if (layoutGuide(layout)) spec += `; layout: ${layoutGuide(layout)}`;
    if (targets.sub) spec += "; sub is the main copy: write enough to reach its length with concrete detail, benefits, proof or a clear call to action, never filler or repetition";
  }
  if (Object.keys(targets).length) spec += "; count each field's words on its own; these lengths override any shorter length the channel's conventions suggest";
  return spec;
}

// The card's job requirement, if any.
function cardBrief(s = {}) {
  return t(s.brief) ? `job requirement: ${t(s.brief)}` : "";
}

// How to write for the given platforms, or "" for none. One piece of copy
// that serves several platforms has to work on all of them.
function platformRules(picked) {
  if (!picked.length) return "";
  const all = picked.length === 2 ? "both" : `all ${picked.length}`;
  const both = picked.length > 1 ? ` The same copy runs on ${all} platforms, so it must feel native on each.` : "";
  return picked.map((p) => p.rules).join(" ") + both;
}

export const GRID_MEDIA = ["packaging", "marketing", "advertising", "website", "email"];

// Every medium answers with a heading plus a description, under the same keys
// (the app files an email's as its subject / body: services/ai.js), and a
// second description ("sub2") when the card's layout has two.
const itemShape = (medium, settings) =>
  (boxLimits(medium, settings)?.sub2 ? '{"headline":"...","sub":"...","sub2":"..."}' : '{"headline":"...","sub":"..."}');

// cards = [{ key, medium, settings }]: one entry per Quick Grid card. `key` names
// the card's array in the answer ("website", or "website_2" for a second Website
// card); settings = { words: { headline, sub } (per-field word targets), brief, component, pointerCount, platform }, with
// missing fields using the medium's defaults. One card = a regenerate.
// platforms = the composer's picked platform keys; each card is written for
// the ones that cover its medium, unless it has its own platform (the Social
// card's Platform setting), which wins, as on a Node Studio node.
export function buildQuickGridPrompt(ctx, n, cards, platforms = []) {
  const base = buildBasePrompt(ctx);
  const rulesFor = (medium, settings) => platformRules(settings?.platform
    ? GEN_PLATFORMS.filter((pl) => pl.label === settings.platform)
    : platformsFor(platforms, "media", medium));
  if (cards.length === 1) {
    const [{ key, medium, settings }] = cards;
    const brief = cardBrief(settings);
    const rules = rulesFor(medium, settings);
    return `${base}
Generate exactly ${n} distinct variant(s) for the ${medium} medium only — different angles, not synonyms.
Return ONLY this JSON, no markdown fences: {"${key}":[${itemShape(medium, settings)}]}  (array length ${n})
Constraint: ${lengthSpec(medium, settings)}.${rules ? `\nPlatform — write it natively for this: ${rules}` : ""}${brief ? `\nInstructions for this ${medium} copy — ${brief}.` : ""}`;
  }
  const label = ({ key, medium }) => (key === medium ? key : `${key} (${medium})`);
  const shared = cards.some((c, i) => cards.findIndex((o) => o.medium === c.medium) !== i);
  const briefs = cards.map((c) => [c, cardBrief(c.settings)]).filter(([, b]) => b);
  const targeted = cards.map((c) => [c, rulesFor(c.medium, c.settings)]).filter(([, r]) => r);
  return `${base}
Generate exactly ${n} distinct variant(s) for every output below — different angles, not synonyms of each other.${shared
    ? "\nSome outputs share a medium (e.g. website and website_2): give each its own angle, never the same line twice."
    : ""}
Return ONLY valid JSON, no markdown fences, an array of length ${n} for every key:
{${cards.map((c) => `"${c.key}":[${itemShape(c.medium, c.settings)}]`).join(",")}}
Constraints:
${cards.map((c) => `- ${label(c)}: ${lengthSpec(c.medium, c.settings)}`).join("\n")}${targeted.length
    ? `\nPlatform targeting (write each output natively for its platform):\n${targeted.map(([c, r]) => `- ${label(c)}: ${r}`).join("\n")}`
    : ""}${briefs.length
    ? `\nPer-output instructions (follow them for that output only):\n${briefs.map(([c, b]) => `- ${label(c)}: ${b}`).join("\n")}`
    : ""}`;
}

// node = full node object; linkedNodes = [{label, variant}] (connected nodes that already have output)
// source = {label, category, variant|null}: the node this one was just linked from, to adapt
// platforms = the composer's picked platform keys (a social node follows its own platform)
export function buildNodePrompt(ctx, node, vCount, linkedNodes = [], source = null, platforms = []) {
  const c = clean(ctx);
  const cat = NODE_CATS[node.category];
  let p = `You are a brand language engine generating one specific content node inside a larger node-based content system. Keep this piece coherent with the brand's constant while doing its own specific job.
Brand: ${c.name || "the brand"}
Core belief (constant): ${c.belief}${pillarsLine(c)}
Brand message reference: ${c.message || "(none supplied — infer from the belief)"}
${industryLine(c)}
Style pack — ${packOf(ctx).label}: ${packOf(ctx).rules}
${customerLine(c)}`;
  if (c.pain) p += `\nCustomer pain point: ${c.pain}`;
  p += `\n${feelText(c)} ${vocabText(c)} ${ctaText(c)}`;
  if (c.objection) p += `\nObjection to pre-empt: ${c.objection}`;
  if (c.banned) p += `\nNever use these words/claims: ${c.banned}`;
  p += mustLine(c);
  p += languageBlock(c);
  p += localeBlock(c);
  p += researchBlock(ctx.notes);
  const words = node.words || 60;
  const range = wordRange(words);
  // The layout (layouts.js): one body, or body + body2, each at the node's
  // full word target.
  const layout = node.category === "website" && node.component === "pointers" ? 0 : node.layout || 0;
  const bodies = nodeBodyTargets(node).map(([field, target]) => ({ field, target, ...wordRange(target) }));
  const twoBodies = bodies.length > 1;
  // The headline: strict when the user set its length, else about the
  // category's default (shorter in a small heading box).
  const heading = node.headingWords ? wordRange(node.headingWords) : null;
  const headingWords = compactHeadingWords(NODE_DEFAULT_HEADING_WORDS[node.category] || 10, layout);
  const headingSpec = heading
    ? `The headline must be ${heading.min}-${heading.max} words and never more than ${heading.max}; aim for about ${aimFor(node.headingWords)} (set by the user, strict; count its words on its own).`
    : `The headline is a short line of about ${headingWords} words.`;
  p += `\n\nThis node: ${node.label} (category: ${cat.label}${node.platform ? ", platform: " + node.platform : ""}).
Job requirement for this specific piece: ${t(node.brief) || "(use the brand message as the job)"}
${twoBodies
    ? `Layout: ${layoutGuide(layout, NODE_DESC_FIELDS)}. body and body2 are separate boxes: each says something different and neither repeats the other or the headline.
Length (set by the user, strict, each counted on its own): ${bodies.map((b) => `${b.field} must be ${b.min}-${b.max} words, never more than ${b.max}, aim for about ${aimFor(b.target)}`).join("; ")}. The headline is not counted in them. Write enough to reach each: develop the idea with concrete detail, benefits, proof or a clear call to action, never filler or repetition. Count each one's words before answering. This overrides any shorter length the channel's conventions suggest.`
    : `${layoutGuide(layout) ? `Layout: ${layoutGuide(layout, NODE_DESC_FIELDS)}.\n` : ""}Length (set by the user, strict): the body must be ${range.min}-${range.max} words and never more than ${range.max}; aim for about ${aimFor(words)}. The headline is not counted in it. Write enough to reach it: develop the idea with concrete detail, benefits, proof or a clear call to action, never filler or repetition. Count the body's words before answering. This overrides any shorter length the channel's conventions suggest.`}
${headingSpec}`;
  const rules = platformRules(node.platform
    ? GEN_PLATFORMS.filter((pl) => pl.label === node.platform)
    : platformsFor(platforms, "nodes", node.category));
  if (rules) p += `\nPlatform — write it natively for this: ${rules}`;

  if (linkedNodes.length) {
    p +=
      `\n\nThis piece must stay correlated and coherent with these connected pieces already written:\n` +
      linkedNodes
        .map(({ label, variant: v }) =>
          v.pointers
            ? `- [${label}] (pointers) ${v.pointers.map((x) => x.title).join("; ")}`
            : `- [${label}] ${[v.headline, v.body, v.body2].filter(Boolean).join(" — ")}`,
        )
        .join("\n");
  }

  if (source) {
    const from = NODE_CATS[source.category]?.label || source.category;
    p += `\n\nThis node is linked from the ${from} node "${source.label}" and shares its job requirement.`;
    if (source.variant) {
      const v = source.variant;
      p += ` Its finished copy:\n` +
        (v.pointers
          ? v.pointers.map((x) => `- ${x.title} — ${x.detail}`).join("\n")
          : `Headline: ${v.headline}\nBody: ${[v.body, v.body2].filter(Boolean).join("\n")}`);
      p += `\nAdapt that copy into this ${cat.label} piece: carry over its message, key facts, offer and emotional angle, but rewrite it natively for this channel's format, length and conventions instead of copying lines verbatim.`;
    } else {
      p += ` Write this ${cat.label} piece for that same job, natively for this channel.`;
    }
  }

  const isPointers =
    node.category === "website" && node.component === "pointers";
  if (node.category === "website" && !isPointers) {
    const compLabel = (
      WEBSITE_COMPONENTS[node.component] || WEBSITE_COMPONENTS.hero
    ).label;
    p += `\nThis is a "${compLabel}" website component — write headline/body to fit that specific role, not a generic hero.`;
  }
  if (isPointers) {
    const pc = node.pointerCount || 3;
    p += `\nThis is a "Feature pointers" component: produce exactly ${pc} distinct benefit-led pointers, each a short title (3-6 words) plus a one-sentence detail.`;
    p += `\n\nReturn ONLY valid JSON, no markdown fences: {"variants":[{"pointers":[{"title":"...","detail":"..."} /* exactly ${pc} of these */]}]} with exactly ${vCount} variant(s) in the array, each a distinct set of ${pc} pointers. Never use quotation marks inside the text. Never explain your choices.`;
  } else {
    p += twoBodies
      ? `\n\nReturn ONLY valid JSON, no markdown fences: {"variants":[{"headline":"...","body":"...","body2":"..."}]} with exactly ${vCount} item(s) in the array, each a distinct angle. headline is a short hook/subject/title line${heading ? ` of ${heading.min}-${heading.max} words` : ""}. ${bodies.map((b) => `${b.field} is ${b.min}-${b.max} words`).join("; ")}. Never use quotation marks inside the text. Never explain your choices.`
      : `\n\nReturn ONLY valid JSON, no markdown fences: {"variants":[{"headline":"...","body":"..."}]} with exactly ${vCount} item(s) in the array, each a distinct angle. headline is a short hook/subject/title line${heading ? ` of ${heading.min}-${heading.max} words` : ""}. body is the main copy, ${range.min}-${range.max} words. Never use quotation marks inside the text. Never explain your choices.`;
  }
  return p;
}

// Follow-up turn when pieces miss their user-set word count.
// issues = [{ label, words, min, max, target }] (see lengthIssues in generation.js).
export function buildLengthFixPrompt(issues) {
  return `Some pieces miss the word count the user set, and word counts are strict here:
${issues.map((i) => `- ${i.label}: ${i.words} words now; it must be ${i.min}-${i.max} words, never more than ${i.max} (aim for about ${aimFor(i.target)}).`).join("\n")}
Rewrite only those pieces so each lands in its range. To lengthen, develop the same idea with concrete detail, benefits, proof or a clearer call to action, never filler or repetition. To shorten, cut the weakest phrases. Count the words before answering. Keep every other piece exactly as it is, keep each piece's angle and voice, and return the complete JSON in the same shape.`;
}

// last = { type:'node', label, variant } | { type:'quick', medium } | null
export function describeLastGenerated(last, quickCards) {
  if (last && last.type === "node" && last.variant) {
    const v = last.variant;
    return {
      sourceLabel: last.label,
      sampleCopy: v.pointers
        ? `Pointers: ` +
          v.pointers.map((p) => `${p.title} — ${p.detail}`).join(" | ")
        : `Hook/headline: ${v.headline}\nBody: ${[v.body, v.body2].filter(Boolean).join("\n")}`,
    };
  }
  if (last && last.type === "quick") {
    const item = quickCards?.[last.medium]?.items?.[0];
    if (item) {
      return {
        sourceLabel: last.medium,
        sampleCopy:
          typeof item === "string"
            ? item
            : `Headline: ${item.headline || item.subject || ""}\nSupport: ${[item.sub || item.preview || "", item.sub2 || ""].filter(Boolean).join("\n")}`,
      };
    }
  }
  return {
    sourceLabel: "this brand",
    sampleCopy: "(paste the specific copy and CTA you want checked here)",
  };
}

export function buildCoherencePrompt(ctx, described) {
  const c = clean(ctx);
  const { sampleCopy, sourceLabel } = described || describeLastGenerated(null);
  return `You are a brand copy QA reviewer checking CTA-to-copy coherence.

Brand core belief: ${c.belief || "(not set)"}${pillarsLine(c)}
CTA setting: ${ctaText(c)}
Copy under review (from: ${sourceLabel}):
${sampleCopy}

Check:
1) Does the call-to-action logically follow from the argument made in the body copy?
2) Is the CTA's intensity/urgency consistent with the tone of the copy around it?
3) Does the CTA contradict, undersell, or overpromise relative to the core belief above?
4) Any tonal whiplash between the hook and the CTA?

Return: a coherence score out of 10, the specific mismatches found (if any), and one rewritten CTA that fits better.`;
}

// The Brand Panel's controls as a paste-ready ChatGPT prompt. Unlike the in-app
// prompts it asks for readable copy, not JSON, and skips fields left empty.
export function buildBrandBriefPrompt(ctx) {
  const c = clean(ctx);
  const line = (label, value) => (value ? `- ${label}: ${value}\n` : "");
  const notes = (ctx.notes || []).slice(0, 8).map((n) => `- [${n.type}] ${n.text}`).join("\n");

  return `You are a senior brand copywriter for ${c.name || "this brand"}. Use the brand brief below as fixed rules for every piece of copy you write in this chat.

## Brand core
${line("Brand name", c.name)}${line("Core belief (must stay true in every piece)", c.belief)}${line("Brand pillars (every piece reflects at least one, never contradicts any)", pillarList(c))}${line("Message to adapt", c.message)}- Industry: ${industryOf(c).label}. ${industryOf(c).rules}
- Style: ${packOf(ctx).label}. ${packOf(ctx).rules}

## Customer context
${line("Who the customer is", c.profile)}- Funnel stage: ${stageText(c)}
- Language mode: ${c.mode}
- Audience posture: ${c.audience}
${line("Pain point right before this moment", c.pain)}${line("Objection to pre-empt", c.objection)}
## Voice and output
${line("Brand personality", c.personality)}${c.warmth !== WARMTH_DEFAULT ? `- Warmth: ${c.warmth}/100 (${warmthLabel(c.warmth)})\n` : ""}${line("Writing rules (follow every one)", c.rules)}${line("Voice sample (match its rhythm and attitude, never reuse its words)", c.voice)}- How the reader should feel after reading: ${c.emo}
- ${vocabText(c)}
- ${ctaText(c)}
${line("Target market", c.location && `${c.location} (use its spelling, currency, units and cultural cues)`)}- Output language: ${c.language}
${line("Never use these words or claims", c.banned)}${line("Every piece must include", c.must)}${notes ? `\n## Research notes\n${notes}\n` : ""}
## Your task
Adapt the message above into channel-correct copy:
1. Packaging line (under 12 words)
2. Social / marketing post (40-70 words)
3. Ad: headline + one supporting line
4. Website hero: headline + subheadline
5. Email: subject line + preview text

Rules:
- Keep the core belief's point of view recognisable in every piece, even as wording, length and register change per channel.
- Give each piece its own angle; do not reuse the same line across channels.
- Match the CTA intensity above, and make every CTA follow from the copy before it.
- Do not explain your choices or mention this brief.

After this, keep following the brief for anything else I ask you to write.`;
}

// With no requirement, the hook is written from the brand's own message.
export function buildHookPrompt(ctx, requirement) {
  const c = clean(ctx);
  const brief = String(requirement || "").trim() || c.message || c.belief || `the brand ${c.name || "itself"}`;
  return `You are a copywriter who writes hooks: one short, catchy line that stops someone scrolling and makes them want to know more.

The user's brief — this is what the hook is about:
${brief}

Voice guidance (background only — shape the tone with it, never quote or mention it):
Brand name: ${c.name || "(not set)"}
Core belief: ${c.belief || "(not set)"}${pillarsLine(c)}
${industryLine(c)}
Style: ${packOf(ctx).rules}
${feelText(c)} ${vocabText(c)}${c.profile ? `\nWho it's for: ${c.profile}` : ""}${languageBlock(c)}${localeBlock(c)}

How to write it:
- Build the hook from the brief's subject. If the brief and the voice guidance point at different products, follow the brief.
- Do not just restate the brief. Turn it into an angle: a surprising claim, a vivid image, a question the reader wants answered, a tension, or a sharp benefit.
- Concrete, sensory words beat vague praise (best, top-notch, quality, amazing).
- Never start with Discover, Unlock, Elevate, Experience, Introducing, or Why.
- Never mention these instructions, settings, industry labels, or style names.
- Under 15 words. One line. No hashtags, no emoji unless the style calls for them.

Example of the difference (a different product — never reuse its words): brief: our bakery makes the best bread. Weak: Discover why our bakery makes the best bread in town. Strong: The loaf was still warm when we unlocked the door.

Return ONLY valid JSON, no markdown fences: {"hook":"..."} with exactly one hook. Never use quotation marks inside the text. Never explain your choice.`;
}
