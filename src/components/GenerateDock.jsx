import { useCallback, useEffect, useRef, useState } from "react";

// The stage's bottom row (placed by layout/MainWorkspace.jsx): the dock.
//
// At rest it is a small dark capsule at the bottom centre holding three
// things: the crown (pricing), the spark (the hook generator popup) and a
// status dot (green once a message is waiting). Hovering, it swells a
// little. Clicking it (or pressing "/") springs it open into
// the full one-card-wide message box: the text at the top, the crown and the
// spark at the bottom left, the green send arrow at the bottom right. The
// crown and the spark glide from their place in the capsule to their place
// in the box. Typing a longer message grows the box upward, a line at a
// time. Enter sends; Shift + Enter is a new line. Clicking outside, Escape,
// or sending shrinks it back; the message is kept. While generating, the
// capsule widens into a live activity: a spinner, what's being generated,
// and moving bars.

const MAX_MESSAGE = 2000; // the generate function's cap on brand.message
// A longer message grows the open box upward, a line at a time, up to this
// many lines; past that it scrolls.
const MAX_LINES = 5;
const PLACEHOLDER = "What would you like to generate..";
// On load it swells once, so it's clear it can be pressed.
const HINT_DELAY = 1100;
const HINT_FOR = 1400;

export const COMPOSER_INPUT_ID = "composer-message";
const OPEN_EVENT = "composer:open";

// Opens the composer and puts the caret in it (App.jsx: Generate was pressed
// with no message). The input is hidden while it's a capsule, so it can't
// simply be focused by id.
export function openComposer() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

// Pricing: an orange crown.
const CrownIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3.2 8.2a1 1 0 0 1 1.62-.9l3.6 2.9 2.78-4.63a1 1 0 0 1 1.72 0l2.78 4.63 3.6-2.9a1 1 0 0 1 1.62.9l-1.2 8.3a1 1 0 0 1-.99.86H5.39a1 1 0 0 1-.99-.86l-1.2-8.3Z" />
    <rect x="5.2" y="18.6" width="13.6" height="2" rx="1" />
  </svg>
);

// Generate: a four-point spark.
const SparkIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 1.5c.55 5.4 3.6 9.45 10.5 10.5-6.9 1.05-9.95 5.1-10.5 10.5-.55-5.4-3.6-9.45-10.5-10.5C8.4 10.95 11.45 6.9 12 1.5Z" />
  </svg>
);

// True while typing somewhere: "/" belongs to that field then, not to us.
function isEditable(el) {
  if (!el || el === document.body) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

// message / onMessage: the brand's message to adapt.
// invalid: Generate was pressed with no message; the box is flagged until one is written.
// generatingDetail: what is being generated (e.g. "5 cards"), for the busy label.
// atGenLimit: the daily limit is reached; the arrow still says why when pressed.
// onPricing: the crown, opens the plans.
// onHook: the spark, opens the hook generator (Modal.jsx HookModal). Without
// it the spark just opens the message box.
export default function MessageComposer({
  message, onMessage, invalid = false, onGenerate, generating, generatingDetail, atGenLimit,
  onPricing, onHook,
}) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const formRef = useRef(null);
  const inputRef = useRef(null);
  const faceRef = useRef(null);
  const focusOnOpen = useRef(false);
  const busyLabel = `Generating${generatingDetail ? ` ${generatingDetail}` : ""}`;
  const draft = message.trim();

  const expand = useCallback(() => {
    focusOnOpen.current = true;
    setHint(false);
    setOpen(true);
  }, []);

  // returnFocus: hand focus back to the capsule (Escape), so the keyboard
  // isn't lost.
  const collapse = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) requestAnimationFrame(() => faceRef.current?.focus({ preventScroll: true }));
  }, []);

  // The caret goes in as soon as the box is shown (it's visible from the
  // first frame of opening; the shape catches up around it).
  useEffect(() => {
    if (!open || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }, [open]);

  // First visit of the page: it swells once so it's clear it can be pressed.
  // If the tour (or any dialog) is up, it waits until that's closed.
  useEffect(() => {
    let show;
    let hide;
    const blocked = () => formRef.current?.closest("[inert]")
      || document.querySelector('[role="dialog"], dialog[open], .overlay');
    const tryShow = () => {
      if (blocked()) {
        show = setTimeout(tryShow, 700);
        return;
      }
      setHint(true);
      hide = setTimeout(() => setHint(false), HINT_FOR);
    };
    show = setTimeout(tryShow, HINT_DELAY);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  // Grow with the message: the text box takes its content's height (up to
  // MAX_LINES lines) and the box grows upward by the extra (--cmp-grow).
  // Closed, or with one line, there's no extra. An empty box is one line
  // (the placeholder doesn't count). Measured again as its width changes: it
  // opens from the narrow capsule, so the text re-wraps as it widens.
  const fitRef = useRef(() => {});
  fitRef.current = () => {
    const input = inputRef.current;
    const form = formRef.current;
    if (!input || !form) return;
    const line = parseFloat(getComputedStyle(input).lineHeight) || 20;
    input.style.height = "auto";
    const lines = input.value ? input.scrollHeight : line;
    const content = Math.max(line, Math.min(lines, line * MAX_LINES));
    input.style.height = `${content}px`;
    const grow = open ? Math.round(content - line) : 0;
    form.style.setProperty("--cmp-grow", `${grow}px`);
  };
  useEffect(() => fitRef.current(), [message, open]);
  useEffect(() => {
    const input = inputRef.current;
    if (!input || typeof ResizeObserver === "undefined") return undefined;
    let lastWidth = input.offsetWidth;
    const observer = new ResizeObserver(() => {
      // Only width changes re-wrap the text (its own height changes don't).
      if (input.offsetWidth === lastWidth) return;
      lastWidth = input.offsetWidth;
      fitRef.current();
    });
    observer.observe(input);
    return () => observer.disconnect();
  }, []);

  // Opened from elsewhere (App: "Add a message to adapt first").
  useEffect(() => {
    window.addEventListener(OPEN_EVENT, expand);
    return () => window.removeEventListener(OPEN_EVENT, expand);
  }, [expand]);

  // "/" opens it from anywhere that isn't a text field (and not while a
  // drawer or dialog has made the workspace inert).
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.defaultPrevented || isEditable(event.target)) return;
      if (formRef.current?.closest("[inert]")) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"], dialog[open]')) return;
      event.preventDefault();
      expand();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expand]);

  const inGroup = (el) => Boolean(el && formRef.current?.contains(el));

  // While open: a press anywhere outside shrinks it back.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!inGroup(event.target)) collapse();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, collapse]);

  // Sent: it shrinks back so the cards filling in are in view, and turns
  // into the "Generating…" activity.
  const wasGenerating = useRef(generating);
  useEffect(() => {
    if (generating && !wasGenerating.current) {
      inputRef.current?.blur();
      setOpen(false);
    }
    wasGenerating.current = generating;
  }, [generating]);

  return (
    <form
      ref={formRef}
      className={"composer" + (invalid ? " is-invalid" : "") + (generating ? " is-generating" : "") + (draft ? " has-draft" : "")}
      data-open={open}
      data-hint={hint && !open && !generating ? "" : undefined}
      onSubmit={(event) => {
        event.preventDefault();
        if (!generating) onGenerate();
      }}
      onBlur={(event) => {
        // Tabbed out: shrink back. (A null relatedTarget is the window losing
        // focus, e.g. switching apps: stay open.)
        const next = event.relatedTarget;
        if (open && next && !inGroup(next)) collapse();
      }}
    >
      {/* The capsule: one button over the whole shape that opens it. */}
      <button
        ref={faceRef}
        type="button"
        className="isl-face"
        aria-expanded={open}
        aria-controls={COMPOSER_INPUT_ID}
        aria-label={generating ? `${busyLabel}. Open message` : draft ? `Edit message: ${draft}` : "Write a message to generate from"}
        title={generating ? undefined : "Write a message  ( / )"}
        tabIndex={open ? -1 : 0}
        onClick={expand}
      >
        {generating ? (
          <span className="isl-row is-busy" key="busy">
            <span className="isl-spin" aria-hidden="true" />
            <span className="isl-label">{busyLabel}…</span>
            <span className="isl-bars" aria-hidden="true"><i /><i /><i /><i /></span>
          </span>
        ) : (
          <span className="isl-row" key="idle">
            <span className="isl-dot" aria-hidden="true" />
          </span>
        )}
      </button>

      {/* The crown and the spark: in the capsule and in the open box alike,
          gliding between the two places. */}
      {onPricing && (
        <button
          type="button"
          className="dock-crown"
          aria-label="See plans"
          title="Plans and pricing"
          onClick={() => {
            collapse();
            onPricing();
          }}
        >
          <CrownIcon />
        </button>
      )}
      <button
        type="button"
        className="dock-spark"
        aria-label={onHook ? "Generate a hook" : "Generate: write a message"}
        title={onHook ? "Hook generator" : "Generate"}
        tabIndex={onHook ? 0 : -1}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (onHook) {
            collapse();
            onHook();
          } else if (open) inputRef.current?.focus({ preventScroll: true });
          else expand();
        }}
      >
        <SparkIcon />
      </button>

      {/* Open: the message box and the send arrow. */}
      <div className="composer-body">
        <label className="sr-only" htmlFor={COMPOSER_INPUT_ID}>Message to adapt</label>
        <textarea
          ref={inputRef}
          id={COMPOSER_INPUT_ID}
          className="composer-input"
          rows={1}
          maxLength={MAX_MESSAGE}
          placeholder={PLACEHOLDER}
          value={message}
          aria-required="true"
          aria-invalid={invalid || undefined}
          tabIndex={open ? 0 : -1}
          onChange={(event) => onMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              collapse(true);
              return;
            }
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          className={"gen-cta composer-send" + (generating ? " is-busy" : "") + (atGenLimit ? " is-limited" : "")}
          aria-label={generating ? busyLabel : "Generate"}
          title={atGenLimit ? "Daily generation limit reached" : generating ? "Generating…" : "Generate (Enter)"}
          aria-busy={generating || undefined}
          aria-disabled={atGenLimit || undefined}
          tabIndex={open ? 0 : -1}
          disabled={generating}
        >
          {generating ? <span className="gen-cta-spin" aria-hidden="true" /> : <ArrowIcon />}
        </button>
      </div>
    </form>
  );
}
