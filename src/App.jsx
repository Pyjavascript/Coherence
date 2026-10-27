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
import ProfileModal from "./components/ProfileModal";
import UsageModal from "./components/UsageModal";
import TourModal from "./components/TourModal";
import CanvasViewport from "./components/CanvasViewport";
import MessageComposer from "./components/MessageComposer";
import LeftSidebar from "./components/layout/LeftSidebar";
import RightSidebar from "./components/layout/RightSidebar";
import MainWorkspace from "./components/layout/MainWorkspace";
import { useBrandWorkspace } from "./hooks/useBrandWorkspace";
import { useLayoutState } from "./hooks/useLayoutState";
import { useUsage } from "./hooks/useUsage";
import { useAuth } from "./hooks/useAuth";
import { generateHook } from "./services/ai";
import { buildBrandBriefPrompt } from "./lib/prompts";
import { isSupabaseConfigured } from "./lib/supabase";
import { DEFAULT_TIER, MEDIA, MEDIA_BY_KEY, NODE_CATS, SAMPLE_BRAND } from "./lib/constants";
import { gridToText, gridToCsv, downloadFile, fileSlug } from "./lib/exporters";
import { hookQuotaFrom } from "./lib/hookQuota";
import { nextCreditReset } from "./lib/usageActivity";

import host from "./hosts/browser";

const QUICK_ADD_OPTIONS = MEDIA.map((m) => ({ type: m.key, label: m.label, color: m.color }));
const STUDIO_ADD_OPTIONS = Object.entries(NODE_CATS)
  .filter(([, c]) => !c.comingSoon)
  .map(([type, c]) => ({ type, label: c.label, color: c.color }));

// The tour opens by itself once per browser; the "?" button reopens it.
const TOUR_KEY = "coherence.tour.seen";
const readTourSeen = () => {
  try { return localStorage.getItem(TOUR_KEY) === "1"; } catch { return false; }
};

// No platform picker: Generate always writes for every platform.
const NO_PLATFORMS = [];

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const { usage, refresh: refreshUsage, atGenLimit } = useUsage(user?.id);
  const layout = useLayoutState();

  const [status, setStatusState] = useState({ text: "", cls: "" });
  const setStatus = useCallback((text, cls = "") => setStatusState({ text: text || "", cls }), []);

  const [tier, setTier] = useState(DEFAULT_TIER);
  const [premium, setPremiumState] = useState(false);
  const [stylePack, setStylePack] = useState("classic");
  const [variantCount, setVariantCount] = useState(1);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null); // { title, body, confirmLabel, tone, onConfirm }
  const [showAuthModal, setShowAuthModal] = useState(false); // false | "login" | "signup"
  const [showProfile, setShowProfile] = useState(false);
  const [showUsage, setShowUsage] = useState(false);
  const [panelFocus, setPanelFocus] = useState(null); // { target } — new object per request
  const [composerFocus, setComposerFocus] = useState(null); // new object per request
  const platforms = NO_PLATFORMS;
  const hookQuota = hookQuotaFrom(usage.hooks);
  const [showTour, setShowTour] = useState(() => !readTourSeen());

  const nodeStudioRef = useRef(null);
  const pendingAuthRef = useRef(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const generatingRef = useRef(false); // blocks double-clicks before state re-renders

  const ws = useBrandWorkspace(setStatus, user?.id);
  const ctx = { brand: ws.brand, notes: ws.notes, stylePack };
  const aiAvailable = isSupabaseConfigured;

  // Returns true when signed in; otherwise prompts for login.
  const ensureAuth = useCallback(() => {
    if (user) return true;
    setShowAuthModal("login");
    return false;
  }, [user]);

  // The Figma plugin links to /?open=profile so people can create a plugin key.
  // Signed out, it asks for a login first and opens the profile afterwards.
  useEffect(() => {
    if (authLoading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("open") !== "profile") return;
    if (!user) {
      setShowAuthModal("login");
      return;
    }
    setShowProfile(true);
    params.delete("open");
    const query = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : "") + window.location.hash);
  }, [user, authLoading]);

  const requireLogin = (actionFn) => (...args) => {
    if (ensureAuth()) return actionFn(...args);
    pendingAuthRef.current = () => actionFn(...args);
    return undefined;
  };

  // After a successful login, run the action that asked for it.
  useEffect(() => {
    if (!user || showAuthModal || !pendingAuthRef.current) return;
    const run = pendingAuthRef.current;
    pendingAuthRef.current = null;
    run();
  }, [user, showAuthModal]);

  const focusPanelField = useCallback((target) => {
    layout.open("right");
    setPanelFocus({ target });
  }, [layout.open]);

  // Opens the message box at the bottom of the workspace, focuses it and flags it as missing.
  const focusComposer = useCallback(() => setComposerFocus({}), []);

  const handleGenerated = useCallback(() => {
    refreshUsage();
  }, [refreshUsage]);

  const quick = useQuickGrid({
    ctx, brandId: ws.currentId, variantCount, tier, platforms, aiAvailable, setStatus, onGenerated: handleGenerated,
    ensureAuth, onMissingMessage: focusComposer,
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

  // Node Studio works for a brand. Adding a node needs one picked (saved, or a new
  // one already started); generating also needs its name and message to adapt.
  // Returns false after pointing at whatever is missing.
  const ensureBrand = ({ generate = false } = {}) => {
    const name = ws.brand.name.trim();
    const message = ws.brand.message.trim();
    if (!ws.currentId && !name && !message) {
      if (ws.brands.length) {
        setStatus("Select a brand first.", "err");
        layout.open("left");
      } else {
        setStatus("Create a brand first.", "err");
        focusPanelField("bp-name");
      }
      return false;
    }
    if (!generate) return true;
    if (!name) {
      setStatus("Add the brand name first.", "err");
      focusPanelField("bp-name");
      return false;
    }
    if (!message) {
      setStatus("Add a message to adapt first.", "err");
      focusComposer();
      return false;
    }
    return true;
  };

  const handleAddNode = (type) => {
    if (layout.view === "quick") quick.add(type);
    else nodeStudioRef.current?.addNode(type);
  };

  // Switching brands drops unsaved edits, so ask first.
  const guardUnsaved = (proceed) => {
    if (!ws.dirty) return proceed();
    setConfirm({
      title: "Discard unsaved changes?",
      body: <><b>{ws.brand.name || "Untitled brand"}</b> has changes that haven't been saved.</>,
      note: "They'll be lost if you continue.",
      icon: "warning",
      cancelLabel: "Keep editing",
      confirmLabel: "Discard",
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
      body: <><b>{ws.brand.name || "Untitled brand"}</b>, its research notes and its generation history will be permanently deleted.</>,
      note: "This can't be undone.",
      icon: "delete",
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

  // Quick Grid entries go back on the grid; Node Studio ones ("node-email", ...)
  // back on the canvas. input = the entry's input_context.
  const handleRestore = (medium, items, input) => {
    const category = String(medium).startsWith("node-") ? medium.slice(5) : null;
    if (category) {
      if (!nodeStudioRef.current?.restore(category, items, input)) return setStatus("That entry can't be restored to the studio.", "err");
      layout.setView("nodes");
      setModal(null);
      return setStatus(`${NODE_CATS[category]?.label || "Copy"} restored to Node Studio.`, "ok");
    }
    if (!quick.restore(medium, items)) return setStatus("That entry can't be restored to the grid.", "err");
    layout.setView("quick");
    setModal(null);
    setStatus(`${MEDIA_BY_KEY[medium]?.label || "Copy"} restored to the grid.`, "ok");
  };

  // Credits and the free hook reset at UTC midnight; reload usage then and
  // whenever the tab regains focus.
  useEffect(() => {
    window.addEventListener("focus", refreshUsage);
    const timer = window.setTimeout(refreshUsage, nextCreditReset() - Date.now() + 1000);
    return () => { window.removeEventListener("focus", refreshUsage); window.clearTimeout(timer); };
  }, [refreshUsage, usage]);

  // Warn before closing the tab with unsaved brand edits.
  useEffect(() => {
    if (!ws.dirty) return undefined;
    const onBeforeUnload = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [ws.dirty]);

  // Generate from the keyboard shortcut or the composer's send button.
  const triggerGenerate = () => {
    if (atGenLimit) return setStatus("Daily generation limit reached.", "warn");
    if (!isGeneratingAll && !quick.busy) requireLogin(handleGenerate)();
  };

  // Keyboard shortcuts: Ctrl/⌘+Enter generates, Ctrl/⌘+S saves the brand.
  const shortcutsRef = useRef(null);
  shortcutsRef.current = {
    blocked: Boolean(modal || confirm || showAuthModal || showProfile || showTour),
    generate: triggerGenerate,
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

  const closeTour = () => {
    setShowTour(false);
    try { localStorage.setItem(TOUR_KEY, "1"); } catch { /* not remembered */ }
  };

  const loadSampleBrand = () => {
    ws.applyFields(SAMPLE_BRAND);
    layout.open("right");
    setStatus("Sample brand loaded — press Generate to see it in action.", "ok");
  };

  const cardCount = quick.nodes.length;
  const generatingDetail = layout.view === "quick" && cardCount > 0
    ? `${cardCount} card${cardCount === 1 ? "" : "s"}`
    : "";

  const views = {
    quick: <QuickGrid quick={quick} atGenLimit={atGenLimit} />,
    nodes: (
      <CanvasViewport>
        <NodeStudio
          ref={nodeStudioRef}
          active={layout.view === "nodes"} ctx={ctx} variantCount={variantCount} tier={tier} platforms={platforms}
          aiAvailable={aiAvailable} setStatus={setStatus}
          onGenerated={handleGenerated}
          refreshUsage={refreshUsage}
          brandId={ws.currentId}
          ensureAuth={ensureAuth}
          ensureBrand={ensureBrand}
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
            brands={ws.brands}
            currentId={ws.currentId}
            onSelect={handleSelectBrand}
            onNew={handleNewBrand}
            user={user}
            usage={usage}
            onLogin={() => setShowAuthModal("login")}
            onSignup={() => setShowAuthModal("signup")}
            onProfile={() => setShowProfile(true)}
            onUsage={() => { refreshUsage(); setShowUsage(true); }}
          />
        </LeftSidebar>

        <MainWorkspace
          inert={Boolean(layout.drawer)}
          view={layout.view}
          views={views}
          onHelp={() => setShowTour(true)}
          tray={
            <MessageComposer
              value={ws.brand.message}
              onChange={(text) => ws.setField("message", text)}
              onGenerate={triggerGenerate}
              generating={isGeneratingAll || quick.busy}
              generatingDetail={generatingDetail}
              atGenLimit={atGenLimit}
              focusRequest={composerFocus}
            />
          }
          toolbar={
            <Header
              tier={tier}
              onTier={setTier}
              view={layout.view}
              onViewChange={layout.setView}
              showExport={layout.view === "quick"}
              exportDisabled={!quick.hasCopy}
              onExport={handleExport}
              addLabel={layout.view === "quick" ? "Add Grid" : "Add Node"}
              addOptions={layout.view === "quick" ? QUICK_ADD_OPTIONS : STUDIO_ADD_OPTIONS}
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

      {showTour && (
        <TourModal onClose={closeTour} onSample={loadSampleBrand} />
      )}

      {showAuthModal && (
        <AuthModal
          initialMode={showAuthModal}
          onClose={() => { pendingAuthRef.current = null; setShowAuthModal(false); }}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}

      {showProfile && user && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onLogout={() => { setShowProfile(false); logout(); }}
          onSaved={() => setStatus("Profile updated.", "ok")}
          onDeleted={() => { setShowProfile(false); setStatus("Your account has been deleted.", "ok"); }}
        />
      )}

      {showUsage && user && (
        <UsageModal
          userId={user.id}
          usage={usage}
          plan={premium ? "Premium" : "Free"}
          tier={tier}
          onTier={setTier}
          onClose={() => setShowUsage(false)}
        />
      )}

      {confirm && (
        <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />
      )}

      {modal === "research" && (
        <ResearchNotes notes={ws.notes} onAdd={ws.addNote} onDelete={ws.removeNote} onClose={() => setModal(null)} />
      )}

      {modal === "history" && (
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
          text={buildBrandBriefPrompt(ctx)}
          onCopy={(t) => copy(t, "Prompt copied — paste it into ChatGPT or any other LLM.")}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "hook" && (
        <HookModal
          aiAvailable={aiAvailable}
          quota={premium ? null : hookQuota}
          onGenerate={() => generateHook({ ctx, tier })}
          onUsed={refreshUsage}
          onCopy={(t) => copy(t, "Hook copied.")}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
