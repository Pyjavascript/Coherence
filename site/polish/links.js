/* Coherence polish — Node Studio link management.

   Makes connecting and disconnecting nodes easy, even with many links:
     • Link:       hover a node → drag from its bottom port (sends its copy on) or
                   its top port (receives) onto another node.
     • Unlink:     hover or click any line → a "Disconnect" chip appears on it;
                   or press the × on a "linked to" tag inside a node;
                   or select a line and press Delete.
     • Feedback:   the hovered / selected line and both of its nodes light up;
                   hovering a node softly lights every line touching it.

   Nothing here owns link state. Every change is made by pressing the app's own
   "Link with another node" buttons in the same order a person would, so the
   app's rules (one link per direction, auto-generate on link, brief carry-over)
   stay exactly as they were. Layers are appended to .nodecanvas and never
   alter the app's connector paths, node transforms or React-owned classes. */
(() => {
  const SVGNS = 'http://www.w3.org/2000/svg';
  const TOL = 2; // px tolerance when matching a connector's end to a node edge
  const X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  let canvas = null;
  let linksSvg = null, ui = null, portsHost = null, rubber = null, rubberPath = null, rubberDot = null, chip = null, tip = null;
  let observer = null, resizer = null, worldObserver = null;
  let raf = 0, raf2 = 0;
  let hoverKey = null;      // link under the pointer / keyboard focus / tag
  let selectedKey = null;   // link the person clicked
  let hotId = null;         // node whose ports are showing
  let hotTimer = 0, hideTimer = 0, flashTimer = 0;
  let drag = null;
  let busy = false;

  /** Latest model, rebuilt by sync(): nodes by id, links in connector order. */
  let nodes = new Map();
  let linkList = [];
  const linkEls = new Map(); // key -> { g, hit, hl }
  const portEls = new Map(); // id  -> { out, in }

  const esc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/"/g, '\\"'));
  const tick = () => new Promise((r) => setTimeout(r, 24));
  const svgEl = (name, attrs = {}) => {
    const el = document.createElementNS(SVGNS, name);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  };
  const keyOf = (src, tgt) => `${src}>${tgt}`;

  /* ---------- reading the app's DOM ---------------------------------------- */
  function readNodes() {
    const map = new Map();
    canvas.querySelectorAll(':scope > .cn').forEach((cn) => {
      const art = cn.querySelector('.sn-node');
      const id = art && art.dataset.id;
      if (!id || art.classList.contains('is-leaving')) return;
      const m = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(cn.style.transform || '');
      if (!m) return;
      const title = cn.querySelector('.sn-title');
      map.set(id, {
        id, cn, art,
        x: parseFloat(m[1]), y: parseFloat(m[2]),
        w: cn.offsetWidth, h: cn.offsetHeight,
        label: (title && title.value) || 'Untitled node',
      });
    });
    return map;
  }

  function readLinks() {
    const out = [];
    const arr = [...nodes.values()];
    canvas.querySelectorAll('.nodesvg > g').forEach((g) => {
      const p = g.querySelector('path');
      if (!p) return;
      const n = (p.getAttribute('d') || '').match(/-?\d*\.?\d+(?:e-?\d+)?/gi);
      if (!n || n.length < 8) return;
      const x1 = +n[0], y1 = +n[1], x2 = +n[6], y2 = +n[7];
      const src = arr.find((o) => Math.abs(o.x + o.w / 2 - x1) < TOL && Math.abs(o.y + o.h - y1) < TOL);
      const tgt = arr.find((o) => o !== src && Math.abs(o.x + o.w / 2 - x2) < TOL && Math.abs(o.y - y2) < TOL);
      if (!src || !tgt) return;
      out.push({ key: keyOf(src.id, tgt.id), src: src.id, tgt: tgt.id, d: p.getAttribute('d') });
    });
    return out;
  }

  /* ---------- layers ------------------------------------------------------- */
  function ensureLayers() {
    const found = document.querySelector('.nodecanvas');
    if (!found) { canvas = null; return false; }
    if (found === canvas && linksSvg && linksSvg.isConnected) return true;
    teardown();
    canvas = found;

    linksSvg = svgEl('svg', { class: 'pl-links', role: 'group', 'aria-label': 'Node connections' });
    ui = document.createElement('div');
    ui.className = 'pl-link-ui';

    rubber = svgEl('svg', { class: 'pl-rubber', 'aria-hidden': 'true' });
    rubber.style.display = 'none';
    rubberPath = svgEl('path');
    rubberDot = svgEl('circle', { r: '5' });
    rubber.append(rubberPath, rubberDot);

    portsHost = document.createElement('div');

    chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'pl-chip';
    chip.innerHTML = `<span class="pl-chip-x">${X_ICON}</span><span>Disconnect</span>`;

    tip = document.createElement('div');
    tip.className = 'pl-tip';
    tip.setAttribute('aria-hidden', 'true');

    ui.append(rubber, portsHost, chip, tip);
    canvas.append(linksSvg, ui);

    // pointer plumbing
    canvas.addEventListener('pointerover', onOver);
    canvas.addEventListener('pointerout', onOut);
    canvas.addEventListener('click', onCanvasClick);
    ui.addEventListener('pointerdown', onUiPointerDown);
    linksSvg.addEventListener('pointerdown', (e) => { if (e.target.closest('.pl-link-hit')) e.stopPropagation(); });
    chip.addEventListener('pointerenter', () => clearTimeout(hideTimer));
    chip.addEventListener('pointerleave', () => scheduleHoverClear());
    chip.addEventListener('click', onChipClick);

    observer = new MutationObserver(onMutate);
    observer.observe(canvas, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ['style', 'd', 'data-id', 'class', 'cx', 'cy'],
    });
    resizer = new ResizeObserver(schedule);
    // zoom / pan live on an ancestor (.canvas-world); controls keep a constant on-screen size
    const world = canvas.closest('.canvas-world');
    if (world) { worldObserver = new MutationObserver(schedule); worldObserver.observe(world, { attributes: true, attributeFilter: ['style'] }); }
    return true;
  }

  function teardown() {
    if (observer) observer.disconnect();
    if (resizer) resizer.disconnect();
    if (worldObserver) worldObserver.disconnect();
    if (canvas) {
      canvas.removeEventListener('pointerover', onOver);
      canvas.removeEventListener('pointerout', onOut);
      canvas.removeEventListener('click', onCanvasClick);
    }
    if (linksSvg) linksSvg.remove();
    if (ui) ui.remove();
    linkEls.clear(); portEls.clear();
    canvas = linksSvg = ui = portsHost = rubber = rubberPath = rubberDot = chip = tip = observer = resizer = worldObserver = null;
  }

  function onMutate(muts) {
    for (const m of muts) {
      const t = m.target;
      if (t instanceof Element && ((ui && ui.contains(t)) || (linksSvg && linksSvg.contains(t)))) continue;
      if (m.type === 'childList' && [...m.addedNodes, ...m.removedNodes].every((n) => n === ui || n === linksSvg)) continue;
      schedule();
      return;
    }
  }
  function schedule() {
    if (raf) return;
    const run = () => { if (!raf) return; cancelAnimationFrame(raf); clearTimeout(raf2); raf = raf2 = 0; sync(); };
    raf = requestAnimationFrame(run);
    raf2 = setTimeout(run, 60); // rAF is paused in background tabs; links must not go stale
  }

  /* ---------- sync: model -> overlay --------------------------------------- */
  function sync() {
    if (!ensureLayers()) return;
    nodes = readNodes();
    linkList = readLinks();
    const zoom = canvas.getBoundingClientRect().width / canvas.offsetWidth || 1;
    ui.style.setProperty('--pl-inv', String(Math.min(2.2, Math.max(.7, 1 / zoom))));

    // links
    const alive = new Set();
    for (const l of linkList) {
      alive.add(l.key);
      let el = linkEls.get(l.key);
      if (!el) {
        const g = svgEl('g');
        const hl = svgEl('path', { class: 'pl-link-hl' });
        const hit = svgEl('path', { class: 'pl-link-hit', tabindex: '0', role: 'button' });
        g.append(hl, hit);
        linksSvg.append(g);
        el = { g, hl, hit };
        linkEls.set(l.key, el);
        bindLinkEl(l.key, el);
      }
      el.hl.setAttribute('d', l.d);
      el.hit.setAttribute('d', l.d);
      const name = `${labelOf(l.src)} to ${labelOf(l.tgt)}`;
      el.hit.setAttribute('aria-label', `Link: ${name}. Press Enter to select it, then Delete to disconnect.`);
    }
    for (const [key, el] of linkEls) {
      if (!alive.has(key)) { el.g.remove(); linkEls.delete(key); if (hoverKey === key) hoverKey = null; if (selectedKey === key) selectedKey = null; }
    }

    // ports
    for (const n of nodes.values()) {
      let p = portEls.get(n.id);
      if (!p) {
        p = { out: makePort(n.id, 'out'), in: makePort(n.id, 'in') };
        portEls.set(n.id, p);
        portsHost.append(p.out, p.in);
        resizer.observe(n.cn);
      }
      place(p.out, n.x + n.w / 2, n.y + n.h);
      place(p.in, n.x + n.w / 2, n.y);
      p.out.setAttribute('aria-label', `Link from ${n.label}: drag to another node`);
      p.in.setAttribute('aria-label', `Link into ${n.label}: drag from another node`);
    }
    for (const [id, p] of portEls) {
      if (!nodes.has(id)) { p.out.remove(); p.in.remove(); portEls.delete(id); if (hotId === id) hotId = null; }
    }

    decorateTags();
    paint();
  }

  const labelOf = (id) => (nodes.get(id) ? nodes.get(id).label : 'node');
  const place = (el, cx, cy) => { el.style.left = `${cx}px`; el.style.top = `${cy}px`; };

  function makePort(id, side) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pl-port';
    b.dataset.id = id;
    b.dataset.side = side;
    b.title = side === 'out' ? 'Drag to another node to link' : 'Drag from another node to link here';
    return b;
  }

  /* ---------- paint: highlight state --------------------------------------- */
  function paint() {
    if (!canvas) return;
    const active = hoverKey || selectedKey;
    const activeLink = active && linkList.find((l) => l.key === active);

    for (const l of linkList) {
      const el = linkEls.get(l.key);
      if (!el) continue;
      el.g.classList.toggle('is-hover', hoverKey === l.key);
      el.g.classList.toggle('is-selected', selectedKey === l.key);
      el.g.classList.toggle('is-related', !!hotId && (l.src === hotId || l.tgt === hotId));
    }

    // node outlines: ends of the active link
    nodes.forEach((n) => {
      const end = activeLink && (activeLink.src === n.id ? 'src' : activeLink.tgt === n.id ? 'tgt' : null);
      if (end) n.art.setAttribute('data-pl-link-end', end); else n.art.removeAttribute('data-pl-link-end');
    });

    // ports follow the hot node (or the drag's origin)
    const hot = drag ? drag.id : hotId;
    portEls.forEach((p, id) => {
      const on = id === hot;
      p.out.toggleAttribute('data-vis', on);
      p.in.toggleAttribute('data-vis', on);
      p.out.tabIndex = on ? 0 : -1;
      p.in.tabIndex = on ? 0 : -1;
    });

    // chip on the active link's midpoint
    if (activeLink && !drag && linkEls.get(activeLink.key)) {
      const hl = linkEls.get(activeLink.key).hl;
      try {
        const pt = hl.getPointAtLength(hl.getTotalLength() / 2);
        chip.style.left = `${pt.x}px`;
        chip.style.top = `${pt.y}px`;
      } catch { /* path not laid out yet */ }
      chip.setAttribute('aria-label', `Disconnect ${labelOf(activeLink.src)} from ${labelOf(activeLink.tgt)}`);
      chip.dataset.key = activeLink.key;
      chip.toggleAttribute('data-vis', true);
      chip.tabIndex = 0;
    } else {
      chip.toggleAttribute('data-vis', false);
      chip.tabIndex = -1;
      delete chip.dataset.key;
    }
  }

  /* ---------- hover / selection -------------------------------------------- */
  function bindLinkEl(key, { hit }) {
    hit.addEventListener('pointerenter', () => { clearTimeout(hideTimer); hoverKey = key; paint(); });
    hit.addEventListener('pointerleave', scheduleHoverClear);
    hit.addEventListener('focus', () => { hoverKey = key; paint(); });
    hit.addEventListener('blur', scheduleHoverClear);
    hit.addEventListener('click', (e) => { e.stopPropagation(); selectedKey = selectedKey === key ? null : key; hoverKey = key; paint(); });
    hit.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectedKey = selectedKey === key ? null : key; paint(); if (selectedKey) chip.focus({ preventScroll: true }); }
    });
  }
  function scheduleHoverClear() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (chip && chip.matches(':hover')) return;
      hoverKey = null; paint();
    }, 220);
  }

  function nodeIdFrom(target) {
    if (!(target instanceof Element)) return null;
    const port = target.closest('.pl-port');
    if (port) return port.dataset.id;
    const art = target.closest('.cn') && target.closest('.cn').querySelector('.sn-node');
    return art ? art.dataset.id : null;
  }
  function onOver(e) {
    const id = nodeIdFrom(e.target);
    if (id) { clearTimeout(hotTimer); if (hotId !== id) { hotId = id; paint(); } }
    const tag = e.target instanceof Element && e.target.closest('.sn-tag');
    if (tag) { const l = tagLink(tag); if (l) { clearTimeout(hideTimer); hoverKey = l.key; paint(); } }
  }
  function onOut(e) {
    const tag = e.target instanceof Element && e.target.closest('.sn-tag');
    if (tag) scheduleHoverClear();
    clearTimeout(hotTimer);
    hotTimer = setTimeout(() => {
      if (drag) return;
      if (canvas && (canvas.querySelector('.cn:hover') || canvas.querySelector('.pl-port:hover'))) return;
      hotId = null; paint();
    }, 180);
  }

  // click on empty canvas / elsewhere clears the selection; tags disconnect
  function onCanvasClick(e) {
    const tag = e.target instanceof Element && e.target.closest('.sn-tag');
    if (tag) {
      const l = tagLink(tag);
      if (l) { e.preventDefault(); e.stopPropagation(); disconnect(l.key); }
      return;
    }
    if (e.target instanceof Element && e.target.closest('.pl-chip, .pl-link-hit')) return;
    if (selectedKey) { selectedKey = null; paint(); }
  }
  document.addEventListener('pointerdown', (e) => {
    if (!selectedKey) return;
    if (e.target instanceof Element && e.target.closest('.pl-chip, .pl-link-hit')) return;
    selectedKey = null; paint();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (!canvas) return;
    if (e.key === 'Escape') {
      if (drag) { endDrag(false); return; }
      if (selectedKey || hoverKey) { selectedKey = null; hoverKey = null; paint(); }
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedKey) {
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      disconnect(selectedKey);
    }
  });

  /* ---------- tags inside a node ------------------------------------------- */
  function tagLink(tag) {
    const art = tag.closest('.sn-node');
    if (!art) return null;
    const src = art.dataset.id;
    const idx = [...art.querySelectorAll('.sn-tags .sn-tag')].indexOf(tag);
    const mine = linkList.filter((l) => l.src === src);
    return mine[idx] || null;
  }
  function decorateTags() {
    canvas.querySelectorAll('.sn-tags .sn-tag').forEach((tag) => {
      const l = tagLink(tag);
      if (!l) return;
      tag.setAttribute('role', 'button');
      tag.tabIndex = 0;
      tag.title = `Disconnect from ${labelOf(l.tgt)}`;
      tag.setAttribute('aria-label', `Disconnect from ${labelOf(l.tgt)}`);
      if (!tag.dataset.plBound) {
        tag.dataset.plBound = '1';
        tag.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const k = tagLink(tag); if (k) disconnect(k.key); }
        });
        tag.addEventListener('focus', () => { const k = tagLink(tag); if (k) { hoverKey = k.key; paint(); } });
        tag.addEventListener('blur', scheduleHoverClear);
      }
    });
  }

  /* ---------- changing links (through the app's own buttons) --------------- */
  const linkBtn = (id) => canvas && canvas.querySelector(`.sn-node[data-id="${esc(id)}"] .sn-round[aria-label^="Link with"]`);

  /** Press A's link button, then B's. The app adds A→B, or removes it when it exists. */
  async function toggleViaApp(a, b) {
    if (busy || !canvas) return false;
    busy = true;
    try {
      const pending = canvas.querySelector('.sn-node.linking');
      if (pending) { const pb = linkBtn(pending.dataset.id); if (pb) { pb.click(); await tick(); } }
      const ba = linkBtn(a), bb = linkBtn(b);
      if (!ba || !bb) return false;
      ba.click(); await tick();
      bb.click(); await tick();
      const stuck = canvas.querySelector('.sn-node.linking'); // never leave the app in linking mode
      if (stuck) { const sb = linkBtn(stuck.dataset.id); if (sb) sb.click(); }
      return true;
    } finally {
      busy = false;
      schedule();
    }
  }

  /** Re-read the app's DOM now, so a toggle never acts on a stale picture. */
  function refresh() { nodes = readNodes(); linkList = readLinks(); }

  async function disconnect(key) {
    if (busy) return;
    refresh();
    const l = linkList.find((x) => x.key === key);
    selectedKey = null; hoverKey = null;
    if (!l) { paint(); return; } // already gone: toggling again would re-create it
    paint();
    if (await toggleViaApp(l.src, l.tgt)) announce(`Disconnected ${labelOf(l.src)} from ${labelOf(l.tgt)}`);
  }
  function onChipClick() {
    const key = chip.dataset.key;
    if (key) disconnect(key);
  }

  async function connect(src, tgt) {
    if (busy) return;
    refresh();
    if (linkList.some((l) => l.key === keyOf(src, tgt))) return flash(keyOf(src, tgt)); // toggling would remove it
    if (await toggleViaApp(src, tgt)) announce(`Linked ${labelOf(src)} to ${labelOf(tgt)}`);
  }

  function flash(key) {
    const el = linkEls.get(key);
    if (!el) return;
    el.g.classList.remove('is-flash');
    void el.g.getBoundingClientRect();
    el.g.classList.add('is-flash');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => el.g.classList.remove('is-flash'), 1000);
  }

  let live = null;
  function announce(msg) {
    if (!live) {
      live = document.createElement('div');
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
      document.body.appendChild(live);
    }
    live.textContent = '';
    setTimeout(() => { live.textContent = msg; }, 30);
  }

  /* ---------- drag a new link ---------------------------------------------- */
  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    const s = r.width / canvas.offsetWidth || 1;
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  };
  const curve = (x1, y1, x2, y2) => {
    const i = Math.max(40, Math.abs(y2 - y1) / 2);
    return `M ${x1} ${y1} C ${x1} ${y1 + i}, ${x2} ${y2 - i}, ${x2} ${y2}`;
  };

  function onUiPointerDown(e) {
    const port = e.target instanceof Element && e.target.closest('.pl-port');
    if (!port || (e.pointerType === 'mouse' && e.button !== 0) || !e.isPrimary) return;
    e.preventDefault();
    e.stopPropagation();
    const n = nodes.get(port.dataset.id);
    if (!n) return;
    const side = port.dataset.side;
    drag = { id: n.id, side, pid: e.pointerId, anchor: side === 'out' ? { x: n.x + n.w / 2, y: n.y + n.h } : { x: n.x + n.w / 2, y: n.y }, target: null, state: null };
    hoverKey = null; selectedKey = null;
    ui.setAttribute('data-dragging', '');
    document.documentElement.classList.add('pl-canvas-linking');
    rubber.style.display = '';
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragUp);
    window.addEventListener('pointercancel', onDragCancel);
    onDragMove(e);
    paint();
  }

  function dropInfo(e) {
    const els = document.elementsFromPoint(e.clientX, e.clientY);
    for (const el of els) {
      const cn = el.closest && el.closest('.cn');
      if (!cn) continue;
      const art = cn.querySelector('.sn-node');
      if (!art || !nodes.has(art.dataset.id)) continue;
      const id = art.dataset.id;
      const src = drag.side === 'out' ? drag.id : id;
      const tgt = drag.side === 'out' ? id : drag.id;
      if (id === drag.id) return { id, art, state: 'no', msg: "Can't link a node to itself" };
      if (linkList.some((l) => l.key === keyOf(src, tgt))) return { id, art, state: 'no', msg: 'Already linked' };
      return { id, art, state: 'ok', msg: `Link ${drag.side === 'out' ? 'to' : 'from'} ${nodes.get(id).label}`, src, tgt };
    }
    return null;
  }

  function onDragMove(e) {
    if (!drag || (e.pointerId !== drag.pid && e.type !== 'pointerdown')) return;
    const p = toCanvas(e);
    const hit = dropInfo(e);
    if (drag.target && (!hit || hit.art !== drag.target.art)) drag.target.art.removeAttribute('data-pl-drop');
    drag.target = hit;
    if (hit) hit.art.setAttribute('data-pl-drop', hit.state);
    drag.state = hit ? hit.state : null;

    // the line ends on the target's matching edge when over one, else at the pointer
    let end = p;
    if (hit && hit.state === 'ok') {
      const n = nodes.get(hit.id);
      end = drag.side === 'out' ? { x: n.x + n.w / 2, y: n.y } : { x: n.x + n.w / 2, y: n.y + n.h };
    }
    const d = drag.side === 'out'
      ? curve(drag.anchor.x, drag.anchor.y, end.x, end.y)
      : curve(end.x, end.y, drag.anchor.x, drag.anchor.y);
    rubberPath.setAttribute('d', d);
    rubberDot.setAttribute('cx', end.x);
    rubberDot.setAttribute('cy', end.y);
    rubber.dataset.state = hit ? hit.state : '';

    if (hit) {
      tip.textContent = hit.msg;
      tip.dataset.state = hit.state;
      tip.setAttribute('data-vis', '');
    } else {
      tip.removeAttribute('data-vis');
    }
    tip.style.left = `${p.x}px`;
    tip.style.top = `${p.y}px`;
  }

  function onDragUp(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    const hit = dropInfo(e) || drag.target;
    endDrag(true, hit);
  }
  function onDragCancel(e) { if (drag && e.pointerId === drag.pid) endDrag(false); }

  function endDrag(commit, hit) {
    const d = drag;
    drag = null;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragUp);
    window.removeEventListener('pointercancel', onDragCancel);
    document.documentElement.classList.remove('pl-canvas-linking');
    if (ui) ui.removeAttribute('data-dragging');
    if (rubber) rubber.style.display = 'none';
    if (tip) tip.removeAttribute('data-vis');
    canvas && canvas.querySelectorAll('[data-pl-drop]').forEach((el) => el.removeAttribute('data-pl-drop'));
    paint();
    if (!commit || !d || !hit) return;
    if (hit.state === 'ok') connect(hit.src, hit.tgt);
    else if (hit.msg === 'Already linked') {
      const src = d.side === 'out' ? d.id : hit.id;
      const tgt = d.side === 'out' ? hit.id : d.id;
      selectedKey = keyOf(src, tgt); paint(); flash(selectedKey);
    }
  }

  /* ---------- boot --------------------------------------------------------- */
  const P = window.Polish;
  const wake = (node) => {
    if (!(node instanceof Element)) return;
    if (node === document.body || node.matches('.nodecanvas') || node.querySelector('.nodecanvas')) schedule();
  };
  if (P && P.onMount) P.onMount(wake);
  else new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(wake))).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', schedule);
  schedule();
})();
