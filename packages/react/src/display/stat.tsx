"use client";

import * as React from "react";
import {
  Link as AriaLink,
  ToggleButton as AriaToggleButton,
  ToggleButtonGroup as AriaToggleButtonGroup,
  useLocale,
  type Key,
  type LinkProps as AriaLinkProps,
} from "react-aria-components";

import { cn } from "../utils";
import { aboutLabel, contentLang, deltaLabel } from "../i18n";
import { Button } from "../action/button";
import { Popover } from "../overlay/floating";
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
  /** Makes the whole tile a link to the report behind it. Ignored inside a selectable StatGroup. */
  href?: AriaLinkProps["href"];
  /** Stable key for selection in a StatGroup with `selectionMode` ("revenue", not the label). */
  id?: string;
  /**
   * What the figure means and how it is counted, on demand: an info button after the label opens it in a
   * popover ("About MRR"). A sentence or two; a link to the full definition may follow.
   */
  help?: React.ReactNode;
  /** What the value covers, beside the label ("now", "this month"); `comparison` says what the change is against. */
  period?: React.ReactNode;
};

/** True inside a StatGroup with `selectionMode`: each Stat renders as a toggle. */
const SelectableContext = React.createContext(false);
/** `compact` inside a dense StatGroup: tiles share one surface, divided by lines. */
const DensityContext = React.createContext<"default" | "compact">("default");

const TILE = "flex min-w-0 flex-col gap-ds-050 rounded-ds-large bg-ds-surface-raised p-ds-200 text-ds-text shadow-ds-raised";
/** A compact tile: no card of its own; lines on its end and bottom edges divide it from the next (the group clips the outer ones). */
const TILE_COMPACT = "flex min-w-0 flex-col gap-ds-025 border-e border-b border-ds-border bg-ds-surface-raised px-ds-200 py-ds-150 text-ds-text";

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
export function Stat({ label, value, delta, comparison, trend, href, id: key, help, period }: StatProps) {
  const { locale } = useLocale();
  const id = React.useId();
  const selectable = React.useContext(SelectableContext);
  const compact = React.useContext(DensityContext) === "compact";
  const tile = compact ? TILE_COMPACT : TILE;
  const warned = React.useRef(false);
  React.useEffect(() => {
    if (warned.current || !selectable) return;
    if (key === undefined) console.warn("Stat: give each Stat an id in a selectable StatGroup.");
    else if (href !== undefined) console.warn("Stat: a tile is a link or a selection, not both; href is ignored in a selectable StatGroup.");
    else return;
    warned.current = true;
  }, [selectable, key, href]);
  // Up is good unless the caller says otherwise (fewer damages going down is good).
  const good = delta ? (delta.isPositive ?? delta.direction === "up") : false;
  const labelText = <span id={`${id}-label`} lang={contentLang(locale)} data-slot="stat-label" className="text-body-small font-medium text-ds-text-subtle">{label}</span>;
  const content = (
    <>
      {period != null || help != null ? (
        <span data-slot="stat-head" className="flex min-w-0 items-start gap-ds-050">
          {/* Label and period flow as text: in a narrow tile the period moves whole to the next line. */}
          <span className="min-w-0 flex-1">
            {labelText}
            {period != null && (
              <span data-slot="stat-period" className="whitespace-nowrap text-body-small text-ds-text-subtlest">
                <span aria-hidden> · </span>
                {period}
              </span>
            )}
          </span>
          {help != null && (
            // Above a pressable tile's overlay, so it opens its popover instead of pressing the tile.
            <span className="relative z-[1] -my-ds-050 flex shrink-0 pointer-events-auto">
              <Popover
                placement="bottom end"
                aria-label={`${aboutLabel(locale)} ${typeof label === "string" ? label : ""}`.trim()}
                trigger={
                  <Button
                    data-slot="stat-help"
                    size="small"
                    variant="subtle"
                    iconOnly
                    iconBefore="info"
                    aria-label={`${aboutLabel(locale)} ${typeof label === "string" ? label : ""}`.trim()}
                  />
                }
              >
                <div data-slot="stat-help-content" className="text-body-small">{help}</div>
              </Popover>
            </span>
          )}
        </span>
      ) : (
        labelText
      )}
      {/* Figures are isolated so an RTL page keeps "$48,920" in the order it was formatted. */}
      <span id={`${id}-value`} data-slot="stat-value" className={cn(compact ? "text-metric-medium" : "text-metric-large", "tabular-nums")}><bdi>{value}</bdi></span>
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
  // With help, a pressable tile cannot hold the help button (no button inside a button or link): the press target
  // is a transparent layer over the tile, and the help button sits above it. The wrapper takes the tile's look.
  if (help != null && (selectable || href !== undefined)) {
    const named = { "aria-labelledby": `${id}-label ${id}-value`, "aria-describedby": delta || comparison != null ? `${id}-change` : undefined };
    const layer = "absolute inset-0 z-0 cursor-pointer rounded-[inherit] outline-hidden data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused";
    return (
      <div
        data-slot="stat"
        className={cn(
          tile,
          "relative transition-shadow duration-(--ds-duration-instant) ease-ds-standard [&>*:not([data-slot=stat-press])]:pointer-events-none",
          compact ? "has-[[data-slot=stat-press][data-hovered]]:bg-ds-surface-hovered" : "has-[[data-slot=stat-press][data-hovered]]:shadow-ds-overlay",
          "has-[[data-slot=stat-press][data-selected]]:bg-ds-background-selected has-[[data-slot=stat-press][data-selected]]:inset-ring-2 has-[[data-slot=stat-press][data-selected]]:inset-ring-ds-border-selected",
        )}
      >
        {selectable ? (
          <AriaToggleButton id={key ?? id} data-slot="stat-press" {...named} className={layer} />
        ) : (
          <AriaLink data-slot="stat-press" href={href} {...named} className={layer} />
        )}
        {content}
      </div>
    );
  }
  if (selectable) {
    return (
      <AriaToggleButton
        id={key ?? id}
        data-slot="stat"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-describedby={delta || comparison != null ? `${id}-change` : undefined}
        className={cn(
          tile,
          "cursor-pointer text-start outline-hidden transition-shadow duration-(--ds-duration-instant) ease-ds-standard",
          compact ? "data-[hovered]:bg-ds-surface-hovered" : "data-[hovered]:shadow-ds-overlay data-[pressed]:shadow-ds-raised",
          // Selected is never colour alone: a ring as well as the selected fill.
          "data-[selected]:bg-ds-background-selected data-[selected]:inset-ring-2 data-[selected]:inset-ring-ds-border-selected",
          "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused",
        )}
      >
        {content}
      </AriaToggleButton>
    );
  }
  if (href !== undefined) {
    return (
      <AriaLink
        data-slot="stat"
        href={href}
        // Named by the label and figure; the change and its period describe it.
        aria-labelledby={`${id}-label ${id}-value`}
        aria-describedby={delta || comparison != null ? `${id}-change` : undefined}
        className={cn(
          tile,
          "cursor-pointer no-underline outline-hidden transition-shadow duration-(--ds-duration-instant) ease-ds-standard",
          compact ? "data-[hovered]:bg-ds-surface-hovered" : "data-[hovered]:shadow-ds-overlay data-[pressed]:shadow-ds-raised",
          "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused",
        )}
      >
        {content}
      </AriaLink>
    );
  }
  return <div data-slot="stat" className={tile}>{content}</div>;
}

export type StatGroupProps = {
  children: React.ReactNode;
  /** Names the group; required with `selectionMode` so the choice has a visible or spoken name. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /**
   * Makes the tiles selectable, e.g. the metric a chart below shows. "single" is a radio
   * group (arrow keys move, one is chosen); "multiple" makes each tile a pressed/not
   * pressed toggle. Each Stat needs an `id`.
   */
  selectionMode?: "single" | "multiple";
  selectedKeys?: Iterable<Key>;
  defaultSelectedKeys?: Iterable<Key>;
  onSelectionChange?: (keys: Set<Key>) => void;
  /** Keeps at least one tile selected (a chart always shows a metric). */
  disallowEmptySelection?: boolean;
  /** A visible name over the group ("Business", "Website"); it also names the group for assistive tech. */
  label?: React.ReactNode;
  /**
   * `default`: separate tiles, at most four in a row. `compact`: up to six in a row on one shared surface divided by
   * lines, with a smaller figure, for a row of secondary figures.
   */
  density?: "default" | "compact";
};

const GROUP = "grid grid-cols-[repeat(auto-fill,minmax(max(170px,calc((100%_-_3_*_var(--ds-space-200))_/_4)),1fr))] gap-ds-200";

/**
 * Stats in a row: at most four, each at least 170px; fewer than four keep their width
 * instead of stretching across the row. With `selectionMode` the tiles become a
 * selection (single: radio group; multiple: toggles). `label` names the row visibly;
 * `density="compact"` fits up to six on one shared surface.
 */
/** Compact: as many as fit at 140px or more, at most six; they stretch to fill the shared surface. Shifted 1px past the
 * surface's end and bottom so the outer lines of the last column and row are clipped and only the dividers show. */
const GROUP_COMPACT = "-me-px -mb-px grid grid-cols-[repeat(auto-fit,minmax(max(140px,calc(100%_/_6)),1fr))]";
const COMPACT_SURFACE = "overflow-hidden rounded-ds-large bg-ds-surface-raised shadow-ds-raised";

export function StatGroup({
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledByProp,
  selectionMode,
  label,
  density = "default",
  ...selection
}: StatGroupProps) {
  const labelId = React.useId();
  const labelledBy = labelledByProp ?? (label != null ? labelId : undefined);
  const compact = density === "compact";
  const className = compact ? GROUP_COMPACT : GROUP;
  const group = selectionMode ? (
    <AriaToggleButtonGroup
      {...selection}
      selectionMode={selectionMode}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      data-slot="stat-group"
      data-density={compact ? "compact" : undefined}
      className={className}
    >
      <SelectableContext.Provider value={true}>{children}</SelectableContext.Provider>
    </AriaToggleButtonGroup>
  ) : (
    <div
      role={ariaLabel || labelledBy ? "group" : undefined}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      data-slot="stat-group"
      data-density={compact ? "compact" : undefined}
      className={className}
    >
      {children}
    </div>
  );
  const body = compact ? (
    <DensityContext.Provider value="compact">
      <div data-slot="stat-group-surface" className={COMPACT_SURFACE}>{group}</div>
    </DensityContext.Provider>
  ) : (
    group
  );
  if (label == null) return body;
  return (
    <div data-slot="stat-group-frame" className="flex min-w-0 flex-col gap-ds-100">
      <span id={labelId} data-slot="stat-group-label" className="text-heading-xxsmall text-ds-text-subtle">{label}</span>
      {body}
    </div>
  );
}
