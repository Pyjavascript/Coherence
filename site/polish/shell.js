/* Coherence polish — SHELL hooks (left nav, brand panel, modals, tour).
   Only adds data-pl-* attributes, CSS custom properties and transient inline
   translate/scale on tour dots (FLIP). Never touches app state. */
(() => {
  const P = window.Polish;
  if (!P) return;

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const on = () => P.enabled && !reduced();
  const tokenMs = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return fallback;
    return /ms$/.test(v) ? n : /s$/.test(v) ? n * 1000 : n;
  };
  const within = (node, sel) =>
    node instanceof Element ? [...(node.matches(sel) ? [node] : []), ...node.querySelectorAll(sel)] : [];

  /* ---------- left nav: label stagger index ---------- */
  function indexLabels() {
    const nav = document.querySelector('.lnav');
    if (!nav) return;
    nav.querySelectorAll('.lnav-label').forEach((el, i) => el.style.setProperty('--pl-li', String(Math.min(i, 8))));
  }

  /* ---------- usage ring count-up (number lives in ::after content) ---------- */
  const counting = new WeakMap();
  function countMeter(meter) {
    if (!on()) return;
    const n = Math.round(parseFloat(meter.getAttribute('data-percent') || '0'));
    if (!(n > 0)) return;
    cancelAnimationFrame(counting.get(meter) || 0);
    const ms = tokenMs('--pl-d-4', 480) * 1.5;
    const t0 = performance.now();
    meter.setAttribute('data-pl-count', '');
    const step = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      meter.style.setProperty('--pl-pct', String(Math.round(n * (1 - Math.pow(1 - p, 3)))));
      if (p < 1) counting.set(meter, requestAnimationFrame(step));
      else { meter.removeAttribute('data-pl-count'); meter.style.removeProperty('--pl-pct'); }
    };
    counting.set(meter, requestAnimationFrame(step));
  }
  const meterObs = new MutationObserver((muts) => {
    for (const m of muts) if (m.attributeName === 'data-percent') countMeter(m.target);
  });
  const watchedMeters = new WeakSet();
  function hookMeter(meter) {
    if (watchedMeters.has(meter)) return;
    watchedMeters.add(meter);
    meterObs.observe(meter, { attributes: true, attributeFilter: ['data-percent'] });
    countMeter(meter);
  }

  /* numbers in the usage popover / usage modal count up via Polish.countUp */
  function countNumbers(root) {
    if (!on()) return;
    within(root, '.rail-usage-heading strong').forEach((el) => P.countUp(el));
    within(root, '.usage-modal').forEach((modal) => {
      modal.querySelectorAll('strong, b, .usage-section-head span').forEach((el) => {
        if (el.children.length === 0 && /^\s*\d[\d,.]*\s*%?\s*$/.test(el.textContent)) P.countUp(el);
      });
    });
    within(root, '.rail-usage-bars').forEach((bars) =>
      [...bars.children].forEach((b, i) => b.style.setProperty('--pl-bi', String(i))));
  }

  /* ---------- brand panel: re-run section stagger each time it opens ---------- */
  let rsbTimer = 0;
  const shellObs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.attributeName !== 'data-right') continue;
      const shell = m.target;
      if (shell.getAttribute('data-right') === 'open' && m.oldValue !== 'open') enterRsb(shell);
    }
  });
  function enterRsb(shell) {
    const rsb = shell.querySelector('.rsb');
    if (!rsb || !on()) return;
    rsb.removeAttribute('data-pl-enter-rsb');
    void rsb.offsetWidth; // restart animations
    rsb.setAttribute('data-pl-enter-rsb', '');
    clearTimeout(rsbTimer);
    rsbTimer = setTimeout(() => rsb.removeAttribute('data-pl-enter-rsb'),
      tokenMs('--pl-d-4', 480) + 9 * tokenMs('--pl-stagger', 45) + 100);
  }
  const watchedShells = new WeakSet();
  function hookShell(shell) {
    if (watchedShells.has(shell)) return;
    watchedShells.add(shell);
    shellObs.observe(shell, { attributes: true, attributeFilter: ['data-right'], attributeOldValue: true });
  }

  /* ---------- tour: step direction + FLIP progress dots ---------- */
  const dotGeom = new WeakMap(); // button -> {x, w} in layout px (transform-free)
  const measure = (dots) => [...dots.children].forEach((b) => dotGeom.set(b, { x: b.offsetLeft, w: b.offsetWidth }));
  let lastStep = new WeakMap(); // tour -> index
  const dotsObs = new MutationObserver((muts) => {
    const seen = new Set();
    for (const m of muts) {
      const dots = m.target.closest && m.target.closest('.tour-dots');
      if (dots && !seen.has(dots)) { seen.add(dots); stepChanged(dots); }
    }
  });
  function stepChanged(dots) {
    const tour = dots.closest('.tour');
    const btns = [...dots.children];
    const idx = btns.findIndex((b) => b.classList.contains('is-on'));
    if (tour && idx >= 0) {
      const prev = lastStep.get(tour);
      if (prev != null && prev !== idx) tour.style.setProperty('--pl-dir', idx > prev ? '1' : '-1');
      lastStep.set(tour, idx);
    }
    if (!on()) { measure(dots); return; }
    btns.forEach((b) => {
      const old = dotGeom.get(b);
      const nx = b.offsetLeft, nw = b.offsetWidth;
      if (!old || !nw) return;
      const dx = (old.x + old.w / 2) - (nx + nw / 2);
      const sx = old.w / nw;
      if (Math.abs(dx) < .5 && Math.abs(sx - 1) < .01) return;
      b.removeAttribute('data-pl-flip');
      b.style.translate = `${dx}px 0`;
      b.style.scale = `${sx} 1`;
      void b.offsetWidth;
      // style is flushed by the read above, so the transition starts from the inverted state
      b.setAttribute('data-pl-flip', '');
      b.style.translate = '';
      b.style.scale = '';
      const done = (e) => {
        if (e && (e.target !== b || (e.propertyName !== 'translate' && e.propertyName !== 'scale'))) return;
        b.removeAttribute('data-pl-flip');
        b.removeEventListener('transitionend', done);
      };
      b.addEventListener('transitionend', done);
    });
    measure(dots);
  }
  const watchedDots = new WeakSet();
  function hookDots(dots) {
    if (watchedDots.has(dots)) return;
    watchedDots.add(dots);
    measure(dots);
    const tour = dots.closest('.tour');
    const idx = [...dots.children].findIndex((b) => b.classList.contains('is-on'));
    if (tour && idx >= 0) lastStep.set(tour, idx);
    dotsObs.observe(dots, { attributes: true, attributeFilter: ['class'], subtree: true });
  }
  addEventListener('resize', () => document.querySelectorAll('.tour-dots').forEach(measure));

  /* ---------- wiring ---------- */
  function scan(root) {
    if (!(root instanceof Element)) return;
    within(root, '.app-shell').forEach(hookShell);
    within(root, '.tour-dots').forEach(hookDots);
    if (!P.enabled) return;
    if (root.closest('.lnav') || within(root, '.lnav').length) indexLabels();
    within(root, '.lnav .rail-credits-meter').forEach(hookMeter);
    countNumbers(root);
  }
  P.onMount(scan);

  window.addEventListener('polish:toggle', (e) => {
    if (e.detail && e.detail.enabled) { scan(document.body); return; }
    document.querySelectorAll('[data-pl-enter-rsb]').forEach((el) => el.removeAttribute('data-pl-enter-rsb'));
    document.querySelectorAll('.rail-credits-meter[data-pl-count]').forEach((el) => {
      cancelAnimationFrame(counting.get(el) || 0);
      el.removeAttribute('data-pl-count'); el.style.removeProperty('--pl-pct');
    });
    document.querySelectorAll('.tour-dots button').forEach((b) => {
      b.removeAttribute('data-pl-flip'); b.style.translate = ''; b.style.scale = '';
    });
  });
})();
