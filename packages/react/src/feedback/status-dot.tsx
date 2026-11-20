import * as React from "react";

import { cn } from "../utils";

export type StatusDotTone = "neutral" | "information" | "success" | "warning" | "danger";

const DOT: Record<StatusDotTone, string> = {
  neutral: "bg-ds-icon-subtle",
  information: "bg-ds-icon-information",
  success: "bg-ds-icon-success",
  warning: "bg-ds-icon-warning",
  danger: "bg-ds-icon-danger",
};
// The halo sits in the tone's status background.
const HALO: Record<StatusDotTone, string> = {
  neutral: "ring-ds-background-neutral",
  information: "ring-ds-background-information",
  success: "ring-ds-background-success",
  warning: "ring-ds-background-warning",
  danger: "ring-ds-background-danger",
};

type Base = {
  tone?: StatusDotTone;
  /** A 3px halo for a state that is active right now (connected, syncing). */
  isLive?: boolean;
};

export type StatusDotProps = Base &
  (
    | {
        /** The word: the colour never carries the state alone. */
        children: React.ReactNode;
        "aria-label"?: never;
      }
    | {
        children?: never;
        /** Only where a visible word is impossible (a dense table cell with its own column header). */
        "aria-label": string;
      }
  );

/**
 * A live system or connection state as an 8px dot and a word: integration
 * online, GPS signal, sync. For a record's status (order, invoice) use
 * Lozenge.
 */
export function StatusDot({ tone = "neutral", isLive, children, "aria-label": ariaLabel }: StatusDotProps) {
  // null, false and "" are no word either.
  const hasWord = children != null && children !== false && children !== "";
  const dot = (
    <span
      data-slot="status-dot-mark"
      aria-hidden
      className={cn("size-ds-100 shrink-0 rounded-ds-full", DOT[tone], isLive && cn("ring-3", HALO[tone]))}
    />
  );
  if (!hasWord) {
    return (
      // Named image with a label; without one it only decorates, never an unnamed image.
      <span role={ariaLabel ? "img" : undefined} aria-label={ariaLabel} aria-hidden={ariaLabel ? undefined : true} data-slot="status-dot" data-tone={tone} data-live={isLive || undefined} className="inline-flex items-center">
        {dot}
      </span>
    );
  }
  return (
    // The halo is a shadow and takes no space, so a live dot gets the wider gap to keep the word clear of it.
    <span data-slot="status-dot" data-tone={tone} data-live={isLive || undefined} className={cn("inline-flex items-center text-body text-ds-text", isLive ? "gap-ds-100" : "gap-ds-075")}>
      {dot}
      <span data-slot="status-dot-label">{children}</span>
    </span>
  );
}
