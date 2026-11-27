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
type ColumnCount = keyof typeof COLUMNS;

/** The same counts from a viewport breakpoint up, written out in full so Tailwind finds every class. */
const RESPONSIVE = {
  sm: { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4", 5: "sm:grid-cols-5", 6: "sm:grid-cols-6" },
  md: { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4", 5: "md:grid-cols-5", 6: "md:grid-cols-6" },
  lg: { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6" },
  xl: { 1: "xl:grid-cols-1", 2: "xl:grid-cols-2", 3: "xl:grid-cols-3", 4: "xl:grid-cols-4", 5: "xl:grid-cols-5", 6: "xl:grid-cols-6" },
} as const;

/**
 * Columns from each viewport breakpoint up, mobile-first: `{ base: 1, md: 2, xl: 4 }` is one column on phones, two
 * from 768px, four from 1280px (Tailwind's `sm` 640, `md` 768, `lg` 1024, `xl` 1280).
 */
export type ResponsiveColumns = { base?: ColumnCount } & Partial<Record<keyof typeof RESPONSIVE, ColumnCount>>;

function columnClasses(columns: ColumnCount | ResponsiveColumns) {
  if (typeof columns === "number") return COLUMNS[columns];
  return cn(
    COLUMNS[columns.base ?? 1],
    (Object.keys(RESPONSIVE) as (keyof typeof RESPONSIVE)[]).map((breakpoint) => {
      const count = columns[breakpoint];
      return count !== undefined && RESPONSIVE[breakpoint][count];
    }),
  );
}

export type GridProps = BoxProps & {
  space?: Space;
} & (
    | {
        /** Equal columns: a number, or a number per viewport breakpoint (`{ base: 1, md: 2 }`). */
        columns: ColumnCount | ResponsiveColumns;
        minColumnWidth?: never;
      }
    | {
        /**
         * Auto-fit columns no narrower than this many pixels (never wider than
         * the grid itself), as many as fit. The one length a layout prop takes.
         */
        minColumnWidth: number;
        columns?: never;
      }
  );

/** Equal columns, fixed (also per breakpoint) or auto-fit, with a token gap. */
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
        columns !== undefined && columnClasses(columns),
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
