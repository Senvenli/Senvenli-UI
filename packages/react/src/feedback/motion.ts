"use client";

import * as React from "react";
import { useLocale } from "react-aria-components";

/** True when the user asked for reduced motion; follows changes. */
function readReduced() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePrefersReducedMotion() {
  // Read on the first render, so no animation starts and is cancelled a moment later.
  const [reduced, setReduced] = React.useState(readReduced);
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    // Older Safari only has the deprecated listener API.
    media.addListener?.(update);
    return () => media.removeListener?.(update);
  }, []);
  return reduced;
}

/**
 * A looping animation through the Web Animations API, so the design system
 * needs no global keyframes; it does not run under reduced motion (or where
 * the API does not exist).
 */
export function useLoop(
  ref: React.RefObject<HTMLElement | null>,
  keyframes: Keyframe[] | ((direction: "ltr" | "rtl") => Keyframe[]),
  duration: number,
  enabled: boolean,
  easing: "ease-in-out" | "linear" = "ease-in-out",
) {
  const reduced = usePrefersReducedMotion();
  // A locale switch can flip the page direction under a mounted loop; restart it so it re-reads the CSS direction.
  // A dir set some other way (a parent effect, no locale change) is only picked up on the next restart.
  const { direction: localeDirection } = useLocale();
  // Keyframes may depend on the element's own CSS direction, the same source the rtl: variants use.
  const build = React.useRef(keyframes);
  build.current = keyframes;
  const frames = typeof keyframes === "function" ? "fn" : JSON.stringify(keyframes);
  React.useEffect(() => {
    const element = ref.current;
    if (!enabled || reduced || !element || typeof element.animate !== "function") return;
    const computed = getComputedStyle(element).direction;
    // Environments without layout (jsdom) leave direction unresolved; the nearest dir attribute is the same answer.
    const direction = (computed === "rtl" || computed === "ltr" ? computed : element.closest("[dir]")?.getAttribute("dir")) === "rtl" ? "rtl" : "ltr";
    const source = build.current;
    const list = typeof source === "function" ? source(direction) : source;
    const animation = element.animate(list, { duration, iterations: Infinity, easing });
    return () => animation.cancel();
  }, [ref, frames, duration, enabled, reduced, easing, localeDirection]);
  return reduced;
}
