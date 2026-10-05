import { useState, useEffect, useCallback } from "react";
import { DEFAULT_BRAND } from "../lib/constants";
import { isSupabaseConfigured } from "../lib/supabase";
import { LIMITS } from "../lib/clientId";
import {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../services/brands";
import {
  getResearchNotes,
  createResearchNote,
  deleteResearchNote,
} from "../services/research";

const untitled = (scope) =>
  scope === "global" ? "Untitled global brand" : "Untitled brand";

// Owns brand list, the active brand's form state, and its research notes.
export function useBrandWorkspace(setStatus) {
  const [brands, setBrands] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [scope, setScope] = useState("regular");
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const [notes, setNotes] = useState([]);
  const [fileLabel, setFileLabel] = useState("Untitled brand");

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return [];
    try {
      const list = await getBrands();
      setBrands(list);
      return list;
    } catch {
      setStatus("Couldn't load brands.", "err");
      return [];
    }
  }, [setStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setField = (key, value) => setBrand((b) => ({ ...b, [key]: value }));

  const fill = (d, nextScope, nextNotes) => {
    setBrand({ ...DEFAULT_BRAND, ...d, message: "" }); // prototype clears "Message to adapt" on select
    setNotes(nextNotes);
    setFileLabel(d.name || untitled(nextScope));
  };

  const newBrand = (nextScope) => {
    setScope(nextScope);
    setCurrentId(null);
    fill({}, nextScope, []);
    setStatus("");
  };

  const selectBrand = async (id) => {
    const b = brands.find((x) => x.id === id);
    if (!b) return;
    setCurrentId(id);
    setScope(b.scope || "regular");
    fill(b, b.scope, []);
    try {
      setNotes(await getResearchNotes(id));
    } catch {
      setStatus("Couldn't load research notes.", "err");
    }
  };

  const save = async () => {
    if (!brand.name.trim())
      return setStatus("Name the brand before saving.", "err");
    if (!isSupabaseConfigured)
      return setStatus("Saving isn't available in this view.", "err");
    if (!currentId && brands.length >= LIMITS.brands)
      return setStatus(
        `Brand limit reached (${LIMITS.brands} per browser).`,
        "err",
      );
    try {
      const payload = { ...brand, scope };
      const saved = currentId
        ? await updateBrand(currentId, payload)
        : await createBrand(payload);
      const pending = notes.filter((n) => n.local);
      for (const n of pending)
        await createResearchNote(saved.id, { type: n.type, text: n.text });
      setCurrentId(saved.id);
      await refresh();
      if (pending.length) setNotes(await getResearchNotes(saved.id));
      setFileLabel(saved.name);
      setStatus("Brand saved.", "ok");
    } catch {
      if (!currentId && brands.length >= LIMITS.brands)
        return setStatus(
          `Brand limit reached (${LIMITS.brands} per browser).`,
          "err",
        );
      setStatus("Couldn't save brand.", "err");
    }
  };

  const remove = async () => {
    if (!currentId || !isSupabaseConfigured) return;
    try {
      await deleteBrand(currentId);
      setCurrentId(null);
      await refresh();
      fill({}, scope, []);
      setStatus("Brand deleted.");
    } catch {
      setStatus("Couldn't delete brand.", "err");
    }
  };

  const addNote = async (type, text) => {
    if (!text.trim()) return;
    if (currentId) {
      try {
        const n = await createResearchNote(currentId, {
          type,
          text: text.trim(),
        });
        setNotes((list) => [...list, n]);
      } catch {
        setStatus("Couldn't add note.", "err");
      }
    } else {
      // Unsaved brand: keep locally (like the prototype); persisted on "Save brand".
      setNotes((list) => [
        ...list,
        {
          id: "local-" + Date.now().toString(36),
          type,
          text: text.trim(),
          local: true,
        },
      ]);
    }
  };

  const removeNote = async (id) => {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    if (!n.local) {
      try {
        await deleteResearchNote(id);
      } catch {
        return setStatus("Couldn't delete note.", "err");
      }
    }
    setNotes((list) => list.filter((x) => x.id !== id));
  };

  return {
    brands,
    currentId,
    scope,
    brand,
    notes,
    fileLabel,
    setField,
    newBrand,
    selectBrand,
    save,
    remove,
    addNote,
    removeNote,
  };
}
