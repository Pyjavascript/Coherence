import { useCallback, useState } from "react";
import host from "../host";
import { BridgeError } from "../bridge";
import type { SelectedText, TextBlock } from "../../shared/protocol";

type SetStatus = (text: string, tone?: "ok" | "err") => void;

// Insert / replace / copy, with one document write in flight at a time and
// readable messages for every failure the main thread reports.
export function useCanvas(setStatus: SetStatus, refreshSelection: () => void) {
  const [busy, setBusy] = useState(false);

  const fail = useCallback(
    (err: unknown, fallback: string) => {
      const message = err instanceof BridgeError ? err.message : fallback;
      setStatus(message, "err");
      if (err instanceof BridgeError && (err.code === "text_changed" || err.code === "not_found")) refreshSelection();
    },
    [setStatus, refreshSelection],
  );

  const insert = useCallback(
    async (name: string, blocks: TextBlock[]) => {
      if (busy || !blocks.length) return;
      setBusy(true);
      try {
        await host.insertText(name, blocks);
        setStatus("Added to the canvas. Ctrl/Cmd+Z undoes it.", "ok");
      } catch (err) {
        fail(err, "Couldn't add the text to the canvas.");
      } finally {
        setBusy(false);
      }
    },
    [busy, setStatus, fail],
  );

  // One layer per item, in order; each lands beside the one before it.
  const insertAll = useCallback(
    async (items: { name: string; blocks: TextBlock[] }[]) => {
      const list = items.filter((item) => item.blocks.length);
      if (busy || !list.length) return;
      setBusy(true);
      let added = 0;
      try {
        for (const item of list) {
          await host.insertText(item.name, item.blocks);
          added++;
        }
        setStatus(`Added ${added} ${added === 1 ? "copy" : "copies"} to the canvas.`, "ok");
      } catch (err) {
        fail(err, added ? `Added ${added} of ${list.length}, then couldn't add the rest.` : "Couldn't add the text to the canvas.");
      } finally {
        setBusy(false);
      }
    },
    [busy, setStatus, fail],
  );

  const replace = useCallback(
    async (target: SelectedText, text: string) => {
      if (busy || !text.trim()) return;
      setBusy(true);
      try {
        await host.replaceText(target.id, target.characters, text);
        setStatus(`Replaced the text in “${target.name}”. Ctrl/Cmd+Z undoes it.`, "ok");
      } catch (err) {
        fail(err, "Couldn't replace the text.");
      } finally {
        setBusy(false);
      }
    },
    [busy, setStatus, fail],
  );

  const copy = useCallback(
    async (text: string, done = "Copied.") => {
      try {
        await host.copyText(text);
        setStatus(done, "ok");
      } catch {
        setStatus("Couldn't copy. Select the text and copy it manually.", "err");
      }
    },
    [setStatus],
  );

  return { busy, insert, insertAll, replace, copy };
}
