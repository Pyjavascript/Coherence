import { useEffect, useId, useRef, useState } from "react";
import { Skeleton } from "./OutputCard";
import { useCopyFeedback } from "../hooks/useCopyFeedback";
import { timeUntilReset } from "../lib/hookQuota";
import { describeError } from "../services/ai";
import { EASE_OUT, reducedMotion } from "../lib/motion";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(root) {
  if (!root) return [];
  return [...root.querySelectorAll(FOCUSABLE)].filter((el) => !el.closest("[inert]"));
}

// Move focus into the dialog, keep Tab inside it, and restore focus on close.
// Escape closes unless something inside (e.g. a dropdown) already handled it.
export function useDialogBehavior(onClose, focusRef) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement;
    const root = panelRef.current;
    const items = focusableIn(root);
    (focusRef?.current || items[0])?.focus();

    const onKey = (event) => {
      if (event.key === "Escape") {
        if (event.defaultPrevented) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const list = focusableIn(root);
      if (!list.length) {
        event.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      const inside = root.contains(active);
      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, [focusRef]);

  // Dialogs size to their content, and CSS can't tween between two
  // `height: auto` values: when the height changes (e.g. a hook result lands),
  // play the old height to the new one.
  useEffect(() => {
    const shell = panelRef.current;
    if (!shell?.animate || typeof ResizeObserver === "undefined") return undefined;
    const born = performance.now();
    let last = null;
    let anim = null;
    const ro = new ResizeObserver(() => {
      if (anim) return; // ignore the sizes our own animation produces
      const h = shell.offsetHeight; // layout height, free of the entrance scale
      // A section already sliding open (grid-template-rows transition) animates
      // the height itself; tweening on top of it would fight it.
      const sliding = shell.getAnimations?.({ subtree: true }).some((a) => a.transitionProperty === "grid-template-rows");
      if (sliding) {
        last = h;
        return;
      }
      // Don't tween while the dialog is still entering, or for sub-pixel jitter.
      if (last === null || performance.now() - born < 500 || Math.abs(h - last) < 2 || reducedMotion()) {
        last = h;
        return;
      }
      const from = last;
      last = h;
      anim = shell.animate([{ height: `${from}px` }, { height: `${h}px` }], { duration: 320, easing: EASE_OUT });
      anim.onfinish = anim.oncancel = () => { anim = null; last = shell.offsetHeight; };
    });
    ro.observe(shell);
    return () => ro.disconnect();
  }, []);

  return panelRef;
}

// Dismiss only when the pointer starts and ends on the overlay, so dragging
// a text selection out of a field does not close the dialog.
export function useOverlayDismiss(onClose) {
  const armed = useRef(false);
  return {
    onPointerDown: (event) => { armed.current = event.target === event.currentTarget; },
    onPointerUp: (event) => {
      if (armed.current && event.target === event.currentTarget) onClose();
      armed.current = false;
    },
  };
}

// X-cross close glyph used by every navy dialog in the design.
export const CloseBar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export function Modal({ title, subtitle, onClose, children, modalClassName = "", overlayClassName = "" }) {
  const titleId = useId();
  const panelRef = useDialogBehavior(onClose);
  const dismiss = useOverlayDismiss(onClose);
  return (
    <div className={`overlay ${overlayClassName}`.trim()} {...dismiss}>
      <section ref={panelRef} className={`modal ${modalClassName}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head">
          <h3 id={titleId}>{title}</h3>
          <button type="button" aria-label={`Close ${title}`} onClick={onClose}><CloseBar /></button>
        </div>
        {subtitle && <p className="modal-subtitle">{subtitle}</p>}
        {children}
      </section>
    </div>
  );
}

// Yes/no dialog for destructive or lossy actions.
const CONFIRM_ICONS = {
  // Warning triangle — losing unsaved work.
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4.5" />
      <path d="M12 17.2h.01" />
    </svg>
  ),
  // Trash — permanent delete.
  delete: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3l.8-12.2" />
      <path d="M10 10.5v6M14 10.5v6" />
    </svg>
  ),
};

// Yes/no dialog. The two buttons are the only choices, so there's no ✕;
// Esc and clicking outside still cancel. Destructive confirms focus Cancel,
// so a stray Enter never deletes anything.
export function ConfirmModal({
  title, body, note, icon = "warning", confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "danger", onConfirm, onClose,
}) {
  const titleId = useId();
  const bodyId = useId();
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const focusRef = tone === "danger" ? cancelRef : confirmRef;
  const panelRef = useDialogBehavior(onClose, focusRef);
  const dismiss = useOverlayDismiss(onClose);

  return (
    <div className="overlay confirm-overlay" {...dismiss}>
      <section ref={panelRef} className={"confirm-dialog is-" + tone} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}>
        <span className="confirm-icon">{CONFIRM_ICONS[icon] || CONFIRM_ICONS.warning}</span>
        <h2 id={titleId} className="confirm-title">{title}</h2>
        <div id={bodyId} className="confirm-text">
          <p className="confirm-body">{body}</p>
          {note && <p className="confirm-note">{note}</p>}
        </div>
        <div className="confirm-actions">
          <button type="button" ref={cancelRef} className="confirm-cancel" onClick={onClose}>{cancelLabel}</button>
          <button
            type="button"
            ref={confirmRef}
            className={"confirm-ok is-" + tone}
            onClick={() => { onClose(); onConfirm(); }}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function CoherenceModal({ text, onCopy, onClose }) {
  const [prompt, setPrompt] = useState(text);
  const [copied, flashCopied] = useCopyFeedback();
  const panelRef = useDialogBehavior(onClose);
  const dismiss = useOverlayDismiss(onClose);

  useEffect(() => {
    setPrompt(text);
  }, [text]);

  const copyPrompt = async () => {
    const succeeded = await onCopy(prompt);
    if (succeeded) flashCopied();
  };

  return (
    <div className="overlay coherence-overlay" {...dismiss}>
      <section
        ref={panelRef}
        className="coherence-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coherence-title"
        aria-describedby="coherence-description"
      >
        <header className="coherence-header">
          <h2 id="coherence-title">Coherence Prompt</h2>
          <div className="coherence-header-actions">
            <button className="coherence-close" type="button" aria-label="Close coherence prompt" onClick={onClose}><CloseBar /></button>
          </div>
        </header>
        <div className="coherence-content" id="coherence-content">
          <p className="coherence-description" id="coherence-description">
            Your brand controls as a ChatGPT prompt. Paste it in to get on-brand copy.
          </p>
          <div className="coherence-panel">
            <textarea
              className="coherence-prompt"
              aria-label="Coherence prompt (editable)"
              spellCheck="false"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <button className="coherence-copy" type="button" onClick={copyPrompt}>
              <span>{copied ? "Copied!" : "Copy Prompt"}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="8.5" y="8.5" width="12" height="12" rx="3.5" />
                <path d="M15.5 8.5V7a3.5 3.5 0 0 0-3.5-3.5H7A3.5 3.5 0 0 0 3.5 7v5A3.5 3.5 0 0 0 7 15.5h1.5" />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Opening the dialog generates the hook straight from the brand (no brief to
// write); the only action is Copy.
export function HookModal({ aiAvailable, quota, onGenerate, onUsed, onCopy, onClose }) {
  const usedUp = Boolean(quota) && quota.left <= 0;
  const usedUpText = () => `You've used today's free hook. The next one unlocks in ${timeUntilReset()}.`;
  const [out, setOut] = useState(() => (usedUp
    ? { state: "msg", text: usedUpText() }
    : !aiAvailable
      ? { state: "msg", text: "AI generation isn't available here." }
      : { state: "loading", text: "" }));
  const [copied, flashCopied] = useCopyFeedback();
  // One request per opening, even when StrictMode runs the effect twice.
  const started = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!started.current && out.state === "loading") {
      started.current = true;
      (async () => {
        let next;
        try {
          next = { state: "ready", text: await onGenerate() };
          onUsed?.();
        } catch (e) {
          if (e?.code === "hook_limit") onUsed?.();
          next = {
            state: "msg",
            text: e?.code === "hook_limit" ? usedUpText()
              : e?.code === "limit_reached" ? describeError(e)
              : "Couldn't generate a hook. Close and try again.",
          };
        }
        if (mounted.current) setOut(next);
      })();
    }
    return () => { mounted.current = false; };
  }, []); // on open only

  const copyHook = async () => {
    if (out.state === "ready" && await onCopy(out.text)) flashCopied();
  };

  return (
    <Modal title="Hook Generator" onClose={onClose} modalClassName="hook-modal">
      <div className="hook-modal-content">
        <p className="hook-description">A brand-aligned hook, written from your brand's message.</p>
        <div className="hook-panel">
          <section className="hook-result" aria-live="polite" aria-busy={out.state === "loading"}>
            <span className="hook-result-label">Your hook</span>
            {out.state === "loading" && <Skeleton />}
            {out.state === "ready" && <div className="hook-result-text">{out.text}</div>}
            {out.state === "msg" && <div className="hook-result-message">{out.text}</div>}
          </section>
          <button
            className="hook-copy"
            type="button"
            onClick={copyHook}
            disabled={out.state !== "ready"}
          >
            {copied ? "Copied ✓" : "Copy hook"}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="8.5" y="8.5" width="12" height="12" rx="3.5" />
              <path d="M15.5 8.5V7a3.5 3.5 0 0 0-3.5-3.5H7A3.5 3.5 0 0 0 3.5 7v5A3.5 3.5 0 0 0 7 15.5h1.5" />
            </svg>
          </button>
        </div>
      </div>
    </Modal>
  );
}
