"use client";

import * as React from "react";

import { cn } from "../utils";
import { MotionScope, type WithMotion } from "../defaults";
import { useLoop } from "./motion";

/** The design's rule: fast responses should not flash, so shapes appear after 300ms. */
function useShowAfter(delay: number) {
  const [visible, setVisible] = React.useState(delay <= 0);
  React.useEffect(() => {
    if (delay <= 0) {
      setVisible(true);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);
  return visible;
}

const RADIUS = {
  none: "rounded-none",
  small: "rounded-ds-small",
  medium: "rounded-ds-medium",
  large: "rounded-ds-large",
  full: "rounded-ds-full",
} as const;

type Common = {
  /** Shows the children instead of the shape once the data is there. */
  isLoaded?: boolean;
  children?: React.ReactNode;
  /** Milliseconds before the shape appears (default 300); the space is held meanwhile. */
  delay?: number;
};

export type SkeletonProps = Common & {
  /**
   * `rectangle` (default): a block of `width` × `height`; `text`: `lines` of text, the last one shorter;
   * `circle`: an avatar of `size` px.
   */
  variant?: "rectangle" | "text" | "circle";
  /** `text`: the number of 12px lines (default 2). */
  lines?: number;
  /** `circle`: the diameter in px (default 32, a list avatar). */
  size?: number;
  /** CSS width ("60%", 240); default full width. */
  width?: number | string;
  /** CSS height; default 12px (a text line). */
  height?: number | string;
  /** The radius of what it replaces: `medium` for a button, `large` for a card photo. */
  radius?: keyof typeof RADIUS;
  /** Aspect ratio for photos ("16/9"). */
  aspectRatio?: string;
};

function Shape({ className, style, delay = 300 }: { className: string; style?: React.CSSProperties; delay?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const visible = useShowAfter(delay);
  // A soft 1.6s shimmer; static under reduced motion.
  useLoop(ref, [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], 1600, visible);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-slot="skeleton"
      data-visible={visible || undefined}
      className={cn("block bg-ds-background-neutral", visible ? "opacity-100" : "opacity-0", className)}
      style={style}
    />
  );
}

/**
 * Holds the shape of content while it loads, so the layout does not jump
 * when data arrives. Mirror the real layout; mark the loading region with
 * `aria-busy` and a label (SkeletonGroup does both).
 */
function SkeletonBody({ isLoaded, children, delay, variant = "rectangle", lines = 2, size = 32, width, height = 12, radius = "small", aspectRatio }: SkeletonProps) {
  if (isLoaded) return <>{children}</>;
  if (variant === "text") return <TextLines delay={delay} lines={lines} />;
  if (variant === "circle") return <Shape delay={delay} className="shrink-0 rounded-ds-full" style={{ width: size, height: size }} />;
  return <Shape delay={delay} className={RADIUS[radius]} style={{ width: width ?? "100%", height: aspectRatio ? undefined : height, aspectRatio }} />;
}

/** Lines of text: 12px each, the last one shorter, as text is. */
function TextLines({ delay, lines }: { delay?: number; lines: number }) {
  return (
    <span data-slot="skeleton-text" className="flex flex-col gap-ds-075">
      {Array.from({ length: lines }, (_, index) => (
        <Shape key={index} delay={delay} className="h-3 rounded-ds-small" style={{ width: index === lines - 1 && lines > 1 ? "60%" : "100%" }} />
      ))}
    </span>
  );
}

export type SkeletonGroupProps = {
  /** What is loading ("Loading orders"); the region's name while busy. */
  label: string;
  /** The region's name once loaded ("Orders"); none by default. */
  loadedLabel?: string;
  isLoading: boolean;
  children: React.ReactNode;
};

/** The loading region: `aria-busy` with a label while loading, so screen readers wait for the real content. */
export function SkeletonGroup({ label, loadedLabel, isLoading, children }: SkeletonGroupProps) {
  const name = isLoading ? label : loadedLabel;
  return (
    <div role={name ? "group" : undefined} aria-label={name} aria-busy={isLoading || undefined} data-slot="skeleton-group">
      {children}
    </div>
  );
}

/** Skeleton with its own `motion` (auto, reduce or none); see SkeletonBody for the component itself. */
export function Skeleton({ motion, ...props }: SkeletonProps & WithMotion) {
  return (
    <MotionScope motion={motion}>
      <SkeletonBody {...(props as SkeletonProps)} />
    </MotionScope>
  );
}
