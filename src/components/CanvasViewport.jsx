import { useCallback, useEffect, useRef, useState } from "react";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

// Pan / zoom surface for Node Studio.
export default function CanvasViewport({ children }) {
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const pinchRef = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });

  // On a phone, keep the first column fitted until the user pans or zooms.
  const autoZoom = useRef(null);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const mq = window.matchMedia("(max-width: 767.98px)");
    const fit = () => {
      if (el.clientWidth < 80) return;
      setView((current) => {
        if (autoZoom.current != null && Math.abs(current.zoom - autoZoom.current) > 0.02) return current;
        if (!mq.matches) {
          autoZoom.current = 1;
          return current.zoom === 1 && current.x === 0 && current.y === 0 ? current : { x: 0, y: 0, zoom: 1 };
        }
        const zoom = clampZoom((el.clientWidth - 24) / 400);
        autoZoom.current = zoom;
        return { x: 8, y: 0, zoom };
      });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    mq.addEventListener("change", fit);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", fit);
    };
  }, []);
  const [isPanning, setIsPanning] = useState(false);
  const viewRef = useRef(view);
  viewRef.current = view;

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

  // Two-finger pinch zoom (and pan) on touch screens. The surface sets
  // touch-action: none, so the browser leaves these gestures to us.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const measure = ([a, b]) => ({
      dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1,
      cx: (a.clientX + b.clientX) / 2,
      cy: (a.clientY + b.clientY) / 2,
    });
    const onTouchStart = (event) => {
      if (event.touches.length !== 2) return;
      // The second finger turns any one-finger pan into a pinch.
      dragRef.current = null;
      setIsPanning(false);
      pinchRef.current = { ...measure(event.touches), view: viewRef.current };
    };
    const onTouchMove = (event) => {
      const pinch = pinchRef.current;
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      const now = measure(event.touches);
      const rect = el.getBoundingClientRect();
      const start = pinch.view;
      const zoom = clampZoom(start.zoom * (now.dist / pinch.dist));
      // Keep the canvas point that started under the fingers under them.
      const worldX = (pinch.cx - rect.left - start.x) / start.zoom;
      const worldY = (pinch.cy - rect.top - start.y) / start.zoom;
      setView({ x: now.cx - rect.left - worldX * zoom, y: now.cy - rect.top - worldY * zoom, zoom });
    };
    const onTouchEnd = (event) => {
      if (event.touches.length < 2) pinchRef.current = null;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const onPointerDown = (event) => {
    if (!event.isPrimary || pinchRef.current) return;
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
