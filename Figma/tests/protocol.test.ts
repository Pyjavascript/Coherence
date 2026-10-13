import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION, isResponseMessage, parseRequest } from "../src/shared/protocol";

const req = (type: string, payload: unknown, extra: Record<string, unknown> = {}) => ({
  v: PROTOCOL_VERSION,
  kind: "request",
  id: "abc123",
  type,
  payload,
  ...extra,
});

describe("parseRequest", () => {
  it("accepts well-formed requests", () => {
    expect(parseRequest(req("selection.get", {})).ok).toBe(true);
    expect(parseRequest(req("storage.get", { key: "blos-figma-auth" })).ok).toBe(true);
    expect(parseRequest(req("storage.set", { key: "blos-figma-auth-code-verifier", value: "x" })).ok).toBe(true);
    expect(parseRequest(req("storage.get", { key: "blos-figma-prefs" })).ok).toBe(true);
    expect(parseRequest(req("storage.get", { key: "blos-figma-plugin-key" })).ok).toBe(true);
    expect(parseRequest(req("ui.boot", {})).ok).toBe(true);
    expect(
      parseRequest(req("text.insert", { name: "V1", blocks: [{ role: "headline", text: "Hi" }] })).ok,
    ).toBe(true);
    expect(parseRequest(req("text.replace", { nodeId: "I12:34;56:78", expected: "", text: "New" })).ok).toBe(true);
    expect(parseRequest(req("ui.resize", { width: 440, height: 660 })).ok).toBe(true);
  });

  it("rejects non-requests and wrong versions without an id", () => {
    for (const raw of [null, "hi", [], { v: 2, kind: "request", id: "x", type: "selection.get", payload: {} }]) {
      const parsed = parseRequest(raw);
      expect(parsed.ok).toBe(false);
    }
    const parsed = parseRequest({ kind: "request", type: "selection.get", payload: {} });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.id).toBeNull();
  });

  it("rejects unknown types, including prototype keys", () => {
    for (const type of ["delete.everything", "__proto__", "constructor", "toString"]) {
      const parsed = parseRequest(req(type, {}));
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) {
        expect(parsed.id).toBe("abc123");
        expect(parsed.error.code).toBe("bad_request");
      }
    }
  });

  it("only allows the plugin's own storage keys", () => {
    for (const key of ["other-plugin", "blos-figma-auth/../x", "", "blos-figma-prefsX"]) {
      expect(parseRequest(req("storage.get", { key })).ok).toBe(false);
    }
  });

  it("rejects bad payloads", () => {
    expect(parseRequest(req("text.insert", { name: "x", blocks: [] })).ok).toBe(false);
    expect(parseRequest(req("text.insert", { name: "x", blocks: [{ role: "script", text: "a" }] })).ok).toBe(false);
    expect(parseRequest(req("text.insert", { name: "x", blocks: [{ role: "body", text: "" }] })).ok).toBe(false);
    expect(parseRequest(req("text.replace", { nodeId: "not-an-id", expected: "", text: "a" })).ok).toBe(false);
    expect(parseRequest(req("text.replace", { nodeId: "1:2", expected: "", text: "a", extra: 1 })).ok).toBe(false);
    expect(parseRequest(req("ui.resize", { width: 10, height: 660 })).ok).toBe(false);
    expect(parseRequest(req("external.open", { url: "javascript:alert(1)" })).ok).toBe(false);
    expect(parseRequest(req("external.open", { url: "http://example.com" })).ok).toBe(false);
    expect(parseRequest(req("external.open", { url: "http://localhost.evil.com/" })).ok).toBe(false);
    expect(parseRequest(req("selection.get", { sneaky: true })).ok).toBe(false);
  });

  it("allows https links, and http only for a local dev server", () => {
    expect(parseRequest(req("external.open", { url: "https://app.example.com/?open=profile" })).ok).toBe(true);
    expect(parseRequest(req("external.open", { url: "http://localhost:5173/?open=profile" })).ok).toBe(true);
    expect(parseRequest(req("external.open", { url: "http://127.0.0.1:5173" })).ok).toBe(true);
  });
});

describe("isResponseMessage", () => {
  it("validates response shape and error codes", () => {
    expect(isResponseMessage({ v: 1, kind: "response", id: "a", ok: true, data: null })).toBe(true);
    expect(
      isResponseMessage({ v: 1, kind: "response", id: "a", ok: false, error: { code: "locked", message: "m" } }),
    ).toBe(true);
    expect(
      isResponseMessage({ v: 1, kind: "response", id: "a", ok: false, error: { code: "pwned", message: "m" } }),
    ).toBe(false);
    expect(isResponseMessage({ v: 1, kind: "response", ok: true, data: 1 })).toBe(false);
  });
});
