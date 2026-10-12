import { useEffect, useState } from "react";
import { defaultWords, minWordsFor, MAX_WORDS } from "../../lib/copyItems";

// Inline number field for the node's word limit. Enter / blur saves, Esc cancels.
function WordsInput({ value, min, label, custom, onCommit }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const n = Math.round(Number(draft));
    if (draft.trim() && Number.isFinite(n) && n !== value) onCommit(n);
    setDraft(String(value));
  };

  return (
    <input
      className={"ncard-meter-input" + (custom ? " is-custom" : "")}
      type="number"
      inputMode="numeric"
      min={min}
      max={MAX_WORDS}
      step={1}
      value={draft}
      aria-label={label}
      title={`${label} · Enter to save · Esc to cancel`}
      style={{ width: `calc(${Math.max(2, draft.length)}ch + 12px)` }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        // Keep Enter/Esc here: they shouldn't also trigger app shortcuts (Ctrl+Enter = Generate).
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          e.stopPropagation();
          setDraft(String(value));
          window.requestAnimationFrame(() => e.target.blur());
        }
      }}
    />
  );
}

// Type pill (colour indicator + label), editable length meter and the action slot.
// meter = { words, maxWords, level: ok|near|over, details } (see lib/copyItems measure)
// limits = the node's effective field limits; custom = the user changed the length.
export default function NodeHeader({ meta, meter, limits, custom, onWordsChange, children }) {
  const counted = meter && meter.words > 0;
  const maxWords = defaultWords(limits);
  const fill = counted ? Math.min(100, Math.round((meter.words / meter.maxWords) * 100)) : 0;
  const target = custom ? `Target: ${maxWords} words (custom · default ${meta.tag})` : `Target: ${meta.tag}`;
  const title = counted
    ? `${target}\n${meter.details.join("\n")}${meter.level === "over" ? "\nOver the limit — trim it, raise the limit or regenerate." : ""}`
    : target;

  return (
    <header className="ncard-head">
      <h2 className="ncard-pill">
        <span className="ncard-dot" aria-hidden="true" />
        <span className="ncard-pill-label">{meta.label}</span>
      </h2>
      <span className={"ncard-meter" + (counted ? " is-" + meter.level : "")} title={title}>
        {/* Count, limit and unit sit in one group so hiding parts of it never moves the box. */}
        <span className="ncard-meter-value">
          {counted && <span className="ncard-meter-text">{meter.words}/</span>}
          {onWordsChange ? (
            <WordsInput
              value={maxWords}
              min={minWordsFor(limits)}
              label={`${meta.label} word limit`}
              custom={custom}
              onCommit={onWordsChange}
            />
          ) : maxWords}
          <span className="ncard-meter-unit">words</span>
          {counted && meter.level === "over" && <span className="ncard-meter-flag">· too long</span>}
        </span>
        {counted && <span className="ncard-meter-bar" aria-hidden="true"><i style={{ width: `${fill}%` }} /></span>}
      </span>
      {children}
    </header>
  );
}
