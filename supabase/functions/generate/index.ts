import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_GENERATIONS = 40; 

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_TYPES = new Set(["quick-grid", "regenerate", "node", "hook", "coherence"]);
const MODEL_PATTERN = /^(gpt|o\d|chatgpt)[\w.\-]*$/i;
const FALLBACK_MODELS: Record<string, string> = {
  fast: "gpt-4o-mini",
  balanced: "gpt-4o",
  quality: "gpt-4.1",
};
const MAX_PROMPT_CHARS = 20000;
const API_KEY_PATTERN = /^sk-[\w\-]{20,300}$/;

const reply = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200, 
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
const fail = (error: string, code = "generation") => reply({ success: false, error, code });

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

  const { type, prompt, tier } = body ?? {};
  if (!ALLOWED_TYPES.has(type)) return fail("Unknown generation type.", "bad_request");
  if (typeof prompt !== "string" || !prompt.trim()) return fail("Missing prompt.", "bad_request");
  if (prompt.length > MAX_PROMPT_CHARS) return fail("Prompt is too long.", "bad_request");

  const requested = typeof body.model === "string" && MODEL_PATTERN.test(body.model) ? body.model : null;
  
  // NOTE: If you want to force free users to always use the cheap model, uncomment this line:
  // const model = "gpt-4o-mini";
  const model = requested ?? FALLBACK_MODELS[tier as string] ?? FALLBACK_MODELS.balanced;

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
  
  // 1. Get the Auth token sent by the React frontend
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail("Missing Authorization header. Please log in.", "unauthorized");

  // 2. Validate the user token
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return fail("Invalid or expired login token.", "unauthorized");
  const userId = user.id;

  // 3. Admin client to bypass RLS and count today's credits (UTC day, as in usage_day_start())
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count: usedToday, error: usageError } = await admin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", dayStart.toISOString());
  if (usageError) {
    console.error("usage_events count failed:", usageError.message);
    return fail("Couldn't check your usage. Try again.", "upstream");
  }
  if ((usedToday ?? 0) >= MAX_GENERATIONS) {
    return fail(`Daily limit reached: ${MAX_GENERATIONS} generations per day.`, "limit_reached");
  }
  // ==========================================

  const wantsJson = type !== "coherence";
  const system = wantsJson
    ? "You are a brand language engine. Respond with a single valid JSON object and nothing else."
    : "You are a precise brand copy QA reviewer.";

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
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
  const content: string = completion?.choices?.[0]?.message?.content ?? "";
  if (!content) return fail("OpenAI returned an empty response.", "malformed");
  
  // One credit per answered call: the daily limit and the Usage dialog both count these rows.
  const { error: logError } = await admin.from("usage_events").insert({ user_id: userId, kind: type });
  if (logError) console.error("usage_events insert failed:", logError.message);

  if (!wantsJson) return reply({ success: true, data: { text: content.trim() } });

  try {
    const data = parseJson(content);
    if (!data || typeof data !== "object") throw new Error("not an object");
    return reply({ success: true, data });
  } catch {
    return fail("The AI returned malformed JSON. Try again.", "malformed");
  }
});