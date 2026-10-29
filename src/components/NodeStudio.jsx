

import { Fragment, useState, useRef, useEffect, useLayoutEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { NODE_CATS, COL_ORDER, PLATFORMS, WEBSITE_COMPONENTS, NODE_DEFAULT_WORDS, GEN_PLATFORMS_BY_KEY } from "../lib/constants";
import { generateNode as aiGenerateNode, describeError } from "../services/ai";
import { Skeleton } from "./OutputCard";
import host from "../hosts/browser";
import { saveGeneration } from "../services/brands";
import { useCopyFeedback } from "../hooks/useCopyFeedback";
import { reducedMotion, tokenMs } from "../lib/motion";
import BannedCheck from "./nodes/BannedCheck";
import Select from "./Select";
import { fieldPlaceholders } from "../lib/placeholders";

const uid =() => "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// Vertical gap between a node and the node stacked below it.
const NODE_GAP = 40;
// Gap under a node that still shows its "+" button (it hangs ~72px below the
// card), so a node added from the toolbar leaves the button visible.
const NODE_GAP_FREE = 100;
const NODE_W = 400;
// Columns sit NODE_W + 40px apart: x of each category's first node.
const COL_X = { email: 40, social: 480, website: 920, packaging: 1360, advertising: 1800 };
// Where a column's first node sits, and how far above it the column title goes.
const COL_LEFT = 40;
const COL_TOP = 100;
const COL_HEAD_OFFSET = 46;
const wordCount = (v) => ((v && v.body) || "").trim().split(/\s+/).filter(Boolean).length;
// Entrance cascade: how many nodes get their own stagger slot.
const MAX_STAGGER = 8;

// A link runs from the bottom-centre of its source node to the top-centre of
// its target. Key "a>b" = a's copy feeds b.
const linkKey = (src, tgt) => `${src}>${tgt}`;
const curve = (x1, y1, x2, y2) => {
  const a = Math.max(40, Math.abs(y2 - y1) / 2);
  return `M ${x1} ${y1} C ${x1} ${y1 + a}, ${x2} ${y2 - a}, ${x2} ${y2}`;
};
const SR_ONLY = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" };
// Options for the Platform / Component dropdowns.
const PLATFORM_OPTIONS = PLATFORMS.map((p) => ({ value: p, label: p }));
const COMPONENT_OPTIONS = Object.entries(WEBSITE_COMPONENTS).map(([value, c]) => ({ value, label: c.label }));
const isTyping = (el) => Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)));
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
);

// Textarea that grows with its content instead of scrolling inside the node.
function AutoTextarea({ value, ...props }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} {...props} />;
}

const baseNode = (o) => ({
  id: uid(), category: "email", label: "", brief: "", words: 60, requirements: "",
  platform: undefined, component: "hero", pointerCount: 3, connections: [], variants: [], activeIdx: 0, generating: false,
  x: o.x ?? 0, y: o.y ?? 0, z: o.z ?? 10,
  ...o,
});

function makeNode(category, existing, x = null, y = null) {
  const cat = NODE_CATS[category];
  const idx = existing.filter((n) => n.category === category).length + 1;
  return baseNode({
    category, label: `${cat.label} ${idx}`, words: NODE_DEFAULT_WORDS[category] || 60,
    platform: category === "social" ? "Instagram" : undefined,
    x: x ?? (Math.random() * 100 + 50),
    y: y ?? (Math.random() * 100 + 50)
  });
}

// Starter nodes start with an empty job requirement (the placeholder explains
// it), so the copy follows the brand's message until one is written.
function seedNodes() {
  const email = baseNode({ x: COL_X.email, y: 100, category: "email", label: "Launch email", words: 110 });
  const social = baseNode({ x: COL_X.social, y: 100, category: "social", label: "Instagram launch post", words: 40, platform: "Instagram" });
  const website = baseNode({ x: COL_X.website, y: 100, category: "website", label: "Homepage hero", words: 30, component: "hero" });
  const packaging = baseNode({ x: COL_X.packaging, y: 100, category: "packaging", label: "Box front line", words: NODE_DEFAULT_WORDS.packaging });
  const advertising = baseNode({ x: COL_X.advertising, y: 100, category: "advertising", label: "Launch ad", words: NODE_DEFAULT_WORDS.advertising });
  return [email, social, website, packaging, advertising];
}

/* ---------- icons ---------- */
const svg = (children) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const CAT_ICONS = {
  email: svg(<><rect x="3.5" y="5.5" width="17" height="13" rx="3.5" /><path d="m7 9.5 5 3.5 5-3.5" /></>),
  // A filled mark on its own 345-unit grid (not the line icons' 24), in the icon colour.
  social: (
    <svg viewBox="0 0 345 345" fill="currentColor" aria-hidden="true">
      <path d="M196.759 98.3321V147.498H147.569V98.3321H196.759Z" />
      <path d="M196.767 196.671V245.837H147.577V196.671H196.767Z" />
      <path d="M344.332 196.671V245.837H295.142V196.671H344.332Z" />
      <path d="M0 196.671V245.837H49.1899V196.671H0Z" />
      <path d="M196.759 8.01086e-05V49.1655H245.949V8.01086e-05H196.759Z" />
      <path d="M147.573 8.01086e-05V49.1655H98.3831V8.01086e-05H147.573Z" />
      <path d="M245.949 196.667L196.759 196.667V147.502L245.949 147.502V196.667Z" />
      <path d="M295.143 295.006L245.953 295.006V245.841L295.143 245.841V295.006Z" />
      <path d="M49.1895 295.006L98.3794 295.006V245.841L49.1895 245.841V295.006Z" />
      <path d="M245.949 98.3281L295.139 98.3281V49.1627L245.949 49.1627V98.3281Z" />
      <path d="M98.3832 98.3281L49.1934 98.3281V49.1627L98.3832 49.1627V98.3281Z" />
      <path d="M245.949 344.176L196.759 344.176V295.011L245.949 295.011V344.176Z" />
      <path d="M98.3831 344.176L147.573 344.176V295.011L98.3831 295.011V344.176Z" />
      <path d="M295.142 147.498L344.332 147.498V98.3321L295.142 98.3321V147.498Z" />
      <path d="M49.1899 147.498L0 147.498L0 98.3321L49.1899 98.3321V147.498Z" />
      <path d="M147.569 196.689L98.3794 196.689V147.524L147.569 147.524V196.689Z" />
    </svg>
  ),
  website: svg(<><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5S14.6 18.1 12 20.5M12 3.5C9.4 5.9 8.2 8.7 8.2 12s1.2 6.1 3.8 8.5" /></>),
  packaging: svg(<><path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z" /><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9" /></>),
  advertising: svg(<><path d="M4 10v4h3l6 4V6L7 10z" /><path d="M16.5 9a4 4 0 0 1 0 6" /></>),
  script: svg(<><rect x="3.5" y="5" width="17" height="14" rx="3" /><path d="M3.5 9.5h17M8 5v4.5M16 5v4.5" /></>),
};

const Chevron = () => svg(<path d="m6 9 6 6 6-6" />);
const CopyIcon = () => svg(<><rect x="8.5" y="8.5" width="11" height="11" rx="3" /><path d="M15.5 5.6c0-1.3-.9-2.1-2.1-2.1H6.1C4.8 3.5 4 4.4 4 5.6v7.3c0 1.2.8 2.1 2 2.1h.5" /></>);
const CheckIcon = () => svg(<path d="m4.5 12.5 5 5L19.5 7" />);
const TrashIcon = () => svg(<path d="M4 7h16M9 7V4.5h6V7m3 0-.8 12.5H6.8L6 7m4 4v5m4-5v5" />);

/* ---------- node pieces ---------- */
function NodeOutput({ node, banned, onVariant }) {
  if (node.generating) return <Skeleton />;
  if (!node.variants.length) return <p className="sn-out-empty">No output yet.</p>;
  const idx = node.activeIdx || 0;
  const v = node.variants[idx] || node.variants[0];

  const tabs = node.variants.length > 1 && (
    <div className="sn-vtabs">
      {node.variants.map((_, i) => (
        <button key={i} type="button" className={"sn-vtab" + (i === idx ? " on" : "")} aria-pressed={i === idx} onClick={() => onVariant(i)}>{i + 1}</button>
      ))}
    </div>
  );

  if (v.pointers) {
    return (
      <>
        <ul className="pointer-list">
          {v.pointers.map((p, i) => <li key={i}><b>{p.title}</b> — {p.detail}</li>)}
        </ul>
        <div className="sn-out-meta">{v.pointers.length} pointers</div>
        <BannedCheck copy={v} banned={banned} />
        {tabs}
      </>
    );
  }
  return (
    <>
      <p className="sn-out-headline">{v.headline}</p>
      <p className="sn-out-body">{v.body}</p>
      <div className="sn-out-meta">{wordCount(v)} / {node.words} words target</div>
      <BannedCheck copy={v} banned={banned} />
      {tabs}
    </>
  );
}

// linkEnd: "src" / "tgt" while a link touching this node is hovered or selected.
// drop: "ok" / "no" while a new link is dragged over this node.
function StudioNode({
  node, banned, expanded, onToggle, linkEnd, drop, onField, onGenerate, onDelete, onCopy, onVariant,
}) {
  const cat = NODE_CATS[node.category];
  const comp = node.component || "hero";
  const [leaving, setLeaving] = useState(false);
  const [copied, flashCopied] = useCopyFeedback();
  const bodyId = `${node.id}-body`;
  const canCopy = node.variants.length > 0 && !node.generating;
  const copy = async () => { if (await onCopy()) flashCopied(); };

  return (
    <article
      className={"node sn-node" + (expanded ? " is-open" : "") + (leaving ? " is-leaving" : "")}
      data-id={node.id}
      data-pl-link-end={linkEnd || undefined}
      data-pl-drop={drop || undefined}
      style={{ "--cat": cat.color }}
      onAnimationEnd={(e) => { if (leaving && e.animationName === "studio-node-out") onDelete(); }}
    >
      <header className="sn-head">
        <span className="sn-icon">{CAT_ICONS[node.category]}</span>
        <input className="sn-title" type="text" aria-label="Node name" value={node.label} onChange={(e) => onField("label", e.target.value)} />
        <div className="sn-head-actions">
          {/* Minimised, the Copy button beside Generate is hidden, so it moves up here. */}
          {!expanded && canCopy && (
            <button
              type="button"
              className={"sn-mini" + (copied ? " is-copied" : "")}
              title={copied ? "Copied" : "Copy output"}
              aria-label={copied ? "Output copied" : "Copy output"}
              onClick={copy}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          )}
          <button type="button" className="sn-mini danger" title="Delete node" aria-label="Delete node" onClick={() => setLeaving(true)}><TrashIcon /></button>
        </div>
        <button type="button" className="sn-toggle" aria-expanded={expanded} aria-controls={bodyId} aria-label={expanded ? "Collapse node" : "Expand node"} onClick={onToggle}>
          <Chevron />
        </button>
      </header>
      <div className="sn-collapse" id={bodyId} data-open={expanded} inert={expanded ? undefined : ""}>
        <div className="sn-collapse-inner">
          <div className="sn-body">
            <div className="sn-field"><label>Job Requirement</label>
              <AutoTextarea placeholder={fieldPlaceholders(node.category).job} value={node.brief} onChange={(e) => onField("brief", e.target.value)} />
            </div>
            {node.category === "social" && (
              <div className="sn-field"><label>Platform</label>
                <Select label="Platform" value={node.platform} options={PLATFORM_OPTIONS} onChange={(value) => onField("platform", value)} />
              </div>
            )}
            {node.category === "website" && (
              <>
                <div className="sn-field"><label>Component</label>
                  <Select label="Component" value={comp} options={COMPONENT_OPTIONS} onChange={(value) => onField("component", value)} />
                </div>
                {comp === "pointers" && (
                  <div className="sn-field"><label>How many pointers</label>
                    <input type="number" min="2" max="6" value={node.pointerCount || 3}
                      onChange={(e) => onField("pointerCount", Math.max(2, Math.min(6, parseInt(e.target.value, 10) || 3)))} />
                  </div>
                )}
              </>
            )}
            <div className="sn-field"><label>Target Words</label>
              <input type="number" min="4" max="600" value={node.words}
                onChange={(e) => onField("words", e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0)} />
            </div>
            <div className="sn-field"><label>Specific Requirements</label>
              <AutoTextarea placeholder={fieldPlaceholders(node.category).req} value={node.requirements} onChange={(e) => onField("requirements", e.target.value)} />
            </div>
            <div className="sn-actions">
              <button
                type="button"
                className={"sn-round" + (copied ? " is-copied" : "")}
                title={copied ? "Copied" : "Copy output"}
                aria-label={copied ? "Output copied" : "Copy output"}
                disabled={!canCopy}
                onClick={copy}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
              <button type="button" className="sn-gen" disabled={node.generating} onClick={onGenerate}>
                {node.generating ? "Generating..." : node.variants.length ? "Regenerate" : "Generate"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Output stays visible when the node is minimised. */}
      {(node.generating || node.variants.length > 0) && (
        <div className="sn-out" aria-live="polite"><NodeOutput node={node} banned={banned} onVariant={onVariant} /></div>
      )}
    </article>
  );
}

// Draggable Wrapper based on HTML functionality
// enterIdx = the node's slot in the studio's entrance cascade.
function DraggableNode({ node, dragging, enterIdx, onSize, onPointerDown, onClickCapture, onAddChild, children }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const updateSize = () => onSize(node.id, el.offsetWidth, el.offsetHeight);
    updateSize();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(updateSize);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [node.id, onSize]);

  return (
    <div
      ref={ref}
      className={`cn${dragging ? " dragging" : ""}`}
      data-id={node.id}
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
        zIndex: dragging ? 40 : node.z,
        "--pl-i": enterIdx,
      }}
      onPointerDown={onPointerDown}
      onClickCapture={onClickCapture}
    >
      {children}

      {/* Floating Plus Button at the bottom of the node - hides if node has connections */}
      {node.connections.length === 0 && (
        <button
          type="button"
          className="sn-add sn-add-child"
          onClick={(e) => { e.stopPropagation(); onAddChild(); }}
          title="Add connected node"
          aria-label="Add connected node"
        >
          <svg viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M11 3.5v15M3.5 11h15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

// Whether Generate writes node n for the composer's picked platforms (none
// picked = every node). A social node only counts for its own platform.
const inPlatforms = (n, platforms) => {
  if (!platforms?.length) return true;
  const picked = platforms.map((k) => GEN_PLATFORMS_BY_KEY[k]).filter(Boolean);
  return picked.some((p) => p.nodes.includes(n.category) && (n.category !== "social" || p.label === n.platform));
};

const NodeStudio = forwardRef(function NodeStudio({ active, ctx, variantCount, tier, platforms, aiAvailable, setStatus, onGenerated, refreshUsage, brandId, ensureAuth, ensureBrand }, ref) {
  const [nodes, setNodes] = useState(seedNodes);
  const [sizes, setSizes] = useState({});
  const [draggingId, setDraggingId] = useState(null);

  // Links: hover a node to show its ports, drag a port onto another node to
  // link; hover / click a line for its Disconnect chip.
  const [hoverKey, setHoverKey] = useState(null);       // line under the pointer / focus / tag
  const [selectedKey, setSelectedKey] = useState(null); // line the person clicked
  const [hotId, setHotId] = useState(null);             // node whose ports show
  const [linkDrag, setLinkDrag] = useState(null);       // { id, side, pointer, hit } while dragging a new link
  const [flashKey, setFlashKey] = useState(null);
  const [said, setSaid] = useState("");                 // screen-reader announcement
  const canvasRef = useRef(null);
  const uiRef = useRef(null);
  const chipRef = useRef(null);
  const chipPos = useRef({ x: 0, y: 0 });
  const hideTimer = useRef(0);
  const hotTimer = useRef(0);
  const cancelLinkDrag = useRef(null);

  // Entering the studio: nodes cascade in, then the links draw themselves.
  const [entering, setEntering] = useState(false);
  const [enterOrder, setEnterOrder] = useState({});     // node id -> stagger slot
  const [drawing, setDrawing] = useState({});           // line key -> draw-in delay (ms)

  const nodesRef = useRef(nodes);
  const sizesRef = useRef(sizes);
  const ctxRef = useRef(ctx);
  const lastNodeRef = useRef(null);
  const zCounter = useRef(10);
  const dragGuard = useRef(false);
  const enterRef = useRef(active);

  ctxRef.current = ctx;
  const platformsRef = useRef(platforms);
  platformsRef.current = platforms;

  const [expanded, setExpanded] = useState(() => new Set(nodesRef.current.slice(0, 1).map((n) => n.id)));

  const setOpen = useCallback((id, open) => setExpanded((prev) => {
    if (prev.has(id) === open) return prev;
    const next = new Set(prev);
    if (open) next.add(id); else next.delete(id);
    return next;
  }), []);

  const commit = useCallback((fn) => {
    const next = fn(nodesRef.current);
    nodesRef.current = next;
    setNodes(next);
  }, []);

  const patch = useCallback((id, changes) => commit((l) => l.map((n) => (n.id === id ? { ...n, ...changes } : n))), [commit]);

  // Records a node's measured size. When its height changes (collapse, expand,
  // content growing), every node stacked below it in the same column moves by
  // the same amount, so the gaps between them stay as they were.
  const onSize = useCallback((id, w, h) => {
    const prev = sizesRef.current[id];
    if (prev && prev.w === w && prev.h === h) return;
    sizesRef.current = { ...sizesRef.current, [id]: { w, h } };
    setSizes(sizesRef.current);

    const delta = prev ? h - prev.h : 0;
    const self = nodesRef.current.find((n) => n.id === id);
    if (!delta || !self) return;
    const oldBottom = self.y + prev.h;
    const left = self.x;
    const right = self.x + (prev.w || w);
    const isBelow = (n) => {
      const nw = sizesRef.current[n.id]?.w || NODE_W;
      return n.id !== id && n.y >= oldBottom - 1 && n.x < right && n.x + nw > left;
    };
    if (!nodesRef.current.some(isBelow)) return;
    commit((list) => list.map((n) => (isBelow(n) ? { ...n, y: n.y + delta } : n)));
  }, [commit]);

  /* ----- curved bezier lines: derived from node positions and sizes ----- */
  const boxOf = (n, sz = sizes) => ({ x: n.x, y: n.y, ...(sz[n.id] || { w: NODE_W, h: 46 }) });
  const lines = [];
  nodes.forEach((n) => {
    n.connections.forEach((tid) => {
      const b = nodes.find((x) => x.id === tid);
      if (!b) return;
      const s1 = boxOf(n);
      const s2 = boxOf(b);
      const x1 = n.x + s1.w / 2;
      const y1 = n.y + s1.h; // Bottom of parent
      const x2 = b.x + s2.w / 2;
      const y2 = b.y; // Top of child
      lines.push({ key: linkKey(n.id, tid), src: n.id, tgt: tid, x1, y1, x2, y2, d: curve(x1, y1, x2, y2) });
    });
  });
  const lineKeys = lines.map((l) => l.key).join("|");

  // A line drawn while working in the studio draws itself in.
  const seenKeys = useRef(null);
  useLayoutEffect(() => {
    const keys = lineKeys ? lineKeys.split("|") : [];
    const seen = seenKeys.current;
    seenKeys.current = new Set(keys);
    if (!seen || !active || reducedMotion()) return;
    const fresh = keys.filter((k) => !seen.has(k));
    if (fresh.length) setDrawing((d) => ({ ...d, ...Object.fromEntries(fresh.map((k) => [k, 0])) }));
  }, [lineKeys, active]);
  const doneDrawing = (key) => setDrawing(({ [key]: _, ...rest }) => rest);

  useEffect(() => {
    const wasActive = enterRef.current;
    enterRef.current = active;
    if (!active || wasActive || reducedMotion()) {
      setEntering(false);
      return undefined;
    }
    const stagger = tokenMs("--pl-stagger", 45);
    const order = {};
    [...nodesRef.current]
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .forEach((n, i) => { order[n.id] = Math.min(i, MAX_STAGGER); });
    setEnterOrder(order);
    setEntering(false);
    // Re-adding the attribute next frame restarts the cascade.
    const raf = requestAnimationFrame(() => setEntering(true));
    const linkDelay = 80 + tokenMs("--pl-d-3", 320);
    setDrawing(Object.fromEntries(seenKeys.current ? [...seenKeys.current].map((k) => [k, linkDelay]) : []));
    const count = Math.min(nodesRef.current.length, MAX_STAGGER);
    const timer = setTimeout(() => setEntering(false), 80 + tokenMs("--pl-d-4", 480) + count * stagger + 50);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [active]);


  /* ----- drag interaction handler ----- */
  const handlePointerDown = (e, node) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // A second finger is the start of a pinch, which the canvas handles.
    if (!e.isPrimary) return;
    if (e.target.closest("input, textarea, select, button, .bp-dd, .sn-out, .sn-vtabs, .sn-head-actions")) return;
    e.stopPropagation();

    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    const originX = node.x;
    const originY = node.y;
    let moved = false;

    // Detect if canvas world is scaled by CanvasViewport
    const canvasWorld = document.querySelector('.canvas-world');
    const scale = canvasWorld ? (canvasWorld.getBoundingClientRect().width / canvasWorld.offsetWidth) : 1;

    const onMove = (moveEvt) => {
      if (moveEvt.pointerId !== pointerId) return;
      const dx = (moveEvt.clientX - startX) / (scale || 1);
      const dy = (moveEvt.clientY - startY) / (scale || 1);

      if (!moved) {
        if (Math.hypot(dx, dy) < 4) return;
        moved = true;
        setDraggingId(node.id);
        zCounter.current += 1;
        patch(node.id, { z: zCounter.current });
      }

      // Nodes can go anywhere on the canvas, including left of / above where they start.
      patch(node.id, { x: originX + dx, y: originY + dy });
    };

    const onUp = (upEvt) => {
      // Ends on this finger lifting, or on a different finger landing (a pinch).
      const ends = upEvt.type === "pointerdown" ? upEvt.pointerId !== pointerId : upEvt.pointerId === pointerId;
      if (!ends) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointerdown", onUp);
      if (moved) {
        dragGuard.current = true;
        setTimeout(() => { dragGuard.current = false; }, 60);
        setDraggingId(null);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    // A second finger landing anywhere turns this gesture into a pinch: stop dragging.
    window.addEventListener("pointerdown", onUp);
  };

  const handleClickCapture = (e) => {
    if (dragGuard.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  /* ----- node actions ----- */
  // Top-bar "Add Node" inserts into an empty space
  const addNodes = (category, count) => {
    // Nodes are written for a brand, so one has to be picked (or started) first.
    if (ensureBrand && !ensureBrand()) return;
    const n = Math.max(1, Math.min(8, parseInt(count, 10) || 1));
    let added = null;

    commit((list) => {
      const next = [...list];
      const { x, y } = columnEnd(next, category);
      for (let i = 0; i < n; i++) {
        next.push(makeNode(category, next, x, y + (i * 340)));
      }
      added = next[next.length - 1].id;
      return next;
    });

    if (added) setOpen(added, true);
  };

  // Where the next node of a column goes: below its last node, or at the top.
  const columnEnd = (list, category) => {
    const catNodes = list.filter((x) => x.category === category);
    if (!catNodes.length) return { x: COL_X[category] ?? COL_X.email, y: 100 };
    const last = catNodes[catNodes.length - 1];
    const lastSize = sizesRef.current[last.id] || { h: 300 };
    return { x: last.x, y: last.y + lastSize.h + NODE_GAP_FREE };
  };

  // Puts copy from history back on the canvas: into the node it came from
  // (same column and name) if it's still here, else into a new node.
  // input = the entry's input_context ({ label, brief }). Returns false if
  // the entry can't be restored.
  const restoreNode = (category, items, input = {}) => {
    const cat = NODE_CATS[category];
    if (!cat || cat.comingSoon) return false;
    const variants = (items || []).filter((v) => v && (Array.isArray(v.pointers) || v.headline || v.body));
    if (!variants.length) return false;
    const label = String(input?.label || "").trim();
    const brief = String(input?.brief || "");
    const pointers = variants[0].pointers;
    const existing = label && nodesRef.current.find((n) => n.category === category && n.label === label);
    let target = existing?.id;
    if (existing) {
      patch(existing.id, { variants, activeIdx: 0, ...(brief && !existing.brief.trim() ? { brief } : {}) });
    } else {
      commit((list) => {
        const { x, y } = columnEnd(list, category);
        const node = {
          ...makeNode(category, list, x, y),
          ...(label ? { label } : {}),
          brief,
          variants,
          ...(pointers ? { component: "pointers", pointerCount: Math.max(2, Math.min(6, pointers.length)) } : {}),
        };
        target = node.id;
        return [...list, node];
      });
    }
    setOpen(target, true);
    lastNodeRef.current = target;
    return true;
  };

  // Adds a node physically connected below the parent
  const handleAddChild = (parentId, category) => {
    let added = null;
    commit((list) => {
      const parentIndex = list.findIndex((n) => n.id === parentId);
      if (parentIndex === -1) return list;

      const parent = list[parentIndex];
      const pSize = sizesRef.current[parentId] || { h: 300 };
      const next = [...list];

      // Spawn directly below. The parent grows a row for its link tag right
      // after this; onSize then pushes this node down to keep the gap.
      const newNode = makeNode(category, next, parent.x, parent.y + pSize.h + NODE_GAP);
      next.push(newNode);

      // Auto-connect line
      next[parentIndex] = {
        ...parent,
        connections: [...parent.connections, newNode.id]
      };

      added = newNode.id;
      return next;
    });
    if (added) setOpen(added, true);
  };

  const deleteNode = (id) => {
    commit((l) => l.filter((n) => n.id !== id).map((n) => ({ ...n, connections: n.connections.filter((c) => c !== id) })));
    setOpen(id, false);
  };

  /* ----- links ----- */
  const say = (msg) => {
    setSaid("");
    setTimeout(() => setSaid(msg), 30);
  };

  const flash = (key) => {
    setFlashKey(null);
    requestAnimationFrame(() => setFlashKey(key));
    setTimeout(() => setFlashKey((k) => (k === key ? null : k)), 1000);
  };

  // Linking A -> B hands A's job requirement to B and writes B from A's copy,
  // adapted to B's channel. One link per direction: an existing one just lights up.
  const linkNodes = (fromId, toId) => {
    const source = nodesRef.current.find((n) => n.id === fromId);
    const target = nodesRef.current.find((n) => n.id === toId);
    if (!source || !target || fromId === toId) return;
    if (source.connections.includes(toId)) {
      setSelectedKey(linkKey(fromId, toId));
      flash(linkKey(fromId, toId));
      return;
    }
    commit((l) => l.map((n) => {
      if (n.id === fromId) return { ...n, connections: [...n.connections, toId] };
      if (n.id === toId && source.brief.trim()) return { ...n, brief: source.brief };
      return n;
    }));
    say(`Linked ${source.label || "node"} to ${target.label || "node"}`);
    if (!target.generating) generateNode(toId, { sourceId: fromId });
  };

  // Unlinking only removes the line.
  const unlinkNodes = (fromId, toId) => {
    if (!nodesRef.current.find((n) => n.id === fromId)?.connections.includes(toId)) return;
    commit((l) => l.map((n) => (n.id === fromId ? { ...n, connections: n.connections.filter((c) => c !== toId) } : n)));
    setSelectedKey(null);
    setHoverKey(null);
    say(`Disconnected ${labelOf(fromId) || "node"} from ${labelOf(toId) || "node"}`);
  };
  const unlinkKey = (key) => {
    const [src, tgt] = key.split(">");
    unlinkNodes(src, tgt);
  };

  // Hover clears after a beat, so the pointer can travel from a line to its chip.
  const scheduleHoverClear = () => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (chipRef.current?.matches(":hover")) return;
      setHoverKey(null);
    }, 220);
  };
  const hoverLine = (key) => {
    clearTimeout(hideTimer.current);
    setHoverKey(key);
  };

  // Ports and the chip keep a constant on-screen size at any canvas zoom.
  const syncZoom = () => {
    const canvas = canvasRef.current;
    if (!canvas || !uiRef.current) return;
    const zoom = canvas.getBoundingClientRect().width / canvas.offsetWidth || 1;
    uiRef.current.style.setProperty("--pl-inv", String(Math.min(2.2, Math.max(0.7, 1 / zoom))));
  };

  const nodeIdAt = (target) => (target instanceof Element ? target.closest(".cn, .pl-port")?.dataset.id ?? null : null);
  const onCanvasOver = (e) => {
    const id = nodeIdAt(e.target);
    if (!id) return;
    clearTimeout(hotTimer.current);
    syncZoom();
    setHotId(id);
  };
  const onCanvasOut = () => {
    clearTimeout(hotTimer.current);
    hotTimer.current = setTimeout(() => {
      if (cancelLinkDrag.current) return;
      if (canvasRef.current?.querySelector(".cn:hover, .pl-port:hover")) return;
      setHotId(null);
    }, 180);
  };
  // A click on empty canvas clears the selected line.
  const onCanvasClick = (e) => {
    if (e.target instanceof Element && e.target.closest(".pl-chip, .pl-link-hit")) return;
    setSelectedKey(null);
  };

  // Escape cancels a link drag or clears the selection; Delete removes the
  // selected line. A press anywhere else drops the selection.
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (cancelLinkDrag.current) { cancelLinkDrag.current(); return; }
        setSelectedKey(null);
        setHoverKey(null);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedKey && !isTyping(e.target)) {
        e.preventDefault();
        unlinkKey(selectedKey);
      }
    };
    const onDown = (e) => {
      if (!selectedKey) return;
      if (e.target instanceof Element && e.target.closest(".pl-chip, .pl-link-hit")) return;
      setSelectedKey(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
  });

  // Pointer position in canvas space (the canvas is scaled by the viewport).
  const toCanvas = (e) => {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    const s = r.width / canvas.offsetWidth || 1;
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  };

  // What dropping the dragged port here would do.
  const dropAt = (e, id, side) => {
    for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
      const otherId = el.closest?.(".cn")?.dataset.id;
      const other = otherId && nodesRef.current.find((n) => n.id === otherId);
      if (!other) continue;
      const src = side === "out" ? id : otherId;
      const tgt = side === "out" ? otherId : id;
      if (otherId === id) return { id: otherId, state: "no", msg: "Can't link a node to itself" };
      if (nodesRef.current.find((n) => n.id === src)?.connections.includes(tgt)) {
        return { id: otherId, state: "no", msg: "Already linked", src, tgt };
      }
      return { id: otherId, state: "ok", msg: `Link ${side === "out" ? "to" : "from"} ${other.label || "Untitled node"}`, src, tgt };
    }
    return null;
  };

  // Drag from a node's bottom port (sends its copy on) or top port (receives).
  const startLinkDrag = (e, id, side) => {
    if ((e.pointerType === "mouse" && e.button !== 0) || !e.isPrimary) return;
    e.preventDefault();
    e.stopPropagation();
    const pid = e.pointerId;
    let last = null;
    setHoverKey(null);
    setSelectedKey(null);
    syncZoom();

    const move = (ev) => {
      if (ev.pointerId !== pid) return;
      last = { id, side, pointer: toCanvas(ev), hit: dropAt(ev, id, side) };
      setLinkDrag(last);
    };
    const end = (ev) => {
      if (ev && ev.pointerId !== pid) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", end);
      cancelLinkDrag.current = null;
      setLinkDrag(null);
      return last;
    };
    const up = (ev) => {
      if (ev.pointerId !== pid) return;
      const hit = dropAt(ev, id, side) || last?.hit;
      end(ev);
      if (!hit) return;
      if (hit.state === "ok") linkNodes(hit.src, hit.tgt);
      else if (hit.msg === "Already linked") {
        setSelectedKey(linkKey(hit.src, hit.tgt));
        flash(linkKey(hit.src, hit.tgt));
      }
    };
    cancelLinkDrag.current = () => end(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", end);
    move(e);
  };

  const announce = (n, idx) => {
    const v = n.variants[idx];
    if (v) onGenerated({ type: "node", label: n.label, variant: v });
  };

  const canGenerate = () => {
    if (!aiAvailable) { setStatus("AI generation isn't available here.", "err"); return false; }
    if (ensureAuth && !ensureAuth()) return false;
    // Copy is written for the brand: its name and message to adapt come first.
    return !ensureBrand || ensureBrand({ generate: true });
  };
  // ...then a job: the node's own requirement, or else the brand message
  // (the prompt falls back to it).
  const hasJob = (n) => Boolean(n.brief.trim() || ctxRef.current.brand.message.trim());

  // Writes one node's copy. Throws the AI error so callers can report it.
  const runNode = async (id, { sourceId } = {}) => {
    const n = nodesRef.current.find((x) => x.id === id);
    if (!n) return false;
    patch(id, { generating: true });
    // Open it while it writes so the skeleton (or a failure) is visible.
    setOpen(id, true);

    try {
      const linkedNodes = n.connections
        .map((cid) => nodesRef.current.find((x) => x.id === cid))
        .filter((t) => t && t.variants.length)
        .map((t) => ({ label: t.label, variant: t.variants[t.activeIdx || 0] || t.variants[0] }));

      const src = sourceId && nodesRef.current.find((x) => x.id === sourceId);
      const source = src
        ? { label: src.label, category: src.category, variant: src.variants[src.activeIdx || 0] || src.variants[0] || null }
        : null;

      const variants = await aiGenerateNode({
        ctx: ctxRef.current, node: n, variantCount, linkedNodes, source, tier, platforms: platformsRef.current,
      });
      patch(id, { variants, activeIdx: 0, generating: false });
      lastNodeRef.current = id;
      onGenerated({ type: "node", label: n.label, variant: variants[0] });
      await saveGeneration({
        brandId,
        medium: `node-${n.category}`,
        inputContext: { brief: n.brief, label: n.label },
        output: variants
      });
      return true;
    } catch (err) {
      patch(id, { generating: false });
      throw err;
    }
  };

  const generateNode = async (id, opts) => {
    const n = nodesRef.current.find((x) => x.id === id);
    if (!n || !canGenerate()) return;
    if (!hasJob(n)) return setStatus("Add a job requirement (or a brand message) first.", "err");
    try {
      await runNode(id, opts);
      if (refreshUsage) refreshUsage();
    } catch (err) {
      setStatus(describeError(err), "err");
    }
  };

  // Writes every node. Unlinked nodes go out together; a node linked from
  // another waits for it, then adapts its copy (as linking does). Stops at the
  // daily limit and reports how many nodes made it. Picked platforms limit it
  // to the nodes they write for.
  const generateAllNodes = async () => {
    if (!canGenerate()) return;
    const idle = nodesRef.current.filter((n) => !n.generating);
    const picked = idle.filter((n) => inPlatforms(n, platformsRef.current));
    if (idle.length && !picked.length) {
      return setStatus("None of the picked platforms has a node on the canvas — add one, or change the platforms.", "err");
    }
    const targets = picked.filter(hasJob);
    const skipped = picked.length - targets.length;
    if (!targets.length) return setStatus("Add a job requirement (or a brand message) first.", "err");

    const total = targets.length;
    let pending = targets.map((n) => n.id);
    let done = 0;
    let firstErr = null;
    while (pending.length && firstErr?.code !== "limit_reached") {
      const waiting = new Set(pending);
      const parentOf = (id) => nodesRef.current.find((p) => p.connections.includes(id));
      const ready = pending.filter((id) => !nodesRef.current.some((p) => waiting.has(p.id) && p.connections.includes(id)));
      // A link cycle leaves nothing ready: run the rest together.
      const wave = ready.length ? ready : pending;
      pending = pending.filter((id) => !wave.includes(id));
      const results = await Promise.allSettled(wave.map((id) => {
        const parent = parentOf(id);
        return runNode(id, parent?.variants.length ? { sourceId: parent.id } : {});
      }));
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value) done += 1;
        else if (r.status === "rejected" && !firstErr) firstErr = r.reason;
      });
    }
    if (refreshUsage) refreshUsage();

    // Only problems are reported: an error, or nodes left out for lack of a job.
    const skipNote = skipped ? ` ${skipped} skipped — no job requirement or brand message.` : "";
    if (firstErr) setStatus(`Generated ${done} of ${total} nodes. ${describeError(firstErr)}${skipNote}`, "err");
    else if (skipped) setStatus(`Generated ${done} node${done === 1 ? "" : "s"}.${skipNote}`, "warn");
  };

  useImperativeHandle(ref, () => ({
    addNode: (category) => addNodes(category, 1),
    generateAllNodes,
    restore: restoreNode,
  }));

  const generateColumn = async (category) => {
    for (const n of nodesRef.current.filter((x) => x.category === category)) await generateNode(n.id);
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  const copyNode = (n) => {
    if (!n.variants.length) return Promise.resolve(false);
    const v = n.variants[n.activeIdx || 0];
    const text = v.pointers ? v.pointers.map((p) => `${p.title} — ${p.detail}`).join("\n") : `${v.headline}\n\n${v.body}`;
    return host.copyText(text)
      .then(() => { setStatus("Copied — paste it into your design tool.", "ok"); return true; })
      .catch(() => { setStatus("Couldn't copy automatically — select the text and copy manually.", "err"); return false; });
  };

  const labelOf = (id) => (nodesRef.current.find((n) => n.id === id) || {}).label || "";

  // Identify the top-most node for each category to attach the column header
  const topNodes = {};
  COL_ORDER.forEach((key) => {
    const list = nodes.filter((n) => n.category === key);
    if (list.length > 0) {
      const top = list.reduce((prev, curr) => (prev.y < curr.y ? prev : curr));
      topNodes[top.id] = { total: list.length, category: key };
    }
  });

  /* ----- link overlay state ----- */
  const activeKey = hoverKey || selectedKey;
  const activeLine = activeKey ? lines.find((l) => l.key === activeKey) : null;
  const chipVisible = Boolean(activeLine) && !linkDrag;
  // The chip sits on the line's midpoint (the curve is symmetric, so that's
  // halfway between its ends) and stays put while it fades out.
  if (chipVisible) chipPos.current = { x: (activeLine.x1 + activeLine.x2) / 2, y: (activeLine.y1 + activeLine.y2) / 2 };
  const portsFor = linkDrag ? linkDrag.id : hotId;
  const linkEndOf = (id) => (activeLine ? (activeLine.src === id ? "src" : activeLine.tgt === id ? "tgt" : null) : null);
  const dotLag = Object.keys(drawing).length ? tokenMs("--pl-d-3", 320) : 0;

  // The rubber band ends on the target's matching edge when over one, else at the pointer.
  let rubber = null;
  const dragFrom = linkDrag && nodes.find((n) => n.id === linkDrag.id);
  if (dragFrom) {
    const out = linkDrag.side === "out";
    const fb = boxOf(dragFrom);
    const anchor = { x: fb.x + fb.w / 2, y: out ? fb.y + fb.h : fb.y };
    const over = linkDrag.hit?.state === "ok" && nodes.find((n) => n.id === linkDrag.hit.id);
    const hb = over && boxOf(over);
    const end = hb ? { x: hb.x + hb.w / 2, y: out ? hb.y : hb.y + hb.h } : linkDrag.pointer;
    rubber = {
      d: out ? curve(anchor.x, anchor.y, end.x, end.y) : curve(end.x, end.y, anchor.x, anchor.y),
      end,
      state: linkDrag.hit?.state || "",
    };
  }

  return (
    <div className={"studio" + (linkDrag ? " pl-canvas-linking" : "")} data-pl-studio-enter={entering || undefined}>
      <div
        className="nodecanvas"
        ref={canvasRef}
        style={{ position: 'relative', width: '3200px', minHeight: '2400px' }}
        onPointerOver={onCanvasOver}
        onPointerOut={onCanvasOut}
        onClick={onCanvasClick}
      >
        <svg className="nodesvg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 0 }} aria-hidden="true">
          {lines.map((l) => {
            // A line drawing itself in: the path traces, then its end dots pop.
            const delay = drawing[l.key];
            const draws = delay !== undefined;
            const drawAttrs = (ms) => (draws ? { "data-pl-draw": "", style: { "--pl-draw-delay": `${ms}ms` } } : {});
            return (
              <g key={l.key}>
                <path d={l.d} fill="none" stroke="#1A1F36" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round"
                  pathLength={draws ? 1 : undefined} {...drawAttrs(delay)} />
                <circle cx={l.x1} cy={l.y1} r="4" fill="#1A1F36" {...drawAttrs(delay + dotLag)} />
                <circle cx={l.x2} cy={l.y2} r="4" fill="#1A1F36" {...drawAttrs(delay + dotLag)}
                  onAnimationEnd={draws ? () => doneDrawing(l.key) : undefined} />
              </g>
            );
          })}
        </svg>

        {/* Under the nodes: a wide invisible hit path per line, plus its highlight. */}
        <svg className="pl-links" role="group" aria-label="Node connections">
          {lines.map((l) => {
            const cls = [
              hoverKey === l.key && "is-hover",
              selectedKey === l.key && "is-selected",
              hotId && (l.src === hotId || l.tgt === hotId) && "is-related",
              flashKey === l.key && "is-flash",
            ].filter(Boolean).join(" ");
            return (
              <g key={l.key} className={cls || undefined}>
                <path className="pl-link-hl" d={l.d} />
                <path
                  className="pl-link-hit"
                  d={l.d}
                  tabIndex={0}
                  role="button"
                  aria-label={`Link: ${labelOf(l.src) || "node"} to ${labelOf(l.tgt) || "node"}. Press Enter to select it, then Delete to disconnect.`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerEnter={() => hoverLine(l.key)}
                  onPointerLeave={scheduleHoverClear}
                  onFocus={() => hoverLine(l.key)}
                  onBlur={scheduleHoverClear}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedKey((k) => (k === l.key ? null : l.key));
                    hoverLine(l.key);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    const next = selectedKey === l.key ? null : l.key;
                    setSelectedKey(next);
                    if (next) requestAnimationFrame(() => chipRef.current?.focus({ preventScroll: true }));
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Over the nodes: link ports, the Disconnect chip, the drag rubber band and its tooltip. */}
        <div className="pl-link-ui" ref={uiRef} data-dragging={linkDrag ? "" : undefined}>
          <svg className="pl-rubber" aria-hidden="true" data-state={rubber?.state} style={rubber ? undefined : { display: "none" }}>
            {rubber && (
              <>
                <path d={rubber.d} />
                <circle r="5" cx={rubber.end.x} cy={rubber.end.y} />
              </>
            )}
          </svg>
          {nodes.map((n) => {
            const b = boxOf(n);
            const vis = n.id === portsFor;
            const name = n.label || "Untitled node";
            return (
              <Fragment key={n.id}>
                <button
                  type="button"
                  className="pl-port"
                  data-id={n.id}
                  data-vis={vis ? "" : undefined}
                  tabIndex={vis ? 0 : -1}
                  style={{ left: b.x + b.w / 2, top: b.y + b.h }}
                  title="Drag to another node to link"
                  aria-label={`Link from ${name}: drag to another node`}
                  onPointerDown={(e) => startLinkDrag(e, n.id, "out")}
                />
                <button
                  type="button"
                  className="pl-port"
                  data-id={n.id}
                  data-vis={vis ? "" : undefined}
                  tabIndex={vis ? 0 : -1}
                  style={{ left: b.x + b.w / 2, top: b.y }}
                  title="Drag from another node to link here"
                  aria-label={`Link into ${name}: drag from another node`}
                  onPointerDown={(e) => startLinkDrag(e, n.id, "in")}
                />
              </Fragment>
            );
          })}
          <button
            ref={chipRef}
            type="button"
            className="pl-chip"
            data-vis={chipVisible ? "" : undefined}
            tabIndex={chipVisible ? 0 : -1}
            style={{ left: chipPos.current.x, top: chipPos.current.y }}
            aria-label={activeLine ? `Disconnect ${labelOf(activeLine.src) || "node"} from ${labelOf(activeLine.tgt) || "node"}` : "Disconnect"}
            onPointerEnter={() => clearTimeout(hideTimer.current)}
            onPointerLeave={scheduleHoverClear}
            onClick={() => { if (activeLine) unlinkKey(activeLine.key); }}
          >
            <span className="pl-chip-x"><XIcon /></span>
            <span>Disconnect</span>
          </button>
          <div
            className="pl-tip"
            aria-hidden="true"
            data-vis={linkDrag?.hit ? "" : undefined}
            data-state={linkDrag?.hit?.state}
            style={linkDrag ? { left: linkDrag.pointer.x, top: linkDrag.pointer.y } : undefined}
          >
            {linkDrag?.hit?.msg}
          </div>
        </div>
        <div role="status" aria-live="polite" style={SR_ONLY}>{said}</div>

        {/* Visual column headers for empty states only (nodes are absolutely positioned).
            Lined up with where a column's title sits when it has nodes. */}
        <div className="nodecols" style={{ pointerEvents: 'none', position: 'absolute', top: COL_TOP - COL_HEAD_OFFSET, left: COL_LEFT, display: 'flex', gap: '40px' }}>
          {COL_ORDER.map((key) => {
            const cat = NODE_CATS[key];
            const list = nodes.filter((n) => n.category === key);

            return (
              <section className="sn-col" key={key} style={{ pointerEvents: 'auto', position: 'relative', flex: `0 0 ${NODE_W}px`, width: NODE_W }}>
                {list.length === 0 && !cat.comingSoon && (
                  <>
                    <header className="sn-col-head" style={{ "--cat": cat.color, position: 'absolute', top: 0, left: 0, right: 0 }}>
                      <span className="sn-col-dot" aria-hidden="true" />
                      <h2>{cat.label}</h2>
                      <span className="sn-count" aria-label="0 nodes">0</span>
                    </header>
                    <button type="button" className="sn-add sn-add-empty" aria-label={`Add ${cat.label} node`} onClick={() => addNodes(key, 1)}>
                      {svg(<path d="M12 5v14M5 12h14" />)}
                    </button>
                  </>
                )}
                {/* {cat.comingSoon && (
                  <div className="sn-node sn-soon" style={{ marginTop: '80px' }}>
                    <header className="sn-head">
                      <span className="sn-icon">{CAT_ICONS[key]}</span>
                      <p>Script and storyboard generation is coming soon.</p>
                    </header>
                  </div>
                )} */}
              </section>
            );
          })}
        </div>

        {/* Draggable Free Nodes */}
        {nodes.map(n => {
          const topInfo = topNodes[n.id];
          return (
            <DraggableNode
              key={n.id}
              node={n}
              dragging={draggingId === n.id}
              enterIdx={enterOrder[n.id] ?? 0}
              onSize={onSize}
              onPointerDown={(e) => handlePointerDown(e, n)}
              onClickCapture={handleClickCapture}
              onAddChild={() => handleAddChild(n.id, n.category)}
            >
              {topInfo && (
                <header className="sn-col-head" style={{ "--cat": NODE_CATS[n.category].color, position: 'absolute', top: -COL_HEAD_OFFSET, left: 0, right: 0, width: NODE_W, cursor: 'grab' }}>
                  <span className="sn-col-dot" aria-hidden="true" />
                  <h2>{NODE_CATS[n.category].label}</h2>

                  {!NODE_CATS[n.category].comingSoon && <span className="sn-count" aria-label={`${topInfo.total} nodes`}>{topInfo.total}</span>}
                </header>
              )}
              <StudioNode
                node={n}
                banned={ctx.brand.banned}
                expanded={expanded.has(n.id)}
                onToggle={() => setOpen(n.id, !expanded.has(n.id))}
                linkEnd={linkEndOf(n.id)}
                drop={linkDrag?.hit?.id === n.id ? linkDrag.hit.state : null}
                onField={(f, v) => patch(n.id, { [f]: v })}
                onGenerate={() => generateNode(n.id)}
                onDelete={() => deleteNode(n.id)}
                onCopy={() => copyNode(n)}
                onVariant={(i) => {
                  patch(n.id, { activeIdx: i });
                  if (lastNodeRef.current === n.id) announce(n, i);
                }}
              />
            </DraggableNode>
          );
        })}
      </div>
    </div>
  );
});

export default NodeStudio;
