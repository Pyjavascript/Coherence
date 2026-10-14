/* Coherence polish layer — shared runtime helpers.
   Never changes app state or React-owned attributes the app reads; it only adds
   data-pl-* attributes / CSS custom properties that the polish CSS keys off. */
(() => {
  const KEY = 'pl-motion';
  const root = document.documentElement;
  const read = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
  const write = (on) => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {} };

  const enterRules = [];   // { selector, group? }
  const mountHooks = [];   // fn(el) called for every added element subtree root

  const Polish = {
    enabled: read(),
    /** Tag elements matching `selector` with data-pl-enter + a stagger index when React mounts them.
        `group` (optional) is a selector for the parent whose children share one stagger sequence. */
    registerEnter(selector, group) { enterRules.push({ selector, group }); scan(document.body); },
    /** Run fn(el) for every element added to the DOM (and once for the existing DOM). */
    onMount(fn) { mountHooks.push(fn); try { fn(document.body); } catch (e) { console.warn('[polish]', e); } },
    setEnabled(on) {
      Polish.enabled = on;
      root.classList.toggle('motion-off', !on);
      document.querySelectorAll('link[data-polish]').forEach((l) => { l.disabled = !on; });
      const btn = document.querySelector('.pl-compare');
      if (btn) btn.setAttribute('aria-pressed', String(on));
      write(on);
      window.dispatchEvent(new CustomEvent('polish:toggle', { detail: { enabled: on } }));
    },
    /** Animate a number in an element from 0 → its current numeric text. */
    countUp(el, ms = 700) {
      if (!Polish.enabled || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const m = el.textContent.match(/-?\d+(\.\d+)?/);
      if (!m) return;
      const target = parseFloat(m[0]); const tpl = el.textContent; const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / ms); const e = 1 - Math.pow(1 - p, 3);
        el.textContent = tpl.replace(m[0], String(Math.round(target * e)));
        if (p < 1) requestAnimationFrame(step); else el.textContent = tpl;
      };
      requestAnimationFrame(step);
    },
  };
  window.Polish = Polish;

  function scan(node) {
    if (!(node instanceof Element) || !Polish.enabled) return;
    for (const { selector, group } of enterRules) {
      const hits = node.matches(selector) ? [node] : [];
      hits.push(...node.querySelectorAll(selector));
      hits.forEach((el) => {
        if (el.hasAttribute('data-pl-enter') || el.dataset.plSeen) return;
        let i = 0;
        const parent = group ? el.closest(group) : el.parentElement;
        if (parent) i = [...parent.querySelectorAll(selector)].indexOf(el);
        el.style.setProperty('--pl-i', String(Math.max(0, i)));
        el.setAttribute('data-pl-enter', '');
        el.dataset.plSeen = '1';
        el.addEventListener('animationend', function done(ev) {
          if (ev.target !== el) return;
          el.removeAttribute('data-pl-enter');
          el.removeEventListener('animationend', done);
        });
      });
    }
  }

  new MutationObserver((muts) => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (!(n instanceof Element)) continue;
      scan(n);
      for (const fn of mountHooks) { try { fn(n); } catch (e) { console.warn('[polish]', e); } }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  // Compare toggle (demo UI) + "M" shortcut when not typing
  function mountToggle() {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pl-compare';
    b.setAttribute('aria-pressed', String(Polish.enabled));
    b.title = 'Toggle the motion & polish layer (M)';
    b.innerHTML = 'Motion <span class="pl-compare-track" aria-hidden="true"></span>';
    b.addEventListener('click', () => Polish.setEnabled(!Polish.enabled));
    document.body.appendChild(b);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'm' && e.key !== 'M') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    Polish.setEnabled(!Polish.enabled);
  });

  const init = () => { mountToggle(); Polish.setEnabled(Polish.enabled); scan(document.body); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
