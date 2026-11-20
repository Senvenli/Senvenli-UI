"use client";

import * as React from "react";
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";

import { IconGlyph, type IconName } from "../display/icon";
import { cn } from "../utils";
import {
  BUTTON_BASE, BUTTON_SIZE, BUTTON_VARIANT, ICON, ICON_ONLY_SIZE, LINK_BUTTON_PADDING, hasTouchTarget,
  type ButtonSize, type ButtonVariant,
} from "./styles";
import { TouchTarget } from "./touch-target";

type BaseProps = Omit<AriaButtonProps, "className" | "style" | "children"> & {
  /** `primary` is the one main action of a view; `danger` only confirms a destructive step. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Lucide icon name shown before the label ("plus"). */
  iconBefore?: IconName;
  /** Lucide icon name shown after the label. */
  iconAfter?: IconName;
};

export type ButtonProps = BaseProps &
  (
    | { /** The label: the verb of what happens ("Save"). */ children: React.ReactNode; iconOnly?: false }
    | {
        /** A square button that shows only `iconBefore`; it needs an `aria-label`. */
        iconOnly: true;
        iconBefore: IconName;
        "aria-label": string;
        children?: never;
      }
  );

function Spinner() {
  return (
    <span
      aria-hidden="true"
      data-slot="button-spinner"
      className="absolute inset-0 m-auto size-ds-icon animate-spin rounded-ds-full border-2 border-current border-e-transparent motion-reduce:animate-none"
    />
  );
}

/**
 * Triggers an action in place; never navigates (use Link). `type="button"`
 * by default so it never submits a form by accident. While `isPending` the
 * label stays in the layout and in the accessible name (only its opacity
 * drops, so the width never jumps), a spinner covers it and
 * `aria-busy` is set; React Aria keeps focus and ignores presses. Compact and small icon-only buttons
 * are 44px to a coarse pointer, with nothing drawn (`TouchTarget`).
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "default", size = "default", iconBefore, iconAfter, iconOnly, children, type = "button", isPending, ...rest },
  forwardedRef,
) {
  // React Aria announces the pending state but does not forward `aria-busy`;
  // the design asks for it, so it is set on the element directly.
  const local = React.useRef<HTMLButtonElement | null>(null);
  const ref = React.useCallback(
    (node: HTMLButtonElement | null) => {
      local.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );
  React.useLayoutEffect(() => {
    const node = local.current;
    if (!node) return;
    if (isPending) node.setAttribute("aria-busy", "true");
    else node.removeAttribute("aria-busy");
  }, [isPending]);

  return (
    <AriaButton
      {...rest}
      ref={ref}
      type={type}
      isPending={isPending}
      data-slot={(rest as { "data-slot"?: string })["data-slot"] ?? "button"}
      data-variant={variant}
      data-size={size}
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        variant === "link" && LINK_BUTTON_PADDING,
        iconOnly && ICON_ONLY_SIZE[size],
      )}
    >
      <span
        data-slot="button-content"
        className={cn("inline-flex items-center gap-ds-075", isPending && "opacity-0")}
      >
        {iconBefore && <IconGlyph name={iconBefore} data-slot="button-icon" className={ICON} />}
        {!iconOnly && children}
        {iconAfter && !iconOnly && <IconGlyph name={iconAfter} data-slot="button-icon" className={ICON} />}
      </span>
      {isPending && <Spinner />}
      {hasTouchTarget(size, iconOnly) && <TouchTarget />}
    </AriaButton>
  );
});
