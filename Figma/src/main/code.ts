// Plugin main thread: opens the UI and answers its requests. No network calls
// happen here; the UI talks to Supabase. This side only touches the Figma
// document and figma.clientStorage.
import {
  PROTOCOL_VERSION,
  parseRequest,
  type EventMessage,
  type PluginError,
  type RequestMessage,
  type RequestType,
  type ResponseMessage,
} from "../shared/protocol";
import { PluginFail, toPluginError } from "./errors";
import { readSelection } from "./selection";
import { insertText, replaceText } from "./text";
import { getItem, removeItem, setItem } from "./storage";

declare const __BLOS_WEB_URL__: string;

figma.showUI(__html__, { width: 440, height: 660, themeColors: true, title: "Brand Language OS" });

function send(message: ResponseMessage | EventMessage) {
  figma.ui.postMessage(message);
}
const ok = (id: string, data: unknown) => send({ v: PROTOCOL_VERSION, kind: "response", id, ok: true, data });
const fail = (id: string, error: PluginError) => send({ v: PROTOCOL_VERSION, kind: "response", id, ok: false, error });

// "Open full app" may only open the configured web app.
function openWebApp(url: string): null {
  const base = __BLOS_WEB_URL__;
  if (!base || !(url === base || url.startsWith(base + "/") || url.startsWith(base + "?"))) {
    throw new PluginFail("forbidden", "That link isn't allowed.");
  }
  figma.openExternal(url);
  return null;
}

async function handle(msg: RequestMessage): Promise<unknown> {
  const p = msg.payload as never as Record<string, any>;
  switch (msg.type as RequestType) {
    case "storage.get":
      return getItem(p.key);
    case "storage.set":
      return setItem(p.key, p.value);
    case "storage.remove":
      return removeItem(p.key);
    case "selection.get":
      return readSelection();
    case "text.insert":
      return insertText(p.name, p.blocks);
    case "text.replace":
      return replaceText(p.nodeId, p.expected, p.text);
    case "ui.resize":
      figma.ui.resize(p.width, p.height);
      return null;
    case "ui.notify":
      figma.notify(p.message, { error: Boolean(p.error), timeout: 3000 });
      return null;
    case "external.open":
      return openWebApp(p.url);
  }
}

// Document writes run one at a time, in the order they were requested.
const WRITES = new Set<RequestType>(["text.insert", "text.replace"]);
let writeQueue: Promise<unknown> = Promise.resolve();

figma.ui.onmessage = async (raw: unknown) => {
  const parsed = parseRequest(raw);
  if (!parsed.ok) {
    if (parsed.id) fail(parsed.id, parsed.error);
    else console.warn("[Brand Language OS] Dropped an invalid message from the UI.");
    return;
  }
  const msg = parsed.message;
  const run = () => handle(msg);
  const task = WRITES.has(msg.type) ? (writeQueue = writeQueue.catch(() => undefined).then(run)) : run();
  try {
    ok(msg.id, await task);
  } catch (err) {
    if (!(err instanceof PluginFail)) console.error("[Brand Language OS]", msg.type, err);
    fail(msg.id, toPluginError(err));
  }
};

// Selection updates for the UI, debounced so dragging a marquee doesn't flood it.
let selectionTimer: ReturnType<typeof setTimeout> | undefined;
function pushSelection() {
  if (selectionTimer !== undefined) clearTimeout(selectionTimer);
  selectionTimer = setTimeout(() => {
    selectionTimer = undefined;
    send({ v: PROTOCOL_VERSION, kind: "event", event: "selection.changed", payload: readSelection() });
  }, 120);
}
figma.on("selectionchange", pushSelection);
figma.on("currentpagechange", pushSelection);
figma.on("close", () => {
  if (selectionTimer !== undefined) clearTimeout(selectionTimer);
});
