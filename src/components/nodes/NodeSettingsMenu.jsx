import { useEffect, useId, useRef, useState } from "react";

const Chevron = ({ className, d = "m5 9 7 7 7-7" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const RIGHT = "m9 5 7 7-7 7";
const LEFT = "m15 5-7 7 7 7";

// Pointer has to stay out this long before the menu closes, so crossing the
// gap between the arrow and the panel doesn't shut it.
const LEAVE_MS = 250;

// Number box. Whatever was typed is saved when it goes away (back, Enter,
// closing the menu); Esc puts the saved value back first.
function NumberField({ value, min, max, labelId, onCommit, onDone }) {
  const [draft, setDraft] = useState(String(value));
  const latest = useRef(null);
  latest.current = { draft, value, min, max, onCommit };

  useEffect(() => setDraft(String(value)), [value]);

  useEffect(() => () => {
    const { draft: text, value: saved, min: lo, max: hi, onCommit: commit } = latest.current;
    const n = Math.round(Number(text));
    if (text.trim() && Number.isFinite(n) && n !== saved) commit(Math.min(hi, Math.max(lo, n)));
  }, []);

  // The arrows step the box (pointerdown is cancelled so focus stays in it).
  const step = (by) => {
    const n = Math.round(Number(draft));
    const from = draft.trim() && Number.isFinite(n) ? n : value;
    setDraft(String(Math.min(max, Math.max(min, from + by))));
  };

  return (
    <div className="ncard-sheet-number">
      <input
        data-field
        className="ncard-sheet-input"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        aria-labelledby={labelId}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          // Keep Enter here: it shouldn't also trigger app shortcuts (Ctrl+Enter = Generate).
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            onDone();
          } else if (e.key === "Escape") {
            latest.current.draft = String(value);
          }
        }}
      />
      <div className="ncard-sheet-steps">
        <button type="button" tabIndex={-1} aria-label="Increase" onPointerDown={(e) => e.preventDefault()} onClick={() => step(1)}>
          <Chevron d="m6 15 6-6 6 6" />
        </button>
        <button type="button" tabIndex={-1} aria-label="Decrease" onPointerDown={(e) => e.preventDefault()} onClick={() => step(-1)}>
          <Chevron />
        </button>
      </div>
    </div>
  );
}

// A card's settings (Node Studio's fields) behind the arrow beside its title.
// The arrow opens a list of the settings; picking one swaps the list for that
// setting's input, with a back arrow top left. The menu closes from the arrow,
// a tap or click outside, Esc, or (mouse) the pointer leaving it — unless a
// field inside is being typed in.
// fields = [{ key, label, kind: "text" | "number" | "choice", value, display,
//             placeholder, min, max, options: [[key, label]], isSet, onChange }]
export default function NodeSettingsMenu({ label, fields }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const leaveTimer = useRef(0);
  // The setting last opened, so going back puts focus on it again.
  const lastKey = useRef(null);
  const field = fields.find((f) => f.key === editing);
  const labelId = useId();

  const close = (focusTrigger = false) => {
    window.clearTimeout(leaveTimer.current);
    setOpen(false);
    setEditing(null);
    lastKey.current = null;
    if (focusTrigger) triggerRef.current?.focus();
  };

  const back = () => {
    lastKey.current = editing;
    setEditing(null);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  // Focus follows the view: the field being edited, or the list (on the
  // setting just left, else the first).
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const target = editing
      ? panel?.querySelector("[data-field]")
      : panel?.querySelector(`[data-key="${lastKey.current}"]`) || panel?.querySelector("[data-key]");
    target?.focus();
  }, [open, editing]);

  // Up / Down move between the settings in the list.
  const onListKeyDown = (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = [...panelRef.current.querySelectorAll("[data-key]")];
    const at = items.indexOf(document.activeElement);
    items[(at + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };

  const typing = () => {
    const active = document.activeElement;
    return Boolean(active && rootRef.current?.contains(active) && active.matches("input, textarea"));
  };

  return (
    <div
      className="ncard-sheet-root"
      ref={rootRef}
      onPointerEnter={() => window.clearTimeout(leaveTimer.current)}
      onPointerLeave={(e) => {
        if (!open || e.pointerType !== "mouse" || typing()) return;
        leaveTimer.current = window.setTimeout(() => close(), LEAVE_MS);
      }}
      /* Tabbing out closes it. (No relatedTarget = a view swap removed the
         focused button, or a click outside, which pointerdown handles.) */
      onBlur={(e) => { if (open && e.relatedTarget && !rootRef.current?.contains(e.relatedTarget)) close(); }}
    >
      <button
        type="button"
        ref={triggerRef}
        className={"ncard-sheet-trigger" + (open ? " is-open" : "")}
        title={`${label} settings`}
        aria-label={`${label} settings`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Chevron />
      </button>
      {open && (
        <div
          ref={panelRef}
          className="ncard-sheet"
          role="dialog"
          aria-label={`${label} settings`}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            e.preventDefault();
            e.stopPropagation();
            if (editing) back();
            else close(true);
          }}
        >
          {field ? (
            <div className="ncard-sheet-edit" key={field.key}>
              <div className="ncard-sheet-head">
                <button type="button" className="ncard-sheet-back" aria-label="Back to settings" title="Back" onClick={back}>
                  <Chevron d={LEFT} />
                </button>
                <span id={labelId}>{field.label}</span>
              </div>
              {field.kind === "number" && (
                <NumberField value={field.value} min={field.min} max={field.max} labelId={labelId} onCommit={field.onChange} onDone={back} />
              )}
              {field.kind === "text" && (
                <textarea
                  data-field
                  className="ncard-sheet-input"
                  rows={3}
                  aria-labelledby={labelId}
                  placeholder={field.placeholder}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
              {field.kind === "choice" && (
                <div className="ncard-sheet-list" role="radiogroup" aria-labelledby={labelId}>
                  {field.options.map(([key, text]) => (
                    <button
                      type="button"
                      key={key}
                      role="radio"
                      aria-checked={key === field.value}
                      data-field={key === field.value || undefined}
                      className="ncard-sheet-item"
                      onClick={() => {
                        if (key !== field.value) field.onChange(key);
                        back();
                      }}
                    >
                      <span className="ncard-sheet-label">{text}</span>
                      {key === field.value && <Chevron className="ncard-sheet-check" d="m4.5 12.5 5 5L19.5 7" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="ncard-sheet-list" role="group" onKeyDown={onListKeyDown}>
              {fields.map((f) => (
                <button
                  type="button"
                  key={f.key}
                  data-key={f.key}
                  className={"ncard-sheet-item" + (f.isSet ? " is-set" : "")}
                  onClick={() => setEditing(f.key)}
                >
                  <span className="ncard-sheet-label">{f.label}</span>
                  {f.display && <span className="ncard-sheet-value">{f.display}</span>}
                  <Chevron className="ncard-sheet-arrow" d={RIGHT} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
