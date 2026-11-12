// The stage's bottom row (placed by layout/MainWorkspace.jsx): on the right
// the plans lock, the "?", Node Studio's zoom, then Generate in the corner.
// Generate adapts the brand panel's "Message to Adapt" into every format;
// while it runs, a spinner shows "Generating…". (The free-hook bolt lives in
// the left rail, above the profile: BrandSidebar.jsx.)

// generatingDetail: what is being generated (e.g. "5 cards"), shown while it runs.
// atGenLimit: the daily limit is reached; Generate still says why when pressed.
export default function GenerateButton({ onGenerate, generating, generatingDetail, atGenLimit }) {
  return (
    <button
      type="button"
      className={"gen-cta" + (generating ? " is-busy" : "") + (atGenLimit ? " is-limited" : "")}
      aria-label={generating ? `Generating${generatingDetail ? ` ${generatingDetail}` : ""}` : "Generate"}
      title={atGenLimit ? "Daily generation limit reached" : generating ? "Generating…" : "Generate (Ctrl/⌘ + Enter)"}
      aria-busy={generating || undefined}
      aria-disabled={atGenLimit || undefined}
      disabled={generating}
      onClick={onGenerate}
    >
      {/* Both labels share one grid cell, so the button never changes width. */}
      <span className="gen-cta-label" data-shown={!generating || undefined}>Generate</span>
      <span className="gen-cta-label" data-shown={generating || undefined} aria-hidden="true">
        <span className="gen-cta-spin" />
        Generating…
      </span>
    </button>
  );
}
