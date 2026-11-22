import * as React from "react";

import { cn } from "../utils";

export type LozengeTone = "neutral" | "information" | "brand" | "success" | "warning" | "danger";
/** `subtle` and `bold` are pills; `plain` is a dot and the word, for a live system state (online, syncing). */
export type LozengeAppearance = "subtle" | "bold" | "plain";

const SUBTLE: Record<LozengeTone, string> = {
  neutral: "bg-ds-background-neutral text-ds-text-subtle",
  information: "bg-ds-background-information text-ds-text-information",
  brand: "bg-ds-background-brand-subtle text-ds-text-brand",
  success: "bg-ds-background-success text-ds-text-success",
  warning: "bg-ds-background-warning text-ds-text-warning",
  danger: "bg-ds-background-danger text-ds-text-danger",
};
const BOLD: Record<LozengeTone, string> = {
  neutral: "bg-ds-background-neutral-bold text-ds-text-inverse",
  information: "bg-ds-background-information-bold text-ds-text-on-bold",
  brand: "bg-ds-background-brand-bold text-ds-text-on-brand",
  success: "bg-ds-background-success-bold text-ds-text-on-bold",
  warning: "bg-ds-background-warning-bold text-ds-text-on-warning",
  danger: "bg-ds-background-danger-bold text-ds-text-on-danger",
};
// `plain`: the 8px dot in the tone's icon color; the word stays in the body color.
const DOT: Record<LozengeTone, string> = {
  neutral: "bg-ds-icon-subtle",
  information: "bg-ds-icon-information",
  brand: "bg-ds-icon-brand",
  success: "bg-ds-icon-success",
  warning: "bg-ds-icon-warning",
  danger: "bg-ds-icon-danger",
};
// The live halo sits in the tone's status background.
const HALO: Record<LozengeTone, string> = {
  neutral: "ring-ds-background-neutral",
  information: "ring-ds-background-information",
  brand: "ring-ds-background-brand-subtle",
  success: "ring-ds-background-success",
  warning: "ring-ds-background-warning",
  danger: "ring-ds-background-danger",
};

type Base = {
  /**
   * One meaning per tone: information (Approved, In progress) · brand (Featured) · success
   * (Completed, Available, Paid) · warning (Payment pending, Under review) · danger (Canceled,
   * Failed, Overdue) · neutral (Draft, Inactive).
   */
  tone?: LozengeTone;
  /** `bold` for the one status on the screen that needs attention now; `plain` for a live system state. */
  appearance?: LozengeAppearance;
  /** A 6px dot inside a pill (subtle or bold), for live states. `plain` always has its dot. */
  hasDot?: boolean;
  /** `plain` only: a 3px halo for a state that is active right now (connected, syncing). */
  isLive?: boolean;
};

export type LozengeProps = Base &
  (
    | {
        /** The status word, sentence case ("Payment pending"); the word carries the meaning, never the colour. */
        children: React.ReactNode;
        "aria-label"?: never;
      }
    | {
        children?: never;
        /** `plain` only, where a visible word is impossible (a dense table cell with its own column header). */
        "aria-label": string;
      }
  );

/** The status of a record, or a live state, in one or two words. Not interactive; never inside a button. */
export function Lozenge({ children, tone = "neutral", appearance = "subtle", hasDot, isLive, "aria-label": ariaLabel }: LozengeProps) {
  if (appearance === "plain") {
    // null, false and "" are no word either.
    const hasWord = children != null && children !== false && children !== "";
    const dot = (
      <span data-slot="lozenge-dot" aria-hidden className={cn("size-ds-100 shrink-0 rounded-ds-full", DOT[tone], isLive && cn("ring-3", HALO[tone]))} />
    );
    if (!hasWord) {
      return (
        // A named image with a label; without one it only decorates, never an unnamed image.
        <span
          role={ariaLabel ? "img" : undefined}
          aria-label={ariaLabel}
          aria-hidden={ariaLabel ? undefined : true}
          data-slot="lozenge"
          data-tone={tone}
          data-appearance="plain"
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
        data-slot="lozenge"
        data-tone={tone}
        data-appearance="plain"
        data-live={isLive || undefined}
        className={cn("inline-flex items-center text-body text-ds-text", isLive ? "gap-ds-100" : "gap-ds-075")}
      >
        {dot}
        <span data-slot="lozenge-label">{children}</span>
      </span>
    );
  }
  return (
    <span
      data-slot="lozenge"
      data-tone={tone}
      data-appearance={appearance}
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-ds-050 rounded-ds-xsmall px-ds-075 text-body-small font-medium whitespace-nowrap",
        appearance === "bold" ? BOLD[tone] : SUBTLE[tone],
      )}
    >
      {hasDot && <span data-slot="lozenge-dot" aria-hidden className="size-1.5 rounded-ds-full bg-current" />}
      {children}
    </span>
  );
}
