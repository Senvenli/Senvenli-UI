import * as React from "react";

import { cn } from "../utils";

export interface AuthLayoutProps {
  /** Top of the brand pane — the logo lockup. */
  brandLogo?: React.ReactNode;
  /** Middle of the brand pane — kicker / headline / copy / stats. */
  brandContent?: React.ReactNode;
  /** Bottom of the brand pane — a low-key footer line. */
  brandFooter?: React.ReactNode;
  /**
   * What rides at the start of the footer row, before `brandFooter` — a rule, a
   * mark, a motif. Nothing paints when it is absent: this layout carries no
   * signature of its own, so an app that wants one passes it.
   */
  brandFooterLead?: React.ReactNode;
  /**
   * Decoration behind the brand pane's content. A slot rather than a choice —
   * the layout knows the geometry, the app knows what it wants to look like.
   *
   * The pane is the positioning context and clips its overflow, so what goes
   * here should be `absolute inset-0 pointer-events-none` (and `aria-hidden`,
   * being decoration). It is rendered first and the pane's own rows carry
   * `relative`, so a backdrop that follows that shape sits behind them.
   */
  brandBackdrop?: React.ReactNode;
  /**
   * The brand pane's own ground: its background and the text color its
   * contents inherit. The layout has no opinion, because the surface is where
   * two apps sharing this skeleton most need to differ.
   */
  brandClassName?: string;
  /** The credentials pane's corner control (top, inline end). */
  topRightSlot?: React.ReactNode;
  /** The credentials content — typically an `AuthFormLayout`. */
  children: React.ReactNode;
  className?: string;
}

/**
 * The split-screen skeleton an auth screen is built on: a desktop-only brand
 * pane beside a centered credentials pane (the auth pattern).
 *
 * Only the geometry lives here — the column ratio, the pane's top / middle /
 * bottom rhythm, the clipping, the full-height centring, the corner control.
 * Every surface is a slot: the ground arrives as `brandClassName`, the
 * decoration as `brandBackdrop`, the footer motif as `brandFooterLead`, so two
 * apps that want to look unrelated still share one skeleton.
 *
 * The brand pane is desktop-only; on mobile the credentials pane is the screen,
 * so a compact brand header belongs to the form (`AuthFormLayout`'s `logoSlot`).
 * The corner control sits at the inline end, so it mirrors in right-to-left.
 */
export function AuthLayout({
  brandLogo,
  brandContent,
  brandFooter,
  brandFooterLead,
  brandBackdrop,
  brandClassName,
  topRightSlot,
  children,
  className,
}: AuthLayoutProps) {
  return (
    <div data-slot="auth-layout" className={cn("grid min-h-svh lg:grid-cols-[1.05fr_1fr]", className)}>
      <aside
        data-slot="auth-brand"
        className={cn(
          "relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-ds-600 xl:p-ds-800",
          brandClassName,
        )}
      >
        {brandBackdrop}

        {brandLogo && <div className="relative">{brandLogo}</div>}

        {brandContent && <div className="relative">{brandContent}</div>}

        {/* Always rendered, even when it holds nothing. The pane is a `justify-between` column, so
            dropping this row slams the narrative against the bottom edge; a zero-height
            spacer holds the top / middle / bottom rhythm whatever the consumer supplies. */}
        <div data-slot="auth-brand-footer" className="relative flex items-center gap-ds-200">
          {brandFooterLead}
          {brandFooter && <div className="min-w-0">{brandFooter}</div>}
        </div>
      </aside>

      <main
        data-slot="auth-credentials"
        className="relative flex h-full min-h-0 flex-col items-center justify-center bg-ds-surface px-ds-250 py-ds-600 text-ds-text"
      >
        {topRightSlot && (
          <div data-slot="auth-corner" className="absolute top-ds-200 end-ds-200 z-10">
            {topRightSlot}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
