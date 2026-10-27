import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useDialogBehavior, useOverlayDismiss } from "./Modal";
import FigmaLogo from "./FigmaLogo";
import { EASE_OUT, reducedMotion, tokenMs } from "../lib/motion";

// The active dot is wider than the rest. Its size change snaps in layout, so
// each dot plays from where it was to where it is now (FLIP).
function useDotFlip(dotsRef, step) {
  const geom = useRef(null);
  const measure = () => {
    geom.current = [...(dotsRef.current?.children || [])].map((b) => ({ x: b.offsetLeft, w: b.offsetWidth }));
  };

  useLayoutEffect(() => {
    const dots = [...(dotsRef.current?.children || [])];
    const old = geom.current;
    measure();
    if (!old || reducedMotion()) return;
    dots.forEach((b, i) => {
      const was = old[i];
      const now = geom.current[i];
      if (!was || !now.w) return;
      const dx = (was.x + was.w / 2) - (now.x + now.w / 2);
      const sx = was.w / now.w;
      if (Math.abs(dx) < 0.5 && Math.abs(sx - 1) < 0.01) return;
      b.animate(
        [{ translate: `${dx}px 0`, scale: `${sx} 1` }, { translate: "0 0", scale: "1 1" }],
        { duration: tokenMs("--pl-d-3", 320), easing: EASE_OUT },
      );
    });
  }, [step]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
}

// Product tour: a centred card with an illustration, copy, step dots and
// Skip / Continue. Opens by itself on a browser's first visit and from the
// "?" button in the workspace.

const MEDIUM_CHIPS = [
  { label: "Packaging", color: "#B4590A", x: "6%", y: "16%" },
  { label: "Email", color: "#4653FF", x: "72%", y: "10%" },
  { label: "Website", color: "#1F9C6E", x: "4%", y: "70%" },
  { label: "Advertising", color: "#0EA5B7", x: "68%", y: "74%" },
  { label: "Marketing", color: "#B7539E", x: "76%", y: "42%" },
];

const Lines = ({ n = 2 }) => (
  <span className="tour-lines" aria-hidden="true">
    {Array.from({ length: n }, (_, i) => <i key={i} />)}
  </span>
);

const ArtWelcome = () => (
  <>
    {MEDIUM_CHIPS.map((c, i) => (
      <span key={c.label} className="tour-chip" style={{ left: c.x, top: c.y, "--c": c.color, "--d": `${i * 60}ms` }}>
        <b />{c.label}
      </span>
    ))}
    <div className="tour-card is-navy" style={{ left: "50%", top: "50%", width: "44%", transform: "translate(-50%, -50%) rotate(-2deg)" }}>
      <span className="tour-card-kicker">Your brand</span>
      <strong>Ember &amp; Oak</strong>
      <span className="tour-card-sub">One message, every medium.</span>
    </div>
  </>
);

const ArtBrand = () => (
  <>
    <div className="tour-card" style={{ left: "50%", top: "50%", width: "56%", transform: "translate(-50%, -50%)" }}>
      <span className="tour-field-label">Brand Name</span>
      <span className="tour-field">Ember &amp; Oak</span>
      <span className="tour-field-label">Message to adapt <em>Required</em></span>
      <span className="tour-field is-tall"><Lines n={2} /></span>
    </div>
    <span className="tour-pill" style={{ right: "6%", top: "14%" }}>Brand panel</span>
    <span className="tour-pill is-soft" style={{ left: "5%", bottom: "14%" }}>Style pack · Variants</span>
  </>
);

const ArtGenerate = () => (
  <>
    <div className="tour-grid" style={{ left: "50%", top: "52%", width: "64%", transform: "translate(-50%, -50%)" }}>
      {["Packaging", "Email", "Website", "Advertising"].map((label) => (
        <div key={label} className="tour-mini">
          <span>{label}</span>
          <Lines n={2} />
        </div>
      ))}
    </div>
    <span className="tour-pill is-blue" style={{ right: "5%", top: "10%" }}>Generate</span>
    <span className="tour-kbd" style={{ left: "6%", top: "12%" }}>Ctrl + Enter</span>
  </>
);

const ArtNodes = () => (
  <>
    <svg className="tour-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M34 40 C 47 40, 47 26, 60 26" />
      <path d="M34 40 C 47 40, 47 68, 60 68" />
    </svg>
    <div className="tour-node" style={{ left: "8%", top: "28%", width: "26%" }}><span>Email</span><Lines n={2} /></div>
    <div className="tour-node" style={{ left: "60%", top: "14%", width: "28%" }}><span>Hero</span><Lines n={2} /></div>
    <div className="tour-node" style={{ left: "60%", top: "56%", width: "28%" }}><span>CTA block</span><Lines n={1} /></div>
    <span className="tour-zoom" style={{ left: "8%", bottom: "10%" }}><b>−</b>100%<b>+</b></span>
  </>
);

const ArtTools = () => (
  <>
    <div className="tour-card" style={{ left: "50%", top: "50%", width: "50%", transform: "translate(-50%, -50%) rotate(1.5deg)" }}>
      <span className="tour-field-label">Export</span>
      <span className="tour-export"><b>Copy all</b><b>.txt</b><b>.csv</b></span>
    </div>
    <span className="tour-pill" style={{ left: "5%", top: "12%" }}>Research notes</span>
    <span className="tour-pill is-blue" style={{ right: "5%", top: "18%" }}>Hook generator</span>
    <span className="tour-pill is-soft" style={{ left: "7%", bottom: "12%" }}>Coherence prompt</span>
    <span className="tour-pill" style={{ right: "6%", bottom: "14%" }}>History</span>
  </>
);

const ArtFigma = () => (
  <>
    <div className="tour-figma" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%) rotate(-3deg)" }}>
      <FigmaLogo />
    </div>
    <span className="tour-pill" style={{ left: "6%", top: "14%" }}>Figma plugin</span>
    <span className="tour-chip" style={{ right: "6%", top: "16%", "--c": "#0ACF83" }}><b />Your brands</span>
    <div className="tour-node" style={{ left: "6%", bottom: "10%", width: "26%" }}><span>Hero layer</span><Lines n={2} /></div>
    <span className="tour-pill is-blue" style={{ right: "6%", bottom: "16%" }}>Write into layers</span>
  </>
);

export const TOUR_STEPS = [
  {
    title: "Welcome to Coherence",
    body: "Write your brand's message once. Get on-brand copy for every medium.",
    Art: ArtWelcome,
  },
  {
    title: "Start with your brand",
    body: "Name your brand in the panel on the right, then write its message in the box at the bottom.",
    Art: ArtBrand,
  },
  {
    title: "Generate every medium at once",
    body: "Press Generate or Ctrl + Enter to fill the Quick Grid in one go.",
    Art: ArtGenerate,
  },
  {
    title: "Build freely in Node Studio",
    body: "Lay out copy as connected nodes on a canvas you can pan and zoom.",
    Art: ArtNodes,
  },
  {
    title: "Sharpen, save and export",
    body: "Add research notes, write hooks, revisit history and export your copy.",
    Art: ArtTools,
  },
  {
    title: "Use it in Figma",
    body: "Write on-brand copy straight into your designs with the Figma plugin.",
    Art: ArtFigma,
  },
];

export default function TourModal({ onClose, onSample }) {
  // dir: 1 moving forward, -1 back — the step copy slides in from that side.
  const [{ step, dir }, setNav] = useState({ step: 0, dir: 1 });
  const titleId = useId();
  const bodyId = useId();
  const primaryRef = useRef(null);
  const dotsRef = useRef(null);
  const panelRef = useDialogBehavior(onClose, primaryRef);
  const dismiss = useOverlayDismiss(onClose);
  const last = step === TOUR_STEPS.length - 1;
  const { Art } = TOUR_STEPS[step];
  useDotFlip(dotsRef, step);

  const goTo = (to) => setNav((cur) => (to === cur.step ? cur : { step: to, dir: to > cur.step ? 1 : -1 }));
  const next = () => (last ? onClose() : goTo(step + 1));
  const back = () => goTo(Math.max(0, step - 1));

  useEffect(() => { primaryRef.current?.focus(); }, [step]);

  // Esc closes; arrow keys step through.
  const keysRef = useRef(null);
  keysRef.current = { next, back, last, onClose };
  useEffect(() => {
    const onKey = (event) => {
      const k = keysRef.current;
      if (event.defaultPrevented) return;
      if (event.key === "ArrowRight" && !k.last) k.next();
      else if (event.key === "ArrowLeft") k.back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="overlay tour-overlay" {...dismiss}>
      <section
        ref={panelRef}
        className="tour"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        style={{ "--pl-dir": dir }}
      >
        <div className="tour-art" key={step} aria-hidden="true">
          <Art />
        </div>

        {/* Every step's copy shares one grid cell, so the card is always as tall
            as the longest step and never jumps; only the active one is visible. */}
        <div className="tour-body">
          {TOUR_STEPS.map((s, i) => {
            const active = i === step;
            return (
              <div key={s.title} className="tour-copy" data-active={active} aria-hidden={!active} inert={active ? undefined : ""}>
                <h2 id={active ? titleId : undefined}>{s.title}</h2>
                <p id={active ? bodyId : undefined}>{s.body}</p>
                {i === TOUR_STEPS.length - 1 && onSample && (
                  <p className="tour-sample">
                    Just exploring?{" "}
                    <button type="button" onClick={() => { onSample(); onClose(); }}>Try a sample brand</button>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="tour-dots" role="group" aria-label="Tour steps" ref={dotsRef}>
          {TOUR_STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              className={i === step ? "is-on" : ""}
              aria-label={`Step ${i + 1} of ${TOUR_STEPS.length}: ${s.title}`}
              aria-current={i === step ? "step" : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        <div className="tour-actions">
          <button type="button" className="tour-secondary" onClick={step === 0 ? onClose : back}>
            {step === 0 ? "Skip tour" : "Back"}
          </button>
          <button type="button" ref={primaryRef} className="tour-primary" onClick={next}>
            {last ? "Get started" : "Continue"}
          </button>
        </div>
      </section>
    </div>
  );
}

// Floating "?" that reopens the tour.
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
