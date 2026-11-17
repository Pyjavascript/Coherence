# Backend Structure: how your controls turn into AI copy

This explains what happens between **typing in the panel** and **copy appearing on a card**. It covers what each control does, what it adds to the prompt, and how it changes the answer.

> **One-line summary:** the browser never writes the prompt. It sends your brand settings to a Supabase server function. That function writes the prompt, asks OpenAI, checks the answer and sends back clean copy.

---

## 1. The big picture

```
 ┌────────────────────────┐      ┌───────────────────────────────┐      ┌──────────────┐
 │  YOUR BROWSER (React)  │      │  SUPABASE EDGE FUNCTION       │      │   OPENAI     │
 │                        │      │  "generate"                   │      │              │
 │  Brand panel           │      │                               │      │  gpt-4o-mini │
 │  Language panel        │ ───► │  1. Cleans & caps every field │ ───► │  gpt-4o      │
 │  Card / node settings  │ JSON │  2. Writes the prompt         │      │  gpt-4.1     │
 │  Model picker          │      │  3. Checks login + credits    │ ◄─── │              │
 │  Composer (message)    │ ◄─── │  4. Fixes length / banned     │ JSON └──────────────┘
 │                        │ copy │     words, then replies       │
 └────────────────────────┘      └───────────────────────────────┘
```

**Why it's built this way:**
- The OpenAI key lives only on the server, so nobody can find it in the browser.
- The server writes the prompt itself, so nobody can use your endpoint as a free ChatGPT.
- The browser sends *settings*, not text instructions.

---

## 2. What happens when you press Generate

| Step | Where | What happens |
|---|---|---|
| 1 | Browser | You press the arrow in the composer, or **Generate** on a card or node. |
| 2 | [src/services/ai.js](../services/ai.js) | Packs up your brand fields, notes, card settings and model choice. The logo is left out. |
| 3 | [handler.ts](../../supabase/functions/generate/handler.ts) | Receives the request. |
| 4 | [generation.js](../../supabase/functions/_shared/generation.js) | **Cleans** every field: trims it, caps its length and replaces unknown values with defaults. |
| 5 | [prompts.js](../../supabase/functions/_shared/prompts.js) | **Writes the prompt** from the cleaned fields. *This is the file to read if you want to change wording.* |
| 6 | handler.ts | Checks your login and **reserves credits** (1 per Quick Grid card, 1 per node, 40 a day). |
| 7 | handler.ts | Sends the prompt to OpenAI and asks for a JSON answer. |
| 8 | handler.ts | **Quality checks** (no extra credit): fixes word counts, removes banned words, trims anything still too long. |
| 9 | Browser | Shows the copy on the card. If something failed, your credits are refunded. |

---

## 3. Brand tab

| Control | Saved as | What it adds to the prompt | Effect on the answer |
|---|---|---|---|
| **Brand Name** | `name` | `Brand: Ember & Oak` | The AI knows who is speaking. If it's empty, it says "the brand". |
| **Logo** (image button) | `logo` | **Nothing.** It's never sent to the AI. | Only shown in the app. |
| **Industry** | `industry` | `Industry conventions (Beauty & personal care): Sensory, tactile language…` | Each industry has its own rules, such as "no medical claims" for Wellness or "no guaranteed returns" for Finance. See `INDUSTRY_LAYERS` in [constants.js](../../supabase/functions/_shared/constants.js). |
| **Core promise / values / principles** | `belief` | `Core belief (must stay true across every output): …` | **The strongest instruction.** Every piece must keep this point of view. |
| **Brand Pillars** (up to 3) | `pillars` | `Brand pillars (every piece must reflect at least one of them and never contradict any): 1) … 2) …` | Every piece leans on at least one pillar, but never says the word "pillar". Empty slots add nothing. |
| **Content Job** | `message` | `Message to adapt: …` | **What the copy is actually about.** Generate won't run without it. |

> 💡 **Content Job and the composer box at the bottom are the same field.** Typing in one updates the other.

---

## 4. Language tab

These controls set *how* the brand sounds. **A control you leave empty adds nothing to the prompt.**

| Control | Saved as | What it adds to the prompt | Effect on the answer |
|---|---|---|---|
| **Select a personality** (chips) | `personality` | `Brand personality: Warm. Every line should sound like this personality.` | Sets the overall character. Click the selected chip again to clear it. |
| **Mention writing rules** | `rules` | `Writing rules (follow every one): short sentences, active voice` | Hard style rules the AI must follow. |
| **Mention words to avoid** | `banned` | `Never use these words/claims: cheap, best-ever` | **Enforced twice:** the prompt forbids the words, and the server checks the answer afterwards (section 7). |
| **Output language** | `language` | `Write all copy in Hindi (only the text values; keep every JSON key in English)` | The language of the copy. The default is English. |
| **Voice / Tone sample** | `voice` | `Voice sample (match its rhythm, vocabulary and attitude; never reuse its words): …` | The AI copies the *feel* of your sample, never its words. |
| **Cold ↔ Warm slider** | `warmth` (0–100) | `Warmth of the voice (70/100): warm: friendly, human and caring.` | Five bands, listed below. **At 50 (Neutral) it adds nothing.** |

**What each warmth setting tells the AI:**

| Slider | Instruction sent |
|---|---|
| 0 – 15 | very cool: detached and matter-of-fact, no emotional language |
| 16 – 40 | cool: restrained and factual, light on emotional language |
| 41 – 60 | neutral: balanced, neither cold nor gushing (*at exactly 50, nothing is sent*) |
| 61 – 85 | warm: friendly, human and caring |
| 86 – 100 | very warm: affectionate, intimate and emotionally open |

---

## 5. Customer tab (coming soon) and hidden settings

The Customer tab is a placeholder for now. **But the settings that used to sit there are still in every prompt, with their default values:**

| Hidden setting | Default sent | Line in the prompt |
|---|---|---|
| Funnel stage | `Discovery` | `Customer context: funnel stage = Discovery, …` |
| Language mode | `Emotional` | `… language mode = Emotional, …` |
| Audience | `Cold — scrolling, distracted` | `… audience posture = Cold — scrolling, distracted.` |
| Desired emotion | `Curiosity` | `Desired emotional response: Curiosity.` |
| Formality | `Conversational` | `Formality: Conversational.` |
| CTA intensity | `Soft` | `CTA intensity: Soft.` |
| Style pack | `Classic` | `Style pack — Classic: Balanced, versatile brand voice…` |
| Pain point, objection, location, must-include, research notes | empty | Not sent. |

> ⚠️ **Worth knowing:** every brand is currently treated as "Discovery, Emotional, cold audience, soft CTA". When you build the Customer tab, these controls will start to change the copy noticeably. (The sample brand from the tour fills some of them in, so it behaves slightly differently.)

---

## 6. Controls outside the panel

### Top bar: model picker
| Option | Model | Good for |
|---|---|---|
| Fast | `gpt-4o-mini` | Quick, cheap drafts |
| Balanced (default) | `gpt-4o` | Everyday use |
| Quality | `gpt-4.1` | Complex copy |

The server accepts **only these three**. Any other model name is ignored. You can change them in `AI_MODELS` in [constants.js](../../supabase/functions/_shared/constants.js).

### Quick Grid card settings (the pencil on a card)
| Control | Effect |
|---|---|
| **Job Requirement** | Added only to *that* card: `Per-output instructions: - email: job requirement: Mention free shipping` |
| **Target Words** slider | Replaces the card's default length with a strict word count (section 7). |
| **Component** (Website only) | Hero, Feature pointers, FAQ, Testimonial or CTA block. This changes what the headline and supporting line contain. |
| **How many pointers** | Used only with Feature pointers: 2–6. |

**Default lengths when you don't set Target Words:**

| Card | Default rule sent to the AI |
|---|---|
| Packaging | 2–6 words only, no full sentence |
| Marketing | one punchy campaign line under 12 words |
| Advertising | headline under 8 words + supporting line under 12 |
| Website | hero headline under 10 words + supporting sentence under 20 |
| Email | subject under 8 words + preview under 14 |

### Node Studio node settings
| Control | Effect |
|---|---|
| **Job Requirement** | This node's task. If it's empty, the Content Job is used. |
| **Target Words** | The body length. Defaults: Email 120, Social 40, Website 70, Packaging 8, Advertising 22. |
| **Platform** (Social) | Instagram, TikTok, LinkedIn and so on. Each has its own writing rules. |
| **Component** (Website) | Same as on the grid card. |
| **Links between nodes** | A linked node gets the other node's finished copy and is told to **adapt** it, not copy it word for word. |

---

## 7. What the server does after OpenAI answers

These checks are automatic and **never cost an extra credit.**

```
 OpenAI answer
      │
      ▼
 ① Word count off target? ──yes──► ask the AI to rewrite (up to 2 times),
      │                            keep it only if it got closer
      ▼
 ② Uses a banned word? ─────yes──► ask the AI to rewrite once,
      │                            keep it only if it has fewer banned words
      ▼
 ③ Still over the word limit? ─yes─► trim it (cut whole sentences first)
      │
      ▼
 Sent to your card ✓
```

**How word counts work:** if you set **20 words**, anything from **18 to 20** is accepted. The prompt asks for about 19, so a small overshoot still fits. Copy never goes *over* your number.

---

## 8. Real example: the full prompt

This is the prompt the server actually builds for the **sample brand (Ember & Oak)**, with one Website card and one Email card. The email card has Target Words set to 20 and the job "Mention free shipping". Each line is tagged with the control it comes from.

```text
You are a brand language engine that adapts one constant message into channel-correct copy…
Brand: Ember & Oak                                                    ← Brand Name
Core belief (must stay true across every output): Scent is memory…    ← Core promise
Brand pillars (…reflect at least one…): 1) Hand-made in small         ← Pillars
  batches; 2) Every scent tells a story
Message to adapt: Our autumn candle collection is hand-poured…        ← Content Job
Customer context: funnel stage = Discovery, language mode =           ← hidden (Customer)
  Emotional, audience posture = Cold — scrolling, distracted.
Industry conventions (Retail & e-commerce): Value and immediacy…      ← Industry
Style pack — Classic: Balanced, versatile brand voice…                ← hidden (style)
Customer pain point: Mass-market candles smell synthetic…             ← hidden (sample only)
Desired emotional response: Comfort. Formality: Conversational.       ← hidden
  CTA intensity: Soft.
Objection to pre-empt: Worried it won't be worth the price            ← hidden (sample only)
Never use these words/claims: cheap, best-ever                        ← Words to avoid
Brand personality: Warm. Every line should sound like this…           ← Personality
Warmth of the voice (70/100, cold to warm): warm: friendly…           ← Warmth slider
Writing rules (follow every one): Short sentences, active voice…      ← Writing rules
Write all copy in English.                                            ← Output language
Never explain your choices. Never use quotation marks…                ← always
Generate exactly 1 distinct variant(s) for every output below…        ← variants
Return ONLY valid JSON…
{"website":[{"headline":"...","sub":"..."}],"email":[{"subject":"...","preview":"..."}]}
Constraints:
- website: a hero headline under 10 words plus one supporting…        ← default length
- email: subject of about 7 words plus preview of about 13 words      ← Target Words = 20
  (user-set length, strict: 18-20 words in total…)
Per-output instructions (follow them for that output only):
- email: job requirement: Mention free shipping                       ← card Job Requirement
```

---

## 9. "Copy AI Prompt" button

This button builds a **different** prompt (`buildBrandBriefPrompt` in [prompts.js](../../supabase/functions/_shared/prompts.js)) for you to paste into ChatGPT or any other AI.

- It uses the **same brand and language fields**, written as a readable brief.
- It asks for normal readable copy instead of JSON, covering all 5 channels.
- It leaves out empty fields.
- It's built in your browser and **costs no credits**, because nothing is sent to the server.

---

## 10. Where things are saved

| What | Where |
|---|---|
| Brand + Language fields | Supabase table `brands`, when you press **Save** (→) |
| Research notes | Supabase table `research_notes` |
| Generated copy history | Supabase table `generations` |
| Credits used today | Supabase table `usage_events`: one row per credit, reset daily |
| OpenAI key | Supabase secret `OPENAI_API_KEY`, **server only** |

---

## 11. File map: where to edit what

| I want to… | Edit this file |
|---|---|
| Change how a control is **worded in the prompt** | [supabase/functions/_shared/prompts.js](../../supabase/functions/_shared/prompts.js) |
| Change **industries, personalities, defaults, models, platforms** | [supabase/functions/_shared/constants.js](../../supabase/functions/_shared/constants.js) |
| Change **field length caps or credit cost** | [supabase/functions/_shared/generation.js](../../supabase/functions/_shared/generation.js) |
| Change **word-count rules or trimming** | [supabase/functions/_shared/copyItems.js](../../supabase/functions/_shared/copyItems.js) |
| Change **banned-word matching** | [supabase/functions/_shared/banned.js](../../supabase/functions/_shared/banned.js) |
| Change **daily limits, retries or the OpenAI call** | [supabase/functions/generate/handler.ts](../../supabase/functions/generate/handler.ts) |
| Change the **Brand / Language panel UI** | [src/components/BrandPanel.jsx](../components/BrandPanel.jsx) |

> ⚠️ After editing anything in `supabase/functions/`, run `npm run build:function` and then `supabase functions deploy generate`. **Never edit `generate/index.ts` directly:** it's generated from the other files.
