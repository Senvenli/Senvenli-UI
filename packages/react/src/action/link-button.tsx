"use client";

import * as React from "react";
import { Link as AriaLink, useLocale, type LinkProps as AriaLinkProps } from "react-aria-components";

import { IconGlyph, type IconName } from "../display/icon";
import { cn } from "../utils";
import { radiusClass, useComponentDefaults, type ComponentRadius } from "../defaults";
import { newTabLabel } from "../i18n";
import {
  BUTTON_BASE, BUTTON_SIZE, buttonVariantClasses, ICON, ICON_ONLY_SIZE, LINK_BUTTON_PADDING, hasTouchTarget,
  type ButtonSize, type ButtonTone, type ButtonVariant,
} from "./styles";
import { TouchTarget } from "./touch-target";

type BaseProps = Omit<
  AriaLinkProps,
  "className" | "style" | "children" | "target" | "href" | "onPress" | "onPressStart" | "onPressEnd" | "onPressChange" | "onPressUp" | "onClick"
> & {
  /** Where it goes. Rendered as a real `href`, so the link works before (and without) JavaScript. */
  href: string;
  /** Button's look: `primary` for the one main call to action of a view. */
  variant?: ButtonVariant;
  /** `danger` for a destructive action; it keeps the variant's shape. */
  tone?: ButtonTone;
  /** As wide as its container. */
  fullWidth?: boolean;
  /** Corner radius: `none`, `small`, `medium` (the design), `large` or `full` (a pill). The provider's default otherwise. */
  radius?: ComponentRadius;
  size?: ButtonSize;
  /** Lucide icon name shown before the label. */
  iconBefore?: IconName;
  /** Lucide icon name shown after the label. */
  iconAfter?: IconName;
  /**
   * Link's convention: opens in a new tab with `noopener noreferrer`, shows `arrow-up-right` after the label
   * (unless `iconAfter` is set) and tells screen readers it opens a new tab. With `onPress` a plain click
   * opens nothing (the app handles it in place), so the arrow and the new-tab words are left out; `target`
   * and `rel` stay for the page before JavaScript. Disabled, it opens nothing either: no `target`, `rel` or
   * new-tab words (the arrow stays, as `iconAfter` would).
   */
  isExternal?: boolean;
  /**
   * Optional. Runs on a plain primary click or Enter, and cancels that navigation (`preventDefault`), so the
   * app can handle it in place (open a dialog, track and route). A click with Ctrl, Cmd, Shift or Alt, or with
   * the middle button, is left to the browser (new tab, new window, download). Without JavaScript the `href`
   * is followed as usual. It receives the click itself, a `React.MouseEvent<HTMLAnchorElement>`, not the
   * `PressEvent` Button's `onPress` receives.
   */
  onPress?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
};

export type LinkButtonProps = BaseProps &
  (
    | { /** The label: names the destination ("View orders"). */ children: React.ReactNode; iconOnly?: false }
    | {
        /** A square link that shows only `iconBefore`; it needs an `aria-label`. */
        iconOnly: true;
        iconBefore: IconName;
        "aria-label": string;
        children?: never;
      }
  );

/** A click the browser or the user means for something else: modified, or not the primary button. */
function isModifiedClick(event: React.MouseEvent) {
  return event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
}

/**
 * A link that looks like a Button: a real `<a href>` with Button's variants and sizes, for a
 * call to action that goes somewhere ("Add product" → /products/new). Its semantics are Link's: role `link`,
 * Enter follows it and Space does not, internal links go through the `DesignSystemProvider` router, and
 * `isDisabled` renders it unfocusable with `aria-disabled` and no `href`. Keyboard focus shows Button's inner
 * ring. Actions that change data in place use Button.
 */
export const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(function LinkButton(
  { variant = "default", tone = "neutral", fullWidth = false, size: sizeProp, radius: radiusProp, iconBefore, iconAfter, iconOnly, isExternal, rel, href, onPress, onClickCapture, children, ...rest },
  ref,
) {
  const defaults = useComponentDefaults();
  const size = sizeProp ?? defaults.size ?? "medium";
  const radius = radiusProp ?? defaults.radius;
  const { locale } = useLocale();
  const isDisabled = rest.isDisabled;
  // Capture phase: it sees the browser's own activation (a click, or the click Enter fires on a link) before
  // React Aria's router does, and a cancelled click is one the router leaves alone.
  const handleClickCapture = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClickCapture?.(event);
    if (!onPress || isDisabled || event.defaultPrevented || isModifiedClick(event)) return;
    event.preventDefault();
    onPress(event);
  };
  // A new tab is what a plain click opens: not when onPress handles that click, nor when disabled.
  const opensNewTab = isExternal && !isDisabled;
  const external = opensNewTab && !onPress ? ` ${newTabLabel(locale)}` : "";
  const ariaLabel = rest["aria-label"];
  const trailing = iconAfter ?? (isExternal && !onPress ? "arrow-up-right" : undefined);
  return (
    <AriaLink
      {...rest}
      ref={ref}
      // Disabled, React Aria renders a <span role="link" aria-disabled>; it gets no stray href either.
      href={isDisabled ? undefined : href}
      aria-label={ariaLabel && external ? `${ariaLabel}${external}` : ariaLabel}
      target={opensNewTab ? "_blank" : undefined}
      rel={opensNewTab ? ["noopener", "noreferrer", rel].filter(Boolean).join(" ") : isDisabled ? undefined : rel}
      onClickCapture={handleClickCapture}
      data-slot="link-button"
      data-variant={variant}
      data-tone={tone}
      data-size={size}
      className={cn(
        BUTTON_BASE,
        fullWidth && "w-full",
        // An anchor is underlined by default; Button's own `link` variant still underlines on hover.
        "no-underline",
        buttonVariantClasses(variant, tone),
        BUTTON_SIZE[size],
        variant === "link" && LINK_BUTTON_PADDING,
        iconOnly && ICON_ONLY_SIZE[size],
        radiusClass(radius),
      )}
    >
      <span data-slot="link-button-content" className="inline-flex items-center gap-ds-075">
        {iconBefore && <IconGlyph name={iconBefore} data-slot="link-button-icon" className={ICON} />}
        {!iconOnly && children}
        {trailing && !iconOnly && <IconGlyph name={trailing} data-slot="link-button-icon" className={ICON} />}
        {external && !iconOnly && (
          <span data-slot="link-button-external-label" className="sr-only">
            {external}
          </span>
        )}
      </span>
      {hasTouchTarget(size, iconOnly) && <TouchTarget />}
    </AriaLink>
  );
});
