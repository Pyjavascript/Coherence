// Click-to-edit text (single paragraph: Enter saves, Esc cancels). Remounts (key)
// whenever the committed value changes, so React never reconciles against DOM
// the browser edited.
function EditableText({ className, value, label, onCommit }) {
  if (!onCommit) return <p className={className}>{value}</p>;
  return (
    <p
      key={value}
      className={className + " is-editable"}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-label={label}
      tabIndex={0}
      title="Click to edit · Enter to save · Esc to cancel"
      onKeyDown={(e) => {
        // Keep Enter/Esc here: they shouldn't also trigger app shortcuts (Ctrl+Enter = Generate).
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          e.stopPropagation();
          e.currentTarget.textContent = value;
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        const next = e.currentTarget.textContent.replace(/\s+/g, " ").trim();
        if (!next) e.currentTarget.textContent = value;
        else if (next !== value) onCommit(next);
      }}
    >
      {value}
    </p>
  );
}

const countWords = (text) => String(text || "").trim().split(/\s+/).filter(Boolean).length;

// A medium with a heading and a description (email, website, advertising):
// two boxes, the heading's sized to its text and the description's filling
// the rest, with its word count at the bottom-left.
function SplitContent({ meta, status, item, version, onEdit, footer }) {
  const labels = meta.limits || {};
  const target = labels.sub?.words;
  const busy = status === "loading";
  const edit = busy || !onEdit ? undefined : onEdit;

  if (busy && !item) {
    return (
      <div className="ncard-split" aria-busy="true">
        <div className="ncard-body ncard-body-head"><div className="ncard-skel w70" /></div>
        <div className="ncard-body ncard-body-desc">
          <div className="ncard-skel" />
          <div className="ncard-skel" />
          <div className="ncard-skel w40" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="ncard-split">
        <div className="ncard-body ncard-body-head">
          <p className="ncard-headline ncard-placeholder">Generated heading</p>
        </div>
        <div className="ncard-body ncard-body-desc">
          <p className="ncard-sub ncard-placeholder">Generated description appears here</p>
          {target ? <div className="ncard-words">{target} words</div> : null}
        </div>
      </div>
    );
  }

  const state = " is-generated" + (busy ? " is-refreshing" : "");
  return (
    <div className="ncard-split" aria-live="polite" aria-busy={busy}>
      <div className={"ncard-body ncard-body-head" + state}>
        <div className="ncard-copy" key={version}>
          <EditableText
            className="ncard-headline"
            value={item.headline}
            label={`${meta.label} ${labels.headline?.label || "headline"}`}
            onCommit={edit && ((text) => edit("headline", text))}
          />
        </div>
      </div>
      <div className={"ncard-body ncard-body-desc" + state}>
        <div className="ncard-copy" key={version}>
          {item.sub ? (
            <EditableText
              className="ncard-sub"
              value={item.sub}
              label={`${meta.label} ${labels.sub?.label || "supporting line"}`}
              onCommit={edit && ((text) => edit("sub", text))}
            />
          ) : null}
        </div>
        <div className="ncard-words">
          {target ? `${countWords(item.sub)} / ${target} words` : `${countWords(item.sub)} words`}
        </div>
        {footer}
      </div>
    </div>
  );
}

// Body of a node: placeholder, skeleton, error, or the generated copy.
// `version` changes every time new content lands, re-running the fade-in.
// footer: shown under the generated copy, bottom-right (the Copy button).
export default function NodeContent({ meta, status, item, version, message, onRetry, onEdit, footer }) {
  // Two boxes only when the backend gives this medium a description (its
  // limits have a `sub`), and, once copy is in, only if a description came back.
  const split = Boolean(meta.limits?.sub) && !(status === "error" && !item) && (!item || Boolean(item.sub));
  if (split) {
    return <SplitContent meta={meta} status={status} item={item} version={version} onEdit={onEdit} footer={footer} />;
  }

  if (status === "loading" && !item) {
    return (
      <div className="ncard-body" aria-busy="true">
        <div className="ncard-skel w70" />
        <div className="ncard-skel" />
        <div className="ncard-skel w40" />
      </div>
    );
  }

  if (status === "error" && !item) {
    return (
      <div className="ncard-body is-error" role="status">
        <p>{message || "Couldn't generate — try again."}</p>
        <button type="button" className="ncard-retry" onClick={onRetry}>Try again</button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="ncard-body">
        {/* The same line as an empty Node Studio node, in the headline's style. */}
        <p className="ncard-headline ncard-placeholder">Generated copy<br />appears here</p>
      </div>
    );
  }

  const busy = status === "loading";

  const edit = busy || !onEdit ? undefined : onEdit;
  const labels = meta.limits || {};

  return (
    <div className={"ncard-body is-generated" + (busy ? " is-refreshing" : "")} aria-live="polite" aria-busy={busy}>
      <div className="ncard-copy" key={version}>
        <EditableText
          className="ncard-headline"
          value={item.headline}
          label={`${meta.label} ${labels.headline?.label || "headline"}`}
          onCommit={edit && ((text) => edit("headline", text))}
        />
        {item.sub ? (
          <EditableText
            className="ncard-sub"
            value={item.sub}
            label={`${meta.label} ${labels.sub?.label || "supporting line"}`}
            onCommit={edit && ((text) => edit("sub", text))}
          />
        ) : null}
      </div>
      {footer}
    </div>
  );
}
