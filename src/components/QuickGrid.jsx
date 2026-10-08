import { useEffect, useMemo, useRef, useState } from "react";
import NodeCard from "./nodes/NodeCard";
import WelcomeGuide from "./WelcomeGuide";
import { MEDIA, MEDIA_BY_KEY } from "../lib/constants";
import { applyEdit } from "../lib/copyItems";
import { generateQuickGrid, regenerateOutput, describeError } from "../services/ai";
import { saveGeneration } from "../services/brands";
import { useFlip } from "../hooks/useFlip";
import host from "../hosts/browser";

let seq = 0;
const uid = () => `q${Date.now().toString(36)}${(seq++).toString(36)}`;

// node = { id, type, width, status: idle|loading|ready|error, items, version, message, fav }
// `fav` is the index of the starred variant (null = none); it resets when new copy lands.
const createNode = (type, from) => ({
  id: uid(),
  type,
  width: MEDIA_BY_KEY[type]?.full ? "full" : "half",
  status: from?.status === "ready" ? "ready" : "idle",
  items: from?.status === "ready" ? from.items : [],
  version: 0,
  message: "",
  fav: from?.status === "ready" ? from.fav ?? null : null,
});
const seedNodes = () => MEDIA.map((m) => createNode(m.key));

// A failed request keeps whatever copy the node already had.
const failed = (n, message) => (n.items.length ? { ...n, status: "ready" } : { ...n, status: "error", message });

// Quick Grid state + generation logic. Lives in App so the toolbar's Generate
// button can drive it and so the data survives switching views.
export function useQuickGrid({ ctx, brandId, variantCount, tier, aiAvailable, setStatus, onGenerated, ensureAuth, onMissingMessage }) {
  const [nodes, setNodes] = useState(seedNodes);
  const [busy, setBusy] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const busyRef = useRef(false);
  // nodeId -> token of the newest request for it; stale responses are dropped.
  const tokens = useRef(new Map());

  const precheck = () => {
    if (!aiAvailable) { setStatus("AI generation isn't available here.", "err"); return false; }
    if (ensureAuth && !ensureAuth()) return false;
    if (!ctx.brand.message.trim()) {
      setStatus("Add a message to adapt first.", "err");
      onMissingMessage?.();
      return false;
    }
    return true;
  };

  const generateAll = async () => {
    if (busyRef.current || !precheck()) return;
    const targets = nodesRef.current;
    if (!targets.length) return setStatus("Add a node to generate into.", "err");

    busyRef.current = true;
    setBusy(true);
    const token = {};
    const ids = new Set(targets.map((n) => n.id));
    ids.forEach((id) => tokens.current.set(id, token));
    const stillMine = () => new Set([...ids].filter((id) => tokens.current.get(id) === token));
    const types = [...new Set(targets.map((n) => n.type))];

    setNodes((list) => list.map((n) => (ids.has(n.id) ? { ...n, status: "loading", message: "" } : n)));
    setStatus(`Generating ${variantCount} variant(s) across ${types.length} medium${types.length === 1 ? "" : "s"}...`);
    try {
      const data = await generateQuickGrid({ ctx, variantCount, tier });
      const live = stillMine();
      setNodes((list) => list.map((n) => {
        if (!live.has(n.id)) return n;
        const items = data[n.type] || [];
        return items.length
          ? { ...n, status: "ready", items, version: n.version + 1, message: "", fav: null }
          : failed(n, "No copy came back for this medium. Try regenerating it.");
      }));
      await Promise.all(types.map((type) => saveGeneration({
        brandId,
        medium: type,
        inputContext: { message: ctx.brand.message, stage: ctx.brand.stage, mode: ctx.brand.mode },
        output: data[type],
      })));
      onGenerated({ type: "quick", medium: types[0] });
      setStatus("Generated just now.", "ok");
    } catch (err) {
      const live = stillMine();
      setStatus(describeError(err), "err");
      setNodes((list) => list.map((n) => (live.has(n.id) ? failed(n, "Couldn't generate. Try again.") : n)));
    } finally {
      ids.forEach((id) => { if (tokens.current.get(id) === token) tokens.current.delete(id); });
      busyRef.current = false;
      setBusy(false);
    }
  };

  const regenerate = async (id) => {
    const node = nodesRef.current.find((n) => n.id === id);
    if (!node || node.status === "loading" || !precheck()) return;
    const token = {};
    tokens.current.set(id, token);
    const mine = () => tokens.current.get(id) === token;
    setNodes((list) => list.map((n) => (n.id === id ? { ...n, status: "loading", message: "" } : n)));
    try {
      const items = await regenerateOutput({ ctx, medium: node.type, variantCount, tier });
      if (!mine()) return;
      setNodes((list) => list.map((n) => (n.id === id ? { ...n, status: "ready", items, version: n.version + 1, fav: null } : n)));
      await saveGeneration({ brandId, medium: node.type, inputContext: { message: ctx.brand.message }, output: items });
      onGenerated({ type: "quick", medium: node.type });
    } catch (err) {
      if (!mine()) return;
      setStatus(describeError(err), "err");
      setNodes((list) => list.map((n) => (n.id === id ? failed(n, "Couldn't regenerate. Try again.") : n)));
    } finally {
      if (mine()) tokens.current.delete(id);
    }
  };

  const add = (type) => {
    // One node per medium: the grid can't grow past the default set.
    if (!MEDIA_BY_KEY[type] || nodesRef.current.some((n) => n.type === type)) return;
    const node = createNode(type);
    setNodes((list) => [...list, node]);
    setLastAdded(node.id);
  };

  const duplicate = (id) => {
    const src = nodesRef.current.find((n) => n.id === id);
    if (!src) return;
    const copy = createNode(src.type, src);
    setNodes((list) => {
      const at = list.findIndex((n) => n.id === id);
      return at === -1 ? [...list, copy] : [...list.slice(0, at + 1), copy, ...list.slice(at + 1)];
    });
    setLastAdded(copy.id);
  };

  const remove = (id) => {
    tokens.current.delete(id);
    setNodes((list) => list.filter((n) => n.id !== id));
  };

  const restoreDefaults = () => setNodes(seedNodes());

  // Inline edit of one field of one variant; doesn't bump `version` so the copy doesn't re-animate.
  const editItem = (id, index, field, text) => {
    setNodes((list) => list.map((n) => (n.id !== id ? n : {
      ...n,
      items: n.items.map((item, i) => (i === index ? applyEdit(item, field, text) : item)),
    })));
  };

  const toggleFav = (id, index) => {
    setNodes((list) => list.map((n) => (n.id === id ? { ...n, fav: n.fav === index ? null : index } : n)));
  };

  // Puts copy from history back on the grid, adding the medium's node if it was removed.
  const restore = (type, items) => {
    if (!MEDIA_BY_KEY[type] || !items?.length) return false;
    tokens.current.forEach((_, id) => {
      if (nodesRef.current.find((n) => n.id === id)?.type === type) tokens.current.delete(id);
    });
    const existing = nodesRef.current.find((n) => n.type === type);
    if (existing) {
      setNodes((list) => list.map((n) => (n.id === existing.id
        ? { ...n, status: "ready", items, version: n.version + 1, message: "", fav: null }
        : n)));
      setLastAdded(existing.id);
    } else {
      const node = { ...createNode(type), status: "ready", items, version: 1 };
      setNodes((list) => [...list, node]);
      setLastAdded(node.id);
    }
    return true;
  };

  // First node of each medium, keyed by medium (used for the coherence prompt).
  const cards = useMemo(() => {
    const out = {};
    nodes.forEach((n) => { if (!out[n.type]) out[n.type] = n; });
    return out;
  }, [nodes]);

  const hasCopy = nodes.some((n) => n.items.length > 0);

  return {
    nodes, cards, busy, lastAdded, hasCopy,
    generateAll, regenerate, add, duplicate, remove, restoreDefaults, editItem, toggleFav, restore, setStatus,
  };
}

export default function QuickGrid({ quick, atGenLimit, brand, welcome }) {
  const gridRef = useRef(null);
  useFlip(gridRef, quick.nodes.map((n) => n.id).join("|"));

  useEffect(() => {
    // Scroll only the grid's own scroller (scrollIntoView would also nudge ancestors).
    const scroller = gridRef.current?.parentElement;
    const el = quick.lastAdded && gridRef.current?.querySelector(`[data-flip-id="${quick.lastAdded}"]`);
    if (!scroller || !el) return;
    const box = scroller.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const below = r.bottom - (box.bottom - 80); // keep clear of the view switch
    const above = r.top - box.top;
    if (below > 0) scroller.scrollBy({ top: Math.min(below, above), behavior: "smooth" });
    else if (above < 0) scroller.scrollBy({ top: above - 8, behavior: "smooth" });
  }, [quick.lastAdded]);

  const copyOutput = async (text) => {
    try {
      await host.copyText(text);
      quick.setStatus("Copied — paste it into your design tool.", "ok");
      return true;
    } catch {
      quick.setStatus("Couldn't copy automatically — select the text and copy manually.", "err");
      return false;
    }
  };

  return (
    <div className={"qg" + (welcome ? " has-welcome" : "")}>
      {welcome && <WelcomeGuide {...welcome} />}
      {!quick.nodes.length && (
        <div className="qg-empty">
          <h2>No nodes on the grid</h2>
          <p>Use Add Node to place a medium, or bring back the default set.</p>
          <button type="button" onClick={quick.restoreDefaults}>Restore default nodes</button>
        </div>
      )}
      <div className="qg-grid" ref={gridRef}>
        {quick.nodes.map((n) => (
          <NodeCard
            key={n.id}
            node={n}
            meta={MEDIA_BY_KEY[n.type]}
            brand={brand}
            onEdit={(index, field, text) => quick.editItem(n.id, index, field, text)}
            onToggleFav={(index) => quick.toggleFav(n.id, index)}
            regenDisabled={atGenLimit}
            regenTitle={atGenLimit ? "Daily generation limit reached" : undefined}
            onRegenerate={() => quick.regenerate(n.id)}
            onCopy={copyOutput}
            onDuplicate={() => quick.duplicate(n.id)}
            onDelete={() => quick.remove(n.id)}
          />
        ))}
      </div>
    </div>
  );
}
