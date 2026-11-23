import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import { useDialogBehavior, useOverlayDismiss } from "./Modal";
import art1 from "../assets/tour-modal/1-final-1.svg";
import art2 from "../assets/tour-modal/2-final-2.svg";
import art3 from "../assets/tour-modal/3-final-3.svg";
import art4 from "../assets/tour-modal/4-final-4.svg";

// Product tour: a row of step icons over one card (CCO + the step's tag, a heading, the
// step's illustration from src/assets/tour-modal). It plays by itself: each
// step shows for STEP_MS, then the next; after the last one the tour fades
// out. The icons jump to a step (and restart its time); arrow keys step;
// the card's top-right cross, Esc or a click outside closes it. Opens on a browser's first visit and from
// the "?" in the workspace's bottom-left corner. Sizes: tour-cards.css.

const STEP_MS = 5000;
const FADE_MS = 400; // tour-cards.css .tc-overlay transition

// Step icons, drawn in currentColor (white on the active tile, theme green
// on the others). Each viewBox is the glyph's exact bounds; its size in the
// tile comes from the design (tour-cards.css .tc-ic-*).
const CcIcon = () => (
  <svg className="tc-ic-cc" viewBox="8.85 12 32.3 26" fill="currentColor" aria-hidden="true">
    <path d="M14.06 12h10.4v5.2h-10.4zM8.85 17.2h5.2v15.6h-5.2zM14.06 32.8h10.4V38h-10.4z" />
    <path d="M35.87 12h5.28v5.2h-5.28zM30.67 17.2h5.2v15.6h-5.2zM35.87 32.8h5.28V38h-5.28z" />
  </svg>
);

// A wide bar over two squares, 2 apart.
const GridIcon = () => (
  <svg className="tc-ic-grid" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <rect width="20" height="9" rx="1.8" />
    <rect y="11" width="9" height="9" rx="1.8" />
    <rect x="11" y="11" width="9" height="9" rx="1.8" />
  </svg>
);

const NodesIcon = () => (
  <svg className="tc-ic-nodes" viewBox="0 0 30.5 23.5" fill="none" aria-hidden="true">
    <path d="M12.25 7.75L8.25 14.75M18.25 7.75L23.25 14.75" stroke="currentColor" strokeWidth="1.6" />
    <rect x="20.5" y="13" width="10" height="10" rx="2" fill="currentColor" />
    <rect x="10.5" width="10" height="10" rx="2" fill="currentColor" />
    <rect y="13.5" width="10" height="10" rx="2" fill="currentColor" />
  </svg>
);

// Figma's mark in one colour: its five pieces (18 x 18 cells) kept apart by
// a 2-unit gap, so they read as separate shapes instead of one blob.
const FigmaIcon = () => (
  <svg className="tc-ic-figma" viewBox="0 0 38 58" fill="currentColor" aria-hidden="true">
    <path d="M9 0h9v18H9A9 9 0 0 1 9 0z" />
    <path d="M20 0h9a9 9 0 0 1 0 18h-9z" />
    <path d="M9 20h9v18H9a9 9 0 0 1 0-18z" />
    <circle cx="29" cy="29" r="9" />
    <path d="M0 49a9 9 0 0 1 9-9h9v9a9 9 0 0 1-18 0z" />
  </svg>
);

export const TOUR_STEPS = [
  { key: "intro", label: "Introduction", tag: "Introduction", Icon: CcIcon, art: art1, title: ["Introducing", "Coherence Content", "Orchestration"] },
  { key: "grid", label: "Quick Grid", tag: "Quick Grid", Icon: GridIcon, art: art2, title: ["One Message Every", "Medium. Quick Generate", "Now Live"] },
  { key: "nodes", label: "Node Studio", tag: "Node Studio", Icon: NodesIcon, art: art3, title: ["Advanced node control", "for seamless campaign", "management."] },
  { key: "figma", label: "Figma", tag: "Plugin", Icon: FigmaIcon, art: art4, title: ["Now generate and", "integrate designs directly", "into Figma."] },
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
            <span className="tc-badge">{steps[step].tag}</span>
            <button type="button" className="tc-close" onClick={leave} aria-label="Close tour" title="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
              </svg>
            </button>
          </div>

          {/* Every step's heading shares one cell; only the active one is read
              out. Each heading is set in the design's three lines (title: one
              string per line). Each word is its own span, so the words can
              rise in one after another (--i: the word's place in the heading). */}
          <div className="tc-titles">
            {steps.map((s, i) => {
              let at = 0;
              return (
                <h2 key={s.key} id={i === step ? titleId : undefined} data-active={i === step} aria-hidden={i !== step}>
                  {s.title.map((line, l) => (
                    <Fragment key={l}>
                      {l > 0 && " "}
                      <span className="tc-line">
                        {line.split(" ").map((word, w) => (
                          <Fragment key={w}>
                            {w > 0 && " "}
                            <span className="tc-word" style={{ "--i": at++ }}>{word}</span>
                          </Fragment>
                        ))}
                      </span>
                    </Fragment>
                  ))}
                </h2>
              );
            })}
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
