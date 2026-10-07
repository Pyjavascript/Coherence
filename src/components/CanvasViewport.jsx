import { useCallback, useEffect, useRef, useState } from "react";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

// Pan / zoom surface for Node Studio.
export default function CanvasViewport({ children }) {
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);

  const zoomAt = useCallback((nextZoom, clientX, clientY) => {
    const viewport = viewportRef.current;
    const zoom = clampZoom(nextZoom);
    if (!viewport) {
      setView((current) => ({ ...current, zoom }));
      return;
    }
    const rect = viewport.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    setView((current) => ({
      x: px - ((px - current.x) / current.zoom) * zoom,
      y: py - ((py - current.y) / current.zoom) * zoom,
      zoom,
    }));
  }, []);

  // Native, non-passive listener: React's onWheel is passive, so it can't preventDefault.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const onWheel = (event) => {
      // Node textareas grow with their content, so wheel over them pans the canvas too.
      if (event.target.closest?.("select, .share-menu")) return;
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        setView((current) => {
          const rect = el.getBoundingClientRect();
          const zoom = clampZoom(current.zoom * Math.exp(-event.deltaY * 0.002));
          const px = event.clientX - rect.left;
          const py = event.clientY - rect.top;
          return { x: px - ((px - current.x) / current.zoom) * zoom, y: py - ((py - current.y) / current.zoom) * zoom, zoom };
        });
        return;
      }
      setView((current) => ({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (event) => {
    if (event.button !== 0 || event.target.closest("button, input, textarea, select, a, .node, .nodebar, .canvas-controls")) return;
    event.preventDefault();
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: view.x, originY: view.y };
    setIsPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setView((current) => ({
      ...current,
      x: drag.originX + event.clientX - drag.x,
      y: drag.originY + event.clientY - drag.y,
    }));
  };

  const stopDragging = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsPanning(false);
    }
  };

  const changeZoom = (amount) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    zoomAt(view.zoom + amount, rect ? rect.left + rect.width / 2 : 0, rect ? rect.top + rect.height / 2 : 0);
  };

  return (
    <div
      className="canvas-surface"
      data-mode="nodes"
      data-panning={isPanning || undefined}
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      style={{
        "--canvas-dot-size": `${18 * view.zoom}px`,
        "--canvas-dot-x": `${view.x}px`,
        "--canvas-dot-y": `${view.y}px`,
      }}
    >
      <div className="canvas-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
        {children}
      </div>
      <div className="canvas-controls" aria-label="Canvas zoom controls">
        <button type="button" onClick={() => changeZoom(-0.1)} aria-label="Zoom out">−</button>
        <button type="button" className="canvas-zoom-level" onClick={() => setView({ x: 0, y: 0, zoom: 1 })} title="Reset view">
          {Math.round(view.zoom * 100)}%
        </button>
        <button type="button" onClick={() => changeZoom(0.1)} aria-label="Zoom in">+</button>
      </div>
    </div>
  );
}
