import { useEffect, useState } from "react";
import { LIMITS } from "@web/lib/clientId.js";
import type { PluginUsage } from "../hooks/usePluginSession";
import { useBrandData } from "../hooks/useBrandData";
import { usePrefs } from "../hooks/usePrefs";
import { useSelection } from "../hooks/useSelection";
import { useCanvas } from "../hooks/useCanvas";
import { hasWebApp, openWebApp } from "../lib/webApp";
import BrandPicker from "./BrandPicker";
import BrandPanel from "./BrandPanel";
import GeneratePanel from "./GeneratePanel";
import { CloseIcon, ExternalIcon, KeyIcon, LogoMark, PlusIcon, SparkIcon, TagIcon } from "./icons";

// Research notes are a Premium feature in the web app, so the free plugin has no Research tab.
type Panel = "generate" | "brand";

const PILLS: { key: Panel; label: string; Icon: () => JSX.Element }[] = [
  { key: "generate", label: "Generate", Icon: SparkIcon },
  { key: "brand", label: "Brand", Icon: TagIcon },
];

interface Props {
  userId: string;
  usage: PluginUsage;
  onUsed: () => void;
  onChangeKey: () => void;
}

export default function Workspace({ userId, usage, onUsed, onChangeKey }: Props) {
  const { prefs, loaded: prefsLoaded, update } = usePrefs();
  const data = useBrandData(userId, prefs.brandId);
  const { text: selectionText } = useSelection();
  const [panel, setPanel] = useState<Panel>("generate");
  const [status, setStatus] = useState("");
  const [addToken, setAddToken] = useState(0);
  const canvas = useCanvas((text) => setStatus(text), () => undefined);

  useEffect(() => {
    if (!data.loading && data.brands.length && !data.brands.some((b) => b.id === prefs.brandId)) {
      update({ brandId: data.brands[0].id });
    }
  }, [data.loading, data.brands, prefs.brandId, update]);

  const atGenLimit = usage.generations >= LIMITS.generations;
  const brand = data.brand;

  // Short confirmations ("Brand saved.") fade out on their own.
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), 3200);
    return () => clearTimeout(timer);
  }, [status]);

  if (!prefsLoaded) {
    return (
      <div className="center-state" aria-busy="true">
        <span className="spinner" aria-hidden="true" />
        Loading…
      </div>
    );
  }

  const atBrandLimit = data.brands.length >= LIMITS.brands;
  const addBrand = () => {
    setPanel("brand");
    setAddToken((n) => n + 1);
  };

  return (
    <div className="app">
      <header className="head">
        <div className="toolbar">
          <span className="app-mark"><LogoMark /></span>
          <div className="wordmark">
            Brand Language OS
            <span className="plan-chip">Free</span>
          </div>
          {hasWebApp && (
            <button type="button" className="icon-btn" onClick={() => openWebApp()} aria-label="Open Brand Language OS" title="Open Brand Language OS">
              <ExternalIcon />
            </button>
          )}
          <button type="button" className="icon-btn" onClick={onChangeKey} aria-label="Plugin API key" title="Plugin API key">
            <KeyIcon />
          </button>
        </div>

        <BrandPicker
          brands={data.brands}
          brand={brand}
          loading={data.loading}
          atLimit={atBrandLimit}
          limit={LIMITS.brands}
          onSelect={(brandId) => update({ brandId })}
          onAdd={addBrand}
        />
      </header>

      <nav className="tabs" role="tablist" aria-label="Sections">
        {PILLS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            className={"tab" + (panel === key ? " is-active" : "")}
            aria-selected={panel === key}
            onClick={() => setPanel(key)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>

      <main className="body">
        {!brand && panel !== "brand" ? (
          <section className="tab-body">
            <div className="empty-state">
              <span className="empty-icon"><SparkIcon /></span>
              <h2>{data.loading ? "Loading your brands…" : "Start with a brand"}</h2>
              <p>Your brand's belief and message shape every line the plugin writes.</p>
              {!data.loading && (
                <button type="button" className="btn btn-primary" onClick={addBrand}>
                  <PlusIcon />
                  Add brand
                </button>
              )}
            </div>
          </section>
        ) : (
          <>
            {panel === "generate" && brand && (
              <GeneratePanel
                brand={brand}
                notes={data.notes}
                category={prefs.category}
                onCategory={(category) => update({ category })}
                copies={prefs.variantCount}
                onCopies={(variantCount) => update({ variantCount })}
                selectionText={selectionText}
                atLimit={atGenLimit}
                canvas={canvas}
                onUsed={onUsed}
              />
            )}
            {panel === "brand" && (
              <BrandPanel
                brand={brand}
                noteCount={data.notes.length}
                atBrandLimit={atBrandLimit}
                addToken={addToken}
                onStatus={setStatus}
                onSave={async (draft) => {
                  const id = await data.saveBrand(draft);
                  if (!id) return false;
                  update({ brandId: id });
                  // A new brand goes straight to writing; an edit stays open.
                  if (!draft.id) setPanel("generate");
                  setStatus(draft.id ? "Brand saved." : "Brand created.");
                  return true;
                }}
              />
            )}
          </>
        )}
      </main>

      {(data.error || status) && (
        <div className={"toast" + (data.error ? " is-error" : "")} role="status">
          <span>{data.error || status}</span>
          {data.error && (
            <button type="button" className="toast-close" onClick={() => data.setError("")} aria-label="Dismiss">
              <CloseIcon />
            </button>
          )}
        </div>
      )}

      <footer className="footer">
        <Meter label="Credits" used={usage.generations} total={LIMITS.generations} />
        <Meter label="Brands" used={Math.min(data.brands.length, LIMITS.brands)} total={LIMITS.brands} calm />
        <p className="footer-note">
          <span className="figma-word">Figma usage</span> · credits are shared with the web app
        </p>
      </footer>
    </div>
  );
}

// calm: reaching the limit is normal (brands), so it isn't shown as a warning.
function Meter({ label, used, total, calm }: { label: string; used: number; total: number; calm?: boolean }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className={"meter" + (used >= total && !calm ? " is-full" : "")} title={`${label}: ${used} of ${total} used`}>
      <div className="meter-row">
        <span>{label}</span>
        <b>
          {used}/{total}
        </b>
      </div>
      <span className="meter-track" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
