import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { prefersReducedMotion } from "./useBreakpoint";

// FLIP-animates the children of `containerRef` (each tagged `data-flip-id`)
// whenever they jump to a new position — cards added/removed, a column-count
// change while a side panel opens, or a neighbour growing after generation.
// Small continuous shifts (e.g. during a panel's width transition) are ignored
// so cards simply follow the resize.
const JUMP = 24;

export function useFlip(containerRef, key) {
  const rects = useRef(new Map());

  const play = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    const next = new Map();
    const animate = !prefersReducedMotion();
    for (const el of root.children) {
      const id = el.dataset.flipId;
      if (!id) continue;
      // offset* ignores transforms, so an in-flight animation doesn't skew the reading.
      // (The container is position:relative, making it the offsetParent.)
      const pos = { x: el.offsetLeft, y: el.offsetTop };
      next.set(id, pos);
      const prev = rects.current.get(id);
      if (!animate || !prev || !el.animate) continue;
      const dx = prev.x - pos.x;
      const dy = prev.y - pos.y;
      if (Math.abs(dx) < JUMP && Math.abs(dy) < JUMP) continue;
      el.getAnimations?.().forEach((a) => a.id === "flip" && a.cancel());
      const anim = el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
        { duration: 300, easing: "cubic-bezier(0.2, 0.75, 0.2, 1)" },
      );
      anim.id = "flip";
    }
    rects.current = next;
  }, [containerRef]);

  useLayoutEffect(play, [play, key]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || typeof ResizeObserver === "undefined") return undefined;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(play);
    });
    ro.observe(root);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, [containerRef, play]);
}
