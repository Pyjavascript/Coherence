// "Get started" strip above the message box: the three things to do, in order,
// each ticking off once done. Clicking a step takes you to it. It goes away once
// everything is done or when dismissed (remembered per browser).

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

// steps: [{ key, label, done, onClick }]; the first one not done is the current step.
export default function GettingStarted({ steps, onSample, onDismiss }) {
  const current = steps.findIndex((s) => !s.done);

  return (
    <nav className="gs" aria-label="Getting started">
      <span className="gs-title">Get started</span>
      <ol className="gs-steps">
        {steps.map((s, i) => {
          const state = s.done ? "done" : i === current ? "current" : "todo";
          return (
            <li key={s.key} className="gs-step" data-state={state}>
              <button
                type="button"
                aria-current={state === "current" ? "step" : undefined}
                onClick={s.onClick}
              >
                <span className="gs-num" aria-hidden="true">{s.done ? <CheckIcon /> : i + 1}</span>
                <span className="gs-label">{s.label}</span>
                {s.done && <span className="gs-sr">(done)</span>}
              </button>
            </li>
          );
        })}
      </ol>
      {onSample && (
        <button type="button" className="gs-sample" onClick={onSample}>Try a sample</button>
      )}
      <button type="button" className="gs-close" aria-label="Hide getting started" title="Hide" onClick={onDismiss}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M7 7l10 10M17 7L7 17" />
        </svg>
      </button>
    </nav>
  );
}
