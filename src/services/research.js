import { requireSupabase } from "../lib/supabase";
import { callFunction, usesPluginKey } from "./ai";

// With a plugin key (Figma), notes go through the generate Edge Function: the
// plugin has no Supabase session, so row-level security would hide them.

const fromRow = (r) => ({ id: r.id, type: r.type, text: r.text });

export async function getResearchNotes(brandId) {
  if (usesPluginKey()) {
    const { notes } = await callFunction("notes.list", { brandId });
    return (notes || []).map(fromRow);
  }
  const { data, error } = await requireSupabase()
    .from("research_notes").select("id,type,text").eq("brand_id", brandId).order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(fromRow);
}

export async function createResearchNote(brandId, { type, text }) {
  if (usesPluginKey()) {
    const { note } = await callFunction("notes.create", { brandId, note: { type, text } });
    return fromRow(note);
  }
  const { data, error } = await requireSupabase()
    .from("research_notes").insert({ brand_id: brandId, type, text }).select("id,type,text").single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateResearchNote(id, { type, text }) {
  const { data, error } = await requireSupabase()
    .from("research_notes").update({ type, text }).eq("id", id).select("id,type,text").single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteResearchNote(id) {
  if (usesPluginKey()) {
    await callFunction("notes.delete", { id });
    return;
  }
  const { error } = await requireSupabase().from("research_notes").delete().eq("id", id);
  if (error) throw error;
}
