"use client";

import * as React from "react";
import { Button, Link, type ButtonProps, type LinkProps, type PressEvent } from "react-aria-components";

import { cn } from "../utils";
import { boxClasses, type BoxStyleProps } from "./box";
import type { Background } from "./tokens";

/**
 * Hover and pressed fills follow the ground the Pressable starts from, so a
 * selected or neutral surface keeps its meaning while it reacts. Status
 * grounds (information, success…) keep their fill; their feedback is the
 * shadow or the focus ring.
 */
const HOVER_FILL: Partial<Record<Background | "none", string>> = {
  none: "data-[hovered]:bg-ds-surface-hovered",
  surface: "data-[hovered]:bg-ds-surface-hovered",
  "surface-raised": "data-[hovered]:bg-ds-surface-hovered",
  "surface-overlay": "data-[hovered]:bg-ds-surface-hovered",
  "surface-sunken": "data-[hovered]:bg-ds-background-neutral-hovered",
  neutral: "data-[hovered]:bg-ds-background-neutral-hovered",
  selected: "data-[hovered]:bg-ds-background-selected-hovered",
  "brand-subtle": "data-[hovered]:bg-ds-background-selected-hovered",
};
const PRESSED_FILL: Partial<Record<Background | "none", string>> = {
  none: "data-[pressed]:bg-ds-background-neutral-hovered",
  surface: "data-[pressed]:bg-ds-background-neutral-hovered",
  "surface-raised": "data-[pressed]:bg-ds-background-neutral-hovered",
  "surface-overlay": "data-[pressed]:bg-ds-background-neutral-hovered",
  "surface-sunken": "data-[pressed]:bg-ds-background-neutral-pressed",
  neutral: "data-[pressed]:bg-ds-background-neutral-pressed",
  selected: "data-[pressed]:bg-ds-background-selected-pressed",
  "brand-subtle": "data-[pressed]:bg-ds-background-selected-hovered",
};

/**
 * Shared look for every Pressable: no native chrome, a 24px minimum hit
 * area, a 2px inner `ds-border-focused` border on keyboard focus only, and hover / pressed
 * feedback from tokens. A surface with a shadow lifts to the overlay shadow
 * on hover and settles back to the raised one while pressed (the interactive
 * Card rule); every Pressable also takes the hover / pressed fill of its ground.
 */
export function pressableClasses(style: BoxStyleProps & { fullWidth?: boolean }) {
  const ground = style.background ?? "none";
  return cn(
    // A <button> sizes to its content even as a block; `w-full` makes it fill like the link form does.
    style.fullWidth === false ? "w-fit" : "w-full",
    "relative block min-h-6 min-w-6 cursor-pointer appearance-none text-start text-inherit [font:inherit] outline-hidden select-none",
    "transition-[background-color,box-shadow] duration-(--ds-duration-instant) ease-ds-standard",
    // Keyboard focus: a 2px inner border (no outer ring); pointer focus shows nothing.
    "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused",
    style.shadow && "data-[hovered]:shadow-ds-overlay data-[pressed]:shadow-ds-raised",
    HOVER_FILL[ground],
    PRESSED_FILL[ground],
    "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
    boxClasses(style),
  );
}

type PressableBase = BoxStyleProps & {
  /** As wide as its container (default `true`), as a button or a link; `false` hugs what it holds. */
  fullWidth?: boolean;
  children?: React.ReactNode;
  isDisabled?: boolean;
  /** Required when the content has no text that names the action. */
  "aria-label"?: string;
  id?: string;
};

export type PressableProps = PressableBase &
  (
    | ({ href?: undefined; onPress?: (event: PressEvent) => void } & Pick<ButtonProps, "type" | "form" | "aria-describedby" | "aria-pressed" | "aria-expanded">)
    | ({ href: string; onPress?: (event: PressEvent) => void } & Pick<LinkProps, "target" | "rel" | "routerOptions" | "aria-describedby">)
  );

/**
 * Makes a custom surface clickable with React Aria's press handling: mouse,
 * touch, keyboard (Enter / Space) and screen readers, with consistent
 * hover, pressed and focus-visible states. With `href` it is a link that
 * goes through the host router (`DesignSystemProvider`); otherwise a button.
 *
 * Content is phrasing content only (a `<button>` or `<a>` may not hold block
 * elements): lay it out with `Stack` / `Inline` / `Box` `as="span"`.
 */
export const Pressable = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, PressableProps>(function Pressable(
  { padding, paddingInline, paddingBlock, background, radius, shadow, border, fullWidth = true, children, ...rest },
  ref,
) {
  const className = pressableClasses({ padding, paddingInline, paddingBlock, background, radius, shadow, border, fullWidth });
  if (rest.href !== undefined) {
    return (
      <Link {...rest} ref={ref as React.Ref<HTMLAnchorElement>} data-slot="pressable" className={className}>
        {children}
      </Link>
    );
  }
  const { href: _href, ...buttonProps } = rest;
  return (
    <Button type="button" {...buttonProps} ref={ref as React.Ref<HTMLButtonElement>} data-slot="pressable" className={className}>
      {children}
    </Button>
  );
});
