import { useCallback, useEffect, useRef, useState } from "react";
import { useUsage } from "@web/hooks/useUsage.js";
import { config } from "./config";
import host from "./host";
import { isSupabaseConfigured } from "./lib/supabaseClient";
import { usePluginAuth } from "./hooks/usePluginAuth";
import { usePrefs, DEFAULT_PREFS } from "./hooks/usePrefs";
import { useBrandData } from "./hooks/useBrandData";
import { useSelection } from "./hooks/useSelection";
import { useCanvas } from "./hooks/useCanvas";
import SignIn from "./components/SignIn";
import Toolbar from "./components/Toolbar";
import GenerateTab from "./components/GenerateTab";
import CheckTab from "./components/CheckTab";
import ResearchTab from "./components/ResearchTab";
import Footer from "./components/Footer";
import ResizeHandle from "./components/ResizeHandle";

type Tab = "generate" | "check" | "research";
const TABS: { key: Tab; label: string }[] = [
  { key: "generate", label: "Generate" },
  { key: "check", label: "Check" },
  { key: "research", label: "Research" },
];
type Status = { text: string; tone?: "ok" | "err" };

export default function App() {
  const auth = usePluginAuth();
  const { prefs, loaded: prefsLoaded, update: updatePrefs } = usePrefs();
  const userId = auth.user?.id ?? null;
  const data = useBrandData(userId, prefs.brandId);
  const { usage, refresh: refreshUsage } = useUsage(userId);
  const { selection, replaceTarget, text: selectionText, refresh: refreshSelection } = useSelection();
  const [tab, setTab] = useState<Tab>("generate");

  const [status, setStatusState] = useState<Status>({ text: "" });
  const statusTimer = useRef<ReturnType<typeof setTimeout>>();
  const setStatus = useCallback((text: string, tone?: "ok" | "err") => {
    clearTimeout(statusTimer.current);
    setStatusState({ text, tone });
    if (text) statusTimer.current = setTimeout(() => setStatusState({ text: "" }), tone === "err" ? 7000 : 4000);
  }, []);
  const canvas = useCanvas(setStatus, refreshSelection);

  // Restore the window size the user last chose.
  useEffect(() => {
    if (prefsLoaded && (prefs.width !== DEFAULT_PREFS.width || prefs.height !== DEFAULT_PREFS.height)) {
      host.resize(prefs.width, prefs.height).catch(() => undefined);
    }
    // Only once, when the saved prefs arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsLoaded]);

  // Keep a valid brand selected: the remembered one, else the first.
  useEffect(() => {
    if (!prefsLoaded || data.loading || !data.brands.length) return;
    if (!data.brands.some((b) => b.id === prefs.brandId)) updatePrefs({ brandId: data.brands[0].id });
  }, [prefsLoaded, data.loading, data.brands, prefs.brandId, updatePrefs]);

  useEffect(() => {
    if (data.error) {
      setStatus(data.error, "err");
      data.setError("");
    }
  }, [data.error, data.setError, setStatus]);

  const onAuthError = useCallback(() => {
    setStatus("Your session has expired. Sign in again.", "err");
    auth.signOut();
  }, [auth.signOut, setStatus]);

  if (!isSupabaseConfigured) {
    return <div className="center-state">This plugin build has no Supabase configuration. Rebuild it with a .env.</div>;
  }
  if (auth.loading || !prefsLoaded) {
    return (
      <div className="center-state" aria-busy="true">
        <span className="spinner" aria-hidden="true" />
        Loading…
      </div>
    );
  }
  if (!auth.user) return <SignIn onSignIn={auth.signIn} />;

  const openWeb = () => host.openExternal(config.webUrl).catch(() => undefined);

  return (
    <div className="app">
      <Toolbar
        brands={data.brands}
        brand={data.brand}
        onBrand={(id) => updatePrefs({ brandId: id })}
        tier={prefs.tier}
        onTier={(tier) => updatePrefs({ tier })}
        loading={data.loading}
      />

      {data.brand ? (
        <>
          <nav className="tabs" role="tablist" aria-label="Sections">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={"tab" + (tab === t.key ? " is-active" : "")}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {t.key === "research" && data.notes.length > 0 && <span className="tab-count">{data.notes.length}</span>}
              </button>
            ))}
          </nav>
          <main className="body">
            {tab === "generate" && (
              <GenerateTab
                brand={data.brand}
                notes={data.notes}
                tier={prefs.tier}
                category={prefs.category}
                onCategory={(category) => updatePrefs({ category })}
                variantCount={prefs.variantCount}
                onVariantCount={(variantCount) => updatePrefs({ variantCount })}
                selection={selection}
                selectionText={selectionText}
                replaceTarget={replaceTarget}
                canvas={canvas}
                onUsed={refreshUsage}
                onAuthError={onAuthError}
              />
            )}
            {tab === "check" && (
              <CheckTab
                brand={data.brand}
                notes={data.notes}
                tier={prefs.tier}
                selection={selection}
                selectionText={selectionText}
                onCopy={canvas.copy}
                onUsed={refreshUsage}
                onAuthError={onAuthError}
              />
            )}
            {tab === "research" && (
              <ResearchTab
                notes={data.notes}
                selectionText={selectionText}
                onAdd={data.addNote}
                onRemove={data.removeNote}
              />
            )}
          </main>
        </>
      ) : (
        <main className="body center-state">
          {data.loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Loading brands…
            </>
          ) : (
            <>
              <p>No brands yet.</p>
              <p className="muted small">Create a brand in the web app, then refresh.</p>
              <div className="row">
                {config.webUrl && (
                  <button type="button" className="btn btn-small btn-primary" onClick={openWeb}>
                    Open web app ↗
                  </button>
                )}
                <button type="button" className="btn btn-small" onClick={data.refresh}>
                  Refresh
                </button>
              </div>
            </>
          )}
        </main>
      )}

      <Footer
        status={status}
        creditsUsed={usage.generations ?? 0}
        email={auth.user.email ?? ""}
        onSignOut={auth.signOut}
      />
      <ResizeHandle onResized={(width, height) => updatePrefs({ width, height })} />
    </div>
  );
}
