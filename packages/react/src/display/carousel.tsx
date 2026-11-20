"use client";

import * as React from "react";
import { Button as AriaButton, useLocale } from "react-aria-components";

import { cn } from "../utils";
import { usePrefersReducedMotion } from "../feedback/motion";
import { goToImageLabel, imagePositionLabel, nextImageLabel, previousImageLabel } from "../i18n";
import { IconGlyph } from "./icon";

export type CarouselItem = {
  /** Stable key; defaults to the src. */
  id?: string;
  src: string;
  /** Meaningful alt text ("Front view", "Interior"). */
  alt: string;
};

export type CarouselProps = {
  items: CarouselItem[];
  /** Names the carousel ("Product photos"). */
  "aria-label": string;
  /** The shown image, controlled. The carousel calls `onIndexChange` and expects the new value back. */
  index?: number;
  /** The first image shown when uncontrolled. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** A strip of thumbnails under the frame; the current one outlined. The dots then only indicate. */
  showThumbnails?: boolean;
  aspectRatio?: "16/9" | "4/3";
  /**
   * A `region` landmark (default) for a gallery that is part of the page's outline; `false` inside
   * repeated cards, so a listing does not fill the landmark list.
   */
  isLandmark?: boolean;
};

const ROUND_BUTTON =
  "grid size-8 cursor-pointer place-items-center rounded-ds-full bg-ds-surface-overlay text-ds-icon shadow-ds-overlay outline-hidden " +
  "data-[hovered]:bg-ds-surface-hovered data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  "data-[disabled]:cursor-default data-[disabled]:opacity-0 transition-opacity";

/** How long scrolling must pause to count as settled where `scrollend` is missing (Safari < 18). */
const SETTLE_MS = 150;

const clamp = (value: number, count: number) => Math.min(Math.max(value, 0), Math.max(count - 1, 0));

/**
 * Pages through a set of images (product photos, a gallery); never auto-advances.
 * Native scroll-snap underneath, so touch swipes, trackpads and RTL behave as
 * the platform does and are never fought: a swipe is committed only once the
 * scroll settles. Arrow keys act only while focus is inside the carousel; the
 * shown image resets to the first when the set of images changes.
 */
export function Carousel({
  items, "aria-label": ariaLabel, index: controlled, defaultIndex = 0, onIndexChange, showThumbnails, aspectRatio = "16/9",
  isLandmark = true,
}: CarouselProps) {
  const { locale, direction } = useLocale();
  const reduced = usePrefersReducedMotion();
  const viewport = React.useRef<HTMLDivElement>(null);
  const strip = React.useRef<HTMLDivElement>(null);
  const [own, setOwn] = React.useState(() => clamp(defaultIndex, items.length));
  const index = clamp(controlled ?? own, items.length);
  // The slide the viewport is actually showing, from settled scrolls and our own scrolls.
  const shown = React.useRef(index);
  // Said once the user changes the image, not on the first render or a reset.
  const [announced, setAnnounced] = React.useState(false);
  const settleTimer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  /** Scroll to a slide; false when the carousel has no size yet (mounted hidden) and nothing moved. */
  const scrollTo = React.useCallback(
    (next: number, instant = false) => {
      const frame = viewport.current;
      const slide = frame?.children[next] as HTMLElement | undefined;
      if (!frame || !slide || frame.clientWidth === 0) return false;
      shown.current = next;
      const offset = slide.getBoundingClientRect().left - frame.getBoundingClientRect().left;
      if (Math.abs(offset) < 1) return true;
      frame.scrollTo?.({ left: frame.scrollLeft + offset, behavior: instant || reduced ? "auto" : "smooth" });
      return true;
    },
    [reduced],
  );

  const commit = React.useCallback(
    (next: number) => {
      if (next === index) return;
      if (controlled === undefined) setOwn(next);
      setAnnounced(true);
      onIndexChange?.(next);
    },
    [controlled, index, onIndexChange],
  );

  /** A button, key, dot or thumbnail: change and scroll there. */
  const go = (next: number) => {
    const value = clamp(next, items.length);
    if (value === index) return;
    scrollTo(value);
    commit(value);
  };

  // The first image in view on mount (defaultIndex or a controlled index), without animating the page load.
  // Mounted hidden (a closed tab or dialog), it waits until it has a size.
  const indexRef = React.useRef(index);
  indexRef.current = index;
  React.useLayoutEffect(() => {
    if (index === 0 || scrollTo(index, true)) return;
    const frame = viewport.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (scrollTo(indexRef.current, true)) observer.disconnect();
    });
    observer.observe(frame);
    return () => observer.disconnect();
    // Mount only.
  }, []);

  // A controlled index from outside scrolls into view, unless the viewport already shows it (a swipe echoed back).
  React.useEffect(() => {
    if (controlled === undefined) return;
    const value = clamp(controlled, items.length);
    if (value !== shown.current) scrollTo(value);
  }, [controlled, items.length, scrollTo]);

  // A new set of images (another item) starts again at the first one, with no animation.
  const signature = items.map((item) => item.id ?? item.src).join("\n");
  const firstSignature = React.useRef(signature);
  React.useEffect(() => {
    if (firstSignature.current === signature) return;
    firstSignature.current = signature;
    setAnnounced(false);
    scrollTo(0, true);
    if (controlled === undefined) setOwn(0);
    if (index !== 0) onIndexChange?.(0);
    // Only a change of the images resets; the rest is read fresh.
  }, [signature]);

  // Keep the current thumbnail in view; the first time without animating.
  const thumbsPlaced = React.useRef(false);
  React.useEffect(() => {
    const row = strip.current;
    const thumb = row?.children[index] as HTMLElement | undefined;
    // Mounted hidden, the strip has no size yet: the first real placement is still to come.
    if (!row || !thumb || row.clientWidth === 0) return;
    const rowBox = row.getBoundingClientRect();
    const box = thumb.getBoundingClientRect();
    const shift = box.left < rowBox.left ? box.left - rowBox.left : box.right > rowBox.right ? box.right - rowBox.right : 0;
    if (shift) row.scrollTo?.({ left: row.scrollLeft + shift, behavior: reduced || !thumbsPlaced.current ? "auto" : "smooth" });
    thumbsPlaced.current = true;
  }, [index, reduced]);

  /** Where the scroll came to rest: follow it if the user moved it there. */
  const settle = () => {
    window.clearTimeout(settleTimer.current);
    const frame = viewport.current;
    if (!frame) return;
    const left = frame.getBoundingClientRect().left;
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    Array.from(frame.children).forEach((slide, position) => {
      const gap = Math.abs((slide as HTMLElement).getBoundingClientRect().left - left);
      if (gap < distance) {
        distance = gap;
        nearest = position;
      }
    });
    shown.current = nearest;
    commit(nearest);
  };
  // The fallback timer calls the latest settle, never one closed over an older index.
  const settleRef = React.useRef(settle);
  settleRef.current = settle;
  const onScroll = () => {
    // Where scrollend exists it alone decides; a finger resting mid-drag is not a settled scroll.
    if (viewport.current && "onscrollend" in viewport.current) return;
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => settleRef.current(), SETTLE_MS);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    // Alt+Arrow (history), Cmd/Ctrl+Arrow (text, tabs) stay the browser's.
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    const forward = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    const backward = direction === "rtl" ? "ArrowRight" : "ArrowLeft";
    const next = { [forward]: index + 1, [backward]: index - 1, Home: 0, End: items.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    go(next);
  };

  /** An arrow that reaches the end disables itself; keep focus inside instead of dropping it to the page. */
  const step = (next: number) => {
    if (next <= 0 || next >= items.length - 1) viewport.current?.focus({ preventScroll: true });
    go(next);
  };

  const ratio = aspectRatio === "4/3" ? "aspect-[4/3]" : "aspect-video";
  const many = items.length > 1;
  const position = imagePositionLabel(locale, index + 1, items.length);
  const Root = isLandmark ? "section" : "div";

  return (
    <Root
      role={isLandmark ? undefined : "group"}
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      data-slot="carousel"
      className="flex flex-col gap-ds-100"
      onKeyDown={many ? onKeyDown : undefined}
    >
      <div data-slot="carousel-frame" className={cn("relative overflow-hidden rounded-ds-xlarge bg-ds-surface-sunken", ratio)}>
        {items.length === 0 ? (
          <div className="grid size-full place-items-center text-ds-icon-subtle [&_svg]:size-10">
            <IconGlyph name="image" strokeWidth={1.25} />
          </div>
        ) : (
          <div
            ref={viewport}
            data-slot="carousel-viewport"
            // Focusable so arrow keys reach it; named by the carousel, the current slide says the position.
            role={many ? "group" : undefined}
            aria-label={many ? ariaLabel : undefined}
            tabIndex={many ? 0 : undefined}
            onScroll={many ? onScroll : undefined}
            onScrollEnd={many ? settle : undefined}
            className="peer flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] outline-hidden [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item, slide) => (
              <div
                key={item.id ?? item.src}
                role="group"
                aria-roledescription="slide"
                aria-label={imagePositionLabel(locale, slide + 1, items.length)}
                aria-hidden={slide !== index || undefined}
                data-slot="carousel-slide"
                data-current={slide === index || undefined}
                className="size-full shrink-0 snap-start snap-always"
              >
                <img src={item.src} alt={item.alt} draggable={false} className="size-full object-cover" />
              </div>
            ))}
          </div>
        )}
        {/* The keyboard focus border sits above the photos, which would cover an inset ring on the viewport. */}
        <span aria-hidden data-slot="carousel-focus" className="pointer-events-none absolute inset-0 rounded-ds-xlarge peer-focus-visible:inset-ring-2 peer-focus-visible:inset-ring-ds-border-focused" />
        {many && (
          <>
            <AriaButton
              data-slot="carousel-previous"
              aria-label={previousImageLabel(locale)}
              isDisabled={index === 0}
              onPress={() => step(index - 1)}
              className={cn(ROUND_BUTTON, "absolute start-ds-150 top-1/2 -translate-y-1/2")}
            >
              <IconGlyph name="chevron-left" />
            </AriaButton>
            <AriaButton
              data-slot="carousel-next"
              aria-label={nextImageLabel(locale)}
              isDisabled={index === items.length - 1}
              onPress={() => step(index + 1)}
              className={cn(ROUND_BUTTON, "absolute end-ds-150 top-1/2 -translate-y-1/2")}
            >
              <IconGlyph name="chevron-right" />
            </AriaButton>
            <span
              data-slot="carousel-counter"
              aria-hidden
              className="absolute end-ds-150 top-ds-150 rounded-ds-full bg-ds-background-neutral-bold px-ds-100 py-ds-025 text-body-small text-ds-text-inverse tabular-nums"
            >
              <bdi>{`${index + 1} / ${items.length}`}</bdi>
            </span>
            <div data-slot="carousel-dots" aria-hidden={showThumbnails || undefined} className="absolute inset-x-0 bottom-ds-100 flex justify-center">
              {items.map((item, dot) => {
                const mark = (
                  <span
                    className={cn(
                      "h-1.5 rounded-ds-full bg-ds-surface-overlay transition-[width] motion-reduce:transition-none",
                      dot === index ? "w-[18px]" : "w-1.5 opacity-60 group-data-[hovered]:opacity-90",
                    )}
                  />
                );
                // With thumbnails the thumbnails are the controls; the dots only show the position.
                return showThumbnails ? (
                  <span key={item.id ?? item.src} data-slot="carousel-dot" className="grid h-6 min-w-6 place-items-center">{mark}</span>
                ) : (
                  // A 24px target around a 6px dot (18px wide when current).
                  <AriaButton
                    key={item.id ?? item.src}
                    data-slot="carousel-dot"
                    aria-label={goToImageLabel(locale, dot + 1)}
                    aria-current={dot === index || undefined}
                    onPress={() => go(dot)}
                    className="group grid h-6 min-w-6 cursor-pointer place-items-center rounded-ds-full outline-hidden data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused"
                  >
                    {mark}
                  </AriaButton>
                );
              })}
            </div>
          </>
        )}
        <span role="status" data-slot="carousel-status" className="sr-only">
          {announced && many ? position : ""}
        </span>
      </div>
      {showThumbnails && many && (
        <div ref={strip} data-slot="carousel-thumbnails" className="flex gap-ds-100 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item, thumb) => (
            <AriaButton
              key={item.id ?? item.src}
              data-slot="carousel-thumbnail"
              aria-label={item.alt}
              aria-current={thumb === index || undefined}
              onPress={() => go(thumb)}
              className={cn(
                "relative aspect-[4/3] w-18 shrink-0 cursor-pointer overflow-hidden rounded-ds-medium bg-ds-surface-sunken outline-hidden",
                // Both marks are drawn above the photo and inside the button, so the strip's overflow never clips
                // them: the current thumb's 2px selected outline, and a separate inner focus border.
                "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit]",
                thumb === index && "after:inset-ring-2 after:inset-ring-ds-border-selected",
                "before:pointer-events-none before:absolute before:inset-[3px] before:z-[1] before:rounded-ds-small",
                "data-[focus-visible]:before:inset-ring-2 data-[focus-visible]:before:inset-ring-ds-border-focused",
              )}
            >
              <img src={item.src} alt="" draggable={false} className="size-full object-cover" />
            </AriaButton>
          ))}
        </div>
      )}
    </Root>
  );
}
