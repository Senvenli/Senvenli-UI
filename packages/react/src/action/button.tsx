"use client";

import * as React from "react";
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";

import { IconGlyph, type IconName } from "../display/icon";
import { cn } from "../utils";
import { radiusClass, useComponentDefaults, type ComponentRadius } from "../defaults";
import {
  BUTTON_BASE, BUTTON_SIZE, buttonVariantClasses, ICON, ICON_ONLY_SIZE, LINK_BUTTON_PADDING, hasTouchTarget,
  type ButtonSize, type ButtonTone, type ButtonVariant,
} from "./styles";
import { TouchTarget } from "./touch-target";
import { LinkButton, type LinkButtonProps } from "./link-button";

type BaseProps = Omit<AriaButtonProps, "className" | "style" | "children"> & {
  /** `primary` is the one main action of a view; `subtle` for toolbars and rows; `link` for a quiet text action. */
  variant?: ButtonVariant;
  /** `danger` for a destructive action (delete, discard); it keeps the variant's shape. */
  tone?: ButtonTone;
  /** As wide as its container (a form's submit on a phone, a stacked set of actions). */
  fullWidth?: boolean;
  /** Corner radius: `none`, `small`, `medium` (the design), `large` or `full` (a pill). The provider's default otherwise. */
  radius?: ComponentRadius;
  size?: ButtonSize;
  /** Lucide icon name shown before the label ("plus"). */
  iconBefore?: IconName;
  /** Lucide icon name shown after the label. */
  iconAfter?: IconName;
};

/** The press form's props: an action in place (no `href`). */
export type ButtonActionProps = BaseProps & { href?: never } &
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
 * Triggers an action in place. `type="button"`
 * by default so it never submits a form by accident. While `isPending` the
 * label stays in the layout and in the accessible name (only its opacity
 * drops, so the width never jumps), a spinner covers it and
 * `aria-busy` is set; React Aria keeps focus and ignores presses. Compact and small icon-only buttons
 * are 44px to a coarse pointer, with nothing drawn (`TouchTarget`).
 */
const PressButton = React.forwardRef<HTMLButtonElement, Omit<ButtonActionProps, "href">>(function PressButton(
  { variant = "default", tone = "neutral", fullWidth = false, size: sizeProp, radius: radiusProp, iconBefore, iconAfter, iconOnly, children, type = "button", isPending, ...rest },
  forwardedRef,
) {
  const defaults = useComponentDefaults();
  const size = sizeProp ?? defaults.size ?? "medium";
  const radius = radiusProp ?? defaults.radius;
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
      data-tone={tone}
      data-size={size}
      data-icon-only={iconOnly || undefined}
      className={cn(
        BUTTON_BASE,
        fullWidth && "w-full",
        buttonVariantClasses(variant, tone),
        BUTTON_SIZE[size],
        variant === "link" && LINK_BUTTON_PADDING,
        iconOnly && ICON_ONLY_SIZE[size],
        radiusClass(radius),
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

export type ButtonProps = ButtonActionProps | LinkButtonProps;

/**
 * A button: an action in place, or with `href` a link that looks like one (a page in the app, a download, another
 * site), as MUI and Ant Design do. `iconOnly` makes a square icon button named by its `aria-label`. `type="button"`
 * by default, so it never submits a form by accident; `isPending` keeps the label in place under a spinner.
 */
export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button(props, ref) {
  if (props.href !== undefined) return <LinkButton {...(props as LinkButtonProps)} ref={ref as React.Ref<HTMLAnchorElement>} />;
  const { href: _href, ...rest } = props as ButtonActionProps;
  return <PressButton {...rest} ref={ref as React.Ref<HTMLButtonElement>} />;
});
