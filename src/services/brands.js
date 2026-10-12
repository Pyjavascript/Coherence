import { requireSupabase } from "../lib/supabase";

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
  return {
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
}

// Only the signed-in user's brands, even if a table policy is still open.
export async function getBrands(userId) {
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
  const { data, error } = await withCols((c) => requireSupabase()
    .from("brands")
    .insert(rowFor(brand))
    .select(c)
    .single());
  if (error) throw error;
  return fromRow(data);
}

export async function updateBrand(id, brand) {
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
// kind = the generation type ("quick-grid", "regenerate", "node", "hook", ...).
export async function getUsageActivity(userId, since) {
  const { data, error } = await requireSupabase()
    .from("usage_events")
    .select("kind,created_at")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true })
    .limit(2000);
  if (error) throw error;
  return data || [];
}

// Best-effort history of what was generated for a saved brand.
export async function saveGeneration({
  brandId,
  medium,
  inputContext,
  output,
}) {
  if (!brandId) return;
  try {
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
