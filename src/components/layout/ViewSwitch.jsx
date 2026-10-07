const GridIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="3" y="3" width="18" height="8" rx="2.5" />
    <rect x="3" y="13" width="8.25" height="8" rx="2.5" />
    <rect x="12.75" y="13" width="8.25" height="8" rx="2.5" />
  </svg>
);

const NodesIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="9" y="2.5" width="6" height="6" rx="1.6" />
    <rect x="2.5" y="15.5" width="6" height="6" rx="1.6" />
    <rect x="15.5" y="15.5" width="6" height="6" rx="1.6" />
    <path d="M12 8.5 5.5 15.5M12 8.5l6.5 7" stroke="currentColor" strokeWidth="2.2" fill="none" />
  </svg>
);

export const VIEWS = [
  { key: "nodes", label: "Node Studio", Icon: NodesIcon },
  { key: "quick", label: "Quick Grid", Icon: GridIcon },
];

// Segmented Quick Grid | Node Studio control with a sliding thumb.
export default function ViewSwitch({ view, onChange }) {
  const index = Math.max(0, VIEWS.findIndex((v) => v.key === view));
  return (
    <div className="ws-switch" role="tablist" aria-label="Workspace view" style={{ "--i": index }}>
      <span className="ws-switch-thumb" aria-hidden="true" />
      {VIEWS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          role="tab"
          id={`view-tab-${key}`}
          aria-selected={key === view}
          aria-controls={`view-${key}`}
          className={"ws-switch-btn" + (key === view ? " on" : "")}
          onClick={() => onChange(key)}
        >
          <span>{label}</span>
          <Icon />
        </button>
      ))}
    </div>
  );
}
