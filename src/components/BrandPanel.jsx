
import { useEffect, useState, useRef } from "react";
import {
  INDUSTRY_LAYERS, STYLE_PACKS, FUNNEL_STAGES, TONE_MODES, AUDIENCES, EMOTIONS, FORMALITIES, CTA_LEVELS, LANGUAGES,
} from "../lib/constants";
import { toast } from "../lib/brandPanelCopy";
import { resizeImageFile } from "../lib/image";
import { shortcut } from "../lib/shortcuts";
import { timeUntilReset } from "../lib/hookQuota";
import BrandSelect, { LockIcon } from "./Select";

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

// Export formats for the Quick Grid's copy (App.jsx handleExport kinds).
const EXPORT_OPTIONS = [
  { value: "copy", label: "Copy all" },
  { value: "txt", label: ".txt file" },
  { value: "csv", label: ".csv file" },
];

export default function BrandPanel({
  brand, onField, stylePack, onStylePack, premium,
  researchCount, isSaved, dirty, saving, focusRequest, hookQuota, canExport,
  onSave, onDelete, onResearch, onCoherence, onHook, onHistory, onExport, onStatus, onClose,
}) {
  // Advanced Behaviour (including the style pack) is Premium and starts collapsed.
  const [advOpen, setAdvOpen] = useState(false);
  const [exportKind, setExportKind] = useState("copy");
  const [upsell, setUpsell] = useState(null); // { name, where: "advanced" }
  const fileInputRef = useRef(null);
  const bind = (k) => ({ value: brand[k] ?? "", onChange: (e) => onField(k, e.target.value) });
  const opts = (list) => list.map((option) => ({ value: option, label: option }));
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

  // App asks for a field (e.g. Generate without a brand name); wait for the panel to slide in.
  useEffect(() => {
    if (!focusRequest) return;
    focusTarget(focusRequest.target, 340);
  }, [focusRequest]);

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
      onStatus?.(...toast("imageUnreadable"));
    }
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
          title={isSaved ? "Generation history" : "Save the brand to see its history"}
          disabled={!isSaved}
          onClick={onHistory}
        >
          {/* A list of past entries with a clock: a log of what was generated. */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 5.5h14M4 10.5h6.5M4 15.5h4.5" />
            <circle cx="16.5" cy="16" r="5" />
            <path d="M16.5 13.6V16l1.6 1.1" />
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
              <input id="bp-name" className="bp-input" type="text" placeholder="e.g. Ferox Parfums" {...bind("name")} />
              <button type="button" className="bp-addimg" onClick={() => fileInputRef.current?.click()}>
                {brand.logo ? "Change image" : "Add image"}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="bp-file-input" onChange={handleImageUpload} />
            </div>
          </div>
          <div className="bp-field">
            <label className="bp-label" htmlFor="bp-belief">Core Belief</label>
            <textarea id="bp-belief" className="bp-textarea" rows={2} placeholder="e.g. Scent is memory, not marketing." {...bind("belief")} />
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
            <BrandSelect label="Audience posture" value={brand.audience} onChange={(value) => onField("audience", value)} options={opts(AUDIENCES)} />
          </div>
        </div>
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
             <div className="bp-row2">
              <div className="bp-field">
                <label className="bp-label" htmlFor="bp-location">Location</label>
                <LockedField locked={advLocked} onLocked={lockAdvanced} id="bp-location" className="bp-input" type="text" placeholder="e.g. Mumbai, India" {...bind("location")} />
              </div>
              <div className="bp-field">
                <span className="bp-label">Output Language</span>
                <BrandSelect label="Output language" locked={advLocked} onLocked={lockAdvanced} value={brand.language || "English"} onChange={(value) => onField("language", value)} options={opts(LANGUAGES)} />
              </div>
            </div>
            <div className="bp-field">
              <span className="bp-label">Style Pack</span>
              <BrandSelect
                label="Style pack"
                locked={advLocked}
                onLocked={lockAdvanced}
                value={stylePack}
                onChange={onStylePack}
                options={Object.entries(STYLE_PACKS).map(([value, pack]) => ({ value, label: pack.label }))}
              />
            </div>
            {renderUpsell(
              "advanced",
              "Advanced behaviour is Premium.",
              "Premium unlocks style packs, location, output language, pain points, emotions, objections, CTA intensity, avoid words and research notes.",
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

      {/* The Quick Grid's copy: pick a format, then copy it or download the file. */}
      <section className="bp-section bp-export-section">
        <h3 className="bp-section-title">Export</h3>
        <div className="bp-card">
          <div className="bp-export-row">
            <BrandSelect label="Export format" value={exportKind} onChange={setExportKind} options={EXPORT_OPTIONS} />
            <button
              type="button"
              className="bp-copy bp-export-btn"
              title={canExport ? "Export the Quick Grid's copy" : "Generate copy on the Quick Grid first to export it"}
              disabled={!canExport}
              onClick={() => onExport(exportKind)}
            >
              Export
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 16.5v2a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-2" />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
