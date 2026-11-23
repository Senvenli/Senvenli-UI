"use client";

import * as React from "react";
import { Button as AriaButton, useLocale } from "react-aria-components";

import { cn } from "../utils";
import { useMotionSetting } from "../defaults";
/** The OS reduced-motion preference. */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
import { Table, type TableColumn } from "../collection/table";
import { EmptyState } from "../feedback/empty-state";
import { Skeleton } from "../feedback/skeleton";
import { hideDataTableLabel, showDataTableLabel } from "../i18n";

/* ── Colors ─────────────────────────────────────────────────────────────── */

/** The categorical chart colors, in order; never hex in a chart. */
export const CHART_COLORS = ["var(--ds-chart-1)", "var(--ds-chart-2)", "var(--ds-chart-3)", "var(--ds-chart-4)", "var(--ds-chart-5)"] as const;
/** Comparison series (last year, the target, "other"). */
export const CHART_NEUTRAL = "var(--ds-chart-neutral)";
/** The color of the n-th series (0-based), cycling through the five. */
export const chartColor = (index: number) => CHART_COLORS[((index % CHART_COLORS.length) + CHART_COLORS.length) % CHART_COLORS.length]!;

/** Dash patterns for line series beyond the second: told apart by pattern, not hue alone. */
const LINE_DASHES = ["6 4", "2 3", "8 3 2 3"] as const;

export type ChartSeriesStyle = { color: string; strokeDasharray?: string };

/**
 * How the n-th series (0-based) is drawn. The chart
 * colors share one lightness, so series are told apart by lightness or pattern, never hue alone: the
 * first series is the brand color, a comparison series (last year, the target) is `ds-chart-neutral`,
 * lines after the second are dashed, and every series carries a legend key or a direct label. Bars and
 * areas take no pattern: their legend key or direct label tells them apart.
 */
export function chartSeries(index: number, options: { kind?: "line" | "area" | "bar"; isComparison?: boolean } = {}): ChartSeriesStyle {
  const color = options.isComparison ? CHART_NEUTRAL : chartColor(index);
  const strokeDasharray = options.kind === "line" && index >= 2 ? LINE_DASHES[(index - 2) % LINE_DASHES.length] : undefined;
  return strokeDasharray ? { color, strokeDasharray } : { color };
}

/* ── Animation ───────────────────────────────────────────────────────────── */

const ChartAnimationContext = React.createContext(true);

/**
 * Turns chart animation off for everything inside, deterministically: snapshot tests and the DS lab
 * render the final frame at once. Reduced motion turns it off without this.
 */
export function ChartAnimation({ isEnabled, children }: { isEnabled: boolean; children: React.ReactNode }) {
  return <ChartAnimationContext.Provider value={isEnabled}>{children}</ChartAnimationContext.Provider>;
}

function subscribeReducedMotion(listener: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
const reducedMotionNow = () => typeof window !== "undefined" && !!window.matchMedia?.(REDUCED_MOTION_QUERY).matches;

/** Whether a chart may animate: pass it to Recharts' `isAnimationActive`. */
export function useChartAnimation(): boolean {
  const enabled = React.useContext(ChartAnimationContext);
  const reduced = React.useSyncExternalStore(subscribeReducedMotion, reducedMotionNow, () => false);
  const setting = useMotionSetting();
  return enabled && !reduced && setting === "auto";
}

/* ── Direction ───────────────────────────────────────────────────────────── */

/**
 * How a cartesian chart follows the reading direction: in RTL time runs from the right, so the category
 * axis is reversed and the value axis sits on the right. Spread into Recharts' axes:
 * `<XAxis reversed={direction.reversed} />`, `<YAxis orientation={direction.valueAxis} />`.
 */
export function useChartDirection(): { isRtl: boolean; reversed: boolean; valueAxis: "left" | "right" } {
  const { direction } = useLocale();
  const isRtl = direction === "rtl";
  return { isRtl, reversed: isRtl, valueAxis: isRtl ? "right" : "left" };
}

/* ── Series visibility (the legend's toggle) ─────────────────────────────── */

/** Which series the legend has hidden; charts skip (or fade) hidden series. */
export function useChartSeries() {
  const [hidden, setHidden] = React.useState<ReadonlySet<string>>(new Set());
  const toggle = React.useCallback((key: string) => {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const isHidden = React.useCallback((key: string) => hidden.has(key), [hidden]);
  return { hidden, toggle, isHidden };
}

/* ── Tooltip ─────────────────────────────────────────────────────────────── */

export type ChartValueFormatter = (value: number) => string;

/** One series in the tooltip, as Recharts hands it over. */
export type ChartTooltipEntry = { dataKey?: string | number; name?: string | number; value?: unknown; color?: string; stroke?: string; fill?: string };

export type ChartTooltipProps = {
  /** Set by Recharts when used as `<Tooltip content={<ChartTooltip … />} />`. */
  active?: boolean;
  payload?: readonly ChartTooltipEntry[];
  label?: unknown;
  /** Shared with the chart: "€ 55,0k". */
  valueFormatter?: ChartValueFormatter;
  /** The period title ("August 2026"); the category label by default. */
  labelFormatter?: (label: unknown) => React.ReactNode;
  /** Series names by data key ("2026", "Website"). */
  labels?: Readonly<Record<string, string>>;
  /** An optional change row, colored by meaning ("Change +11.8%"). */
  change?: (payload: readonly ChartTooltipEntry[]) => { label: string; value: string; tone: "success" | "danger" | "neutral" } | null;
};

const CHANGE_TONE = { success: "text-ds-text-success", danger: "text-ds-text-danger", neutral: "text-ds-text-subtle" } as const;

/**
 * The tooltip every chart uses: the period as title, one row per series with its color key and value
 * in tabular figures, and an optional change row. On `ds-surface-overlay`. It follows keyboard focus on
 * data points as well as the pointer (Recharts' accessibility layer moves it with the arrow keys).
 */
export function ChartTooltip({ active, payload, label, valueFormatter = String, labelFormatter, labels, change }: ChartTooltipProps) {
  // Recharts draws the tooltip inside its wrapper, which the plot keeps left to right (ChartFrame): the tooltip takes the
  // page's direction back, so its rows read and align as the page does.
  const { direction } = useLocale();
  if (!active || !payload?.length) return null;
  const changeRow = change?.(payload);
  return (
    <div data-slot="chart-tooltip" dir={direction} className="flex min-w-36 flex-col gap-ds-050 rounded-ds-medium bg-ds-surface-overlay px-ds-150 py-ds-100 text-body-small text-ds-text shadow-ds-overlay">
      <span className="text-body-strong">{labelFormatter ? labelFormatter(label) : String(label ?? "")}</span>
      {payload.map((entry, index) => {
        const key = String(entry.dataKey ?? entry.name ?? "");
        return (
          // By position too: a composed chart may draw one key twice (an area and a line on revenue).
          <span key={`${index}-${key}`} data-slot="chart-tooltip-row" className="flex items-center gap-ds-100">
            <span aria-hidden className="size-2.5 shrink-0 rounded-ds-xsmall" style={{ background: entry.color ?? entry.stroke ?? entry.fill }} />
            <span className="text-ds-text-subtle">{labels?.[key] ?? String(entry.name ?? key)}</span>
            <bdi className="ms-auto ps-ds-200 font-medium tabular-nums">{typeof entry.value === "number" ? valueFormatter(entry.value) : String(entry.value ?? "")}</bdi>
          </span>
        );
      })}
      {changeRow && (
        <span data-slot="chart-tooltip-change" className={cn("flex items-center gap-ds-100", CHANGE_TONE[changeRow.tone])}>
          {changeRow.label}
          <bdi className="ms-auto ps-ds-200 font-medium tabular-nums">{changeRow.value}</bdi>
        </span>
      )}
    </div>
  );
}

/* ── Legend ──────────────────────────────────────────────────────────────── */

export type ChartLegendItem = {
  key: string;
  label: string;
  color: string;
  /** Lines get a 2px line key (dashed like the line); areas and bars a 10px square. */
  kind?: "line" | "area" | "bar";
  /** The line's dash pattern, from `chartSeries()`. */
  strokeDasharray?: string;
};

export type ChartLegendProps = {
  items: readonly ChartLegendItem[];
  /** From `useChartSeries()`: pressing a key hides or shows its series. Leave out for a static legend. */
  hidden?: ReadonlySet<string>;
  onToggle?: (key: string) => void;
};

/** Series keys with their labels in `ds-text-subtle`; pressing one hides or shows it (hidden at 45%). */
export function ChartLegend({ items, hidden, onToggle }: ChartLegendProps) {
  return (
    <div data-slot="chart-legend" className="flex flex-wrap items-center gap-x-ds-200 gap-y-ds-050 text-body-small text-ds-text-subtle">
      {items.map((item) => {
        const isHidden = hidden?.has(item.key) ?? false;
        const key =
          item.kind === "line" ? (
            <svg aria-hidden data-slot="chart-legend-key" data-kind="line" width="16" height="2" className="shrink-0 overflow-visible">
              <line x1="0" y1="1" x2="16" y2="1" stroke={item.color} strokeWidth="2" strokeDasharray={item.strokeDasharray} />
            </svg>
          ) : (
            <span aria-hidden data-slot="chart-legend-key" data-kind={item.kind ?? "area"} className="size-2.5 shrink-0 rounded-ds-xsmall" style={{ background: item.color }} />
          );
        return onToggle ? (
          <AriaButton
            key={item.key}
            aria-pressed={!isHidden}
            data-slot="chart-legend-item"
            onPress={() => onToggle(item.key)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-ds-075 rounded-ds-small outline-hidden data-[hovered]:text-ds-text",
              "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused",
              isHidden && "opacity-45",
            )}
          >
            {key}
            {item.label}
          </AriaButton>
        ) : (
          <span key={item.key} data-slot="chart-legend-item" className="inline-flex items-center gap-ds-075">
            {key}
            {item.label}
          </span>
        );
      })}
    </div>
  );
}

/* ── Frame: loading, empty, the chart, and its data table ────────────────── */

export type ChartDataTable<T> = {
  /** Names the table ("Monthly revenue"). */
  caption: string;
  columns: readonly TableColumn<T>[];
  rows: readonly T[];
  rowKey?: (row: T) => string | number;
  /** Opens a row's item from the shown table: the keyboard's way to what a press on a data point opens. */
  onRowAction?: (row: T) => void;
};

export type ChartFrameProps<T> = {
  /** The chart's height in px: loading, empty and the plot all keep it. */
  height: number;
  isLoading?: boolean;
  /** Shown instead of the plot when there is nothing to draw (a compact EmptyState); `null` while there is data. */
  emptyState?: React.ReactNode;
  /**
   * The same data as a compact Table: always there for screen readers, shown on request. Cells are
   * values: a `render` that returns text (a formatted figure) is used; anything else falls back to the
   * raw value in the hidden table.
   */
  dataTable: ChartDataTable<T>;
  /** The Legend: above the plot, or below it (LineChart). */
  legend?: React.ReactNode;
  legendPlacement?: "top" | "bottom";
  /**
   * The Recharts chart (inside a ResponsiveContainer), named by the table's caption. Its keyboard layer
   * (arrow keys move between data points, the tooltip follows) stays on; the table carries the data in full.
   */
  children: React.ReactNode;
};

/**
 * The frame every chart sits in. While loading, a Skeleton at the chart's real size; with nothing to
 * draw, a compact EmptyState in the same space; otherwise the plot. Under every chart a "Show the data
 * as a table" button shows the same data as a compact Table, which screen readers get by default.
 */
export function ChartFrame<T extends object>({ height, isLoading, emptyState, dataTable, legend, legendPlacement = "top", children }: ChartFrameProps<T>) {
  const { locale } = useLocale();
  const [showTable, setShowTable] = React.useState(false);
  const tableId = React.useId();
  const isEmpty = emptyState !== undefined && emptyState !== null && emptyState !== false;
  const hasData = !isLoading && !isEmpty;
  const { rows, rowKey = (row: T) => (row as { id: string | number }).id, onRowAction } = dataTable;
  const rowAction = onRowAction && ((key: React.Key) => {
    const row = rows.find((candidate) => String(rowKey(candidate)) === String(key));
    if (row) onRowAction(row);
  });
  const plot = isLoading ? (
    <div data-slot="chart-loading" aria-busy="true" style={{ height }} className="flex flex-col gap-ds-150">
      <Skeleton width="40%" height={16} />
      <Skeleton height={Math.max(0, height - 16 - 12)} radius="medium" />
    </div>
  ) : isEmpty ? (
    // At least the chart's height; a very short chart grows rather than clipping the message.
    <div data-slot="chart-empty" style={{ minHeight: height }} className="grid place-items-center">
      {emptyState}
    </div>
  ) : (
    <div
      role="group"
      aria-label={dataTable.caption}
      data-slot="chart-plot"
      style={{ height }}
      className={cn(
        "min-w-0",
        // Recharts places SVG text for LTR; an inherited rtl flips its anchors (labels over bars, clipped
        // reference labels). The plot stays ltr inside; useChartDirection mirrors the axes themselves.
        "[&_.recharts-wrapper]:[direction:ltr]",
        // Recharts' keyboard layer: its focusable surface takes the DS focus border, drawn inside the plot (an inset
        // outline, as an inset ring would be on an element; an SVG has none). The style is named: Tailwind v4's
        // outline-hidden sets the outline style to none, and a width alone keeps it.
        "[&_.recharts-surface]:outline-hidden [&_.recharts-surface:focus-visible]:rounded-ds-small [&_.recharts-surface:focus-visible]:outline-2",
        "[&_.recharts-surface:focus-visible]:outline-solid",
        "[&_.recharts-surface:focus-visible]:-outline-offset-2 [&_.recharts-surface:focus-visible]:outline-ds-border-focused",
      )}
    >
      {children}
    </div>
  );
  const legendRow = legend && (hasData ? legend : <div aria-hidden inert className="invisible">{legend}</div>);
  return (
    <div data-slot="chart-frame" className="flex min-w-0 flex-col gap-ds-150">
      {/* Loading and empty keep the legend's and the toggle's rows, so the frame does not jump when data arrives. */}
      {legendPlacement === "top" && legendRow}
      {plot}
      {legendPlacement === "bottom" && legendRow}
      {hasData ? (
        <>
          <AriaButton
            aria-expanded={showTable}
            aria-controls={tableId}
            data-slot="chart-table-toggle"
            onPress={() => setShowTable((value) => !value)}
            className="w-max cursor-pointer rounded-ds-small text-body-small font-[500] text-ds-link outline-hidden data-[hovered]:underline data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused"
          >
            {showTable ? hideDataTableLabel(locale) : showDataTableLabel(locale)}
          </AriaButton>
          {/* Collapsed, the box clips the visually hidden table: a table never shrinks below its content, so a
              long caption would otherwise stick out past the page edge. */}
          <div id={tableId} data-slot="chart-data-table" className={showTable ? undefined : "relative overflow-hidden"}>
            {showTable ? (
              <Table
                aria-label={dataTable.caption}
                density="compact"
                columns={dataTable.columns}
                rows={dataTable.rows}
                rowKey={dataTable.rowKey}
                onRowAction={rowAction}
              />
            ) : (
              // Collapsed: the same data as a plain table, for screen readers only. Nothing in it takes focus,
              // so Tab never lands in something unseen.
              <PlainTable caption={dataTable.caption} columns={dataTable.columns} rows={dataTable.rows} rowKey={dataTable.rowKey} />
            )}
          </div>
        </>
      ) : (
        <div aria-hidden className="h-4" data-slot="chart-table-toggle-space" />
      )}
    </div>
  );
}

/** The data table as plain, non-interactive markup, visually hidden: what screen readers get by default. */
function PlainTable<T extends object>({ caption, columns, rows, rowKey = (row) => (row as { id: string | number }).id }: ChartDataTable<T>) {
  // The same row-header rule as Table: the marked column, or the first.
  const rowHeader = Math.max(0, columns.findIndex((column) => column.isRowHeader));
  return (
    <table data-slot="chart-data-table-plain" className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col">
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((column, index) => {
              const raw = (row as Record<string, React.ReactNode>)[column.key];
              const rendered = column.render?.(row);
              // Text only: a rendered link or button here would be a focus stop no one can see.
              const value = typeof rendered === "string" || typeof rendered === "number" ? rendered : raw;
              const isHeader = index === rowHeader;
              return isHeader ? (
                <th key={column.key} scope="row">
                  {value}
                </th>
              ) : (
                <td key={column.key}>{value}</td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
