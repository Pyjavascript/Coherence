import { useEffect, useMemo, useRef, useState } from "react";
import { LIMITS } from "@web/lib/clientId.js";
import { describeError, generateCoherenceCheck } from "@web/services/ai.js";
import type { Brand, Note } from "../hooks/useBrandData";
import type { SelectionInfo } from "../../shared/protocol";
import { localAlignment } from "../lib/alignment";

interface Props {
  brand: Brand;
  notes: Note[];
  tier: string;
  selection: SelectionInfo;
  selectionText: string;
  onCopy: (text: string) => void;
  atLimit: boolean;
  onUsed: () => void;
  onAuthError: () => void;
}

const ICON = { pass: "✓", warn: "!", fail: "×" } as const;

// Brand alignment for copy on the canvas: free local checks against the
// brand's rules, plus the web app's AI coherence review (1 credit).
export default function CheckTab({ brand, notes, tier, selection, selectionText, onCopy, atLimit, onUsed, onAuthError }: Props) {
  const [pasted, setPasted] = useState("");
  const [targetWords, setTargetWords] = useState("");
  const [review, setReview] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const run = useRef(0);

  const fromSelection = Boolean(selectionText.trim());
  const text = fromSelection ? selectionText : pasted;
  const checks = useMemo(
    () => localAlignment(text, brand, Number(targetWords) || undefined),
    [text, brand, targetWords],
  );

  // A review is about specific copy; drop it when the copy or brand changes.
  useEffect(() => {
    run.current++;
    setReview("");
    setReviewing(false);
    setError("");
  }, [text, brand.id]);

  const runReview = async () => {
    if (!text.trim() || reviewing) return;
    const mine = ++run.current;
    setReviewing(true);
    setError("");
    try {
      const sourceLabel = fromSelection
        ? selection.texts.length === 1
          ? `Figma layer “${selection.texts[0].name}”`
          : "Figma selection"
        : "pasted copy";
      const result: string = await generateCoherenceCheck({
        ctx: { brand, notes, stylePack: "classic" },
        described: { sampleCopy: text, sourceLabel },
        tier,
      });
      if (mine === run.current) setReview(result || "The review came back empty. Try again.");
    } catch (err) {
      if (mine !== run.current) return;
      if ((err as { code?: string })?.code === "unauthorized") onAuthError();
      setError(describeError(err));
    } finally {
      if (mine === run.current) setReviewing(false);
      onUsed();
    }
  };

  return (
    <section className="tab-body" aria-label="Check alignment">
      {fromSelection ? (
        <div className="source-box">
          <p className="section-label mono">
            CHECKING {selection.texts.length} TEXT LAYER{selection.texts.length === 1 ? "" : "S"}
            {selection.moreTexts ? " (FIRST 50)" : ""}
          </p>
          <p className="source-preview">{text}</p>
        </div>
      ) : (
        <>
          <p className="muted small">Select text layers on the canvas, or paste copy to check.</p>
          <textarea
            aria-label="Copy to check"
            rows={4}
            maxLength={4000}
            placeholder="Paste copy here…"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
          />
        </>
      )}

      <label className="inline-field">
        <span className="muted small">Target length (optional)</span>
        <input
          type="number"
          min={1}
          max={1000}
          value={targetWords}
          onChange={(e) => setTargetWords(e.target.value)}
          placeholder="words"
        />
      </label>

      {text.trim() && (
        <ul className="checks">
          {checks.length === 0 && (
            <li className="check-item muted small">
              This brand has no banned or must-include words set. Add them in the web app for instant checks.
            </li>
          )}
          {checks.map((c) => (
            <li key={c.id} className={"check-item is-" + c.status}>
              <span className="check-icon" aria-hidden="true">
                {ICON[c.status]}
              </span>
              <span>
                <strong>{c.title}</strong>
                <span className="muted"> — {c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="btn btn-primary btn-block" onClick={runReview} disabled={!text.trim() || reviewing || atLimit}>
        {atLimit ? `Daily limit reached · ${LIMITS.generations}/${LIMITS.generations}` : reviewing ? "Reviewing…" : "Run AI brand review · 1 generation"}
      </button>
      <p className="muted small">
        Checks the copy against the brand's core belief and CTA intensity, scores it out of 10 and suggests a better CTA.
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {review && (
        <div className="review">
          <p className="review-text">{review}</p>
          <button type="button" className="btn btn-small" onClick={() => onCopy(review)}>
            Copy review
          </button>
        </div>
      )}
    </section>
  );
}
