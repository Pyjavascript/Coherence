import { useEffect, useState } from "react";
import { defaultWords, minWordsFor, MAX_WORDS } from "../../lib/copyItems";


const MAX_LABEL = 60;

function MediumIcon({ type }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (type === "email") return <svg {...common}><rect x="4" y="6" width="16" height="12" rx="2" /><path d="m5 8 7 5 7-5" /></svg>;
  if (type === "marketing" || type === "social") return <svg {...common}><path d="M5 5.5h14v10H12l-4.5 3v-3H5z" /><path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" strokeWidth="2.4" /></svg>;
  if (type === "website") return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M4.5 12h15M12 4c2.2 2.2 3.2 4.9 3.2 8s-1 5.8-3.2 8c-2.2-2.2-3.2-4.9-3.2-8S9.8 6.2 12 4Z" /></svg>;
  if (type === "packaging") return <svg {...common}><path d="m12 3.8 7.5 4.1v8.2L12 20.2l-7.5-4.1V7.9z" /><path d="m4.8 8.1 7.2 4 7.2-4M12 12.2v7.6" /></svg>;
  return <svg {...common}><path d="M4 10h4l10-4v12L8 14H4z" /><path d="m8 14 1.6 5h3L11 15M21 9v6" /></svg>;
}

// label / onLabelChange: the card's title, typed straight into the header like
// a Node Studio node's name. Left blank, it goes back to the medium's name.
// menu: the card's settings arrow, right after the title.
export default function NodeHeader({ meta, label, onLabelChange, meter, limits, custom, onWordsChange, menu, children }) {
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
        <span className="ncard-icon" aria-hidden="true"><MediumIcon type={meta.key} /></span>
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
      {menu}
      {/* The word meter is switched off; while it rendered empty it still took a
          flex slot, doubling the gap before the action buttons. Restore the block
          below to bring it back.
          (Count, limit and unit sit in one group so hiding parts of it never moves the box.)
      <span className={"ncard-meter" + (counted ? " is-" + meter.level : "")} title={title}>
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
      */}
      {children}
    </header>
  );
}
