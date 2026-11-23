import { useEffect, useRef, useState } from "react";
import { INDUSTRY_LAYERS, LANGUAGES, MAX_PILLARS, MAX_PILLAR_CHARS, PERSONALITIES, WARMTH_DEFAULT } from "../lib/constants";
import { toast } from "../lib/brandPanelCopy";
import { resizeImageFile } from "../lib/image";
import BrandSelect from "./Select";
import BrandLogo from "./BrandLogo";
import CustomerTab from "./CustomerTab";

// The "Content Job" here is the same text as the composer at the bottom of
// the workspace (brand.message): typing in either updates both.
const MAX_MESSAGE = 2000; // the generate function's cap on brand.message

// The Cold / Neutral / Warm slider's value, read out to screen readers.
const warmthText = (w) => (w <= 15 ? "Cold" : w <= 40 ? "Cool" : w <= 60 ? "Neutral" : w <= 85 ? "Warm" : "Very warm");

const TABS = [
  { key: "brand", label: "Brand" },
  { key: "language", label: "Language" },
  { key: "customer", label: "Customer" },
];

const Icon = ({ d, width = 2 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const ICONS = {
  download: "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 16.5v2a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-2",
  close: "M6 6l12 12M18 6L6 18",
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  regen: "M20 12a8 8 0 1 1-2.34-5.66L20 8.5M20 4v4.5h-4.5",
  image: "M5.5 4.5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2zM20.5 15.5l-4.6-4.6a1.5 1.5 0 0 0-2.1 0L5 19.5M9 8.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4z",
};

// Brand pillars: up to MAX_PILLARS cards. Written ones come first (Pillar 1,
// 2, ...); every free slot is an "Add New" card. Adding or clicking a pillar
// opens an input under the cards: Enter (or the tick) keeps it, Escape
// cancels, and saving an existing pillar empty removes it.
function Pillars({ pillars, onChange }) {
  const [editing, setEditing] = useState(null); // null | index (pillars.length = a new one)
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing != null) inputRef.current?.focus();
  }, [editing]);

  // Another brand opened (or the fields cleared) under an open editor.
  useEffect(() => {
    if (editing != null && editing > pillars.length) setEditing(null);
  }, [pillars.length, editing]);

  const open = (index) => {
    setEditing(index);
    setDraft(pillars[index] ?? "");
  };
  const close = () => setEditing(null);
  const commit = () => {
    if (editing == null) return;
    const text = draft.trim();
    if (editing >= pillars.length) {
      if (text && pillars.length < MAX_PILLARS) onChange([...pillars, text]);
    } else if (text) {
      onChange(pillars.map((p, i) => (i === editing ? text : p)));
    } else {
      onChange(pillars.filter((_, i) => i !== editing));
    }
    close();
  };
  const remove = (index) => {
    onChange(pillars.filter((_, i) => i !== index));
    if (editing != null) close();
  };

  const isNew = editing != null && editing >= pillars.length;

  return (
    <>
      <div className="bpx-pillars" role="group" aria-labelledby="bp-pillars-label">
        {pillars.map((pillar, index) => (
          <div className={"bpx-pillar" + (editing === index ? " is-editing" : "")} key={index}>
            <button
              type="button"
              className="bpx-pillar-body"
              aria-label={`Pillar ${index + 1}: ${pillar}. Edit`}
              title={`${pillar}\n\nClick to edit`}
              onClick={() => open(index)}
            >
              <span className="bpx-pillar-text">{pillar}</span>
            </button>
            <button
              type="button"
              className="bpx-pillar-remove"
              aria-label={`Remove pillar ${index + 1}`}
              title="Remove pillar"
              onClick={() => remove(index)}
            >
              <Icon d={ICONS.close} width={2.4} />
            </button>
          </div>
        ))}
        {Array.from({ length: MAX_PILLARS - pillars.length }, (_, i) => (
          <button
            key={`add-${i}`}
            type="button"
            className={"bpx-pillar bpx-pillar-add" + (isNew && i === 0 ? " is-editing" : "")}
            onClick={() => open(pillars.length)}
          >
            <span aria-hidden="true">+</span>
            Add New
          </button>
        ))}
      </div>

      {editing != null && (
        <div className="bpx-pillar-editor">
          <label className="sr-only" htmlFor="bp-pillar-input">Pillar {Math.min(editing, pillars.length) + 1}</label>
          <input
            id="bp-pillar-input"
            ref={inputRef}
            className="bp-input"
            type="text"
            maxLength={MAX_PILLAR_CHARS}
            placeholder={`Write pillar ${Math.min(editing, pillars.length) + 1}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                close();
              }
            }}
          />
          <button
            type="button"
            className="bpx-pillar-ok"
            aria-label={isNew ? "Add pillar" : "Save pillar"}
            title={isNew ? "Add pillar (Enter)" : "Save pillar (Enter)"}
            onClick={commit}
          >
            <Icon d={ICONS.check} width={2.4} />
          </button>
        </div>
      )}
    </>
  );
}

export default function BrandPanel({
  brand, onField, saving, focusRequest, canExport, generating, atGenLimit,
  onSave, onRegenerate, onCopyPrompt, onDownload, onStatus, onClose,
  premium, onPremiumToggle, onUpgrade, notesCount, onOpenNotes,
}) {
  const [tab, setTab] = useState("brand");
  const fileInputRef = useRef(null);
  const chipsRef = useRef(null);
  const tabRefs = useRef([]);
  const bind = (k) => ({ value: brand[k] ?? "", onChange: (e) => onField(k, e.target.value) });
  const pillars = Array.isArray(brand.pillars) ? brand.pillars : [];
  const warmth = Number.isFinite(Number(brand.warmth)) ? Number(brand.warmth) : WARMTH_DEFAULT;

  // App asks for a field (e.g. Generate without a brand name): show the
  // Brand tab and focus it once the panel has slid in.
  useEffect(() => {
    if (!focusRequest) return undefined;
    setTab("brand");
    const timer = window.setTimeout(() => {
      const el = document.getElementById(focusRequest.target);
      if (!el) return;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 340);
    return () => window.clearTimeout(timer);
  }, [focusRequest]);

  // The personality chips scroll sideways with an ordinary mouse wheel too,
  // until the row reaches its end (then the panel scrolls as usual).
  useEffect(() => {
    const row = chipsRef.current;
    if (!row) return undefined;
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = row.scrollWidth - row.clientWidth;
      if (max <= 0) return;
      const next = Math.min(max, Math.max(0, row.scrollLeft + e.deltaY));
      if (next === row.scrollLeft) return;
      e.preventDefault();
      row.scrollLeft = next;
    };
    row.addEventListener("wheel", onWheel, { passive: false });
    return () => row.removeEventListener("wheel", onWheel);
  }, [tab]);

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

  // Arrow keys move between the tabs (WAI-ARIA tabs pattern).
  const onTabKey = (e) => {
    const index = TABS.findIndex((t) => t.key === tab);
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + TABS.length) % TABS.length;
    setTab(TABS[next].key);
    tabRefs.current[next]?.focus();
  };

  const title = brand.name?.trim() || "Untitled Brand";

  return (
    <div className="rsb-scroll bpx">
      <header className="rsb-head bpx-head">
        <h2 title={title}>{title}</h2>
        {/* Shown only once this brand has generated copy on the Quick Grid. */}
        {canExport && (
          <button
            type="button"
            className="bpx-head-btn"
            aria-label="Download copy"
            title="Download this brand's copy (.txt)"
            onClick={onDownload}
          >
            <Icon d={ICONS.download} />
          </button>
        )}
        <button type="button" className="bpx-head-btn bpx-close" aria-label="Close brand panel" title="Close" onClick={onClose}>
          {/* Same stroke as the rail's Add Brand "+" (brand-panel.css .bpx-close). */}
          <Icon d={ICONS.close} width={2} />
        </button>
      </header>

      <div className="bpx-tabs" role="tablist" aria-label="Brand panel sections" onKeyDown={onTabKey}>
        {TABS.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => { tabRefs.current[i] = el; }}
            type="button"
            role="tab"
            id={`bp-tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`bp-tabpanel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            className={"bpx-tab" + (tab === t.key ? " is-active" : "")}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bpx-body">
        {tab === "brand" && (
          <div className="bpx-card" role="tabpanel" id="bp-tabpanel-brand" aria-labelledby="bp-tab-brand">
            <div className="bp-field">
              <label className="bpx-label" htmlFor="bp-name">Brand Name</label>
              <div className="bp-inline bp-name-input">
                <input id="bp-name" className="bp-input" type="text" placeholder="Type here" maxLength={200} {...bind("name")} />
                <button
                  type="button"
                  className={"bp-addimg" + (brand.logo ? " has-logo" : "")}
                  aria-label={brand.logo ? "Change logo" : "Add logo"}
                  title={brand.logo ? "Change logo" : "Add logo"}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {brand.logo ? <BrandLogo src={brand.logo} /> : <Icon d={ICONS.image} width={1.75} />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="bp-file-input" onChange={handleImageUpload} />
              </div>
            </div>

            <div className="bp-field">
              <span className="bpx-label" id="bp-industry-label">Industry</span>
              <BrandSelect
                label="Industry"
                value={brand.industry}
                onChange={(value) => onField("industry", value)}
                options={Object.entries(INDUSTRY_LAYERS).map(([value, layer]) => ({ value, label: layer.label }))}
              />
            </div>

            <div className="bp-field bpx-flex">
              <label className="bpx-label" htmlFor="bp-belief">Core promise / values / principles</label>
              <textarea
                id="bp-belief"
                className="bp-textarea bpx-tall"
                maxLength={2000}
                placeholder="e.g. Our scent is a memory, not marketing."
                {...bind("belief")}
              />
            </div>

            <div className="bp-field bpx-flex">
              <span className="bpx-label" id="bp-pillars-label">Create brand Pillars</span>
              <Pillars pillars={pillars} onChange={(next) => onField("pillars", next)} />
            </div>

            <div className="bp-field bpx-flex">
              <label className="bpx-label" htmlFor="bp-message">Content Job</label>
              <textarea
                id="bp-message"
                className="bp-textarea bpx-tall"
                maxLength={MAX_MESSAGE}
                placeholder="e.g. Hook"
                {...bind("message")}
              />
            </div>
          </div>
        )}

        {tab === "language" && (
          <div className="bpx-card" role="tabpanel" id="bp-tabpanel-language" aria-labelledby="bp-tab-language">
            <div className="bp-field">
              <span className="bpx-label" id="bp-personality-label">Select a personality</span>
              <div className="bpx-chips" role="radiogroup" aria-labelledby="bp-personality-label" ref={chipsRef}>
                {/* Equal-width chips, three to a row width, like the tabs
                    (brand-panel.css .bpx-chips-row). */}
                <div className="bpx-chips-row">
                {PERSONALITIES.map((p) => {
                  const on = brand.personality === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={"bpx-chip" + (on ? " is-on" : "")}
                      // Clicking the chosen one again clears it (no personality).
                      onClick={() => onField("personality", on ? "" : p)}
                    >
                      {p}
                    </button>
                  );
                })}
                </div>
              </div>
            </div>

            <div className="bp-field">
              <label className="bpx-label" htmlFor="bp-rules">Mention writing rules</label>
              <input id="bp-rules" className="bp-input" type="text" maxLength={1000} placeholder="e.g. short sentences, active voice" {...bind("rules")} />
            </div>

            <div className="bp-field">
              <label className="bpx-label" htmlFor="bp-banned">Mention words to avoid</label>
              <input id="bp-banned" className="bp-input" type="text" maxLength={1000} placeholder="e.g. cheap, best-ever, revolutionary" {...bind("banned")} />
            </div>

            {/* The language every piece of copy is written in (brands.language;
                prompts.js tells the model to write in it). */}
            <div className="bp-field">
              <span className="bpx-label" id="bp-language-label">Output language</span>
              <BrandSelect
                label="Output language"
                value={brand.language || "English"}
                onChange={(value) => onField("language", value)}
                options={LANGUAGES.map((l) => ({ value: l, label: l }))}
                visibleOptions={5}
              />
            </div>

            <div className="bp-field bpx-flex">
              <label className="bpx-label" htmlFor="bp-voice">Voice / Tone sample (optional)</label>
              <textarea
                id="bp-voice"
                className="bp-textarea bpx-tall"
                maxLength={1000}
                placeholder="A line or two of copy that sounds like your brand."
                {...bind("voice")}
              />
            </div>

            <div className="bp-field">
              <div className="bpx-warmth-scale" aria-hidden="true">
                <span>Cold</span>
                <span>Neutral</span>
                <span>Warm</span>
              </div>
              <input
                id="bp-warmth"
                className="bpx-warmth"
                type="range"
                min={0}
                max={100}
                step={1}
                aria-label="Warmth, cold to warm"
                aria-valuetext={warmthText(warmth)}
                value={warmth}
                onChange={(e) => onField("warmth", Number(e.target.value))}
              />
            </div>
          </div>
        )}

        {tab === "customer" && (
          <CustomerTab
            brand={brand}
            onField={onField}
            onStatus={onStatus}
            premium={premium}
            onPremiumToggle={onPremiumToggle}
            onUpgrade={onUpgrade}
            notesCount={notesCount}
            onOpenNotes={onOpenNotes}
          />
        )}

        <div className="bpx-bar">
          <button type="button" className="bpx-btn bpx-copy" onClick={onCopyPrompt}>
            Copy AI Prompt
          </button>
          <span className="bpx-bar-end">
            {/* Writes the cards again from the brand as it is now (the
                composer's Generate). */}
            <button
              type="button"
              className={"bpx-btn bpx-icon bpx-regen" + (generating ? " is-busy" : "")}
              aria-label={generating ? "Generating" : "Regenerate"}
              title={atGenLimit ? "Daily generation limit reached" : generating ? "Generating…" : "Regenerate"}
              aria-busy={generating || undefined}
              disabled={generating || atGenLimit}
              onClick={onRegenerate}
            >
              <Icon d={ICONS.regen} />
            </button>
            <button
              type="button"
              className={"bpx-btn bpx-icon bpx-save" + (saving ? " is-busy" : "")}
              aria-label={saving ? "Saving brand" : "Save and generate"}
              title={saving ? "Saving…" : generating ? "Generating…" : "Save the brand and generate copy"}
              aria-busy={saving || undefined}
              disabled={saving || generating}
              onClick={onSave}
            >
              {saving ? <span className="bpx-spin" aria-hidden="true" /> : <Icon d={ICONS.arrow} width={2.2} />}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
