"use client";

import * as React from "react";
import { Button as AriaButton, Link as AriaLink, useLocale, type PressEvent } from "react-aria-components";
import { IconGlyph, type IconName } from "../display/icon";

import { cn } from "../utils";
import { newTabLabel } from "../i18n";
import { LAYER } from "../layers";

export type FabTone = "brand";

const TONE: Record<FabTone, string> = {
  brand:
    "bg-ds-background-brand-bold text-ds-text-on-brand data-[hovered]:bg-ds-background-brand-bold-hovered " +
    "data-[pressed]:bg-ds-background-brand-bold-pressed data-[focus-visible]:inset-ring-ds-text-on-brand",
};

export type FabProps = {
  /** The task, as a verb ("Contact us", "New order"); also the name when icon-only. */
  label: string;
  /** Lucide icon name ("message-circle", "calendar-plus"). */
  icon: IconName;
  tone?: FabTone;
  onPress?: (event: PressEvent) => void;
  /** A link (a chat or contact URL) instead of an action; it opens in a new tab unless `target` says otherwise. */
  href?: string;
  /**
   * Where `href` opens. `_blank` (default) follows Link's external convention: `noopener noreferrer` and the
   * new-tab words for screen readers. `_self` keeps an in-app link in the page, through the host router.
   */
  target?: React.HTMLAttributeAnchorTarget;
  /** `fixed` (default): bottom-end above the safe area. `inline`: in the flow (previews, docs). */
  placement?: "fixed" | "inline";
  /** Collapse to icon-only on phones after the first scroll (default true). */
  collapseOnScroll?: boolean;
};

const PHONE = "(max-width: 767px)";

function useCollapsed(enabled: boolean) {
  const [collapsed, setCollapsed] = React.useState(false);
  React.useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(PHONE);
    // Back at the top of the page there is room again, so the label returns.
    const update = () => setCollapsed(media.matches && window.scrollY > 0);
    update();
    window.addEventListener("scroll", update, { passive: true });
    media.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("scroll", update);
      media.removeEventListener?.("change", update);
    };
  }, [enabled]);
  return collapsed;
}

/**
 * Keeps one task reachable over scrolling content: a contact link on a
 * public site, "new order" in an admin app on phones. One per screen,
 * never over a dialog, sheet or a sticky summary bar (the app decides).
 */
export const Fab = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, FabProps>(function Fab(
  { label, icon, tone = "brand", onPress, href, target = "_blank", placement = "fixed", collapseOnScroll = true },
  ref,
) {
  const { locale } = useLocale();
  const opensNewTab = Boolean(href) && target === "_blank";
  const external = opensNewTab ? ` ${newTabLabel(locale)}` : "";
  const collapsed = useCollapsed(collapseOnScroll && placement === "fixed");
  const className = cn(
    "inline-flex h-12 shrink-0 items-center justify-center gap-ds-100 rounded-ds-full shadow-ds-overlay text-body-strong",
    "cursor-pointer select-none outline-hidden transition-[background-color,filter,padding] duration-(--ds-duration-fast) ease-ds-standard",
    "data-[focus-visible]:inset-ring-2",
    collapsed ? "w-12 px-0" : "px-ds-250",
    // Over page content and a floating banner, under toasts and overlays (src/ds/layers.ts); it lifts by the
    // floating banner's height while one is shown, so the banner never covers it.
    placement === "fixed" &&
      "fixed end-ds-300 bottom-[max(calc(var(--ds-space-300)+env(safe-area-inset-bottom,0px)),calc(var(--ds-floating-banner-offset,0px)+var(--ds-space-150)))]",
    placement === "fixed" && LAYER.fab,
    TONE[tone],
  );
  const content = (
    <>
      <IconGlyph name={icon} size="large" data-slot="fab-icon" />
      {!collapsed && <span data-slot="fab-label">{label}</span>}
    </>
  );
  const common = {
    "data-slot": "fab",
    "data-tone": tone,
    "data-collapsed": collapsed || undefined,
    // Icon-only keeps its label as the accessible name; a new tab adds Link's words after the visible label.
    "aria-label": collapsed || external ? `${label}${external}` : undefined,
    className,
  };
  return href ? (
    <AriaLink
      {...common}
      ref={ref as React.Ref<HTMLAnchorElement>}
      href={href}
      target={target}
      rel={opensNewTab ? "noopener noreferrer" : undefined}
      onPress={onPress}
    >
      {content}
    </AriaLink>
  ) : (
    <AriaButton {...common} ref={ref as React.Ref<HTMLButtonElement>} type="button" onPress={onPress}>
      {content}
    </AriaButton>
  );
});
