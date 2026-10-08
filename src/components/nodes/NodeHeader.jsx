// Type pill (colour indicator + label), length meter and the action slot.
// meter = { words, maxWords, level: ok|near|over, details } (see lib/copyItems measure)
export default function NodeHeader({ meta, meter, children }) {
  const counted = meter && meter.words > 0;
  const fill = counted ? Math.min(100, Math.round((meter.words / meter.maxWords) * 100)) : 0;
  const title = counted
    ? `Target: ${meta.tag}\n${meter.details.join("\n")}${meter.level === "over" ? "\nOver the limit — trim it or regenerate." : ""}`
    : `Target: ${meta.tag}`;

  return (
    <header className="ncard-head">
      <h2 className="ncard-pill">
        <span className="ncard-dot" aria-hidden="true" />
        <span className="ncard-pill-label">{meta.label}</span>
      </h2>
      {counted ? (
        <span className={"ncard-meter is-" + meter.level} title={title}>
          <span className="ncard-meter-text">
            {meter.words}/{meter.maxWords}
            <span className="ncard-meter-unit"> words</span>
            {meter.level === "over" && <span className="ncard-meter-flag"> · too long</span>}
          </span>
          <span className="ncard-meter-bar" aria-hidden="true"><i style={{ width: `${fill}%` }} /></span>
        </span>
      ) : (
        <span className="ncard-hint" title={title}>{meta.tag}</span>
      )}
      {children}
    </header>
  );
}
