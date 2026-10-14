/* polish: grid hooks — Quick Grid card enter stagger + copy-button pop.
   Only adds data-pl-* attributes / CSS custom properties; never touches
   React-owned classes, attributes the app reads, or DOM structure. */
(() => {
  const P = window.Polish;
  if (!P) return;

  const CARD = '.qg-grid > .ncard';

  // Staggered rise-in for cards that mount together (first load, view switch).
  P.registerEnter(CARD, '.qg-grid');

  // A card added on its own (e.g. "Add node") should not wait for a stagger
  // slot based on its grid position. motion.js scans before mount hooks run,
  // so this override lands before the first frame.
  P.onMount((node) => {
    if (!P.enabled || !(node instanceof Element)) return;
    if (node.matches(CARD) && node.hasAttribute('data-pl-enter')) {
      node.style.setProperty('--pl-i', '0');
    }
  });

  // Copy button: transient spring pop on click.
  const clearPop = (btn) => btn.removeAttribute('data-pl-pop');
  document.addEventListener('click', (e) => {
    if (!P.enabled) return;
    const btn = e.target instanceof Element && e.target.closest('.ncard-action[aria-label^="Copy"]');
    if (!btn || btn.disabled) return;
    clearPop(btn);
    void btn.offsetWidth; // restart the keyframe on rapid repeat clicks
    btn.setAttribute('data-pl-pop', '');
    const done = (ev) => {
      if (ev.target !== btn) return;
      clearPop(btn);
      btn.removeEventListener('animationend', done);
    };
    btn.addEventListener('animationend', done);
    setTimeout(() => clearPop(btn), 800); // safety net
  }, true);

  // Polish turned off: drop any transient attributes we added.
  window.addEventListener('polish:toggle', (e) => {
    if (e.detail && e.detail.enabled) return;
    document.querySelectorAll('[data-pl-pop]').forEach(clearPop);
  });
})();
