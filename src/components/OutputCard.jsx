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
export default function OutputCard({ meta, state, onRegen }) {
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

  return (
    <div className={"frame" + (meta.full ? " full" : "")}>
      <div className="frame-tag">
        <div className="name"><b>{meta.label}</b><em className="mono">{meta.tag}</em></div>
        <button className="frame-regen" title="Regenerate" onClick={onRegen}>↻</button>
      </div>
      <div className="frame-body">{body}</div>
      {state.status === "ready" && state.items.length > 1 && (
        <div className="frame-vtabs">
          {state.items.map((_, i) => (
            <button key={i} className={"vtab" + (i === idx ? " on" : "")} onClick={() => setIdx(i)}>{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
}
