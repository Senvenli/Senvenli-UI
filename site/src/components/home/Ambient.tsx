import { useEffect, useRef } from "react";

/** Reduced motion from the device or the site's own motion setting. */
function motionOff() {
  const setting = document.documentElement.getAttribute("data-ds-motion");
  return setting === "reduce" || setting === "none" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The page's dot grid, with a soft spotlight that follows a mouse: the dots under the pointer light up in the brand
 * color and the light glides after the pointer rather than jumping to it. Decorative only (aria-hidden, no pointer
 * events). Only for a fine pointer (no touch), and off under reduced motion; then it is the plain grid.
 */
export function Ambient({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    if (!layer || !window.matchMedia("(pointer: fine)").matches || motionOff()) return;
    let target = { x: 0, y: 0, on: 0 };
    let shown = { x: 0, y: 0, on: 0 };
    let frame = 0;
    let started = false;

    const paint = () => {
      // Ease toward the pointer: a fraction of the remaining distance each frame, so the light trails it smoothly.
      shown = {
        x: shown.x + (target.x - shown.x) * 0.14,
        y: shown.y + (target.y - shown.y) * 0.14,
        on: shown.on + (target.on - shown.on) * 0.08,
      };
      layer.style.setProperty("--home-pointer-x", `${shown.x.toFixed(1)}px`);
      layer.style.setProperty("--home-pointer-y", `${shown.y.toFixed(1)}px`);
      layer.style.setProperty("--home-pointer-on", shown.on.toFixed(3));
      const settled = Math.abs(target.x - shown.x) < 0.3 && Math.abs(target.y - shown.y) < 0.3 && Math.abs(target.on - shown.on) < 0.005;
      frame = settled ? 0 : requestAnimationFrame(paint);
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || motionOff()) return;
      const box = layer.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      const inside = x >= 0 && y >= 0 && x <= box.width && y <= box.height;
      target = { x, y, on: inside ? 1 : 0 };
      // The first move places the light under the pointer, so it fades in where the mouse is instead of sliding in.
      if (!started && inside) {
        shown = { ...shown, x, y };
        started = true;
      }
      wake();
    };
    const leave = () => {
      target = { ...target, on: 0 };
      wake();
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} aria-hidden className={`home-ambient ${className}`.trim()} />;
}
