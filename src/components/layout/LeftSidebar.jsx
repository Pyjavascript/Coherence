// Layout dock for the navigation rail. Its in-flow width (styles/layout.css)
// is what the workspace resizes against; below desktop the rail overlays.
export default function LeftSidebar({ hidden, children }) {
  return (
    <div className="shell-left" inert={hidden ? "" : undefined}>
      {children}
    </div>
  );
}
