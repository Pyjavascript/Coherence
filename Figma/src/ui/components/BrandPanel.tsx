import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AUDIENCES, CTA_LEVELS, DEFAULT_BRAND, EMOTIONS, FORMALITIES, FUNNEL_STAGES, INDUSTRY_LAYERS, LANGUAGES, STYLE_PACKS, TONE_MODES,
} from "@web/lib/constants.js";
import { LIMITS } from "@web/lib/clientId.js";
import { resizeImageFile } from "@web/lib/image.js";
import type { Brand, BrandFields } from "../hooks/useBrandData";
import { hasWebApp, openWebApp } from "../lib/webApp";
import { BrandAvatar } from "./BrandPicker";
import { InfoIcon, PlusIcon } from "./icons";

// The web app's right-hand brand panel (src/components/BrandPanel.jsx) laid out
// inline for the plugin: Brand core, Customer context, then the Premium
// sections, which open in place. No hook, no coherence prompt, no dialogs.

// The plugin is the free plan, where Style & Output and Advanced Behaviour are
// read-only, as in the web app.
const PREMIUM = false;

const INDUSTRIES = Object.entries(INDUSTRY_LAYERS as Record<string, { label: string }>).map(([key, layer]) => ({
  key,
  label: layer.label,
}));

type FieldKey = keyof BrandFields & keyof typeof DEFAULT_BRAND;
const FIELD_KEYS = Object.keys(DEFAULT_BRAND) as FieldKey[];
const fieldsOf = (brand: Brand | null): BrandFields => {
  const out: BrandFields = { ...DEFAULT_BRAND };
  if (brand) for (const k of FIELD_KEYS) out[k] = brand[k] ?? DEFAULT_BRAND[k];
  return out;
};

const LockIcon = () => (
  <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4.5" y="10" width="15" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m4.5 12.5 5 5L19.5 7" />
  </svg>
);

const Chevron =({ open }: { open: boolean }) => (
  <svg className={"section-chevron" + (open ? " is-open" : "")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

function Select({ value, options, onChange, disabled, label }: {
  value: string;
  options: { value: string; label: string }[] | readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const list = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <select aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {list.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// A Premium section: a header row that opens the card in place.
function PremiumSection({ id, title, open, onToggle, children }: {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className={"bp-section is-premium" + (open ? " is-open" : "")}>
      <button type="button" className="bp-section-toggle" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        {!PREMIUM && <LockIcon />}
        <span className="bp-section-title">{title}</span>
        {!PREMIUM && <span className="bp-tag is-premium">Premium</span>}
        <Chevron open={open} />
      </button>
      {open && (
        <div className="card bp-card-cream" id={id}>
          {children}
        </div>
      )}
    </section>
  );
}

function PremiumNote({ children }: { children: ReactNode }) {
  return (
    <p className="bp-premium-note">
      {children}
      {hasWebApp && (
        <>
          {" "}
          <button type="button" className="inline-link" onClick={() => openWebApp()}>
            Open the web app
          </button>
        </>
      )}
    </p>
  );
}

interface Props {
  brand: Brand | null;
  noteCount: number;
  atBrandLimit: boolean;
  addToken: number;
  onSave: (draft: BrandFields & { id?: string }) => Promise<boolean>;
  onStatus: (text: string) => void;
}

export default function BrandPanel({ brand, noteCount, atBrandLimit, addToken, onSave, onStatus }: Props) {
  const [creating, setCreating] = useState(!brand);
  const [draft, setDraft] = useState<BrandFields>(() => fieldsOf(brand));
  const [busy, setBusy] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const startNew = () => {
    setCreating(true);
    setDraft(fieldsOf(null));
  };

  useEffect(() => {
    if (!addToken || atBrandLimit) return;
    startNew();
  }, [addToken, atBrandLimit]);

  useEffect(() => {
    if (creating) return;
    setDraft(fieldsOf(brand));
  }, [brand, creating]);

  const saved = fieldsOf(creating ? null : brand);
  const dirty = FIELD_KEYS.some((k) => (draft[k] ?? "") !== (saved[k] ?? ""));
  const set = <K extends keyof BrandFields>(key: K, value: BrandFields[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const bind = (key: keyof BrandFields) => ({
    value: String(draft[key] ?? ""),
    onChange: (e: { target: { value: string } }) => set(key, e.target.value as never),
  });
  const locked = !PREMIUM;

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      set("logo", await resizeImageFile(file));
    } catch {
      onStatus("That file couldn't be read as an image. Try a PNG, JPG or SVG.");
    }
  };

  const save = async () => {
    if (busy || !draft.name.trim()) return;
    setBusy(true);
    const ok = await onSave({ ...draft, id: creating ? undefined : brand?.id });
    setBusy(false);
    // A failed save keeps the draft (and New brand mode) so nothing typed is lost.
    if (ok) setCreating(false);
  };

  const title = draft.name.trim() || (creating ? "New brand" : "Untitled brand");
  const isSaved = !creating && !dirty && !busy;
  const saveLabel = busy ? "Saving…" : creating ? "Create brand" : "Save changes";

  return (
    <section className="tab-body bp" aria-label="Brand">
      <div className="segmented" role="tablist" aria-label="Brand mode">
        {brand && (
          <button type="button" role="tab" aria-selected={!creating} className={!creating ? "is-active" : ""} onClick={() => setCreating(false)}>
            Edit {brand.name || "brand"}
          </button>
        )}
        <button type="button" role="tab" aria-selected={creating} className={creating ? "is-active" : ""} onClick={startNew}>
          <PlusIcon />
          New brand
        </button>
      </div>

      {atBrandLimit && creating ? (
        <div className="callout">
          <InfoIcon />
          <p>The free plan includes {LIMITS.brands} brands. Edit one of yours, or remove one in the web app to add another.</p>
        </div>
      ) : (
        <>
          <header className="bp-head">
            <BrandAvatar brand={{ id: brand?.id || "new", name: draft.name, logo: draft.logo, industry: draft.industry }} />
            <h2 title={title}>{title}</h2>
            {dirty && !creating && <span className="bp-unsaved">Unsaved</span>}
          </header>

          <section className="bp-section">
            <h3 className="bp-section-title">Brand core</h3>
            <div className="card">
              <div className="field">
                <label className="field-label" htmlFor="bp-name">Brand name</label>
                <div className="bp-name">
                  <input id="bp-name" type="text" maxLength={80} placeholder="e.g. Northwind Coffee" {...bind("name")} />
                  <button type="button" className="btn btn-small btn-soft" onClick={() => fileRef.current?.click()}>
                    {draft.logo ? "Change image" : "Add image"}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = ""; // allow picking the same file again
                      pickImage(file);
                    }}
                  />
                </div>
                {draft.logo && (
                  <button type="button" className="link-btn is-quiet" onClick={() => set("logo", "")}>
                    Remove image
                  </button>
                )}
              </div>
              <label className="field">
                <span className="field-label">Core belief</span>
                <textarea rows={3} maxLength={2000} placeholder="What does this brand believe about the world?" {...bind("belief")} />
              </label>
              <div className="field">
                <div className="field-label-row">
                  <label className="field-label" htmlFor="bp-message">Message to adapt</label>
                  <span className="bp-tag is-required">Required</span>
                </div>
                <textarea id="bp-message" rows={3} maxLength={2000} placeholder="The core message every piece should carry" aria-required="true" {...bind("message")} />
              </div>
              <div className="field">
                <div className="field-label-row">
                  <span className="field-label">Industry category</span>
                  <span className="bp-tag">Pixel layer</span>
                </div>
                <Select
                  label="Industry category"
                  value={draft.industry || "general"}
                  options={INDUSTRIES.map((i) => ({ value: i.key, label: i.label }))}
                  onChange={(v) => set("industry", v)}
                />
              </div>
            </div>
          </section>

          <section className="bp-section">
            <h3 className="bp-section-title">Customer context</h3>
            <div className="card">
              <div className="row2">
                <label className="field">
                  <span className="field-label">Funnel stage</span>
                  <Select value={draft.stage} options={FUNNEL_STAGES} onChange={(v) => set("stage", v)} />
                </label>
                <label className="field">
                  <span className="field-label">Language</span>
                  <Select value={draft.mode} options={TONE_MODES} onChange={(v) => set("mode", v)} />
                </label>
              </div>
              <label className="field">
                <span className="field-label">Audience posture</span>
                <Select value={draft.audience} options={AUDIENCES} onChange={(v) => set("audience", v)} />
              </label>
            </div>
          </section>

          <PremiumSection id="bp-style" title="Style & output" open={styleOpen} onToggle={() => setStyleOpen((o) => !o)}>
            <label className="field">
              <span className="field-label">Style pack</span>
              <Select
                value="classic"
                disabled={locked}
                options={Object.entries(STYLE_PACKS as Record<string, { label: string }>).map(([value, p]) => ({ value, label: p.label }))}
                onChange={() => undefined}
              />
            </label>
            <PremiumNote>Style packs are Premium; the plugin writes in Classic. Set how many copies to write in Generate.</PremiumNote>
          </PremiumSection>

          <PremiumSection id="bp-advanced" title="Advanced behaviour" open={advOpen} onToggle={() => setAdvOpen((o) => !o)}>
            <label className="field">
              <span className="field-label">Customer pain points</span>
              <input type="text" disabled={locked} placeholder="What's bothering them right before this moment?" {...bind("pain")} />
            </label>
            <div className="row2">
              <label className="field">
                <span className="field-label">Desired emotion</span>
                <Select value={draft.emo} disabled={locked} options={EMOTIONS} onChange={(v) => set("emo", v)} />
              </label>
              <label className="field">
                <span className="field-label">Formality</span>
                <Select value={draft.formality} disabled={locked} options={FORMALITIES} onChange={(v) => set("formality", v)} />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Objection to pre-empt</span>
              <input type="text" disabled={locked} placeholder="e.g. worried it won't last through the day" {...bind("objection")} />
            </label>
            <div className="row2">
              <label className="field">
                <span className="field-label">CTA intensity</span>
                <Select value={draft.cta} disabled={locked} options={CTA_LEVELS} onChange={(v) => set("cta", v)} />
              </label>
              <label className="field">
                <span className="field-label">Avoid words</span>
                <input type="text" disabled={locked} placeholder="e.g. cheap" {...bind("banned")} />
              </label>
            </div>
            <div className="field">
              <span className="field-label">Research notes</span>
              <div className={"bp-stat" + (locked ? " is-locked" : "")}>
                <span>{creating ? "Add notes once the brand is saved" : "Notes on this brand"}</span>
                <b>{creating ? 0 : noteCount}</b>
              </div>
            </div>
            <div className="row2">
              <label className="field">
                <span className="field-label">Location</span>
                <input type="text" disabled={locked} placeholder="e.g. Mumbai, India" {...bind("location")} />
              </label>
              <label className="field">
                <span className="field-label">Output language</span>
                <Select value={draft.language || "English"} disabled={locked} options={LANGUAGES} onChange={(v) => set("language", v)} />
              </label>
            </div>
            {locked && (
              <PremiumNote>
                Advanced behaviour is Premium: location, output language, pain points, emotions, objections, CTA intensity, avoid words and research notes.
              </PremiumNote>
            )}
          </PremiumSection>

          <div className="bp-savebar">
            {!draft.name.trim() && <span className="bp-savebar-hint">Name the brand to save it.</span>}
            {isSaved ? (
              <div className="bp-saved" role="status">
                <CheckIcon />
                All changes saved
              </div>
            ) : (
              <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !draft.name.trim()}>
                {busy && <span className="spinner is-light" aria-hidden="true" />}
                {saveLabel}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
