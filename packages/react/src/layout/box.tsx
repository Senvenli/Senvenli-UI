import * as React from "react";

import { cn } from "../utils";
import {
  BACKGROUND, PADDING, PADDING_BLOCK, PADDING_INLINE, RADIUS, SHADOW, borderClass,
  type Background, type Border, type Radius, type Shadow, type Space,
} from "./tokens";

/** Visual props shared by Box and Pressable. Token names only. */
export type BoxStyleProps = {
  padding?: Space;
  paddingInline?: Space;
  paddingBlock?: Space;
  background?: Background;
  radius?: Radius;
  shadow?: Shadow;
  border?: Border;
};

export function boxClasses({ padding, paddingInline, paddingBlock, background, radius, shadow, border }: BoxStyleProps) {
  return cn(
    padding && PADDING[padding],
    paddingInline && PADDING_INLINE[paddingInline],
    paddingBlock && PADDING_BLOCK[paddingBlock],
    background && BACKGROUND[background],
    radius && RADIUS[radius],
    shadow && SHADOW[shadow],
    borderClass(border),
  );
}

type LayoutElement = "div" | "section" | "article" | "aside" | "header" | "footer" | "main" | "nav" | "ul" | "ol" | "li" | "span" | "form" | "fieldset";

/** HTML attributes a layout primitive passes through. No `className` or `style`: look comes from token props. */
export type LayoutHTMLProps = Omit<React.AllHTMLAttributes<HTMLElement>, "className" | "style" | "color" | "as" | "wrap">;

export type BoxProps = BoxStyleProps & LayoutHTMLProps & {
  as?: LayoutElement;
  children?: React.ReactNode;
};

/** One element whose padding, ground, radius, shadow and border come from tokens. */
export const Box = React.forwardRef<HTMLElement, BoxProps>(function Box(
  { as = "div", padding, paddingInline, paddingBlock, background, radius, shadow, border, children, ...rest },
  ref,
) {
  return React.createElement(
    as,
    {
      ...rest,
      ref,
      "data-slot": "box",
      className: boxClasses({ padding, paddingInline, paddingBlock, background, radius, shadow, border }) || undefined,
    },
    children,
  );
});
