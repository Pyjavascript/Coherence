import { requireSupabase } from "../lib/supabase";
import { callFunction, usesPluginKey } from "./ai";
import { MAX_PILLARS, MAX_PILLAR_CHARS, PERSONALITIES, WARMTH_DEFAULT } from "../lib/constants";

// The Figma plugin has no Supabase session, so row-level security would hide
// the user's brands. With a plugin key, brand reads and writes go through the
// generate Edge Function, which scopes them to the key's user.

const BASE_COLS =
  "id,name,logo,scope,belief,message,industry,stage,mode,audience,pain,emo,formality,objection,cta,banned,must_include";
// Added by later migrations: location / language (20261012), pillars
// (20261116) and the Language tab's fields (20261117). Until one has run on a
// database, brands load and save without those columns (they fall back to
// their defaults).
const OPTIONAL_COLS = {
  locale: { cols: ["location", "language"], migration: "20261012000000_brand_location_language.sql" },
  pillars: { cols: ["pillars"], migration: "20261116000000_brand_pillars.sql" },
  voice: { cols: ["personality", "writing_rules", "voice_sample", "warmth"], migration: "20261117000000_brand_language.sql" },
};
const missingGroups = new Set();
// False once a save or load found that group's columns missing (its
// migration hasn't run), so those fields were left out.
export const canSaveGroup = (group) => !missingGroups.has(group);
const cols = () => [
  BASE_COLS,
  ...Object.entries(OPTIONAL_COLS).filter(([g]) => !missingGroups.has(g)).flatMap(([, o]) => o.cols),
].join(",");

// Postgres "undefined column" (select) or PostgREST "column not in schema
// cache" (insert/update): the optional column group it names, if any.
const missingGroup = (error) => {
  if (error?.code !== "42703" && error?.code !== "PGRST204") return null;
  const message = error.message || "";
  return Object.keys(OPTIONAL_COLS).find((g) => !missingGroups.has(g) && OPTIONAL_COLS[g].cols.some((c) => message.includes(c))) || null;
};

// Runs a query built from the current columns; while a column group is
// missing, remembers that and runs it again without it.
async function withCols(run) {
  let result = await run(cols());
  for (let group = missingGroup(result.error); group; group = missingGroup(result.error)) {
    missingGroups.add(group);
    console.warn(`brands.${OPTIONAL_COLS[group].cols.join(" / brands.")} missing: run supabase/migrations/${OPTIONAL_COLS[group].migration}`);
    result = await run(cols());
  }
  return result;
}

const rowFor = (b) => {
  const row = toRow(b);
  missingGroups.forEach((g) => OPTIONAL_COLS[g].cols.forEach((c) => delete row[c]));
  return row;
};

// Saved pillars: trimmed, no empty ones, at most MAX_PILLARS.
const cleanPillars = (list) =>
  (Array.isArray(list) ? list : [])
    .map((p) => (typeof p === "string" ? p.trim().slice(0, MAX_PILLAR_CHARS) : ""))
    .filter(Boolean)
    .slice(0, MAX_PILLARS);

function fromRow(r) {
  return {
    id: r.id,
    name: r.name,
    logo: r.logo || "",
    scope: r.scope,
    belief: r.belief || "",
    pillars: cleanPillars(r.pillars),
    message: r.message || "",
    industry: r.industry,
    stage: r.stage,
    mode: r.mode,
    audience: r.audience,
    pain: r.pain || "",
    emo: r.emo,
    formality: r.formality,
    objection: r.objection || "",
    cta: r.cta,
    banned: r.banned || "",
    must: r.must_include || "",
    location: r.location || "",
    language: r.language || "English",
    personality: PERSONALITIES.includes(r.personality) ? r.personality : "",
    rules: r.writing_rules || "",
    voice: r.voice_sample || "",
    warmth: Number.isFinite(r.warmth) ? r.warmth : WARMTH_DEFAULT,
  };
}

function toRow(b) {
  const t = (s) => (s || "").trim();
  const row = {
    name: t(b.name),
    logo: b.logo || "",
    scope: b.scope || "regular",
    belief: t(b.belief),
    pillars: cleanPillars(b.pillars),
    message: t(b.message),
    industry: b.industry,
    stage: t(b.stage),
    mode: t(b.mode),
    audience: t(b.audience),
    pain: t(b.pain),
    emo: t(b.emo),
    formality: t(b.formality),
    objection: t(b.objection),
    cta: t(b.cta),
    banned: t(b.banned),
    must_include: t(b.must),
    location: t(b.location),
    language: t(b.language) || "English",
    personality: PERSONALITIES.includes(b.personality) ? b.personality : "",
    writing_rules: t(b.rules),
    voice_sample: t(b.voice),
    warmth: Number.isFinite(Number(b.warmth)) ? Math.min(100, Math.max(0, Math.round(Number(b.warmth)))) : WARMTH_DEFAULT,
  };
  // user_id is left unset: the column default (auth.uid()) applies in the web
  // app, and the Edge Function sets it from the plugin key in Figma.
  return row;
}

// Only the signed-in user's brands, even if a table policy is still open.
export async function getBrands(userId) {
  if (usesPluginKey()) {
    const { brands } = await callFunction("brands.list");
    return (brands || []).map(fromRow);
  }
  const { data, error } = await withCols((c) => requireSupabase()
    .from("brands")
    .select(c)
    .eq("user_id", userId)
    .order("created_at", { ascending: true }));
  if (error) throw error;
  return data.map(fromRow);
}

export async function getBrand(id) {
  const { data, error } = await withCols((c) => requireSupabase()
    .from("brands")
    .select(c)
    .eq("id", id)
    .single());
  if (error) throw error;
  return fromRow(data);
}

export async function createBrand(brand) {
  if (usesPluginKey()) {
    const { brand: saved } = await callFunction("brands.create", { brand: toRow(brand) });
    return fromRow(saved);
  }
  const { data, error } = await withCols((c) => requireSupabase()
    .from("brands")
    .insert(rowFor(brand))
    .select(c)
    .single());
  if (error) throw error;
  return fromRow(data);
}

export async function updateBrand(id, brand) {
  if (usesPluginKey()) {
    const { brand: saved } = await callFunction("brands.update", { id, brand: toRow(brand) });
    return fromRow(saved);
  }
  const { data, error } = await withCols((c) => requireSupabase()
    .from("brands")
    .update(rowFor(brand))
    .eq("id", id)
    .select(c)
    .single());
  if (error) throw error;
  return fromRow(data);
}

export async function deleteBrand(id) {
  const { error } = await requireSupabase()
    .from("brands")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Most recent generations for a brand, newest first.
export async function getGenerations(brandId, limit = 40) {
  const { data, error } = await requireSupabase()
    .from("generations")
    .select("id,medium,input_context,output,created_at")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// The signed-in user's charged AI calls since `since` (Date), oldest first.
// The generate Edge Function writes one usage_events row per credit, with
// kind = the generation type ("quick-grid", "regenerate", "node", "hook", ...)
// and source = where it was spent ("web" or "figma").
export async function getUsageActivity(userId, since) {
  const query = (columns) => requireSupabase()
    .from("usage_events")
    .select(columns)
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true })
    .limit(2000);
  let { data, error } = await query("kind,source,created_at");
  // Before the usage_events.source migration runs, every credit reads as web.
  if (error && /source/i.test(error.message || "")) ({ data, error } = await query("kind,created_at"));
  if (error) throw error;
  return data || [];
}

// History for a brand that isn't saved yet: kept in memory (newest last) and
// written to the database with the brand on its first save. Discarded when
// another brand is opened or a new one started.
const MAX_PENDING = 40;
let pending = [];
let pendingSeq = 0;

// Newest first, the same shape as getGenerations() rows.
export const getPendingGenerations = () => [...pending].reverse();

export function clearPendingGenerations() {
  pending = [];
}

// Writes the unsaved brand's history to the brand it was just saved as.
export async function flushPendingGenerations(brandId) {
  const list = pending;
  pending = [];
  for (const g of list) {
    await saveGeneration({ brandId, medium: g.medium, inputContext: g.input_context, output: g.output });
  }
}

// Best-effort history of what was generated for a brand.
export async function saveGeneration({
  brandId,
  medium,
  inputContext,
  output,
}) {
  if (!brandId) {
    pending.push({
      id: `pending-${++pendingSeq}`,
      medium,
      input_context: inputContext ?? null,
      output: output ?? null,
      created_at: new Date().toISOString(),
    });
    pending = pending.slice(-MAX_PENDING);
    return;
  }
  try {
    if (usesPluginKey()) {
      await callFunction("generations.save", { brandId, medium, inputContext, output });
      return;
    }
    await requireSupabase()
      .from("generations")
      .insert({
        brand_id: brandId,
        medium,
        input_context: inputContext,
        output,
      });
  } catch {
    /* history is optional; never block the UI */
  }
}
