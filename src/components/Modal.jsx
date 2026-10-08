import { useEffect, useId, useRef, useState } from "react";
import { Skeleton } from "./OutputCard";
import { useCopyFeedback } from "../hooks/useCopyFeedback";
import { timeUntilReset } from "../lib/hookQuota";

// Escape closes the dialog unless something inside (e.g. a dropdown) handled it first.
function useEscape(onClose) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
}

// X-cross close glyph used by every navy dialog in the design.
export const CloseBar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export function Modal({ title, subtitle, onClose, children, modalClassName = "" }) {
  const titleId = useId();
  useEscape(onClose);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className={`modal ${modalClassName}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
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
// Destructive confirms focus Cancel, so a stray Enter never deletes anything.
export function ConfirmModal({ title, body, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "danger", onConfirm, onClose }) {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  useEffect(() => { (tone === "danger" ? cancelRef : confirmRef).current?.focus(); }, [tone]);
  return (
    <Modal title={title} onClose={onClose} modalClassName="hook-modal confirm-modal">
      <p className="confirm-body">{body}</p>
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
    </Modal>
  );
}

export function CoherenceModal({ text, onCopy, onClose }) {
  const [prompt, setPrompt] = useState(text);
  const [copied, flashCopied] = useCopyFeedback();
  useEscape(onClose);

  useEffect(() => {
    setPrompt(text);
  }, [text]);

  const copyPrompt = async () => {
    const succeeded = await onCopy(prompt);
    if (succeeded) flashCopied();
  };

  return (
    <div className="overlay coherence-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        className="coherence-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coherence-title"
        aria-describedby="coherence-description"
      >
        <header className="coherence-header">
          <h2 id="coherence-title">Coherence Prompt</h2>
          <div className="coherence-header-actions">
            <button className="coherence-close" type="button" aria-label="Close coherence prompt" onClick={onClose}>×</button>
          </div>
        </header>
        <div className="coherence-content" id="coherence-content">
          <p className="coherence-description" id="coherence-description">
            Paste this into ChatGPT, Gemini, or any LLM to check whether your latest generation’s CTA and body copy actually align.
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

export function HookModal({ aiAvailable, quota, onGenerate, onUsed, onCopy, onClose }) {
  const [input, setInput] = useState("");
  const usedUp = Boolean(quota) && quota.left <= 0;
  const [out, setOut] = useState(() => (usedUp
    ? { state: "msg", text: `You've used today's free hook. The next one unlocks in ${timeUntilReset()}.` }
    : { state: "idle", text: "" }));
  const [copied, flashCopied] = useCopyFeedback();

  const run = async () => {
    const req = input.trim();
    if (usedUp) return setOut({ state: "msg", text: `You've used today's free hook. The next one unlocks in ${timeUntilReset()}.` });
    if (!req) return setOut({ state: "msg", text: "Describe what the hook is for first." });
    if (!aiAvailable) return setOut({ state: "msg", text: "AI generation isn't available here." });
    setOut({ state: "loading", text: "" });
    try {
      setOut({ state: "ready", text: await onGenerate(req) });
      onUsed?.();
    } catch (e) {
      setOut({ state: "msg", text: "Couldn't generate — try again." });
    }
  };

  const copyHook = async () => {
    if (await onCopy(out.state === "ready" ? out.text : "")) flashCopied();
  };

  return (
    <Modal title="Hook Generator" onClose={onClose} modalClassName="hook-modal">
      <div className="hook-modal-content">
        <p className="hook-description">Describe the moment this hook is for. It analyses your brief against the brand core and gives you one decisive line.</p>
        <div className="hook-panel">
          <label className="hook-label" htmlFor="hook-brief">What should this hook be about?</label>
          <textarea
            id="hook-brief"
            className="hook-brief"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Describe the moment, audience, or idea…"
          />
          <button className="hook-generate" type="button" onClick={run} disabled={out.state === "loading" || usedUp}>
            {out.state === "loading" ? "Generating…" : usedUp ? `Next free hook in ${timeUntilReset()}` : "Generate hook"}
          </button>
          <section className="hook-result" aria-live="polite">
            <span className="hook-result-label">Your hook</span>
            {out.state === "loading" && <Skeleton />}
            {out.state === "ready" && <div className="hook-result-text">{out.text}</div>}
            {out.state === "msg" && <div className="hook-result-message">{out.text}</div>}
            {out.state === "idle" && <div className="hook-result-message">Your generated hook will appear here.</div>}
          </section>
          <button
            className="hook-copy"
            type="button"
            onClick={copyHook}
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
