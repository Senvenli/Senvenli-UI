"use client";

import * as React from "react";
import { useLocale } from "react-aria-components";

import { cn } from "../utils";
import { skipToContentLabel } from "../i18n";
import { LAYER } from "../layers";

export type SkipLinkProps = {
  /** Where focus goes: the page's main region by default. */
  target?: string;
  /** "Skip to content" by default. */
  children?: React.ReactNode;
};

/**
 * The first focusable element of a page: hidden until focused, then a chip that moves focus past the
 * navigation to the page's main content. The target is made focusable for the jump only.
 */
export function SkipLink({ target = "main", children }: SkipLinkProps) {
  const { locale } = useLocale();
  return (
    <a
      // An id target is a real fragment link, so it works before hydration too.
      href={target.startsWith("#") ? target : "#"}
      data-slot="skip-link"
      onClick={(event) => {
        const main = document.querySelector<HTMLElement>(target);
        if (!main) return;
        event.preventDefault();
        if (!main.hasAttribute("tabindex")) {
          main.setAttribute("tabindex", "-1");
          // Focusable for the jump only: the region leaves the tab order again once focus moves on.
          main.addEventListener("blur", () => main.removeAttribute("tabindex"), { once: true });
        }
        main.focus();
        main.scrollIntoView?.();
      }}
      className={cn(
        "sr-only rounded-ds-medium bg-ds-surface-overlay px-ds-150 py-ds-100 text-body-strong text-ds-text shadow-ds-overlay",
        "focus:not-sr-only focus:fixed focus:start-ds-200 focus:top-ds-200 focus:outline-hidden focus:inset-ring-2 focus:inset-ring-ds-border-focused",
        LAYER.skipLink,
      )}
    >
      {children ?? skipToContentLabel(locale)}
    </a>
  );
}
