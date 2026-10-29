import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useDialogBehavior, useOverlayDismiss } from "./Modal";
import FigmaLogo from "./FigmaLogo";
import { MEDIA_BY_KEY, NODE_CATS } from "../lib/constants";
import { EASE_OUT, reducedMotion, tokenMs } from "../lib/motion";
import { shortcut } from "../lib/shortcuts";

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
//
// Each illustration is a small mock of the real screen, filled with example
// copy for real brands, so every step shows what the tool actually does. The
// card has one fixed size (polish/modals.css): the scene sits centred in the
// space the copy leaves, so nothing moves between steps.

// Logo marks from Simple Icons (CC0), on a 24 x 24 grid.
const BRANDS = [
  {
    name: "Spotify",
    color: "#1DB954",
    path: "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z",
  },
  {
    name: "Nike",
    color: "#111111",
    path: "M24 7.8L6.442 15.276c-1.456.616-2.679.925-3.668.925-1.12 0-1.933-.392-2.437-1.177-.317-.504-.41-1.143-.28-1.918.13-.775.476-1.6 1.036-2.478.467-.71 1.232-1.643 2.297-2.8a6.122 6.122 0 00-.784 1.848c-.28 1.195-.028 2.072.756 2.632.373.261.886.392 1.54.392.522 0 1.11-.084 1.764-.252L24 7.8z",
  },
  {
    name: "Airbnb",
    color: "#FF385C",
    path: "M12.001 18.275c-1.353-1.697-2.148-3.184-2.413-4.457-.263-1.027-.16-1.848.291-2.465.477-.71 1.188-1.056 2.121-1.056s1.643.345 2.12 1.063c.446.61.558 1.432.286 2.465-.291 1.298-1.085 2.785-2.412 4.458zm9.601 1.14c-.185 1.246-1.034 2.28-2.2 2.783-2.253.98-4.483-.583-6.392-2.704 3.157-3.951 3.74-7.028 2.385-9.018-.795-1.14-1.933-1.695-3.394-1.695-2.944 0-4.563 2.49-3.927 5.382.37 1.565 1.352 3.343 2.917 5.332-.98 1.085-1.91 1.856-2.732 2.333-.636.344-1.245.558-1.828.609-2.679.399-4.778-2.2-3.825-4.88.132-.345.395-.98.845-1.961l.025-.053c1.464-3.178 3.242-6.79 5.285-10.795l.053-.132.58-1.116c.45-.822.635-1.19 1.351-1.643.346-.21.77-.315 1.246-.315.954 0 1.698.558 2.016 1.007.158.239.345.557.582.953l.558 1.089.08.159c2.041 4.004 3.821 7.608 5.279 10.794l.026.025.533 1.22.318.764c.243.613.294 1.222.213 1.858zm1.22-2.39c-.186-.583-.505-1.271-.9-2.094v-.03c-1.889-4.006-3.642-7.608-5.307-10.844l-.111-.163C15.317 1.461 14.468 0 12.001 0c-2.44 0-3.476 1.695-4.535 3.898l-.081.16c-1.669 3.236-3.421 6.843-5.303 10.847v.053l-.559 1.22c-.21.504-.317.768-.345.847C-.172 20.74 2.611 24 5.98 24c.027 0 .132 0 .265-.027h.372c1.75-.213 3.554-1.325 5.384-3.317 1.829 1.989 3.635 3.104 5.382 3.317h.372c.133.027.239.027.265.027 3.37.003 6.152-3.261 4.802-6.975z",
  },
];

// The brand's logo in white, straight on the navy rail.
const Mark = ({ brand }) => (
  <svg className="tour-mark" viewBox="0 0 24 24" aria-hidden="true"><path d={brand.path} /></svg>
);

// Example copy for one Spotify message ("Try Premium free for a month"):
// one short line per Quick Grid medium. Packaging = the gift card's box.
const GRID_COPY = [
  { key: "packaging", text: "Music, no ads." },
  { key: "marketing", text: "Hit play. Skip the ads." },
  { key: "website", text: "Premium, free for 1 month." },
  { key: "email", text: "Your free month is here" },
];

const ArtBrand = () => (
  <div className="tour-scene tour-scene-brand">
    <div className="tour-rail">
      <span className="tour-rail-title">Brands</span>
      {BRANDS.map((b, i) => (
        <span key={b.name} className={"tour-rail-item" + (i === 0 ? " is-on" : "")}>
          <Mark brand={b} />{b.name}
        </span>
      ))}
    </div>
    <div className="tour-panel">
      <span className="tour-label">Brand Name</span>
      <span className="tour-field">Spotify</span>
      <span className="tour-label">Core Belief</span>
      <span className="tour-field">Music for every moment.</span>
      <span className="tour-row">
        <span className="tour-tag">Discovery</span>
        <span className="tour-tag">Emotional</span>
      </span>
    </div>
  </div>
);

const ArtGenerate = () => (
  <div className="tour-scene tour-scene-grid">
    <div className="tour-composer">
      <span>Try Premium free for a month</span>
      <b title={shortcut("Enter")}>Generate</b>
    </div>
    <div className="tour-grid">
      {GRID_COPY.map((c) => (
        <div key={c.key} className="tour-mini" style={{ "--c": MEDIA_BY_KEY[c.key].color }}>
          <span className="tour-mini-label"><i />{MEDIA_BY_KEY[c.key].label}</span>
          <span className="tour-mini-copy">{c.text}</span>
        </div>
      ))}
    </div>
  </div>
);

const ArtNodes = () => (
  <div className="tour-scene tour-scene-nodes">
    <svg className="tour-links" viewBox="0 0 340 160" aria-hidden="true">
      <path d="M144 80 C 172 80, 172 33, 196 33" />
      <path d="M144 80 C 172 80, 172 127, 196 127" />
    </svg>
    <div className="tour-node" style={{ left: 0, top: 54, "--c": NODE_CATS.email.color }}>
      <span className="tour-mini-label"><i />Email</span>
      <span className="tour-mini-copy">Try Premium free</span>
    </div>
    <div className="tour-node" style={{ right: 0, top: 7, "--c": NODE_CATS.website.color }}>
      <span className="tour-mini-label"><i />Hero</span>
      <span className="tour-mini-copy">Music, no ads.</span>
    </div>
    <div className="tour-node" style={{ right: 0, top: 101, "--c": NODE_CATS.advertising.color }}>
      <span className="tour-mini-label"><i />Button</span>
      <span className="tour-mini-copy">Start free month</span>
    </div>
  </div>
);

const ArtExport = () => (
  <div className="tour-scene tour-scene-export">
    <div className="tour-panel tour-export">
      <span className="tour-label">Export</span>
      <span className="tour-option is-on">Copy all<i>✓</i></span>
      <span className="tour-option">.txt file</span>
      <span className="tour-option">.csv file</span>
    </div>
    <svg className="tour-arrow" viewBox="0 0 40 16" aria-hidden="true"><path d="M2 8h32M28 3l6 5-6 5" /></svg>
    <div className="tour-figma">
      <span className="tour-figma-logo"><FigmaLogo /></span>
      <span className="tour-figma-layer">
        <span className="tour-label">Hero</span>
        Music, no ads.
      </span>
    </div>
  </div>
);

export const TOUR_STEPS = [
  {
    title: "Welcome to Coherence",
    body: "Set up your brand once in the right panel. Every line Coherence writes follows its name, belief and tone.",
    Art: ArtBrand,
  },
  {
    title: "One message, every medium",
    body: "Type your message below and press Generate. The Quick Grid fills with copy for every medium.",
    Art: ArtGenerate,
  },
  {
    title: "Shape it in Node Studio",
    body: "Build pages piece by piece: link hero, CTA and email nodes on a canvas you can pan and zoom.",
    Art: ArtNodes,
  },
  {
    title: "Ready to Take It Further?",
    body: "Export your brand settings or send them straight to Figma.",
    Art: ArtExport,
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
