import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import { useDialogBehavior, useOverlayDismiss } from "./Modal";
import art1 from "../assets/tour-modal/1-new.svg";
import art2 from "../assets/tour-modal/2.svg";
import art3 from "../assets/tour-modal/3.svg";
import art4 from "../assets/tour-modal/4.svg";

// Product tour: a row of step icons over one card (CCO + Beta, a heading, the
// step's illustration from src/assets/tour-modal). It plays by itself: each
// step shows for STEP_MS, then the next; after the last one the tour fades
// out. The icons jump to a step (and restart its time); arrow keys step;
// Esc or a click outside closes it. Opens on a browser's first visit and from
// the "?" in the workspace's bottom-left corner. Sizes: tour-cards.css.

const STEP_MS = 5000;
const FADE_MS = 400; // tour-cards.css .tc-overlay transition

// Step icons, drawn in currentColor (white on the active tile, theme green
// on the others).
const CcIcon = () => (
  <svg viewBox="7 10 36 30" fill="currentColor" aria-hidden="true">
    <path d="M14.06 12h10.4v5.2h-10.4zM8.85 17.2h5.2v15.6h-5.2zM14.06 32.8h10.4V38h-10.4z" />
    <path d="M35.87 12h5.28v5.2h-5.28zM30.67 17.2h5.2v15.6h-5.2zM35.87 32.8h5.28V38h-5.28z" />
  </svg>
);

const GridIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="3" y="3" width="18" height="8" rx="2.5" />
    <rect x="3" y="13" width="8.25" height="8" rx="2.5" />
    <rect x="12.75" y="13" width="8.25" height="8" rx="2.5" />
  </svg>
);

const NodesIcon = () => (
  <svg viewBox="0 0 31 24" fill="none" aria-hidden="true">
    <path d="M12.25 7.75L8.25 14.75M18.25 7.75L23.25 14.75" stroke="currentColor" strokeWidth="1.6" />
    <rect x="20.5" y="13" width="10" height="10" rx="2" fill="currentColor" />
    <rect x="10.5" width="10" height="10" rx="2" fill="currentColor" />
    <rect y="13.5" width="10" height="10" rx="2" fill="currentColor" />
  </svg>
);

// Figma's mark in one colour.
const FigmaIcon = () => (
  <svg viewBox="0 0 38 57" fill="currentColor" aria-hidden="true">
    <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" />
    <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" />
    <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" />
    <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" />
    <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" />
  </svg>
);

export const TOUR_STEPS = [
  { key: "intro", label: "Introduction", Icon: CcIcon, art: art1, title: "Introducing Coherence Content Orchestration" },
  { key: "grid", label: "Quick Grid", Icon: GridIcon, art: art2, title: "One Message Every Medium. Quick Generate Now Live" },
  { key: "nodes", label: "Node Studio", Icon: NodesIcon, art: art3, title: "Advanced node control for seamless campaign management." },
  { key: "figma", label: "Figma", Icon: FigmaIcon, art: art4, title: "Now generate and integrate designs directly into Figma." },
];

// Phones have no Node Studio (Grid only), so their tour skips its step.
const PHONE_STEPS = TOUR_STEPS.filter((s) => s.key !== "nodes");

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function TourModal({ onClose, compact = false }) {
  const steps = compact ? PHONE_STEPS : TOUR_STEPS;
  const [stepState, setStep] = useState(0);
  // Kept in range if the screen narrows to a phone mid-tour.
  const step = Math.min(stepState, steps.length - 1);
  const last = step === steps.length - 1;
  // The illustrations are large files: each loads when its step is next up
  // (and stays loaded), not all at once.
  const [reach, setReach] = useState(1);
  const [leaving, setLeaving] = useState(false);
  const titleId = useId();

  const leave = useCallback(() => setLeaving(true), []);
  const panelRef = useDialogBehavior(leave);
  const dismiss = useOverlayDismiss(leave);

  useEffect(() => setReach((r) => Math.max(r, step + 1)), [step]);

  // Plays itself: the next step after STEP_MS (a jump restarts the time);
  // after the last step, the fade-out.
  useEffect(() => {
    if (leaving) return undefined;
    const timer = window.setTimeout(() => (last ? setLeaving(true) : setStep(step + 1)), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [step, last, leaving]);

  // Closing (by any route) fades the tour out first.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!leaving) return undefined;
    const timer = window.setTimeout(() => onCloseRef.current(), reducedMotion() ? 0 : FADE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  // Arrow keys step through.
  const keysRef = useRef(null);
  keysRef.current = { step, count: steps.length };
  useEffect(() => {
    const onKey = (event) => {
      if (event.defaultPrevented) return;
      const { step: at, count } = keysRef.current;
      if (event.key === "ArrowRight" && at < count - 1) setStep(at + 1);
      else if (event.key === "ArrowLeft" && at > 0) setStep(at - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={"overlay tc-overlay" + (leaving ? " is-leaving" : "")} {...dismiss}>
      <section ref={panelRef} className="tc" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="tc-steps" role="group" aria-label="Tour steps">
          {steps.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className="tc-step"
              aria-label={`Step ${i + 1} of ${steps.length}: ${s.label}`}
              aria-current={i === step ? "step" : undefined}
              title={s.label}
              onClick={() => setStep(i)}
            >
              <s.Icon />
            </button>
          ))}
        </div>

        <div className="tc-card">
          <div className="tc-head">
            <span className="tc-brand">CCO</span>
            <span className="tc-badge">Beta</span>
          </div>

          {/* Every step's heading shares one cell; only the active one is read
              out. Each word is its own span, so the words can rise in one
              after another (--i: the word's place). */}
          <div className="tc-titles">
            {steps.map((s, i) => (
              <h2 key={s.key} id={i === step ? titleId : undefined} data-active={i === step} aria-hidden={i !== step}>
                {s.title.split(" ").map((word, w) => (
                  <Fragment key={w}>
                    {w > 0 && " "}
                    <span className="tc-word" style={{ "--i": w }}>{word}</span>
                  </Fragment>
                ))}
              </h2>
            ))}
          </div>

          <div className="tc-art" aria-hidden="true">
            {steps.map((s, i) => (
              <img
                key={s.key}
                src={i <= reach ? s.art : undefined}
                alt=""
                decoding="async"
                draggable="false"
                data-active={i === step}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// The "?" that reopens the tour (the workspace's bottom-left corner).
export function TourButton({ onClick }) {
  return (
    <button type="button" className="tour-launch" onClick={onClick} aria-label="Take the tour" title="How Coherence works">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9.2 9.3a2.9 2.9 0 0 1 5.6.9c0 1.9-2.8 2.5-2.8 4.3" />
        <path d="M12 18h.01" />
      </svg>
    </button>
  );
}
