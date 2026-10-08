import { useEffect, useRef, useState } from "react";
import { useCopyFeedback } from "../../hooks/useCopyFeedback";

const RegenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4.5a7.5 7.5 0 1 0 7.5 7.5" />
    <path d="M12 1.5v6l4.2-3z" fill="currentColor" stroke="none" />
    <path d="M12 4.5h2.2" />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="8.5" y="8.5" width="11" height="11" rx="3" />
    <path d="M15.5 5.6c0-1.3-.9-2.1-2.1-2.1H6.1C4.8 3.5 4 4.4 4 5.6v7.3c0 1.2.8 2.1 2 2.1h.5" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m4.5 12.5 5 5L19.5 7" />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5.5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="18.5" cy="12" r="1.8" />
  </svg>
);

function MoreMenu({ label, onDuplicate, onDelete, disabled }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (fn) => () => { setOpen(false); fn(); };

  return (
    <div className="ncard-more" ref={rootRef}>
      {/* <button
        type="button"
        className="ncard-action"
        aria-label={`More actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreIcon />
      </button> */}
      {open && (
        <div className="ncard-menu" role="menu">
          <button type="button" role="menuitem" onClick={run(onDuplicate)}>Duplicate</button>
          <button type="button" role="menuitem" className="danger" onClick={run(onDelete)}>Delete</button>
        </div>
      )}
    </div>
  );
}

export default function NodeActions({
  label, busy, canCopy, preview, onTogglePreview, regenDisabled, regenTitle, onRegenerate, onCopy, onDuplicate, onDelete,
}) {
  const [copied, flashCopied] = useCopyFeedback();

  const copy = async () => {
    if (await onCopy()) flashCopied();
  };

  return (
    <div className="ncard-actions">
      {onTogglePreview && (canCopy || preview) && (
        <button
          type="button"
          className={"ncard-action" + (preview ? " is-on" : "")}
          title={preview ? "Back to text" : `Preview ${label} in context`}
          aria-label={preview ? `Show ${label} as text` : `Preview ${label} in context`}
          aria-pressed={Boolean(preview)}
          disabled={!canCopy}
          onClick={onTogglePreview}
        >
          <EyeIcon />
        </button>
      )}
      <button
        type="button"
        className={"ncard-action" + (busy ? " is-spinning" : "")}
        title={regenTitle || `Regenerate ${label}`}
        aria-label={`Regenerate ${label}`}
        disabled={busy || regenDisabled}
        onClick={onRegenerate}
      >
        <RegenIcon />
      </button>
      <button
        type="button"
        className={"ncard-action" + (copied ? " is-copied" : "")}
        title={copied ? "Copied" : `Copy ${label}`}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        disabled={!canCopy}
        onClick={copy}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
      <MoreMenu label={label} disabled={busy} onDuplicate={onDuplicate} onDelete={onDelete} />
    </div>
  );
}
