/* Coherence polish — Node Studio hooks (studio agent).
   Only adds data-pl-* attributes, a pathLength attribute on connector paths
   for the duration of a draw-in, and CSS custom properties. Never touches the
   app's inline transforms, pointer handling or React-owned classes. */
(() => {
  const P = window.Polish;
  if (!P) return;

  const ENTER_ATTR = 'data-pl-studio-enter';
  const DRAW_ATTR = 'data-pl-draw';
  const MAX_STAGGER = 8;
  let enterTimer = 0;

  const ms = (v, fallback) => {
    const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(v));
    return Number.isFinite(n) ? n : fallback;
  };

  /* ---- connectors: draw-in -------------------------------------------- */
  function clearDraw(el) {
    el.removeAttribute(DRAW_ATTR);
    el.style.removeProperty('--pl-draw-delay');
    if (el.dataset.plPathLength) { el.removeAttribute('pathLength'); delete el.dataset.plPathLength; }
  }
  function draw(el, delay = 0) {
    if (!P.enabled || !(el instanceof SVGElement)) return;
    if (el.tagName === 'path' && !el.hasAttribute('pathLength')) {
      el.setAttribute('pathLength', '1');
      el.dataset.plPathLength = '1';
    }
    el.style.setProperty('--pl-draw-delay', `${Math.round(delay)}ms`);
    el.removeAttribute(DRAW_ATTR); // re-adding next frame restarts the animation
    requestAnimationFrame(() => {
      if (!P.enabled) return;
      el.setAttribute(DRAW_ATTR, '');
      el.addEventListener('animationend', function done(ev) {
        if (ev.target !== el) return;
        el.removeEventListener('animationend', done);
        clearDraw(el);
      });
    });
  }
  function drawAll(root, baseDelay = 0) {
    root.querySelectorAll('.nodesvg path, .nodesvg circle').forEach((el) => {
      draw(el, el.tagName === 'circle' ? baseDelay + ms('--pl-d-3', 320) : baseDelay);
    });
  }

  /* ---- entering the studio: cascade nodes, then draw links ------------- */
  function enterStudio(view) {
    if (!P.enabled || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cards = [...view.querySelectorAll('.cn')];
    cards
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left)
      .forEach(({ el }, i) => el.style.setProperty('--pl-i', String(Math.min(i, MAX_STAGGER))));
    view.removeAttribute(ENTER_ATTR);
    void view.offsetWidth; // restart
    view.setAttribute(ENTER_ATTR, '');
    const stagger = ms('--pl-stagger', 45);
    const total = 80 + ms('--pl-d-4', 480) + Math.min(cards.length, MAX_STAGGER) * stagger;
    drawAll(view, 80 + ms('--pl-d-3', 320));
    clearTimeout(enterTimer);
    enterTimer = setTimeout(() => {
      view.removeAttribute(ENTER_ATTR);
      cards.forEach((el) => el.style.removeProperty('--pl-i'));
    }, total + 50);
  }

  /* ---- observers ------------------------------------------------------- */
  const attrObserver = new MutationObserver((muts) => {
    if (!P.enabled) return;
    for (const m of muts) {
      const t = m.target;
      if (m.attributeName === 'data-active' && t.classList.contains('ws-view-nodes')
          && t.getAttribute('data-active') === 'true' && m.oldValue !== 'true') {
        enterStudio(t);
      }
    }
  });
  attrObserver.observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-active'], attributeOldValue: true, subtree: true,
  });

  // New connectors created while working in the studio draw themselves in.
  P.onMount((node) => {
    if (!P.enabled || !(node instanceof Element)) return;
    if (node === document.body) return; // initial scan: nothing to animate
    const inSvg = node.closest && node.closest('.nodesvg');
    if (!inSvg) return;
    const view = node.closest('.ws-view-nodes');
    if (!view || view.getAttribute('data-active') !== 'true') return;
    const els = node.matches('path, circle') ? [node] : [...node.querySelectorAll('path, circle')];
    els.forEach((el) => draw(el, el.tagName === 'circle' ? ms('--pl-d-3', 320) : 0));
  });

  /* ---- toggle cleanup -------------------------------------------------- */
  function cleanup() {
    clearTimeout(enterTimer);
    document.querySelectorAll(`[${ENTER_ATTR}]`).forEach((el) => el.removeAttribute(ENTER_ATTR));
    document.querySelectorAll('.ws-view-nodes .cn').forEach((el) => el.style.removeProperty('--pl-i'));
    document.querySelectorAll(`[${DRAW_ATTR}], [data-pl-path-length]`).forEach(clearDraw);
  }
  window.addEventListener('polish:toggle', (e) => { if (!e.detail || !e.detail.enabled) cleanup(); });
})();
