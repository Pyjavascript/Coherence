// Type pill (colour indicator + label), word-count indicator and the action slot.
export default function NodeHeader({ meta, wordCount, children }) {
  const counted = wordCount > 0;
  return (
    <header className="ncard-head">
      <h2 className="ncard-pill">
        <span className="ncard-dot" aria-hidden="true" />
        <span className="ncard-pill-label">{meta.label}</span>
      </h2>
      <span className="ncard-hint" title={`Target: ${meta.tag}`}>
        {counted ? `${wordCount} ${wordCount === 1 ? "word" : "words"}` : meta.tag}
      </span>
      {children}
    </header>
  );
}
