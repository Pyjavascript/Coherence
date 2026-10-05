import { useState } from "react";
import OutputCard from "./OutputCard";
import { MEDIA } from "../lib/constants";
import { generateQuickGrid, regenerateOutput, describeError } from "../services/ai";
import { saveGeneration } from "../services/brands";

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
    setStatus(`Generating ${variantCount} variant(s) across five mediums…`);
    setCards(Object.fromEntries(MEDIA.map((m) => [m.key, { status: "loading", items: [] }])));
    try {
      const data = await generateQuickGrid({ ctx, variantCount, tier });
      setCards(Object.fromEntries(MEDIA.map((m) => [m.key, { status: "ready", items: data[m.key] }])));
      onGenerated({ type: "quick", medium: "packaging" });
      setStatus("Generated just now.", "ok");
      saveGeneration({ brandId, medium: "all", inputContext: { message: ctx.brand.message, stage: ctx.brand.stage, mode: ctx.brand.mode }, output: data });
    } catch (err) {
      setStatus(describeError(err), "err");
      setCards(Object.fromEntries(MEDIA.map((m) => [m.key, { status: "error", items: [], message: "Couldn't generate — try again." }])));
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
      onGenerated({ type: "quick", medium });
      saveGeneration({ brandId, medium, inputContext: { message: ctx.brand.message }, output: items });
    } catch (err) {
      setStatus(describeError(err), "err");
      setCards((c) => ({ ...c, [medium]: { status: "error", items: [], message: "Couldn't regenerate — try again." } }));
    }
  };

  return { cards, busy, generateAll, regenerateOne };
}

export default function QuickGrid({ active, quick }) {
  const [zoom, setZoom] = useState(1);
  return (
    <div hidden={!active}>
      <div className="canvas-inner">
        <div className="canvas-grid" style={{ transform: `scale(${zoom})` }}>
          {MEDIA.map((m) => (
            <OutputCard key={m.key} meta={m} state={quick.cards[m.key]} onRegen={() => quick.regenerateOne(m.key)} />
          ))}
        </div>
      </div>
      <div className="zoomctl">
        <button onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.1).toFixed(2)))}>–</button>
        <span className="pct mono">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(1.25, +(z + 0.1).toFixed(2)))}>+</button>
      </div>
    </div>
  );
}
