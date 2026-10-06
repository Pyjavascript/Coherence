import { useState, useEffect } from "react";

export function Skeleton() {
  return (
    <>
      <div className="skel w60" />
      <div className="skel" />
    </>
  );
}

// state = { status: 'idle' | 'loading' | 'error' | 'ready', items: [], message?: string }
export default function OutputCard({ meta, state, onRegen, onCopy }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [state.items]);

  const item = state.items[idx];
  let headline = "", sub = null;
  if (item != null) {
    if (meta.key === "packaging" || meta.key === "marketing") headline = item;
    else if (meta.key === "email") { headline = item.subject; sub = item.preview; }
    else { headline = item.headline; sub = item.sub; }
  }

  let body;
  if (state.status === "loading") body = <Skeleton />;
  else if (state.status === "error") body = <div className="frame-placeholder">{state.message || "Couldn't generate — try again."}</div>;
  else if (state.status === "idle") body = <div className="frame-placeholder">{meta.placeholder}</div>;
  else if (item == null) body = <div className="frame-placeholder">No output yet.</div>;
  else body = (
    <>
      <div className="frame-headline">{headline}</div>
      {sub ? <div className="frame-sub">{sub}</div> : null}
    </>
  );

  const canCopy = state.status === "ready" && item != null;
  const copyText = [headline, sub].filter(Boolean).join("\n");

  return (
    <article className={"frame" + (meta.full ? " full" : "")} data-category={meta.key}>
      <header className="frame-tag">
        <h2 className="frame-pill">
          <span className="frame-dot" aria-hidden="true" />
          {meta.label}
        </h2>
        <span className="frame-hint">{meta.tag}</span>
        <div className="frame-actions">
          <button
            type="button"
            className="frame-action frame-regen"
            title={`Regenerate ${meta.label} copy`}
            aria-label={`Regenerate ${meta.label} copy`}
            onClick={onRegen}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4.5a7.5 7.5 0 1 0 7.5 7.5" />
              <path d="M12 1.5v6l4.2-3z" fill="currentColor" stroke="none" />
              <path d="M12 4.5h2.2" />
            </svg>
          </button>
          <button
            type="button"
            className="frame-action frame-copy"
            title={`Copy ${meta.label} copy`}
            aria-label={`Copy ${meta.label} copy`}
            disabled={!canCopy}
            onClick={() => onCopy(copyText)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="8.5" y="8.5" width="11" height="11" rx="3" />
              <path d="M15.5 5.6c0-1.3-.9-2.1-2.1-2.1H6.1C4.8 3.5 4 4.4 4 5.6v7.3c0 1.2.8 2.1 2 2.1h.5" />
            </svg>
          </button>
        </div>
      </header>
      <div className={"frame-body" + (canCopy ? " is-generated" : "")} aria-live="polite">
        {body}
      </div>
      {state.status === "ready" && state.items.length > 1 && (
        <div className="frame-vtabs">
          {state.items.map((_, i) => (
            <button key={i} className={"vtab" + (i === idx ? " on" : "")} onClick={() => setIdx(i)}>{i + 1}</button>
          ))}
        </div>
      )}
    </article>
  );
}
