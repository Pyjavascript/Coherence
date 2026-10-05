# Brand Language OS — React + Supabase + OpenAI

React (Vite) port of the original HTML prototype. OpenAI is called only from a Supabase Edge Function.

## Setup

1. **Install** (project root): `npm install`
2. **Supabase project**: create one at https://supabase.com → Project Settings → API. Copy the Project URL and the `anon` key.
3. **Frontend env** — edit `.env`:
   ```
   VITE_SUPABASE_URL=https://YOURREF.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...   (the anon "JWT" key)
   ```
4. **Database**: Supabase dashboard → SQL Editor → paste `supabase/migrations/20260929000000_init.sql` → Run.
   (Or with the CLI: `supabase link --project-ref YOURREF` then `supabase db push`.)
5. **Supabase CLI** (project root):
   ```
   npm install -g supabase        # or: brew install supabase/tap/supabase
   supabase login
   supabase init                  # adds supabase/config.toml; keep existing files
   supabase link --project-ref YOURREF
   ```
6. **OpenAI secret (backend only)**:
   ```
   supabase secrets set OPENAI_API_KEY=sk-...
   ```
   NEVER put this in `.env`, and never as `VITE_OPENAI_API_KEY`.
7. **Deploy the function**: `supabase functions deploy generate`
   (If you use the newer `sb_publishable_...` key instead of the anon JWT, deploy with `--no-verify-jwt`.)
8. **Run**: `npm run dev` → http://localhost:5173

Change models in `src/lib/constants.js` (`AI_MODELS`).

## Testing checklist
- [ ] React app opens; UI matches the prototype
- [ ] New brand → Save brand → appears in sidebar; reload → still there
- [ ] Select brand loads fields + research notes; Delete works
- [ ] Research notes add/delete (persist for saved brands)
- [ ] Add a message, Generate all → 5 quick-grid cards fill
- [ ] ↻ regenerates one card; Premium toggle unlocks variants (1/2/3 tabs)
- [ ] Node studio: Generate on a node; Add node; 🔗 link two nodes; regenerate uses linked context
- [ ] Hook generator returns one line; Coherence prompt copies
- [ ] Break the key on purpose → readable error appears in status bar
- [ ] Browser DevTools → Network/Sources: no OpenAI key anywhere
