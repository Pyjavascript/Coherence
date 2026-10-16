import { requireSupabase } from "../lib/supabase";
import { callFunction, usesPluginKey } from "./ai";

// The Figma plugin has no Supabase session, so row-level security would hide
// the user's brands. With a plugin key, brand reads and writes go through the
// generate Edge Function, which scopes them to the key's user.

const BASE_COLS =
  "id,name,logo,scope,belief,message,industry,stage,mode,audience,pain,emo,formality,objection,cta,banned,must_include";
// Added by the 20261012 migration. Until it has run on a database, brands load
// and save without them (location / language fall back to their defaults).
const LOCALE_COLS = ["location", "language"];
let hasLocaleCols = true;
const cols = () => (hasLocaleCols ? `${BASE_COLS},${LOCALE_COLS.join(",")}` : BASE_COLS);

// Postgres "undefined column" (select) or PostgREST "column not in schema cache" (insert/update).
const isMissingLocaleCol = (error) =>
  hasLocaleCols &&
  (error?.code === "42703" || error?.code === "PGRST204") &&
  LOCALE_COLS.some((c) => (error.message || "").includes(c));

// Runs a query built from the current columns; if the locale columns are
// missing, remembers that and runs it once more without them.
async function withCols(run) {
  const result = await run(cols());
  if (!isMissingLocaleCol(result.error)) return result;
  hasLocaleCols = false;
  console.warn("brands.location / brands.language are missing: run supabase/migrations/20261012000000_brand_location_language.sql");
  return run(cols());
}

const rowFor = (b) => {
  const row = toRow(b);
  if (!hasLocaleCols) LOCALE_COLS.forEach((c) => delete row[c]);
  return row;
};

function fromRow(r) {
  return {
    id: r.id,
    name: r.name,
    logo: r.logo || "",
    scope: r.scope,
    belief: r.belief || "",
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
  };
}

function toRow(b) {
  const t = (s) => (s || "").trim();
  const row = {
    name: t(b.name),
    logo: b.logo || "",
    scope: b.scope || "regular",
    belief: t(b.belief),
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
