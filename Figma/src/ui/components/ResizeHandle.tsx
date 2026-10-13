import { useRef, type PointerEvent } from "react";
import { LIMITS } from "../../shared/protocol";
import host from "../host";

const clamp = (v: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, v)));

// Figma plugin windows can't be resized by the user natively; this corner
// handle resizes through figma.ui.resize and reports the final size.
export default function ResizeHandle({ onResized }: { onResized: (w: number, h: number) => void }) {
  const start = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const frame = useRef(0);
  const size = useRef({ w: 0, h: 0 });

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.screenX, y: e.screenY, w: window.innerWidth, h: window.innerHeight };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    size.current = {
      w: clamp(s.w + e.screenX - s.x, LIMITS.minWidth, LIMITS.maxWidth),
      h: clamp(s.h + e.screenY - s.y, LIMITS.minHeight, LIMITS.maxHeight),
    };
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => host.resize(size.current.w, size.current.h).catch(() => undefined));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    start.current = null;
    if (size.current.w) onResized(size.current.w, size.current.h);
  };

  return (
    <div
      className="resize-handle"
      role="separator"
      aria-label="Resize window"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    />
  );
}
