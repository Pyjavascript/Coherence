# Brand Language OS — Figma plugin

A Figma Design plugin for Brand Language OS. It lets you pick one of your brands, keep research notes, generate up to three copy variants, check copy on the canvas against the brand, and insert the results into the file.

The plugin is a small React UI on top of the web app's own code. It reuses `src/lib/prompts.js`, `src/lib/constants.js`, `src/services/ai.js`, `src/services/brands.js`, `src/services/research.js` and `src/hooks/useUsage.js` without changes. It calls the same Supabase backend: the `generate` Edge Function, the same tables and RLS, and the same 40-credit daily limit. You don't need a second backend.

## Requirements

- Figma **Desktop** app. Plugin development doesn't work in the browser.
- Node 18 or later and npm.
- The web app's root `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The plugin reads the same values.

## Setup

```bash
cd Figma
npm install
cp .env.example .env      # optional: set VITE_BLOS_WEB_URL for "Open full app"
npm run build
```

`npm run build` runs these steps in order:

1. Writes `manifest.json` from `manifest.template.json`. Network access is limited to your Supabase project's origin and nothing else.
2. Builds `dist/code.js`, the main thread (esbuild).
3. Builds `dist/ui.html`, the UI as a single self-contained file (Vite).
4. Scans `dist/` and fails if it finds an OpenAI key, a Supabase secret key or any JWT other than the public anon key.

## Import into Figma Desktop

1. Open any design file in Figma Desktop.
2. Go to **Plugins → Development → Import plugin from manifest…** and choose `Figma/manifest.json`.
3. Run it from **Plugins → Development → Brand Language OS**.

If Figma won't import the manifest because of the plugin id, create a plugin once:

1. Go to **Plugins → Development → New plugin…** (Figma design, Custom UI) and save it anywhere.
2. Copy the `id` from the `manifest.json` it generates into `Figma/.env` as `FIGMA_PLUGIN_ID`.
3. Run `npm run build` and import `Figma/manifest.json` again.

## Develop

```bash
npm run dev        # rebuilds code.js and ui.html on every change
```

- In Figma, turn on **Plugins → Development → Hot reload plugin**. You can also re-run the plugin with Ctrl+Alt+P (Cmd+Option+P on Mac).
- Logs and errors from both the main thread and the UI appear in **Plugins → Development → Show/Hide console**.
- If you change `.env` or `manifest.template.json`, run `npm run build` again and re-import the manifest.

Other commands:

```bash
npm test           # protocol validation, alignment checks, variant helpers
npm run typecheck
npm run check:bundle
```

## How it works

```
Figma/
├─ manifest.template.json   → manifest.json (generated; gitignored)
├─ scripts/                 env loading, build, manifest, bundle secret scan
├─ src/shared/protocol.ts   the only messages UI ⇄ main may exchange (validated both ways)
├─ src/main/                main thread: selection, insert/replace text, clientStorage
└─ src/ui/                  React UI, Supabase client, hooks, components
```

- **Two contexts.** The UI runs in an iframe with a null origin. It makes every network call. The main thread is the only part that touches the document or `figma.clientStorage`. They talk through `src/shared/protocol.ts`:
  - Every request has a version, an id, a known type and a validated payload.
  - Anything else is dropped.
  - Document writes run one at a time.
- **Reusing web code.** `vite.config.ts` swaps two web modules inside the plugin bundle:
  - `src/lib/supabase.js` becomes `src/ui/lib/supabaseClient.ts`. It keeps the session in `figma.clientStorage`, because `localStorage` isn't available to plugin iframes.
  - `src/lib/apiKey.js` becomes `src/ui/lib/apiKeyStub.ts`. The plugin never sends an OpenAI key.
- **Sign-in.** You sign in with your existing Brand Language OS email and password. The plugin gets its **own** Supabase session, separate from your browser. **Account → Sign out of the plugin** revokes it.
- **Secrets.** The bundle contains only the public Supabase URL and anon key. The OpenAI key and service-role key stay in the Edge Function's secrets.

## Features

| Tab | What it does | Backend used |
|---|---|---|
| Generate | Choose a channel (Email, Social, Website, Packaging, Advertising), describe the piece and generate 1–3 variants. Can adapt the selected text layers. Results can be inserted as new layers, replace the selected text layer (you pick headline, body or both), or be copied. | `generate` (type `node`, 1 credit per run). History is saved to `generations`. |
| Check | Instant local checks on selected or pasted copy: banned words, must-include terms, length. Plus an optional AI brand review (score, mismatches, better CTA). | Local checks: none. AI review: `generate` (type `coherence`, 1 credit). |
| Research | List, add and delete the brand's research notes. You can fill a note from the selected text. The first 8 notes feed every generation, as on the web. | `research_notes` |

Rules for changing the document:

- The plugin never edits your file on its own. Each change comes from a button press.
- **Insert** only creates new layers. They're placed next to the selection, or in the centre of the viewport.
- **Replace** shows only when exactly one text layer is selected, and it names that layer. It refuses to run if any of these is true:
  - the layer is locked
  - the layer uses a missing font
  - the layer's text changed after you selected it
- Each change is one undo step (Ctrl/Cmd+Z).

## Known limitations

- **Google sign-in** can't open inside a Figma plugin, so Google-only accounts can't sign in yet. The planned fix is a one-time connect code issued by the web app.
- New text uses Inter, which ships with Figma. Replace keeps the layer's own fonts. If a layer mixes styles, the new text takes the style of the first character.
- Brands are created and edited in the web app. The plugin reads them.
