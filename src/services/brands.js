import { requireSupabase } from "../lib/supabase";

const COLS =
  "id,name,logo,scope,belief,industry,stage,mode,audience,pain,emo,formality,objection,cta,banned,must_include";

function fromRow(r) {
  return {
    id: r.id,
    name: r.name,
    logo: r.logo || "",
    scope: r.scope,
    belief: r.belief || "",
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
  };
}

function toRow(b) {
  const t = (s) => (s || "").trim();
  return {
    name: t(b.name),
    logo: b.logo || "",
    scope: b.scope || "regular",
    belief: t(b.belief),
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
  };
}

export async function getBrands() {
  const { data, error } = await requireSupabase()
    .from("brands")
    .select(COLS)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(fromRow);
}

export async function getBrand(id) {
  const { data, error } = await requireSupabase()
    .from("brands")
    .select(COLS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function createBrand(brand) {
  const { data, error } = await requireSupabase()
    .from("brands")
    .insert(toRow(brand))
    .select(COLS)
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateBrand(id, brand) {
  const { data, error } = await requireSupabase()
    .from("brands")
    .update(toRow(brand))
    .eq("id", id)
    .select(COLS)
    .single();
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
