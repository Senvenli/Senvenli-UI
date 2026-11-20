"use client";

import * as React from "react";
import { Link as AriaLink, useLocale, type LinkProps as AriaLinkProps } from "react-aria-components";

import { cn } from "../utils";
import { contentLang, deltaLabel } from "../i18n";
import { IconGlyph } from "./icon";

export type StatDelta = {
  /** The change, already formatted ("%12,4"). */
  value: string;
  direction: "up" | "down" | "flat";
  /** Whether the change is good: colour follows meaning, not direction (fewer damages going down is good). */
  isPositive?: boolean;
};

export type StatProps = {
  label: React.ReactNode;
  /** The figure, already formatted with Intl ("$48,920"). */
  value: React.ReactNode;
  delta?: StatDelta;
  /** The period the delta compares against ("vs. September"); required next to a delta. */
  comparison?: React.ReactNode;
  /** A short series for the sparkline. */
  trend?: number[];
  /** Makes the whole tile a link to the report behind it. */
  href?: AriaLinkProps["href"];
};

const TILE = "flex min-w-0 flex-col gap-ds-050 rounded-ds-large bg-ds-surface-raised p-ds-200 text-ds-text shadow-ds-raised";

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100} ${26 - ((value - min) / span) * 24}`);
  const line = `M${points.join(" L")}`;
  return (
    <svg data-slot="stat-sparkline" aria-hidden viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-ds-050 h-7 w-full rtl:-scale-x-100">
      <path d={`${line} L100 28 L0 28Z`} className="fill-ds-background-brand-subtle" />
      <path d={line} className="fill-none stroke-ds-chart-1 [stroke-width:1.5] [vector-effect:non-scaling-stroke]" />
    </svg>
  );
}

/**
 * One key figure: label, value, its change over a named period and an
 * optional sparkline. Three or four in a row (StatGroup). The change is said
 * in words to screen readers and shown with an arrow, never by colour alone.
 */
export function Stat({ label, value, delta, comparison, trend, href }: StatProps) {
  const { locale } = useLocale();
  const id = React.useId();
  // Up is good unless the caller says otherwise (fewer damages going down is good).
  const good = delta ? (delta.isPositive ?? delta.direction === "up") : false;
  const content = (
    <>
      <span id={`${id}-label`} lang={contentLang(locale)} data-slot="stat-label" className="text-body-small font-medium text-ds-text-subtle">{label}</span>
      {/* Figures are isolated so an RTL page keeps "$48,920" in the order it was formatted. */}
      <span id={`${id}-value`} data-slot="stat-value" className="text-metric-large tabular-nums"><bdi>{value}</bdi></span>
      {(delta || comparison != null) && (
        <span id={`${id}-change`} data-slot="stat-change" className="flex flex-wrap items-center gap-ds-075">
          {delta && (
            <span
              data-slot="stat-delta"
              data-direction={delta.direction}
              className={cn(
                "inline-flex items-center gap-ds-025 text-body-small font-medium tabular-nums",
                delta.direction === "flat" ? "text-ds-text-subtle" : good ? "text-ds-text-success" : "text-ds-text-danger",
              )}
            >
              {/* Arrows follow the reading direction; no change is a level dash. */}
              <IconGlyph
                name={delta.direction === "up" ? "arrow-up-right" : delta.direction === "down" ? "arrow-down-right" : "minus"}
                size="small"
              />
              <bdi aria-hidden>{delta.value}</bdi>
              <span className="sr-only">{deltaLabel(locale, delta.direction, delta.value)}</span>
            </span>
          )}
          {comparison != null && <span data-slot="stat-comparison" className="text-body-small text-ds-text-subtlest">{comparison}</span>}
        </span>
      )}
      {trend && <Sparkline values={trend} />}
    </>
  );
  if (href !== undefined) {
    return (
      <AriaLink
        data-slot="stat"
        href={href}
        // Named by the label and figure; the change and its period describe it.
        aria-labelledby={`${id}-label ${id}-value`}
        aria-describedby={delta || comparison != null ? `${id}-change` : undefined}
        className={cn(
          TILE,
          "cursor-pointer no-underline outline-hidden transition-shadow duration-(--ds-duration-instant) ease-ds-standard",
          "data-[hovered]:shadow-ds-overlay data-[pressed]:shadow-ds-raised data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused",
        )}
      >
        {content}
      </AriaLink>
    );
  }
  return <div data-slot="stat" className={TILE}>{content}</div>;
}

/**
 * Stats in a row: at most four, each at least 170px; fewer than four keep their width
 * instead of stretching across the row.
 */
export function StatGroup({ children, "aria-label": ariaLabel }: { children: React.ReactNode; "aria-label"?: string }) {
  return (
    <div
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
      data-slot="stat-group"
      className="grid grid-cols-[repeat(auto-fill,minmax(max(170px,calc((100%_-_3_*_var(--ds-space-200))_/_4)),1fr))] gap-ds-200"
    >
      {children}
    </div>
  );
}
