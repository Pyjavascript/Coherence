import NodePreview from "./NodePreview";

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

// Body of a node: placeholder, skeleton, error, preview, or the generated copy.
// `version` changes every time new content lands, re-running the fade-in.
export default function NodeContent({ meta, brand, status, item, version, message, preview, onRetry, onEdit }) {
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
        <p className="ncard-placeholder">{meta.placeholder}</p>
      </div>
    );
  }

  const busy = status === "loading";

  if (preview) {
    return (
      <div className={"ncard-body is-preview" + (busy ? " is-refreshing" : "")} aria-busy={busy}>
        <NodePreview type={meta.key} item={item} brand={brand} />
      </div>
    );
  }

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
    </div>
  );
}
