const GridIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="3" y="3" width="18" height="8" rx="2.5" />
    <rect x="3" y="13" width="8.25" height="8" rx="2.5" />
    <rect x="12.75" y="13" width="8.25" height="8" rx="2.5" />
  </svg>
);

const NodesIcon = () => (
  <svg width="31" height="24" viewBox="0 0 31 24" fill="none" aria-hidden="true">
    <path d="M12.25 7.75L8.25 14.75M18.25 7.75L23.25 14.75" stroke="currentColor" strokeWidth="1.4" />
    <rect x="20.5" y="13" width="10" height="10" rx="2" fill="currentColor" />
    <rect x="10.5" width="10" height="10" rx="2" fill="currentColor" />
    <rect y="13.5" width="10" height="10" rx="2" fill="currentColor" />
  </svg>
);

export const VIEWS = [
  { key: "quick", label: "Grid", Icon: GridIcon },
  { key: "nodes", label: "Node", Icon: NodesIcon },
];

// Grid | Node switch at the start of the toolbar: the current view's name on
// the left, then an icon-only tab per view with a sliding thumb behind the
// active one. Both names are stacked in one cell so the box never changes
// width; each tab carries its name as a label and tooltip.
export default function ViewSwitch({ view, onChange }) {
  const index = Math.max(0, VIEWS.findIndex((v) => v.key === view));
  return (
    <div className="ws-switch" style={{ "--i": index }}>
      <span className="ws-switch-name" aria-hidden="true">
        {VIEWS.map(({ key, label }) => (
          <span key={key} data-on={key === view || undefined}>{label}</span>
        ))}
      </span>
      <div className="ws-switch-tabs" role="tablist" aria-label="Workspace view">
        <span className="ws-switch-thumb" aria-hidden="true" />
        {VIEWS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`view-tab-${key}`}
            aria-selected={key === view}
            aria-controls={`view-${key}`}
            aria-label={label}
            title={label}
            className={"ws-switch-btn" + (key === view ? " on" : "")}
            onClick={() => onChange(key)}
          >
            <Icon />
          </button>
        ))}
      </div>
    </div>
  );
}
