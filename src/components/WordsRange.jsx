import { useId } from "react";

// Target words as a slider, as in the settings design: the label and the
// current count in a small white pill ("40 words") on one line, a thin track
// filled in green up to the thumb, and "Less · Medium · More" under it.
// Arrow keys step by 1, Page Up / Down by 10 (native range behaviour).
// onChange gets a whole number inside [min, max].
// label = null: no label of its own (the caller shows one; pass labelledBy).
export default function WordsRange({ id, label = "Target Words", labelledBy, value, min, max, onChange, step = 1 }) {
  const autoId = useId();
  const inputId = id || autoId;
  const n = Math.min(max, Math.max(min, Math.round(Number(value) || min)));
  const p = max > min ? (n - min) / (max - min) : 0;

  return (
    <div className="words-range">
      <div className="words-range-head">
        {label != null && <label htmlFor={inputId}>{label}</label>}
        <output htmlFor={inputId} className="words-range-value">
          {n} <span>words</span>
        </output>
      </div>
      <input
        id={inputId}
        className="words-range-input"
        data-field
        type="range"
        aria-labelledby={labelledBy}
        min={min}
        max={max}
        step={step}
        value={n}
        style={{ "--p": p }}
        aria-valuetext={`${n} words`}
        onChange={(e) => onChange(Math.round(Number(e.target.value)))}
        // Arrow keys move the slider, not the canvas (Node Studio) or the card.
        onKeyDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      />
      <div className="words-range-scale" aria-hidden="true">
        <span>Less</span>
        <span>Medium</span>
        <span>More</span>
      </div>
    </div>
  );
}
