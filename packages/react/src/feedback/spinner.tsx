"use client";

import * as React from "react";
import { useLocale } from "react-aria-components";

import { cn } from "../utils";
import { loadingLabel } from "../i18n";

export type SpinnerSize = "small" | "medium" | "large";

const SIZE: Record<SpinnerSize, string> = {
  // 12px inline, 14px in buttons (takes the label colour), 24px for regions (brand).
  small: "size-3 text-ds-icon-subtle",
  medium: "size-3.5 text-current",
  large: "size-6 text-ds-icon-brand",
};

export type SpinnerProps = {
  size?: SpinnerSize;
  /**
   * What is happening ("Checking availability"). Omit when visible text
   * next to it says it, and pass `isDecorative`; otherwise "Loading…".
   */
  "aria-label"?: string;
  /** Visible text already says it (a pending button): hidden from assistive tech. */
  isDecorative?: boolean;
};

/**
 * "Working" for waits under a few seconds where the result appears in place:
 * a 2px ring with one open quarter, 700ms per turn. Under reduced motion it
 * stops and the label carries the state. Over ~1s with a known length use
 * ProgressBar; loading a layout, Skeleton.
 */
export function Spinner({ size = "medium", "aria-label": ariaLabel, isDecorative }: SpinnerProps) {
  const { locale } = useLocale();
  const ring = (
    <span
      aria-hidden="true"
      data-slot="spinner-ring"
      className={cn(
        "inline-block shrink-0 rounded-ds-full border-2 border-current border-e-transparent",
        "animate-spin [animation-duration:700ms] motion-reduce:animate-none",
        SIZE[size],
      )}
    />
  );
  if (isDecorative) return <span data-slot="spinner" className="inline-flex">{ring}</span>;
  const name = ariaLabel ?? loadingLabel(locale);
  return (
    // The words are the content, not an aria-label too, so screen readers say them once.
    <span role="status" data-slot="spinner" className="inline-flex">
      {ring}
      <span className="sr-only">{name}</span>
    </span>
  );
}
