// The only messages the plugin UI (iframe) and main thread exchange.
//
//   UI -> main   { v, kind: "request", id, type, payload }
//   main -> UI   { v, kind: "response", id, ok, data | error }
//                { v, kind: "event", event, payload }
//
// Every incoming message is validated on both sides; anything that doesn't
// match is dropped (requests with a usable id get a bad_request reply).
// Session tokens cross this boundary only in storage.* payloads for the
// allow-listed auth keys, and are never logged.

export const PROTOCOL_VERSION = 1;

export const LIMITS = {
  id: 64,
  key: 64,
  name: 200,
  text: 20000,
  blocks: 30,
  message: 300,
  url: 2048,
  storageValue: 100_000,
  selectionTexts: 50,
  selectionChars: 4000,
  minWidth: 360,
  maxWidth: 900,
  minHeight: 420,
  maxHeight: 1100,
} as const;

// Keys the UI may read/write in figma.clientStorage: the Supabase session
// (supabase-js appends suffixes such as -code-verifier) and UI preferences.
export const STORAGE_KEY_PATTERN = /^blos-figma-(?:auth(?:-[a-z-]{1,30})?|prefs|plugin-key)$/;

export type TextRole = "headline" | "subhead" | "body";
export interface TextBlock {
  role: TextRole;
  text: string;
  // Body only: the first `boldPrefix` characters are set in bold (e.g. "CTA Logic:").
  boldPrefix?: number;
}

export interface SelectedText {
  id: string;
  name: string;
  characters: string; // capped at LIMITS.selectionChars
  truncated: boolean;
  direct: boolean; // selected itself, not found inside a selected frame/group
  locked: boolean;
  hasMissingFont: boolean;
}

export interface SelectionInfo {
  total: number; // nodes in the selection
  texts: SelectedText[];
  moreTexts: boolean; // more text layers than LIMITS.selectionTexts
  // Set only when exactly one TEXT layer is selected and it can be edited.
  replaceTargetId: string | null;
}

export interface RequestMap {
  "storage.get": { req: { key: string }; res: { value: string | null } };
  "storage.set": { req: { key: string; value: string }; res: null };
  "storage.remove": { req: { key: string }; res: null };
  "selection.get": { req: Record<string, never>; res: SelectionInfo };
  "text.insert": { req: { name: string; blocks: TextBlock[] }; res: { nodeId: string } };
  "text.replace": { req: { nodeId: string; expected: string; text: string }; res: { nodeId: string } };
  "ui.resize": { req: { width: number; height: number }; res: null };
  "ui.notify": { req: { message: string; error?: boolean }; res: null };
  "external.open": { req: { url: string }; res: null };
  "ui.boot": { req: Record<string, never>; res: { command: "open-workspace" | "set-api-key" } };
}
export type RequestType = keyof RequestMap;
export type RequestPayload<T extends RequestType> = RequestMap[T]["req"];
export type ResponseData<T extends RequestType> = RequestMap[T]["res"];

export type ErrorCode =
  | "bad_request"
  | "not_found"
  | "not_text"
  | "locked"
  | "missing_font"
  | "text_changed"
  | "forbidden"
  | "write_failed"
  | "timeout"
  | "internal";

export interface PluginError {
  code: ErrorCode;
  message: string;
}

export interface RequestMessage<T extends RequestType = RequestType> {
  v: typeof PROTOCOL_VERSION;
  kind: "request";
  id: string;
  type: T;
  payload: RequestPayload<T>;
}

export type ResponseMessage =
  | { v: typeof PROTOCOL_VERSION; kind: "response"; id: string; ok: true; data: unknown }
  | { v: typeof PROTOCOL_VERSION; kind: "response"; id: string; ok: false; error: PluginError };

export interface EventMessage {
  v: typeof PROTOCOL_VERSION;
  kind: "event";
  event: "selection.changed";
  payload: SelectionInfo;
}

/* ---------------- validation ---------------- */

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null && !Array.isArray(x);
const isStr = (x: unknown, max: number, min = 0): x is string =>
  typeof x === "string" && x.length >= min && x.length <= max;
const isInt = (x: unknown, min: number, max: number): x is number =>
  typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;
const onlyKeys = (o: Obj, allowed: string[]) => Object.keys(o).every((k) => allowed.includes(k));

// Figma node ids look like "12:34", or "I12:34;56:78" inside instances.
const NODE_ID = /^I?\d+:\d+(?:;\d+:\d+)*$/;

const PAYLOAD_VALIDATORS: { [T in RequestType]: (p: Obj) => boolean } = {
  "storage.get": (p) => onlyKeys(p, ["key"]) && isStr(p.key, LIMITS.key) && STORAGE_KEY_PATTERN.test(p.key),
  "storage.set": (p) =>
    onlyKeys(p, ["key", "value"]) &&
    isStr(p.key, LIMITS.key) &&
    STORAGE_KEY_PATTERN.test(p.key) &&
    isStr(p.value, LIMITS.storageValue),
  "storage.remove": (p) => onlyKeys(p, ["key"]) && isStr(p.key, LIMITS.key) && STORAGE_KEY_PATTERN.test(p.key),
  "selection.get": (p) => Object.keys(p).length === 0,
  "text.insert": (p) =>
    onlyKeys(p, ["name", "blocks"]) &&
    isStr(p.name, LIMITS.name) &&
    Array.isArray(p.blocks) &&
    p.blocks.length >= 1 &&
    p.blocks.length <= LIMITS.blocks &&
    p.blocks.every(
      (b) =>
        isObj(b) &&
        onlyKeys(b, ["role", "text", "boldPrefix"]) &&
        (b.role === "headline" || b.role === "subhead" || b.role === "body") &&
        isStr(b.text, LIMITS.text, 1) &&
        (b.boldPrefix === undefined || (b.role === "body" && isInt(b.boldPrefix, 1, (b.text as string).length))),
    ),
  "text.replace": (p) =>
    onlyKeys(p, ["nodeId", "expected", "text"]) &&
    isStr(p.nodeId, LIMITS.id) &&
    NODE_ID.test(p.nodeId) &&
    isStr(p.expected, LIMITS.text) &&
    isStr(p.text, LIMITS.text, 1),
  "ui.resize": (p) =>
    onlyKeys(p, ["width", "height"]) &&
    isInt(p.width, LIMITS.minWidth, LIMITS.maxWidth) &&
    isInt(p.height, LIMITS.minHeight, LIMITS.maxHeight),
  "ui.notify": (p) =>
    onlyKeys(p, ["message", "error"]) &&
    isStr(p.message, LIMITS.message, 1) &&
    (p.error === undefined || typeof p.error === "boolean"),
  // https, or http on a local dev server. The main thread also checks the URL is the web app's.
  "external.open": (p) =>
    onlyKeys(p, ["url"]) && isStr(p.url, LIMITS.url) &&
    /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|\?|$))/.test(p.url),
  "ui.boot": (p) => Object.keys(p).length === 0,
};

export type ParsedRequest =
  | { ok: true; message: RequestMessage }
  | { ok: false; id: string | null; error: PluginError };

export function parseRequest(raw: unknown): ParsedRequest {
  const id = isObj(raw) && isStr(raw.id, LIMITS.id, 1) ? raw.id : null;
  const bad = (message: string): ParsedRequest => ({ ok: false, id, error: { code: "bad_request", message } });
  if (!isObj(raw) || raw.v !== PROTOCOL_VERSION || raw.kind !== "request") return bad("Unknown message.");
  if (!id) return bad("Missing request id.");
  if (typeof raw.type !== "string" || !Object.prototype.hasOwnProperty.call(PAYLOAD_VALIDATORS, raw.type)) {
    return bad("Unknown request type.");
  }
  const type = raw.type as RequestType;
  if (!isObj(raw.payload) || !PAYLOAD_VALIDATORS[type](raw.payload)) return bad(`Invalid payload for ${type}.`);
  return { ok: true, message: { v: PROTOCOL_VERSION, kind: "request", id, type, payload: raw.payload as never } };
}

const ERROR_CODES: ErrorCode[] = [
  "bad_request", "not_found", "not_text", "locked", "missing_font",
  "text_changed", "forbidden", "write_failed", "timeout", "internal",
];

export function isResponseMessage(raw: unknown): raw is ResponseMessage {
  if (!isObj(raw) || raw.v !== PROTOCOL_VERSION || raw.kind !== "response" || !isStr(raw.id, LIMITS.id, 1)) return false;
  if (raw.ok === true) return "data" in raw;
  return (
    raw.ok === false &&
    isObj(raw.error) &&
    ERROR_CODES.includes(raw.error.code as ErrorCode) &&
    typeof raw.error.message === "string"
  );
}

export function isEventMessage(raw: unknown): raw is EventMessage {
  return (
    isObj(raw) &&
    raw.v === PROTOCOL_VERSION &&
    raw.kind === "event" &&
    raw.event === "selection.changed" &&
    isObj(raw.payload) &&
    Array.isArray(raw.payload.texts)
  );
}
