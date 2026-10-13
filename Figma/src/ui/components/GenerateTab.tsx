import { useEffect, useRef, useState } from "react";
import { NODE_CATS, NODE_DEFAULT_WORDS, PLATFORMS, WEBSITE_COMPONENTS } from "@web/lib/constants.js";
import { LIMITS } from "@web/lib/clientId.js";
import { describeError, generateNode } from "@web/services/ai.js";
import { saveGeneration } from "@web/services/brands.js";
import type { Brand, Note } from "../hooks/useBrandData";
import type { SelectedText, SelectionInfo } from "../../shared/protocol";
import { variantBlocks, type Variant } from "../lib/variants";
import ResultCard from "./ResultCard";

const CATEGORIES = Object.entries(NODE_CATS as Record<string, { label: string; comingSoon?: boolean }>)
  .filter(([, c]) => !c.comingSoon)
  .map(([key, c]) => ({ key, label: c.label }));

const PRESET_LABELS: Record<string, string> = {
  email: "Launch email",
  social: "Social post",
  website: "Website section",
  packaging: "Pack line",
  advertising: "Ad",
};

interface Draft {
  label: string;
  brief: string;
  words: number;
  platform: string;
  component: string;
  pointerCount: number;
}

const draftFor = (category: string): Draft => ({
  label: PRESET_LABELS[category] || "New piece",
  brief: "",
  words: (NODE_DEFAULT_WORDS as Record<string, number>)[category] || 60,
  platform: PLATFORMS[0],
  component: "hero",
  pointerCount: 3,
});

interface Props {
  brand: Brand;
  notes: Note[];
  tier: string;
  category: string;
  onCategory: (c: string) => void;
  variantCount: number;
  onVariantCount: (n: number) => void;
  selection: SelectionInfo;
  selectionText: string;
  replaceTarget: SelectedText | null;
  canvas: {
    busy: boolean;
    insert: (name: string, blocks: ReturnType<typeof variantBlocks>) => void;
    replace: (target: SelectedText, text: string) => void;
    copy: (text: string) => void;
  };
  atLimit: boolean;
  onUsed: () => void;
  onAuthError: () => void;
}

// The mockup's main flow: pick a channel, describe the piece, generate up to 3
// variants with the web app's node generator, then insert / replace / copy.
export default function GenerateTab(props: Props) {
  const { brand, notes, tier, category, variantCount, selection, selectionText, replaceTarget, canvas, atLimit } = props;
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [adapt, setAdapt] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const run = useRef(0);

  const draft = drafts[category] || draftFor(category);
  const setDraft = (patch: Partial<Draft>) => setDrafts((all) => ({ ...all, [category]: { ...draft, ...patch } }));
  const catLabel = CATEGORIES.find((c) => c.key === category)?.label || category;
  const hasSelectionText = Boolean(selectionText.trim());

  // Results belong to the brand they were written for.
  useEffect(() => {
    run.current++;
    setVariants([]);
    setGenerating(false);
    setError("");
  }, [brand.id]);

  useEffect(() => {
    if (!hasSelectionText) setAdapt(false);
  }, [hasSelectionText]);

  const generate = async () => {
    if (generating) return;
    const sourceName = selection.texts.length === 1 ? selection.texts[0].name : "Figma selection";
    const source =
      adapt && hasSelectionText
        ? { label: sourceName, category, variant: { headline: "", body: selectionText } }
        : null;
    if (!draft.brief.trim() && !brand.message?.trim() && !source) {
      setError("Add a job requirement, or a brand message in the web app, first.");
      return;
    }
    const mine = ++run.current;
    setGenerating(true);
    setError("");
    const node = {
      category,
      label: draft.label.trim() || catLabel,
      brief: draft.brief,
      words: draft.words,
      requirements: "",
      platform: category === "social" ? draft.platform : null,
      component: category === "website" ? draft.component : "hero",
      pointerCount: draft.pointerCount,
    };
    try {
      const result: Variant[] = await generateNode({
        ctx: { brand, notes, stylePack: "classic" },
        node,
        variantCount,
        linkedNodes: [],
        source,
        tier,
      });
      if (mine !== run.current) return;
      setVariants(result);
      props.onUsed();
      // Best-effort history, same shape as the web app's Node Studio.
      saveGeneration({
        brandId: brand.id,
        medium: `node-${category}`,
        inputContext: { brief: node.brief, label: node.label, source: "figma" },
        output: result,
      });
    } catch (err) {
      if (mine !== run.current) return;
      if ((err as { code?: string })?.code === "unauthorized") props.onAuthError();
      setError(describeError(err));
      props.onUsed();
    } finally {
      if (mine === run.current) setGenerating(false);
    }
  };

  return (
    <section className="tab-body" aria-label="Generate">
      <div className="chips" role="tablist" aria-label="Channel">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={c.key === category}
            className={"chip mono" + (c.key === category ? " is-active" : "")}
            onClick={() => props.onCategory(c.key)}
          >
            {c.label.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="piece">
        <div className="piece-head">
          <input
            className="piece-title"
            aria-label="Piece name"
            value={draft.label}
            maxLength={80}
            onChange={(e) => setDraft({ label: e.target.value })}
          />
          <label className="piece-words mono" title="Target length in words">
            <input
              type="number"
              min={2}
              max={400}
              value={draft.words}
              onChange={(e) => setDraft({ words: Math.max(2, Math.min(400, Number(e.target.value) || 0)) })}
            />
            w
          </label>
        </div>
        <p className="piece-meta muted">
          {brand.emo} · {String(brand.cta).toLowerCase()} CTA · {brand.stage} stage
        </p>

        {category === "social" && (
          <select aria-label="Platform" value={draft.platform} onChange={(e) => setDraft({ platform: e.target.value })}>
            {PLATFORMS.map((p: string) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        )}
        {category === "website" && (
          <div className="row">
            <select
              aria-label="Website component"
              value={draft.component}
              onChange={(e) => setDraft({ component: e.target.value })}
            >
              {Object.entries(WEBSITE_COMPONENTS as Record<string, { label: string }>).map(([key, c]) => (
                <option key={key} value={key}>
                  {c.label}
                </option>
              ))}
            </select>
            {draft.component === "pointers" && (
              <select
                aria-label="Number of pointers"
                value={draft.pointerCount}
                onChange={(e) => setDraft({ pointerCount: Number(e.target.value) })}
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} pointers
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <textarea
          aria-label="Job requirement"
          placeholder={brand.message ? `Job requirement (optional — defaults to: ${brand.message})` : "Job requirement: what should this piece do?"}
          rows={2}
          maxLength={2000}
          value={draft.brief}
          onChange={(e) => setDraft({ brief: e.target.value })}
        />

        <label className={"check" + (hasSelectionText ? "" : " is-disabled")}>
          <input
            type="checkbox"
            checked={adapt}
            disabled={!hasSelectionText}
            onChange={(e) => setAdapt(e.target.checked)}
          />
          <span>
            Adapt the selected text
            {hasSelectionText
              ? ` (${selection.texts.length} layer${selection.texts.length === 1 ? "" : "s"})`
              : " — select a text layer"}
          </span>
        </label>
      </div>

      <div className="generate-row">
        <div className="segmented" role="radiogroup" aria-label="Variants">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={variantCount === n}
              className={variantCount === n ? "is-active" : ""}
              onClick={() => props.onVariantCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-grow" onClick={generate} disabled={generating || atLimit}>
          {atLimit
            ? `Daily limit reached · ${LIMITS.generations}/${LIMITS.generations}`
            : generating
              ? "Generating…"
              : `Generate ${variantCount} variant${variantCount === 1 ? "" : "s"}`}
        </button>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {variants.length > 0 && (
        <>
          <div className="divider" />
          <p className="section-label mono">RESULTS</p>
          <div className="results">
            {variants.map((v, i) => (
              <ResultCard
                key={i}
                index={i}
                variant={v}
                replaceTarget={replaceTarget}
                busy={canvas.busy}
                onInsert={() => canvas.insert(`${draft.label.trim() || catLabel} — V${i + 1}`, variantBlocks(v))}
                onReplace={(text) => replaceTarget && canvas.replace(replaceTarget, text)}
                onCopy={canvas.copy}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
