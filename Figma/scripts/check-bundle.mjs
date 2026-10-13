// Fails the build if anything that looks like a privileged credential ended up
// in dist/. The public anon key is allowed; any other JWT, an OpenAI key or a
// Supabase secret key is not.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { FIGMA_DIR } from "./env.mjs";

const JWT = /eyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/g;
const FORBIDDEN = [
  { name: "OpenAI key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  { name: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]+/ },
  { name: "OPENAI_API_KEY reference", pattern: /OPENAI_API_KEY/ },
  { name: "SUPABASE_SERVICE_ROLE_KEY reference", pattern: /SUPABASE_SERVICE_ROLE_KEY/ },
];

function jwtRole(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8")).role;
  } catch {
    return undefined;
  }
}

export function checkBundle(dir = path.join(FIGMA_DIR, "dist")) {
  const problems = [];
  for (const file of fs.readdirSync(dir)) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    for (const { name, pattern } of FORBIDDEN) if (pattern.test(text)) problems.push(`${file}: ${name}`);
    for (const token of text.match(JWT) || []) {
      const role = jwtRole(token);
      if (role !== "anon") problems.push(`${file}: JWT with role "${role ?? "unknown"}"`);
    }
  }
  if (problems.length) {
    throw new Error("Bundle check failed — privileged credentials must never ship in the plugin:\n  " + problems.join("\n  "));
  }
  console.log("Bundle check passed: no privileged credentials in dist/.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) checkBundle();
