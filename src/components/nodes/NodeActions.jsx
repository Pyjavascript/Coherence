import { useEffect, useRef, useState } from "react";
import { useCopyFeedback } from "../../hooks/useCopyFeedback";
import { EASE_SPRING, reducedMotion, tokenMs } from "../../lib/motion";

const RegenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4.5a7.5 7.5 0 1 0 7.5 7.5" />
    <path d="M12 1.5v6l4.2-3z" fill="currentColor" stroke="none" />
    <path d="M12 4.5h2.2" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m4.5 12.5 5 5L19.5 7" />
  </svg>
);

const SlidersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2.2" />
    <circle cx="9" cy="17" r="2.2" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M7 7l10 10M17 7L7 17" />
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

// The "Copy" button under the card's copy box: Node Studio's Copy
// (.sn-card-copy, studio-card.css), the light button with just the word,
// "✓ Copied" for a moment after a click. Disabled until there's copy.
export function CopyButton({ label, onCopy, disabled = false }) {
  const [copied, flashCopied] = useCopyFeedback();

  const copy = async (event) => {
    // A small spring pop on press; restarts cleanly on rapid repeat clicks.
    if (!reducedMotion()) {
      event.currentTarget.animate(
        [{ scale: 0.9 }, { scale: 1.08, offset: 0.55 }, { scale: 1 }],
        { duration: tokenMs("--pl-d-3", 320), easing: EASE_SPRING },
      );
    }
    if (await onCopy()) flashCopied();
  };

  return (
    <button
      type="button"
      className={"sn-card-copy" + (copied ? " is-copied" : "")}
      title={disabled ? "Generate copy first" : copied ? "Copied" : `Copy ${label}`}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      disabled={disabled}
      onClick={copy}
    >
      {copied && <CheckIcon />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

// The card's bottom row, as on a Node Studio node (NodeStudio.jsx
// .sn-card-foot): Copy on the left; regenerate and the green Generate arrow
// on the right. The arrow generates this card alone (its first copy, or new
// copy); regenerate needs copy to be there first.
export function CardFoot({ label, busy, canCopy, canRegenerate, regenDisabled, regenTitle, onCopy, onRegenerate, onBlocked }) {
  const run = () => {
    if (regenDisabled) {
      onBlocked?.();
      return;
    }
    onRegenerate();
  };

  return (
    <div className="sn-card-foot ncard-foot">
      <CopyButton label={label} disabled={!canCopy} onCopy={onCopy} />
      <div className="sn-card-actions">
        <button
          type="button"
          className={"sn-card-btn sn-card-regen" + (busy ? " is-spinning" : "")}
          title={regenTitle || (canRegenerate ? "Regenerate" : "Generate copy first to regenerate it")}
          aria-label={`Regenerate ${label}`}
          disabled={busy || !canRegenerate}
          aria-disabled={regenDisabled || undefined}
          onClick={run}
        >
          <RegenIcon />
        </button>
        <button
          type="button"
          className="sn-card-go"
          title={regenTitle || (busy ? "Generating…" : "Generate")}
          aria-label={busy ? "Generating" : canRegenerate ? `Generate ${label} again` : `Generate ${label}`}
          aria-busy={busy || undefined}
          aria-disabled={regenDisabled || undefined}
          disabled={busy}
          onClick={run}
        >
          {busy ? <span className="sn-card-spin" aria-hidden="true" /> : <ArrowIcon />}
        </button>
      </div>
    </div>
  );
}

// showRegen: the header's regenerate. Off while the card shows its copy (the
// bottom row has it then); on while the settings hide that row.
export default function NodeActions({
  label, busy, canRegenerate = true, settingsOpen, customised, onToggleSettings, showRegen = true,
  regenDisabled, regenTitle, onRegenerate, onBlocked, onDuplicate, onDelete, onClose,
}) {
  return (
    <div className="ncard-actions">
      {onToggleSettings && (
        <button
          type="button"
          className={"ncard-action ncard-settings-btn" + (settingsOpen ? " is-on" : "") + (customised ? " has-dot" : "")}
          title={settingsOpen ? "Back to copy" : `${label} settings${customised ? " (customised)" : ""}`}
          aria-label={`${label} settings`}
          aria-pressed={settingsOpen}
          onClick={onToggleSettings}
        >
          <SlidersIcon />
        </button>
      )}
      {showRegen && <button
        type="button"
        className={"ncard-action ncard-regen" + (busy ? " is-spinning" : "")}
        title={regenTitle || (canRegenerate ? `Regenerate ${label}` : "Generate copy first to regenerate it")}
        aria-label={`Regenerate ${label}`}
        disabled={busy || !canRegenerate}
        aria-disabled={regenDisabled || undefined}
        onClick={() => {
          if (regenDisabled) {
            onBlocked?.();
            return;
          }
          onRegenerate();
        }}
      >
        <RegenIcon />
      </button>}
      {/* MoreMenu's "⋯" button is switched off, and its empty wrapper still
          took a flex slot, doubling the gap between regenerate and ×. Render
          it again together with that button:
          <MoreMenu label={label} disabled={busy} onDuplicate={onDuplicate} onDelete={onDelete} /> */}
      {onClose && (
        <button
          type="button"
          className="ncard-action ncard-close"
          title={`Remove ${label}`}
          aria-label={`Remove ${label}`}
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}
