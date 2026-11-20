import * as React from "react";

import { cn } from "../utils";
import { boxClasses, type BoxProps } from "./box";
import { ALIGN_ITEMS, GAP, JUSTIFY, type Align, type Justify, type Space } from "./tokens";

export type StackProps = BoxProps & {
  /** Gap between children (`gap`, never margins). */
  space?: Space;
  /** Cross-axis alignment (inline axis). */
  align?: Exclude<Align, "baseline">;
};

/** Vertical flow: children stacked on the block axis with a token gap. */
export const Stack = React.forwardRef<HTMLElement, StackProps>(function Stack(
  { as = "div", space, align, padding, paddingInline, paddingBlock, background, radius, shadow, border, children, ...rest },
  ref,
) {
  return React.createElement(
    as,
    {
      ...rest,
      ref,
      "data-slot": "stack",
      className: cn(
        "flex flex-col",
        space && GAP[space],
        align && ALIGN_ITEMS[align],
        boxClasses({ padding, paddingInline, paddingBlock, background, radius, shadow, border }),
      ),
    },
    children,
  );
});

export type InlineProps = BoxProps & {
  space?: Space;
  /** Block-axis alignment of the items. */
  align?: Align;
  /** Distribution along the inline axis; `start` is the reading start, so RTL flips with it. */
  justify?: Justify;
  /** Wrap onto new lines when space runs out. Default `true`. */
  wrap?: boolean;
};

/** Horizontal flow on the inline axis, wrapping by default. */
export const Inline = React.forwardRef<HTMLElement, InlineProps>(function Inline(
  { as = "div", space, align = "center", justify, wrap = true, padding, paddingInline, paddingBlock, background, radius, shadow, border, children, ...rest },
  ref,
) {
  return React.createElement(
    as,
    {
      ...rest,
      ref,
      "data-slot": "inline",
      className: cn(
        "flex flex-row",
        wrap ? "flex-wrap" : "flex-nowrap",
        space && GAP[space],
        ALIGN_ITEMS[align],
        justify && JUSTIFY[justify],
        boxClasses({ padding, paddingInline, paddingBlock, background, radius, shadow, border }),
      ),
    },
    children,
  );
});
