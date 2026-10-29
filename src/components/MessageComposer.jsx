import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Always-open box at the bottom centre of the stage: the brand's message to
// adapt (the only place it is edited) with the round Generate arrow beside it,
// and the missing-message error below when there is one. While generating, a
// rainbow ring runs round the box.
// A new focusRequest object (Generate without a message) focuses the message
// and flags it.

const MAX_MESSAGE = 2000; // the generate function's cap on brand.message

const ArrowUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
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
          placeholder="What do you want to generate?"
          aria-label="Message to adapt"
          aria-required="true"
          aria-invalid={showError || undefined}
          aria-describedby={showError ? "mc-message-error" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {/* An arrow button; while generating the arrow becomes a pulsing
            square, like ChatGPT's. Filled once there's a message. */}
        <button
          type="button"
          className={"mc-send" + (value.trim() ? " is-ready" : "") + (atGenLimit ? " is-limited" : "")}
          aria-label={generating ? `Generating${generatingDetail ? ` ${generatingDetail}` : ""}` : "Generate"}
          title={atGenLimit ? "Daily generation limit reached" : generating ? "Generating…" : "Generate (Enter)"}
          aria-busy={generating || undefined}
          aria-disabled={atGenLimit || undefined}
          disabled={generating}
          onClick={onGenerate}
        >
          {generating ? <span className="mc-stop" aria-hidden="true" /> : <ArrowUpIcon />}
        </button>
        {showError && (
          <p id="mc-message-error" className="mc-error">Write a message to generate every format.</p>
        )}
      </div>
    </div>
  );
}
