import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { prefersReducedMotion } from "./useBreakpoint";

// FLIP-animates the children of `containerRef` (each tagged `data-flip-id`)
// whenever `key` changes and they jump to a new position or width: cards
// added or removed (the rest slide over and widen into the room), or a new
// column count.
// When only the container resizes (a side panel sliding in, the window
// resizing) the cards follow the layout as it moves and nothing is tweened:
// a tween there would hold a card at its old width while the grid keeps
// shrinking, so neighbours would overlap and then snap apart.
const JUMP = 24;

export function useFlip(containerRef, key) {
  const rects = useRef(new Map());

  // fromResize: only re-measure, so the next real change starts from here.
  const play = useCallback((fromResize = false) => {
    const root = containerRef.current;
    if (!root) return;
    const next = new Map();
    const animate = !fromResize && !prefersReducedMotion();
    for (const el of root.children) {
      const id = el.dataset.flipId;
      if (!id) continue;
      // A width tween changes offsetWidth, so the real width can only be read
      // without it. A resize leaves a running tween alone and keeps its target.
      const flipping = el.getAnimations?.().find((a) => a.id === "flip");
      if (flipping?.resizing) {
        if (fromResize && rects.current.has(id)) {
          next.set(id, rects.current.get(id));
          continue;
        }
        flipping.cancel();
      }
      // offset* ignores transforms, so an in-flight animation doesn't skew the reading.
      // (The container is position:relative, making it the offsetParent.)
      const pos = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth };
      next.set(id, pos);
      const prev = rects.current.get(id);
      if (!animate || !prev || !el.animate) continue;
      const dx = prev.x - pos.x;
      const dy = prev.y - pos.y;
      const resized = Math.abs(prev.w - pos.w) >= JUMP;
      if (Math.abs(dx) < JUMP && Math.abs(dy) < JUMP && !resized) continue;
      el.getAnimations?.().forEach((a) => a.id === "flip" && a.cancel());
      const from = { transform: `translate(${dx}px, ${dy}px)` };
      const to = { transform: "translate(0, 0)" };
      if (resized) {
        from.width = `${prev.w}px`;
        to.width = `${pos.w}px`;
      }
      const anim = el.animate([from, to], { duration: 300, easing: "cubic-bezier(0.2, 0.75, 0.2, 1)" });
      anim.id = "flip";
      anim.resizing = resized;
    }
    rects.current = next;
  }, [containerRef]);

  useLayoutEffect(() => play(), [play, key]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || typeof ResizeObserver === "undefined") return undefined;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => play(true));
    });
    ro.observe(root);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, [containerRef, play]);
}
