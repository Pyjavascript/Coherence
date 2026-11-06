// The boot loader (#boot in index.html) paints before any JS runs: the logo on
// white, then its colour pours out to fill the screen. The screen fades out
// only when both are true: the app is ready (this is called) and the pour has
// filled the screen (index.html adds .is-filled and fires "boot-filled"). A
// short hold on the full colour lets the fill land before the app shows.
const HOLD_MS = 300;
const FADE_MS = 600; // #boot's opacity transition in index.html
const SAFETY_MS = 4000; // the pour ends ~2.05s after load starts

let hidden = false;

export function hideBootLoader() {
  if (hidden) return;
  hidden = true;
  const el = document.getElementById("boot");
  if (!el) return;

  let started = false;
  const fadeOut = () => {
    if (started) return;
    started = true;
    setTimeout(() => {
      el.classList.add("is-done");
      setTimeout(() => el.remove(), FADE_MS + 50);
    }, HOLD_MS);
  };

  if (el.classList.contains("is-filled")) {
    fadeOut();
  } else {
    el.addEventListener("boot-filled", fadeOut, { once: true });
    // Safety net: never leave the app covered if the pour's end is missed.
    setTimeout(fadeOut, SAFETY_MS);
  }
}
