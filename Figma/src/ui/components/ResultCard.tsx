import { useState } from "react";
import type { SelectedText } from "../../shared/protocol";
import { isPointers, variantText, type ReplacePart, type Variant } from "../lib/variants";

interface Props {
  variant: Variant;
  index: number;
  replaceTarget: SelectedText | null;
  busy: boolean;
  onInsert: () => void;
  onReplace: (text: string) => void;
  onCopy: (text: string) => void;
}

// One generated variant: insert as new layers, replace the selected text layer
// (only after the user picks which part), or copy.
export default function ResultCard({ variant, index, replaceTarget, busy, onInsert, onReplace, onCopy }: Props) {
  const [choosing, setChoosing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const pointers = isPointers(variant);

  const parts: { part: ReplacePart; label: string }[] = pointers
    ? [{ part: "all", label: "All pointers" }]
    : [
        { part: "headline", label: "Headline" },
        { part: "body", label: "Body" },
        { part: "all", label: "Both" },
      ];

  const replace = (part: ReplacePart) => {
    setChoosing(false);
    onReplace(variantText(variant, part));
  };

  return (
    <article className="result" aria-label={`Variant ${index + 1}`}>
      <span className="result-index mono">V{index + 1}</span>
      {pointers ? (
        <ul className="pointers">
          {variant.pointers.map((p, i) => (
            <li key={i}>
              <strong>{p.title}</strong> <span className="muted">{p.detail}</span>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <h3 className="result-headline">{variant.headline}</h3>
          <p
            className={"result-body muted" + (expanded ? " is-expanded" : "")}
            onClick={() => setExpanded((x) => !x)}
            title={expanded ? "Collapse" : "Show all"}
          >
            {variant.body}
          </p>
        </>
      )}

      {choosing && replaceTarget ? (
        <div className="result-actions" role="group" aria-label="Replace which part">
          <span className="choose-label">Replace with:</span>
          {parts.map((p) => (
            <button key={p.part} type="button" className="btn btn-small" onClick={() => replace(p.part)} disabled={busy}>
              {p.label}
            </button>
          ))}
          <button type="button" className="btn btn-small btn-ghost" onClick={() => setChoosing(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="result-actions">
          <button type="button" className="btn btn-small btn-primary" onClick={onInsert} disabled={busy}>
            Insert into canvas
          </button>
          {replaceTarget && (
            <button
              type="button"
              className="btn btn-small"
              onClick={() => setChoosing(true)}
              disabled={busy}
              title={`Replace the text in “${replaceTarget.name}”`}
            >
              Replace “{replaceTarget.name.length > 18 ? replaceTarget.name.slice(0, 17) + "…" : replaceTarget.name}”
            </button>
          )}
          <button type="button" className="btn btn-small" onClick={() => onCopy(variantText(variant))}>
            Copy
          </button>
        </div>
      )}
    </article>
  );
}
