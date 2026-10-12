import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CloseBar, useDialogBehavior, useOverlayDismiss } from "./Modal";
import { ModelIcon } from "./ModelIcons";
import { MODEL_OPTIONS } from "../lib/constants";
import { LIMITS } from "../lib/clientId";
import { FREE_HOOKS_PER_DAY } from "../lib/hookQuota";
import { getApiKey, setApiKey } from "../lib/apiKey";
import { getUsageActivity } from "../services/brands";
import { ACTIVITY_KINDS, creditDayStart, nextCreditReset, toKinds } from "../lib/usageActivity";

const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M5 20V12M10 20V5M15 20v-9M20 20v-5" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="m10.7 12.3 9.8-9.8M16 7l3 3M18.5 4.5l2 2" />
  </svg>
);

// One-word badge per model, shown on its card.
const MODEL_TAGS = { fast: "Fastest", balanced: "Recommended", quality: "Most capable" };

const clampCount = (value, max) => Math.min(max, Math.max(0, Number(value) || 0));
const timeLabel = (d) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

// One line per daily credit. Used credits fill in order, each coloured by what
// it was spent on (ACTIVITY_KINDS); "other" covers any other generation type.
function CreditLines({ total, kinds, loading }) {
  return (
    <div className={"uc-lines" + (loading ? " is-loading" : "")} style={{ "--count": total }} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={kinds[i] ? "is-" + kinds[i] : undefined} style={{ "--i": i }} />
      ))}
    </div>
  );
}

// Today's usage: a line per daily credit, coloured by what it was spent on, a
// legend, detail rows and the model picker — in the profile dialog's skin.
// usage = { generations, brands } (hooks/useUsage); hookQuota = { used, left } | null (premium).
export default function UsageModal({ userId, usage, plan = "Free", hookQuota, tier, onTier, onClose }) {
  const titleId = useId();
  const modelLabelId = useId();
  const keyInputId = useId();
  const panelRef = useDialogBehavior(onClose);
  const dismiss = useOverlayDismiss(onClose);
  const [rows, setRows] = useState(null); // null while loading, false if they couldn't load
  const [now] = useState(() => new Date());
  const [apiKey, setApiKeyValue] = useState(getApiKey);
  const [keyOpen, setKeyOpen] = useState(false);
  const keyButtonRef = useRef(null);
  const onApiKey = (event) => {
    setApiKeyValue(event.target.value);
    setApiKey(event.target.value);
  };
  // Enter or Escape folds the field back into the key icon (without closing the dialog).
  const onApiKeyKey = (event) => {
    if (event.key !== "Enter" && event.key !== "Escape") return;
    event.preventDefault();
    setKeyOpen(false);
    keyButtonRef.current?.focus();
  };

  useEffect(() => {
    let live = true;
    if (!userId) { setRows([]); return undefined; }
    getUsageActivity(userId, creditDayStart(now))
      .then((data) => { if (live) setRows(data); })
      .catch(() => { if (live) setRows(false); });
    return () => { live = false; };
  }, [userId, now]);

  const loading = rows === null;
  const kinds = useMemo(() => (rows ? toKinds(rows) : []), [rows]);

  // Each usage event is one credit, so today's events are the credits used; the
  // account count (my_usage) stands in while they load or if they couldn't.
  const used = clampCount(rows ? rows.length : usage?.generations, LIMITS.generations);
  const left = LIMITS.generations - used;
  const percent = Math.round((used / LIMITS.generations) * 100);
  const level = left === 0 ? "over" : percent >= 85 ? "near" : "ok";
  const brands = clampCount(usage?.brands, LIMITS.brands);
  const selected = MODEL_OPTIONS.some((m) => m.value === tier);

  // Used credits in spending order. The legend counts these same lines, so it
  // always adds up to the credits used.
  const lineKinds = Array.from({ length: used }, (_, i) => kinds[i] || "other");
  const countOf = (kind) => lineKinds.filter((k) => k === kind).length;
  const other = countOf("other");

  // Radio group keys: arrows move the choice (and focus) to the next / previous model.
  const onModelKey = (event) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const at = MODEL_OPTIONS.findIndex((m) => m.value === tier);
    const next = (at + step + MODEL_OPTIONS.length) % MODEL_OPTIONS.length;
    onTier(MODEL_OPTIONS[next].value);
    event.currentTarget.querySelectorAll('[role="radio"]')[next]?.focus();
  };

  return (
    <div className="overlay profile-overlay" {...dismiss}>
      <section ref={panelRef} className="profile-modal usage-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="usage-head">
          <span className="usage-head-icon"><ChartIcon /></span>
          <div className="usage-head-text">
            <h2 id={titleId}>Usage</h2>
            <p>{plan} plan · resets daily at {timeLabel(nextCreditReset(now))}</p>
          </div>
          <button type="button" className="profile-close usage-close" aria-label="Close usage" onClick={onClose}><CloseBar /></button>
        </header>

        <div className="usage-body">
          <div className="uc-section-label">
            <span>Credits</span>
            <span>Today at {timeLabel(now)}</span>
          </div>

          <div className="uc-card">
            <div className="uc-summary">
              <p className="uc-big"><b>{used}</b><span>{used === 1 ? "credit" : "credits"} used</span></p>
              <span className={"uc-left is-" + level}>
                <b>{left}</b> of {LIMITS.generations} left
              </span>
            </div>

            <div
              role="meter"
              aria-valuemin={0}
              aria-valuemax={LIMITS.generations}
              aria-valuenow={used}
              aria-label={`${used} of ${LIMITS.generations} credits used today`}
            >
              <CreditLines total={LIMITS.generations} kinds={loading ? [] : lineKinds} loading={loading} />
            </div>
            {left === 0 && (
              <p className="uc-note" role="status">You've used all of today's credits. Generation unlocks again when they reset.</p>
            )}

            <div className="uc-legend">
              {ACTIVITY_KINDS.map((k) => (
                <div key={k.key} className={"uc-legend-item is-" + k.key}>
                  <span>{k.label}</span>
                  <b>{loading ? "–" : countOf(k.key)}</b>
                </div>
              ))}
            </div>
            {!loading && other > 0 && (
              <p className="uc-other">
                <i aria-hidden="true" />
                {rows ? `${other} ${other === 1 ? "credit" : "credits"} on other generations` : "Couldn't load today's breakdown"}
              </p>
            )}

            <div className="uc-row">
              <span>Brands</span>
              <span>{brands} of {LIMITS.brands}</span>
            </div>
            {hookQuota && (
              <div className="uc-row">
                <span>Free hooks today</span>
                <span>{hookQuota.left} of {FREE_HOOKS_PER_DAY} left</span>
              </div>
            )}
          </div>

          <div className="usage-section">
            <div className="usage-section-head">
              <h3 id={modelLabelId}>Choose a model</h3>
              <div className="usage-key">
                {keyOpen && (
                  <input
                    id={keyInputId}
                    type="password"
                    className="usage-api-key"
                    value={apiKey}
                    onChange={onApiKey}
                    onKeyDown={onApiKeyKey}
                    placeholder="Your OpenAI API key (sk-…)"
                    aria-label="Your OpenAI API key"
                    autoComplete="off"
                    spellCheck={false}
                    autoFocus
                  />
                )}
                <button
                  ref={keyButtonRef}
                  type="button"
                  className={"usage-key-btn" + (keyOpen ? " is-open" : "") + (apiKey ? " is-set" : "")}
                  aria-label={apiKey ? "Edit your OpenAI API key (set)" : "Add your OpenAI API key"}
                  title={apiKey ? "Using your API key" : "Add your API key"}
                  aria-expanded={keyOpen}
                  aria-controls={keyOpen ? keyInputId : undefined}
                  onClick={() => setKeyOpen((open) => !open)}
                >
                  <KeyIcon />
                </button>
              </div>
            </div>
            <div className="usage-models" role="radiogroup" aria-labelledby={modelLabelId} onKeyDown={onModelKey}>
              {MODEL_OPTIONS.map((model) => {
                const on = model.value === tier;
                return (
                  <button
                    key={model.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on || (!selected && model === MODEL_OPTIONS[0]) ? 0 : -1}
                    className={"usage-model" + (on ? " is-on" : "")}
                    onClick={() => onTier(model.value)}
                  >
                    <span className="usage-model-check" aria-hidden="true"><CheckIcon /></span>
                    <span className="usage-model-icon" aria-hidden="true"><ModelIcon tier={model.value} /></span>
                    <span className="usage-model-name">{model.label}</span>
                    <span className="usage-model-tag">{MODEL_TAGS[model.value]}</span>
                    <span className="usage-model-desc">{model.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="profile-actions usage-actions">
          <button type="button" className="profile-save" onClick={onClose}>Done</button>
        </div>
      </section>
    </div>
  );
}
