"use client";

/**
 * The two report charts: WaterfallChart and Heatmap. Both sit on the shared ChartFrame (loading, empty
 * and the data-table alternative) through the charts' Shell, unchanged.
 */

import * as React from "react";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocale } from "react-aria-components";

import { cn } from "../utils";
import type { TableColumn } from "../collection/table";
import {
  chartChangeLabel,
  chartDecreaseLabel,
  chartIncreaseLabel,
  chartNoValueLabel,
  chartPeriodLabel,
  chartTotalLabel,
  chartValueLabel,
  heatmapLessLabel,
  heatmapMoreLabel,
} from "../i18n";
import { formattedValues, tickAxisWidth, tickOverhang, tickWrapWidth, valueAxisTicks } from "./axis-width";
import { ChartLegend, ChartTooltip, useChartAnimation, useChartDirection, type ChartValueFormatter } from "./chart-parts";
import { HEAT_LEVELS, heatmapThresholds, levelOf } from "./list-charts";
import { Shell, useOnce } from "./more-charts";
import { CategoryTick, LineSpan, ValueTick, placedLine } from "./value-tick";

const plain: ChartValueFormatter = (value) => String(value);
/**
 * The size is in `style` as well, with its unit: Recharts measures a tick for wrapping in a hidden span that
 * takes only the tick's `style` (assigned as is, so a bare 11 is dropped). Without it the span kept the page's
 * body size (14–16px) and a tick that fits at 11px broke over two lines ("−€" above "1.350.000").
 */
const AXIS_TICK = { fill: "var(--ds-text-subtlest)", fontSize: 11, style: { fontVariantNumeric: "tabular-nums", fontSize: "11px" } } as const;
/** U+2212: the typographic minus, the same width as the plus. */
const MINUS = "−";

type FrameProps = {
  /** What the chart shows ("Income and expenses"), over it; leave it out when a card or a heading already says so. */
  title?: string;
  /** Names the chart when it has no visible `title`. */
  "aria-label"?: string;
  /** The period it covers ("September 2026"). */
  period?: string;
  isLoading?: boolean;
  /** Shown instead of the plot when there is no data: an `EmptyState size="small"` or text; "No data" by default. */
  emptyState?: React.ReactNode;
};

/* ── WaterfallChart ───────────────────────────────────────────────────────── */

export type WaterfallChartStep = { name: string; value: number };

export type WaterfallChartProps = FrameProps & {
  /**
   * The opening total ("Opening balance"), a total bar from zero; the running total starts at 0 without it. A
   * start without a finite value (NaN, ±Infinity) is left out the same way, with a warning in the console: no
   * start bar, the running total starts at 0, and the end total is the finite steps' sum (never NaN).
   */
  start?: WaterfallChartStep;
  /**
   * The changes, in order: a positive value raises the running total, a negative one lowers it, and a zero leaves
   * it (a neutral step: a flat 1.5px line at the running total, labeled "€ 0" with no sign, and no legend key of
   * its own). Steps without a finite value are left out, with a warning in the console. When nothing moves off
   * zero (no step, or every figure zero, start included), the chart counts it as nothing measured and shows the
   * empty state.
   */
  steps: readonly WaterfallChartStep[];
  /** The closing total's name ("Net"): a total bar from zero to the start plus every step. */
  endLabel: string;
  /**
   * Shared by the axis, the labels, the tooltip and the table ("€ 48.920"). Changes and a negative total are
   * formatted by their size with a `+` or `−` before them, so the formatter sees non-negative values there.
   */
  valueFormatter?: ChartValueFormatter;
  /** The plot's height in px; 240 by default. */
  height?: number;
};

/** One bar of the waterfall: where it starts and ends on the value axis, and what it is. */
export type WaterfallRow = {
  key: string;
  name: string;
  /** `zero`: a step of 0 (or one within float residue of it), neither an increase nor a decrease. */
  kind: "start" | "increase" | "decrease" | "zero" | "end";
  /** The step's signed change; undefined for a total. */
  change?: number;
  /** The running total before and after this bar (a total runs from 0). */
  from: number;
  to: number;
};

/** Relative tolerance under which a sum counts as zero: float residue such as 0.1 + 0.2 − 0.3 (5.6e−17). */
const RESIDUE = 1e-9;

/**
 * The waterfall's bars: the start total from zero, each step from the running total to the next one, the end
 * total from zero to where the steps left it. Running totals may go below zero. A start or step without a
 * finite value is left out (the chart warns), so the end total is the sum of the finite figures. Running totals
 * and changes within float residue of zero (relative to the largest figure), and −0, are stored as 0, so they
 * never print as "−€ 0" or count as a decrease.
 */
export function waterfallRows(start: WaterfallChartStep | undefined, steps: readonly WaterfallChartStep[], endLabel: string): WaterfallRow[] {
  const finite = [start, ...steps].filter((step): step is WaterfallChartStep => step !== undefined && Number.isFinite(step.value));
  const scale = Math.max(1, ...finite.map((step) => Math.abs(step.value)));
  // `|| 0` turns −0 into 0.
  const clean = (value: number) => (Math.abs(value) < RESIDUE * scale ? 0 : value || 0);
  const rows: WaterfallRow[] = [];
  let running = 0;
  if (start && Number.isFinite(start.value)) {
    running = clean(start.value);
    rows.push({ key: "0", name: start.name, kind: "start", from: 0, to: running });
  }
  for (const step of steps) {
    if (!Number.isFinite(step.value)) continue;
    const from = running;
    const change = clean(step.value);
    running = clean(running + change);
    const kind = change < 0 ? "decrease" : change > 0 ? "increase" : "zero";
    rows.push({ key: String(rows.length), name: step.name, kind, change, from, to: running });
  }
  rows.push({ key: String(rows.length), name: endLabel, kind: "end", from: 0, to: running });
  return rows;
}

/** The value axis's narrowest: the 56px it always had. */
const AXIS_MIN = 56;
/** The value axis's tick count; its ticks are Recharts' own for it. */
const WATERFALL_TICKS = 5;

/** A tick of the value axis: the size through the formatter, a negative one with the typographic minus. */
const tickText = (format: ChartValueFormatter) => (value: number) => (value < 0 ? `${MINUS}${format(-value)}` : format(value));

/**
 * The ticks the value axis draws between the data's extremes: Recharts' own nice ticks for its `["auto", "auto"]`
 * domain, which takes in zero (every total stands on it).
 */
export function waterfallTicks(low: number, high: number): number[] {
  return valueAxisTicks([low, high], WATERFALL_TICKS);
}

/**
 * The value axis's width, as the other charts size theirs (axis-width's tickAxisWidth): its longest
 * tick as Recharts draws it (a negative one with its minus), at its estimated width plus the 8px Recharts draws it
 * in from the plot, never under 56px and never over 128px. Ticks too long for 128px are shown with compact figures
 * in the chart's locale, and the axis is sized for those. It was 7px a character of the longer of the data's ends
 * rounded up: over a figure's real 7px, under a "€" or an "%", and not always the tick drawn.
 */
export function waterfallAxisWidth(low: number, high: number, format: ChartValueFormatter, locale?: string): number {
  const ticks = waterfallTicks(low, high);
  return tickAxisWidth(ticks.map(tickText(format)), AXIS_MIN, 0, locale, formattedValues(ticks, tickText(format)));
}

/**
 * How the three kinds part without hue: all in `ds-chart-1`. Totals are solid; steps
 * are outlined in it, an increase filled with a 25% tint (lighter), a decrease hatched (a pattern). Every label
 * and table cell carries the sign as well. These are the legend's and the tooltip's keys; the bars draw the same.
 */
const KEY_OUTLINE = ["0 0/100% 1.5px", "0 100%/100% 1.5px", "0 0/1.5px 100%", "100% 0/1.5px 100%"]
  .map((place) => `linear-gradient(var(--ds-chart-1), var(--ds-chart-1)) ${place} no-repeat`)
  .join(", ");
const INCREASE_TINT = "color-mix(in oklab, var(--ds-chart-1) 25%, transparent)";
const WATERFALL_KEY = {
  total: "var(--ds-chart-1)",
  increase: `${KEY_OUTLINE}, ${INCREASE_TINT}`,
  decrease: `${KEY_OUTLINE}, repeating-linear-gradient(135deg, var(--ds-chart-1) 0 1.5px, transparent 1.5px 3.5px)`,
  /** A zero step's tooltip key: the outline alone, neither tinted nor hatched. Never in the legend. */
  zero: KEY_OUTLINE,
} as const;
const keyOf = (kind: WaterfallRow["kind"]) => (kind === "start" || kind === "end" ? WATERFALL_KEY.total : WATERFALL_KEY[kind]);

/** `+€ 12.000`, `−€ 3.400`, `€ 0`: the sign spelled out, the size through the formatter. */
const signed = (value: number, format: ChartValueFormatter, plus = true) =>
  `${value > 0 && plus ? "+" : value < 0 ? MINUS : ""}${format(Math.abs(value))}`;

type PlotRow = WaterfallRow & { band: [number, number] };

/**
 * A running total built from positive and negative steps, with the start and end totals: how revenue becomes
 * net after each expense. Bars float from the running total before a step to the one after it, joined by thin
 * dashed connectors; totals stand on zero, and a zero line shows when a total goes negative. Totals are solid
 * `ds-chart-1`, increases outlined with a 25% tint, decreases outlined and hatched, each labeled with its signed
 * value. The arrow keys move between bars with the tooltip (change and running total); the data table has them all.
 */
export function WaterfallChart({ title, "aria-label": ariaLabel, period, start, steps, endLabel, valueFormatter = plain, isLoading, emptyState, height = 240, ...table }: WaterfallChartProps) {
  const { locale } = useLocale();
  const animate = useChartAnimation();
  const direction = useChartDirection();
  const patternId = `ds-waterfall-hatch-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  useOnce(
    [start, ...steps].some((step) => step && !Number.isFinite(step.value)),
    "WaterfallChart: a start or steps without a finite value are left out; the end total is the sum of the finite figures.",
  );
  const rows: PlotRow[] = waterfallRows(start, steps, endLabel).map((row) => ({ ...row, band: [Math.min(row.from, row.to), Math.max(row.from, row.to)] }));
  // Nothing to draw: no step, or every figure zero (start included), which counts as nothing measured.
  const isEmpty = rows.every((row) => row.from === 0 && row.to === 0);
  const low = Math.min(0, ...rows.map((row) => row.band[0]));
  const high = Math.max(0, ...rows.map((row) => row.band[1]));
  const axisWidth = waterfallAxisWidth(low, high, valueFormatter, locale);
  // The 20px top margin holds a top value tick of up to three lines; one of more takes the room it needs above its
  // gridline past the 8px a one-line tick takes (axis-width's tickOverhang).
  const axisTicks = waterfallTicks(low, high);
  const axisTexts = axisTicks.map(tickText(valueFormatter));
  const top = Math.max(20, 8 + tickOverhang(axisTexts.at(-1), tickWrapWidth(axisWidth), locale, axisTexts, formattedValues(axisTicks, tickText(valueFormatter))));
  const total = chartTotalLabel(locale);
  const change = chartChangeLabel(locale);
  const isTotal = (row: WaterfallRow) => row.kind === "start" || row.kind === "end";
  const label = (row: WaterfallRow) => (isTotal(row) ? signed(row.to, valueFormatter, false) : signed(row.change!, valueFormatter));
  const tableRows = rows.map((row) => ({ ...row, changeText: isTotal(row) ? "" : signed(row.change!, valueFormatter), totalText: signed(row.to, valueFormatter, false) }));
  const columns: TableColumn<(typeof tableRows)[number]>[] = [
    { key: "name", header: title ?? ariaLabel ?? "", isRowHeader: true },
    { key: "changeText", header: change, align: "end" },
    { key: "totalText", header: total, align: "end" },
  ];
  // A zero step enables no key: it is neither an increase nor a decrease, and its label says "€ 0".
  const kinds = new Set<string>(rows.map((row) => (isTotal(row) ? "total" : row.kind)));
  const legend = (
    <ChartLegend
      items={[
        { key: "increase", label: chartIncreaseLabel(locale), color: WATERFALL_KEY.increase, kind: "bar" as const },
        { key: "decrease", label: chartDecreaseLabel(locale), color: WATERFALL_KEY.decrease, kind: "bar" as const },
        { key: "total", label: total, color: WATERFALL_KEY.total, kind: "bar" as const },
      ].filter((item) => kinds.has(item.key))}
    />
  );
  return (
    <Shell table={table} title={title} aria-label={ariaLabel} period={period} isLoading={isLoading} emptyState={emptyState} isEmpty={isEmpty} height={height} legend={legend} columns={columns} rows={tableRows}>
      <div data-slot="waterfall" className="h-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={rows} barCategoryGap="20%" accessibilityLayer margin={{ top, right: 4, bottom: 0, left: 4 }}>
            <defs>
              {/* The decrease's hatch: 1.5px ds-chart-1 stripes at 45°, every 5px. */}
              <pattern id={patternId} data-slot="waterfall-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="5" stroke="var(--ds-chart-1)" strokeWidth="1.5" />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--ds-border)" />
            <XAxis
              dataKey="key"
              reversed={direction.reversed}
              tickLine={false}
              axisLine={{ stroke: "var(--ds-border-bold)" }}
              // Recharts' ticks, kept inside the chart: the last step's name may be wider than its band.
              tick={<CategoryTick {...AXIS_TICK} />}
              tickFormatter={(key: string) => rows[Number(key)]?.name ?? ""}
            />
            <YAxis
              orientation={direction.valueAxis}
              tickLine={false}
              axisLine={false}
              // The DS's tick (ValueTick), given the room the axis has for it: a figure never parts from its sign and
              // currency, and ticks too long for 128px show compact figures.
              tick={<ValueTick {...AXIS_TICK} width={tickWrapWidth(axisWidth)} axisTicks={waterfallTicks(low, high)} />}
              tickCount={WATERFALL_TICKS}
              // Wide enough for its longest tick ("−€ 2.000.000"), 56–128px.
              width={axisWidth}
              // Every total stands on zero, so the data's own range includes it; "auto" rounds both ends.
              domain={["auto", "auto"]}
              tickFormatter={tickText(valueFormatter)}
            />
            {low < 0 && <ReferenceLine y={0} stroke="var(--ds-border-bold)" className="ds-waterfall-zero" />}
            {/* Connectors: from each bar's end level to the next bar, so the eye follows the running total. */}
            {rows.slice(0, -1).map((row, index) => (
              <ReferenceLine
                key={`connector-${row.key}`}
                segment={[
                  { x: row.key, y: row.to },
                  { x: rows[index + 1]!.key, y: row.to },
                ]}
                stroke="var(--ds-border-bold)"
                strokeDasharray="2 2"
                ifOverflow="visible"
              />
            ))}
            <Bar dataKey="band" isAnimationActive={animate} shape={(props: unknown) => <WaterfallBar {...(props as BarShape)} patternId={patternId} label={label} />} />
            <Tooltip
              isAnimationActive={animate}
              cursor={{ fill: "var(--ds-background-neutral)", opacity: 0.5 }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as PlotRow | undefined;
                if (!active || !row) return null;
                return (
                  <ChartTooltip
                    active
                    label={row.name}
                    payload={
                      isTotal(row)
                        ? [{ dataKey: "total", name: total, value: signed(row.to, valueFormatter, false), color: keyOf(row.kind) }]
                        : [
                            { dataKey: "change", name: change, value: signed(row.change!, valueFormatter), color: keyOf(row.kind) },
                            { dataKey: "total", name: total, value: signed(row.to, valueFormatter, false), color: "transparent" },
                          ]
                    }
                  />
                );
              }}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </Shell>
  );
}

type BarShape = { x?: number; y?: number; width?: number; height?: number; payload?: PlotRow };

/** About how wide an 11px tabular label is, per character: enough to tell whether it fits over its bar. */
const LABEL_CHAR = 6;

/**
 * One waterfall bar: solid for a total, outlined and tinted for an increase, outlined and hatched for a decrease, a
 * flat line for a zero step;
 * its signed value above it while that fits the bar's band (a narrow chart leaves it to the tooltip and table).
 */
function WaterfallBar({ x = 0, y = 0, width = 0, height = 0, payload, patternId, label }: BarShape & { patternId: string; label: (row: WaterfallRow) => string }) {
  if (!payload) return null;
  // Range bars can arrive with a negative size (a reversed axis); draw from the top-left corner. A zero step
  // shows as a flat 1.5px ds-chart-1 line at the running total (no outline box, no tint), so its place is not a gap.
  const left = width < 0 ? x + width : x;
  const top = height < 0 ? y + height : y;
  const w = Math.abs(width);
  const h = Math.max(1, Math.abs(height));
  const total = payload.kind === "start" || payload.kind === "end";
  const fill = total ? "var(--ds-chart-1)" : payload.kind === "increase" ? INCREASE_TINT : `url(#${patternId})`;
  const text = label(payload);
  // The bar is 80% of its band (barCategoryGap 20%): the label may use the whole band.
  const fits = text.length * LABEL_CHAR <= w / 0.8 - 4;
  return (
    <g data-slot="waterfall-bar" data-kind={payload.kind}>
      {fits && (
        <text
          data-slot="waterfall-label"
          x={left + w / 2}
          y={top - 6}
          textAnchor="middle"
          fill="var(--ds-text-subtle)"
          fontSize={11}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {/* In its own reading direction, centered where it was (value-tick's LineSpan). */}
          <LineSpan {...placedLine(text, left + w / 2, "middle")} inherited="middle" dy="0">
            {text}
          </LineSpan>
        </text>
      )}
      {total ? (
        <rect x={left} y={top} width={w} height={h} rx={2} fill={fill} />
      ) : payload.kind === "zero" ? (
        <rect x={left} y={top - 0.75} width={w} height={1.5} fill="var(--ds-chart-1)" />
      ) : (
        // The outline inside the bar's box, so increases and decreases keep the totals' width.
        <rect x={left + 0.75} y={top + 0.75} width={Math.max(0, w - 1.5)} height={Math.max(0, h - 1.5)} rx={1.5} fill={fill} stroke="var(--ds-chart-1)" strokeWidth={1.5} />
      )}
    </g>
  );
}

/* ── Heatmap ───────────────────────────────────────────────────── */

export type HeatmapCell = {
  /** The cell's row and column, as named in `rows` and `columns`. */
  row: string;
  column: string;
  /**
   * `null`: the period is in the grid but has no data (hatched, "No data"), never the same as 0. A negative value
   * draws as step 0, like zero (the scale counts up from nothing); its name and the table keep the signed value.
   */
  value: number | null;
  /** The cell's name for screen readers and the tooltip's title; "row, column: value" by default. */
  label?: string;
};

export type HeatmapProps = FrameProps & {
  /** The rows, top to bottom ("Week 1" …, or the months). Names are unique: cells find their row by name. */
  rows: readonly string[];
  /**
   * The columns, from the inline start (the weekdays, or the weeks). Names are unique, as for `rows`: a name given
   * twice draws both, but every cell of that name lands in the first (the chart warns).
   */
  columns: readonly string[];
  /** One entry per cell; a row and column with no entry draws no cell (a day outside the month). */
  data: readonly HeatmapCell[];
  /** The row headers' name ("Week"), on the data table's first header and the grid's corner; "Period" by default. */
  rowHeader?: string;
  /**
   * Four strictly ascending lower bounds of the four intensity steps; from the positive values' quartiles by
   * default. Bounds out of order still count each bound a value reaches, so the steps no longer follow the values
   * (the chart warns).
   */
  thresholds?: readonly [number, number, number, number];
  /**
   * `auto` (default): steps from the values' quartiles, no text over the cells. `percent`: values are ratios from 0 to 1
   * (cohort retention) on fixed steps (above 0, 25%, 50%, 75%) that read the same across rows; each cell prints its
   * percent in a color the theme checks for contrast on that step, and the scale reads "0% … 100%".
   */
  scale?: "auto" | "percent";
  valueFormatter?: ChartValueFormatter;
  onCellPress?: (cell: HeatmapCell) => void;
};

/** Figures over each step: the theme's ink on the light steps, its checked on-chart inks on the two strongest. */
const HEAT_TEXT = ["text-ds-text", "text-ds-text", "text-ds-text", "text-ds-text-on-chart-heat", "text-ds-text-on-chart"] as const;
/** Percent steps: above zero, then each quarter. */
const PERCENT_BOUNDS = [Number.EPSILON, 0.25, 0.5, 0.75] as const;

/** A cell with no data: hatched, so it never passes for zero's flat `ds-background-neutral`. */
const HEAT_MISSING = "repeating-linear-gradient(135deg, var(--ds-background-neutral-pressed) 0 2px, transparent 2px 5px)";

type Slot = { cell: HeatmapCell; row: number; column: number; index: number };

/** Whether the bounds rise strictly, each one finite: otherwise the steps no longer follow the values. */
const ascending = (bounds: readonly number[]) => bounds.every((bound, index) => Number.isFinite(bound) && (index === 0 || bound > bounds[index - 1]!));
const hasDuplicates = (names: readonly string[]) => new Set(names).size !== names.length;

/**
 * A value over a grid of two cycles, month by weekday or week by weekday: when demand peaks. Cells share
 * the CalendarHeatmap's five steps (zero or less in `ds-background-neutral`, then the `ds-chart-1` ramp, steps
 * that differ in lightness), a cell with no data is hatched and named "No data", and a pair with no entry draws an
 * empty gap. Column labels above, row labels at the inline start, a "Less … More" scale under the grid. No text is
 * drawn over the cells.
 *
 * Screen readers: every row of the grid has as many cells as the header row (the corner is a column header named
 * by `rowHeader`, a gap an empty, unfocusable grid cell), so each cell sits under its own column's header.
 *
 * Keyboard and pointer: one tab stop. The arrow keys move focus a cell (mirrored in RTL, skipping gaps), Home
 * and End go to the row's ends, Ctrl+Home and Ctrl+End to the grid's; Enter and Space press the focused cell.
 * Hovering never moves focus or the tab stop. The tooltip shows the cell under the pointer while it is over one,
 * and the focused cell otherwise; a key that moves focus hands the tooltip back to the focused cell until the
 * pointer enters another cell. Escape hides it.
 */
export function Heatmap({ title, "aria-label": ariaLabel, period, rows, columns, data, rowHeader, thresholds, scale = "auto", valueFormatter: formatterProp, onCellPress, isLoading, emptyState, ...table }: HeatmapProps) {
  const { locale } = useLocale();
  const percent = scale === "percent";
  const percentFormat = React.useMemo(() => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }), [locale]);
  const valueFormatter: ChartValueFormatter = formatterProp ?? (percent ? (value) => percentFormat.format(value) : plain);
  const { isRtl } = useChartDirection();
  const animate = useChartAnimation();
  const noValue = chartNoValueLabel(locale);
  const rowHeaderLabel = rowHeader ?? chartPeriodLabel(locale);
  // Cells by position; a pair given twice keeps its last entry.
  const byPair = new Map<string, HeatmapCell>();
  for (const cell of data) if (rows.includes(cell.row) && columns.includes(cell.column)) byPair.set(`${cell.row}\u0000${cell.column}`, cell);
  useOnce(data.some((cell) => !rows.includes(cell.row) || !columns.includes(cell.column)), "Heatmap: a cell outside rows and columns is left out.");
  useOnce(hasDuplicates(rows) || hasDuplicates(columns), "Heatmap: rows and columns need unique names; a repeated name's cells are drawn in its first row or column only.");
  useOnce(thresholds !== undefined && !ascending(thresholds), "Heatmap: thresholds must be four finite, strictly ascending bounds.");
  const slots: Slot[] = [];
  const grid: (Slot | undefined)[][] = rows.map((row, r) =>
    columns.map((column, c) => {
      // A repeated name is a gap after its first place, so no cell is drawn (or reached by the arrows) twice.
      if (rows.indexOf(row) !== r || columns.indexOf(column) !== c) return undefined;
      const cell = byPair.get(`${row}\u0000${column}`);
      if (!cell) return undefined;
      const slot = { cell, row: r, column: c, index: slots.length };
      slots.push(slot);
      return slot;
    }),
  );
  const values = slots.map((slot) => slot.cell.value).filter((value): value is number => value !== null && Number.isFinite(value));
  const bounds = thresholds ?? (percent ? PERCENT_BOUNDS : heatmapThresholds(values));
  const hasMissing = slots.some((slot) => slot.cell.value === null || !Number.isFinite(slot.cell.value));
  const format = (value: number | null) => (value === null || !Number.isFinite(value) ? noValue : valueFormatter(value));
  const nameOf = (cell: HeatmapCell) => cell.label ?? `${cell.row}, ${cell.column}: ${format(cell.value)}`;
  // levelOf gives a negative value step 0, the same as zero.
  const fillOf = (cell: HeatmapCell) => (cell.value === null || !Number.isFinite(cell.value) ? HEAT_MISSING : HEAT_LEVELS[levelOf(cell.value, bounds)]!);

  // The roving tab stop and the keys follow focus only (the first cell until the reader moves); the pointer only
  // ever sets `hovered`, which the tooltip prefers while `tip.hover` holds.
  const [focused, setFocused] = React.useState(0);
  const [hovered, setHovered] = React.useState<number | null>(null);
  const [tip, setTip] = React.useState<{ focus: boolean; hover: boolean }>({ focus: false, hover: false });
  const current = Math.min(focused, Math.max(0, slots.length - 1));
  const cells = React.useRef<(HTMLElement | null)[]>([]);
  const move = (from: Slot, key: string, ctrl: boolean): Slot | undefined => {
    const forward = isRtl ? "ArrowLeft" : "ArrowRight";
    const back = isRtl ? "ArrowRight" : "ArrowLeft";
    const walk = (dr: number, dc: number) => {
      for (let r = from.row + dr, c = from.column + dc; r >= 0 && r < rows.length && c >= 0 && c < columns.length; r += dr, c += dc) {
        if (grid[r]![c]) return grid[r]![c];
      }
      return undefined;
    };
    if (key === forward) return walk(0, 1);
    if (key === back) return walk(0, -1);
    if (key === "ArrowDown") return walk(1, 0);
    if (key === "ArrowUp") return walk(-1, 0);
    if (key === "Home") return ctrl ? slots[0] : grid[from.row]!.find(Boolean);
    if (key === "End") return ctrl ? slots[slots.length - 1] : [...grid[from.row]!].reverse().find(Boolean);
    return undefined;
  };

  const tableRows = rows.map((row, r) => ({
    id: r,
    row,
    ...Object.fromEntries(columns.map((_, c) => [`c${c}`, grid[r]![c] ? format(grid[r]![c]!.cell.value) : ""])),
  })) as ({ id: number; row: string } & Record<string, string>)[];
  const tableColumns: TableColumn<(typeof tableRows)[number]>[] = [
    { key: "row", header: rowHeaderLabel, isRowHeader: true },
    ...columns.map((column, c) => ({ key: `c${c}`, header: column, align: "end" as const })),
  ];
  // Cell rows of 28px with 3px gaps, the column labels, the scale and their gaps.
  const height = 16 + 6 + rows.length * 28 + Math.max(0, rows.length - 1) * 3 + 12 + 20;
  const focusedSlot = slots[current];
  const hoveredSlot = hovered === null ? undefined : slots[hovered];
  const tipSlot = tip.hover && hoveredSlot ? hoveredSlot : tip.focus ? focusedSlot : undefined;

  return (
    <Shell table={table}
      title={title}
      aria-label={ariaLabel}
      period={period}
      isLoading={isLoading}
      emptyState={emptyState}
      isEmpty={values.length === 0}
      height={height}
      columns={tableColumns}
      rows={tableRows}
    >
      <div data-slot="heatmap" className="relative flex min-w-0 flex-col gap-ds-150">
        <div className="min-w-0 overflow-x-auto" data-slot="heatmap-scroll">
          <div
            role="grid"
            aria-label={title ?? ariaLabel}
            data-slot="heatmap-grid"
            className="grid min-w-max gap-[3px]"
            // Percent cells hold their figure ("100%"), so they are wider.
            style={{ gridTemplateColumns: `max-content repeat(${columns.length}, minmax(${percent ? "2.75rem" : "1.5rem"}, 1fr))` }}
            onKeyDown={(event) => {
              // Every key acts on the focused cell, never on the one under the pointer.
              if (!focusedSlot) return;
              if (event.key === "Enter" || event.key === " ") {
                // Space never scrolls the page from inside the grid.
                event.preventDefault();
                onCellPress?.(focusedSlot.cell);
                return;
              }
              if (event.key === "Escape") {
                setTip({ focus: false, hover: false });
                return;
              }
              const next = move(focusedSlot, event.key, event.ctrlKey || event.metaKey);
              if (!next) return;
              event.preventDefault();
              setFocused(next.index);
              // The keyboard takes the tooltip back from the pointer.
              setTip({ focus: true, hover: false });
              cells.current[next.index]?.focus();
            }}
            onFocus={() => setTip((state) => ({ ...state, focus: true }))}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTip((state) => ({ ...state, focus: false }));
            }}
            onMouseLeave={() => {
              setHovered(null);
              setTip((state) => ({ ...state, hover: false }));
            }}
          >
            <div role="row" className="contents">
              {/* The corner heads the row headers' column, so every row has as many cells as this one. */}
              <span role="columnheader" aria-label={rowHeaderLabel} data-slot="heatmap-corner" className="h-4" />
              {columns.map((column, c) => (
                <span key={c} role="columnheader" data-slot="heatmap-column" className="h-4 truncate text-center text-[11px] leading-4 text-ds-text-subtlest">
                  {column}
                </span>
              ))}
            </div>
            {rows.map((row, r) => (
              <div key={r} role="row" data-slot="heatmap-row" className="contents">
                <span role="rowheader" className="flex h-7 items-center truncate pe-ds-100 text-body-small text-ds-text-subtle">
                  <bdi>{row}</bdi>
                </span>
                {columns.map((_, c) => {
                  const slot = grid[r]![c];
                  // An empty, unfocusable cell: it keeps the column count, so the cells after it stay under their headers.
                  if (!slot) return <span key={c} role="gridcell" data-slot="heatmap-gap" className="h-7" />;
                  const missing = slot.cell.value === null || !Number.isFinite(slot.cell.value);
                  return (
                    <span
                      key={c}
                      ref={(element) => {
                        cells.current[slot.index] = element;
                      }}
                      role="gridcell"
                      aria-label={nameOf(slot.cell)}
                      data-slot="heatmap-cell"
                      data-state={missing ? "missing" : slot.cell.value === 0 ? "zero" : "value"}
                      data-level={missing ? undefined : levelOf(slot.cell.value!, bounds)}
                      tabIndex={slot.index === current ? 0 : -1}
                      onFocus={() => setFocused(slot.index)}
                      onMouseEnter={() => {
                        setHovered(slot.index);
                        setTip((state) => ({ ...state, hover: true }));
                      }}
                      onMouseLeave={() => setHovered((index) => (index === slot.index ? null : index))}
                      onClick={() => onCellPress?.(slot.cell)}
                      className={cn(
                        "h-7 rounded-[3px] outline-hidden focus-visible:inset-ring-2 focus-visible:inset-ring-ds-border-focused",
                        animate && "transition-[background-color] duration-150",
                        onCellPress && "cursor-pointer",
                        percent && "flex items-center justify-center",
                      )}
                      style={{ background: fillOf(slot.cell) }}
                    >
                      {percent && !missing && (
                        // The cell's name already says the value; the figure is for the eye.
                        <span aria-hidden data-slot="heatmap-figure" className={cn("text-[11px] font-medium leading-none tabular-nums", HEAT_TEXT[levelOf(slot.cell.value!, bounds)])}>
                          {format(slot.cell.value)}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div data-slot="heatmap-scale" className="flex flex-wrap items-center gap-x-ds-200 gap-y-ds-050 text-body-small text-ds-text-subtle">
          <span className="flex items-center gap-ds-075">
            <span>{percent ? valueFormatter(0) : heatmapLessLabel(locale)}</span>
            <span aria-hidden className="flex gap-[3px]">
              {HEAT_LEVELS.map((background, level) => (
                <span key={level} data-level={level} className="size-3 rounded-[2px]" style={{ background }} />
              ))}
            </span>
            <span>{percent ? valueFormatter(1) : heatmapMoreLabel(locale)}</span>
          </span>
          {hasMissing && (
            <span data-slot="heatmap-missing-key" className="flex items-center gap-ds-075">
              <span aria-hidden className="size-3 rounded-[2px]" style={{ background: HEAT_MISSING }} />
              {noValue}
            </span>
          )}
        </div>
        {tipSlot && (
          <HeatTooltip anchor={cells.current[tipSlot.index] ?? null} title={tipSlot.cell.label ?? `${tipSlot.cell.row} · ${tipSlot.cell.column}`}>
            <ChartTooltip
              active
              label={tipSlot.cell.label ?? `${tipSlot.cell.row} · ${tipSlot.cell.column}`}
              payload={[{ dataKey: "value", name: chartValueLabel(locale), value: format(tipSlot.cell.value), color: fillOf(tipSlot.cell) }]}
            />
          </HeatTooltip>
        )}
      </div>
    </Shell>
  );
}

/**
 * The shared ChartTooltip over a cell: above it, or under it when there is no room; kept inside the chart's
 * width. Placed again when the grid's sideways scroll container scrolls or the window resizes, so it stays on
 * its cell. Hidden from screen readers, which read the cell's own name.
 */
function HeatTooltip({ anchor, title, children }: { anchor: HTMLElement | null; title: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [place, setPlace] = React.useState<{ left: number; top: number } | null>(null);
  React.useLayoutEffect(() => {
    const tooltip = ref.current;
    const box = tooltip?.parentElement;
    if (!tooltip || !box || !anchor) return;
    const position = () => {
      const frame = box.getBoundingClientRect();
      const cell = anchor.getBoundingClientRect();
      const width = tooltip.offsetWidth;
      const heightOf = tooltip.offsetHeight;
      const center = cell.left - frame.left + cell.width / 2;
      const left = Math.min(Math.max(0, center - width / 2), Math.max(0, frame.width - width));
      // Above the cell while it fits in the viewport, under it otherwise.
      const top = cell.top - heightOf - 8 >= 0 ? cell.top - frame.top - heightOf - 8 : cell.bottom - frame.top + 8;
      setPlace((previous) => (previous && previous.left === left && previous.top === top ? previous : { left, top }));
    };
    position();
    const scroller = anchor.closest("[data-slot='heatmap-scroll']");
    scroller?.addEventListener("scroll", position, { passive: true });
    window.addEventListener("resize", position);
    return () => {
      scroller?.removeEventListener("scroll", position);
      window.removeEventListener("resize", position);
    };
  }, [anchor, title]);
  return (
    <div
      ref={ref}
      aria-hidden
      data-slot="heatmap-tooltip"
      // Its own width (max-content, at most the chart's), never squeezed by where it sits, so the placing
      // above measures the width it will have.
      className="pointer-events-none absolute z-10 w-max max-w-full"
      style={place ? { left: place.left, top: place.top } : { left: 0, top: 0, visibility: "hidden" }}
    >
      {children}
    </div>
  );
}
