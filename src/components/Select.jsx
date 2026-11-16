import { useEffect, useLayoutEffect, useRef, useState } from "react";

export const LockIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4.5" y="10" width="15" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

// The app's dropdown (brand panel, Node Studio fields). options = [{ value, label, locked? }].
// premium: lock + centred value (Style & Output). locked: lock + left-aligned value;
// the menu still opens so the options can be browsed, but picking one calls
// onLocked instead of onChange (Advanced Behaviour).
// visibleOptions: show at most this many rows; the rest scroll (a long list
// that would otherwise run past the panel, e.g. Output language).
export default function Select({ value, onChange, options, label, premium = false, locked = false, onLocked, visibleOptions }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const menuRef = useRef(null);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Cap the list at visibleOptions rows, measured from the rendered rows so it
  // follows their real height. Runs before focus, so the chosen option then
  // scrolls into view inside the capped list.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!open || !menu || !visibleOptions || options.length <= visibleOptions) return;
    const last = optionRefs.current[visibleOptions - 1]?.parentElement;
    if (!last) return;
    const padBottom = parseFloat(getComputedStyle(menu).paddingBottom) || 0;
    menu.style.maxHeight = `${Math.ceil(last.offsetTop + last.offsetHeight + padBottom)}px`;
  }, [open, visibleOptions, options.length]);

  useEffect(() => {
    if (open) optionRefs.current[selectedIndex]?.focus({ preventScroll: true });
    if (open) optionRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, selectedIndex]);

  const moveFocus = (event) => {
    const currentIndex = optionRefs.current.indexOf(document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      optionRefs.current[(currentIndex + direction + options.length) % options.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      optionRefs.current[event.key === "Home" ? 0 : options.length - 1]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className={"bp-dd" + (open ? " open" : "") + (premium ? " bp-dd-premium" : "") + (locked ? " bp-dd-locked" : "")} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="bp-dd-trigger"
        aria-label={label}
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
        {(premium || locked) && <LockIcon className="bp-dd-lock" />}
        <span className="bp-dd-value">{selected?.label ?? value}</span>
        <span className="bp-dd-chev" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 9 7 7 7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <ul className="bp-dd-menu" role="listbox" aria-label={label} onKeyDown={moveFocus} ref={menuRef}>
          {options.map((option, index) => (
            <li key={option.value} role="presentation">
              <button
                type="button"
                ref={(element) => { optionRefs.current[index] = element; }}
                className={"bp-dd-opt" + (option.value === value ? " selected" : "")}
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  if (!locked) onChange(option.value);
                  else if (option.value !== value) onLocked?.();
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <span className="bp-dd-opt-label">
                  {(option.locked || (locked && option.value !== value)) && <LockIcon className="bp-dd-opt-lock" />}
                  <span>{option.label}</span>
                </span>
                {option.value === value && (
                  <svg className="bp-dd-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
