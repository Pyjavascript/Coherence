import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Always-open box at the bottom centre of the stage: the brand's message to
// adapt (the only place it is edited) with the Generate button beside it,
// centred on the field, and the missing-message error below when there is one. While generating, a rainbow ring runs round the box.
// A new focusRequest object (Generate without a message) focuses the message
// and flags it.

const MAX_MESSAGE = 2000; // the generate function's cap on brand.message

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.7 3.05a.5.5 0 0 0-.68.63l2.84 7.62a2 2 0 0 1 0 1.4l-2.84 7.62a.5.5 0 0 0 .68.63l18-8.5a.5.5 0 0 0 0-.9z" />
    <path d="M6 12h15.5" />
  </svg>
);

// generatingDetail: what is being generated (e.g. "5 cards"), shown on the button.
// atGenLimit: the daily limit is reached; Generate still reports it when pressed.
export default function MessageComposer({ value, onChange, onGenerate, generating, generatingDetail, atGenLimit, focusRequest }) {
  const [flagged, setFlagged] = useState(false);
  const textRef = useRef(null);
  const showError = flagged && !value.trim();

  useEffect(() => {
    if (!focusRequest) return;
    setFlagged(true);
    textRef.current?.focus();
  }, [focusRequest]);

  useEffect(() => {
    if (value.trim()) setFlagged(false);
  }, [value]);

  // Two lines until the message wraps further, then grows to the CSS max-height.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const onKeyDown = (event) => {
    // Enter generates, Shift+Enter adds a line (Ctrl/⌘+Enter is the app-wide shortcut).
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    onGenerate();
  };

  return (
    <div className={"mc" + (generating ? " is-busy" : "") + (showError ? " is-invalid" : "")}>
      <div className="mc-surface">
        <textarea
          ref={textRef}
          className="mc-input"
          rows={1}
          maxLength={MAX_MESSAGE}
          placeholder="Type the message to adapt…"
          aria-label="Message to adapt"
          aria-required="true"
          aria-invalid={showError || undefined}
          aria-describedby={showError ? "mc-message-error" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className={"mc-send" + (atGenLimit ? " is-limited" : "")}
          aria-label={generating ? "Generating" : "Generate"}
          title={atGenLimit ? "Daily generation limit reached" : generating ? "Generating…" : "Generate (Enter)"}
          aria-busy={generating || undefined}
          aria-disabled={atGenLimit || undefined}
          disabled={generating}
          onClick={onGenerate}
        >
          <span className="mc-send-label">{generating ? "Generating" : "Generate"}</span>
          {generating && generatingDetail && <span className="mc-send-detail">· {generatingDetail}</span>}
          {generating ? <span className="mc-spinner" aria-hidden="true" /> : <SendIcon />}
        </button>
        {showError && (
          <p id="mc-message-error" className="mc-error">Write a message to generate every format.</p>
        )}
      </div>
    </div>
  );
}
