import ViewSwitch, { VIEWS } from "./ViewSwitch";
import { TourButton } from "../TourModal";

// Toolbar on top, both views stacked in the stage (kept mounted so switching
// never loses or regenerates content), view switch floating at the bottom
// and the tour "?" in the bottom-right corner.
export default function MainWorkspace({ toolbar, view, onViewChange, views, inert, onHelp }) {
  return (
    <main className="workspace" inert={inert ? "" : undefined}>
      {toolbar}
      <div className="ws-stage" data-view={view}>
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
        <ViewSwitch view={view} onChange={onViewChange} />
        {onHelp && <TourButton onClick={onHelp} />}
      </div>
    </main>
  );
}
