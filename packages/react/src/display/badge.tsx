"use client";

import * as React from "react";
import { useLocale } from "react-aria-components";

import { cn } from "../utils";

export type BadgeTone = "neutral" | "brand" | "danger" | "inverse";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-ds-background-neutral text-ds-text",
  brand: "bg-ds-background-brand-bold text-ds-text-on-brand",
  danger: "bg-ds-background-danger-bold text-ds-text-on-danger",
  inverse: "bg-ds-background-neutral-bold text-ds-text-inverse",
};

// Sits on the anchor's top end corner with a 2px surface ring.
const CORNER = "absolute -top-1 -end-1.5 ring-2 ring-ds-surface";

type BadgeBase = {
  /** `danger` only for counts that need action now (overdue, unpaid). */
  tone?: BadgeTone;
  /** On an icon inside `BadgeAnchor`: corner placement, and hidden from screen readers (the control's label says it). */
  isOnIcon?: boolean;
};

export type BadgeProps = BadgeBase &
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

/**
 * A count or an unread marker next to a label or on an icon. Counts only:
 * status words are Lozenge. On an icon, the control's `aria-label` must
 * include the count ("Notifications, 9+ unread").
 */
export function Badge({ value, max, tone = "neutral", isDot, isOnIcon }: BadgeProps) {
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
        TONE[tone],
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
