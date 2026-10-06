

import { useState, useRef, useEffect, useLayoutEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { NODE_CATS, COL_ORDER, PLATFORMS, WEBSITE_COMPONENTS, NODE_DEFAULT_WORDS } from "../lib/constants";
import { generateNode as aiGenerateNode, describeError } from "../services/ai";
import { Skeleton } from "./OutputCard";
import host from "../hosts/browser";
import { saveGeneration } from "../services/brands";

const uid = () => "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const wordCount = (v) => ((v && v.body) || "").trim().split(/\s+/).filter(Boolean).length;

const baseNode = (o) => ({
  id: uid(), category: "email", label: "", brief: "", words: 60, requirements: "", filename: "",
  platform: undefined, component: "hero", pointerCount: 3, connections: [], variants: [], activeIdx: 0, generating: false, ...o,
});

function makeNode(category, existing) {
  const cat = NODE_CATS[category];
  const idx = existing.filter((n) => n.category === category).length + 1;
  return baseNode({
    category, label: `${cat.label} ${idx}`, words: NODE_DEFAULT_WORDS[category] || 60,
    filename: `${category}-${idx}`, platform: category === "social" ? "Instagram" : undefined,
  });
}

function seedNodes() {
  const email = baseNode({ category: "email", label: "Launch email", brief: "Announce the new fragrance to warm subscribers who've browsed before but not bought.", words: 110, filename: "launch-email-v1" });
  const social = baseNode({ category: "social", label: "Instagram launch post", brief: "Tease the fragrance's mood for a cold, scrolling audience.", words: 40, filename: "ig-launch-post", platform: "Instagram" });
  const website = baseNode({ category: "website", label: "Homepage hero", brief: "Set the emotional frame for a first-time visitor landing on the homepage.", words: 30, filename: "homepage-hero", component: "hero" });
  social.connections = [website.id];
  return [email, social, website];
}

function NodeOutput({ node, onVariant }) {
  if (node.generating) return <Skeleton />;
  if (!node.variants.length) return <div className="frame-placeholder">No output yet.</div>;
  const idx = node.activeIdx || 0;
  const v = node.variants[idx] || node.variants[0];
  const tabs = node.variants.length > 1 && (
    <div className="frame-vtabs" style={{ padding: ".5rem 0 0" }}>
      {node.variants.map((_, i) => (
        <button key={i} className={"vtab" + (i === idx ? " on" : "")} onClick={() => onVariant(i)}>{i + 1}</button>
      ))}
    </div>
  );
  if (v.pointers) {
    return (
      <>
        <ul className="pointer-list">
          {v.pointers.map((p, i) => <li key={i}><b>{p.title}</b> — {p.detail}</li>)}
        </ul>
        <div className="wordcount mono">{v.pointers.length} pointers</div>
        {tabs}
      </>
    );
  }
  return (
    <>
      <div className="frame-headline">{v.headline}</div>
      <div className="frame-sub">{v.body}</div>
      <div className="wordcount mono">{wordCount(v)} / {node.words} words target</div>
      {tabs}
    </>
  );
}

function NodeCard({ node, labelOf, linking, shareOpen, onField, onGenerate, onLink, onDelete, onToggleShare, onCopy, onVariant }) {
  const cat = NODE_CATS[node.category];
  const comp = node.component || "hero";
  return (
    <div className={"node" + (linking ? " linking" : "")} data-id={node.id} style={{ "--cat": cat.color }}>
      <div className="node-head">
        <div className="node-icon">{cat.label[0]}</div>
        <input type="text" value={node.label} onChange={(e) => onField("label", e.target.value)} />
        <button className="node-x" title="Delete node" onClick={onDelete}>✕</button>
      </div>
      <div className="node-body">
        <div className="field"><label>Job requirement</label>
          <textarea placeholder="What must this piece do?" value={node.brief} onChange={(e) => onField("brief", e.target.value)} />
        </div>
        {node.category === "social" && (
          <div className="field"><label>Platform</label>
            <select value={node.platform} onChange={(e) => onField("platform", e.target.value)}>
              {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        )}
        {node.category === "website" && (
          <>
            <div className="field"><label>Component</label>
              <select value={comp} onChange={(e) => onField("component", e.target.value)}>
                {Object.entries(WEBSITE_COMPONENTS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
              </select>
            </div>
            {comp === "pointers" && (
              <div className="field"><label>How many pointers</label>
                <input type="number" min="2" max="6" value={node.pointerCount || 3}
                  onChange={(e) => onField("pointerCount", Math.max(2, Math.min(6, parseInt(e.target.value, 10) || 3)))} />
              </div>
            )}
          </>
        )}
        <div className="node-metarow">
          <div className="field"><label>Target words</label>
            <input type="number" min="4" max="600" value={node.words}
              onChange={(e) => onField("words", e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0)} />
          </div>
          <div className="field"><label>File name</label>
            <input type="text" placeholder="e.g. launch-email-v1" value={node.filename} onChange={(e) => onField("filename", e.target.value)} />
          </div>
        </div>
        <div className="field"><label>Specific requirements</label>
          <textarea placeholder="Format, must-include line, banned words override…" value={node.requirements} onChange={(e) => onField("requirements", e.target.value)} />
        </div>
        {node.connections.length > 0 && (
          <div className="node-tagrow">
            {node.connections.map((id) => <span className="node-tag" key={id}>↔ {labelOf(id)}</span>)}
          </div>
        )}
        <div className="node-actions">
          <button className="node-gen" disabled={node.generating} onClick={onGenerate}>
            {node.generating ? "Generating…" : node.variants.length ? "Regenerate" : "Generate"}
          </button>
          <button className={"node-link" + (linking ? " active" : "")} title="Correlate with another node" onClick={onLink}>🔗</button>
          <div className="sharewrap">
            <button className="node-link" title="Send to design tool" onClick={onToggleShare}>↗</button>
            {shareOpen && (
              <div className="share-menu">
                <div className="share-note">Copies this node's copy, then opens the tool to paste it in.</div>
                <button onClick={onCopy}>Copy text</button>
                <a href="https://www.canva.com/create/" target="_blank" rel="noopener noreferrer"
                  onClick={(e) => { e.preventDefault(); host.openExternal(e.currentTarget.href); }}>Open Canva</a>
                <a href="https://new.express.adobe.com/" target="_blank" rel="noopener noreferrer"
                  onClick={(e) => { e.preventDefault(); host.openExternal(e.currentTarget.href); }}>Open Adobe Express</a>
              </div>
            )}
          </div>
        </div>
        <div className="node-out"><NodeOutput node={node} onVariant={onVariant} /></div>
      </div>
    </div>
  );
}

// 1. Wrapped the component in forwardRef
const NodeStudio = forwardRef(function NodeStudio({ active, ctx, variantCount, tier, aiAvailable, setStatus, onGenerated, refreshUsage, brandId }, ref) {
  const [nodes, setNodes] = useState(seedNodes);
  const [linkingFrom, setLinkingFrom] = useState(null);
  const [shareId, setShareId] = useState(null);
  const [lines, setLines] = useState([]);

  const nodesRef = useRef(nodes);
  const ctxRef = useRef(ctx);
  const lastNodeRef = useRef(null);
  const svgRef = useRef(null);
  const colsRef = useRef(null);
  ctxRef.current = ctx;

  const commit = useCallback((fn) => {
    const next = fn(nodesRef.current);
    nodesRef.current = next;
    setNodes(next);
  }, []);
  const patch = useCallback((id, changes) => commit((l) => l.map((n) => (n.id === id ? { ...n, ...changes } : n))), [commit]);

  /* ----- connection lines ----- */
  const draw = useCallback(() => {
    const svg = svgRef.current, cols = colsRef.current;
    if (!svg || !cols) return;
    const base = svg.getBoundingClientRect();
    const scale = base.width / svg.clientWidth || 1;
    const out = [];
    nodesRef.current.forEach((n) => n.connections.forEach((tid) => {
      const a = cols.querySelector(`[data-id="${n.id}"]`), b = cols.querySelector(`[data-id="${tid}"]`);
      if (!a || !b) return;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const x1 = (ra.right - base.left) / scale, y1 = (ra.top - base.top) / scale + 18;
      const x2 = (rb.left - base.left) / scale, y2 = (rb.top - base.top) / scale + 18;
      out.push({ key: n.id + tid, x1, y1, x2, y2, mx: (x1 + x2) / 2 });
    }));
    setLines((prev) => (JSON.stringify(prev) === JSON.stringify(out) ? prev : out));
  }, []);

  useLayoutEffect(() => { if (active) draw(); });
  useEffect(() => {
    window.addEventListener("resize", draw);
    const ro = new ResizeObserver(draw);
    if (colsRef.current) ro.observe(colsRef.current);
    return () => { window.removeEventListener("resize", draw); ro.disconnect(); };
  }, [draw]);

  // close menus on outside click
  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest(".sharewrap")) setShareId(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  /* ----- node actions ----- */
  const addNodes = (category, count) => {
    const n = Math.max(1, Math.min(8, parseInt(count, 10) || 1));
    commit((list) => {
      const next = [...list];
      for (let i = 0; i < n; i++) next.push(makeNode(category, next));
      return next;
    });
  };

  const deleteNode = (id) =>
    commit((l) => l.filter((n) => n.id !== id).map((n) => ({ ...n, connections: n.connections.filter((c) => c !== id) })));

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
    if (!n.brief.trim() && !ctxRef.current.brand.message.trim()) return setStatus("Add a job requirement (or a brand message) first.", "err");
    patch(id, { generating: true });
    try {
      const linkedNodes = n.connections
        .map((cid) => nodesRef.current.find((x) => x.id === cid))
        .filter((t) => t && t.variants.length)
        .map((t) => ({ label: t.label, variant: t.variants[t.activeIdx || 0] || t.variants[0] }));
      const variants = await aiGenerateNode({ ctx: ctxRef.current, node: n, variantCount, linkedNodes, tier });
      patch(id, { variants, activeIdx: 0, generating: false });
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

  // 2. EXPOSE THE GENERATE ALL NODES FUNCTION TO THE PARENT (App.jsx)
  useImperativeHandle(ref, () => ({
    addNode: (category) => addNodes(category, 1),
    generateAllNodes: async () => {
      // Loop through and sequentially generate all nodes that aren't already generating
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

  const labelOf = (id) => (nodesRef.current.find((n) => n.id === id) || {}).label || "…";

  return (
    <div hidden={!active}>
      <div className="nodebar">
        <div className={"linkhint" + (linkingFrom ? " on" : "")}>
          Linking mode — click another node's 🔗 to correlate it, or click this node's 🔗 again to cancel.
        </div>
      </div>

      <div className="nodecanvas">
        <svg className="nodesvg" ref={svgRef}>
          {lines.map((l) => (
            <g key={l.key}>
              <path d={`M${l.x1},${l.y1} C${l.mx},${l.y1} ${l.mx},${l.y2} ${l.x2},${l.y2}`} />
              <circle cx={l.x1} cy={l.y1} r="3" /><circle cx={l.x2} cy={l.y2} r="3" />
            </g>
          ))}
        </svg>
        <div className="nodecols" ref={colsRef}>
          {COL_ORDER.map((key) => {
            const cat = NODE_CATS[key];
            if (cat.comingSoon) {
              return (
                <div className="nodecol" key={key}>
                  <div className="nodecol-head"><span className="nodecol-dot" style={{ background: cat.color }} />{cat.label}</div>
                  <div className="node" style={{ opacity: 0.6 }}>
                    <div className="node-body"><div className="frame-placeholder">Script and storyboard generation is coming soon.</div></div>
                  </div>
                </div>
              );
            }
            const list = nodes.filter((n) => n.category === key);
            return (
              <div className="nodecol" key={key}>
                <div className="nodecol-head">
                  <span className="nodecol-dot" style={{ background: cat.color }} />{cat.label}
                  <span className="mono" style={{ color: "var(--muted-2)", fontWeight: 400 }}>({list.length})</span>
                  {list.length > 1 && <button className="nodecol-gen" onClick={() => generateColumn(key)}>⚡ Generate all</button>}
                </div>
                {list.map((n) => (
                  <NodeCard
                    key={n.id} node={n} labelOf={labelOf}
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
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default NodeStudio;