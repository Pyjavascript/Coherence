/* Coherence polish — account modals (profile + usage).
   Profile: moves "Log out" into the bottom action area and makes Cancel revert
   unsaved edits in place (Save / Cancel visibility itself is pure CSS, keyed off
   the Save button's disabled state, which the app already derives from the form).
   Usage: exposes each quota row's fill ratio to CSS.
   The app owns all state; this only reads the DOM, re-fires `input` events to put
   the original values back, and sets presentation attributes / custom properties. */
(() => {
  /* ---------- profile ------------------------------------------------------ */
  const setValue = (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true })); // React's onChange listens for this
  };

  function setupProfile(form) {
    if (form.dataset.plAccount) return;
    form.dataset.plAccount = '1';

    // Settings-sheet rows: helper text under Name / Email, and Log out + Delete account
    // as "copy left, button right" rows above the footer.
    form.querySelectorAll('.profile-row-label').forEach((l) => {
      const t = l.textContent.trim().toLowerCase();
      if (t === 'name') l.dataset.desc = 'Shown on your profile.';
      else if (t.startsWith('email')) l.dataset.desc = "Used to sign in. Can't be changed.";
    });
    const actions = form.querySelector('.profile-actions');
    const del = actions && actions.querySelector('.profile-delete');
    const logout = form.querySelector('.profile-head .profile-pill');
    if (actions && (del || logout)) {
      const rows = document.createElement('div');
      rows.className = 'pl-acct-rows';
      const row = (title, text, btn) => {
        const r = document.createElement('div');
        r.className = 'pl-acct-row';
        const copy = document.createElement('div');
        copy.className = 'pl-acct-copy';
        copy.innerHTML = `<strong>${title}</strong><p>${text}</p>`;
        r.append(copy, btn);
        rows.append(r);
      };
      if (logout) row('Log out', 'Sign out of Coherence on this device.', logout);
      if (del) row('Delete account', 'Permanently remove your account and everything saved in it.', del);
      actions.before(rows);
    }

    const names = [...form.querySelectorAll('.profile-name-fields input')];
    const baseNames = names.map((i) => i.value);
    const photoSrc = () => {
      const img = form.querySelector('.profile-photo-trigger img');
      return img ? img.getAttribute('src') || '' : '';
    };
    const basePhoto = photoSrc();

    form.addEventListener('click', (e) => {
      const cancel = e.target instanceof Element && e.target.closest('.profile-cancel');
      if (!cancel || cancel.disabled) return;
      // A new photo lives in the app's state, which only closing the dialog resets:
      // let the app's own Cancel (close) run in that case.
      if (photoSrc() !== basePhoto) return;
      e.preventDefault();
      e.stopPropagation();
      names.forEach((input, i) => { if (input.value !== baseNames[i]) setValue(input, baseNames[i]); });
      if (names[0]) names[0].focus({ preventScroll: true });
    });
  }

  /* ---------- usage -------------------------------------------------------- */
  function enhanceUsage(modal) {
    modal.querySelectorAll('.uc-row').forEach((row) => {
      const [label, value] = row.children;
      if (!label || !value) return;
      row.dataset.plKind = /hook/i.test(label.textContent) ? 'hooks' : 'brands';
      const m = /(\d+)\s*of\s*(\d+)/.exec(value.textContent);
      const p = m && +m[2] > 0 ? Math.min(1, +m[1] / +m[2]) : 0;
      if (row.style.getPropertyValue('--pl-p') !== String(p)) row.style.setProperty('--pl-p', String(p));
    });
  }
  const watched = new WeakSet();
  function watchUsage(modal) {
    if (watched.has(modal)) return;
    watched.add(modal);
    enhanceUsage(modal);
    new MutationObserver(() => enhanceUsage(modal)).observe(modal, { subtree: true, childList: true, characterData: true });
  }

  /* ---------- wiring ------------------------------------------------------- */
  const scan = (root) => {
    if (!(root instanceof Element)) return;
    root.querySelectorAll('.profile-modal:not(.usage-modal):not(.profile-confirm) form').forEach(setupProfile);
    if (root.matches('.profile-modal:not(.usage-modal):not(.profile-confirm) form')) setupProfile(root);
    root.querySelectorAll('.usage-modal').forEach(watchUsage);
    if (root.matches('.usage-modal')) watchUsage(root);
  };
  new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(scan)))
    .observe(document.documentElement, { childList: true, subtree: true });
  scan(document.body);
})();
