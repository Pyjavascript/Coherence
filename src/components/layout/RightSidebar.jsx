// Layout anchor for the Brand / context panel. On desktop the panel is a
// column of the navy frame right of the workspace, which shrinks to make room
// (workspace-theme.css); below desktop it is a drawer over the workspace.
export default function RightSidebar({ open, children }) {
  return (
    <div className="shell-right">
      <aside
        id="brand-panel"
        className="rsb"
        aria-label="Brand panel"
        aria-hidden={!open}
        inert={open ? undefined : ""}
      >
        {children}
      </aside>
    </div>
  );
}
