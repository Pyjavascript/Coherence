// First-run guide above the Quick Grid: three steps that tick themselves off,
// plus a one-click sample brand.
const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export default function WelcomeGuide({ steps, onSample, onDismiss }) {
  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <div className="welcome-head">
        <div>
          <h2 id="welcome-title">Welcome to Coherence</h2>
          <p>Three steps to your first on-brand copy across every medium.</p>
        </div>
        <button type="button" className="welcome-close" aria-label="Dismiss welcome guide" onClick={onDismiss}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <ol className="welcome-steps">
        {steps.map((step, i) => (
          <li key={step.label}>
            <button
              type="button"
              className={"welcome-step" + (step.done ? " is-done" : "")}
              onClick={step.onClick}
              disabled={step.disabled}
            >
              <span className="welcome-num" aria-hidden="true">{step.done ? <Check /> : i + 1}</span>
              <span className="welcome-step-text">
                <b>{step.label}</b>
                <span>{step.done ? "Done" : step.hint}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="welcome-foot">
        <span>Just exploring?</span>
        <button type="button" className="welcome-sample" onClick={onSample}>Try a sample brand</button>
      </div>
    </section>
  );
}
