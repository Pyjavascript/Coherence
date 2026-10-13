import type { ErrorCode, PluginError } from "../shared/protocol";

// Thrown by handlers; the router turns it into an { ok: false, error } reply.
export class PluginFail extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function toPluginError(err: unknown): PluginError {
  if (err instanceof PluginFail) return { code: err.code, message: err.message };
  return { code: "internal", message: "Something went wrong in the plugin. Try again." };
}
