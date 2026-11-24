import { useEffect, useRef } from "react";
import { VIEWS } from "./ViewSwitch";

// Toolbar on top (it holds the view switch), both views stacked in the stage
// (kept mounted so switching never loses or regenerates content), and the
// bottom row, centred: the dock (GenerateDock.jsx: pricing, generate, and
// the message box it opens into). In the bottom-right corner, the "Built by"
// credit (on phones, centred under the dock). The tray's height is kept in
// --tray-h so the grid can leave room under it.

// One Quick Grid column's width: the grid's content width split into --qg-cols
// columns (layout.css) less the gaps between them. Works while the grid is
// hidden (no cards): it reads the scroller around it. NaN when there's no grid.
function columnWidth(gridEl) {
  const scroller = gridEl?.parentElement;
  if (!scroller) return NaN;
  if (scroller.classList.contains("is-carousel")) {
    return Math.min(...[...gridEl.querySelectorAll(":scope > .ncard")].map((card) => card.offsetWidth).filter(Boolean));
  }
  const grid = getComputedStyle(gridEl);
  const box = getComputedStyle(scroller);
  const cols = parseInt(grid.getPropertyValue("--qg-cols"), 10) || 1;
  const gap = parseFloat(grid.columnGap) || 0;
  const inner = scroller.clientWidth - parseFloat(box.paddingLeft) - parseFloat(box.paddingRight);
  return inner > 0 ? (inner - gap * (cols - 1)) / cols : NaN;
}

const CREDIT_GAP = 12; // composer.css --tray-gap: the room between the row and the credit
const MIN_BOX = 300; // the narrowest the open message box may get to make room for the credit

// An element's left edge in the page's layout, ignoring transforms.
function layoutLeft(el) {
  let x = 0;
  for (let node = el; node; node = node.offsetParent) x += node.offsetLeft;
  return x;
}

export default function MainWorkspace({ toolbar, view, views, inert, tray }) {
  const stageRef = useRef(null);
  const trayRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    const trayEl = trayRef.current;
    if (!stage || !trayEl || typeof ResizeObserver === "undefined") return undefined;
    const gridEl = stage.querySelector(".ws-view-quick .qg-grid");
    // Node Studio's canvas spans the whole window (under the rail too), so
    // its zoom controls are placed at the bottom row's left edge by
    // measurement (--row-left: the row's left from the canvas's left).
    const surfaceEl = stage.querySelector(".ws-view-nodes .canvas-surface");
    // The bottom-right credit: the row keeps its width clear on both sides
    // (--credit-room; 0 when it's hidden, on phones).
    const creditEl = stage.querySelector(".ws-credit");
    const measure = () => {
      stage.style.setProperty("--tray-h", `${trayEl.offsetHeight}px`);
      // Room for the credit only if the open box still fits beside it (at
      // least MIN_BOX wide). Otherwise the credit steps out. Phones put the
      // credit under the dock instead, so the row needs no room for it.
      const phone = stage.closest(".app-shell")?.dataset.bp === "mobile";
      const creditW = phone ? 0 : creditEl?.offsetWidth || 0;
      const room = creditW ? creditW + CREDIT_GAP : 0;
      const fits = phone || (room > 0 && trayEl.offsetWidth - 2 * room >= MIN_BOX);
      stage.style.setProperty("--credit-room", `${fits ? room : 0}px`);
      stage.dataset.credit = fits ? "on" : "off";
      if (surfaceEl) {
        // Layout offsets, not on-screen rects: the hidden view is drawn
        // slightly scaled (its fade-in), which would skew a rect.
        stage.style.setProperty("--row-left", `${layoutLeft(trayEl) - layoutLeft(surfaceEl)}px`);
      }
      // The composer is one grid column wide: the width one card has when its
      // row is full (3 across on laptops). Measured from the grid's columns, not
      // the cards, so closing a card (its row-mates widen to fill the row)
      // doesn't resize it. The phone carousel shows one card at a time: its width.
      const cardW = columnWidth(gridEl);
      if (Number.isFinite(cardW)) stage.style.setProperty("--card-w", `${cardW}px`);
      else stage.style.removeProperty("--card-w");
    };
    const observer = new ResizeObserver(measure);
    observer.observe(trayEl);
    // The stage too: the rail settling its width moves the row sideways.
    observer.observe(stage);
    if (gridEl) observer.observe(gridEl);
    if (surfaceEl) observer.observe(surfaceEl);
    if (creditEl) observer.observe(creditEl);
    // The row slides with the brand panel (a transition, not a resize of
    // anything watched): measure again once it settles.
    trayEl.addEventListener("transitionend", measure);
    if (gridEl?.parentElement) observer.observe(gridEl.parentElement);
    // Each card is watched too (cards settle into their columns after they
    // mount, without the grid itself resizing), including cards added later.
    const watchCards = () => gridEl?.querySelectorAll(":scope > .ncard").forEach((card) => observer.observe(card));
    watchCards();
    const cards = gridEl && typeof MutationObserver !== "undefined"
      ? new MutationObserver(() => { watchCards(); measure(); })
      : null;
    cards?.observe(gridEl, { childList: true });
    return () => {
      observer.disconnect();
      cards?.disconnect();
      trayEl.removeEventListener("transitionend", measure);
    };
  }, []);

  return (
    <main className="workspace" inert={inert ? "" : undefined}>
      {toolbar}
      <div className="ws-stage" data-view={view} ref={stageRef}>
        {/* The bottom-right corner: who built it, the logo beside two lines.
            First in the stage so, on the Quick Grid, the views (drawn after
            it) cover it: cards scrolling down pass over it (composer.css). */}
        <p className="ws-credit">
          <svg className="ws-credit-mark" viewBox="3.5 0 21.15 21" fill="currentColor" aria-hidden="true">
            <path d="M15.578 6v3h-3.002V6zM15.578 12v3h-3.002v-3zM24.648 12v3h-3.002v-3zM3.508 12v3h3.002v-3zM15.602 0v3h3.002V0zM12.555 0v3H9.552V0zM18.604 12h-3.002V9h3.002zM21.628 18h-3.003v-3h3.003zM6.529 18h3.002v-3H6.529zM18.622 5.988h3.003v-3h-3.003zM9.542 5.988H6.539v-3h3.003zM18.604 21h-3.002v-3h3.002zM9.552 21h3.003v-3H9.552zM21.646 9h3.002V6h-3.002zM6.51 9H3.508V6H6.51zM12.557 12H9.555V9h3.002z" />
          </svg>
          <span className="ws-credit-text">
            <span className="ws-credit-by">Built by</span>
            <span className="ws-credit-name">Pixels Creative Technologies</span>
          </span>
        </p>
        {VIEWS.map((v) => (
          <section
            key={v.key}
            id={`view-${v.key}`}
            role="tabpanel"
            aria-labelledby={`view-tab-${v.key}`}
            className={"ws-view ws-view-" + v.key}
            data-active={v.key === view}
            inert={v.key === view ? undefined : ""}
          >
            {views[v.key]}
          </section>
        ))}
        <div className="ws-tray" ref={trayRef}>
          {tray}
        </div>
      </div>
    </main>
  );
}
