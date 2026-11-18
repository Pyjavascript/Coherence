import { useEffect, useRef, useState } from "react";
import { EMOTIONS, FUNNEL_STAGES, MAX_EMOTIONS } from "../lib/constants";
import { LockIcon } from "./Select";

// Brand panel → Customer tab (styles: brand-panel.css "Customer tab").
//
// Ideal Client Profile (one line), the funnel stage as a slider, Desired
// Emotions (up to 3 chips, scrolling sideways) and a "Premium features"
// card. The card is a visual preview only for now: its tiles and the
// Unlock With Premium button don't do anything yet.
//
// Saved as: profile → brands.customer_profile, emotions → emo (comma-
// separated), stage → stage.

// Shown on the Premium card (not built yet).
const PREMIUM_FEATURES = ["Behaviourial Signals", "Pixels Intelligence", "Audience Research", "Objection to pre-empt"];

// Funnel stage slider: it glides 0-100 like the Warmth slider; the stage
// is whichever of the FUNNEL_STAGES the thumb is nearest.
const LAST_STAGE = FUNNEL_STAGES.length - 1;
const stageToPos = (i) => (i / LAST_STAGE) * 100;
const posToStage = (p) => Math.round((p / 100) * LAST_STAGE);

// "Comfort, Joy" ↔ ["Comfort", "Joy"]
const parseEmotions = (value) =>
  String(value || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, MAX_EMOTIONS);

// Scroll a sideways row with an ordinary mouse wheel too (until its end).
function useWheelX(ref) {
  useEffect(() => {
    const row = ref.current;
    if (!row) return undefined;
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = row.scrollWidth - row.clientWidth;
      const next = Math.min(max, Math.max(0, row.scrollLeft + e.deltaY));
      if (max <= 0 || next === row.scrollLeft) return;
      e.preventDefault();
      row.scrollLeft = next;
    };
    row.addEventListener("wheel", onWheel, { passive: false });
    return () => row.removeEventListener("wheel", onWheel);
  }, [ref]);
}

// Desired Emotions: equal-width chips, three to the row width like the
// personality chips; the rest scroll in from the right. Up to 3 picked;
// past that the rest dim until one is unpicked.
function Emotions({ value, onChange, onStatus }) {
  const picked = parseEmotions(value);
  const custom = picked.filter((e) => !EMOTIONS.some((p) => p.toLowerCase() === e.toLowerCase()));
  const full = picked.length >= MAX_EMOTIONS;
  const rowRef = useRef(null);
  useWheelX(rowRef);

  const isOn = (tag) => picked.some((e) => e.toLowerCase() === tag.toLowerCase());
  const save = (list) => onChange(list.join(", "));
  const toggle = (tag) => {
    if (isOn(tag)) return save(picked.filter((e) => e.toLowerCase() !== tag.toLowerCase()));
    if (full) return onStatus?.(`Pick up to ${MAX_EMOTIONS} emotions. Remove one to add another.`, "err");
    save([...picked, tag]);
  };

  const chip = (tag, on) => (
    <button
      key={tag}
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-disabled={!on && full ? true : undefined}
      className={"bpx-chip" + (on ? " is-on" : "") + (!on && full ? " is-dim" : "")}
      title={on ? `${tag}: click to remove` : tag}
      onClick={() => toggle(tag)}
    >
      {tag}
    </button>
  );

  return (
    <div className="bp-field">
      <span className="bpx-label" id="bp-emotions-label">Desired Emotions</span>
      <div className="bpx-chips" role="group" aria-labelledby="bp-emotions-label" ref={rowRef}>
        <div className="bpx-chips-row">
          {custom.map((tag) => chip(tag, true))}
          {EMOTIONS.map((tag) => chip(tag, isOn(tag)))}
        </div>
      </div>
    </div>
  );
}

// Premium features: a gradient card with four feature tiles and a dark
// Unlock button over its lower edge. Preview only: nothing is clickable
// except the button, which does nothing yet.
function PremiumCard() {
  return (
    <div className="bp-field bpx-prem">
      <span className="bpx-label bpx-prem-label">
        Premium features
        <LockIcon className="bpx-prem-lock" />
      </span>
      <div className="bpx-prem-card">
        {/* White arcs drawn on the card's own 1570 × 1000 grid (the Figma
            frame); they show through the tiles and pass under Unlock. */}
        <svg className="bpx-prem-lines" viewBox="0 0 1570 1000" aria-hidden="true">
          <path d="M300 0 C 400 120, 405 330, 300 445 C 220 525, 100 560, 0 575" />
          <path d="M30 45 C 130 160, 260 220, 360 215 C 470 208, 580 120, 625 0" />
          <circle cx="35" cy="405" r="98" />
          <path d="M0 490 C 60 530, 190 538, 260 512" />
          <path d="M790 700 C 880 560, 1260 520, 1360 690" />
          <path d="M1210 680 C 1310 540, 1440 445, 1570 428" />
          <path d="M775 900 C 785 940, 795 975, 805 1000" />
          <path d="M1153 900 L 1163 1000" />
          <path d="M1432 900 C 1438 940, 1440 975, 1440 1000" />
        </svg>
        <ul className="bpx-prem-grid">
          {PREMIUM_FEATURES.map((f) => (
            <li key={f} className="bpx-prem-tile">{f}</li>
          ))}
        </ul>
        <button type="button" className="bpx-prem-unlock">Unlock With Premium</button>
      </div>
    </div>
  );
}

export default function CustomerTab({ brand, onField, onStatus }) {
  const stageIndex = Math.max(0, FUNNEL_STAGES.indexOf(brand.stage));
  // Where the thumb sits. It stays where it was dragged; it only moves on
  // its own when the stage changes elsewhere (another brand opened).
  const [stagePos, setStagePos] = useState(() => stageToPos(stageIndex));
  useEffect(() => {
    setStagePos((p) => (posToStage(p) === stageIndex ? p : stageToPos(stageIndex)));
  }, [stageIndex]);
  const onStage = (p) => {
    setStagePos(p);
    const next = posToStage(p);
    if (next !== stageIndex) onField("stage", FUNNEL_STAGES[next]);
  };

  return (
    <div className="bpx-card bpx-cust" role="tabpanel" id="bp-tabpanel-customer" aria-labelledby="bp-tab-customer">
      <div className="bp-field">
        <label className="bpx-label" htmlFor="bp-profile">Explain Ideal Client Profile</label>
        <input
          id="bp-profile"
          className="bp-input"
          type="text"
          maxLength={1000}
          placeholder="eg. New gen young aspirants"
          value={brand.profile ?? ""}
          onChange={(e) => onField("profile", e.target.value)}
        />
      </div>

      {/* Funnel stage: Discovery at the left, through to the warmest stage. */}
      <div className="bp-field">
        <div className="bpx-warmth-scale" aria-hidden="true">
          <span>Discovery</span>
          <span>Consideration</span>
          <span>Warm</span>
        </div>
        <input
          id="bp-stage"
          className="bpx-warmth bpx-stage"
          type="range"
          min={0}
          max={100}
          step={1}
          aria-label="Funnel stage"
          aria-valuetext={FUNNEL_STAGES[stageIndex]}
          value={stagePos}
          onChange={(e) => onStage(Number(e.target.value))}
        />
      </div>

      <Emotions value={brand.emo} onChange={(v) => onField("emo", v)} onStatus={onStatus} />

      <PremiumCard />
    </div>
  );
}
