import { useEffect, useRef, useState } from "react";
import { WEBSITE_COMPONENTS } from "../../lib/constants";

const OPTIONS = Object.entries(WEBSITE_COMPONENTS);

// Website card's component picker, shown next to the card title.
export default function NodeComponentSelect({ value, label, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const current = WEBSITE_COMPONENTS[value] || WEBSITE_COMPONENTS.hero;

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[Math.max(0, OPTIONS.findIndex(([key]) => key === value))]?.focus();
  }, [open, value]);

  const choose = (key) => {
    if (key !== value) onChange(key);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onListKeyDown = (event) => {
    const currentIndex = optionRefs.current.indexOf(document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      optionRefs.current[(currentIndex + direction + OPTIONS.length) % OPTIONS.length]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className={"ncard-select" + (open ? " is-open" : "")} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="ncard-select-trigger"
        title={`${label} component`}
        aria-label={`${label} component: ${current.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="ncard-select-value">{current.label}</span>
        <svg className="ncard-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 9 7 7 7-7" />
        </svg>
      </button>
      {open && (
        <ul className="ncard-select-list" role="listbox" aria-label={`${label} component`} onKeyDown={onListKeyDown}>
          {OPTIONS.map(([key, option], index) => (
            <li key={key} role="presentation">
              <button
                type="button"
                ref={(element) => { optionRefs.current[index] = element; }}
                className="ncard-select-option"
                role="option"
                aria-selected={key === value}
                onClick={() => choose(key)}
              >
                <span>{option.label}</span>
                {key === value && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m4.5 12.5 5 5L19.5 7" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
