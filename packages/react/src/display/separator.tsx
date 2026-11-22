"use client";

import * as React from "react";
import { Separator as AriaSeparator } from "react-aria-components";

import { cn } from "../utils";

export type SeparatorProps = {
  orientation?: "horizontal" | "vertical";
  /** A label in the line ("or continue with email"), for auth forms only, not section titles. Always horizontal. */
  children?: React.ReactNode;
  /** Hides it from assistive tech when it only decorates. */
  isDecorative?: boolean;
};

/**
 * A 1px `ds-border` line between groups that spacing alone does not separate.
 * Prefer space over lines.
 */
export function Separator({ orientation = "horizontal", children, isDecorative: decorative }: SeparatorProps) {
  if (children != null) {
    // The label is read as text; the two lines around it only decorate.
    return (
      <div data-slot="separator" data-labelled="" className="flex items-center gap-ds-150 text-body-small text-ds-text-subtlest">
        <span aria-hidden className="h-px flex-1 bg-ds-border" />
        <span data-slot="separator-label">{children}</span>
        <span aria-hidden className="h-px flex-1 bg-ds-border" />
      </div>
    );
  }
  const vertical = orientation === "vertical";
  const look = cn("m-0 shrink-0 border-0 bg-ds-border", vertical ? "w-px self-stretch" : "h-px w-full");
  if (decorative) {
    return <div data-slot="separator" data-orientation={orientation} aria-hidden className={look} />;
  }
  return (
    <AriaSeparator
      data-slot="separator"
      orientation={orientation}
      // A vertical separator renders as a div with role="separator"; a horizontal one as <hr>.
      elementType={vertical ? "div" : "hr"}
      className={look}
    />
  );
}
