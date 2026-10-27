import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import NodeCard from "./nodes/NodeCard";
import { MEDIA, MEDIA_BY_KEY, GEN_PLATFORMS_BY_KEY } from "../lib/constants";
import { applyEdit, cardLimits, defaultWords, minWordsFor, MAX_WORDS } from "../lib/copyItems";
import { generateQuickGrid, regenerateOutput, describeError } from "../services/ai";
import { saveGeneration } from "../services/brands";
import { useFlip } from "../hooks/useFlip";
import host from "../hosts/browser";

let seq = 0;
const uid = () => `q${Date.now().toString(36)}${(seq++).toString(36)}`;

// node = { id, type, width, status: idle|loading|ready|error, items, version, message, fav,
//          words, brief, requirements, component, pointerCount }
// `fav` is the index of the starred variant (null = none); it resets when new copy lands.
// The rest are the card's settings, as on a Node Studio node: `words` is the user-set total
// length (null = the medium's default); `component` / `pointerCount` apply to Website only.
const DEFAULT_SETTINGS = { words: null, brief: "", requirements: "", component: "hero", pointerCount: 3 };
const settingsOf = (n) => ({
  words: n.words, brief: n.brief, requirements: n.requirements, component: n.component, pointerCount: n.pointerCount,
});

// `label` is the card's editable title; it starts as the medium's name.
const createNode = (type, from) => ({
  id: uid(),
  type,
  label: from?.label ?? MEDIA_BY_KEY[type]?.label ?? "",
  width: MEDIA_BY_KEY[type]?.full ? "full" : "half",
  status: from?.status === "ready" ? "ready" : "idle",
  items: from?.status === "ready" ? from.items : [],
  version: 0,
  message: "",
  fav: from?.status === "ready" ? from.fav ?? null : null,
  ...DEFAULT_SETTINGS,
  ...(from ? settingsOf(from) : {}),
});
const seedNodes = () => MEDIA.map((m) => createNode(m.key));
const MAX_LABEL = 60;

// A failed request keeps whatever copy the node already had.
const failed = (n, message) => (n.items.length ? { ...n, status: "ready" } : { ...n, status: "error", message });

// The mediums the picked platforms write for; null = no pick, every medium.
export const mediaForPlatforms = (platforms) =>
  platforms?.length ? new Set(platforms.flatMap((k) => GEN_PLATFORMS_BY_KEY[k]?.media || [])) : null;

// Quick Grid state + generation logic. Lives in App so the toolbar's Generate
// button can drive it and so the data survives switching views.
export function useQuickGrid({ ctx, brandId, variantCount, tier, platforms, aiAvailable, setStatus, onGenerated, ensureAuth, onMissingMessage }) {
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
    // Picked platforms limit the run to the cards they write for.
    const media = mediaForPlatforms(platforms);
    const targets = nodesRef.current.filter((n) => !media || media.has(n.type));
    if (!nodesRef.current.length) return setStatus("Add a node to generate into.", "err");
    if (!targets.length) return setStatus("None of the picked platforms has a card on the grid — add one, or change the platforms.", "err");

    busyRef.current = true;
    setBusy(true);
    const token = {};
    const ids = new Set(targets.map((n) => n.id));
    ids.forEach((id) => tokens.current.set(id, token));
    const stillMine = () => new Set([...ids].filter((id) => tokens.current.get(id) === token));
    // One request, one entry per card: a medium's first card is keyed by the
    // medium, a duplicate gets "website_2" etc., so each card gets its own copy
    // from its own settings. Every card costs one credit.
    const keyOf = new Map();
    const count = {};
    targets.forEach((n) => {
      count[n.type] = (count[n.type] || 0) + 1;
      keyOf.set(n.id, count[n.type] === 1 ? n.type : `${n.type}_${count[n.type]}`);
    });
    const cards = targets.map((n) => ({ key: keyOf.get(n.id), medium: n.type, settings: settingsOf(n) }));

    setNodes((list) => list.map((n) => (ids.has(n.id) ? { ...n, status: "loading", message: "" } : n)));
    try {
      const data = await generateQuickGrid({ ctx, variantCount, tier, cards, platforms });
      const live = stillMine();
      setNodes((list) => list.map((n) => {
        if (!live.has(n.id)) return n;
        const items = data[keyOf.get(n.id)] || [];
        return items.length
          ? { ...n, status: "ready", items, version: n.version + 1, message: "", fav: null }
          : failed(n, "No copy came back for this card. Try regenerating it.");
      }));
      // History: one entry per card, so a duplicate never overwrites the original.
      await Promise.all(cards.filter((c) => data[c.key]?.length).map((c) => saveGeneration({
        brandId,
        medium: c.medium,
        inputContext: {
          message: ctx.brand.message, stage: ctx.brand.stage, mode: ctx.brand.mode,
          brief: c.settings.brief || undefined, platforms: platforms?.length ? platforms : undefined,
        },
        output: data[c.key],
      })));
      onGenerated({ type: "quick", medium: cards[0].medium });
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
      const items = await regenerateOutput({ ctx, medium: node.type, variantCount, tier, settings: settingsOf(node), platforms });
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

  // Any medium, as many times as wanted; repeats get their own copy on Generate.
  const add = (type) => {
    if (!MEDIA_BY_KEY[type]) return;
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

  // The card's title, as typed (it may be blank while being edited).
  const setLabel = (id, text) => {
    setNodes((list) => list.map((n) => (n.id === id ? { ...n, label: text.slice(0, MAX_LABEL) } : n)));
  };

  // Inline edit of one field of one variant; doesn't bump `version` so the copy doesn't re-animate.
  const editItem = (id, index, field, text) => {
    setNodes((list) => list.map((n) => (n.id !== id ? n : {
      ...n,
      items: n.items.map((item, i) => (i === index ? applyEdit(item, field, text) : item)),
    })));
  };

  // User-set total length; clamped, and stored as null when it matches the default.
  const setWords = (id, value) => {
    setNodes((list) => list.map((n) => {
      if (n.id !== id) return n;
      // The card's own default (the Website card's depends on its component).
      const limits = cardLimits(n.type, { component: n.component });
      const words = Math.min(MAX_WORDS, Math.max(minWordsFor(limits), Math.round(Number(value) || 0)));
      return { ...n, words: words === defaultWords(limits) ? null : words };
    }));
  };

  // One of the card's other settings (brief, requirements, component, pointerCount).
  const setSetting = (id, field, value) => {
    if (!(field in DEFAULT_SETTINGS) || field === "words") return;
    setNodes((list) => list.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
  };

  // Back to the medium's defaults: length, job, requirements and component.
  const resetSettings = (id) => {
    setNodes((list) => list.map((n) => (n.id === id ? { ...n, ...DEFAULT_SETTINGS } : n)));
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
  const targetMedia = useMemo(() => mediaForPlatforms(platforms), [platforms]);

  return {
    nodes, cards, busy, lastAdded, hasCopy, targetMedia, banned: ctx.brand.banned,
    generateAll, regenerate, add, duplicate, remove, restoreDefaults, setLabel, editItem, setWords, setSetting, resetSettings, toggleFav, restore, setStatus,
  };
}

// How many rows the default set of cards takes at `cols` columns, packed the
// way the grid packs them (row dense). A full-width card spans the whole row,
// except at three columns where it spans two (layout.css, .ncard.is-full).
const defaultRows = (cols) => {
  const used = [];
  let rows = 0;
  MEDIA.forEach((m) => {
    const span = Math.min(cols, m.full ? (cols === 3 ? 2 : cols) : 1);
    for (let r = 0; ; r += 1) {
      used[r] = used[r] || Array(cols).fill(false);
      const at = used[r].findIndex((_, c) => c + span <= cols && used[r].slice(c, c + span).every((taken) => !taken));
      if (at === -1) continue;
      for (let c = at; c < at + span; c += 1) used[r][c] = true;
      rows = Math.max(rows, r + 1);
      break;
    }
  });
  return Math.max(1, rows);
};

export default function QuickGrid({ quick, atGenLimit }) {
  const gridRef = useRef(null);
  useFlip(gridRef, quick.nodes.map((n) => n.id).join("|"));

  // The default cards fill one screen. --row-fit is that row height, so cards
  // added beyond the default set keep it and continue below (the grid scrolls)
  // instead of every row shrinking to make room.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    const scroller = grid?.parentElement;
    if (!grid || !scroller || typeof ResizeObserver === "undefined") return undefined;
    const update = () => {
      const gridStyle = getComputedStyle(grid);
      const scrollStyle = getComputedStyle(scroller);
      const cols = gridStyle.gridTemplateColumns.split(" ").filter(Boolean).length || 1;
      const rows = defaultRows(cols);
      const inner = scroller.clientHeight - parseFloat(scrollStyle.paddingTop) - parseFloat(scrollStyle.paddingBottom);
      const gap = parseFloat(gridStyle.rowGap) || 0;
      grid.style.setProperty("--row-fit", `${Math.max(0, Math.floor((inner - gap * (rows - 1)) / rows))}px`);
    };
    // The scroller's content box changes with the window, the panels and the
    // message tray's height (its bottom padding), and so does the column count.
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  // Cards on the grid when it first renders rise in one after another; a card
  // added later enters straight away.
  const firstRender = useRef(true);
  useEffect(() => { firstRender.current = false; }, []);

  useEffect(() => {
    // Scroll only the grid's own scroller (scrollIntoView would also nudge ancestors).
    const scroller = gridRef.current?.parentElement;
    const el = quick.lastAdded && gridRef.current?.querySelector(`[data-flip-id="${quick.lastAdded}"]`);
    if (!scroller || !el) return;
    const box = scroller.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    // The bottom padding is the room kept clear of the message tray.
    const below = r.bottom - (box.bottom - parseFloat(getComputedStyle(scroller).paddingBottom));
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
    <div className="qg">
      {!quick.nodes.length && (
        <div className="qg-empty">
          <h2>No cards on the grid</h2>
          <p>Use Add Grid to place a medium, or bring back the default set.</p>
          <button type="button" onClick={quick.restoreDefaults}>Restore default cards</button>
        </div>
      )}
      <div className="qg-grid" ref={gridRef}>
        {quick.nodes.map((n, i) => (
          <NodeCard
            key={n.id}
            node={n}
            meta={MEDIA_BY_KEY[n.type]}
            enterIndex={firstRender.current ? i : 0}
            skipped={Boolean(quick.targetMedia && !quick.targetMedia.has(n.type))}
            banned={quick.banned}
            onLabelChange={(text) => quick.setLabel(n.id, text)}
            onEdit={(index, field, text) => quick.editItem(n.id, index, field, text)}
            onWordsChange={(value) => quick.setWords(n.id, value)}
            onSetting={(field, value) => quick.setSetting(n.id, field, value)}
            onResetSettings={() => quick.resetSettings(n.id)}
            onToggleFav={(index) => quick.toggleFav(n.id, index)}
            regenDisabled={atGenLimit}
            regenTitle={atGenLimit ? "Daily generation limit reached" : undefined}
            onRegenerate={() => quick.regenerate(n.id)}
            onBlocked={() => quick.setStatus("Daily generation limit reached.", "warn")}
            onCopy={copyOutput}
            onDuplicate={() => quick.duplicate(n.id)}
            onDelete={() => quick.remove(n.id)}
          />
        ))}
      </div>
    </div>
  );
}
