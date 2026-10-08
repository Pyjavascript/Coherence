
import { useEffect, useState, useRef } from "react";
import {
  INDUSTRY_LAYERS, STYLE_PACKS, FUNNEL_STAGES, TONE_MODES, AUDIENCES, EMOTIONS, FORMALITIES, CTA_LEVELS,
} from "../lib/constants";

function BrandSelect({ value, onChange, options, label, premium = false, muted = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
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

  useEffect(() => {
    if (open) optionRefs.current[selectedIndex]?.focus();
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
    <div className={"bp-dd" + (open ? " open" : "") + (premium ? " bp-dd-premium" : "") + (muted ? " bp-dd-muted" : "")} ref={rootRef}>
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
        {premium && (
          <svg className="bp-dd-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4.5" y="10" width="15" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        )}
        <span className="bp-dd-value">{selected?.label ?? value}</span>
        <span className="bp-dd-chev" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 9 7 7 7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <ul className="bp-dd-menu" role="listbox" aria-label={label} onKeyDown={moveFocus}>
          {options.map((option, index) => (
            <li key={option.value} role="presentation">
              <button
                type="button"
                ref={(element) => { optionRefs.current[index] = element; }}
                className={"bp-dd-opt" + (option.value === value ? " selected" : "")}
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <span>{option.label}</span>
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

export default function BrandPanel({
  brand, onField, stylePack, onStylePack, variantCount, onVariantCount,
  researchCount, onSave, onDelete, onResearch, onCoherence, onHook, onClose,
}) {
  // Matches the design: Advanced Behaviour starts expanded.
  const [advOpen, setAdvOpen] = useState(true);
  const fileInputRef = useRef(null);
  const bind = (k) => ({ value: brand[k] ?? "", onChange: (e) => onField(k, e.target.value) });
  const opts = (list) => list.map((option) => ({ value: option, label: option }));

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onField("logo", reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rsb-scroll">
      {/* Title scrolls with the rest of the panel. */}
      <header className="rsb-head">
        <h2 title={brand.name || "Untitled Brand"}>{brand.name || "Untitled Brand"}</h2>
        <button type="button" aria-label="Collapse brand panel" title="Collapse" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <section className="bp-section">
        <h3 className="bp-section-title">Brand Core</h3>
        <div className="bp-card">
          <div className="bp-field">
            <label className="bp-label" htmlFor="bp-name">Brand Name</label>
            <div className="bp-inline bp-name-input">
              <input id="bp-name" className="bp-input" type="text" placeholder="Write Brand name" {...bind("name")} />
              <button type="button" className="bp-addimg" onClick={() => fileInputRef.current?.click()}>
                {brand.logo ? "Change image" : "Add image"}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="bp-file-input" onChange={handleImageUpload} />
            </div>
          </div>
          <div className="bp-field">
            <label className="bp-label" htmlFor="bp-belief">Core Belief</label>
            <textarea id="bp-belief" className="bp-textarea" rows={2} placeholder="eg.Scent is memory not marketing and assume ...." {...bind("belief")} />
          </div>
          <div className="bp-field">
            <label className="bp-label" htmlFor="bp-message">Message to adapt</label>
            <textarea id="bp-message" className="bp-textarea" rows={2} placeholder="Questions about cooperation, you will need to fill ...." {...bind("message")} />
          </div>
          <div className="bp-field">
            <div className="bp-label-row">
              <span className="bp-label">Industry Category</span>
              <span className="bp-tag">Pixel layer</span>
            </div>
            <BrandSelect
              label="Industry category"
              value={brand.industry}
              onChange={(value) => onField("industry", value)}
              options={Object.entries(INDUSTRY_LAYERS).map(([value, layer]) => ({ value, label: layer.label }))}
            />
          </div>
          <div className="bp-actions">
            <button type="button" className="bp-del" aria-label="Delete brand" title="Delete brand" onClick={onDelete}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3l.8-12.2" />
              </svg>
            </button>
            <button type="button" className="bp-save" onClick={onSave}>Save</button>
          </div>
        </div>
      </section>

      <section className="bp-section">
        <h3 className="bp-section-title">Customer Context</h3>
        <div className="bp-card">
          <div className="bp-row2">
            <div className="bp-field">
              <span className="bp-label">Funnel Stage</span>
              <BrandSelect label="Funnel stage" value={brand.stage} onChange={(value) => onField("stage", value)} options={opts(FUNNEL_STAGES)} />
            </div>
            <div className="bp-field">
              <span className="bp-label">Language</span>
              <BrandSelect label="Language mode" value={brand.mode} onChange={(value) => onField("mode", value)} options={opts(TONE_MODES)} />
            </div>
          </div>
          <div className="bp-field">
            <span className="bp-label">Audience Posture</span>
            <BrandSelect label="Audience posture" muted value={brand.audience} onChange={(value) => onField("audience", value)} options={opts(AUDIENCES)} />
          </div>
        </div>
      </section>

      <section className="bp-section bp-section-premium">
        <div className="bp-section-title-row">
          <h3 className="bp-section-title">Style &amp; Output</h3>
          <svg className="bp-section-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4.5" y="10" width="15" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
        <div className="bp-card bp-card-gold">
          <div className="bp-row2">
            <div className="bp-field">
              <span className="bp-label">Style Pack</span>
              <BrandSelect
                label="Style pack"
                premium
                value={stylePack}
                onChange={onStylePack}
                options={Object.entries(STYLE_PACKS).map(([value, pack]) => ({ value, label: `${pack.label}${value === "classic" ? "" : " 🔒"}` }))}
              />
            </div>
            <div className="bp-field">
              <span className="bp-label">Variants</span>
              <BrandSelect
                label="Variants per medium"
                premium
                value={String(variantCount)}
                onChange={(value) => onVariantCount(parseInt(value, 10))}
                options={[1, 2, 3].map((value) => ({ value: String(value), label: `${value}${value === 1 ? "" : " 🔒"}` }))}
              />
            </div>
          </div>
          <p className="bp-premium-note">Style packs and multiple variants are Premium.</p>
        </div>
      </section>

      <section className="bp-section">
        <button
          type="button"
          className="bp-section-toggle"
          aria-expanded={advOpen}
          aria-controls="bp-advanced"
          onClick={() => setAdvOpen((isOpen) => !isOpen)}
        >
          <span className="bp-section-title">Advanced Behaviour</span>
          <svg className={"bp-section-chevron" + (advOpen ? " open" : "")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {advOpen && (
          <div className="bp-card" id="bp-advanced">
            <div className="bp-field">
              <label className="bp-label" htmlFor="bp-pain">Customer Pain Points</label>
              <textarea id="bp-pain" className="bp-textarea" rows={2} placeholder="What's bothering them right before this moment?" {...bind("pain")} />
            </div>
            <div className="bp-row2">
              <div className="bp-field">
                <span className="bp-label">Desired Emotions</span>
                <BrandSelect label="Desired emotion" value={brand.emo} onChange={(value) => onField("emo", value)} options={opts(EMOTIONS)} />
              </div>
              <div className="bp-field">
                <span className="bp-label">Formality</span>
                <BrandSelect label="Formality" value={brand.formality} onChange={(value) => onField("formality", value)} options={opts(FORMALITIES)} />
              </div>
            </div>
            <div className="bp-field">
              <label className="bp-label" htmlFor="bp-objection">Objection to pre-empt</label>
              <input id="bp-objection" className="bp-input" type="text" placeholder="e.g. worried it wont last through the day" {...bind("objection")} />
            </div>
            <div className="bp-row2">
              <div className="bp-field">
                <span className="bp-label">CTA intensity</span>
                <BrandSelect label="CTA intensity" value={brand.cta} onChange={(value) => onField("cta", value)} options={opts(CTA_LEVELS)} />
              </div>
              <div className="bp-field">
                <label className="bp-label" htmlFor="bp-banned">Avoid words</label>
                <input id="bp-banned" className="bp-input" type="text" placeholder="e.g. cheap, best-ever" {...bind("banned")} />
              </div>
            </div>
            <div className="bp-field">
              <span className="bp-label" id="bp-research-label">Research notes</span>
              <button type="button" className="bp-research-field" aria-labelledby="bp-research-label" onClick={onResearch}>
                <span>Research notes</span><b>{researchCount}</b>
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="bp-section bp-external-section">
        <h3 className="bp-section-title">External Ai</h3>
        <button type="button" className="bp-copy" onClick={onCoherence}>
          Copy Prompt
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="8.5" y="8.5" width="11" height="11" rx="3" />
            <path d="M15.5 5.6c0-1.3-.9-2.1-2.1-2.1H6.1C4.8 3.5 4 4.4 4 5.6v7.3c0 1.2.8 2.1 2 2.1h.5" />
          </svg>
        </button>
      </section>

      <section className="bp-section bp-bonus-section">
        <div className="bp-card-hook">
          <div className="bp-gen-top">
            <span className="bp-gen-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8z" /></svg>
            </span>
            <div><h4>Generate Free Hook.</h4><p>One available daily on free versions</p></div>
          </div>
          <button type="button" className="bp-gen-btn" onClick={onHook}>Generate</button>
        </div>
      </section>
    </div>
  );
}
