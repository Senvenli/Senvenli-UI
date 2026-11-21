"use client";

import * as React from "react";

import { cn } from "../utils";

export type AuthFormLayoutSurface = "card" | "plain";

export interface AuthFormLayoutProps {
  /**
   * `card` (default) raises the panel onto its own surface; `plain` lets it sit
   * directly on the pane. The default matches the busiest existing screen.
   */
  surface?: AuthFormLayoutSurface;
  /** The screen's heading. */
  title: React.ReactNode;
  /** One line under the heading. */
  description?: React.ReactNode;
  /**
   * The heading's type style, a DS heading class: `text-heading-large` by default; a screen with a longer title
   * may step down (`text-heading-medium`).
   */
  titleClassName?: string;
  /** Above everything, at the inline end — a language switcher, a back link. */
  headerSlot?: React.ReactNode;
  /** The compact brand header, mobile only: the brand pane is desktop-only. */
  logoSlot?: React.ReactNode;
  /** Under the body — a secondary route out of the screen. */
  footerSlot?: React.ReactNode;
  /** Last, set apart — legal text, a support line. */
  noticeSlot?: React.ReactNode;
  /**
   * The spacing between the form's rows (`space-y-4` by default), merged onto a native form child. The DS `Form`
   * takes no className and keeps its own gap, so this has no effect on it.
   */
  bodyClassName?: string;
  /**
   * A single element — the screen's own form. The layout renders the body
   * region *through* it, so it keeps its element, its handler and its
   * attributes while the rhythm arrives from here.
   *
   * A form component (rather than a `<form>`) must pass `className` and
   * `data-slot` on to its element, or the rhythm is lost.
   */
  children: React.ReactNode;
  className?: string;
}

const REACT_LAZY_TYPE = Symbol.for("react.lazy");

function isLazyReference(value: unknown): value is { _payload: PromiseLike<unknown> } {
  return (
    value !== null &&
    typeof value === "object" &&
    (value as { $$typeof?: unknown }).$$typeof === REACT_LAZY_TYPE &&
    typeof (value as { _payload?: { then?: unknown } })._payload?.then === "function"
  );
}

/**
 * The body region rendered through the screen's own element. A child that a server component passed
 * arrives as a `react.lazy` reference once the Flight payload is split — sometimes a reference to a
 * reference — so each layer is resolved with `use()` before the element is read.
 */
function AuthFormBody({ className, children }: { className: string; children: React.ReactNode }) {
  let child: React.ReactNode = children;
  for (let depth = 0; isLazyReference(child) && depth < 8; depth += 1) {
    child = React.use(child._payload) as React.ReactNode;
  }
  const element = React.Children.only(child) as React.ReactElement<{ className?: string; "data-slot"?: string }>;
  // As the slot did before: the classes concatenate (CSS order decides, not a Tailwind-aware merge),
  // and a data-slot the child sets itself wins.
  return React.cloneElement(element, {
    "data-slot": element.props["data-slot"] ?? "auth-form-body",
    className: [className, element.props.className].filter(Boolean).join(" "),
  } as React.Attributes & { className?: string });
}

/**
 * The panel an auth screen's credentials sit in: surface, header and logo rows,
 * heading and description, the body region's rhythm, and the footer and notice
 * rows beneath it (the auth pattern).
 *
 * Everything a screen *does* stays with the screen — submission, field state,
 * validation, lockout, the submit control. This layout owns only where those
 * things sit. The seam is the body region: the caller passes its own form
 * element as the single child; the layout puts the gap above it on a wrapper and merges the rows' spacing
 * onto the element itself (a native form takes it; the DS Form keeps its own gap and `data-slot`):
 *
 *  - The form remains a real element, so its handler, `noValidate` and
 *    `aria-busy` behave exactly as they did before this layout existed.
 *  - The header, logo, footer and notice rows sit *outside* the form. A control
 *    placed there is not the form's to submit.
 *
 * The single-child contract is real: a fragment or two siblings fail at render
 * rather than silently losing the rhythm. Override the spacing with
 * `bodyClassName`, not by adding classes to the child — the merge with the
 * child's own is a concatenation, not a Tailwind-aware one.
 */
export function AuthFormLayout({
  surface = "card",
  title,
  description,
  titleClassName = "text-heading-large",
  headerSlot,
  logoSlot,
  footerSlot,
  noticeSlot,
  bodyClassName,
  children,
  className,
}: AuthFormLayoutProps) {
  return (
    <div
      data-slot="auth-card"
      data-surface={surface}
      className={cn(
        "w-full",
        surface === "card"
          ? "max-w-100 rounded-2xl bg-ds-surface-raised p-ds-300 shadow-ds-raised sm:p-7"
          : "max-w-sm",
        className,
      )}
    >
      {headerSlot && <div data-slot="auth-card-header" className="mb-ds-300 flex justify-end">{headerSlot}</div>}

      {logoSlot && <div data-slot="auth-card-logo" className="mb-7 flex items-center lg:hidden">{logoSlot}</div>}

      <div className="space-y-1.5">
        <h1 className={cn("text-ds-text", titleClassName)}>{title}</h1>
        {description && <p className="text-body text-ds-text-subtle">{description}</p>}
      </div>

      {/* The gap above the form sits on a wrapper: the DS Form takes no className (its own gap is its rhythm),
          so a margin merged onto it would be lost. */}
      <div data-slot="auth-form-region" className="mt-ds-400">
        <AuthFormBody className={cn("space-y-4", bodyClassName)}>{children}</AuthFormBody>
      </div>

      {footerSlot && <div data-slot="auth-card-footer" className="mt-ds-300 flex justify-center">{footerSlot}</div>}

      {noticeSlot && <div data-slot="auth-card-notice" className="mt-8">{noticeSlot}</div>}
    </div>
  );
}
