

import { Fragment, useState, useRef, useEffect, useLayoutEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { NODE_CATS, COL_ORDER, PLATFORMS, WEBSITE_COMPONENTS, NODE_DEFAULT_WORDS } from "../lib/constants";
import { generateNode as aiGenerateNode, describeError } from "../services/ai";
import { Skeleton } from "./OutputCard";
import host from "../hosts/browser";
import { saveGeneration } from "../services/brands";

const uid = () => "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const wordCount = (v) => ((v && v.body) || "").trim().split(/\s+/).filter(Boolean).length;
const MIN_NODE_Y = 56;

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
  id: uid(), category: "email", label: "", brief: "", words: 60, requirements: "", filename: "",
  platform: undefined, component: "hero", pointerCount: 3, connections: [], variants: [], activeIdx: 0, generating: false,
  x: o.x ?? 0, y: o.y ?? 0, z: o.z ?? 10,
  ...o,
});

function makeNode(category, existing, x = null, y = null) {
  const cat = NODE_CATS[category];
  const idx = existing.filter((n) => n.category === category).length + 1;
  return baseNode({
    category, label: `${cat.label} ${idx}`, words: NODE_DEFAULT_WORDS[category] || 60,
    filename: `${category}-${idx}`, platform: category === "social" ? "Instagram" : undefined,
    x: x ?? (Math.random() * 100 + 50),
    y: y ?? (Math.random() * 100 + 50)
  });
}

function seedNodes() {
  const email = baseNode({ x: 40, y: 100, category: "email", label: "Launch email", brief: "Announce the new fragrance to warm subscribers who've browsed before but not bought.", words: 110, filename: "launch-email-v1" });
  const social = baseNode({ x: 420, y: 100, category: "social", label: "Instagram launch post", brief: "Tease the fragrance's mood for a cold, scrolling audience.", words: 40, filename: "ig-launch-post", platform: "Instagram" });
  const website = baseNode({ x: 800, y: 100, category: "website", label: "Homepage hero", brief: "Set the emotional frame for a first-time visitor landing on the homepage.", words: 30, filename: "homepage-hero", component: "hero" });
  const packaging = baseNode({ x: 1180, y: 100, category: "packaging", label: "Box front line", brief: "A short line for the front of the box that sells the mood at a glance.", words: NODE_DEFAULT_WORDS.packaging, filename: "box-front-line" });
  const advertising = baseNode({ x: 1560, y: 100, category: "advertising", label: "Launch ad", brief: "Stop a cold audience mid-scroll and make them curious about the fragrance.", words: NODE_DEFAULT_WORDS.advertising, filename: "launch-ad" });
  return [email, social, website, packaging, advertising];
}

/* ---------- icons ---------- */
const svg = (children) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const CAT_ICONS = {
  email: svg(<><rect x="3.5" y="5.5" width="17" height="13" rx="3.5" /><path d="m7 9.5 5 3.5 5-3.5" /></>),
  social: svg(<><rect x="4" y="4" width="16" height="16" rx="5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.8" cy="7.2" r=".6" fill="currentColor" /></>),
  website: svg(<><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5S14.6 18.1 12 20.5M12 3.5C9.4 5.9 8.2 8.7 8.2 12s1.2 6.1 3.8 8.5" /></>),
  packaging: svg(<><path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z" /><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9" /></>),
  advertising: svg(<><path d="M4 10v4h3l6 4V6L7 10z" /><path d="M16.5 9a4 4 0 0 1 0 6" /></>),
  script: svg(<><rect x="3.5" y="5" width="17" height="14" rx="3" /><path d="M3.5 9.5h17M8 5v4.5M16 5v4.5" /></>),
};

const Chevron = () => svg(<path d="m6 9 6 6 6-6" />);
const LinkIcon = () => svg(<><path d="M10 14a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.1 1.1" /><path d="M14 10a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.1-1.1" /></>);
const ShareIcon = () => svg(<path d="M7 17 17 7M9 7h8v8" />);
const TrashIcon = () => svg(<path d="M4 7h16M9 7V4.5h6V7m3 0-.8 12.5H6.8L6 7m4 4v5m4-5v5" />);

/* ---------- node pieces ---------- */
function NodeOutput({ node, onVariant }) {
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
        {tabs}
      </>
    );
  }
  return (
    <>
      <p className="sn-out-headline">{v.headline}</p>
      <p className="sn-out-body">{v.body}</p>
      <div className="sn-out-meta">{wordCount(v)} / {node.words} words target</div>
      {tabs}
    </>
  );
}

function StudioNode({ node, expanded, onToggle, labelOf, linking, shareOpen, onField, onGenerate, onLink, onDelete, onToggleShare, onCopy, onVariant }) {
  const cat = NODE_CATS[node.category];
  const comp = node.component || "hero";
  const [leaving, setLeaving] = useState(false);
  const bodyId = `${node.id}-body`;

  return (
    <article
      className={"node sn-node" + (expanded ? " is-open" : "") + (linking ? " linking" : "") + (leaving ? " is-leaving" : "")}
      data-id={node.id}
      style={{ "--cat": cat.color }}
      onAnimationEnd={(e) => { if (leaving && e.animationName === "studio-node-out") onDelete(); }}
    >
      <header className="sn-head">
        <span className="sn-icon">{CAT_ICONS[node.category]}</span>
        <input className="sn-title" type="text" aria-label="Node name" value={node.label} onChange={(e) => onField("label", e.target.value)} />
        {node.variants.length > 0 && !node.generating && <span className="sn-done" title="Generated" aria-label="Generated" />}
        <div className="sn-head-actions">
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
              <AutoTextarea placeholder="What must this piece do?" value={node.brief} onChange={(e) => onField("brief", e.target.value)} />
            </div>
            {node.category === "social" && (
              <div className="sn-field"><label>Platform</label>
                <select value={node.platform} onChange={(e) => onField("platform", e.target.value)}>
                  {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            )}
            {node.category === "website" && (
              <>
                <div className="sn-field"><label>Component</label>
                  <select value={comp} onChange={(e) => onField("component", e.target.value)}>
                    {Object.entries(WEBSITE_COMPONENTS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                  </select>
                </div>
                {comp === "pointers" && (
                  <div className="sn-field"><label>How many pointers</label>
                    <input type="number" min="2" max="6" value={node.pointerCount || 3}
                      onChange={(e) => onField("pointerCount", Math.max(2, Math.min(6, parseInt(e.target.value, 10) || 3)))} />
                  </div>
                )}
              </>
            )}
            <div className="sn-row2">
              <div className="sn-field"><label>Target Words</label>
                <input type="number" min="4" max="600" value={node.words}
                  onChange={(e) => onField("words", e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0)} />
              </div>
              <div className="sn-field"><label>File Name</label>
                <input type="text" placeholder="e.g. launch-email-v1" value={node.filename} onChange={(e) => onField("filename", e.target.value)} />
              </div>
            </div>
            <div className="sn-field"><label>Specific Requirements</label>
              <AutoTextarea placeholder="Format, must-include line, banned words override..." value={node.requirements} onChange={(e) => onField("requirements", e.target.value)} />
            </div>
            {node.connections.length > 0 && (
              <div className="sn-tags">
                {node.connections.map((id) => <span className="sn-tag" key={id}>🔗 {labelOf(id)}</span>)}
              </div>
            )}
            <div className="sn-actions">
              <button type="button" className="sn-gen" disabled={node.generating} onClick={onGenerate}>
                {node.generating ? "Generating..." : node.variants.length ? "Regenerate" : "Generate"}
              </button>
              <button type="button" className={"sn-round" + (linking ? " active" : "")} title="Correlate with another node" aria-label="Link with another node" aria-pressed={linking} onClick={onLink}><LinkIcon /></button>
              <div className="sharewrap">
                <button type="button" className="sn-round" title="Send to design tool" aria-label="Send to design tool" aria-expanded={shareOpen} onClick={onToggleShare}><ShareIcon /></button>
                {shareOpen && (
                  <div className="share-menu">
                    <div className="share-note">Copies this node's copy, then opens the tool to paste it in.</div>
                    <button type="button" onClick={onCopy}>Copy text</button>
                    <a href="https://www.canva.com/create/" target="_blank" rel="noopener noreferrer"
                      onClick={(e) => { e.preventDefault(); host.openExternal(e.currentTarget.href); }}>Open Canva</a>
                    <a href="https://new.express.adobe.com/" target="_blank" rel="noopener noreferrer"
                      onClick={(e) => { e.preventDefault(); host.openExternal(e.currentTarget.href); }}>Open Adobe Express</a>
                  </div>
                )}
              </div>
            </div>
            {(node.generating || node.variants.length > 0) && (
              <div className="sn-out" aria-live="polite"><NodeOutput node={node} onVariant={onVariant} /></div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// Draggable Wrapper based on HTML functionality
function DraggableNode({ node, dragging, onSize, onPointerDown, onClickCapture, onAddChild, children }) {
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
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
        zIndex: dragging ? 40 : node.z,
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
            <path d="M11 3.5v15M3.5 11h15" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

const NodeStudio = forwardRef(function NodeStudio({ active, ctx, variantCount, tier, aiAvailable, setStatus, onGenerated, refreshUsage, brandId, ensureAuth }, ref) {
  const [nodes, setNodes] = useState(seedNodes);
  const [linkingFrom, setLinkingFrom] = useState(null);
  const [shareId, setShareId] = useState(null);
  const [lines, setLines] = useState([]);
  const [sizes, setSizes] = useState({});
  const [draggingId, setDraggingId] = useState(null);

  const nodesRef = useRef(nodes);
  const ctxRef = useRef(ctx);
  const lastNodeRef = useRef(null);
  const zCounter = useRef(10);
  const dragGuard = useRef(false);

  ctxRef.current = ctx;

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

  const onSize = useCallback((id, w, h) => {
    setSizes(prev => prev[id]?.w === w && prev[id]?.h === h ? prev : { ...prev, [id]: { w, h } });
  }, []);

  /* ----- curved bezier lines drawing ----- */
  const draw = useCallback(() => {
    const out = [];
    nodesRef.current.forEach((n) => {
      n.connections.forEach((tid) => {
        const b = nodesRef.current.find(x => x.id === tid);
        if (!b) return;
        
        const s1 = sizes[n.id] || { w: 340, h: 46 };
        const s2 = sizes[b.id] || { w: 340, h: 46 };
        
        const x1 = n.x + s1.w / 2;
        const y1 = n.y + s1.h; // Bottom of Parent
        const x2 = b.x + s2.w / 2;
        const y2 = b.y; // Top of Child
        
        out.push({ key: n.id + tid, x1, y1, x2, y2 });
      });
    });
    setLines((prev) => (JSON.stringify(prev) === JSON.stringify(out) ? prev : out));
  }, [sizes]);

  useLayoutEffect(() => { if (active) draw(); }, [active, nodes, draw]);

  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest(".sharewrap")) setShareId(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  /* ----- drag interaction handler ----- */
  const handlePointerDown = (e, node) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest("input, textarea, select, button, .sn-out, .sn-vtabs, .sn-head-actions")) return;
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const originX = node.x;
    const originY = node.y;
    let moved = false;

    // Detect if canvas world is scaled by CanvasViewport
    const canvasWorld = document.querySelector('.canvas-world');
    const scale = canvasWorld ? (canvasWorld.getBoundingClientRect().width / canvasWorld.offsetWidth) : 1;

    const onMove = (moveEvt) => {
      const dx = (moveEvt.clientX - startX) / (scale || 1);
      const dy = (moveEvt.clientY - startY) / (scale || 1);
      
      if (!moved) {
        if (Math.hypot(dx, dy) < 4) return;
        moved = true;
        setDraggingId(node.id);
        zCounter.current += 1;
        patch(node.id, { z: zCounter.current });
      }
      
      // Keep the column header (drawn 46px above the top node) on the canvas.
      patch(node.id, {
        x: Math.max(0, originX + dx),
        y: Math.max(MIN_NODE_Y, originY + dy)
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (moved) {
        dragGuard.current = true;
        setTimeout(() => { dragGuard.current = false; }, 60);
        setDraggingId(null);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
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
    const n = Math.max(1, Math.min(8, parseInt(count, 10) || 1));
    let added = null;

    commit((list) => {
      const next = [...list];
      const catNodes = next.filter(x => x.category === category);
       
      let startX = 40;
      if (category === 'social') startX = 420;
      if (category === 'website') startX = 800;
      if (category === 'packaging') startX = 1180;
      if (category === 'advertising') startX = 1560;

      let maxY = 100;
      if (catNodes.length > 0) {
        const last = catNodes[catNodes.length - 1];
        const lastSize = sizes[last.id] || { h: 300 };
        startX = last.x;
        maxY = last.y + lastSize.h + 80;
      }

      for (let i = 0; i < n; i++) {
        next.push(makeNode(category, next, startX, maxY + (i * 340)));
      }
      added = next[next.length - 1].id;
      return next;
    });

    if (added) setOpen(added, true);
  };

  // Adds a node physically connected below the parent
  const handleAddChild = (parentId, category) => {
    let added = null;
    commit((list) => {
      const parentIndex = list.findIndex((n) => n.id === parentId);
      if (parentIndex === -1) return list;
       
      const parent = list[parentIndex];
      const pSize = sizes[parentId] || { h: 300 };
      const next = [...list];
       
      // Spawn directly below
      const newNode = makeNode(category, next, parent.x, parent.y + pSize.h + 80);
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

  const handleLink = (id) => {
    if (linkingFrom === id) return setLinkingFrom(null);
    if (linkingFrom === null) return setLinkingFrom(id);
    commit((l) => l.map((n) => {
      if (n.id !== linkingFrom) return n;
      const has = n.connections.includes(id);
      return { ...n, connections: has ? n.connections.filter((c) => c !== id) : [...n.connections, id] };
    }));
    setLinkingFrom(null);
  };

  const announce = (n, idx) => {
    const v = n.variants[idx];
    if (v) onGenerated({ type: "node", label: n.label, variant: v });
  };

  const generateNode = async (id) => {
    const n = nodesRef.current.find((x) => x.id === id);
    if (!n) return;
    if (!aiAvailable) return setStatus("AI generation isn't available here.", "err");
    if (ensureAuth && !ensureAuth()) return;
    if (!n.brief.trim() && !ctxRef.current.brand.message.trim()) return setStatus("Add a job requirement (or a brand message) first.", "err");
    patch(id, { generating: true });

    try {
      const linkedNodes = n.connections
        .map((cid) => nodesRef.current.find((x) => x.id === cid))
        .filter((t) => t && t.variants.length)
        .map((t) => ({ label: t.label, variant: t.variants[t.activeIdx || 0] || t.variants[0] }));

      const variants = await aiGenerateNode({ ctx: ctxRef.current, node: n, variantCount, linkedNodes, tier });
      patch(id, { variants, activeIdx: 0, generating: false });
      setOpen(id, true);
      lastNodeRef.current = id;
      onGenerated({ type: "node", label: n.label, variant: variants[0] });
      await saveGeneration({
        brandId,
        medium: `node-${n.category}`,
        inputContext: { brief: n.brief, label: n.label },
        output: variants
      });
      if (refreshUsage) refreshUsage();
      setStatus("Node generated.", "ok");
    } catch (err) {
      patch(id, { generating: false });
      setStatus(describeError(err), "err");
    }
  };

  useImperativeHandle(ref, () => ({
    addNode: (category) => addNodes(category, 1),
    generateAllNodes: async () => {
      for (const n of nodesRef.current) {
        if (!n.generating) {
          await generateNode(n.id);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }
  }));

  const generateColumn = async (category) => {
    for (const n of nodesRef.current.filter((x) => x.category === category)) await generateNode(n.id);
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  const copyNode = (n) => {
    if (!n.variants.length) return;
    const v = n.variants[n.activeIdx || 0];
    const text = v.pointers ? v.pointers.map((p) => `${p.title} — ${p.detail}`).join("\n") : `${v.headline}\n\n${v.body}`;
    host.copyText(text)
      .then(() => setStatus("Copied — paste it into your design tool.", "ok"))
      .catch(() => setStatus("Couldn't copy automatically — select the text and copy manually.", "err"));
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

  return (
    <div className="studio">
      <div className="nodebar">
        <div className={"linkhint" + (linkingFrom ? " on" : "")} role="status">
          Linking mode — click another node's link button to correlate it, or click this node's again to cancel.
        </div>
      </div>

      <div className="nodecanvas" style={{ position: 'relative', width: '3200px', minHeight: '2400px' }}>
        <svg className="nodesvg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 0 }} aria-hidden="true">
          {lines.map((l) => {
            const a = Math.max(40, Math.abs(l.y2 - l.y1) / 2);
            const d = `M ${l.x1} ${l.y1} C ${l.x1} ${l.y1 + a}, ${l.x2} ${l.y2 - a}, ${l.x2} ${l.y2}`;
            return (
              <g key={l.key}>
                <path d={d} fill="none" stroke="#1A1F36" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
                <circle cx={l.x1} cy={l.y1} r="4" fill="#1A1F36" />
                <circle cx={l.x2} cy={l.y2} r="4" fill="#1A1F36" />
              </g>
            );
          })}
        </svg>

        {/* Visual column headers for empty states only (nodes are absolutely positioned) */}
        <div className="nodecols" style={{ pointerEvents: 'none', position: 'absolute', top: 0, left: 0, display: 'flex', gap: '40px' }}>
          {COL_ORDER.map((key) => {
            const cat = NODE_CATS[key];
            const list = nodes.filter((n) => n.category === key);
            
            return (
              <section className="sn-col" key={key} style={{ pointerEvents: 'auto', position: 'relative', flex: '0 0 340px', width: '340px' }}>
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
              onSize={onSize}
              onPointerDown={(e) => handlePointerDown(e, n)}
              onClickCapture={handleClickCapture}
              onAddChild={() => handleAddChild(n.id, n.category)}
            >
              {topInfo && (
                <header className="sn-col-head" style={{ "--cat": NODE_CATS[n.category].color, position: 'absolute', top: '-46px', left: 0, right: 0, width: '340px', cursor: 'grab' }}>
                  <span className="sn-col-dot" aria-hidden="true" />
                  <h2>{NODE_CATS[n.category].label}</h2>
                 
                  {!NODE_CATS[n.category].comingSoon && <span className="sn-count" aria-label={`${topInfo.total} nodes`}>{topInfo.total}</span>}
                </header>
              )}
              <StudioNode
                node={n} labelOf={labelOf}
                expanded={expanded.has(n.id)}
                onToggle={() => setOpen(n.id, !expanded.has(n.id))}
                linking={linkingFrom === n.id} shareOpen={shareId === n.id}
                onField={(f, v) => patch(n.id, { [f]: v })}
                onGenerate={() => generateNode(n.id)}
                onLink={() => handleLink(n.id)}
                onDelete={() => deleteNode(n.id)}
                onToggleShare={() => setShareId((s) => (s === n.id ? null : n.id))}
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