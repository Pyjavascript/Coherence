
import { useEffect, useState, useRef } from "react";
import {
  INDUSTRY_LAYERS, STYLE_PACKS, FUNNEL_STAGES, TONE_MODES, AUDIENCES, EMOTIONS, FORMALITIES, CTA_LEVELS,
} from "../lib/constants";
import { resizeImageFile } from "../lib/image";
import { shortcut } from "../lib/shortcuts";
import { timeUntilReset } from "../lib/hookQuota";

const LockIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4.5" y="10" width="15" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

// Text input / textarea that is read-only behind a lock until Premium; any
// attempt to use it calls onLocked instead.
function LockedField({ locked, onLocked, as: Tag = "input", className = "", ...props }) {
  if (!locked) return <Tag className={className} {...props} />;
  return (
    <div className="bp-lockwrap">
      <LockIcon className="bp-field-lock" />
      <Tag
        className={className + " is-locked"}
        {...props}
        readOnly
        aria-readonly="true"
        onClick={onLocked}
        onKeyDown={(e) => { if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete" || e.key === "Enter") onLocked(); }}
      />
    </div>
  );
}

// premium: lock + centred value (Style & Output). locked: lock + left-aligned value,
// and clicking calls onLocked instead of opening (Advanced Behaviour).
function BrandSelect({ value, onChange, options, label, premium = false, muted = false, locked = false, onLocked }) {
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
    <div className={"bp-dd" + (open ? " open" : "") + (premium ? " bp-dd-premium" : "") + (locked ? " bp-dd-locked" : "") + (muted ? " bp-dd-muted" : "")} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="bp-dd-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (locked ? onLocked?.() : setOpen((isOpen) => !isOpen))}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            if (locked) onLocked?.();
            else setOpen(true);
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
                <span className="bp-dd-opt-label">
                  {option.locked && <LockIcon className="bp-dd-opt-lock" />}
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

export default function BrandPanel({
  brand, onField, stylePack, onStylePack, variantCount, onVariantCount, premium,
  researchCount, isSaved, dirty, saving, focusRequest, hookQuota,
  onSave, onDelete, onResearch, onCoherence, onHook, onHistory, onStatus, onClose,
}) {
  // Style & Output and Advanced Behaviour are Premium sections and start collapsed.
  const [styleOpen, setStyleOpen] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);
  const [messageFlagged, setMessageFlagged] = useState(false);
  const [upsell, setUpsell] = useState(null); // { name, where: "style" | "advanced" }
  const fileInputRef = useRef(null);
  const bind = (k) => ({ value: brand[k] ?? "", onChange: (e) => onField(k, e.target.value) });
  const opts = (list) => list.map((option) => ({ value: option, label: option }));
  const showMessageError = messageFlagged && !brand.message.trim();
  const advLocked = !premium;
  const lockAdvanced = () => setUpsell({ name: "Advanced behaviour", where: "advanced" });

  // Focus a field by id once the panel has slid in.
  const focusTarget = (target, delay = 60) => {
    window.setTimeout(() => {
      const el = document.getElementById(target);
      if (!el) return;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, delay);
  };

  // App asks for a field (e.g. Generate without a message); wait for the panel to slide in.
  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.flag) setMessageFlagged(true);
    focusTarget(focusRequest.target, 340);
  }, [focusRequest]);

  useEffect(() => {
    if (brand.message.trim()) setMessageFlagged(false);
  }, [brand.message]);

  useEffect(() => {
    if (premium) setUpsell(null);
  }, [premium]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    try {
      onField("logo", await resizeImageFile(file));
    } catch {
      onStatus?.("That file couldn't be read as an image. Try a PNG, JPG or SVG.", "err");
    }
  };

  const pickStyle = (value) => {
    if (value !== "classic" && !premium) return setUpsell({ name: STYLE_PACKS[value]?.label || "This style pack", where: "style" });
    setUpsell(null);
    onStylePack(value);
  };

  const pickVariants = (value) => {
    const count = parseInt(value, 10);
    if (count !== 1 && !premium) return setUpsell({ name: `${count} variants per medium`, where: "style" });
    setUpsell(null);
    onVariantCount(count);
  };

  // Gold Premium callout shown in the card the user just tried to use.
  const renderUpsell = (where, note, detail) => (upsell?.where === where ? (
    <div className="bp-upsell" role="status">
      <span className="bp-upsell-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 3.5c.4-1 1.8-1 2.2 0l1.5 3.8c.1.3.4.6.7.7l3.8 1.5c1 .4 1 1.8 0 2.2l-3.8 1.5c-.3.1-.6.4-.7.7l-1.5 3.8c-.4 1-1.8 1-2.2 0l-1.5-3.8c-.1-.3-.4-.6-.7-.7L4 11.7c-1-.4-1-1.8 0-2.2l3.8-1.5c.3-.1.6-.4.7-.7z" />
        </svg>
      </span>
      <div className="bp-upsell-text">
        <b>{upsell.name} is part of Premium.</b>
        <span>{detail}</span>
      </div>
      <button type="button" aria-label="Dismiss" onClick={() => setUpsell(null)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M7 7l10 10M17 7L7 17" />
        </svg>
      </button>
    </div>
  ) : (
    <p className="bp-premium-note">{note}</p>
  ));

  const saveLabel = saving ? "Saving…" : !isSaved ? "Save" : dirty ? "Save changes" : "Saved ✓";

  return (
    <div className="rsb-scroll">
      {/* Title scrolls with the rest of the panel. */}
      <header className="rsb-head">
        <h2 title={brand.name || "Untitled Brand"}>{brand.name || "Untitled Brand"}</h2>
        {dirty && <span className="rsb-unsaved" title="You have unsaved changes">Unsaved</span>}
        <button
          type="button"
          className="rsb-history"
          aria-label="Generation history"
          title={isSaved ? "Generation history" : "Save the brand to keep a generation history"}
          disabled={!isSaved}
          onClick={onHistory}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
            <path d="M3.5 4.5V8H7" />
            <path d="M12 7.5V12l3 2" />
          </svg>
        </button>
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
            <div className="bp-label-row">
              <label className="bp-label" htmlFor="bp-message">Message to adapt</label>
              <span className="bp-tag bp-required">Required</span>
            </div>
            <textarea
              id="bp-message"
              className={"bp-textarea" + (showMessageError ? " is-invalid" : "")}
              rows={2}
              placeholder="Questions about cooperation, you will need to fill ...."
              aria-required="true"
              aria-invalid={showMessageError || undefined}
              aria-describedby={showMessageError ? "bp-message-error" : undefined}
              {...bind("message")}
            />
            {showMessageError && (
              <p id="bp-message-error" className="bp-field-error">
                Write the message you want adapted — every medium is generated from it.
              </p>
            )}
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
            <button
              type="button"
              className="bp-del"
              aria-label="Delete brand"
              title={isSaved ? "Delete brand" : "Nothing to delete — this brand isn't saved yet"}
              disabled={!isSaved}
              onClick={onDelete}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3l.8-12.2" />
              </svg>
            </button>
            <button
              type="button"
              className="bp-save"
              title={`Save brand (${shortcut("S")})`}
              aria-busy={saving || undefined}
              disabled={saving}
              onClick={onSave}
            >
              {saveLabel}
            </button>
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

      <section className="bp-section bp-section-premium bp-advanced-section bp-style-section">
        <button
          type="button"
          className="bp-section-toggle"
          aria-expanded={styleOpen}
          aria-controls="bp-style"
          onClick={() => setStyleOpen((isOpen) => !isOpen)}
        >
          <span className="bp-toggle-label">
            <LockIcon className="bp-toggle-lock" />
            <span className="bp-section-title">Style &amp; Output</span>
          </span>
          <span className="bp-chevron-slot" aria-hidden="true">
            <svg className={"bp-section-chevron" + (styleOpen ? " open" : "")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>
        {styleOpen && (
        <div className="bp-card bp-card-cream" id="bp-style">
          <div className="bp-row2">
            <div className="bp-field">
              <span className="bp-label">Style Pack</span>
              <BrandSelect
                label="Style pack"
                premium
                value={stylePack}
                onChange={pickStyle}
                options={Object.entries(STYLE_PACKS).map(([value, pack]) => ({ value, label: pack.label, locked: !premium && value !== "classic" }))}
              />
            </div>
            <div className="bp-field">
              <span className="bp-label">Variants</span>
              <BrandSelect
                label="Variants per medium"
                premium
                value={String(variantCount)}
                onChange={pickVariants}
                options={[1, 2, 3].map((value) => ({ value: String(value), label: String(value), locked: !premium && value !== 1 }))}
              />
            </div>
          </div>
          {renderUpsell(
            "style",
            "Style packs and multiple variants are Premium.",
            "Premium unlocks every style pack and up to 3 variants per medium.",
          )}
        </div>
        )}
      </section>

      <section className="bp-section bp-section-premium bp-advanced-section">
        <button
          type="button"
          className="bp-section-toggle"
          aria-expanded={advOpen}
          aria-controls="bp-advanced"
          onClick={() => setAdvOpen((isOpen) => !isOpen)}
        >
          <span className="bp-toggle-label">
            <LockIcon className="bp-toggle-lock" />
            <span className="bp-section-title">Advanced Behaviour</span>
          </span>
          <span className="bp-chevron-slot" aria-hidden="true">
            <svg className={"bp-section-chevron" + (advOpen ? " open" : "")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>
        {advOpen && (
          <div className="bp-card bp-card-cream" id="bp-advanced">
            <div className="bp-field">
              <label className="bp-label" htmlFor="bp-pain">Customer Pain Points</label>
              <LockedField locked={advLocked} onLocked={lockAdvanced} id="bp-pain" className="bp-input" type="text" placeholder="What's bothering them right before this moment?" {...bind("pain")} />
            </div>
            <div className="bp-row2">
              <div className="bp-field">
                <span className="bp-label">Desired Emotions</span>
                <BrandSelect label="Desired emotion" locked={advLocked} onLocked={lockAdvanced} value={brand.emo} onChange={(value) => onField("emo", value)} options={opts(EMOTIONS)} />
              </div>
              <div className="bp-field">
                <span className="bp-label">Formality</span>
                <BrandSelect label="Formality" locked={advLocked} onLocked={lockAdvanced} value={brand.formality} onChange={(value) => onField("formality", value)} options={opts(FORMALITIES)} />
              </div>
            </div>
            <div className="bp-field">
              <label className="bp-label" htmlFor="bp-objection">Objection to pre-empt</label>
              <LockedField locked={advLocked} onLocked={lockAdvanced} id="bp-objection" className="bp-input" type="text" placeholder="e.g. worried it wont last through the day" {...bind("objection")} />
            </div>
            <div className="bp-row2">
              <div className="bp-field">
                <span className="bp-label">CTA intensity</span>
                <BrandSelect label="CTA intensity" locked={advLocked} onLocked={lockAdvanced} value={brand.cta} onChange={(value) => onField("cta", value)} options={opts(CTA_LEVELS)} />
              </div>
              <div className="bp-field">
                <label className="bp-label" htmlFor="bp-banned">Avoid words</label>
                <LockedField locked={advLocked} onLocked={lockAdvanced} id="bp-banned" className="bp-input" type="text" placeholder="e.g. cheap" {...bind("banned")} />
              </div>
            </div>
            <div className="bp-field">
              <span className="bp-label" id="bp-research-label">Research notes</span>
              <button
                type="button"
                className={"bp-research-field" + (advLocked ? " is-locked" : "")}
                aria-labelledby="bp-research-label"
                onClick={advLocked ? lockAdvanced : onResearch}
              >
                <span className="bp-research-label">
                  {advLocked && <LockIcon className="bp-field-lock-inline" />}
                  <span>Research notes</span>
                </span>
                <b>{researchCount}</b>
              </button>
            </div>
            {renderUpsell(
              "advanced",
              "Advanced behaviour is Premium.",
              "Premium unlocks pain points, emotions, objections, CTA intensity, avoid words and research notes.",
            )}
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
            <div>
              <h4>Generate Free Hook.</h4>
              <p>
                {hookQuota && hookQuota.left <= 0
                  ? `Today's free hook is used · next in ${timeUntilReset()}`
                  : `${hookQuota?.left ?? 1} free hook left today`}
              </p>
            </div>
          </div>
          <button type="button" className="bp-gen-btn" onClick={onHook}>Generate</button>
        </div>
      </section>
    </div>
  );
}
