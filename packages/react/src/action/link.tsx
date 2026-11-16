"use client";

import * as React from "react";
import { Link as AriaLink, useLocale, type LinkProps as AriaLinkProps } from "react-aria-components";
import { IconGlyph } from "../display/icon";

import { cn } from "../utils";
import { newTabLabel } from "../i18n";
import { LINK_BASE, LINK_VARIANT, type LinkVariant } from "./styles";

export type LinkProps = Omit<AriaLinkProps, "className" | "style" | "children" | "target"> & {
  /** Names the destination ("the terms of service"), never "click here". */
  children: React.ReactNode;
  /** `inline` in running text (always underlined), `subtle` in footers and legal rows. */
  variant?: LinkVariant;
  /** Opens in a new tab with `noopener noreferrer` and shows the 12px `arrow-up-right`. */
  isExternal?: boolean;
};

/**
 * Navigates to another page or site; actions that change data use Button.
 * Blue, never gold (gold means selected). Internal links go through the host
 * router set on `DesignSystemProvider`.
 */
export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { children, variant = "default", isExternal, rel, ...rest },
  ref,
) {
  const { locale } = useLocale();
  return (
    <AriaLink
      {...rest}
      ref={ref}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? ["noopener", "noreferrer", rel].filter(Boolean).join(" ") : rel}
      data-slot="link"
      data-variant={variant}
      className={cn(LINK_BASE, LINK_VARIANT[variant])}
    >
      {children}
      {isExternal && (
        <>
          <IconGlyph name="arrow-up-right" size="small" data-slot="link-external-icon" className="ms-ds-025 inline align-middle" />
          <span data-slot="link-external-label" className="sr-only">
            {` ${newTabLabel(locale)}`}
          </span>
        </>
      )}
    </AriaLink>
  );
});
