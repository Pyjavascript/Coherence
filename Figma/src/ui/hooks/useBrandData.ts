import { useCallback, useEffect, useRef, useState } from "react";
import { getBrands } from "@web/services/brands.js";
import { createResearchNote, deleteResearchNote, getResearchNotes } from "@web/services/research.js";

export type Brand = Awaited<ReturnType<typeof getBrands>>[number];
export interface Note {
  id: string;
  type: string;
  text: string;
}

// The signed-in user's brands (read-only here; brands are edited in the web
// app) and the selected brand's research notes, via the web app's services.
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
    } catch {
      if (mine === seq.current) setError("Couldn't load brands.");
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
      } catch {
        setError("Couldn't add the note.");
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

  const brand = brands.find((b) => b.id === brandId) ?? null;
  return { brands, brand, notes, loading, error, setError, refresh, addNote, removeNote };
}
