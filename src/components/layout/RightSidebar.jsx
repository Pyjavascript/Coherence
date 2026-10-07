// Layout dock for the Brand / context panel. On desktop the dock grows and the
// fixed-width panel slides in with it (pushing the workspace); below desktop
// the panel is a drawer over the workspace.
export default function RightSidebar({ open, children }) {
  return (
    <div className="shell-right">
      <aside id="brand-panel" className="rsb" aria-label="Brand panel" aria-hidden={!open} inert={open ? undefined : ""}>
        {children}
      </aside>
    </div>
  );
}
