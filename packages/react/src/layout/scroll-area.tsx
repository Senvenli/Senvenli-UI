"use client";

import * as React from "react";

import { cn } from "../utils";

export type ScrollAreaProps = {
  children: React.ReactNode;
  /** Names the region; screen readers announce it when focus enters. */
  "aria-label": string;
  /** The region's height limit ("320px", 320, "60vh"); for horizontal areas, set the width on the parent. */
  maxHeight?: number | string;
  /**
   * Fills the parent's height and scrolls inside it, for a pane in a flex column or a grid
   * row that is given its height: a conversation's messages between its header and the reply box, a list
   * beside it. The parent must give the area a definite height (`min-h-0` on a flex or grid child).
   * Leave `maxHeight` out when filling.
   */
  fill?: boolean;
  orientation?: "vertical" | "horizontal" | "both";
};

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/** A tabbable descendant that is not hidden or inert. */
function hasTabbable(root: HTMLElement) {
  return Array.from(root.querySelectorAll(TABBABLE)).some((element) => !element.closest("[hidden], [inert]"));
}

type Edges = { start: boolean; end: boolean };

/**
 * A fixed-size region with its own native scroll (never hijacked) and the
 * scrollbar contract (thin, a ds-border-bold thumb), plus an overflow
 * shadow on each edge where content continues. When it holds nothing
 * focusable it becomes a focusable region itself, so keyboard users can
 * scroll it with the arrow keys.
 *
 * Known deviation: the design's 6px thumb is drawn by the platform's thin
 * scrollbar (about 8–11px); standard CSS cannot size it further without
 * replacing native scrolling. With `orientation="both"` the edge shadows
 * follow the vertical axis.
 */
export function ScrollArea({ children, "aria-label": ariaLabel, maxHeight, fill = false, orientation = "vertical" }: ScrollAreaProps) {
  const viewport = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState<Edges>({ start: false, end: false });
  const [needsFocus, setNeedsFocus] = React.useState(false);
  // The thumb shows while scrolling and fades shortly after.
  const [scrolling, setScrolling] = React.useState(false);
  const scrollTimer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(scrollTimer.current), []);
  // Every scroll event restarts the fade-out, so a long scroll keeps the thumb steady.
  const onScrolling = () => {
    window.clearTimeout(scrollTimer.current);
    setScrolling(true);
    scrollTimer.current = window.setTimeout(() => setScrolling(false), 800);
  };
  const horizontal = orientation === "horizontal";

  const room = () => {
    const frame = viewport.current;
    return frame ? (horizontal ? frame.scrollWidth - frame.clientWidth : frame.scrollHeight - frame.clientHeight) : 0;
  };

  /** Which edges hide content; cheap enough for every scroll event. */
  const measureEdges = React.useCallback(() => {
    const frame = viewport.current;
    if (!frame) return;
    // Horizontal scroll positions are negative in RTL; magnitudes work for both directions.
    const position = Math.abs(horizontal ? frame.scrollLeft : frame.scrollTop);
    const space = horizontal ? frame.scrollWidth - frame.clientWidth : frame.scrollHeight - frame.clientHeight;
    const next = { start: position > 1, end: space - position > 1 };
    setEdges((current) => (current.start === next.start && current.end === next.end ? current : next));
  }, [horizontal]);

  /** Whether the region must take focus itself: it scrolls and holds nothing focusable. Runs on size and content changes. */
  const measureFocus = React.useCallback(() => {
    const frame = viewport.current;
    if (!frame) return;
    const next = room() > 1 && !hasTabbable(frame);
    // Never pull focus out from under the keyboard: keep the tab stop while the region itself has focus.
    setNeedsFocus((current) => (current && !next && document.activeElement === frame ? current : next));
  }, [horizontal]);

  React.useLayoutEffect(() => {
    measureEdges();
    measureFocus();
    const frame = viewport.current;
    if (!frame) return;
    const sized = () => {
      measureEdges();
      measureFocus();
    };
    const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(sized);
    resize?.observe(frame);
    if (frame.firstElementChild) resize?.observe(frame.firstElementChild);
    // Children that appear, disappear or change focusability without changing size.
    const mutation = typeof MutationObserver === "undefined" ? undefined : new MutationObserver(sized);
    mutation?.observe(frame, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "tabindex", "hidden", "inert", "href", "contenteditable"] });
    return () => {
      resize?.disconnect();
      mutation?.disconnect();
    };
  }, [measureEdges, measureFocus]);

  const shadow = "pointer-events-none absolute z-[1] shadow-ds-overflow transition-opacity duration-(--ds-duration-instant)";
  return (
    // Clipped: the edge-shadow casters sit just outside the box and only their inward shadow may show,
    // so the area never makes its column (or the page) scroll sideways.
    <div
      data-slot="scroll-area"
      data-orientation={orientation}
      data-fill={fill || undefined}
      className={cn("relative min-h-0 min-w-0 overflow-clip", fill && "h-full")}
    >
      <div
        ref={viewport}
        data-slot="scroll-area-viewport"
        role={needsFocus ? "region" : undefined}
        aria-label={needsFocus ? ariaLabel : undefined}
        tabIndex={needsFocus ? 0 : undefined}
        onScroll={() => {
          measureEdges();
          onScrolling();
        }}
        onBlur={measureFocus}
        data-scrolling={scrolling || undefined}
        style={{ maxHeight }}
        className={cn(
          "peer outline-hidden",
          fill && "h-full",
          // The scrollbar: thin, a ds-border-bold thumb at 70% on no track, shown on hover, keyboard
          // focus and while scrolling. Native underneath, so wheel, touch and keyboard scroll as usual.
          "[scrollbar-width:thin] [scrollbar-color:transparent_transparent]",
          "hover:[scrollbar-color:color-mix(in_oklab,var(--ds-border-bold)_70%,transparent)_transparent]",
          "focus-visible:[scrollbar-color:color-mix(in_oklab,var(--ds-border-bold)_70%,transparent)_transparent]",
          "data-[scrolling]:[scrollbar-color:color-mix(in_oklab,var(--ds-border-bold)_70%,transparent)_transparent]",
          orientation === "vertical" && "overflow-y-auto overflow-x-hidden",
          orientation === "horizontal" && "overflow-x-auto overflow-y-hidden",
          orientation === "both" && "overflow-auto",
        )}
      >
        <div data-slot="scroll-area-content">{children}</div>
      </div>
      {/* Edge shadows where content continues, clipped to fall inward only. */}
      {horizontal ? (
        <>
          <span aria-hidden data-slot="scroll-area-edge" data-edge="start" className={cn(shadow, "inset-y-0 start-0 w-3 [clip-path:inset(0_-12px_0_0)] rtl:[clip-path:inset(0_0_0_-12px)] -translate-x-full rtl:translate-x-full", !edges.start && "opacity-0")} />
          <span aria-hidden data-slot="scroll-area-edge" data-edge="end" className={cn(shadow, "inset-y-0 end-0 w-3 [clip-path:inset(0_0_0_-12px)] rtl:[clip-path:inset(0_-12px_0_0)] translate-x-full rtl:-translate-x-full", !edges.end && "opacity-0")} />
        </>
      ) : (
        <>
          <span aria-hidden data-slot="scroll-area-edge" data-edge="start" className={cn(shadow, "inset-x-0 top-0 h-3 -translate-y-full [clip-path:inset(0_0_-12px_0)]", !edges.start && "opacity-0")} />
          <span aria-hidden data-slot="scroll-area-edge" data-edge="end" className={cn(shadow, "inset-x-0 bottom-0 h-3 translate-y-full [clip-path:inset(-12px_0_0_0)]", !edges.end && "opacity-0")} />
        </>
      )}
      {/* The keyboard focus border sits above the content, which would cover an inset ring on the viewport. */}
      <span aria-hidden data-slot="scroll-area-focus" className="pointer-events-none absolute inset-0 z-[2] peer-focus-visible:inset-ring-2 peer-focus-visible:inset-ring-ds-border-focused" />
    </div>
  );
}
