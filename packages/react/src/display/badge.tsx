"use client";

import * as React from "react";
import { useLocale } from "react-aria-components";

import { cn } from "../utils";

export type BadgeTone = "neutral" | "information" | "brand" | "success" | "warning" | "danger";


const SUBTLE: Record<BadgeTone, string> = {
  neutral: "bg-ds-background-neutral text-ds-text-subtle",
  information: "bg-ds-background-information text-ds-text-information",
  brand: "bg-ds-background-brand-subtle text-ds-text-brand",
  success: "bg-ds-background-success text-ds-text-success",
  warning: "bg-ds-background-warning text-ds-text-warning",
  danger: "bg-ds-background-danger text-ds-text-danger",
};
const BOLD: Record<BadgeTone, string> = {
  neutral: "bg-ds-background-neutral-bold text-ds-text-inverse",
  information: "bg-ds-background-information-bold text-ds-text-on-bold",
  brand: "bg-ds-background-brand-bold text-ds-text-on-brand",
  success: "bg-ds-background-success-bold text-ds-text-on-bold",
  warning: "bg-ds-background-warning-bold text-ds-text-on-warning",
  danger: "bg-ds-background-danger-bold text-ds-text-on-danger",
};
// `plain`: the 8px dot in the tone's icon color; the word stays in the body color.
const DOT: Record<BadgeTone, string> = {
  neutral: "bg-ds-icon-subtle",
  information: "bg-ds-icon-information",
  brand: "bg-ds-icon-brand",
  success: "bg-ds-icon-success",
  warning: "bg-ds-icon-warning",
  danger: "bg-ds-icon-danger",
};
// The live halo sits in the tone's status background.
const HALO: Record<BadgeTone, string> = {
  neutral: "ring-ds-background-neutral",
  information: "ring-ds-background-information",
  brand: "ring-ds-background-brand-subtle",
  success: "ring-ds-background-success",
  warning: "ring-ds-background-warning",
  danger: "ring-ds-background-danger",
};

type StatusBase = {
  /**
   * One meaning per tone: information (Approved, In progress) · brand (Featured) · success
   * (Completed, Available, Paid) · warning (Payment pending, Under review) · danger (Canceled,
   * Failed, Overdue) · neutral (Draft, Inactive).
   */
  tone?: BadgeTone;
  /**
   * `subtle` (default): the status of a record in a pill. `bold`: the one status on the screen that needs attention
   * now. `dot`: a dot and the word, for a live system state (online, syncing).
   */
  variant?: "subtle" | "bold" | "dot";
  /** A 6px dot inside a pill (subtle or bold), for live states. `dot` always has its dot. */
  hasDot?: boolean;
  /** `dot` only: a 3px halo for a state that is active right now (connected, syncing). */
  isLive?: boolean;
};

export type BadgeStatusProps = StatusBase &
  (
    | {
        /** The status word, sentence case ("Payment pending"); the word carries the meaning, never the colour. */
        children: React.ReactNode;
        "aria-label"?: never;
      }
    | {
        children?: never;
        /** `dot` only, where a visible word is impossible (a dense table cell with its own column header). */
        "aria-label": string;
      }
  );

function StatusBadge({ children, tone = "neutral", variant = "subtle", hasDot, isLive, "aria-label": ariaLabel }: BadgeStatusProps) {
  if (variant === "dot") {
    // null, false and "" are no word either.
    const hasWord = children != null && children !== false && children !== "";
    const dot = (
      <span data-slot="badge-dot" aria-hidden className={cn("size-ds-100 shrink-0 rounded-ds-full", DOT[tone], isLive && cn("ring-3", HALO[tone]))} />
    );
    if (!hasWord) {
      return (
        // A named image with a label; without one it only decorates, never an unnamed image.
        <span
          role={ariaLabel ? "img" : undefined}
          aria-label={ariaLabel}
          aria-hidden={ariaLabel ? undefined : true}
          data-slot="badge"
          data-tone={tone}
          data-variant="dot"
          data-live={isLive || undefined}
          className="inline-flex items-center"
        >
          {dot}
        </span>
      );
    }
    return (
      // The halo is a shadow and takes no space, so a live dot gets the wider gap to keep the word clear of it.
      <span
        data-slot="badge"
        data-tone={tone}
        data-variant="dot"
        data-live={isLive || undefined}
        className={cn("inline-flex items-center text-body text-ds-text", isLive ? "gap-ds-100" : "gap-ds-075")}
      >
        {dot}
        <span data-slot="badge-label">{children}</span>
      </span>
    );
  }
  return (
    <span
      data-slot="badge"
      data-tone={tone}
      data-variant={variant}
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-ds-050 rounded-ds-xsmall px-ds-075 text-body-small font-medium whitespace-nowrap",
        variant === "bold" ? BOLD[tone] : SUBTLE[tone],
      )}
    >
      {hasDot && <span data-slot="badge-dot" aria-hidden className="size-1.5 rounded-ds-full bg-current" />}
      {children}
    </span>
  );
}

export type BadgeCountTone = "neutral" | "brand" | "danger" | "inverse";

const COUNT_TONE: Record<BadgeCountTone, string> = {
  neutral: "bg-ds-background-neutral text-ds-text",
  brand: "bg-ds-background-brand-bold text-ds-text-on-brand",
  danger: "bg-ds-background-danger-bold text-ds-text-on-danger",
  inverse: "bg-ds-background-neutral-bold text-ds-text-inverse",
};

// Sits on the anchor's top end corner with a 2px surface ring.
const CORNER = "absolute -top-1 -end-1.5 ring-2 ring-ds-surface";

type CountBase = {
  variant: "count";
  /** `danger` only for counts that need action now (overdue, unpaid). */
  tone?: BadgeCountTone;
  /** On an icon inside `BadgeAnchor`: corner placement, and hidden from screen readers (the control's label says it). */
  isOnIcon?: boolean;
};

export type BadgeCountProps = CountBase &
  (
    | {
        /** The count; nothing renders at 0. */
        value: number;
        /** Above it shows "max+"; default 99, or 9 on an icon. */
        max?: number;
        isDot?: never;
      }
    | {
        /** An 8px unread marker without a number; hidden from screen readers, so the text or label next to it says "new". */
        isDot: true;
        value?: never;
        max?: never;
      }
  );

/** `variant="count"`: a count or an unread marker next to a label or on an icon. */
function CountBadge({ value, max, tone = "neutral", isDot, isOnIcon }: BadgeCountProps) {
  const { locale } = useLocale();
  if (isDot) {
    return (
      <span
        data-slot="badge"
        data-dot=""
        aria-hidden
        className={cn("size-ds-100 rounded-ds-full bg-ds-icon-danger", isOnIcon ? "absolute top-ds-050 end-ds-050 ring-2 ring-ds-surface" : "inline-block")}
      />
    );
  }
  if (!value || value <= 0) return null;
  const cap = max ?? (isOnIcon ? 9 : 99);
  const format = new Intl.NumberFormat(locale);
  const text = value > cap ? `${format.format(cap)}+` : format.format(value);
  return (
    <span
      data-slot="badge"
      data-tone={tone}
      aria-hidden={isOnIcon || undefined}
      className={cn(
        "inline-grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-ds-full px-[5px] text-[11px] leading-none font-medium tabular-nums",
        COUNT_TONE[tone],
        isOnIcon && CORNER,
      )}
    >
      {/* Isolated so an RTL page keeps "99+" rather than "+99". */}
      <bdi>{text}</bdi>
    </span>
  );
}

/** Positions an on-icon Badge on the control it counts for. */
export function BadgeAnchor({ children }: { children: React.ReactNode }) {
  return <span data-slot="badge-anchor" className="relative inline-flex">{children}</span>;
}

export type BadgeVariant = "subtle" | "bold" | "dot" | "count";
export type BadgeProps = BadgeStatusProps | BadgeCountProps;

/**
 * A short label beside content. `variant` picks the shape: `subtle` (default) and `bold` are a record's status in a
 * pill ("Paid", "Overdue"); `dot` is a dot and a word for a live state ("Online"); `count` is a number or an unread
 * marker next to a label or on an icon (inside `BadgeAnchor`, where the control's `aria-label` carries the count).
 * Not interactive; never inside a button.
 */
export function Badge(props: BadgeProps) {
  return props.variant === "count" ? <CountBadge {...props} /> : <StatusBadge {...props} />;
}
