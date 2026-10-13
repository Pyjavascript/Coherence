// UI side of the plugin message protocol (see shared/protocol.ts): typed
// requests with ids and timeouts, plus selection events from the main thread.
import {
  PROTOCOL_VERSION,
  isEventMessage,
  isResponseMessage,
  type ErrorCode,
  type RequestPayload,
  type RequestType,
  type ResponseData,
  type SelectionInfo,
} from "../shared/protocol";

export class BridgeError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

interface Pending {
  resolve: (data: unknown) => void;
  reject: (err: BridgeError) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<string, Pending>();
const selectionListeners = new Set<(s: SelectionInfo) => void>();

// crypto.getRandomValues works in Figma's null-origin iframe; randomUUID may not.
function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

window.addEventListener("message", (event: MessageEvent) => {
  const msg = (event.data as { pluginMessage?: unknown } | null)?.pluginMessage;
  if (isResponseMessage(msg)) {
    const entry = pending.get(msg.id);
    if (!entry) return; // unknown or already timed out
    pending.delete(msg.id);
    clearTimeout(entry.timer);
    if (msg.ok) entry.resolve(msg.data);
    else entry.reject(new BridgeError(msg.error.code, msg.error.message));
  } else if (isEventMessage(msg)) {
    selectionListeners.forEach((fn) => fn(msg.payload));
  }
});

export function request<T extends RequestType>(
  type: T,
  payload: RequestPayload<T>,
  timeoutMs = 15000,
): Promise<ResponseData<T>> {
  const id = newId();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new BridgeError("timeout", "Figma didn't respond in time. Try again."));
    }, timeoutMs);
    pending.set(id, { resolve: resolve as (d: unknown) => void, reject, timer });
    parent.postMessage({ pluginMessage: { v: PROTOCOL_VERSION, kind: "request", id, type, payload } }, "*");
  });
}

export function onSelectionChange(fn: (s: SelectionInfo) => void): () => void {
  selectionListeners.add(fn);
  return () => selectionListeners.delete(fn);
}
