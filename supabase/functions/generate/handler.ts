// The generate Edge Function's source. Deploy the bundled index.ts next to
// it, built with `npm run build:function` (see scripts/build-function.mjs).
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildGeneration, buildLengthFixPrompt, modelFor, RequestError } from "../_shared/generation.js";
import { findBanned } from "../_shared/banned.js";

const MAX_GENERATIONS = 40; // keep in sync with LIMITS.generations in src/lib/clientId.js
const FREE_HOOKS_PER_DAY = 1; // keep in sync with src/lib/hookQuota.js

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_TYPES = new Set(["quick-grid", "regenerate", "node", "hook", "coherence", "ping"]);
const PLUGIN_KEY_PATTERN = /^coh_[\w-]{8,200}$/;
// Safety net on top of the per-field caps in _shared/generation.js.
const MAX_PROMPT_CHARS = 30000;
const API_KEY_PATTERN = /^sk-[\w\-]{20,300}$/;
// Longest answer each type may produce. 16k covers 40 Node copies on every model.
const MAX_TOKENS: Record<string, number> = {
  "quick-grid": 4000,
  regenerate: 2000,
  node: 16000,
  hook: 300,
  coherence: 1500,
};

const reply = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200, 
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
const fail = (error: string, code = "generation") => reply({ success: false, error, code });

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// plugin_keys is created in Supabase. The raw key is shown once, so the row
// may store a sha256 hex hash (key_hash / token_hash) or, less ideally, the
// key itself (api_key / key). The first column that exists and matches wins.
async function userIdForPluginKey(admin: ReturnType<typeof createClient>, raw: string): Promise<string | null> {
  const hash = await sha256Hex(raw);
  const attempts: [string, string][] = [
    ["key_hash", hash],
    ["token_hash", hash],
    ["api_key", raw],
    ["key", raw],
  ];
  for (const [column, value] of attempts) {
    const { data, error } = await admin.from("plugin_keys").select("user_id").eq(column, value).limit(1);
    if (error) {
      const missing = error.code === "42703" || error.code === "PGRST204" || (error.message || "").includes(column);
      if (missing) continue;
      console.error("plugin_keys lookup failed:", error.message);
      return null;
    }
    const row = data?.[0] as { user_id?: string } | undefined;
    if (row?.user_id) return row.user_id;
  }
  return null;
}

// ==========================================
// BRAND DATA FOR THE FIGMA PLUGIN
// ==========================================
// The plugin has a plugin key, not a Supabase session, so row-level security
// hides the user's rows from it. These requests run with the service role and
// every query is scoped to the user the key belongs to.
const DATA_TYPES = new Set([
  "brands.list", "brands.create", "brands.update",
  "notes.list", "notes.create", "notes.delete",
  "generations.save",
]);
const MAX_BRANDS = 2; // keep in sync with LIMITS.brands in src/lib/clientId.js
const BRAND_COLS = [
  "name", "logo", "scope", "belief", "message", "industry", "stage", "mode", "audience",
  "pain", "emo", "formality", "objection", "cta", "banned", "must_include", "location", "language",
];
// Added by the 20261012 migration; written only if the database has them.
const LOCALE_COLS = ["location", "language"];

type Admin = ReturnType<typeof createClient>;
type DbResult = { data: any; error: any };

// Only known text columns, so a request can never set user_id or id.
function brandRow(input: unknown, withLocale = true): Record<string, string> {
  const src = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const row: Record<string, string> = {};
  for (const col of BRAND_COLS) {
    if (!withLocale && LOCALE_COLS.includes(col)) continue;
    if (typeof src[col] === "string") row[col] = src[col] as string;
  }
  return row;
}

const isMissingLocaleCol = (error: any) =>
  (error?.code === "42703" || error?.code === "PGRST204") &&
  LOCALE_COLS.some((c) => (error.message || "").includes(c));

async function writeBrand(input: unknown, run: (row: Record<string, string>) => PromiseLike<DbResult>) {
  const result = await run(brandRow(input));
  return isMissingLocaleCol(result.error) ? run(brandRow(input, false)) : result;
}

async function ownsBrand(admin: Admin, userId: string, brandId: unknown): Promise<boolean> {
  if (typeof brandId !== "string" || !brandId) return false;
  const { data, error } = await admin.from("brands").select("id").eq("id", brandId).eq("user_id", userId).limit(1);
  if (error) console.error("brand ownership check failed:", error.message);
  return Boolean(data?.length);
}

async function handleData(admin: Admin, userId: string, type: string, body: any): Promise<Response> {
  const ok = (data: unknown) => reply({ success: true, data });
  const dbFail = (what: string, error: any) => {
    console.error(`${type} failed:`, error?.message);
    return fail(`Couldn't ${what}. Try again.`, "upstream");
  };
  const notFound = () => fail("That brand wasn't found.", "not_found");

  switch (type) {
    case "brands.list": {
      const { data, error } = await admin.from("brands").select("*").eq("user_id", userId).order("created_at", { ascending: true });
      return error ? dbFail("load brands", error) : ok({ brands: data ?? [] });
    }
    case "brands.create": {
      if (!String(body.brand?.name ?? "").trim()) return fail("Give the brand a name.", "bad_request");
      const { count, error: countError } = await admin
        .from("brands").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if (countError) return dbFail("save the brand", countError);
      if ((count ?? 0) >= MAX_BRANDS) return fail(`Free plan includes ${MAX_BRANDS} brands.`, "brand_limit");
      const { data, error } = await writeBrand(body.brand, (row) =>
        admin.from("brands").insert({ ...row, user_id: userId }).select("*").single());
      return error ? dbFail("save the brand", error) : ok({ brand: data });
    }
    case "brands.update": {
      if (!(await ownsBrand(admin, userId, body.id))) return notFound();
      const { data, error } = await writeBrand(body.brand, (row) =>
        admin.from("brands").update(row).eq("id", body.id).eq("user_id", userId).select("*").single());
      return error ? dbFail("save the brand", error) : ok({ brand: data });
    }
    case "notes.list": {
      if (!(await ownsBrand(admin, userId, body.brandId))) return notFound();
      const { data, error } = await admin
        .from("research_notes").select("id,type,text").eq("brand_id", body.brandId).order("created_at", { ascending: true });
      return error ? dbFail("load research notes", error) : ok({ notes: data ?? [] });
    }
    case "notes.create": {
      if (!(await ownsBrand(admin, userId, body.brandId))) return notFound();
      const noteType = typeof body.note?.type === "string" ? body.note.type : "";
      const text = typeof body.note?.text === "string" ? body.note.text.trim() : "";
      if (!noteType || !text) return fail("A note needs a type and text.", "bad_request");
      const { data, error } = await admin
        .from("research_notes").insert({ brand_id: body.brandId, type: noteType, text }).select("id,type,text").single();
      return error ? dbFail("add the note", error) : ok({ note: data });
    }
    case "notes.delete": {
      if (typeof body.id !== "string" || !body.id) return fail("Missing note id.", "bad_request");
      const { data: note, error: noteError } = await admin.from("research_notes").select("brand_id").eq("id", body.id).maybeSingle();
      if (noteError) return dbFail("delete the note", noteError);
      if (!note || !(await ownsBrand(admin, userId, note.brand_id))) return fail("That note wasn't found.", "not_found");
      const { error } = await admin.from("research_notes").delete().eq("id", body.id);
      return error ? dbFail("delete the note", error) : ok({});
    }
    case "generations.save": {
      if (!(await ownsBrand(admin, userId, body.brandId))) return notFound();
      if (typeof body.medium !== "string" || !body.medium) return fail("Missing medium.", "bad_request");
      const { error } = await admin.from("generations").insert({
        brand_id: body.brandId,
        medium: body.medium,
        input_context: body.inputContext ?? null,
        output: body.output ?? null,
        user_id: userId,
      });
      return error ? dbFail("save the generation", error) : ok({});
    }
  }
  return fail("Unknown generation type.", "bad_request");
}

function parseJson(text: string): unknown {
  const stripped = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(stripped.slice(start, end + 1));
    throw new Error("unparseable");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed.", "bad_request");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Request body must be JSON.", "bad_request");
  }

  body = body && typeof body === "object" ? body : {};
  const { type, tier } = body;
  const isData = DATA_TYPES.has(type);
  if (!ALLOWED_TYPES.has(type) && !isData) return fail("Unknown generation type.", "bad_request");

  // The prompt is built here from brand fields and settings; a prompt sent by
  // the client is never used.
  type LengthIssue = { label: string; words: number; min: number; max: number; target: number };
  let generation: {
    prompt: string; credits: number; ctx: any; lengthIssues?: (data: unknown) => LengthIssue[];
  } | null = null;
  if (type !== "ping" && !isData) {
    try {
      generation = buildGeneration(type, body);
    } catch (e) {
      if (e instanceof RequestError) return fail(e.message, "bad_request");
      console.error("buildGeneration threw:", String(e));
      return fail("Couldn't prepare that request.", "bad_request");
    }
    if (generation!.prompt.length > MAX_PROMPT_CHARS) return fail("This request is too long. Shorten the brand fields or notes.", "bad_request");
  }

  // Only the app's three models: a model name sent by the client is ignored.
  // To force everyone onto the cheap model: const model = modelFor("fast");
  const model = modelFor(tier);

  // A key the user entered in the app takes priority over the server's own key.
  let userKey: string | null = null;
  if (typeof body.apiKey === "string" && body.apiKey.trim()) {
    userKey = body.apiKey.trim();
    if (!API_KEY_PATTERN.test(userKey!)) return fail("That doesn't look like a valid OpenAI API key.", "config");
  }
  const apiKey = userKey ?? Deno.env.get("OPENAI_API_KEY")?.split(/\r?\n/)[0].trim().replace(/^["']|["']$/g, "");
  if (!apiKey) return fail("The server is missing its OpenAI key.", "config");

  // ==========================================
  // AUTHENTICATION & USAGE LIMIT LOGIC
  // ==========================================
  // A Figma plugin key stands in for a user session. The web app still sends
  // the signed-in user's JWT when no plugin key is present.
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const pluginApiKey = typeof body.pluginApiKey === "string" ? body.pluginApiKey.trim() : "";
  let userId: string;
  if (pluginApiKey) {
    if (!PLUGIN_KEY_PATTERN.test(pluginApiKey)) return fail("That plugin key isn't valid.", "unauthorized");
    const fromKey = await userIdForPluginKey(admin, pluginApiKey);
    if (!fromKey) return fail("That plugin key isn't valid.", "unauthorized");
    userId = fromKey;
  } else {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return fail("Missing Authorization header. Please log in.", "unauthorized");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return fail("Invalid or expired login token.", "unauthorized");
    userId = user.id;
  }

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  // Plugin startup check: who the key belongs to, and today's free-tier usage.
  // Not a generation, so it does not spend a credit.
  if (type === "ping") {
    const [gens, hooks, brands] = await Promise.all([
      admin.from("usage_events").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", dayStart.toISOString()),
      admin.from("usage_events").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "hook").gte("created_at", dayStart.toISOString()),
      admin.from("brands").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    if (gens.error || hooks.error || brands.error) return fail("Couldn't check your usage. Try again.", "upstream");
    return reply({
      success: true,
      data: {
        userId,
        generations: gens.count ?? 0,
        hooks: hooks.count ?? 0,
        brands: brands.count ?? 0,
      },
    });
  }
  // Brand data reads and writes. Not a generation, so no credit is spent.
  if (isData) return handleData(admin, userId, type, body);
  // ==========================================

  const { prompt, credits, ctx, lengthIssues } = generation!;

  // Reserve the credits first (one usage_events row each, written under a
  // per-user lock, so parallel requests can't overshoot the daily limit).
  // Free hooks come out of the same credit day, so they reset with the credits.
  // The reservation is handed back below if the call doesn't produce an answer.
  const { data: reserved, error: reserveError } = await admin.rpc("reserve_credits", {
    p_user: userId,
    p_kind: type,
    p_source: pluginApiKey ? "figma" : "web",
    p_count: credits,
    p_daily_max: MAX_GENERATIONS,
    p_hook_max: FREE_HOOKS_PER_DAY,
  });
  if (reserveError) {
    console.error("reserve_credits failed:", reserveError.message);
    return fail("Couldn't check your usage. Try again.", "upstream");
  }
  if (!reserved?.ok) {
    if (reserved?.code === "hook_limit") return fail(`Free hook limit reached: ${FREE_HOOKS_PER_DAY} per day.`, "hook_limit");
    const left = Math.max(0, MAX_GENERATIONS - (reserved?.used ?? MAX_GENERATIONS));
    if (left > 0) {
      return fail(`This needs ${credits} credits and you have ${left} left today.`, "not_enough_credits");
    }
    return fail(`Daily limit reached: ${MAX_GENERATIONS} generations per day.`, "limit_reached");
  }
  const reservedIds: string[] = reserved.ids ?? [];
  const refund = async () => {
    const { error } = await admin.from("usage_events").delete().in("id", reservedIds);
    if (error) console.error("credit refund failed:", error.message);
  };
  const failAndRefund = async (error: string, code: string) => {
    await refund();
    return fail(error, code);
  };
  // ==========================================

  const wantsJson = type !== "coherence";
  const system = wantsJson
    ? "You are a brand language engine. Respond with a single valid JSON object and nothing else."
    : "You are a precise brand copy QA reviewer.";

  // One chat completion. Returns the answer text, or an error Response.
  const complete = async (messages: { role: string; content: string }[]): Promise<string | Response> => {
    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: MAX_TOKENS[type] ?? 2000,
          ...(wantsJson ? { response_format: { type: "json_object" } } : {}),
        }),
      });
    } catch (e) {
      console.error("OpenAI fetch threw:", String(e));
      return fail("Couldn't reach OpenAI. Try again.", "upstream");
    }
    if (!res.ok) {
      console.error("OpenAI error", res.status, (await res.text()).slice(0, 500));
      if (res.status === 429) return fail("Rate limited — try again shortly.", "rate_limited");
      if (res.status === 401) {
        return fail(userKey ? "OpenAI rejected your API key." : "The OpenAI key on the server was rejected.", "config");
      }
      if (res.status === 404) return fail(`Model "${model}" isn't available for this key.`, "config");
      return fail("OpenAI returned an error. Try again.", "upstream");
    }
    const completion = await res.json();
    const choice = completion?.choices?.[0];
    if (choice?.finish_reason === "length") return fail("The answer was too long and got cut off. Ask for fewer copies or words.", "malformed");
    const content: string = choice?.message?.content ?? "";
    if (!content) return fail("OpenAI returned an empty response.", "malformed");
    return content;
  };

  const messages = [
    { role: "system", content: system },
    { role: "user", content: prompt },
  ];
  const content = await complete(messages);
  if (content instanceof Response) {
    await refund();
    return content;
  }

  if (!wantsJson) return reply({ success: true, data: { text: content.trim() } });

  const parse = (text: string): Record<string, unknown> | null => {
    try {
      const data = parseJson(text);
      return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  let data = parse(content);
  if (!data) return failAndRefund("The AI returned malformed JSON. Try again.", "malformed");

  // Models tend to write short, so copy that misses its user-set word count
  // gets up to two rewrites (no extra credit). A rewrite is kept only if it has
  // the same shape and lands closer to the targets overall; otherwise the best
  // answer so far stands.
  if (lengthIssues) {
    const miss = (issues: LengthIssue[]) =>
      issues.reduce((sum, i) => sum + (i.words < i.min ? i.min - i.words : i.words - i.max), 0);
    const sameShape = (next: Record<string, unknown>) =>
      Object.entries(data!).every(([key, value]) =>
        !Array.isArray(value) || (Array.isArray(next[key]) && (next[key] as unknown[]).length === value.length));
    let issues = lengthIssues(data);
    for (let round = 0; issues.length && round < 2; round++) {
      const retry = await complete([
        ...messages,
        { role: "assistant", content: JSON.stringify(data) },
        { role: "user", content: buildLengthFixPrompt(issues) },
      ]);
      const rewritten = typeof retry === "string" ? parse(retry) : null;
      if (!rewritten || !sameShape(rewritten)) break;
      const next = lengthIssues(rewritten);
      if (miss(next) >= miss(issues)) break;
      data = rewritten;
      issues = next;
    }
  }

  // Copy that uses a banned word or claim gets one rewrite (no extra credit).
  // If the rewrite fails or is no better, the first answer stands and the app
  // flags the words it still contains.
  const banned = findBanned(data, ctx.brand.banned);
  if (banned.length) {
    const retry = await complete([
      ...messages,
      { role: "assistant", content: JSON.stringify(data) },
      {
        role: "user",
        content: `Your answer uses these banned words or claims: ${banned.join(", ")}. Rewrite every piece that uses one so it no longer does, in any form. Keep everything else the same and return the same JSON shape.`,
      },
    ]);
    const rewritten = typeof retry === "string" ? parse(retry) : null;
    if (
      rewritten &&
      Object.keys(data).every((key) => key in rewritten) &&
      findBanned(rewritten, ctx.brand.banned).length < banned.length
    ) data = rewritten;
  }

  return reply({ success: true, data });
});