import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { INDUSTRY_LAYERS } from "@web/lib/constants.js";
import { markColorOf } from "@web/components/BrandMark.jsx";
import { PlusIcon } from "./icons";

interface BrandLike {
  id: string;
  name?: string;
  logo?: string;
  industry?: string;
}

interface Props {
  brands: BrandLike[];
  brand: BrandLike | null;
  loading: boolean;
  atLimit: boolean;
  limit: number;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

const industryOf = (b: BrandLike) =>
  (INDUSTRY_LAYERS as Record<string, { label: string }>)[b.industry || ""]?.label || "General";

export function BrandAvatar({ brand, size = "md" }: { brand: BrandLike | null; size?: "sm" | "md" }) {
  return (
    <span
      className={"brand-avatar is-" + size}
      style={{ background: brand && !brand.logo ? markColorOf(brand) : undefined }}
      aria-hidden="true"
    >
      {brand?.logo ? <img src={brand.logo} alt="" /> : (brand?.name || "").trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 9 7 7 7-7" />
  </svg>
);

const Check = () => (
  <svg className="brand-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m4.5 12.5 5 5L19.5 7" />
  </svg>
);

// The web app's custom dropdown (BrandSelect in BrandPanel.jsx), for brands:
// a white trigger, a rounded menu of rows with a check on the selected one,
// and "New brand" at the bottom.
export default function BrandPicker({ brands, brand, loading, atLimit, limit, onSelect, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(0, brands.findIndex((b) => b.id === brand?.id));

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
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

  useEffect(() => {
    if (open) optionRefs.current[selectedIndex]?.focus();
  }, [open, selectedIndex]);

  const moveFocus = (event: KeyboardEvent) => {
    const items = optionRefs.current.filter((el): el is HTMLButtonElement => Boolean(el && !el.disabled));
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      items[(current + step + items.length) % items.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const empty = !brands.length;

  return (
    <div className={"brand-dd" + (open ? " open" : "")} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="brand-dd-trigger"
        aria-label={brand ? `Brand: ${brand.name || "Untitled brand"}` : "Choose a brand"}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={loading && empty}
        onClick={() => (empty ? onAdd() : setOpen((o) => !o))}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open && !empty) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <BrandAvatar brand={brand} />
        <span className="brand-dd-text">
          {/* <span className="brand-dd-label">Writing for</span> */}
          <span className="brand-dd-value">
            {brand ? brand.name || "Untitled brand" : loading ? "Loading brands…" : "Add your first brand"}
          </span>
        </span>
        <span className="brand-dd-chev" aria-hidden="true">
          {empty && !loading ? <PlusIcon /> : <Chevron />}
        </span>
      </button>

      {open && (
        <div className="brand-dd-menu" onKeyDown={moveFocus}>
          <ul role="listbox" aria-label="Brands">
            {brands.map((b, index) => {
              const selected = b.id === brand?.id;
              return (
                <li key={b.id} role="presentation">
                  <button
                    type="button"
                    ref={(el) => { optionRefs.current[index] = el; }}
                    className={"brand-dd-opt" + (selected ? " selected" : "")}
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onSelect(b.id);
                      close();
                    }}
                  >
                    <BrandAvatar brand={b} size="sm" />
                    <span className="brand-dd-opt-text">
                      <span className="brand-dd-opt-name">{b.name || "Untitled brand"}</span>
                      <span className="brand-dd-opt-meta">{industryOf(b)}</span>
                    </span>
                    {selected && <Check />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="brand-dd-foot">
            <button
              type="button"
              ref={(el) => { optionRefs.current[brands.length] = el; }}
              className="brand-dd-add"
              disabled={atLimit}
              onClick={() => {
                onAdd();
                close();
              }}
            >
              <span className="brand-dd-add-icon"><PlusIcon /></span>
              New brand
              <span className="brand-dd-count">
                {Math.min(brands.length, limit)}/{limit}
              </span>
            </button>
            {atLimit && <p className="brand-dd-note">The free plan includes {limit} brands.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
