// // import { useState, useCallback } from "react";
// // import Header from "./components/Header";
// // import StatusBar from "./components/StatusBar";
// // import BrandSidebar from "./components/BrandSidebar";
// // import BrandPanel from "./components/BrandPanel";
// // import NodeStudio from "./components/NodeStudio";
// // import QuickGrid, { useQuickGrid } from "./components/QuickGrid";
// // import ResearchNotes from "./components/ResearchNotes";
// // import { CoherenceModal, HookModal } from "./components/Modal";
// // import { useBrandWorkspace } from "./hooks/useBrandWorkspace";
// // import { generateHook } from "./services/ai";
// // import { buildCoherencePrompt, describeLastGenerated } from "./lib/prompts";
// // import { isSupabaseConfigured } from "./lib/supabase";
// // import { DEFAULT_TIER } from "./lib/constants";
// // import { useUsage } from "./hooks/useUsage";

// // import host from "./hosts/browser";

// // export default function App() {
// //   const { usage, refresh: refreshUsage, atGenLimit } = useUsage();
// //   const [status, setStatusState] = useState({ text: "", cls: "" });
// //   const setStatus = useCallback((text, cls = "") => setStatusState({ text: text || "", cls }), []);

// //   const [tier, setTier] = useState(DEFAULT_TIER);
// //   const [premium, setPremiumState] = useState(false);
// //   const [stylePack, setStylePack] = useState("classic");
// //   const [variantCount, setVariantCount] = useState(1);
// //   const [mode, setMode] = useState("nodes");
// //   const [modal, setModal] = useState(null); // 'research' | 'coherence' | 'hook' | null
// //   const [lastGenerated, setLastGenerated] = useState(null);

// //   const ws = useBrandWorkspace(setStatus);
// //   const ctx = { brand: ws.brand, notes: ws.notes, stylePack };
// //   const aiAvailable = isSupabaseConfigured;

// //   const handleGenerated = useCallback((res) => {
// //     setLastGenerated(res);
// //     refreshUsage();
// //   }, [refreshUsage]);

  

// //   const quick = useQuickGrid({
// //     ctx, brandId: ws.currentId, variantCount, tier, aiAvailable, setStatus, onGenerated: setLastGenerated,
// //   });

// //   const handleSaveBrand = async (...args) => {
// //     await ws.save(...args);
// //     refreshUsage();
// //   };

// //   const handleDeleteBrand = async (...args) => {
// //     await ws.remove(...args);
// //     refreshUsage();
// //   };

// //   // Premium (demo) gating — identical behaviour to the prototype
// //   const setPremium = (on) => {
// //     setPremiumState(on);
// //     if (!on) { setStylePack("classic"); setVariantCount(1); }
// //   };
// //   const onStylePack = (v) => {
// //     if (v !== "classic" && !premium) { setStylePack("classic"); return setStatus("Unlock style packs with Premium.", "err"); }
// //     setStylePack(v);
// //   };
// //   const onVariantCount = (v) => {
// //     if (v !== 1 && !premium) { setVariantCount(1); return setStatus("Unlock multiple variants with Premium.", "err"); }
// //     setVariantCount(v);
// //   };

// //   const copy = async (text, ok) => {
// //     if (!text) return setStatus("Generate a hook first.", "err");
// //     try { await host.copyText(text); setStatus(ok, "ok"); }
// //     catch { setStatus("Couldn't copy automatically — select the text and copy manually.", "err"); }
// //   };

// //   const unavailable = aiAvailable
// //     ? ""
// //     : "Live generation and brand saving aren't available — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart npm run dev.";

// //   return (
// //     <div className="app">
// //       <Header
// //         fileLabel={ws.fileLabel} tier={tier} onTier={setTier} premium={premium} onPremium={setPremium}
// //         onGenerate={quick.generateAll} generating={quick.busy}
// //         usage={usage} atGenLimit={atGenLimit}
// //       />
// //       <StatusBar status={status} unavailable={unavailable} />

// //       <div className="shell">
// //         <BrandSidebar brands={ws.brands} currentId={ws.currentId} onSelect={ws.selectBrand} onNew={ws.newBrand} />

// //         <main className="canvas">
// //           <div className="modetabs">
// //             <button className={"modetab" + (mode === "nodes" ? " on" : "")} onClick={() => setMode("nodes")}>Node studio</button>
// //             <button className={"modetab" + (mode === "quick" ? " on" : "")} onClick={() => setMode("quick")}>Quick grid</button>
// //           </div>
// //           <NodeStudio
// //             active={mode === "nodes"} ctx={ctx} variantCount={variantCount} tier={tier}
// //             aiAvailable={aiAvailable} setStatus={setStatus}
// //             onGenerated={handleGenerated} 
// //             refreshUsage={refreshUsage}
// //           />
// //           <QuickGrid active={mode === "quick"} quick={quick} />
// //         </main>

// //         <BrandPanel
// //           brand={ws.brand} onField={ws.setField}
// //           stylePack={stylePack} onStylePack={onStylePack} variantCount={variantCount} onVariantCount={onVariantCount}
// //           researchCount={ws.notes.length}
// //           onSave={handleSaveBrand} 
// //           onDelete={handleDeleteBrand}
// //           onResearch={() => setModal("research")} onCoherence={() => setModal("coherence")} onHook={() => setModal("hook")}
// //         />
// //       </div>

// //       {modal === "research" && (
// //         <ResearchNotes notes={ws.notes} onAdd={ws.addNote} onDelete={ws.removeNote} onClose={() => setModal(null)} />
// //       )}
// //       {modal === "coherence" && (
// //         <CoherenceModal
// //           text={buildCoherencePrompt(ctx, describeLastGenerated(lastGenerated, quick.cards))}
// //           onCopy={(t) => copy(t, "Prompt copied — paste it into ChatGPT or any other LLM.")}
// //           onClose={() => setModal(null)}
// //         />
// //       )}
// //       {modal === "hook" && (
// //         <HookModal
// //           aiAvailable={aiAvailable}
// //           onGenerate={(requirement) => generateHook({ ctx, requirement, tier })}
// //           onCopy={(t) => copy(t, "Hook copied.")}
// //           onClose={() => setModal(null)}
// //         />
// //       )}
// //     </div>
// //   );
// // }
// import { useState, useCallback } from "react";
// import Header from "./components/Header";
// import StatusBar from "./components/StatusBar";
// import BrandSidebar from "./components/BrandSidebar";
// import BrandPanel from "./components/BrandPanel";
// import NodeStudio from "./components/NodeStudio";
// import QuickGrid, { useQuickGrid } from "./components/QuickGrid";
// import ResearchNotes from "./components/ResearchNotes";
// import { CoherenceModal, HookModal } from "./components/Modal";
// import { useBrandWorkspace } from "./hooks/useBrandWorkspace";
// import { generateHook } from "./services/ai";
// import { buildCoherencePrompt, describeLastGenerated } from "./lib/prompts";
// import { isSupabaseConfigured } from "./lib/supabase";
// import { DEFAULT_TIER } from "./lib/constants";
// import { useUsage } from "./hooks/useUsage";
// import { useAuth } from "./hooks/useAuth"; // <-- Added Auth Hook
// import AuthModal from "./components/AuthModal"; // <-- Added Auth Modal

// import host from "./hosts/browser";

// export default function App() {
//   const { user, loading: authLoading, logout } = useAuth(); // <-- Initialize Auth
//   const { usage, refresh: refreshUsage, atGenLimit } = useUsage();
  
//   const [status, setStatusState] = useState({ text: "", cls: "" });
//   const setStatus = useCallback((text, cls = "") => setStatusState({ text: text || "", cls }), []);

//   const [tier, setTier] = useState(DEFAULT_TIER);
//   const [premium, setPremiumState] = useState(false);
//   const [stylePack, setStylePack] = useState("classic");
//   const [variantCount, setVariantCount] = useState(1);
//   const [mode, setMode] = useState("nodes");
//   const [modal, setModal] = useState(null); // 'research' | 'coherence' | 'hook' | null
//   const [lastGenerated, setLastGenerated] = useState(null);
  
//   const [showAuthModal, setShowAuthModal] = useState(false); // <-- Auth Modal State

//   const ws = useBrandWorkspace(setStatus);
//   const ctx = { brand: ws.brand, notes: ws.notes, stylePack };
//   const aiAvailable = isSupabaseConfigured;

//   // Helper to force login before taking an action
//   const requireLogin = useCallback((actionFn) => (...args) => {
//     if (!user) {
//       setShowAuthModal(true);
//       return;
//     }
//     return actionFn(...args);
//   }, [user]);

//   const handleGenerated = useCallback((res) => {
//     setLastGenerated(res);
//     refreshUsage();
//   }, [refreshUsage]);

//   const quick = useQuickGrid({
//     ctx, brandId: ws.currentId, variantCount, tier, aiAvailable, setStatus, onGenerated: handleGenerated,
//   });

//   const handleSaveBrand = async (...args) => {
//     await ws.save(...args);
//     refreshUsage();
//   };

//   const handleDeleteBrand = async (...args) => {
//     await ws.remove(...args);
//     refreshUsage();
//   };

//   // Premium (demo) gating — identical behaviour to the prototype
//   const setPremium = (on) => {
//     setPremiumState(on);
//     if (!on) { setStylePack("classic"); setVariantCount(1); }
//   };
  
//   const onStylePack = (v) => {
//     if (v !== "classic" && !premium) { setStylePack("classic"); return setStatus("Unlock style packs with Premium.", "err"); }
//     setStylePack(v);
//   };
  
//   const onVariantCount = (v) => {
//     if (v !== 1 && !premium) { setVariantCount(1); return setStatus("Unlock multiple variants with Premium.", "err"); }
//     setVariantCount(v);
//   };

//   const copy = async (text, ok) => {
//     if (!text) return setStatus("Generate a hook first.", "err");
//     try { await host.copyText(text); setStatus(ok, "ok"); }
//     catch { setStatus("Couldn't copy automatically — select the text and copy manually.", "err"); }
//   };

//   const unavailable = aiAvailable
//     ? ""
//     : "Live generation and brand saving aren't available — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart npm run dev.";

//   // Wait for Supabase to check if the user is logged in before rendering the main UI
//   if (authLoading) {
//     return <div style={{ padding: "2rem", color: "var(--muted)", fontFamily: "monospace" }}>Loading Brand OS...</div>;
//   }

//   return (
//     <div className="app">
//       <Header
//         fileLabel={ws.fileLabel} tier={tier} onTier={setTier} premium={premium} onPremium={setPremium}
//         onGenerate={requireLogin(quick.generateAll)} // <-- Protected with login
//         generating={quick.busy}
//         usage={usage} atGenLimit={atGenLimit}
//         user={user} // <-- Passed to Header
//         onLogin={() => setShowAuthModal(true)} // <-- Passed to Header
//         onLogout={logout} // <-- Passed to Header
//       />
//       <StatusBar status={status} unavailable={unavailable} />

//       <div className="shell">
//         <BrandSidebar brands={ws.brands} currentId={ws.currentId} onSelect={ws.selectBrand} onNew={ws.newBrand} />

//         <main className="canvas">
//           <div className="modetabs">
//             <button className={"modetab" + (mode === "nodes" ? " on" : "")} onClick={() => setMode("nodes")}>Node studio</button>
//             <button className={"modetab" + (mode === "quick" ? " on" : "")} onClick={() => setMode("quick")}>Quick grid</button>
//           </div>
//           <NodeStudio
//             active={mode === "nodes"} ctx={ctx} variantCount={variantCount} tier={tier}
//             aiAvailable={aiAvailable} setStatus={setStatus}
//             onGenerated={handleGenerated} 
//             refreshUsage={refreshUsage}
//           />
//           <QuickGrid active={mode === "quick"} quick={quick} />
//         </main>

//         <BrandPanel
//           brand={ws.brand} onField={ws.setField}
//           stylePack={stylePack} onStylePack={onStylePack} variantCount={variantCount} onVariantCount={onVariantCount}
//           researchCount={ws.notes.length}
//           onSave={requireLogin(handleSaveBrand)} // <-- Protected with login
//           onDelete={requireLogin(handleDeleteBrand)} // <-- Protected with login
//           onResearch={() => setModal("research")} onCoherence={() => setModal("coherence")} onHook={() => setModal("hook")}
//         />
//       </div>

//       {/* --- Modals --- */}
      
//       {showAuthModal && (
//         <AuthModal onClose={() => setShowAuthModal(false)} />
//       )}

//       {modal === "research" && (
//         <ResearchNotes notes={ws.notes} onAdd={ws.addNote} onDelete={ws.removeNote} onClose={() => setModal(null)} />
//       )}
      
//       {modal === "coherence" && (
//         <CoherenceModal
//           text={buildCoherencePrompt(ctx, describeLastGenerated(lastGenerated, quick.cards))}
//           onCopy={(t) => copy(t, "Prompt copied — paste it into ChatGPT or any other LLM.")}
//           onClose={() => setModal(null)}
//         />
//       )}
      
//       {modal === "hook" && (
//         <HookModal
//           aiAvailable={aiAvailable}
//           onGenerate={(requirement) => generateHook({ ctx, requirement, tier })}
//           onCopy={(t) => copy(t, "Hook copied.")}
//           onClose={() => setModal(null)}
//         />
//       )}
//     </div>
//   );
// }

import { useState, useCallback, useRef } from "react"; // <-- Added useRef
import Header from "./components/Header";
import StatusBar from "./components/StatusBar";
import BrandSidebar from "./components/BrandSidebar";
import BrandPanel from "./components/BrandPanel";
import NodeStudio from "./components/NodeStudio";
import QuickGrid, { useQuickGrid } from "./components/QuickGrid";
import ResearchNotes from "./components/ResearchNotes";
import { CoherenceModal, HookModal } from "./components/Modal";
import { useBrandWorkspace } from "./hooks/useBrandWorkspace";
import { generateHook } from "./services/ai";
import { buildCoherencePrompt, describeLastGenerated } from "./lib/prompts";
import { isSupabaseConfigured } from "./lib/supabase";
import { DEFAULT_TIER } from "./lib/constants";
import { useUsage } from "./hooks/useUsage";
import { useAuth } from "./hooks/useAuth"; 
import AuthModal from "./components/AuthModal"; 

import host from "./hosts/browser";

export default function App() {
  const { user, loading: authLoading, logout } = useAuth(); 
  const { usage, refresh: refreshUsage, atGenLimit } = useUsage();
  
  const [status, setStatusState] = useState({ text: "", cls: "" });
  const setStatus = useCallback((text, cls = "") => setStatusState({ text: text || "", cls }), []);

  const [tier, setTier] = useState(DEFAULT_TIER);
  const [premium, setPremiumState] = useState(false);
  const [stylePack, setStylePack] = useState("classic");
  const [variantCount, setVariantCount] = useState(1);
  const [mode, setMode] = useState("nodes");
  const [modal, setModal] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // 1. Added Ref and State for the master generation process
  const nodeStudioRef = useRef(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const ws = useBrandWorkspace(setStatus);
  const ctx = { brand: ws.brand, notes: ws.notes, stylePack };
  const aiAvailable = isSupabaseConfigured;

  // Helper to force login before taking an action
  const requireLogin = useCallback((actionFn) => (...args) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    return actionFn(...args);
  }, [user]);

  const handleGenerated = useCallback((res) => {
    setLastGenerated(res);
    refreshUsage();
  }, [refreshUsage]);

  const quick = useQuickGrid({
    ctx, brandId: ws.currentId, variantCount, tier, aiAvailable, setStatus, onGenerated: handleGenerated,
  });

  // 2. The Master Generate Function (Triggers both QuickGrid and NodeStudio)
  const handleMasterGenerateAll = async () => {
    setIsGeneratingAll(true);
    try {
      const quickPromise = quick.generateAll();
      const nodesPromise = nodeStudioRef.current?.generateAllNodes();
      
      // Wait for both panels to finish generating
      await Promise.all([quickPromise, nodesPromise]);
    } finally {
      setIsGeneratingAll(false);
    }
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
    if (!text) return setStatus("Generate a hook first.", "err");
    try { await host.copyText(text); setStatus(ok, "ok"); }
    catch { setStatus("Couldn't copy automatically — select the text and copy manually.", "err"); }
  };

  const unavailable = aiAvailable
    ? ""
    : "Live generation and brand saving aren't available — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart npm run dev.";

  if (authLoading) {
    return <div style={{ padding: "2rem", color: "var(--muted)", fontFamily: "monospace" }}>Loading Brand OS...</div>;
  }

  return (
    <div className="app">
      <Header
        fileLabel={ws.fileLabel} tier={tier} onTier={setTier} premium={premium} onPremium={setPremium}
        
        // 3. Updated Header to use Master Generate & combined loading state
        onGenerate={requireLogin(handleMasterGenerateAll)}
        generating={isGeneratingAll || quick.busy} 
        
        usage={usage} atGenLimit={atGenLimit}
        user={user} 
        onLogin={() => setShowAuthModal(true)} 
        onLogout={logout} 
      />
      <StatusBar status={status} unavailable={unavailable} />

      <div className="shell">
        <BrandSidebar brands={ws.brands} currentId={ws.currentId} onSelect={ws.selectBrand} onNew={ws.newBrand} />

        <main className="canvas">
          <div className="modetabs">
            <button className={"modetab" + (mode === "nodes" ? " on" : "")} onClick={() => setMode("nodes")}>Node studio</button>
            <button className={"modetab" + (mode === "quick" ? " on" : "")} onClick={() => setMode("quick")}>Quick grid</button>
          </div>
          <NodeStudio
            ref={nodeStudioRef} // <-- 4. Attached the Ref here!
            active={mode === "nodes"} ctx={ctx} variantCount={variantCount} tier={tier}
            aiAvailable={aiAvailable} setStatus={setStatus}
            onGenerated={handleGenerated} 
            refreshUsage={refreshUsage}
          />
          <QuickGrid active={mode === "quick"} quick={quick} />
        </main>

        <BrandPanel
          brand={ws.brand} onField={ws.setField}
          stylePack={stylePack} onStylePack={onStylePack} variantCount={variantCount} onVariantCount={onVariantCount}
          researchCount={ws.notes.length}
          onSave={requireLogin(handleSaveBrand)} 
          onDelete={requireLogin(handleDeleteBrand)} 
          onResearch={() => setModal("research")} onCoherence={() => setModal("coherence")} onHook={() => setModal("hook")}
        />
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