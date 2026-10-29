import { useEffect, useRef, useState } from "react";
import { reducedMotion, tokenMs } from "../../lib/motion";

// Layout anchor for the Brand / context panel. On desktop the panel floats as a
// card over the workspace's right side (taking no room); below desktop it is a
// drawer over the workspace.
export default function RightSidebar({ open, children }) {
  // The panel's sections rise in one after another each time it opens.
  const [entering, setEntering] = useState(false);
  const wasOpen = useRef(open);

  useEffect(() => {
    const opened = open && !wasOpen.current;
    wasOpen.current = open;
    if (!opened || reducedMotion()) {
      setEntering(false);
      return undefined;
    }
    setEntering(true);
    const timer = setTimeout(
      () => setEntering(false),
      tokenMs("--pl-d-4", 480) + 9 * tokenMs("--pl-stagger", 45) + 100,
    );
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <div className="shell-right">
      <aside
        id="brand-panel"
        className="rsb"
        aria-label="Brand panel"
        aria-hidden={!open}
        inert={open ? undefined : ""}
        data-pl-enter-rsb={entering || undefined}
      >
        {children}
      </aside>
    </div>
  );
}
