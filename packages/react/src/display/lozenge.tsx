import * as React from "react";

import { cn } from "../utils";

export type LozengeTone = "neutral" | "information" | "brand" | "success" | "warning" | "danger";
export type LozengeAppearance = "subtle" | "bold";

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

export type LozengeProps = {
  /** The status word, sentence case ("Payment pending"); the word carries the meaning, never the colour. */
  children: React.ReactNode;
  /**
   * One meaning per tone: information (Approved, In progress) · brand (Featured) · success
   * (Completed, Available, Paid) · warning (Payment pending, Under review) · danger (Canceled,
   * Failed, Overdue) · neutral (Draft, Inactive).
   */
  tone?: LozengeTone;
  /** `bold` for the one status on the screen that needs attention now. */
  appearance?: LozengeAppearance;
  /** A 6px dot for live states (online, live). */
  hasDot?: boolean;
};

/** The status of a record in one or two words. Not interactive; never inside a button. */
export function Lozenge({ children, tone = "neutral", appearance = "subtle", hasDot }: LozengeProps) {
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
