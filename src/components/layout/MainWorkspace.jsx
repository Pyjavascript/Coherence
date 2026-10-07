import ViewSwitch, { VIEWS } from "./ViewSwitch";

// Toolbar on top, both views stacked in the stage (kept mounted so switching
// never loses or regenerates content), view switch floating at the bottom.
export default function MainWorkspace({ toolbar, view, onViewChange, views, inert }) {
  return (
    <main className="workspace" inert={inert ? "" : undefined}>
      {toolbar}
      <div className="ws-stage">
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
      </div>
    </main>
  );
}
