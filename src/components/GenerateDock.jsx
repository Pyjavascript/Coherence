import { useCallback, useEffect, useRef, useState } from "react";

// The stage's bottom row (placed by layout/MainWorkspace.jsx): in the middle,
// the message composer: the brand's "Message to Adapt" (the one thing
// Generate needs) and the arrow that generates it into every card. While it
// runs, the arrow turns into a spinner. Enter sends; Shift + Enter is a new
// line.
//
// It works like a Dynamic Island: at rest it is a small white capsule at the
// bottom centre (a lock for Pro and a pen at one end, a dot at the other),
// and the "Pro" and "?" buttons beside it are tucked away behind it. Hovering,
// it swells a little and says "Write a message" (or shows the message so
// far). Clicking it (or pressing "/") springs it open into the full
// one-card-wide box with the green send arrow. Clicking outside, Escape, or
// sending shrinks it back; the message is kept. While generating it widens
// into a live activity: a spinner, what's being generated, and moving bars.

const MAX_MESSAGE = 2000; // the generate function's cap on brand.message
// A longer message grows the open box upward, a line at a time, up to this
// many lines; past that it scrolls.
const MAX_LINES = 4;
const PLACEHOLDER = "What would you like to generate";
const MINI_LABEL = "Write a message";
// On load it peeks once, briefly saying what it is, then settles back.
const HINT_DELAY = 1100;
const HINT_FOR = 2600;

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

// A pen with a spark: "write here".
const PenIcon = () => (
  <svg className="isl-pen" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3Z" />
    <path d="M13.5 8.5l2 2" />
    <path d="M19 15v4M17 17h4" />
  </svg>
);

// The capsule's mini "Pro" icon: a lock (premium features), a line glyph
// drawn like the pen (same box and stroke) so the two read as one set.
const LockIcon = () => (
  <svg className="isl-mini isl-mini-pro" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    <path d="M12 14.8v2" />
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
// hasPro: "Pro" (free plan) sits beside the open island (MainWorkspace.jsx);
// the closed capsule shows it as a small lock so it's clear it's inside.
export default function MessageComposer({
  message, onMessage, invalid = false, onGenerate, generating, generatingDetail, atGenLimit,
  hasPro = false,
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

  // First visit of the page: it peeks once ("Write a message") so it's clear
  // what the capsule is, then settles back. Not when a message is waiting.
  // If the tour (or any dialog) is up, it waits until that's closed, so the
  // peek isn't lost behind the backdrop.
  useEffect(() => {
    if (draft) return undefined;
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
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grow with the message: the text box takes its content's height (up to
  // MAX_LINES lines) and the box grows upward by the extra (--cmp-grow, on
  // the stage so Node Studio's zoom controls can rise with it). Closed, or
  // with one line, there's no extra. An empty box is one line (the
  // placeholder doesn't count). Measured again as its width changes: it
  // opens from the narrow capsule, so the text re-wraps as it widens.
  const fitRef = useRef(() => {});
  fitRef.current = () => {
    const input = inputRef.current;
    const stage = formRef.current?.closest(".ws-stage");
    if (!input || !stage) return;
    const line = parseFloat(getComputedStyle(input).lineHeight) || 20;
    input.style.height = "auto";
    const lines = input.value ? input.scrollHeight : line;
    const content = Math.max(line, Math.min(lines, line * MAX_LINES));
    input.style.height = `${content}px`;
    const grow = open ? Math.round(content - line) : 0;
    stage.style.setProperty("--cmp-grow", `${grow}px`);
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

  // The island's group: the island and the buttons that slide out beside
  // it ("Pro", the "?": MainWorkspace.jsx's tray). Pressing or tabbing to
  // those keeps it open.
  const inGroup = (el) => {
    const form = formRef.current;
    const group = form?.closest(".ws-tray") || form;
    return Boolean(el && group?.contains(el));
  };

  // While open: a press anywhere outside the group shrinks it back.
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
      className={"composer" + (invalid ? " is-invalid" : "") + (generating ? " is-generating" : "") + (draft ? " has-draft" : "") + (hasPro ? " has-pro" : "")}
      data-open={open}
      data-hint={hint && !open && !generating ? "" : undefined}
      onSubmit={(event) => {
        event.preventDefault();
        if (!generating) onGenerate();
      }}
      onBlur={(event) => {
        // Tabbed out of the group: shrink back. (A null relatedTarget is the
        // window losing focus, e.g. switching apps: stay open.)
        const next = event.relatedTarget;
        if (open && next && !inGroup(next)) collapse();
      }}
    >
      {/* The capsule: one button over the whole shape that opens it. Its
          content is keyed so each state blurs in fresh. */}
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
            {/* At rest: a lock (Pro) before the pen, a preview of the button
                that slides out when it opens. It makes way for the label
                when it peeks. */}
            {hasPro && <LockIcon />}
            <PenIcon />
            <span className="isl-label">{draft || MINI_LABEL}</span>
            <span className="isl-dot" aria-hidden="true" />
          </span>
        )}
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
