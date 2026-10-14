import { useEffect, useRef, useState } from "react";
import { DEFAULT_TIER, NODE_DEFAULT_WORDS, PLATFORMS, WEBSITE_COMPONENTS } from "@web/lib/constants.js";
import { LIMITS } from "@web/lib/clientId.js";
import { buildCoherencePrompt, describeLastGenerated } from "@web/lib/prompts.js";
import { describeError, generateNode } from "@web/services/ai.js";
import { saveGeneration } from "@web/services/brands.js";
import type { Brand, Note } from "../hooks/useBrandData";
import { isPointers, variantBlocks, variantText, type Variant } from "../lib/variants";
import type { TextBlock } from "../../shared/protocol";
import { BoxIcon, ChatIcon, GlobeIcon, InsertIcon, MailIcon, MegaphoneIcon, PullIcon, SparkIcon } from "./icons";

const MEDIUMS = [
  { key: "email", label: "Email", piece: "Launch email", Icon: MailIcon },
  { key: "social", label: "Social", piece: "Social post", Icon: ChatIcon },
  { key: "website", label: "Website", piece: "Homepage hero", Icon: GlobeIcon },
  { key: "advertising", label: "Ad", piece: "Launch ad", Icon: MegaphoneIcon },
  { key: "packaging", label: "Packaging", piece: "Box front line", Icon: BoxIcon },
];

// Copies per run. One run is one credit however many copies it asks for, but
// past this the answer gets too long to come back reliably.
export const MAX_COPIES = 40;
// Node Studio's Target Words bounds.
const MIN_WORDS = 4;
const MAX_WORDS = 600;

// The same fields as a Node Studio node, one draft per channel.
interface Draft {
  label: string;
  brief: string;
  words: number | "";
  platform: string;
  component: string;
  pointerCount: number;
  layerName: string;
  requirements: string;
}

const defaultWords = (category: string) => (NODE_DEFAULT_WORDS as Record<string, number>)[category] || 60;

const draftFor = (category: string): Draft => ({
  label: MEDIUMS.find((m) => m.key === category)?.piece || "New piece",
  brief: "",
  words: defaultWords(category),
  platform: PLATFORMS[0],
  component: "hero",
  pointerCount: 3,
  layerName: "",
  requirements: "",
});

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

interface Run {
  label: string;
  layer: string;
  words: number;
  variants: Variant[];
}

interface Props {
  brand: Brand;
  notes: Note[];
  category: string;
  onCategory: (key: string) => void;
  copies: number;
  onCopies: (n: number) => void;
  selectionText: string;
  atLimit: boolean;
  canvas: {
    busy: boolean;
    insert: (name: string, blocks: TextBlock[]) => void;
    insertAll: (items: { name: string; blocks: TextBlock[] }[]) => void;
    copy: (text: string, done?: string) => void;
  };
  onUsed: () => void;
}

export default function GeneratePanel(props: Props) {
  const { brand, notes, canvas, atLimit } = props;
  const medium = MEDIUMS.find((m) => m.key === props.category) || MEDIUMS[1];
  const category = medium.key;
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  // Typed text, so the field can be cleared or overshoot (and turn red) while typing.
  const [copiesText, setCopiesText] = useState(String(props.copies));
  const [result, setResult] = useState<Run | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const run = useRef(0);

  const draft = drafts[category] || draftFor(category);
  const setDraft = (patch: Partial<Draft>) => setDrafts((all) => ({ ...all, [category]: { ...draft, ...patch } }));
  const isWebsite = category === "website";
  const copies = Number(copiesText);
  const copiesValid = Number.isInteger(copies) && copies >= 1 && copies <= MAX_COPIES;
  const tooMany = Number.isFinite(copies) && copies > MAX_COPIES;

  useEffect(() => setCopiesText(String(props.copies)), [props.copies]);

  // Results belong to the brand they were written for.
  useEffect(() => {
    run.current++;
    setResult(null);
    setGenerating(false);
    setError("");
  }, [brand.id]);

  const changeCopies = (text: string) => {
    setCopiesText(text);
    const n = Number(text);
    if (Number.isInteger(n) && n >= 1 && n <= MAX_COPIES) props.onCopies(n);
  };
  // From an over-the-limit count, "−" drops straight back to the limit.
  const stepCopies = (step: number) => {
    if (tooMany) return changeCopies(String(MAX_COPIES));
    const from = copiesValid ? copies : 1;
    changeCopies(String(Math.max(1, Math.min(MAX_COPIES, from + step))));
  };

  const commitWords = () => {
    const n = Number(draft.words);
    setDraft({ words: draft.words === "" || !n ? defaultWords(category) : Math.max(MIN_WORDS, Math.min(MAX_WORDS, Math.round(n))) });
  };

  const generate = async () => {
    if (generating || atLimit || !copiesValid) return;
    if (!draft.brief.trim() && !brand.message?.trim()) {
      setError("Add a job requirement, or a brand message, first.");
      return;
    }
    const mine = ++run.current;
    const words = Math.max(MIN_WORDS, Math.min(MAX_WORDS, Number(draft.words) || defaultWords(category)));
    const node = {
      category,
      label: draft.label.trim() || medium.piece,
      brief: draft.brief,
      words,
      requirements: draft.requirements,
      platform: category === "social" ? draft.platform : null,
      component: isWebsite ? draft.component : "hero",
      pointerCount: draft.pointerCount,
    };
    setGenerating(true);
    setError("");
    try {
      const variants: Variant[] = await generateNode({
        ctx: { brand, notes, stylePack: "classic" },
        node,
        variantCount: copies,
        linkedNodes: [],
        source: null,
        tier: DEFAULT_TIER,
      });
      if (mine !== run.current) return;
      setResult({ label: node.label, layer: draft.layerName.trim() || node.label, words, variants });
      props.onUsed();
      // Best-effort history, same shape as the web app's Node Studio.
      saveGeneration({
        brandId: brand.id,
        medium: `node-${category}`,
        inputContext: { brief: node.brief, label: node.label, source: "figma" },
        output: variants,
      });
    } catch (err) {
      if (mine !== run.current) return;
      setError(describeError(err));
      props.onUsed();
    } finally {
      if (mine === run.current) setGenerating(false);
    }
  };

  const layerName = (r: Run, i: number) => (r.variants.length > 1 ? `${r.layer} — ${i + 1}` : r.layer);

  return (
    <section className="tab-body" aria-label="Generate">
      <div className="chips" role="radiogroup" aria-label="Channel">
        {MEDIUMS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="radio"
            className={"chip" + (key === category ? " is-active" : "")}
            aria-checked={key === category}
            onClick={() => props.onCategory(key)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>

      <div className="card">
        {/* <label className="field">
          <span className="field-label">Piece name</span>
          <input value={draft.label} maxLength={80} placeholder={medium.piece} onChange={(e) => setDraft({ label: e.target.value })} />
        </label> */}

        <div className="field">
          <div className="field-label-row">
            <label className="field-label" htmlFor="gen-brief">Job requirement</label>
            <button
              type="button"
              className="link-btn"
              title="Use the text selected on the canvas"
              disabled={!props.selectionText.trim()}
              onClick={() => setDraft({ brief: props.selectionText })}
            >
              <PullIcon />
              Pull from canvas
            </button>
          </div>
          <textarea
            id="gen-brief"
            rows={3}
            maxLength={2000}
            placeholder={brand.message ? `What must this piece do? Defaults to: ${brand.message}` : "What must this piece do?"}
            value={draft.brief}
            onChange={(e) => setDraft({ brief: e.target.value })}
          />
        </div>

        {category === "social" && (
          <label className="field">
            <span className="field-label">Platform</span>
            <select value={draft.platform} onChange={(e) => setDraft({ platform: e.target.value })}>
              {PLATFORMS.map((p: string) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        )}

        {isWebsite && (
          <div className={draft.component === "pointers" ? "row2" : undefined}>
            <label className="field">
              <span className="field-label">Component</span>
              <select value={draft.component} onChange={(e) => setDraft({ component: e.target.value })}>
                {Object.entries(WEBSITE_COMPONENTS as Record<string, { label: string }>).map(([key, c]) => (
                  <option key={key} value={key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            {draft.component === "pointers" && (
              <label className="field">
                <span className="field-label">How many pointers</span>
                <input
                  type="number"
                  min={2}
                  max={6}
                  value={draft.pointerCount}
                  onChange={(e) => setDraft({ pointerCount: Math.max(2, Math.min(6, parseInt(e.target.value, 10) || 3)) })}
                />
              </label>
            )}
          </div>
        )}

        <div className="row2">
          <label className="field">
            <span className="field-label">Target words</span>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_WORDS}
              max={MAX_WORDS}
              value={draft.words}
              onChange={(e) => setDraft({ words: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
              onBlur={commitWords}
            />
          </label>
          <label className="field">
            <span className="field-label">Layer name</span>
            <input value={draft.layerName} maxLength={120} placeholder={draft.label.trim() || medium.piece} onChange={(e) => setDraft({ layerName: e.target.value })} />
          </label>
        </div>

        <label className="field">
          <span className="field-label">Specific requirements</span>
          <textarea
            rows={2}
            maxLength={2000}
            placeholder="Format, must-include line, banned words override..."
            value={draft.requirements}
            onChange={(e) => setDraft({ requirements: e.target.value })}
          />
        </label>
      </div>

      <div className={"copies" + (tooMany ? " is-over" : "")}>
        <div className="copies-text">
          <label className="field-label" htmlFor="gen-copies">Copies</label>
          <span id="gen-copies-hint" className="copies-hint" aria-live="polite">
            {tooMany ? `Up to ${MAX_COPIES} copies per run.` : "Distinct takes in one run · 1 credit"}
          </span>
        </div>
        <div className="stepper">
          <button type="button" aria-label="Fewer copies" disabled={copiesValid && copies <= 1} onClick={() => stepCopies(-1)}>
            −
          </button>
          <input
            id="gen-copies"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_COPIES}
            value={copiesText}
            aria-invalid={!copiesValid || undefined}
            aria-describedby="gen-copies-hint"
            onChange={(e) => changeCopies(e.target.value)}
            onBlur={() => !copiesValid && !tooMany && changeCopies(String(props.copies))}
          />
          <button type="button" aria-label="More copies" disabled={tooMany || (copiesValid && copies >= MAX_COPIES)} onClick={() => stepCopies(1)}>
            +
          </button>
        </div>
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={generate} disabled={generating || atLimit || !copiesValid}>
        {generating ? <span className="spinner is-light" aria-hidden="true" /> : <SparkIcon />}
        {atLimit
          ? `Daily limit reached · ${LIMITS.generations}/${LIMITS.generations}`
          : generating
            ? `Writing ${copies} ${copies === 1 ? "copy" : "copies"}…`
            : tooMany
              ? `Lower copies to ${MAX_COPIES} or fewer`
              : !copiesValid
                ? "Enter how many copies"
                : `Generate ${copies} ${copies === 1 ? "copy" : "copies"}`}
      </button>

      {error && <p className="form-error" role="alert">{error}</p>}

      {result && result.variants.length > 0 && (
        <>
          <div className="results-head">
            <span className="section-label">
              {result.variants.length} {result.variants.length === 1 ? "copy" : "copies"} · {result.label}
            </span>
            {result.variants.length > 1 && (
              <button
                type="button"
                className="btn btn-small btn-soft"
                disabled={canvas.busy}
                onClick={() => canvas.insertAll(result.variants.map((v, i) => ({ name: layerName(result, i), blocks: variantBlocks(v) })))}
              >
                <InsertIcon />
                Insert all
              </button>
            )}
          </div>
          <div className="results">
            {result.variants.map((v, i) => {
              const text = variantText(v);
              return (
                <article key={i} className="result">
                  <span className="result-tag">Copy {i + 1}</span>
                  {isPointers(v) ? (
                    <ul className="pointers">
                      {v.pointers.map((p, j) => (
                        <li key={j}>
                          <strong>{p.title}</strong> <span className="muted">{p.detail}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <>
                      {v.headline && <h3 className="result-headline">{v.headline}</h3>}
                      {v.body && <p className="result-body">{v.body}</p>}
                    </>
                  )}
                  <p className="result-meta">
                    {isPointers(v)
                      ? `${v.pointers.length} pointers`
                      : `${countWords(v.body)} / ${result.words} words · ${v.body.length} characters`}
                  </p>
                  <div className="result-actions">
                    <button
                      type="button"
                      className="btn btn-small btn-primary"
                      title="Insert into the canvas"
                      disabled={canvas.busy || !variantBlocks(v).length}
                      onClick={() => canvas.insert(layerName(result, i), variantBlocks(v))}
                    >
                      <InsertIcon />
                      Insert into canvas
                    </button>
                    <button type="button" className="btn btn-small btn-ghost" disabled={!text.trim()} onClick={() => canvas.copy(text)}>
                      Copy text
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <ExternalPrompt
        ctx={{ brand, notes, stylePack: "classic" }}
        result={result}
        selectionText={props.selectionText}
        onCopy={(text) => canvas.copy(text, "Prompt copied — paste it into ChatGPT or any other LLM.")}
      />
    </section>
  );
}

// The web app's "External AI → Copy Prompt": a CTA-to-copy coherence check to
// paste into any LLM, for one of the copies above or the canvas selection.
function ExternalPrompt({ ctx, result, selectionText, onCopy }: {
  ctx: object;
  result: Run | null;
  selectionText: string;
  onCopy: (text: string) => void;
}) {
  const sources = [
    ...(result?.variants || []).map((variant, i) => ({
      key: `copy-${i}`,
      label: `Copy ${i + 1} · ${result?.label}`,
      described: describeLastGenerated({ type: "node", label: result?.label, variant }, null),
    })),
    ...(selectionText.trim()
      ? [{ key: "canvas", label: "Selected canvas text", described: { sourceLabel: "Figma selection", sampleCopy: selectionText } }]
      : []),
  ];
  const [sourceKey, setSourceKey] = useState("");
  const source = sources.find((s) => s.key === sourceKey) || sources[0];
  const text: string = buildCoherencePrompt(ctx, source?.described);
  // Edits stay until the copy under review changes.
  const [prompt, setPrompt] = useState(text);
  useEffect(() => setPrompt(text), [text]);

  return (
    <details className="disclosure">
      <summary>External AI prompt</summary>
      <div className="ext-body">
        <p className="ext-note">Paste into any LLM to check that the CTA and body copy line up.</p>
        {sources.length > 0 && (
          <label className="field">
            <span className="field-label">Copy to check</span>
            <select value={source?.key} onChange={(e) => setSourceKey(e.target.value)}>
              {sources.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <textarea aria-label="External AI prompt (editable)" rows={8} spellCheck={false} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <button type="button" className="btn btn-soft btn-block" disabled={!prompt.trim()} onClick={() => onCopy(prompt)}>
          <CopyIcon />
          Copy prompt
        </button>
      </div>
    </details>
  );
}

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="8.5" y="8.5" width="11" height="11" rx="3" />
    <path d="M15.5 5.6c0-1.3-.9-2.1-2.1-2.1H6.1C4.8 3.5 4 4.4 4 5.6v7.3c0 1.2.8 2.1 2 2.1h.5" />
  </svg>
);
