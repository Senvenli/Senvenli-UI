"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "../utils";
import { CloseButton } from "../action/close-button";
import { IconGlyph, type IconName } from "../display/icon";
import { FLOATING_BANNER_OFFSET, LAYER } from "../layers";

export type BannerTone = "information" | "success" | "warning" | "danger";

const TONE: Record<BannerTone, { frame: string; icon: IconName; iconColor: "information" | "success" | "warning" | "danger" }> = {
  information: { frame: "bg-ds-background-information inset-ring-ds-border-information", icon: "info", iconColor: "information" },
  warning: { frame: "bg-ds-background-warning inset-ring-ds-border-warning", icon: "triangle-alert", iconColor: "warning" },
  danger: { frame: "bg-ds-background-danger inset-ring-ds-border-danger", icon: "circle-x", iconColor: "danger" },
  success: { frame: "bg-ds-background-success inset-ring-ds-border-success", icon: "circle-check", iconColor: "success" },
};

type BannerCommon = {
  tone?: BannerTone;
  /** Why, and what to do. */
  children?: React.ReactNode;
  /** Inline: up to two link actions. Floating: a default (neutral) Button, never the gold primary. */
  actions?: React.ReactNode;
  /** Shows a close button; omit for errors that must be resolved. */
  onDismiss?: () => void;
  /** The close button's name when "Close" alone is too vague ("Close cookie notice"). */
  dismissLabel?: string;
};

export type BannerProps = BannerCommon &
  (
    | {
        placement?: "inline";
        /** What happened, one line. */
        title: React.ReactNode;
        "aria-label"?: never;
        avoid?: never;
        icon?: never;
      }
    | {
        /**
         * Pinned to the bottom of the viewport until the visitor acts on it (the Website cookie
         * notice). A named region, not a dialog: focus is never moved or trapped and Esc does nothing.
         */
        placement: "floating";
        /** Names the region ("Cookie notice"). */
        "aria-label": string;
        title?: React.ReactNode;
        /** A sticky bottom bar to sit above: its element (measured from its top edge) or a CSS length with a unit ("72px"). */
        avoid?: React.RefObject<HTMLElement | null> | string;
        /** Replaces the tone icon ("cookie"); `null` shows none (narrow phone layouts). */
        icon?: IconName | null;
      }
  );

/** Room the viewport's layout height gives (without a horizontal scrollbar, unlike innerHeight). */
const viewportHeight = () => document.documentElement.clientHeight || window.innerHeight;

/**
 * How far a sticky bottom bar reaches up from the bottom of the viewport, as a CSS length, or
 * undefined when there is no bar (the banner then clears the safe area itself). A ref is re-checked
 * whenever the banner commits, so a bar that mounts later or goes away is followed from the banner's
 * next render.
 */
function useAvoidOffset(avoid: React.RefObject<HTMLElement | null> | string | undefined) {
  // null: no bar on the page right now.
  const [measured, setMeasured] = React.useState<number | null>(null);
  const observed = React.useRef<HTMLElement | null>(null);
  const cleanup = React.useRef<(() => void) | undefined>(undefined);
  // No deps: the ref's node is read after each commit (refs are attached by then) and compared.
  React.useLayoutEffect(() => {
    const element = typeof avoid === "string" ? null : (avoid?.current ?? null);
    if (element === observed.current) return;
    cleanup.current?.();
    cleanup.current = undefined;
    observed.current = element;
    if (!element) {
      setMeasured(null);
      return;
    }
    const read = () => {
      const box = element.getBoundingClientRect();
      const height = viewportHeight();
      // Only a bar that is rendered and pinned to the bottom of the viewport counts: one hidden with
      // CSS (display: none, a mobile-only bar on desktop) has no box, and a sticky bar still in the
      // page flow is not at the bottom yet. Either way the banner clears the safe area on its own.
      const pinned = element.getClientRects().length > 0 && box.height > 0 && box.bottom >= height - 1;
      setMeasured(pinned ? Math.max(height - box.top, 0) : null);
    };
    read();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(read);
    observer?.observe(element);
    window.addEventListener("resize", read);
    // A position: sticky bar pins (or unpins) while the page scrolls; re-read once per frame.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        read();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    cleanup.current = () => {
      observer?.disconnect();
      window.removeEventListener("resize", read);
      window.removeEventListener("scroll", onScroll, { capture: true });
      if (frame) window.cancelAnimationFrame(frame);
    };
  });
  React.useEffect(
    () => () => {
      cleanup.current?.();
      cleanup.current = undefined;
      // Forget the node too, so a remount (StrictMode) observes it again.
      observed.current = null;
    },
    [],
  );
  if (typeof avoid === "string") return avoid;
  return avoid && measured !== null ? `${measured}px` : undefined;
}

/**
 * Every shown floating banner registers how much room it takes; the largest is published, so one
 * banner going away never clears the offset another still needs (the design allows one at a time,
 * but a route change can briefly show two).
 */
const offsets = new Map<symbol, number>();
function publishOffsets() {
  const root = document.documentElement;
  if (offsets.size === 0) root.style.removeProperty(FLOATING_BANNER_OFFSET);
  else root.style.setProperty(FLOATING_BANNER_OFFSET, `${Math.max(...offsets.values())}px`);
}

function FloatingBanner({
  tone = "information", title, children, actions, onDismiss, dismissLabel, "aria-label": ariaLabel, avoid, icon,
}: Extract<BannerProps, { placement: "floating" }>) {
  const banner = React.useRef<HTMLDivElement>(null);
  const avoidOffset = useAvoidOffset(avoid);
  // Portalled to the end of <body> after mount, so it follows the main content in tab order.
  const [host, setHost] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => setHost(document.body), []);

  // While shown, tell bottom-fixed layers (Fab, toasts) how much room it takes, so it never covers them.
  React.useLayoutEffect(() => {
    const element = banner.current;
    if (!element) return;
    const key = Symbol("floating-banner");
    const publish = () => {
      offsets.set(key, Math.max(viewportHeight() - element.getBoundingClientRect().top, 0));
      publishOffsets();
    };
    publish();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(publish);
    observer?.observe(element);
    window.addEventListener("resize", publish);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", publish);
      offsets.delete(key);
      publishOffsets();
    };
  }, [host, avoidOffset]);

  const glyph = icon === null ? undefined : (icon ?? TONE[tone].icon);
  if (!host) return null;
  // Above a sticky bar the bar already clears the safe area; on its own the banner does.
  const bottom = avoidOffset
    ? `calc(var(--ds-space-200) + ${avoidOffset})`
    : "calc(var(--ds-space-200) + env(safe-area-inset-bottom, 0px))";
  return createPortal(
    <div
      ref={banner}
      role="region"
      aria-label={ariaLabel}
      data-slot="banner"
      data-placement="floating"
      data-tone={tone}
      // Fixed to the bottom: ds-space-200 above the safe area or the sticky bar it must clear; inset
      // ds-space-150 on phones and ds-space-200 from 480px, or the side safe-area inset when larger; at most 720px wide, centred; under a quarter
      // of a phone's height. Layer: above sticky bars, under the Fab, toasts and overlays (layers.ts).
      style={{ bottom }}
      className={cn(
        // Side insets clear the notch in landscape (edge-to-edge viewports): the larger of the spacing and
        // the physical safe-area inset on each side (physical, like the insets themselves).
        "fixed [left:max(var(--ds-space-150),env(safe-area-inset-left,0px))] [right:max(var(--ds-space-150),env(safe-area-inset-right,0px))] min-[480px]:[left:max(var(--ds-space-200),env(safe-area-inset-left,0px))] min-[480px]:[right:max(var(--ds-space-200),env(safe-area-inset-right,0px))]",
        "mx-auto grid max-h-[25dvh] max-w-[720px] items-center gap-ds-150 overflow-y-auto",
        LAYER.floatingBanner,
        "rounded-ds-large bg-ds-surface-overlay px-ds-200 py-ds-150 text-body text-ds-text shadow-ds-overlay inset-ring-1 inset-ring-ds-border",
        glyph ? "grid-cols-[auto_1fr] min-[480px]:grid-cols-[auto_1fr_auto]" : "grid-cols-1 min-[480px]:grid-cols-[1fr_auto]",
      )}
    >
      {glyph && <IconGlyph name={glyph} size="large" color={TONE[tone].iconColor} data-slot="banner-icon" />}
      <div data-slot="banner-body" className="flex min-w-0 flex-col gap-ds-050">
        {title != null && <span data-slot="banner-title" className="text-body-strong">{title}</span>}
        {children !== undefined && <div data-slot="banner-content">{children}</div>}
      </div>
      {(actions !== undefined || onDismiss) && (
        // Inline on wide screens; under 480px a row of its own below the text.
        <div data-slot="banner-actions" className="col-span-full flex items-center justify-end gap-ds-100 min-[480px]:col-span-1">
          {actions}
          {onDismiss && <CloseButton onPress={onDismiss} aria-label={dismissLabel} data-slot="banner-dismiss" />}
        </div>
      )}
    </div>,
    host,
  );
}

/**
 * A section message: explains a condition that affects the page or section
 * it sits in, and stays until the condition changes or the user dismisses
 * it. The status is said by the icon and the title, never by colour alone.
 * For the result of an action the user just took, use Toast.
 * `placement="floating"` pins one message to the bottom of the viewport (the
 * cookie notice).
 */
export function Banner(props: BannerProps) {
  if (props.placement === "floating") return <FloatingBanner {...props} />;
  const { tone = "information", title, children, actions, onDismiss, dismissLabel } = props;
  const look = TONE[tone];
  return (
    <div
      // Errors interrupt (alert); everything else waits its turn (status).
      role={tone === "danger" ? "alert" : "status"}
      data-slot="banner"
      data-tone={tone}
      className={cn("flex items-start gap-ds-150 rounded-ds-large p-ds-200 text-body text-ds-text inset-ring-1", look.frame)}
    >
      <IconGlyph name={look.icon} size="large" color={look.iconColor} data-slot="banner-icon" />
      <div data-slot="banner-body" className="flex min-w-0 flex-1 flex-col gap-ds-050">
        <span data-slot="banner-title" className="text-body-strong">{title}</span>
        {children !== undefined && <div data-slot="banner-content">{children}</div>}
        {actions !== undefined && (
          <div data-slot="banner-actions" className="mt-ds-050 flex flex-wrap items-center gap-ds-200">{actions}</div>
        )}
      </div>
      {onDismiss && <CloseButton onPress={onDismiss} aria-label={dismissLabel} data-slot="banner-dismiss" />}
    </div>
  );
}
