import * as React from "react";

import { cn } from "../utils";
import { boxClasses, type BoxProps } from "./box";
import { ALIGN_ITEMS, GAP, JUSTIFY, type Align, type Justify, type Space } from "./tokens";

export type StackVerticalProps = BoxProps & {
  /** `vertical` (default): children stacked on the block axis. */
  direction?: "vertical";
  /** Gap between children (`gap`, never margins). */
  space?: Space;
  /** Cross-axis alignment (inline axis). */
  align?: Exclude<Align, "baseline">;
};

/** Vertical flow: children stacked on the block axis with a token gap. */
const VerticalStack = React.forwardRef<HTMLElement, Omit<StackVerticalProps, "direction">>(function VerticalStack(
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

/** The horizontal flow's props (Stack with `direction="horizontal"`). */
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

export type StackHorizontalProps = InlineProps & {
  /** `horizontal`: children in a row on the inline axis, wrapping by default (`wrap`), with `justify`. */
  direction: "horizontal";
};

export type StackProps = StackVerticalProps | StackHorizontalProps;

/**
 * Children in a line with a token gap (`gap`, never margins): `direction="vertical"` (default) stacks them on the
 * block axis; `horizontal` puts them in a row on the inline axis, wrapping by default, with `justify` and `align`.
 */
export const Stack = React.forwardRef<HTMLElement, StackProps>(function Stack(props, ref) {
  if (props.direction === "horizontal") {
    const { direction: _direction, ...rest } = props;
    return <Inline {...rest} ref={ref} />;
  }
  const { direction: _direction, ...rest } = props;
  return <VerticalStack {...rest} ref={ref} />;
});
