import { useCallback, useEffect, useState } from "react";
import host from "../host";
import { onSelectionChange } from "../bridge";
import type { SelectionInfo } from "../../shared/protocol";

const EMPTY: SelectionInfo = { total: 0, texts: [], moreTexts: false, replaceTargetId: null };

// The current Figma selection's text layers, kept live by selectionchange events.
export function useSelection() {
  const [selection, setSelection] = useState<SelectionInfo>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      setSelection(await host.getSelection());
    } catch {
      setSelection(EMPTY);
    }
  }, []);

  useEffect(() => {
    refresh();
    return onSelectionChange(setSelection);
  }, [refresh]);

  const replaceTarget = selection.replaceTargetId
    ? selection.texts.find((t) => t.id === selection.replaceTargetId) ?? null
    : null;
  const text = selection.texts.map((t) => t.characters).filter(Boolean).join("\n\n");

  return { selection, replaceTarget, text, refresh };
}
