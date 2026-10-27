import { useEffect, useRef } from "react";
import { VIEWS } from "./ViewSwitch";
import { TourButton } from "../TourModal";

// Toolbar on top (it holds the view switch), both views stacked in the stage
// (kept mounted so switching never loses or regenerates content), the message /
// platform tray floating bottom centre, and the tour "?" in the bottom-right
// corner. The tray's height is kept in --tray-h so the grid can leave room
// under it and the corner controls can lift over it on narrow workspaces.
export default function MainWorkspace({ toolbar, view, views, inert, onHelp, tray }) {
  const stageRef = useRef(null);
  const trayRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    const trayEl = trayRef.current;
    if (!stage || !trayEl || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      stage.style.setProperty("--tray-h", `${trayEl.offsetHeight}px`);
    });
    observer.observe(trayEl);
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
        {tray && <div className="ws-tray" ref={trayRef}>{tray}</div>}
        {onHelp && <TourButton onClick={onHelp} />}
      </div>
    </main>
  );
}
