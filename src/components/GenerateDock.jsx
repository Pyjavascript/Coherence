// The stage's bottom row (placed by layout/MainWorkspace.jsx): in the middle,
// the message composer: the brand's "Message to Adapt" (the one thing
// Generate needs) and the arrow that generates it into every card. While it
// runs, the arrow turns into a spinner. Enter sends; Shift + Enter is a new
// line. ("Pro" keeps the bottom-left corner, the "?" the bottom-right.)

const MAX_MESSAGE = 2000; // the generate function's cap on brand.message
const PLACEHOLDER = "What would you like to generate";

export const COMPOSER_INPUT_ID = "composer-message";

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

// message / onMessage: the brand's message to adapt.
// invalid: Generate was pressed with no message; the box is flagged until one is written.
// generatingDetail: what is being generated (e.g. "5 cards"), for the busy label.
// atGenLimit: the daily limit is reached; the arrow still says why when pressed.
export default function MessageComposer({
  message, onMessage, invalid = false, onGenerate, generating, generatingDetail, atGenLimit,
}) {
  const busyLabel = `Generating${generatingDetail ? ` ${generatingDetail}` : ""}`;
  return (
    <form
      className={"composer" + (invalid ? " is-invalid" : "")}
      onSubmit={(event) => {
        event.preventDefault();
        if (!generating) onGenerate();
      }}
    >
      <label className="sr-only" htmlFor={COMPOSER_INPUT_ID}>Message to adapt</label>
      <textarea
        id={COMPOSER_INPUT_ID}
        className="composer-input"
        rows={1}
        maxLength={MAX_MESSAGE}
        placeholder={PLACEHOLDER}
        value={message}
        aria-required="true"
        aria-invalid={invalid || undefined}
        onChange={(event) => onMessage(event.target.value)}
        onKeyDown={(event) => {
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
        disabled={generating}
      >
        {generating ? <span className="gen-cta-spin" aria-hidden="true" /> : <ArrowIcon />}
      </button>
    </form>
  );
}
