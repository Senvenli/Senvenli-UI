"use client";

import * as React from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart as RechartsComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  usePlotArea,
  type LabelProps,
} from "recharts";
import { useLocale } from "react-aria-components";

import { chartCategoryLabel, chartNoDataLabel, chartPeriodLabel } from "../i18n";

import {
  CHART_NEUTRAL,
  ChartFrame,
  ChartLegend,
  ChartTooltip,
  chartColor,
  chartSeries,
  useChartAnimation,
  useChartDirection,
  useChartSeries,
  type ChartLegendItem,
  type ChartTooltipProps,
  type ChartValueFormatter,
} from "./chart-parts";
import type { TableColumn } from "../collection/table";
import { type FormattedValues, chartNumber, formattedValues, labelText, textLines, textWidth, tickAxisWidth, tickOverhang, tickWrapWidth, valueAxisTicks, valueAxisWidth } from "./axis-width";
import { CategoryTick, LineSpan, NameTick, type PlacedLine, ValueTick, clippedLine, firstLineDy, isolatedLabel, placedLine } from "./value-tick";

/* ── Shared ───────────────────────────────────────────────────────────────── */

type Row = Record<string, unknown>;

export type ChartBaseProps<T extends Row> = {
  /** What the chart shows ("Revenue"). */
  title: string;
  /** The period it covers ("June–September 2026"). */
  period?: string;
  /** The headline figure, in `metric-medium` ("€ 184,2k"). */
  total?: React.ReactNode;
  data: readonly T[];
  /** The x key: the period or category of each row. */
  index: keyof T & string;
  /** The series keys, in order; the first is the product's own figure (`ds-chart-1`). */
  categories: readonly (keyof T & string)[];
  /** Series names by key ("web" → "Website"); the key by default. */
  labels?: Readonly<Partial<Record<string, string>>>;
  /** Shared by axis, tooltip and table (Intl): "€ 48.920". */
  valueFormatter?: ChartValueFormatter;
  /** The index label in the tooltip and the table ("August 2026"). */
  indexFormatter?: (value: unknown) => string;
  /** The index column's header in the data table; "Period" for time charts, "Category" for BarChart. */
  indexLabel?: string;
  /** The plot's height in px; 240 by default. */
  height?: number;
  isLoading?: boolean;
  /** Shown instead of the plot when `data` is empty; "No data for this period" by default. */
  emptyMessage?: { title: string; description?: string };
  /**
   * `false` for whole counts (orders, new customers): the value axis steps by whole numbers, so a small count
   * reads 0 / 1 / 2 / 3, never 0.7 / 1.4 / 2.1. Fractional steps by default. Percent bars keep their
   * 0–100% steps.
   */
  allowDecimals?: boolean;
};

/**
 * The size is in `style` as well, with its unit: Recharts measures a tick for wrapping in a hidden span that
 * takes only the tick's `style` (assigned as is, so a bare 11 is dropped). Without it the span kept the page's
 * body size (14–16px) and a tick that fits at 11px broke over two lines ("€" above "1.500.000").
 */
const AXIS_TICK = { fill: "var(--ds-text-subtlest)", fontSize: 11, style: { fontVariantNumeric: "tabular-nums", fontSize: "11px" } } as const;
/** A label's 11px (bar totals, reference lines), in `style` too: Recharts measures labels for wrapping the same way. */
const LABEL_SIZE = { fontSize: 11, style: { fontSize: "11px" } } as const;
const plainNumber: ChartValueFormatter = (value) => String(value);

function useShell<T extends Row>(
  props: ChartBaseProps<T>,
  seriesKeys: readonly string[],
  kinds: Readonly<Record<string, ChartLegendItem["kind"]>>,
  options: { comparison?: string; indexKind?: "period" | "category"; dashes?: Readonly<Record<string, string>> } = {},
) {
  const { comparison, indexKind = "period", dashes } = options;
  const { data, index, labels, valueFormatter = plainNumber, indexFormatter = String } = props;
  const { locale } = useLocale();
  const series = useChartSeries();
  const animate = useChartAnimation();
  const direction = useChartDirection();
  const label = (key: string) => labels?.[key] ?? key;
  let colorIndex = 0;
  const styles = Object.fromEntries(
    seriesKeys.map((key) => {
      const isComparison = key === comparison;
      const style = chartSeries(isComparison ? 0 : colorIndex, { kind: kinds[key], isComparison });
      if (!isComparison) colorIndex += 1;
      return [key, dashes?.[key] ? { ...style, strokeDasharray: dashes[key] } : style];
    }),
  );
  const legend: ChartLegendItem[] = seriesKeys.map((key) => ({ key, label: label(key), kind: kinds[key], ...styles[key]! }));
  // A value as the chart plots it (a numeric string too, as Recharts draws it); "—" for a gap.
  const shown = (row: T, key: string, format: ChartValueFormatter) => {
    const value = chartNumber(row[key]);
    return value === undefined ? "—" : format(value);
  };
  const columns: TableColumn<T>[] = [
    {
      key: index,
      header: props.indexLabel ?? (indexKind === "category" ? chartCategoryLabel(locale) : chartPeriodLabel(locale)),
      isRowHeader: true,
      render: (row) => indexFormatter(row[index]),
    },
    ...seriesKeys.map((key) => ({
      key,
      header: label(key),
      align: "end" as const,
      render: (row: T) => shown(row, key, valueFormatter),
    })),
  ];
  const tooltip = (
    <Tooltip
      cursor={{ stroke: "var(--ds-border-bold)", strokeWidth: 1 }}
      isAnimationActive={animate}
      content={<PlottedTooltip valueFormatter={valueFormatter} labelFormatter={indexFormatter} labels={Object.fromEntries(seriesKeys.map((key) => [key, label(key)]))} />}
    />
  );
  return { series, animate, direction, styles, legend, columns, tooltip, label, valueFormatter, indexFormatter, locale, shown };
}

/**
 * @internal The tooltip over a chart's own rows (Recharts hands it the raw values): a value shown as the chart
 * plots it, a numeric string ("1450000") formatted as the number it is drawn at, as the data table shows it.
 * Shared with RadarChart.
 */
export function PlottedTooltip({ payload, ...props }: ChartTooltipProps) {
  return <ChartTooltip {...props} payload={payload?.map((entry) => ({ ...entry, value: chartNumber(entry.value) ?? entry.value }))} />;
}

/** Title, period and the headline figure over the chart. */
/** @internal Shared with the other chart modules; not exported from the package. */
export function ChartHeader({ title, period, total }: Pick<ChartBaseProps<Row>, "title" | "period" | "total">) {
  return (
    <div data-slot="chart-header" className="flex flex-wrap items-end justify-between gap-x-ds-300 gap-y-ds-050">
      <div className="flex min-w-0 flex-col items-start">
        <bdi className="text-body-strong text-ds-text">{title}</bdi>
        {period && <bdi className="text-body-small text-ds-text-subtle">{period}</bdi>}
      </div>
      {total != null && (
        <bdi data-slot="chart-total" className="text-metric-medium text-ds-text">
          {total}
        </bdi>
      )}
    </div>
  );
}

function Shell<T extends Row>({
  props,
  shell,
  legendPlacement,
  showLegend,
  onResize,
  children,
}: {
  props: ChartBaseProps<T>;
  shell: ReturnType<typeof useShell<T>>;
  legendPlacement?: "top" | "bottom";
  showLegend: boolean;
  /** The chart's measured width, each time it changes (never on the server). */
  onResize?: (width: number) => void;
  children: React.ReactElement;
}) {
  const height = props.height ?? 240;
  // Rows keyed by position: two rows may share a category value.
  const positions = React.useMemo(() => new Map(props.data.map((row, position) => [row, position])), [props.data]);
  return (
    <section data-slot="chart" aria-label={props.title} className="flex min-w-0 flex-col gap-ds-200">
      <ChartHeader title={props.title} period={props.period} total={props.total} />
      <ChartFrame
        height={height}
        isLoading={props.isLoading}
        emptyMessage={props.data.length === 0 ? props.emptyMessage ?? { title: chartNoDataLabel(shell.locale) } : null}
        legendPlacement={legendPlacement}
        legend={showLegend ? <ChartLegend items={shell.legend} hidden={shell.series.hidden} onToggle={shell.series.toggle} /> : undefined}
        dataTable={{ caption: [props.title, props.period].filter(Boolean).join(" · "), columns: shell.columns, rows: props.data, rowKey: (row) => positions.get(row) ?? String(row[props.index]) }}
      >
        <ResponsiveContainer width="100%" height="100%" onResize={onResize ? (width) => onResize(Math.round(width)) : undefined}>
          {children}
        </ResponsiveContainer>
      </ChartFrame>
    </section>
  );
}

const VALUE_TICKS = 4;
/** A value axis is never narrower than this, so short figures ("€ 54", "120") keep the axis they always had. */
const VALUE_AXIS_MIN = 48;

/**
 * A value axis wide enough for its longest tick: the ticks Recharts draws for these values, formatted, at their
 * estimated width (axis-width's textWidth) plus the 8px Recharts draws them in from the plot, 48–128px. A fixed
 * 48px kept "€ 20.000" (48px at 11px) over two lines, since Recharts wraps a tick unless it is narrower than the
 * axis. Ticks too long for the 128px axis are shown with compact figures in the chart's locale, and the axis is
 * sized for those (axis-width's tickAxisWidth).
 */
const valueWidth = (values: Iterable<unknown>, format: ChartValueFormatter, locale: string, allowDecimals = true) =>
  valueAxisWidth(values, format, { tickCount: VALUE_TICKS, min: VALUE_AXIS_MIN, locale, allowDecimals });

/** The values of these keys in every row: what a `[0, "auto"]` value axis spans. */
function valuesOf<T extends Row>(data: readonly T[], keys: readonly string[]): unknown[] {
  return data.flatMap((row) => keys.map((key) => row[key]));
}

/**
 * A value axis. Its ticks are the DS's ({@link ValueTick}: a figure with its sign and currency never parts, and
 * a tick too long for its room shows its figures compact), given `ticks`, the values the axis draws, so an axis
 * that needs a compact figure shows every tick compact. `beside` for an axis beside the plot, whether the chart
 * sized it from its ticks or an app gave its width (AreaChart's `yAxisWidth`): each tick is given the room it has,
 * the axis less the 8px inset (axis-width's tickWrapWidth), so a tick clipped to it never passes the axis's outer
 * edge, the chart's (given the whole axis, the clip began 8px past it). A horizontal axis under the
 * plot gives each tick Recharts' room.
 */
const yAxisProps = (
  shell: { direction: ReturnType<typeof useChartDirection>; valueFormatter: ChartValueFormatter },
  width: number,
  beside: boolean,
  ticks: readonly number[] | undefined,
  allowDecimals = true,
) => ({
  orientation: shell.direction.valueAxis,
  tickLine: false,
  axisLine: false,
  tick: <ValueTick {...AXIS_TICK} {...(beside ? { width: tickWrapWidth(width) } : {})} axisTicks={ticks} />,
  tickCount: VALUE_TICKS,
  // The steps Recharts draws must be the ones the axis was sized and formatted for (`ticks`).
  allowDecimals,
  width,
  tickFormatter: (value: number) => shell.valueFormatter(value),
});

/**
 * How far a vertical value axis's top tick stands above the chart's 8px top margin (axis-width's tickOverhang): the
 * room a top tick of several lines takes above its gridline, in the room {@link yAxisProps} gives it, so the chart's
 * top margin holds it ("€ 1.500.000 net | this month" passed the svg's top by 4px). 0 for a one-line top tick.
 */
const valueAxisOverhang = (format: ChartValueFormatter, width: number, ticks: readonly number[] | undefined, locale: string) => {
  if (!ticks || ticks.length === 0) return 0;
  const texts = ticks.map((value) => format(value));
  // Recharts' ticks rise from the axis's start: the last is the top one.
  return tickOverhang(texts.at(-1), tickWrapWidth(width), locale, texts, formattedValues(ticks, format));
};

/** The chart's top margin: 8px, and the room the top value tick takes past one line. */
const CHART_TOP = 8;

/** The time or category axis under the plot: Recharts' ticks, kept inside the chart ({@link CategoryTick}). */
const xAxisProps = (index: string, shell: { direction: ReturnType<typeof useChartDirection> }) => ({
  dataKey: index,
  reversed: shell.direction.reversed,
  tickLine: false,
  axisLine: { stroke: "var(--ds-border-bold)" },
  tick: <CategoryTick {...AXIS_TICK} />,
});

/**
 * The chart's margins around a time axis whose periods sit on the plot's edges (AreaChart, LineChart, a
 * ComposedChart without bars): Recharts centers the last period's tick on the plot's end, so half of it stands past
 * the plot. The end side (the right, the left in RTL, where the axis is reversed) is at least half that tick's
 * estimated width (axis-width's textWidth, as drawn in tabular figures), so "Sep" no longer passes the chart's edge;
 * 4px as before where it is narrower. The start side is the value axis's, which holds the first tick's other half.
 */
function edgeMargin<T extends Row>(data: readonly T[], index: string, isRtl: boolean, overhang = 0) {
  const last = data.at(-1);
  const end = Math.max(CHART_EDGE, Math.ceil(textWidth(last === undefined ? "" : String(last[index] ?? ""), "tabular") / 2));
  return { top: CHART_TOP + overhang, right: isRtl ? CHART_EDGE : end, bottom: 0, left: isRtl ? end : CHART_EDGE };
}

const GRID = <CartesianGrid vertical={false} stroke="var(--ds-border)" />;
/** The hover point: ringed in the surface color so it reads on the line. */
const ACTIVE_DOT = { r: 4, strokeWidth: 2, stroke: "var(--ds-surface-raised)" };

/* ── AreaChart ───────────────────────────────────────────────────────────── */

export type AreaChartProps<T extends Row> = ChartBaseProps<T> & {
  /** The previous period's key: a dashed `ds-chart-neutral` line without fill. */
  comparison?: keyof T & string;
  /** The value axis' width in px; by default wide enough for its longest tick (48–128px). */
  yAxisWidth?: number;
  /** A pointer press on the chart: the row under it (keyboard users read values in the tooltip and the table). */
  onValueChange?: (row: T | null) => void;
};

/**
 * How one quantity changes over time, optionally against the previous period: a 2px `ds-chart-1` line
 * over a 16% fill, the comparison dashed in `ds-chart-neutral` without fill. The value axis starts at
 * zero; a vertical guide and a ringed point follow the pointer and the arrow keys.
 */
export function AreaChart<T extends Row>(props: AreaChartProps<T>) {
  const { data, index, categories, comparison, yAxisWidth, onValueChange, allowDecimals = true } = props;
  const keys = comparison ? [...categories, comparison] : [...categories];
  const shell = useShell(props, keys, Object.fromEntries(keys.map((key) => [key, key === comparison ? "line" : "area"])), {
    comparison,
    dashes: comparison ? { [comparison]: "6 4" } : undefined,
  });
  const values = valuesOf(data, keys.filter((key) => !shell.series.isHidden(key)));
  const axisWidth = yAxisWidth ?? valueWidth(values, shell.valueFormatter, shell.locale, allowDecimals);
  const ticks = valueAxisTicks(values, VALUE_TICKS, allowDecimals);
  return (
    <Shell props={props} shell={shell} showLegend={keys.length > 1}>
      <RechartsComposedChart
        data={data as Row[]}
        accessibilityLayer
        // Recharts 3 reports the active index as a string.
        onClick={(state) => {
          const position = state?.activeIndex == null ? NaN : Number(state.activeIndex);
          onValueChange?.(Number.isInteger(position) ? (data[position] ?? null) : null);
        }}
        margin={edgeMargin(data, index, shell.direction.isRtl, valueAxisOverhang(shell.valueFormatter, axisWidth, ticks, shell.locale))}
      >
        {GRID}
        <XAxis {...xAxisProps(index, shell)} />
        <YAxis {...yAxisProps(shell, axisWidth, true, ticks, allowDecimals)} domain={[0, "auto"]} />
        {categories
          .filter((key) => !shell.series.isHidden(key))
          .map((key) => (
            <Area
              key={key}
              dataKey={key as string}
              name={key}
              type="monotone"
              stroke={shell.styles[key]!.color}
              strokeWidth={2}
              fill={shell.styles[key]!.color}
              fillOpacity={0.16}
              activeDot={ACTIVE_DOT}
              isAnimationActive={shell.animate}
            />
          ))}
        {comparison && !shell.series.isHidden(comparison) && (
          <Line dataKey={comparison as string} name={comparison} type="monotone" stroke={CHART_NEUTRAL} strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={ACTIVE_DOT} isAnimationActive={shell.animate} />
        )}
        {shell.tooltip}
      </RechartsComposedChart>
    </Shell>
  );
}

/* ── LineChart ───────────────────────────────────────────────────────────── */

export type ChartReferenceLine = { value: number; label: string };

export type LineChartProps<T extends Row> = ChartBaseProps<T> & {
  /** A target or an average: dashed `ds-border-bold` with a label at its end. */
  referenceLines?: readonly ChartReferenceLine[];
  /** Join across missing values; gaps stay gaps by default. */
  connectNulls?: boolean;
};

/**
 * A few series over time where the shape matters: 2px lines with round joins (dashed after the second,
 * so they part by pattern as well as hue), optional reference lines, and the legend below with line keys.
 * Up to five lines; more needs filtering, not more colors.
 */
export function LineChart<T extends Row>(props: LineChartProps<T>) {
  const { data, index, categories, referenceLines, connectNulls, allowDecimals = true } = props;
  const shell = useShell(props, categories, Object.fromEntries(categories.map((key) => [key, "line"])));
  useOnce(categories.length > 5, "LineChart: at most five lines; filter (pick regions) instead of adding colors.");
  const values = valuesOf(data, categories.filter((key) => !shell.series.isHidden(key)));
  const axisWidth = valueWidth(values, shell.valueFormatter, shell.locale, allowDecimals);
  const ticks = valueAxisTicks(values, VALUE_TICKS, allowDecimals);
  return (
    <Shell props={props} shell={shell} showLegend legendPlacement="bottom">
      <RechartsComposedChart data={data as Row[]} accessibilityLayer margin={edgeMargin(data, index, shell.direction.isRtl, valueAxisOverhang(shell.valueFormatter, axisWidth, ticks, shell.locale))}>
        {GRID}
        <XAxis {...xAxisProps(index, shell)} />
        <YAxis {...yAxisProps(shell, axisWidth, true, ticks, allowDecimals)} />
        {referenceLines?.map((line) => (
          <ReferenceLine
            key={line.label}
            y={line.value}
            stroke="var(--ds-border-bold)"
            strokeDasharray="4 4"
            // At the line's end, just above it.
            label={{ value: line.label, position: shell.direction.isRtl ? "insideBottomLeft" : "insideBottomRight", fill: "var(--ds-text-subtle)", ...LABEL_SIZE, ...isolatedLabel(line.label, shell.direction.isRtl ? "insideBottomLeft" : "insideBottomRight") }}
          />
        ))}
        {categories
          .filter((key) => !shell.series.isHidden(key))
          .map((key) => (
            <Line
              key={key}
              dataKey={key as string}
              name={key}
              type="monotone"
              stroke={shell.styles[key]!.color}
              strokeDasharray={shell.styles[key]!.strokeDasharray}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={false}
              activeDot={ACTIVE_DOT}
              connectNulls={connectNulls}
              isAnimationActive={shell.animate}
            />
          ))}
        {shell.tooltip}
      </RechartsComposedChart>
    </Shell>
  );
}

/* ── BarChart ────────────────────────────────────────────────────────────── */

/**
 * The room for a horizontal bar's total, from its formatted text: its {@link textWidth} (each character at the
 * widest Geist or a fallback draws it at 11px: a figure 7px, "." and the space 3.5px, "€" 8px; format and bidi
 * marks, as the U+200F ar-EG puts before a currency figure, take none), plus the label's 5px gap. An estimate,
 * not a measurement, yet never under the drawn total: it is the same on the server, in tests and before the web
 * font loads, so the margin never moves between the first render and the next. Never under 48px (the room every
 * total had) and never over 96px, so a 390px phone keeps about 150px of bars. A longer total is not shortened:
 * the bar-end label ({@link BarEndLabel}) wraps it between its words within the room it has, in both directions,
 * or keeps a unit too wide for it on one line ending at the room's edge, so no figure is cut at the chart's edge. The tooltip and the data table have
 * the whole figure.
 */
const BAR_LABEL_GAP = 5;
const BAR_END_MIN = 48;
const BAR_END_MAX = 96;
/** How far a label that ends at its room's edge (the chart's edge, or the plot's start) stands in from it. */
const BAR_LABEL_INSET = 2;
/** The category names' column beside horizontal bars. */
const CATEGORY_AXIS = 112;
/** The chart's 4px edge on the side without totals. */
const CHART_EDGE = 4;

/** @internal A bar-end label's estimated width in px, as {@link barLabelRoom} counts it (no gap). */
export function barLabelWidth(text: string): number {
  return textWidth(text);
}

/** @internal The room for the widest of these bar-end totals, in px; 0 when there are none. */
export function barLabelRoom(texts: readonly string[]): number {
  if (texts.length === 0) return 0;
  const width = Math.max(...texts.map(barLabelWidth));
  return Math.min(BAR_END_MAX, Math.max(BAR_END_MIN, width + BAR_LABEL_GAP));
}

/**
 * @internal A bar-end label's lines for the room it has: whole when it fits, otherwise broken between its units
 * (axis-width's textLines and textUnits, the value ticks' rule too: only between two words with letters or after a
 * separator ending a word, "12 orders, | 3 canceled", never beside a figure, so a figure keeps its sign, currency,
 * unit and magnitude words), each line as long as fits, by the same estimate as the room. When a unit is wider
 * than the room the label stays one line, which ends at the room's edge.
 */
export function barLabelLines(text: string, room: number): string[] {
  return textLines(text, room);
}

/** A Cartesian box (a bar, the chart) as Recharts hands it to a label; a polar one has no `width`. */
const cartesian = (box: LabelProps["viewBox"]) => (box && "width" in box ? { x: box.x ?? 0, y: box.y ?? 0, width: box.width ?? 0, height: box.height ?? 0 } : undefined);

/**
 * @internal The total at a horizontal bar's end, in place of Recharts' own label: Recharts sized a
 * label that runs left (every bar in RTL, a negative one in LTR) by the room on its right, so in RTL a total
 * wider than its room stayed on one line and was cut at the chart's edge, and a negative bar's total ran over
 * the category names. This one stands 5px past the end the bar runs to, as Recharts' did, and is sized by the
 * room on that side:
 * - running forward (to the end room): up to the chart's edge;
 * - running back (a negative value): up to the plot's start, never over the category names; the value axis
 *   starts that much later where the chart's width allows it (see BarChart).
 * A label wider than that wraps between its units ({@link barLabelLines}: between words with letters, and after a
 * "," or "/" between figures); one that still does not fit (a unit wider than the room, kept on one line) ends 2px
 * short of the room's edge (the chart's edge, or the plot's start), over its own bar's tip, and reaches back no
 * further than 2px short of the plot's start on the category names' side (the chart's edge on the other): never
 * over the names. A unit wider than even that is shortened by the value ticks' own chain
 * (axis-width's labelText: compact and exact figures, then scientific notation, then its qualifiers dropped), and
 * what still passes is clipped there, each line's reading start in view (value-tick's clippedLine); such a label
 * carries the whole total as its accessible name and hover title. `totals` are the chart's labels with the totals
 * they were formatted from, which prove how the formatter writes its marks. The same estimate as the end room, so
 * the server and the first render draw it the same. Drawn as Recharts draws a label (a `recharts-label` text,
 * centered on the bar), each line in its own reading direction where the label is anchored (value-tick's LineSpan),
 * so a total that reads from the left and fits looks as before, and one that reads from the right
 * ("\u200f١٥٠٬٠٠٠ €") reads so.
 */
export function BarEndLabel({ viewBox, parentViewBox, value, fill, fontSize, style, totals }: LabelProps & { totals?: FormattedValues }) {
  const direction = useChartDirection();
  const plot = usePlotArea();
  const { locale } = useLocale();
  const clipId = `ds-bar-end-${React.useId().replace(/[^\w-]/g, "")}`;
  const bar = cartesian(viewBox);
  if (typeof value !== "string" || value === "" || !bar) return null;
  const { x, y, width, height } = bar;
  // The side the bar runs to on screen, and the side the values grow to (left in RTL: the axis is reversed).
  const runs = width < 0 ? -1 : 1;
  const forward = direction.reversed ? -1 : 1;
  const anchor = x + width + runs * BAR_LABEL_GAP;
  const chart = cartesian(parentViewBox);
  const chartWidth = chart?.width ?? 0;
  const edge = runs > 0 ? chartWidth : 0;
  const limit = runs === forward || !plot ? edge : runs > 0 ? plot.x + plot.width : plot.x;
  const room = Math.max(0, (limit - anchor) * runs);
  // Lines that still pass the room (a figure wider than it, by the estimate) end at the room's edge instead, 2px
  // in from it so they never touch the chart's edge: anchored there on their far side, so the browser's own width
  // places them, and a label narrower than its estimate covers no more of its bar than it must.
  const flushAt = limit - runs * BAR_LABEL_INSET;
  // Such a label runs back over the plot as far as `reach`: the plot's start where the category names stand (left in
  // LTR, right in RTL), the chart's edge on the other side; never over the names.
  const namesAhead = direction.isRtl ? runs < 0 : runs > 0;
  const reach = (plot && namesAhead ? (runs > 0 ? plot.x : plot.x + plot.width) : runs > 0 ? 0 : chartWidth) + runs * BAR_LABEL_INSET;
  const span = Math.max(0, (flushAt - reach) * runs);
  const widest = (lines: readonly string[]) => Math.max(...lines.map(barLabelWidth));
  // Wider than all of that (a figure of many digits in a narrow chart): shortened by the value ticks' chain; what
  // still passes `reach` is clipped there. Either way the whole total is its accessible name and hover title, and the
  // data table and the tooltip have it.
  const { lines, shortened } = labelText(value, room, span, locale, totals);
  const flush = widest(lines) > room;
  const clipped = flush && widest(lines) > span;
  // A clipped label's lines are each drawn from the clip's edge where they start to read, in their own direction, so
  // what stays in view is their reading start, the currency and figure a formatter writes first, never only their
  // tail ("▯xxxx" of "€ 1.450.000xxxx", and of "\u200f١٥٠ ترليون €xxxx"); the value ticks clip the same way.
  const clipStart = Math.min(reach, flushAt);
  const toward = clipped ? 1 : flush ? -runs : runs;
  const textAnchor = toward > 0 ? "start" : "end";
  // Every line in its own direction (value-tick's LineSpan), where the label is anchored: its left edge at the bar's end
  // when it runs right, its right edge when it runs left or ends at the room's edge.
  const lineAt = (line: string): PlacedLine => (clipped ? clippedLine(line, clipStart, span, "proportional") : placedLine(line, flush ? flushAt : anchor, textAnchor));
  const at = lineAt(lines[0] ?? "").x;
  // Recharts' Text centers lines on the bar: the first line's dy is (n − 1) / 2 lines up, plus half a cap height.
  const firstDy = firstLineDy(lines.length);
  return (
    <g>
      {clipped && (
        <clipPath id={clipId}>
          <rect x={clipStart} y={chart?.y ?? 0} width={span} height={chart?.height ?? 0} />
        </clipPath>
      )}
      <text
        x={at}
        y={y + height / 2}
        className="recharts-text recharts-label"
        data-slot="chart-bar-end-label"
        data-shortened={shortened || clipped || undefined}
        aria-label={shortened || clipped ? value : undefined}
        clipPath={clipped ? `url(#${clipId})` : undefined}
        textAnchor={textAnchor}
        fill={fill}
        fontSize={fontSize}
        style={style}
      >
        {(shortened || clipped) && <title>{value}</title>}
        {lines.map((line, index) => (
          <LineSpan key={index} {...lineAt(line)} inherited={textAnchor} dy={index === 0 ? firstDy : "1em"}>
            {line}
          </LineSpan>
        ))}
      </text>
    </g>
  );
}

/** Where a bar's total stands: its text, whether the bar runs forward (to the end room) and the value it ends at. */
type EndLabel = { text: string; forward: boolean; at: number };

/**
 * A stack as Recharts draws it (`stackOffset` "none"): its parts in series order, each from where the last one
 * ended, whatever their signs. A part counts as Recharts counts it (`Number(value)`: null is 0, `"1500000"` is
 * 1,500,000); one that is not a number (NaN) is skipped, the next one starting where it would have. `ends` are
 * the edges the parts reach (the value axis spans them); `last` the last part Recharts draws (one with a
 * non-zero length), which carries the stack's total.
 */
function walkStack(row: Row, parts: readonly string[]) {
  let reached = 0;
  const ends = [0];
  let last: { key: string; value: number } | undefined;
  for (const key of parts) {
    const raw = row[key];
    const value = raw === undefined || raw === null ? 0 : Number(raw);
    const end = reached + value;
    if (!Number.isFinite(end)) continue;
    ends.push(end);
    if (value !== 0) last = { key, value };
    reached = end;
  }
  return { total: reached, ends, last };
}

/** Every percent a 0–100% share axis can print: its ticks are shares rounded to whole percents. */
const PERCENT_STEPS = Array.from({ length: 101 }, (_, step) => step / 100);

export type BarChartProps<T extends Row> = ChartBaseProps<T> & {
  /** `grouped` periods side by side, `stacked` parts of a whole, `percent` parts as shares. */
  type?: "grouped" | "stacked" | "percent";
  /** `horizontal` for long category names, ranked; `vertical` columns by default. */
  layout?: "vertical" | "horizontal";
  /** A comparison series (last year): `ds-chart-neutral`. */
  comparison?: keyof T & string;
  /** Horizontal bars are sorted by their total unless the categories have a natural order (`none`). */
  sortBy?: "value" | "none";
  /** An average or target line. */
  referenceLines?: readonly ChartReferenceLine[];
};

/**
 * Values across categories or periods: grouped, stacked (at most five parts) or percent, in columns or
 * horizontal bars (labels at the start, totals at the bar end). Bars have a 2px corner radius and a 20%
 * gap in the band; the current series is `ds-chart-1`, a comparison `ds-chart-neutral`.
 */
export function BarChart<T extends Row>(props: BarChartProps<T>) {
  const { index, categories, type = "grouped", layout = "vertical", sortBy, referenceLines } = props;
  // A comparison has no meaning on a share axis: percent bars leave it out.
  const comparison = type === "percent" ? undefined : props.comparison;
  useOnce(type === "percent" && props.comparison !== undefined, "BarChart: a comparison is left out of percent bars; show it in a grouped chart.");
  const keys = comparison ? [...categories, comparison] : [...categories];
  const shell = useShell(props, keys, Object.fromEntries(keys.map((key) => [key, "bar"])), { comparison, indexKind: "category" });
  const horizontal = layout === "horizontal";
  const stacked = type !== "grouped";
  // The chart's measured width (horizontal bars only): none on the server and in the first render.
  const [chartWidth, setChartWidth] = React.useState<number | null>(null);
  useOnce(stacked && categories.length > 5, "BarChart: a stack holds at most five parts; put the rest in \"Other\".");
  // Totals count what is shown (visible series, never the comparison). The ranking counts every current
  // series, so the bars keep their order while the legend hides and shows parts.
  const sum = (row: T, of: readonly string[]) => of.reduce((acc, key) => acc + (chartNumber(row[key]) ?? 0), 0);
  const data = horizontal && (sortBy ?? "value") === "value" ? [...props.data].sort((a, b) => sum(b, categories) - sum(a, categories)) : [...props.data];
  const percent = type === "percent";
  // Decimal value steps unless whole ones are asked for; a share axis keeps its 0–100% steps.
  const axisDecimals = percent || props.allowDecimals !== false;
  const percentFormat = new Intl.NumberFormat(shell.locale, { style: "percent", maximumFractionDigits: 0 });
  const formatter = percent ? (value: number) => percentFormat.format(value) : shell.valueFormatter;
  const visible = keys.filter((key) => !shell.series.isHidden(key));
  // The stack's parts: what is shown, never the comparison (it sits beside the stack).
  const parts = visible.filter((key) => key !== comparison);
  const stacks = new Map(stacked ? data.map((row) => [row, walkStack(row, parts)] as const) : []);
  // The value axis spans what is drawn: each stack's edges as Recharts stacks it, a comparison on its own.
  const spans = stacked
    ? data.flatMap((row) => [...stacks.get(row)!.ends, ...valuesOf([row], visible.filter((key) => key === comparison))])
    : valuesOf(data, visible);
  /**
   * The total a bar carries past its end, if any: a stack's total on the last part Recharts draws (a part left
   * empty or at zero passes it on to the one before, so every stack with a part shows its total); a grouped bar's
   * and a comparison's own value. Percent bars carry none, and Recharts draws no bar for a gap or a zero.
   */
  const endLabel = (row: T, key: string): EndLabel | undefined => {
    if (!horizontal || percent) return undefined;
    if (stacked && key !== comparison) {
      const stack = stacks.get(row);
      if (!stack?.last || stack.last.key !== key) return undefined;
      return { text: shell.valueFormatter(stack.total), forward: stack.last.value > 0, at: stack.total };
    }
    const value = chartNumber(row[key]);
    if (value === undefined || value === 0) return undefined;
    return { text: shell.valueFormatter(value), forward: value > 0, at: value };
  };
  const labels = data.flatMap((row) => visible.map((key) => endLabel(row, key)).filter((label): label is EndLabel => label !== undefined));
  // Each total by its text: what proves how the formatter writes its marks (axis-width's labelText).
  const labelValues: FormattedValues = new Map(labels.map((label) => [label.text, label.at]));
  // The totals drawn in the end room: a bar running forward from zero or past it. One that runs forward but ends
  // below zero (a stack's negative total on a forward last part) stands inside the plot, and one that runs back
  // stands at the start side, so neither takes end room.
  const endTotals = labels.filter((label) => label.forward && label.at >= 0).map((label) => label.text);
  // Horizontal bars put the values on the x axis, whose ticks have the plot's width (the 48px is unused there);
  // percent bars span 0–100%, sized from every percent a tick can print.
  const valueAxisWidth = horizontal ? VALUE_AXIS_MIN : percent ? tickAxisWidth(PERCENT_STEPS.map(formatter), VALUE_AXIS_MIN, 0, shell.locale, formattedValues(PERCENT_STEPS, formatter)) : valueWidth(spans, formatter, shell.locale, axisDecimals);
  // A share axis's ticks are its percents, short in every locale.
  const valueTicks = percent ? undefined : valueAxisTicks(spans, VALUE_TICKS, axisDecimals);
  const valueAxis = yAxisProps({ ...shell, valueFormatter: formatter }, valueAxisWidth, !horizontal, valueTicks, axisDecimals);
  // Columns: the top value tick's lines past one stand above the plot (horizontal bars have their values below).
  const overhang = horizontal ? 0 : valueAxisOverhang(formatter, valueAxisWidth, valueTicks, shell.locale);
  const domain = percent ? [0, 1] : [0, "auto"];
  const categoryAxis = xAxisProps(index, shell);
  // Room for the totals at the bar end: on the right, or on the left in RTL; never under 48px, so the value
  // axis' last tick keeps the room it always had where no total is drawn (percent bars).
  const endRoom = horizontal ? Math.max(BAR_END_MIN, barLabelRoom(endTotals)) : 4;
  /*
   * A total that runs back (a negative bar, or a stack whose last part runs back) from zero or below stands
   * toward the category names. The value axis starts later by the room it needs, so it ends clear of them: per
   * label, its width plus the gap (at most the end room's 96px; a longer one wraps) less the room the plot already
   * leaves it before the axis' start, on Recharts' own ticks. Only once the chart's width is measured (none on the
   * server or in the first render, so both draw the same), and never more than half the plot: the bars keep the
   * other half however narrow the chart is, and a label that then has too little room wraps or ends at the plot's
   * start.
   */
  const startPadding = (() => {
    const back = labels.filter((label) => !label.forward && label.at <= 0);
    if (!horizontal || chartWidth === null || back.length === 0) return 0;
    const plotWidth = chartWidth - CHART_EDGE - endRoom - CATEGORY_AXIS;
    if (plotWidth <= 0) return 0;
    const ticks = valueAxisTicks(spans, VALUE_TICKS, axisDecimals);
    const low = ticks[0]!;
    const high = ticks.at(-1)!;
    let needed = 0;
    for (const label of back) {
      const room = Math.min(BAR_END_MAX, barLabelWidth(label.text) + BAR_LABEL_GAP);
      // How far along the axis the label's bar ends (0 at its start), and the padding that leaves it its room.
      const along = high > low ? (label.at - low) / (high - low) : 0;
      if (along < 1) needed = Math.max(needed, (room - along * plotWidth) / (1 - along));
    }
    return Math.min(Math.ceil(needed), Math.floor(plotWidth / 2));
  })();
  return (
    <Shell props={{ ...props, data }} shell={shell} showLegend={keys.length > 1} onResize={horizontal ? setChartWidth : undefined}>
      <RechartsComposedChart
        data={data as Row[]}
        layout={horizontal ? "vertical" : "horizontal"}
        stackOffset={percent ? "expand" : undefined}
        barCategoryGap="20%"
        accessibilityLayer
        // Room for totals at the bar ends, and above the plot for a reference line's label.
        margin={{
          top: horizontal && referenceLines?.length ? 20 : CHART_TOP + overhang,
          right: shell.direction.isRtl ? CHART_EDGE : endRoom,
          bottom: 0,
          left: shell.direction.isRtl ? endRoom : CHART_EDGE,
        }}
      >
        <CartesianGrid vertical={horizontal} horizontal={!horizontal} stroke="var(--ds-border)" />
        {horizontal ? (
          <>
            <XAxis
              type="number"
              {...valueAxis}
              domain={domain as [number, number]}
              orientation={undefined}
              reversed={shell.direction.reversed}
              // The axis' start is on the right in RTL.
              {...(startPadding > 0 ? { padding: shell.direction.reversed ? { right: startPadding } : { left: startPadding } } : {})}
            />
            <YAxis
              type="category"
              dataKey={index as string}
              orientation={shell.direction.valueAxis}
              tickLine={false}
              axisLine={false}
              width={CATEGORY_AXIS}
              // Recharts' own tick (its Text, its wrapping), each name in its own reading direction (value-tick's NameTick).
              tick={<NameTick {...AXIS_TICK} fill="var(--ds-text-subtle)" />}
            />
          </>
        ) : (
          <>
            <XAxis {...categoryAxis} />
            <YAxis {...valueAxis} domain={domain as [number, number]} />
          </>
        )}
        {referenceLines?.map((line) => (
          <ReferenceLine
            key={line.label}
            {...(horizontal ? { x: line.value } : { y: line.value })}
            stroke="var(--ds-border-bold)"
            strokeDasharray="4 4"
            label={{ value: line.label, position: horizontal ? "top" : shell.direction.isRtl ? "insideBottomLeft" : "insideBottomRight", fill: "var(--ds-text-subtle)", ...LABEL_SIZE, ...isolatedLabel(line.label, horizontal ? "top" : shell.direction.isRtl ? "insideBottomLeft" : "insideBottomRight") }}
          />
        ))}
        {visible.map((key) => (
          <Bar
            key={key}
            dataKey={key as string}
            name={key}
            // A comparison (last year) sits beside the stack, never on it.
            stackId={stacked && key !== comparison ? "stack" : undefined}
            fill={shell.styles[key]!.color}
            radius={2}
            isAnimationActive={shell.animate}
          >
            {/* Totals at the end of horizontal bars; each part of a stack asks whether it is the one that carries the total. */}
            {horizontal && !percent && (
              <LabelList
                valueAccessor={(entry: { payload?: T }) => (entry.payload ? endLabel(entry.payload, key)?.text : undefined)}
                content={(label: LabelProps) => <BarEndLabel {...label} totals={labelValues} />}
                fill="var(--ds-text-subtle)"
                {...LABEL_SIZE}
              />
            )}
          </Bar>
        ))}
        {shell.tooltip}
      </RechartsComposedChart>
    </Shell>
  );
}

/* ── ComposedChart ───────────────────────────────────────────────────────── */

export type ComposedSeries<T extends Row> = { key: keyof T & string; axis: "left" | "right" };

// Two value axes with their own units: whole steps are not offered here, where one setting would read as both.
export type ComposedChartProps<T extends Row> = Omit<ChartBaseProps<T>, "categories" | "valueFormatter" | "allowDecimals"> & {
  /** Volume: `ds-chart-2` bars. */
  bars: readonly ComposedSeries<T>[];
  /** Rate: `ds-chart-1` lines with ringed points. */
  lines: readonly ComposedSeries<T>[];
  /** One formatter per axis ("124 orders", "€ 54"); put the units in `period` or the title. */
  valueFormatters: { left: ChartValueFormatter; right: ChartValueFormatter };
};

/**
 * Two related measures with different units on one time axis: volume as `ds-chart-2` bars on the left
 * axis, a rate as a `ds-chart-1` line with ringed points on the right (mirrored in RTL). Only when their
 * relation is the point; otherwise use two charts.
 */
export function ComposedChart<T extends Row>(props: ComposedChartProps<T>) {
  const { data, index, bars, lines, valueFormatters } = props;
  const keys = [...lines.map((line) => line.key), ...bars.map((bar) => bar.key)];
  const axisOf = Object.fromEntries([...bars, ...lines].map((series) => [series.key, series.axis]));
  const shell = useShell(
    { ...props, categories: keys, valueFormatter: valueFormatters.left },
    keys,
    Object.fromEntries([...bars.map((bar) => [bar.key, "bar"]), ...lines.map((line) => [line.key, "line"])]),
  );
  // One sequence across both kinds, the line first (ds-chart-1) and the bar next (ds-chart-2), as the design
  // draws them; further lines are dashed, so no two series share a hue and a pattern.
  const order = Array.from({ length: Math.max(lines.length, bars.length) }, (_, position) => [lines[position]?.key, bars[position]?.key]).flat().filter(Boolean) as string[];
  const color = (key: string) => chartColor(order.indexOf(key));
  const lineDash = (key: string) => (lines.findIndex((line) => line.key === key) >= 1 ? "6 4" : undefined);
  const format = (key: string) => (axisOf[key] === "right" ? valueFormatters.right : valueFormatters.left);
  const columns: TableColumn<T>[] = [
    shell.columns[0]!,
    ...keys.map((key) => ({ key, header: shell.label(key), align: "end" as const, render: (row: T) => shell.shown(row, key, format(key)) })),
  ];
  const legend = shell.legend.map((item) => ({ ...item, color: color(item.key), strokeDasharray: item.kind === "line" ? lineDash(item.key) : undefined }));
  const usesRight = [...bars, ...lines].some((series) => series.axis === "right");
  const usesLeft = [...bars, ...lines].some((series) => series.axis === "left");
  // Each value axis spans the series drawn on it, in its own format.
  const axisValues = (axis: "left" | "right") => valuesOf(data, keys.filter((key) => axisOf[key] === axis && !shell.series.isHidden(key)));
  const axisWidth = (axis: "left" | "right") => valueWidth(axisValues(axis), valueFormatters[axis], shell.locale);
  const axisTicks = (axis: "left" | "right") => valueAxisTicks(axisValues(axis), VALUE_TICKS);
  const valueAxis = (axis: "left" | "right") => yAxisProps({ ...shell, valueFormatter: valueFormatters[axis] }, axisWidth(axis), true, axisTicks(axis));
  // The top margin holds either axis's top tick.
  const overhang = Math.max(
    ...(["left", "right"] as const).filter((axis) => (axis === "left" ? usesLeft : usesRight)).map((axis) => valueAxisOverhang(valueFormatters[axis], axisWidth(axis), axisTicks(axis), shell.locale)),
    0,
  );
  const side = (axis: "left" | "right") => (shell.direction.isRtl ? (axis === "left" ? "right" : "left") : axis);
  return (
    <Shell props={props as unknown as ChartBaseProps<T>} shell={{ ...shell, columns, legend }} showLegend>
      {/* With bars the periods stand in bands, their ticks inside the plot, and an end-side axis holds the last
          tick's half; with neither, the periods sit on the plot's edges. */}
      <RechartsComposedChart
        data={data as Row[]}
        accessibilityLayer
        margin={
          usesRight || bars.some((bar) => !shell.series.isHidden(bar.key))
            ? { top: CHART_TOP + overhang, right: CHART_EDGE, bottom: 0, left: CHART_EDGE }
            : edgeMargin(data, index, shell.direction.isRtl, overhang)
        }
      >
        {GRID}
        <XAxis {...xAxisProps(index, shell)} />
        {usesLeft && <YAxis yAxisId="left" {...valueAxis("left")} orientation={side("left")} domain={[0, "auto"]} />}
        {usesRight && <YAxis yAxisId="right" {...valueAxis("right")} orientation={side("right")} domain={[0, "auto"]} />}
        {bars
          .filter((bar) => !shell.series.isHidden(bar.key))
          .map((bar) => (
            <Bar key={bar.key} yAxisId={bar.axis} dataKey={bar.key as string} name={bar.key} fill={color(bar.key)} radius={2} isAnimationActive={shell.animate} />
          ))}
        {lines
          .filter((line) => !shell.series.isHidden(line.key))
          .map((line) => (
            <Line
              key={line.key}
              yAxisId={line.axis}
              dataKey={line.key as string}
              name={line.key}
              type="monotone"
              stroke={color(line.key)}
              strokeDasharray={lineDash(line.key)}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2, fill: "var(--ds-surface-raised)" }}
              activeDot={ACTIVE_DOT}
              isAnimationActive={shell.animate}
            />
          ))}
        <Tooltip
          cursor={{ fill: "var(--ds-background-neutral)", opacity: 0.5 }}
          isAnimationActive={shell.animate}
          content={(tooltip) => (
            <ChartTooltip
              {...tooltip}
              labelFormatter={shell.indexFormatter}
              labels={Object.fromEntries(keys.map((key) => [key, shell.label(key)]))}
              valueFormatter={(value) => String(value)}
              payload={tooltip.payload?.map((entry) => {
                const value = chartNumber(entry.value);
                return {
                  dataKey: String(entry.dataKey),
                  name: String(entry.name ?? entry.dataKey),
                  color: entry.color,
                  value: value === undefined ? entry.value : format(String(entry.dataKey))(value),
                };
              })}
            />
          )}
        />
      </RechartsComposedChart>
    </Shell>
  );
}

/** A dev warning, once per mount, when a design limit is passed. */
function useOnce(condition: boolean, message: string) {
  const warned = React.useRef(false);
  React.useEffect(() => {
    if (!condition || warned.current) return;
    warned.current = true;
    console.warn(message);
  }, [condition, message]);
}

