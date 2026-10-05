// Supabase Edge Function: generate
// Receives structured requests from the React app, calls OpenAI with the secret
// OPENAI_API_KEY (set via `supabase secrets set`), returns predictable JSON:
//   { success: true, data: {...} }  |  { success: false, error: "...", code?: "..." }

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

const reply = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200, // handled errors also return 200 so the client can read the message
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
  const model = requested ?? FALLBACK_MODELS[tier as string] ?? FALLBACK_MODELS.balanced;

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return fail("The server is missing its OpenAI key. Run: supabase secrets set OPENAI_API_KEY=...", "config");

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
  } catch {
    return fail("Couldn't reach OpenAI. Try again.", "upstream");
  }

  if (!res.ok) {
    console.error("OpenAI error", res.status, (await res.text()).slice(0, 500));
    if (res.status === 429) return fail("Rate limited — try again shortly.", "rate_limited");
    if (res.status === 401) return fail("The OpenAI key on the server was rejected.", "config");
    if (res.status === 404) return fail(`Model "${model}" isn't available for this key.`, "config");
    return fail("OpenAI returned an error. Try again.", "upstream");
  }

  const completion = await res.json();
  const content: string = completion?.choices?.[0]?.message?.content ?? "";
  if (!content) return fail("OpenAI returned an empty response.", "malformed");

  if (!wantsJson) return reply({ success: true, data: { text: content.trim() } });

  try {
    const data = parseJson(content);
    if (!data || typeof data !== "object") throw new Error("not an object");
    return reply({ success: true, data });
  } catch {
    return fail("The AI returned malformed JSON. Try again.", "malformed");
  }
});
