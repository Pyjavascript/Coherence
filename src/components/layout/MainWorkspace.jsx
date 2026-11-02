import { useEffect, useRef } from "react";
import { VIEWS } from "./ViewSwitch";
import { TourButton } from "../TourModal";

// Toolbar on top (it holds the view switch), both views stacked in the stage
// (kept mounted so switching never loses or regenerates content), and the
// bottom row: trayStart (the hook bolt) in the left corner, and on the right
// the tray: the tour "?", Node Studio's zoom controls, then Generate in the
// very corner. The tray's height is kept in --tray-h so the grid can leave
// room under it. The zoom controls live in the canvas, so the tray keeps a gap
// for them after the "?" (--zoom-room, their width plus the gap) and they sit
// just left of Generate (--cta-room, its width plus the gap).
const ZOOM_GAP = 12; // composer.css --tray-gap

export default function MainWorkspace({ toolbar, view, views, inert, onHelp, tray, trayStart }) {
  const stageRef = useRef(null);
  const trayRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    const trayEl = trayRef.current;
    if (!stage || !trayEl || typeof ResizeObserver === "undefined") return undefined;
    const zoomEl = stage.querySelector(".ws-view-nodes .canvas-controls");
    const ctaEl = trayEl.querySelector(".gen-cta");
    const observer = new ResizeObserver(() => {
      stage.style.setProperty("--tray-h", `${trayEl.offsetHeight}px`);
      const zoomW = zoomEl?.offsetWidth || 0;
      stage.style.setProperty("--zoom-room", `${zoomW ? zoomW + ZOOM_GAP : 0}px`);
      stage.style.setProperty("--cta-room", `${(ctaEl?.offsetWidth || 0) + ZOOM_GAP}px`);
    });
    observer.observe(trayEl);
    if (zoomEl) observer.observe(zoomEl);
    if (ctaEl) observer.observe(ctaEl);
    return () => observer.disconnect();
  }, []);

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
        {trayStart && <div className="ws-tray-start">{trayStart}</div>}
        <div className="ws-tray" ref={trayRef}>
          {onHelp && <TourButton onClick={onHelp} />}
          {tray}
        </div>
      </div>
    </main>
  );
}
