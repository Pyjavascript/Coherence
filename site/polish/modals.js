/* Coherence polish: smooth modal growth.
   Modals size to their content (min 470px, max 85vh). CSS can't tween between
   two `height:auto` values, so when a dialog's natural height changes (e.g. the
   Hook generator receiving another result) this animates the old height to the
   new one. Never touches layout or React state; it only plays a Web Animation. */
(() => {
  const P = window.Polish;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seen = new WeakSet();

  function watch(shell) {
    if (seen.has(shell)) return;
    seen.add(shell);
    let last = null;      // last settled height
    const born = performance.now(); // don't tween while the dialog is still entering
    let anim = null;
    const ro = new ResizeObserver(() => {
      if (anim) return;   // ignore the sizes our own animation produces
      const h = shell.getBoundingClientRect().height;
      // getBoundingClientRect includes the entrance scale; use layout height instead
      const lh = shell.offsetHeight;
      if (last === null || performance.now() - born < 500) { last = lh; return; }
      if (Math.abs(lh - last) < 2) { last = lh; return; }
      if (!P || !P.enabled || reduce() || !shell.animate) { last = lh; return; }
      const from = last; last = lh;
      anim = shell.animate(
        [{ height: from + 'px' }, { height: lh + 'px' }],
        { duration: 320, easing: 'cubic-bezier(.22, 1, .36, 1)' }
      );
      const done = () => { anim = null; last = shell.offsetHeight; };
      anim.onfinish = done; anim.oncancel = done;
      void h;
    });
    ro.observe(shell);
  }

  const scan = (root) => {
    if (!(root instanceof Element)) return;
    if (root.matches('.overlay > [role=dialog], .overlay > [role=alertdialog]')) watch(root);
    root.querySelectorAll?.('.overlay > [role=dialog], .overlay > [role=alertdialog]').forEach(watch);
  };
  new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(scan)))
    .observe(document.documentElement, { childList: true, subtree: true });
  scan(document.body);
})();
