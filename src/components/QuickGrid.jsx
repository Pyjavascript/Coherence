import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import NodeCard from "./nodes/NodeCard";
import { MEDIA_BY_KEY, GEN_PLATFORMS_BY_KEY } from "../lib/constants";
import { applyEdit, setCardWords } from "../lib/copyItems";
import { generateQuickGrid, regenerateOutput, describeError } from "../services/ai";
import { saveGeneration } from "../services/brands";
import { useFlip } from "../hooks/useFlip";
import host from "../hosts/browser";

let seq = 0;
const uid = () => `q${Date.now().toString(36)}${(seq++).toString(36)}`;

// node = { id, type, width, status: idle|loading|ready|error, items, version, message, fav,
//          words, brief, component, pointerCount }
// `fav` is the index of the starred variant (null = none); it resets when new copy lands.
// The rest are the card's settings, as on a Node Studio node: `words` is the user-set word
// target per field, { headline, sub } (null / a field left out = the medium's default; older
// saves hold one total); `component` / `pointerCount` apply to Website only;
// `platform` to Social only (Instagram to start, as a new Social node).
const DEFAULT_SETTINGS = { words: null, brief: "", component: "hero", pointerCount: 3, platform: null };
const defaultsFor = (type) => ({ ...DEFAULT_SETTINGS, platform: type === "marketing" ? "Instagram" : null });
const settingsOf = (n) => ({
  words: n.words, brief: n.brief, component: n.component, pointerCount: n.pointerCount, platform: n.platform,
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
  ...defaultsFor(type),
  ...(from ? settingsOf(from) : {}),
});
// The grid starts with three cards, one row across; Add Grid brings the rest.
// They sit in the same order as the Add Grid menu (MEDIA, Node Studio's order).
const DEFAULT_MEDIA = ["marketing", "packaging", "advertising"];
const seedNodes = () => DEFAULT_MEDIA.map((key) => createNode(key));
const MAX_LABEL = 60;

// A failed request keeps whatever copy the node already had.
const failed = (n, message) => (n.items.length ? { ...n, status: "ready" } : { ...n, status: "error", message });

// The mediums the picked platforms write for; null = no pick, every medium.
export const mediaForPlatforms = (platforms) =>
  platforms?.length ? new Set(platforms.flatMap((k) => GEN_PLATFORMS_BY_KEY[k]?.media || [])) : null;

// Quick Grid state + generation logic. Lives in App so the toolbar's Generate
// button can drive it and so the data survives switching views.
export function useQuickGrid({ ctx, brandId, variantCount, tier, platforms, aiAvailable, setStatus, onGenerated, ensureAuth, ensureBrand }) {
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
    // Same rule as Node Studio: a message to adapt, and a brand (picked, or a
    // new one with a name). ensureBrand points at whatever is missing.
    return ensureBrand({ generate: true });
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

  // Each brand has its own grid (App keeps them): snapshot() is this one as it
  // stands, load() puts a brand's back (none = the starter grid). A card still
  // generating is kept as it was before; if its copy lands after its brand is
  // reopened it still fills the card (same id), and it's in History either way.
  const snapshot = () => nodesRef.current.map((n) => (n.status === "loading"
    ? { ...n, status: n.items.length ? "ready" : "idle", message: "" }
    : n));
  const load = (saved) => {
    const next = saved?.length ? saved : seedNodes();
    nodesRef.current = next;
    setNodes(next);
    setLastAdded(null);
  };

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

  // User-set word target for one field ("headline" or "sub"); clamped, and
  // dropped when it matches the default (the Website card's depends on its component).
  const setWords = (id, field, value) => {
    setNodes((list) => list.map((n) => (n.id === id ? { ...n, words: setCardWords(n.type, n, field, value) } : n)));
  };

  // One of the card's other settings (brief, component, pointerCount, platform).
  const setSetting = (id, field, value) => {
    if (!(field in DEFAULT_SETTINGS) || field === "words") return;
    setNodes((list) => list.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
  };

  // Back to the medium's defaults: length, job, component and platform.
  const resetSettings = (id) => {
    setNodes((list) => list.map((n) => (n.id === id ? { ...n, ...defaultsFor(n.type) } : n)));
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
    snapshot, load,
  };
}

// The grid has 12 tracks (layout.css), which divide evenly by 1–4 columns.
const TRACKS = 12;

// Rows that share one screen: up to two rows of cards fill the stage (three
// cards make one tall row, six make two); a third row and beyond keep that
// height and continue below, so the grid scrolls.
const FIT_ROWS = 2;

// How many columns a card takes at `cols` across: at three across every card
// is one column (rows of three equal cards); narrower, a full-width card
// spans the whole row.
const weightOf = (full, cols) => (full && cols < 3 ? cols : 1);

// Packs cards into rows in order (a full-width card takes its weight's worth
// of room). While everything fits on one row, the cards share its whole
// width: three take a third each, two half each, one the full width. Once
// there's more than one row, every card is one column wide (a third at three
// across), so a card added below is the same size as the ones above it.
// Returns each card's track span and the row count.
const packRows = (fulls, cols) => {
  const rows = [];
  fulls.forEach((full, i) => {
    const weight = weightOf(full, cols);
    const row = rows[rows.length - 1];
    if (row && row.weight + weight <= cols) {
      row.cards.push([i, weight]);
      row.weight += weight;
    } else {
      rows.push({ weight, cards: [[i, weight]] });
    }
  });
  const oneRow = rows.length === 1;
  const spans = [];
  rows.forEach((row) => row.cards.forEach(([i, weight]) => {
    spans[i] = oneRow ? TRACKS / row.cards.length : (TRACKS / cols) * weight;
  }));
  return { spans, rows: Math.max(1, rows.length) };
};

// The card in view (phones) or the leftmost one in view (laptops / tablets),
// from the row's scroll position.
const slideAt = (strip) => {
  const first = strip.firstElementChild;
  if (!first) return 0;
  const step = first.offsetWidth + (parseFloat(getComputedStyle(strip).columnGap) || 0);
  return step ? Math.round(strip.scrollLeft / step) : 0;
};

// carousel (phones): one card at a time. The cards sit in a horizontal strip
// that snaps card by card, so each thumb swipe moves exactly one card back or
// forward. The pager under them shows where you are: a dot per card, the
// current one a wide bar, on a grey squircle backing (tap a dot to jump to
// that card).
// Laptops / tablets (strip): the same idea, as many cards across as fit (3 on
// laptops, 2 on tablets, layout.css --qg-cols) at the full height. Cards past
// those sit to the right and the row scrolls sideways (trackpad, wheel with
// Shift, or the pager's dots); a newly added card scrolls into view.
// The same pager sits under the row once there are more cards than fit: a
// dot per scroll stop (the leftmost card in view), so the last dot is the
// row scrolled to its end.
export default function QuickGrid({ quick, atGenLimit, carousel = false }) {
  const gridRef = useRef(null);
  const [slide, setSlide] = useState(0);
  const count = quick.nodes.length;
  const current = Math.min(slide, Math.max(0, count - 1));
  const strip = !carousel && count > 0;
  // Cards across (layout.css --qg-cols, from the stage width).
  const [cols, setCols] = useState(1);
  // The pager's stops: phones, one per card; laptops / tablets, one per
  // scroll position (none while every card fits).
  const stops = carousel ? count : strip ? Math.max(0, count - cols + 1) : 0;
  const scrolls = strip && stops > 1;
  const at = Math.min(current, Math.max(0, stops - 1));

  const goTo = (index, smooth = true) => {
    const strip = gridRef.current;
    const card = strip?.children[index];
    if (!strip || !card) return;
    strip.scrollTo({ left: card.offsetLeft - strip.firstElementChild.offsetLeft, behavior: smooth ? "smooth" : "auto" });
    setSlide(index);
  };

  // Track the card in view (phones) or the leftmost one (laptops / tablets) as
  // the row scrolls.
  useEffect(() => {
    const strip = gridRef.current;
    if ((!carousel && !scrolls) || !strip) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSlide(slideAt(strip)));
    };
    strip.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      strip.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [carousel, scrolls]);

  const { spans } = packRows(quick.nodes.map((n) => n.width === "full"), cols);
  useFlip(gridRef, quick.nodes.map((n, i) => `${n.id}:${spans[i]}`).join("|"));

  // --row-fit is the height of a row when FIT_ROWS rows share the screen.
  // Rows never go below it: one row stretches to fill the stage, two share
  // it, and more continue below (the grid scrolls) instead of shrinking.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    const scroller = grid?.parentElement;
    if (!grid || !scroller || typeof ResizeObserver === "undefined") return undefined;
    const update = () => {
      const gridStyle = getComputedStyle(grid);
      const scrollStyle = getComputedStyle(scroller);
      const across = parseInt(gridStyle.getPropertyValue("--qg-cols"), 10) || 1;
      setCols(across);
      const rows = FIT_ROWS;
      const inner = scroller.clientHeight - parseFloat(scrollStyle.paddingTop) - parseFloat(scrollStyle.paddingBottom);
      const gap = parseFloat(gridStyle.rowGap) || 0;
      grid.style.setProperty("--row-fit", `${Math.max(0, Math.floor((inner - gap * (rows - 1)) / rows))}px`);
    };
    // The scroller's content box changes with the window and the panels, and so
    // does the column count.
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
    const index = [...gridRef.current.children].indexOf(el);
    // Phones: slide to the new card.
    if (carousel) {
      goTo(index);
      return;
    }
    // Laptops / tablets: scroll the row so the new card is the last one in view.
    goTo(Math.max(0, index - (cols - 1)));
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
    <div className={"qg" + (quick.nodes.length ? "" : " is-empty") + (carousel ? " is-carousel" : "") + (strip ? " is-strip" : "")}>
      {!quick.nodes.length && (
        <div className="qg-empty">
          <h2>No cards on the grid</h2>
          <p>Use Add Grid to place a medium, or bring back the default set.</p>
          <button type="button" onClick={quick.restoreDefaults}>Restore default cards</button>
        </div>
      )}
      <div className="qg-grid" ref={gridRef} style={{ "--qg-n": Math.max(1, count) }}>
        {quick.nodes.map((n, i) => (
          <NodeCard
            key={n.id}
            node={n}
            meta={MEDIA_BY_KEY[n.type]}
            span={spans[i]}
            enterIndex={firstRender.current ? i : 0}
            skipped={Boolean(quick.targetMedia && !quick.targetMedia.has(n.type))}
            banned={quick.banned}
            onLabelChange={(text) => quick.setLabel(n.id, text)}
            onWordsChange={(field, value) => quick.setWords(n.id, field, value)}
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
      {stops > 1 && (
        <div className="qg-pager">
          <div className="qg-pager-dots">
            {quick.nodes.slice(0, stops).map((n, i) => (
              <button
                key={n.id}
                type="button"
                className="qg-pager-dot"
                aria-label={carousel
                  ? `${n.label || MEDIA_BY_KEY[n.type]?.label || "Card"} (${i + 1} of ${count})`
                  : `Cards ${i + 1} to ${i + Math.min(cols, count)} of ${count}`}
                aria-current={i === at || undefined}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
