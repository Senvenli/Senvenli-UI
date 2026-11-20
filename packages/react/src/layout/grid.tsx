import * as React from "react";

import { cn } from "../utils";
import { boxClasses, type BoxProps } from "./box";
import { GAP, type Space } from "./tokens";

const COLUMNS = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
} as const;

export type GridProps = BoxProps & {
  space?: Space;
} & (
    | { /** A fixed number of equal columns. */ columns: keyof typeof COLUMNS; minColumnWidth?: never }
    | {
        /**
         * Auto-fit columns no narrower than this many pixels (never wider than
         * the grid itself), as many as fit. The one length a layout prop takes.
         */
        minColumnWidth: number;
        columns?: never;
      }
  );

/** Equal columns, fixed or auto-fit, with a token gap. */
export const Grid = React.forwardRef<HTMLElement, GridProps>(function Grid(
  { as = "div", space, columns, minColumnWidth, padding, paddingInline, paddingBlock, background, radius, shadow, border, children, ...rest },
  ref,
) {
  // A width that is not a positive number cannot drive auto-fit; fall back to one column.
  const autoFit = typeof minColumnWidth === "number" && Number.isFinite(minColumnWidth) && minColumnWidth > 0;
  const fallback = minColumnWidth !== undefined && !autoFit;
  return React.createElement(
    as,
    {
      ...rest,
      ref,
      "data-slot": "grid",
      className: cn(
        "grid",
        columns !== undefined && COLUMNS[columns],
        fallback && "grid-cols-1",
        autoFit && "grid-cols-[repeat(auto-fit,minmax(min(var(--ds-grid-min),100%),1fr))]",
        space && GAP[space],
        boxClasses({ padding, paddingInline, paddingBlock, background, radius, shadow, border }),
      ),
      style: autoFit ? ({ "--ds-grid-min": `${minColumnWidth}px` } as React.CSSProperties) : undefined,
    },
    children,
  );
});
