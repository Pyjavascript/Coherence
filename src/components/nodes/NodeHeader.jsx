import { useEffect, useState } from "react";
import { defaultWords, minWordsFor, MAX_WORDS } from "../../lib/copyItems";


const MAX_LABEL = 60;

// label / onLabelChange: the card's title, typed straight into the header like
// a Node Studio node's name. Left blank, it goes back to the medium's name.
export default function NodeHeader({ meta, label, onLabelChange, meter, limits, custom, onWordsChange, picker, children }) {
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
        {onLabelChange ? (
          <input
            className="ncard-pill-label ncard-title"
            type="text"
            value={label}
            size={Math.max(4, label.length + 1)}
            maxLength={MAX_LABEL}
            placeholder={meta.label}
            aria-label="Card name"
            title="Rename card"
            spellCheck={false}
            onChange={(e) => onLabelChange(e.target.value)}
            onBlur={(e) => { if (!e.target.value.trim()) onLabelChange(meta.label); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur(); }}
          />
        ) : (
          <span className="ncard-pill-label">{label || meta.label}</span>
        )}
      </h2>
      {picker}
      <span className={"ncard-meter" + (counted ? " is-" + meter.level : "")} title={title}>
        {/* Count, limit and unit sit in one group so hiding parts of it never moves the box. */}
        {/* <span className="ncard-meter-value">
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
        </span> */}
        {/* {counted && <span className="ncard-meter-bar" aria-hidden="true"><i style={{ width: `${fill}%` }} /></span>} */}
      </span>
      {children}
    </header>
  );
}
