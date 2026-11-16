import * as React from "react";

import { cn } from "../utils";

export type ButtonGroupProps = Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "style" | "role"> & {
  /** Names the group for screen readers ("View", "Export"). */
  "aria-label": string;
  /**
   * `split`: a primary main action with an icon button that opens a menu of
   * alternatives; the seam uses the pressed brand fill instead of `ds-border`.
   */
  variant?: "default" | "split";
  children: React.ReactNode;
};

/**
 * Joins two to four related Buttons into one unit: they touch, inner corners
 * are square, outer corners keep `ds-radius-medium`. Seams and corners use
 * logical sides, so the group mirrors in RTL.
 */
export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(function ButtonGroup(
  { variant = "default", children, ...rest },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      role="group"
      data-slot="button-group"
      data-variant={variant}
      className={cn(
        "inline-flex isolate",
        "[&>*:not(:first-child)]:rounded-s-none [&>*:not(:last-child)]:rounded-e-none",
        "[&>*+*]:border-s [&>[data-focus-visible]]:z-10",
        variant === "split" ? "[&>*+*]:border-ds-background-brand-bold-pressed" : "[&>*+*]:border-ds-border",
      )}
    >
      {children}
    </div>
  );
});
