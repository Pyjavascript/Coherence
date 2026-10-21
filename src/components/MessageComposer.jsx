import { useLayoutEffect, useRef, useState } from "react";
import { GEN_PLATFORMS, GEN_PLATFORMS_BY_KEY, MEDIA_BY_KEY, NODE_CATS } from "../lib/constants";

// Tray just above the view switch: a row of platform icon buttons and the
// message input (the same brand message as the right panel's field). Picked
// platforms limit Generate to the cards / nodes they need. Opens on every load
// so both are seen; collapses to a small tab.

const MAX_MESSAGE = 2000; // the generate function's cap on brand.message

// The platforms' own logo marks, in their own colours (sized in composer.css).
const LOGOS = {
  x: (
    <path fill="#fff" d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  ),
  facebook: (
    <path fill="#0866FF" d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
  ),
  google: (
    <>
      <path fill="#FBBC04" d="M7.5137 4.8438L1.5645 15.1484A4.5 4.5 0 0 1 4 14.4297c2.5597-.0075 4.6248 2.1585 4.4941 4.7148l3.2168-5.5723-3.6094-6.25c-.4499-.7793-.6322-1.6394-.5878-2.4784z" />
      <path fill="#4285F4" d="M23.4641 16.9287L15.4632 3.072C14.3586 1.1587 11.9121.5028 9.9988 1.6074S7.4295 5.1585 8.5341 7.0718l8.0009 13.8567c1.1046 1.9133 3.5511 2.5679 5.4644 1.4646 1.9134-1.1046 2.568-3.5511 1.4647-5.4644z" />
      <path fill="#34A853" d="M3.9998 22.9291C1.7908 22.9291 0 21.1383 0 18.9293s1.7908-3.9998 3.9998-3.9998 3.9998 1.7908 3.9998 3.9998-1.7908 3.9998-3.9998 3.9998z" />
    </>
  ),
};

// White line glyphs drawn on the other platforms' brand-coloured discs.
const GLYPHS = {
  instagram: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.6" cy="7.4" r=".6" fill="currentColor" />
    </>
  ),
  tiktok: <path d="M13.5 4.5v9.8a3.3 3.3 0 1 1-3.3-3.3M13.5 4.5c.5 2.3 2 3.7 4.5 3.9" />,
  linkedin: <path d="M7.5 10.5v7M7.5 6.8v.1M11.5 17.5v-7M11.5 13.6c0-1.9 1.2-3.1 2.8-3.1s2.7 1 2.7 3v4" />,
  pinterest: <path d="M10.4 19.5 12.2 11M9.2 14.6c-1-.7-1.6-1.8-1.6-3.2 0-2.7 2-4.9 4.8-4.9 2.6 0 4.2 1.7 4.2 4.1 0 2.8-1.6 4.8-3.6 4.8-1 0-1.7-.6-1.6-1.6" />,
};

function PlatformIcon({ platform }) {
  const logo = LOGOS[platform.key];
  return (
    <span className="mc-picon" data-k={platform.key} style={{ "--pc": platform.color }} aria-hidden="true">
      {logo ? (
        <svg viewBox="0 0 24 24">{logo}</svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {GLYPHS[platform.key]}
        </svg>
      )}
    </span>
  );
}

// What a platform fills in the current view: Quick Grid cards or Node Studio nodes.
const fills = (platform, view) =>
  view === "nodes"
    ? platform.nodes.map((c) => NODE_CATS[c]?.label).filter(Boolean)
    : platform.media.map((m) => MEDIA_BY_KEY[m]?.label).filter(Boolean);

const pickedLabel = (picked) =>
  !picked.length ? "All platforms" : picked.length === 1 ? picked[0].label : `${picked[0].label} +${picked.length - 1}`;

const Chevron = ({ up }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={up ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
  </svg>
);

export default function MessageComposer({ value, onChange, platforms, onPlatforms, view, onGenerate, generating }) {
  const [minimized, setMin] = useState(false);
  const textRef = useRef(null);
  const picked = platforms.map((k) => GEN_PLATFORMS_BY_KEY[k]).filter(Boolean);

  // A mouse wheel scrolls the chip row sideways.
  const onChipsWheel = (event) => {
    const el = event.currentTarget;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft += event.deltaY;
  };

  // Kept in GEN_PLATFORMS order so the request reads the same way every time.
  const toggle = (key) => {
    const next = new Set(platforms);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onPlatforms(GEN_PLATFORMS.filter((p) => next.has(p.key)).map((p) => p.key));
  };

  // One line until the message wraps, then grows to the CSS max-height.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, minimized]);

  const onKeyDown = (event) => {
    // Enter generates, Shift+Enter adds a line (Ctrl/⌘+Enter is the app-wide shortcut).
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    onGenerate();
  };

  if (minimized) {
    return (
      <button type="button" className="mc-tab" aria-expanded="false" title="Show message and platforms" onClick={() => setMin(false)}>
        {picked.length ? (
          <span className="mc-tab-icons">{picked.slice(0, 3).map((p) => <PlatformIcon key={p.key} platform={p} />)}</span>
        ) : null}
        <span>{pickedLabel(picked)}</span>
        <Chevron up />
      </button>
    );
  }

  return (
    <div className="mc">
      <div className="mc-head">
        <span className="mc-head-title" id="mc-platforms-label">Choose platforms</span>
        <span className="mc-head-hint">copy is tuned to each</span>
        <button type="button" className="mc-min-btn" aria-expanded="true" aria-label="Minimize" title="Minimize" onClick={() => setMin(true)}>
          <Chevron />
        </button>
      </div>

      <div className="mc-chips" role="group" aria-labelledby="mc-platforms-label" onWheel={onChipsWheel}>
        <button
          type="button"
          className={"mc-chip mc-all" + (picked.length ? "" : " on")}
          aria-pressed={!picked.length}
          title="Generate for every platform"
          onClick={() => onPlatforms([])}
        >
          All
        </button>
        {GEN_PLATFORMS.map((p) => {
          const on = platforms.includes(p.key);
          return (
            <button
              key={p.key}
              type="button"
              className={"mc-chip mc-chip-icon" + (on ? " on" : "")}
              style={{ "--pc": p.color }}
              aria-pressed={on}
              aria-label={p.label}
              title={`${p.label} — fills ${fills(p, view).join(", ")}`}
              onClick={() => toggle(p.key)}
            >
              <PlatformIcon platform={p} />
            </button>
          );
        })}
      </div>

      <div className="mc-field">
        <textarea
          ref={textRef}
          className="mc-input"
          rows={2}
          maxLength={MAX_MESSAGE}
          placeholder="Message to adapt — e.g. Our autumn candles are hand-poured in small batches."
          aria-label="Message to adapt"
          title="Enter to generate · Shift+Enter for a new line"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="mc-send"
          aria-label={generating ? "Generating" : "Generate"}
          title={generating ? "Generating…" : "Generate (Enter)"}
          aria-busy={generating || undefined}
          disabled={generating}
          onClick={onGenerate}
        >
          {generating ? (
            <span className="mc-spinner" aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
