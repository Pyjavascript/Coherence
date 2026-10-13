// Figma host: the same shape as src/hosts/browser.js (copyText / openExternal),
// plus the canvas helpers the plugin needs. Everything that touches the
// document goes through the main thread.
import { request } from "./bridge";
import type { TextBlock } from "../shared/protocol";

// The async Clipboard API is blocked inside Figma's plugin iframe, so use the
// textarea + execCommand path first.
async function copyText(text: string): Promise<void> {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(ta);
  if (copied) return;
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error("copy failed");
}

function openExternal(url: string) {
  return request("external.open", { url });
}

function notify(message: string, error = false) {
  return request("ui.notify", { message: message.slice(0, 300), error });
}

const host = {
  name: "figma",
  copyText,
  openExternal,
  notify,
  getSelection: () => request("selection.get", {}),
  insertText: (name: string, blocks: TextBlock[]) => request("text.insert", { name, blocks }, 30000),
  replaceText: (nodeId: string, expected: string, text: string) =>
    request("text.replace", { nodeId, expected, text }, 30000),
  resize: (width: number, height: number) => request("ui.resize", { width, height }),
};

export default host;
