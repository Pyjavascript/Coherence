# How Generation Works

A short guide to how the **right panel** (Brand · Language · Customer) turns into the copy on your cards.

> **In one line:** the browser sends your settings, the server writes the prompt, OpenAI writes the copy, and the server checks it before it reaches the card.

---

## The flow

```
  Right panel            Edge Function "generate"              OpenAI
 ─────────────         ─────────────────────────────         ──────────
  Brand tab      ──►   1. Clean every field                   gpt-4o-mini
  Language tab         2. Build the prompt            ──►    gpt-4o
  Customer tab         3. Check login + credits              gpt-4.1
  Card settings        4. Fix length + banned words   ◄──
                       5. Send clean copy back
```

- The browser **never writes the prompt**. It sends fields only ([ai.js](../services/ai.js)).
- The server cleans each field: trims it, caps its length and fills defaults ([generation.js](../../supabase/functions/_shared/generation.js)).
- The prompt is put together in [prompts.js](../../supabase/functions/_shared/prompts.js).
- **An empty control adds nothing**, except the few that always have a default (marked *default* below).

---

## 🟦 Brand tab

| Control | Line added to the prompt |
|---|---|
| **Brand Name** | `Brand: Ember & Oak` (empty → "the brand") |
| **Logo** | *Never sent.* It's shown in the app only. |
| **Industry** | `Industry conventions (Retail): …` — that industry's own rules. *Default: General* |
| **Core promise / values** | `Core belief (must stay true across every output): …` — **the strongest rule** |
| **Brand Pillars** (up to 3) | `Brand pillars (every piece must reflect at least one…): 1) … 2) …` |
| **Content Job** | `Message to adapt: …` — **what the copy is about.** Same field as the composer box. |

## 🟩 Language tab

| Control | Line added to the prompt |
|---|---|
| **Personality** chip | `Brand personality: Warm. Every line should sound like this personality.` |
| **Writing rules** | `Writing rules (follow every one): …` |
| **Words to avoid** | `Never use these words/claims: …` — and checked again after the answer |
| **Output language** | `Write all copy in Hindi…` *Default: English* |
| **Voice / Tone sample** | `Voice sample (match its rhythm… never reuse its words): …` |
| **Cold ↔ Warm** slider | `Warmth of the voice (70/100): warm: friendly, human and caring.` — **at 50 nothing is sent** |

| Slider | Instruction sent |
|---|---|
| 0–15 | very cool, matter-of-fact |
| 16–40 | cool, restrained |
| 41–60 | neutral (nothing sent at exactly 50) |
| 61–85 | warm, friendly |
| 86–100 | very warm, emotionally open |

## 🟨 Customer tab

| Control | Line added to the prompt |
|---|---|
| **Ideal Client Profile** | `Customer profile (write to this person): …` |
| **Funnel Stage** | `funnel stage = Trust (the copy should reassure them with proof…)` *Default: Discovery* |
| **Desired Emotions** (up to 3) | `Desired emotional response…: Comfort, Joy.` *Default: Curiosity* |
| **Language Preference** ⭐ | `Customer vocabulary: Expert, the field's own technical terms…` *Default: Everyday* |
| **CTA Strength** ⭐ | `CTA strength: Clear, a plain, direct ask.` *Default: Gentle* |
| **Always Mention** ⭐ | `Every piece must include (work it in naturally): …` |
| **Research Notes** ⭐ | `Research context: - [Quote] …` (up to 8 notes) |
| **Intelligence Layer** ⭐ | *Nothing yet — UI only, server side not built.* |

⭐ = Premium. **Hidden, but still sent** with their defaults: language mode (`Emotional`), audience posture (`Cold — scrolling, distracted`) and style pack (`Classic`).

---

## Card settings (the pencil on a card)

These apply to **that card only**.

| Control | What it does |
|---|---|
| **Job Requirement** | `Per-output instructions: - email: job requirement: …` |
| **Platform** (Social) | Adds that platform's writing rules. |
| **Component** (Website) | Hero, Feature pointers, FAQ, Testimonial or CTA block. |
| **How many pointers** | 2–6, Feature pointers only. |
| **Target Words** sliders | A strict word count per field, in place of the default length. |
| **Select a layout** | 1 or 2 description boxes. With 2, each box gets the full description target and the AI writes `sub` + `sub2`. |

---

## After OpenAI answers

These checks are automatic and **never cost an extra credit**.

```
 Answer ─► Word count off target?  ─yes─► rewrite (up to 2×, kept only if closer)
        ─► Uses a banned word?     ─yes─► rewrite once (kept only if cleaner)
        ─► Still too long?         ─yes─► trim whole sentences
        ─► ✓ shown on the card
```

A target of **20 words** accepts **18–20**. The copy never goes over your number.

---

## Credits & models

- **1 credit per card** (or per node), **40 a day**. If a request fails, its credits are refunded.
- Model picker: **Fast** `gpt-4o-mini` · **Balanced** `gpt-4o` (default) · **Quality** `gpt-4.1`. The server accepts no other model.

---

## The prompt, in order

```text
You are a brand language engine…                        ← always
Brand: …                                                ← Brand Name
Core belief: …                                          ← Core promise
Brand pillars: 1) … 2) …                                ← Pillars
Message to adapt: …                                     ← Content Job
Customer context: funnel stage, mode, audience          ← Customer (+ hidden)
Customer profile: …                                     ← Client Profile
Industry conventions: …                                 ← Industry
Style pack — Classic: …                                 ← hidden
Desired emotional response… Vocabulary… CTA strength…   ← Customer
Never use these words: …                                ← Words to avoid
Every piece must include: …                             ← Always Mention
Brand personality / Warmth / Writing rules / Voice      ← Language tab
Write all copy in English.                              ← Output language
Research context: …                                     ← Research Notes
Generate exactly N variants… Return ONLY JSON {…}       ← always
Constraints: - email: subject of about 8 words…         ← card length + layout
Per-output instructions: - email: job requirement: …    ← card Job Requirement
```

---

## Where to change things

| To change… | Edit |
|---|---|
| Prompt wording | [prompts.js](../../supabase/functions/_shared/prompts.js) |
| Industries, personalities, defaults, models | [constants.js](../../supabase/functions/_shared/constants.js) |
| Field caps, credit cost | [generation.js](../../supabase/functions/_shared/generation.js) |
| Word counts, trimming | [copyItems.js](../../supabase/functions/_shared/copyItems.js) |
| Layouts | [layouts.js](../../supabase/functions/_shared/layouts.js) |
| Retries, daily limit, OpenAI call | [handler.ts](../../supabase/functions/generate/handler.ts) |

> ⚠️ After editing `supabase/functions/`, run `npm run build:function`, then `supabase functions deploy generate`. Never edit `generate/index.ts` by hand: it's built from the files above.

*For the full version, see [backend structure.md](backend%20structure.md).*
