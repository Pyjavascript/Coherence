import { useState, useCallback, useRef } from "react";
import Header from "./components/Header";
import StatusBar from "./components/StatusBar";
import BrandSidebar from "./components/BrandSidebar";
import BrandPanel from "./components/BrandPanel";
import NodeStudio from "./components/NodeStudio";
import QuickGrid, { useQuickGrid } from "./components/QuickGrid";
import ResearchNotes from "./components/ResearchNotes";
import { CoherenceModal, HookModal } from "./components/Modal";
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
import { DEFAULT_TIER, MEDIA, NODE_CATS } from "./lib/constants";

import host from "./hosts/browser";

const QUICK_ADD_OPTIONS = MEDIA.map((m) => ({ type: m.key, label: m.label, color: m.color }));
const STUDIO_ADD_OPTIONS = Object.entries(NODE_CATS)
  .filter(([, c]) => !c.comingSoon)
  .map(([type, c]) => ({ type, label: c.label, color: c.color }));

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
  const [lastGenerated, setLastGenerated] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const nodeStudioRef = useRef(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const generatingRef = useRef(false); // blocks double-clicks before state re-renders

  const ws = useBrandWorkspace(setStatus);
  const ctx = { brand: ws.brand, notes: ws.notes, stylePack };
  const aiAvailable = isSupabaseConfigured;

  // Returns true when signed in; otherwise prompts for login.
  const ensureAuth = useCallback(() => {
    if (user) return true;
    setShowAuthModal(true);
    return false;
  }, [user]);

  const requireLogin = (actionFn) => (...args) => (ensureAuth() ? actionFn(...args) : undefined);

  const handleGenerated = useCallback((res) => {
    setLastGenerated(res);
    refreshUsage();
  }, [refreshUsage]);

  const quick = useQuickGrid({
    ctx, brandId: ws.currentId, variantCount, tier, aiAvailable, setStatus, onGenerated: handleGenerated,
    ensureAuth, onMissingMessage: () => layout.open("right"),
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

  const handleNewBrand = (scope = "regular") => {
    ws.newBrand(scope);
    layout.open("right");
  };

  const handleSelectBrand = async (id) => {
    await ws.selectBrand(id);
    layout.open("right");
  };

  const handleSaveBrand = async (...args) => {
    await ws.save(...args);
    refreshUsage();
  };

  const handleDeleteBrand = async (...args) => {
    await ws.remove(...args);
    refreshUsage();
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

  const views = {
    quick: <QuickGrid quick={quick} atGenLimit={atGenLimit} />,
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
            onLogin={() => setShowAuthModal(true)}
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
              atGenLimit={atGenLimit}
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
            researchCount={ws.notes.length}
            onSave={requireLogin(handleSaveBrand)}
            onDelete={requireLogin(handleDeleteBrand)}
            onResearch={() => setModal("research")} onCoherence={() => setModal("coherence")} onHook={() => setModal("hook")}
            onClose={() => layout.close("right")}
          />
        </RightSidebar>

        <div className="shell-scrim" data-visible={Boolean(layout.drawer)} onClick={layout.closeDrawer} aria-hidden="true" />
      </div>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {modal === "research" && (
        <ResearchNotes notes={ws.notes} onAdd={ws.addNote} onDelete={ws.removeNote} onClose={() => setModal(null)} />
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
          onGenerate={(requirement) => generateHook({ ctx, requirement, tier })}
          onCopy={(t) => copy(t, "Hook copied.")}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
