import { useState } from "react";
import OutputCard from "./OutputCard";
import { MEDIA } from "../lib/constants";
import { generateQuickGrid, regenerateOutput, describeError } from "../services/ai";
import { saveGeneration } from "../services/brands";
import host from "../hosts/browser";

const emptyCards = () => Object.fromEntries(MEDIA.map((m) => [m.key, { status: "idle", items: [] }]));

// Holds Quick Grid state + generation logic (used by App so the header's
// "Generate all" button can drive it).
export function useQuickGrid({ ctx, brandId, variantCount, tier, aiAvailable, setStatus, onGenerated }) {
  const [cards, setCards] = useState(emptyCards);
  const [busy, setBusy] = useState(false);

  const precheck = () => {
    if (!aiAvailable) { setStatus("AI generation isn't available here.", "err"); return false; }
    if (!ctx.brand.message.trim()) { setStatus("Add a message to adapt first.", "err"); return false; }
    return true;
  };

  const generateAll = async () => {
    if (!precheck()) return;
    setBusy(true);
    setStatus(`Generating ${variantCount} variant(s) across five mediums...`);
    setCards(Object.fromEntries(MEDIA.map((m) => [m.key, { status: "loading", items: [] }])));
    try {
      const data = await generateQuickGrid({ ctx, variantCount, tier });
      setCards(Object.fromEntries(MEDIA.map((m) => [m.key, { status: "ready", items: data[m.key] }])));
      
      // 1. AWAIT THE SAVES FIRST
      const savePromises = MEDIA.map((m) => 
        saveGeneration({ 
          brandId, 
          medium: m.key, 
          inputContext: { message: ctx.brand.message, stage: ctx.brand.stage, mode: ctx.brand.mode }, 
          output: data[m.key] 
        })
      );
      await Promise.all(savePromises);

      // 2. REFRESH THE USAGE COUNTER AFTER SAVING
      onGenerated({ type: "quick", medium: "packaging" });
      setStatus("Generated just now.", "ok");
      
    } catch (err) {
      setStatus(describeError(err), "err");
      setCards(Object.fromEntries(MEDIA.map((m) => [m.key, { status: "error", items: [], message: "Couldn't generate. Try again." }])));
    } finally {
      setBusy(false);
    }
  };

  const regenerateOne = async (medium) => {
    if (!precheck()) return;
    setCards((c) => ({ ...c, [medium]: { status: "loading", items: [] } }));
    try {
      const items = await regenerateOutput({ ctx, medium, variantCount, tier });
      setCards((c) => ({ ...c, [medium]: { status: "ready", items } }));
      
      // 1. AWAIT THE SAVE FIRST
      await saveGeneration({ brandId, medium, inputContext: { message: ctx.brand.message }, output: items });
      
      // 2. REFRESH THE USAGE COUNTER AFTER SAVING
      onGenerated({ type: "quick", medium });

    } catch (err) {
      setStatus(describeError(err), "err");
      setCards((c) => ({ ...c, [medium]: { status: "error", items: [], message: "Couldn't regenerate. Try again." } }));
    }
  };

  return { cards, busy, generateAll, regenerateOne, setStatus };
}

export default function QuickGrid({ active, quick }) {
  const copyOutput = async (text) => {
    try {
      await host.copyText(text);
      quick.setStatus("Copied — paste it into your design tool.", "ok");
    } catch {
      quick.setStatus("Couldn't copy automatically — select the text and copy manually.", "err");
    }
  };

  return (
    <div hidden={!active}>
      <div className="canvas-inner">
        <div className="canvas-grid">
          {MEDIA.map((m) => (
            <OutputCard
              key={m.key}
              meta={m}
              state={quick.cards[m.key]}
              onRegen={() => quick.regenerateOne(m.key)}
              onCopy={copyOutput}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
