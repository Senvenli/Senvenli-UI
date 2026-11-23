"use client";

import * as React from "react";
import { Link as AriaLink, useLocale } from "react-aria-components";

import { cn } from "../utils";
import { Badge, type BadgeCountTone } from "../display/badge";
import { IconGlyph, type IconName } from "../display/icon";
import { mainNavigationLabel } from "../i18n";
import { LAYER } from "../layers";

export type BottomNavItem = {
  /** Unique; `currentKey` matches it. */
  id: string;
  /** Always shown under the icon ("Orders"); the last item is "More" when the app has more. */
  label: string;
  icon: IconName;
  href: string;
  badge?: { value: number; tone?: BadgeCountTone };
};

export type BottomNavProps = {
  /** Four or five top destinations. */
  items: readonly BottomNavItem[];
  currentKey?: string;
  /** Names the navigation landmark; "Main menu" by default. */
  "aria-label"?: string;
};

/** True while the on-screen keyboard covers part of the layout viewport (a field has focus). */
function useKeyboardOpen() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const editing = document.activeElement instanceof HTMLElement && document.activeElement.matches("input, textarea, select, [contenteditable]:not([contenteditable='false'])");
      // The keyboard takes a quarter of the height or more; a URL bar collapsing takes far less.
      setOpen(editing && viewport.height < window.innerHeight * 0.75);
    };
    viewport.addEventListener("resize", update);
    window.addEventListener("focusin", update);
    window.addEventListener("focusout", update);
    return () => {
      viewport.removeEventListener("resize", update);
      window.removeEventListener("focusin", update);
      window.removeEventListener("focusout", update);
    };
  }, []);
  return open;
}

/**
 * The bottom tab bar: four or five destinations, icon over label, padded for the home indicator.
 * Shown at every width; where it appears is the app's choice (render it on phones only, beside a
 * Sidebar on wide screens…). Hidden while the on-screen keyboard is open; leave it out of
 * full-screen flows (checkout).
 */
export function BottomNav({ items, currentKey, "aria-label": label }: BottomNavProps) {
  const { locale } = useLocale();
  const keyboard = useKeyboardOpen();
  return (
    <nav
      aria-label={label ?? mainNavigationLabel(locale)}
      data-slot="bottom-nav"
      hidden={keyboard || undefined}
      className={cn(
        "fixed inset-x-0 bottom-0 border-t border-ds-border bg-ds-surface-overlay shadow-ds-overflow",
        // Safe-area insets are physical edges, so they pair with physical padding.
        "[padding-left:max(var(--ds-space-100),env(safe-area-inset-left,0px))] [padding-right:max(var(--ds-space-100),env(safe-area-inset-right,0px))] pt-ds-075 pb-[max(var(--ds-space-150),env(safe-area-inset-bottom,0px))]",
        LAYER.stickyBar,
      )}
    >
      <ul className="mx-auto grid max-w-[24.375rem] auto-cols-fr grid-flow-col">
        {items.map((item) => (
          <li key={item.id} className="flex">
            <AriaLink
              href={item.href}
              data-slot="bottom-nav-item"
              aria-current={item.id === currentKey ? "page" : undefined}
              className={cn(
                "group/bottom-nav flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-ds-medium py-ds-050 text-[11px] leading-[14px] font-[500] text-ds-text-subtle outline-hidden",
                "data-[pressed]:bg-ds-background-neutral-pressed data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused aria-[current=page]:text-ds-text",
              )}
            >
              <span className="relative">
                <IconGlyph name={item.icon} data-slot="bottom-nav-item-icon" className="size-[22px] group-aria-[current=page]/bottom-nav:text-ds-icon-brand" />
                {item.badge && item.badge.value > 0 && (
                  // Drawn on the icon; read after the label ("Mesajlar, 2").
                  <span data-slot="bottom-nav-item-badge" aria-hidden className="absolute -top-1 -end-2.5">
                    <Badge variant="count" value={item.badge.value} tone={item.badge.tone} isOnIcon />
                  </span>
                )}
              </span>
              <span data-slot="bottom-nav-item-label" className="max-w-full truncate px-ds-025">{item.label}</span>
              {item.badge && item.badge.value > 0 && <span className="sr-only">{`, ${item.badge.value}`}</span>}
            </AriaLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
