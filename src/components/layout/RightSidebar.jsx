// Layout anchor for the Brand / context panel. On desktop the panel floats as a
// card over the workspace's right side (taking no room); below desktop it is a
// drawer over the workspace.
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
