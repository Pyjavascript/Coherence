import { useEffect, useState } from "react";
import { defaultWords, minWordsFor, MAX_WORDS } from "../../lib/copyItems";



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
