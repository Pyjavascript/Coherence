import { useEffect, useRef } from "react";
import { VIEWS } from "./ViewSwitch";
import { TourButton } from "../TourModal";

// Toolbar on top (it holds the view switch), both views stacked in the stage
// (kept mounted so switching never loses or regenerates content), and the
// bottom row: in the left corner trayStart (the "Pro" button, free plan only)
// and the tour "?"; in the middle the tray: the message composer with its
// Generate arrow (GenerateDock.jsx). The tray's height is kept in --tray-h so
// the grid can leave room under it. Node Studio's zoom controls live in the
// canvas, in the bottom-right corner. The composer keeps clear of the left
// group (--start-room) on both sides, so it stays centred.
const ZOOM_GAP = 12; // composer.css --tray-gap

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

export default function MainWorkspace({ toolbar, view, views, inert, onHelp, tray, trayStart }) {
  const stageRef = useRef(null);
  const trayRef = useRef(null);
  const startRef = useRef(null);
  // The bottom-left group: "Pro" (free plan only) and the tour "?" (always).
  const hasStart = Boolean(trayStart || onHelp);
  const hasPro = Boolean(trayStart); // its width changes the left group's

  useEffect(() => {
    const stage = stageRef.current;
    const trayEl = trayRef.current;
    if (!stage || !trayEl || typeof ResizeObserver === "undefined") return undefined;
    const zoomEl = stage.querySelector(".ws-view-nodes .canvas-controls");
    const gridEl = stage.querySelector(".ws-view-quick .qg-grid");
    const startEl = startRef.current;
    const measure = () => {
      stage.style.setProperty("--tray-h", `${trayEl.offsetHeight}px`);
      // The composer is one grid column wide: the width one card has when its
      // row is full (3 across on laptops). Measured from the grid's columns, not
      // the cards, so closing a card (its row-mates widen to fill the row)
      // doesn't resize it. The phone carousel shows one card at a time: its width.
      const cardW = columnWidth(gridEl);
      if (Number.isFinite(cardW)) stage.style.setProperty("--card-w", `${cardW}px`);
      else stage.style.removeProperty("--card-w");
      const zoomW = zoomEl?.offsetWidth || 0;
      stage.style.setProperty("--zoom-room", `${zoomW ? zoomW + ZOOM_GAP : 0}px`);
      const startW = startEl?.offsetWidth || 0;
      stage.style.setProperty("--start-room", `${startW ? startW + ZOOM_GAP : 0}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(trayEl);
    if (zoomEl) observer.observe(zoomEl);
    if (gridEl) observer.observe(gridEl);
    if (gridEl?.parentElement) observer.observe(gridEl.parentElement);
    if (startEl) observer.observe(startEl);
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
    };
  }, [hasStart, hasPro]);

  return (
    <main className="workspace" inert={inert ? "" : undefined}>
      {toolbar}
      <div className="ws-stage" data-view={view} ref={stageRef}>
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
        {hasStart && (
          <div className="ws-tray-start" ref={startRef}>
            {trayStart}
            {/* Tour "?": reopens the product tour. */}
            {onHelp && <TourButton onClick={onHelp} />}
          </div>
        )}
        <div className="ws-tray" ref={trayRef}>
          {tray}
        </div>
      </div>
    </main>
  );
}
