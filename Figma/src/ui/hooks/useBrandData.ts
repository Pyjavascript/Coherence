import { useCallback, useEffect, useRef, useState } from "react";
import { createBrand, getBrands, updateBrand } from "@web/services/brands.js";
import { createResearchNote, deleteResearchNote, getResearchNotes } from "@web/services/research.js";
import { DEFAULT_BRAND } from "@web/lib/constants.js";
import { LIMITS } from "@web/lib/clientId.js";

// The Edge Function's message (e.g. the brand limit) beats a generic fallback.
const messageOf = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export type Brand = Awaited<ReturnType<typeof getBrands>>[number];
export interface Note {
  id: string;
  type: string;
  text: string;
}

// The plugin key's brands and the selected brand's research notes, via the web app's services.
export function useBrandData(userId: string | null, brandId: string | null) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const mine = ++seq.current;
    if (!userId) {
      setBrands([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const list = await getBrands(userId);
      if (mine === seq.current) setBrands(list);
    } catch (err) {
      if (mine === seq.current) setError(messageOf(err, "Couldn't load brands."));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // A slow response for a previously selected brand must not replace the notes
  // of the brand that's selected now.
  const notesFor = useRef<string | null>(null);
  useEffect(() => {
    notesFor.current = brandId;
    setNotes([]);
    if (!brandId) return;
    getResearchNotes(brandId)
      .then((list: Note[]) => notesFor.current === brandId && setNotes(list))
      .catch(() => notesFor.current === brandId && setError("Couldn't load research notes."));
  }, [brandId]);

  const addNote = useCallback(
    async (type: string, text: string) => {
      if (!brandId || !text.trim()) return false;
      try {
        const note: Note = await createResearchNote(brandId, { type, text: text.trim() });
        if (notesFor.current === brandId) setNotes((list) => [...list, note]);
        return true;
      } catch (err) {
        setError(messageOf(err, "Couldn't add the note."));
        return false;
      }
    },
    [brandId],
  );

  const removeNote = useCallback(async (id: string) => {
    try {
      await deleteResearchNote(id);
      setNotes((list) => list.filter((n) => n.id !== id));
    } catch {
      setError("Couldn't delete the note.");
    }
  }, []);

  const saveBrand = useCallback(
    async (draft: { id?: string; name: string; belief: string; message: string; industry: string }) => {
      if (!userId) return null;
      const name = draft.name.trim();
      if (!name) {
        setError("Give the brand a name.");
        return null;
      }
      try {
        if (draft.id) {
          const current = brands.find((b) => b.id === draft.id);
          const saved = await updateBrand(draft.id, {
            ...(current || DEFAULT_BRAND),
            name,
            belief: draft.belief,
            message: draft.message,
            industry: draft.industry,
          });
          setBrands((list) => list.map((b) => (b.id === saved.id ? saved : b)));
          return saved.id as string;
        }
        if (brands.length >= LIMITS.brands) {
          setError(`Free plan includes ${LIMITS.brands} brands.`);
          return null;
        }
        const saved = await createBrand({
          ...DEFAULT_BRAND,
          name,
          belief: draft.belief,
          message: draft.message,
          industry: draft.industry,
          userId,
        });
        setBrands((list) => [...list, saved]);
        return saved.id as string;
      } catch (err) {
        setError(messageOf(err, "Couldn't save the brand."));
        return null;
      }
    },
    [brands, userId],
  );

  const brand = brands.find((b) => b.id === brandId) ?? null;
  return { brands, brand, notes, loading, error, setError, refresh, addNote, removeNote, saveBrand };
}
