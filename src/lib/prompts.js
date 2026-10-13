import {
  STYLE_PACKS,
  INDUSTRY_LAYERS,
  SPECS,
  NODE_CATS,
  WEBSITE_COMPONENTS,
  GRID_WEBSITE_COMPONENTS,
} from "./constants";
import { cardLimits } from "./copyItems";

// ctx = { brand, notes, stylePack }
const t = (s) => (s || "").trim();

function clean(ctx) {
  const b = ctx.brand || {};
  return {
    name: t(b.name),
    belief: t(b.belief),
    message: t(b.message),
    industry: b.industry,
    stage: b.stage,
    mode: b.mode,
    audience: b.audience,
    pain: t(b.pain),
    emo: b.emo,
    formality: b.formality,
    objection: t(b.objection),
    cta: b.cta,
    banned: t(b.banned),
    must: t(b.must),
    location: t(b.location),
    language: t(b.language) || "English",
  };
}

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
  extra += `\nDesired emotional response: ${c.emo}. Formality: ${c.formality}. CTA intensity: ${c.cta}.`;
  if (c.objection) extra += `\nObjection to pre-empt: ${c.objection}`;
  if (c.banned) extra += `\nNever use these words/claims: ${c.banned}`;
  if (c.must) extra += `\nTry to naturally include: ${c.must}`;
  extra += localeBlock(c);
  extra += researchBlock(ctx.notes);
  return extra;
}

export function buildBasePrompt(ctx) {
  const c = clean(ctx);
  return `You are a brand language engine that adapts one constant message into channel-correct copy while preserving the brand's core belief.
Brand: ${c.name || "the brand"}
Core belief (must stay true across every output): ${c.belief}
Message to adapt: ${c.message}
Customer context: funnel stage = ${c.stage}, language mode = ${c.mode}, audience posture = ${c.audience}.${sharedExtras(ctx, c)}
Never explain your choices. Never use quotation marks in the output text. Keep the core belief's point of view recognisable in every version, even though wording, length and register change per channel.`;
}

// The website card's component, unless it's the default hero.
const gridComponent = (medium, s) =>
  medium === "website" && s?.component && s.component !== "hero" ? s.component : null;

// The medium's format + length constraint: the default SPECS line, or one built
// from the card's component and/or user-set word total.
function lengthSpec(medium, s = {}) {
  const comp = gridComponent(medium, s);
  if (!s.words && !comp) return SPECS[medium];
  const limits = cardLimits(medium, s);
  if (!limits) return SPECS[medium];
  const parts = Object.values(limits).map((l) => `${l.label.toLowerCase()} of about ${l.words} words`);
  let spec = parts.join(" plus ");
  if (comp) {
    const pointers = comp === "pointers" ? ` (exactly ${s.pointerCount || 3} pointers)` : "";
    spec = `a "${WEBSITE_COMPONENTS[comp].label}" website component${pointers}: ${GRID_WEBSITE_COMPONENTS[comp].guide}; ${spec}`;
  }
  if (s.words) spec += ` (user-set length: about ${s.words} words in total, stay within 15%; this overrides any default length)`;
  return spec;
}

// The card's job requirement and specific requirements, if any.
function cardBrief(s = {}) {
  const lines = [];
  if (t(s.brief)) lines.push(`job requirement: ${t(s.brief)}`);
  if (t(s.requirements)) lines.push(`specific requirements: ${t(s.requirements)}`);
  return lines.join("; ");
}

const GRID_MEDIA = ["packaging", "marketing", "advertising", "website", "email"];

// medium = undefined -> all five mediums; medium = "email" etc. -> regenerate one.
// settings = { [medium]: { words, brief, requirements, component, pointerCount } }
// per-card settings; missing mediums / fields use the defaults.
export function buildQuickGridPrompt(ctx, n, medium, settings = {}) {
  const base = buildBasePrompt(ctx);
  if (!medium) {
    const briefs = GRID_MEDIA.map((m) => [m, cardBrief(settings[m])]).filter(([, b]) => b);
    return `${base}
Generate exactly ${n} distinct variant(s) per medium — different angles, not synonyms of each other.
Return ONLY valid JSON, no markdown fences, arrays of length ${n} for every field:
{"packaging":["..."],"marketing":["..."],"advertising":[{"headline":"...","sub":"..."}],"website":[{"headline":"...","sub":"..."}],"email":[{"subject":"...","preview":"..."}]}
Constraints — ${GRID_MEDIA.map((m) => `${m}: ${lengthSpec(m, settings[m])}`).join(". ")}.${briefs.length
      ? `\nPer-medium instructions (follow them for that medium only):\n${briefs.map(([m, b]) => `- ${m}: ${b}`).join("\n")}`
      : ""}`;
  }
  const itemShape =
    medium === "packaging" || medium === "marketing"
      ? '"..."'
      : medium === "email"
        ? '{"subject":"...","preview":"..."}'
        : '{"headline":"...","sub":"..."}';
  return `${base}
Generate exactly ${n} distinct variant(s) for the ${medium} medium only — different angles, not synonyms.
Return ONLY this JSON, no markdown fences: {"${medium}":[${itemShape}]}  (array length ${n})
Constraint: ${lengthSpec(medium, settings[medium])}.${cardBrief(settings[medium]) ? `\nInstructions for this ${medium} copy — ${cardBrief(settings[medium])}.` : ""}`;
}

// node = full node object; linkedNodes = [{label, variant}] (connected nodes that already have output)
// source = {label, category, variant|null}: the node this one was just linked from, to adapt
export function buildNodePrompt(ctx, node, vCount, linkedNodes = [], source = null) {
  const c = clean(ctx);
  const cat = NODE_CATS[node.category];
  let p = `You are a brand language engine generating one specific content node inside a larger node-based content system. Keep this piece coherent with the brand's constant while doing its own specific job.
Brand: ${c.name || "the brand"}
Core belief (constant): ${c.belief}
Brand message reference: ${c.message || "(none supplied — infer from the belief)"}
${industryLine(c)}
Style pack — ${packOf(ctx).label}: ${packOf(ctx).rules}
Customer context: funnel stage = ${c.stage}, language mode = ${c.mode}, audience posture = ${c.audience}.`;
  if (c.pain) p += `\nCustomer pain point: ${c.pain}`;
  p += `\nDesired emotional response: ${c.emo}. Formality: ${c.formality}. CTA intensity: ${c.cta}.`;
  if (c.objection) p += `\nObjection to pre-empt: ${c.objection}`;
  if (c.banned) p += `\nNever use these words/claims: ${c.banned}`;
  if (c.must) p += `\nTry to naturally include: ${c.must}`;
  p += localeBlock(c);
  p += researchBlock(ctx.notes);
  p += `\n\nThis node: ${node.label} (category: ${cat.label}${node.platform ? ", platform: " + node.platform : ""}).
Job requirement for this specific piece: ${t(node.brief) || "(use the brand message as the job)"}
Target length: about ${node.words || 60} words for the body copy (soft target, stay within 20%).`;
  if (t(node.requirements))
    p += `\nSpecific requirements for this node: ${t(node.requirements)}`;

  if (linkedNodes.length) {
    p +=
      `\n\nThis piece must stay correlated and coherent with these connected pieces already written:\n` +
      linkedNodes
        .map(({ label, variant: v }) =>
          v.pointers
            ? `- [${label}] (pointers) ${v.pointers.map((x) => x.title).join("; ")}`
            : `- [${label}] ${v.headline} — ${v.body}`,
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
          : `Headline: ${v.headline}\nBody: ${v.body}`);
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
    p += `\n\nReturn ONLY valid JSON, no markdown fences: {"variants":[{"headline":"...","body":"..."}]} with exactly ${vCount} item(s) in the array, each a distinct angle. headline is a short hook/subject/title line. body is the main copy at the target word count. Never use quotation marks inside the text. Never explain your choices.`;
  }
  return p;
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
        : `Hook/headline: ${v.headline}\nBody: ${v.body}`,
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
            : `Headline: ${item.headline || item.subject || ""}\nSupport: ${item.sub || item.preview || ""}`,
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

Brand core belief: ${c.belief || "(not set)"}
CTA intensity setting: ${c.cta}
Copy under review (from: ${sourceLabel}):
${sampleCopy}

Check:
1) Does the call-to-action logically follow from the argument made in the body copy?
2) Is the CTA's intensity/urgency consistent with the tone of the copy around it?
3) Does the CTA contradict, undersell, or overpromise relative to the core belief above?
4) Any tonal whiplash between the hook and the CTA?

Return: a coherence score out of 10, the specific mismatches found (if any), and one rewritten CTA that fits better.`;
}

export function buildHookPrompt(ctx, requirement) {
  const c = clean(ctx);
  return `You are a copywriter who writes hooks: one short, catchy line that stops someone scrolling and makes them want to know more.

The user's brief — this is what the hook is about:
${requirement}

Voice guidance (background only — shape the tone with it, never quote or mention it):
Brand name: ${c.name || "(not set)"}
Core belief: ${c.belief || "(not set)"}
${industryLine(c)}
Style: ${packOf(ctx).rules}
Desired emotional response: ${c.emo}. Formality: ${c.formality}.${localeBlock(c)}

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
