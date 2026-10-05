import {
  STYLE_PACKS,
  INDUSTRY_LAYERS,
  SPECS,
  NODE_CATS,
  WEBSITE_COMPONENTS,
} from "./constants";

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
  };
}
const industryOf = (c) =>
  INDUSTRY_LAYERS[c.industry] || INDUSTRY_LAYERS.general;
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
  let extra = `\nIndustry — Pixels Intelligence Layer (${industryOf(c).label}): ${industryOf(c).rules}`;
  extra += `\nStyle pack — ${packOf(ctx).label}: ${packOf(ctx).rules}`;
  if (c.pain) extra += `\nCustomer pain point: ${c.pain}`;
  extra += `\nDesired emotional response: ${c.emo}. Formality: ${c.formality}. CTA intensity: ${c.cta}.`;
  if (c.objection) extra += `\nObjection to pre-empt: ${c.objection}`;
  if (c.banned) extra += `\nNever use these words/claims: ${c.banned}`;
  if (c.must) extra += `\nTry to naturally include: ${c.must}`;
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

// medium = undefined -> all five mediums; medium = "email" etc. -> regenerate one.
export function buildQuickGridPrompt(ctx, n, medium) {
  const base = buildBasePrompt(ctx);
  if (!medium) {
    return `${base}
Generate exactly ${n} distinct variant(s) per medium — different angles, not synonyms of each other.
Return ONLY valid JSON, no markdown fences, arrays of length ${n} for every field:
{"packaging":["..."],"marketing":["..."],"advertising":[{"headline":"...","sub":"..."}],"website":[{"headline":"...","sub":"..."}],"email":[{"subject":"...","preview":"..."}]}
Constraints — packaging: ${SPECS.packaging}. marketing: ${SPECS.marketing}. advertising: ${SPECS.advertising}. website: ${SPECS.website}. email: ${SPECS.email}.`;
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
Constraint: ${SPECS[medium]}.`;
}

// node = full node object; linkedNodes = [{label, variant}] (connected nodes that already have output)
export function buildNodePrompt(ctx, node, vCount, linkedNodes = []) {
  const c = clean(ctx);
  const cat = NODE_CATS[node.category];
  let p = `You are a brand language engine generating one specific content node inside a larger node-based content system. Keep this piece coherent with the brand's constant while doing its own specific job.
Brand: ${c.name || "the brand"}
Core belief (constant): ${c.belief}
Brand message reference: ${c.message || "(none supplied — infer from the belief)"}
Industry — Pixels Intelligence Layer (${industryOf(c).label}): ${industryOf(c).rules}
Style pack — ${packOf(ctx).label}: ${packOf(ctx).rules}
Customer context: funnel stage = ${c.stage}, language mode = ${c.mode}, audience posture = ${c.audience}.`;
  if (c.pain) p += `\nCustomer pain point: ${c.pain}`;
  p += `\nDesired emotional response: ${c.emo}. Formality: ${c.formality}. CTA intensity: ${c.cta}.`;
  if (c.objection) p += `\nObjection to pre-empt: ${c.objection}`;
  if (c.banned) p += `\nNever use these words/claims: ${c.banned}`;
  if (c.must) p += `\nTry to naturally include: ${c.must}`;
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
  return `You are a hook specialist. Analyse the brief below against the brand and hand back exactly ONE decisive hook line — not a list of options.
Brand: ${c.name || "the brand"}
Core belief: ${c.belief || "(not set)"}
Industry — Pixels Intelligence Layer (${industryOf(c).label}): ${industryOf(c).rules}
Style pack — ${packOf(ctx).label}: ${packOf(ctx).rules}
Desired emotional response: ${c.emo}. Formality: ${c.formality}.
Brief: ${requirement}

Return ONLY valid JSON, no markdown fences: {"hook":"..."}. The hook must be under 18 words, need no further editing, and commit to one angle rather than hedging between several. Never use quotation marks inside the text. Never explain your choice.`;
}
