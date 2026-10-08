import { useState, useCallback, useEffect, useRef } from "react";
import Header from "./components/Header";
import StatusBar from "./components/StatusBar";
import BrandSidebar from "./components/BrandSidebar";
import BrandPanel from "./components/BrandPanel";
import NodeStudio from "./components/NodeStudio";
import QuickGrid, { useQuickGrid } from "./components/QuickGrid";
import ResearchNotes from "./components/ResearchNotes";
import HistoryModal from "./components/HistoryModal";
import { CoherenceModal, ConfirmModal, HookModal } from "./components/Modal";
import AuthModal from "./components/AuthModal";
import CanvasViewport from "./components/CanvasViewport";
import LeftSidebar from "./components/layout/LeftSidebar";
import RightSidebar from "./components/layout/RightSidebar";
import MainWorkspace from "./components/layout/MainWorkspace";
import { useBrandWorkspace } from "./hooks/useBrandWorkspace";
import { useLayoutState } from "./hooks/useLayoutState";
import { useUsage } from "./hooks/useUsage";
import { useAuth } from "./hooks/useAuth";
import { generateHook } from "./services/ai";
import { buildCoherencePrompt, describeLastGenerated } from "./lib/prompts";
import { isSupabaseConfigured } from "./lib/supabase";
import { DEFAULT_TIER, MEDIA, MEDIA_BY_KEY, NODE_CATS, SAMPLE_BRAND } from "./lib/constants";
import { gridToText, gridToCsv, downloadFile, fileSlug } from "./lib/exporters";
import { readHookQuota, recordHookUse } from "./lib/hookQuota";

import host from "./hosts/browser";

const QUICK_ADD_OPTIONS = MEDIA.map((m) => ({ type: m.key, label: m.label, color: m.color }));
const STUDIO_ADD_OPTIONS = Object.entries(NODE_CATS)
  .filter(([, c]) => !c.comingSoon)
  .map(([type, c]) => ({ type, label: c.label, color: c.color }));

const WELCOME_KEY = "coherence.welcome.dismissed";
const readWelcomeDismissed = () => {
  try { return localStorage.getItem(WELCOME_KEY) === "1"; } catch { return false; }
};

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const { usage, refresh: refreshUsage, atGenLimit } = useUsage();
  const layout = useLayoutState();

  const [status, setStatusState] = useState({ text: "", cls: "" });
  const setStatus = useCallback((text, cls = "") => setStatusState({ text: text || "", cls }), []);

  const [tier, setTier] = useState(DEFAULT_TIER);
  const [premium, setPremiumState] = useState(false);
  const [stylePack, setStylePack] = useState("classic");
  const [variantCount, setVariantCount] = useState(1);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null); // { title, body, confirmLabel, tone, onConfirm }
  const [lastGenerated, setLastGenerated] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false); // false | "login" | "signup"
  const [panelFocus, setPanelFocus] = useState(null); // { target, flag } — new object per request
  const [hookQuota, setHookQuota] = useState(readHookQuota);
  const [welcomeDismissed, setWelcomeDismissed] = useState(readWelcomeDismissed);

  const nodeStudioRef = useRef(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const generatingRef = useRef(false); // blocks double-clicks before state re-renders

  const ws = useBrandWorkspace(setStatus);
  const ctx = { brand: ws.brand, notes: ws.notes, stylePack };
  const aiAvailable = isSupabaseConfigured;

  // Returns true when signed in; otherwise prompts for login.
  const ensureAuth = useCallback(() => {
    if (user) return true;
    setShowAuthModal("login");
    return false;
  }, [user]);

  const requireLogin = (actionFn) => (...args) => (ensureAuth() ? actionFn(...args) : undefined);

  const focusPanelField = useCallback((target, flag = false) => {
    layout.open("right");
    setPanelFocus({ target, flag });
  }, [layout.open]);

  const handleGenerated = useCallback((res) => {
    setLastGenerated(res);
    refreshUsage();
  }, [refreshUsage]);

  const quick = useQuickGrid({
    ctx, brandId: ws.currentId, variantCount, tier, aiAvailable, setStatus, onGenerated: handleGenerated,
    ensureAuth, onMissingMessage: () => focusPanelField("bp-message", true),
  });

  // Generate drives whichever view is active.
  const handleGenerate = async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setIsGeneratingAll(true);
    try {
      if (layout.view === "quick") await quick.generateAll();
      else await nodeStudioRef.current?.generateAllNodes();
    } finally {
      generatingRef.current = false;
      setIsGeneratingAll(false);
    }
  };

  // The grid holds one node per medium; it only offers mediums that aren't on it yet.
  const quickAddOptions = QUICK_ADD_OPTIONS.filter((o) => !quick.cards[o.type]);

  const handleAddNode = (type) => {
    if (layout.view === "quick") quick.add(type);
    else nodeStudioRef.current?.addNode(type);
  };

  // Switching brands drops unsaved edits, so ask first.
  const guardUnsaved = (proceed) => {
    if (!ws.dirty) return proceed();
    setConfirm({
      title: "Discard unsaved changes?",
      body: `“${ws.brand.name || "Untitled brand"}” has changes that haven't been saved. They'll be lost if you continue.`,
      confirmLabel: "Discard changes",
      tone: "danger",
      onConfirm: proceed,
    });
  };

  const handleNewBrand = (scope = "regular") => {
    guardUnsaved(() => {
      ws.newBrand(scope);
      layout.open("right");
    });
  };

  const handleSelectBrand = (id) => {
    if (id === ws.currentId) return layout.open("right");
    guardUnsaved(async () => {
      await ws.selectBrand(id);
      layout.open("right");
    });
  };

  const handleSaveBrand = async () => {
    await ws.save();
    refreshUsage();
  };

  const handleDeleteBrand = () => {
    if (!ws.currentId) return setStatus("This brand isn't saved yet — there's nothing to delete.", "warn");
    setConfirm({
      title: "Delete brand?",
      body: `“${ws.brand.name || "Untitled brand"}”, its research notes and its generation history will be permanently deleted. This can't be undone.`,
      confirmLabel: "Delete brand",
      tone: "danger",
      onConfirm: async () => {
        await ws.remove();
        refreshUsage();
      },
    });
  };

  const setPremium = (on) => {
    setPremiumState(on);
    if (!on) { setStylePack("classic"); setVariantCount(1); }
  };

  const onStylePack = (v) => {
    if (v !== "classic" && !premium) { setStylePack("classic"); return setStatus("Unlock style packs with Premium.", "err"); }
    setStylePack(v);
  };

  const onVariantCount = (v) => {
    if (v !== 1 && !premium) { setVariantCount(1); return setStatus("Unlock multiple variants with Premium.", "err"); }
    setVariantCount(v);
  };

  const copy = async (text, ok) => {
    if (!text) {
      setStatus("Generate a hook first.", "err");
      return false;
    }
    try {
      await host.copyText(text);
      setStatus(ok, "ok");
      return true;
    } catch {
      setStatus("Couldn't copy automatically — select the text and copy manually.", "err");
      return false;
    }
  };

  const handleExport = async (kind) => {
    const nodes = quick.nodes.filter((n) => n.items.length);
    if (!nodes.length) return setStatus("Generate copy first, then export it.", "err");
    const name = ws.brand.name;
    if (kind === "copy") {
      await copy(gridToText(nodes, name), `Copied ${nodes.length} medium${nodes.length === 1 ? "" : "s"} — paste anywhere.`);
    } else if (kind === "txt") {
      downloadFile(`${fileSlug(name)}.txt`, gridToText(nodes, name), "text/plain;charset=utf-8");
      setStatus("Downloaded .txt file.", "ok");
    } else if (kind === "csv") {
      downloadFile(`${fileSlug(name)}.csv`, gridToCsv(nodes), "text/csv;charset=utf-8");
      setStatus("Downloaded .csv file.", "ok");
    }
  };

  const handleRestore = (medium, items) => {
    if (!quick.restore(medium, items)) return setStatus("That entry can't be restored to the grid.", "err");
    layout.setView("quick");
    setModal(null);
    setStatus(`${MEDIA_BY_KEY[medium]?.label || "Copy"} restored to the grid.`, "ok");
  };

  // Hook quota resets at midnight; re-read it when the tab regains focus.
  useEffect(() => {
    const refresh = () => setHookQuota(readHookQuota());
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, []);

  // Warn before closing the tab with unsaved brand edits.
  useEffect(() => {
    if (!ws.dirty) return undefined;
    const onBeforeUnload = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [ws.dirty]);

  // Keyboard shortcuts: Ctrl/⌘+Enter generates, Ctrl/⌘+S saves the brand.
  const shortcutsRef = useRef(null);
  shortcutsRef.current = {
    blocked: Boolean(modal || confirm || showAuthModal),
    generate: () => { if (!isGeneratingAll && !quick.busy && !atGenLimit) requireLogin(handleGenerate)(); },
    save: () => { if (!ws.saving) requireLogin(handleSaveBrand)(); },
  };
  useEffect(() => {
    const onKey = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const s = shortcutsRef.current;
      if (event.key === "Enter") {
        if (s.blocked) return;
        event.preventDefault();
        s.generate();
      } else if (event.key.toLowerCase() === "s" && !event.shiftKey) {
        event.preventDefault(); // never open the browser's "Save page" dialog
        if (!s.blocked) s.save();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // First-run guide: shown until dismissed, until copy exists, or once the user has brands.
  const dismissWelcome = () => {
    setWelcomeDismissed(true);
    try { localStorage.setItem(WELCOME_KEY, "1"); } catch { /* not remembered */ }
  };
  const showWelcome = !welcomeDismissed && ws.brands.length === 0 && !quick.hasCopy;
  const welcome = showWelcome ? {
    steps: [
      { label: "Name your brand", hint: "Who's speaking?", done: Boolean(ws.brand.name.trim()), onClick: () => focusPanelField("bp-name") },
      { label: "Write your message", hint: "What should every medium say?", done: Boolean(ws.brand.message.trim()), onClick: () => focusPanelField("bp-message") },
      { label: "Generate", hint: "Copy for 5 mediums at once", done: quick.hasCopy, onClick: requireLogin(handleGenerate), disabled: isGeneratingAll || quick.busy },
    ],
    onSample: () => {
      ws.applyFields(SAMPLE_BRAND);
      layout.open("right");
      setStatus("Sample brand loaded — press Generate to see it in action.", "ok");
    },
    onDismiss: dismissWelcome,
  } : null;

  const generatingMediums = new Set(quick.nodes.map((n) => n.type)).size;
  const generatingDetail = layout.view === "quick" && generatingMediums > 0
    ? `${generatingMediums} medium${generatingMediums === 1 ? "" : "s"}`
    : "";

  const views = {
    quick: <QuickGrid quick={quick} atGenLimit={atGenLimit} brand={ws.brand} welcome={welcome} />,
    nodes: (
      <CanvasViewport>
        <NodeStudio
          ref={nodeStudioRef}
          active={layout.view === "nodes"} ctx={ctx} variantCount={variantCount} tier={tier}
          aiAvailable={aiAvailable} setStatus={setStatus}
          onGenerated={handleGenerated}
          refreshUsage={refreshUsage}
          brandId={ws.currentId}
          ensureAuth={ensureAuth}
        />
      </CanvasViewport>
    ),
  };

  const unavailable = aiAvailable
    ? ""
    : "Live generation and brand saving aren't available — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart npm run dev.";

  if (authLoading) {
    return <div className="app-loading" role="status">Loading Coherence…</div>;
  }

  return (
    <div className="app">
      <StatusBar status={status} unavailable={unavailable} />

      <div
        className="app-shell"
        data-bp={layout.bp}
        data-left={layout.leftOpen ? "open" : "closed"}
        data-right={layout.rightOpen ? "open" : "closed"}
        data-drawer={layout.drawer || "none"}
      >
        <LeftSidebar hidden={layout.bp === "mobile" && !layout.leftOpen}>
          <BrandSidebar
            open={layout.leftOpen || layout.bp === "mobile"}
            drawer={!layout.inline && layout.leftOpen}
            onToggle={() => layout.toggle("left")}
            onExpand={() => layout.open("left")}
            brands={ws.brands}
            currentId={ws.currentId}
            onSelect={handleSelectBrand}
            onNew={handleNewBrand}
            user={user}
            usage={usage}
            model="Free"
            onLogin={() => setShowAuthModal("login")}
            onSignup={() => setShowAuthModal("signup")}
            onLogout={logout}
          />
        </LeftSidebar>

        <MainWorkspace
          inert={Boolean(layout.drawer)}
          view={layout.view}
          onViewChange={layout.setView}
          views={views}
          toolbar={
            <Header
              tier={tier}
              onTier={setTier}
              onGenerate={requireLogin(handleGenerate)}
              generating={isGeneratingAll || quick.busy}
              generatingDetail={generatingDetail}
              atGenLimit={atGenLimit}
              showExport={layout.view === "quick"}
              exportDisabled={!quick.hasCopy}
              onExport={handleExport}
              addOptions={layout.view === "quick" ? quickAddOptions : STUDIO_ADD_OPTIONS}
              addDisabledTitle={layout.view === "quick" ? "The grid already has every medium" : undefined}
              onAddNode={handleAddNode}
              showNavToggle={layout.bp === "mobile"}
              navOpen={layout.leftOpen}
              onToggleNav={() => layout.toggle("left")}
              panelOpen={layout.rightOpen}
              hidePanelToggle={layout.inline && layout.rightOpen}
              onTogglePanel={() => layout.toggle("right")}
            />
          }
        />

        <RightSidebar open={layout.rightOpen}>
          <BrandPanel
            brand={ws.brand} onField={ws.setField}
            stylePack={stylePack} onStylePack={onStylePack} variantCount={variantCount} onVariantCount={onVariantCount}
            premium={premium}
            researchCount={ws.notes.length}
            isSaved={Boolean(ws.currentId)}
            dirty={ws.dirty}
            saving={ws.saving}
            focusRequest={panelFocus}
            hookQuota={premium ? null : hookQuota}
            onSave={requireLogin(handleSaveBrand)}
            onDelete={requireLogin(handleDeleteBrand)}
            onResearch={() => setModal("research")} onCoherence={() => setModal("coherence")} onHook={() => setModal("hook")}
            onHistory={() => setModal("history")}
            onStatus={setStatus}
            onClose={() => layout.close("right")}
          />
        </RightSidebar>

        <div className="shell-scrim" data-visible={Boolean(layout.drawer)} onClick={layout.closeDrawer} aria-hidden="true" />
      </div>

      {showAuthModal && (
        <AuthModal initialMode={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}

      {confirm && (
        <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />
      )}

      {modal === "research" && (
        <ResearchNotes notes={ws.notes} onAdd={ws.addNote} onDelete={ws.removeNote} onClose={() => setModal(null)} />
      )}

      {modal === "history" && ws.currentId && (
        <HistoryModal
          brandId={ws.currentId}
          brandName={ws.brand.name}
          onCopy={(t) => copy(t, "Copied from history.")}
          onRestore={handleRestore}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "coherence" && (
        <CoherenceModal
          text={buildCoherencePrompt(ctx, describeLastGenerated(lastGenerated, quick.cards))}
          onCopy={(t) => copy(t, "Prompt copied — paste it into ChatGPT or any other LLM.")}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "hook" && (
        <HookModal
          aiAvailable={aiAvailable}
          quota={premium ? null : hookQuota}
          onGenerate={(requirement) => generateHook({ ctx, requirement, tier })}
          onUsed={() => { if (!premium) setHookQuota(recordHookUse()); }}
          onCopy={(t) => copy(t, "Hook copied.")}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
