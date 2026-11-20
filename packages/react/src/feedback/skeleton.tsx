"use client";

import * as React from "react";

import { cn } from "../utils";
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
export function Skeleton({ isLoaded, children, delay, width, height = 12, radius = "small", aspectRatio }: SkeletonProps) {
  if (isLoaded) return <>{children}</>;
  return <Shape delay={delay} className={RADIUS[radius]} style={{ width: width ?? "100%", height: aspectRatio ? undefined : height, aspectRatio }} />;
}

export type SkeletonTextProps = Common & {
  /** Number of 12px lines; the last one is shorter, as text is. */
  lines?: number;
};

export function SkeletonText({ isLoaded, children, delay, lines = 2 }: SkeletonTextProps) {
  if (isLoaded) return <>{children}</>;
  return (
    <span data-slot="skeleton-text" className="flex flex-col gap-ds-075">
      {Array.from({ length: lines }, (_, index) => (
        <Shape key={index} delay={delay} className="h-3 rounded-ds-small" style={{ width: index === lines - 1 && lines > 1 ? "60%" : "100%" }} />
      ))}
    </span>
  );
}

export type SkeletonCircleProps = Common & {
  /** Diameter in px (32 for a list avatar). */
  size?: number;
};

export function SkeletonCircle({ isLoaded, children, delay, size = 32 }: SkeletonCircleProps) {
  if (isLoaded) return <>{children}</>;
  return <Shape delay={delay} className="shrink-0 rounded-ds-full" style={{ width: size, height: size }} />;
}

export type SkeletonGroupProps = {
  /** What is loading ("Loading orders"); the region's name while busy. */
  label: string;
  /** The region's name once loaded ("Rezervasyonlar"); none by default. */
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
