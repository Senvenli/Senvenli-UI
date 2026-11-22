"use client";

import * as React from "react";
import { useLocale } from "react-aria-components";
import {
  Area,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  ComposedChart as RechartsComposedChart,
  Line,
  Pie,
  PieChart as RechartsPieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { cn } from "../utils";
import type { TableColumn } from "../collection/table";
import { chartNoDataLabel, chartOtherLabel, chartShareLabel, chartTrendLabel, chartValueLabel, gaugeTargetLabel, sparklineSummaryLabel } from "../i18n";
import {
  CHART_NEUTRAL,
  ChartFrame,
  ChartLegend,
  ChartTooltip,
  chartColor,
  useChartAnimation,
  useChartDirection,
  useChartSeries,
  type ChartValueFormatter,
} from "./chart-parts";
import { ChartHeader, PlottedTooltip } from "./core-charts";
import { chartNumber, formattedValues, tickAxisWidth, tickOverhang, tickWrapWidth, valueAxisTicks } from "./axis-width";
import { NameTick, ValueTick, isolatedLabel } from "./value-tick";

type Row = Record<string, unknown>;
const plain: ChartValueFormatter = (value) => String(value);
/**
 * The size is in `style` as well, with its unit: Recharts measures a tick for wrapping in a hidden span that
 * takes only the tick's `style` (assigned as is, so a bare 11 is dropped). Without it the span kept the page's
 * body size (14–16px) and a tick that fits at 11px broke over two lines ("€" above "1.500.000").
 */
const AXIS_TICK = { fill: "var(--ds-text-subtlest)", fontSize: 11, style: { fontVariantNumeric: "tabular-nums", fontSize: "11px" } } as const;
/** An axis name's 11px, in `style` too: Recharts measures labels for wrapping the same way. */
const LABEL_SIZE = { fontSize: 11, style: { fontSize: "11px" } } as const;
/** Recharts places SVG text for LTR; the plot stays ltr inside (see ChartFrame). */
const LTR_PLOT = "[direction:ltr]";

type FrameProps = {
  title: string;
  period?: string;
  isLoading?: boolean;
  emptyMessage?: { title: string; description?: string };
  height?: number;
};

/** @internal The header, then ChartFrame with its loading, empty and data-table states. */
export function Shell<T extends object>({
  title,
  period,
  total,
  isLoading,
  emptyMessage,
  isEmpty,
  height,
  legend,
  columns,
  rows,
  onRowAction,
  children,
}: FrameProps & {
  total?: React.ReactNode;
  isEmpty: boolean;
  height: number;
  legend?: React.ReactNode;
  columns: TableColumn<T>[];
  rows: readonly T[];
  onRowAction?: (row: T) => void;
  children: React.ReactNode;
}) {
  const { locale } = useLocale();
  const positions = React.useMemo(() => new Map(rows.map((row, position) => [row, position])), [rows]);
  return (
    <section data-slot="chart" aria-label={title} className="flex min-w-0 flex-col gap-ds-200">
      <ChartHeader title={title} period={period} total={total} />
      <ChartFrame
        height={height}
        isLoading={isLoading}
        emptyMessage={isEmpty ? (emptyMessage ?? { title: chartNoDataLabel(locale) }) : null}
        legend={legend}
        dataTable={{ caption: [title, period].filter(Boolean).join(" · "), columns, rows, rowKey: (row) => positions.get(row) ?? 0, onRowAction }}
      >
        {children}
      </ChartFrame>
    </section>
  );
}

/** Whole percentages that add up to exactly 100 (largest remainder). */
export function sharesOf(values: readonly number[]): number[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total <= 0) return values.map(() => 0);
  const raw = values.map((value) => (Math.max(0, value) / total) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = raw.map((value, index) => ({ index, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest);
  for (const { index } of order) {
    if (left <= 0) break;
    floors[index]! += 1;
    left -= 1;
  }
  return floors;
}

/** @internal Warns once in development; shared by the chart files. */
export function useOnce(condition: boolean, message: string) {
  const warned = React.useRef(false);
  React.useEffect(() => {
    if (!condition || warned.current) return;
    warned.current = true;
    console.warn(message);
  }, [condition, message]);
}

/* ── DonutChart ───────────────────────────────────────────────────────────── */

export type DonutDatum = { name: string; value: number };

export type DonutChartProps = FrameProps & {
  /** Two to five parts; more are folded into "Other". */
  data: readonly DonutDatum[];
  valueFormatter?: ChartValueFormatter;
  /** Under the total in the center: its unit ("orders"). */
  centerLabel?: string;
  /** The value list beside the ring with exact percentages; on by default. */
  showList?: boolean;
};

/**
 * How a total divides into a few parts: an 18px ring with 1.2° gaps, parts in descending order from
 * 12 o'clock in `ds-chart-1`…, the total in the center with its unit, and a list beside the ring with
 * each part's value and exact share (the shares add up to 100). More than five parts fold into "Other".
 */
/** The narrowest the donut's list gets before the ring shrinks: a swatch, a short name, value and share. */
const DONUT_LIST_MIN = 168;
/** `gap-ds-300` between the ring and the list. */
const DONUT_GAP = 24;

export function DonutChart({ title, period, data, valueFormatter = plain, centerLabel, showList = true, isLoading, emptyMessage, height = 200 }: DonutChartProps) {
  const { locale } = useLocale();
  const animate = useChartAnimation();
  // Parts of a whole: a missing or negative value has no slice.
  const counted = data.filter((part) => Number.isFinite(part.value) && part.value >= 0);
  useOnce(counted.length < data.length, "DonutChart: parts without a finite, non-negative value are left out.");
  useOnce(counted.length > 5, "DonutChart: at most five parts; the rest are shown as \"Other\".");
  const sorted = [...counted].sort((a, b) => b.value - a.value);
  const folded = sorted.length > 5;
  const parts: DonutDatum[] = folded ? [...sorted.slice(0, 4), { name: chartOtherLabel(locale), value: sorted.slice(4).reduce((sum, part) => sum + part.value, 0) }] : sorted;
  // "Other" is a neutral series, not a fifth hue.
  const partColor = (index: number) => (folded && index === 4 ? CHART_NEUTRAL : chartColor(index));
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  const shares = sharesOf(parts.map((part) => part.value));
  const rows = parts.map((part, index) => ({ ...part, share: shares[index]! }));
  const columns: TableColumn<(typeof rows)[number]>[] = [
    { key: "name", header: title, isRowHeader: true },
    { key: "value", header: chartValueLabel(locale), align: "end", render: (row) => valueFormatter(row.value) },
    { key: "share", header: chartShareLabel(locale), align: "end", render: (row) => `${row.share}%` },
  ];
  // On a phone the ring gives way, down to 112px, so the list keeps room for the names (whole pixels,
  // so the measuring settles).
  // A callback ref: the row mounts only once loading and empty are over, and the measuring starts then.
  const [row, setRow] = React.useState<HTMLDivElement | null>(null);
  const [rowWidth, setRowWidth] = React.useState<number>();
  React.useLayoutEffect(() => {
    if (!row || !showList || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setRowWidth(Math.floor(entry!.contentRect.width)));
    observer.observe(row);
    return () => observer.disconnect();
  }, [row, showList]);
  const ring = rowWidth === undefined ? height - 24 : Math.max(112, Math.min(height - 24, rowWidth - DONUT_LIST_MIN - DONUT_GAP));
  return (
    <Shell title={title} period={period} isLoading={isLoading} emptyMessage={emptyMessage} isEmpty={total <= 0} height={height} columns={columns} rows={rows}>
      <div ref={setRow} data-slot="donut" className="flex h-full min-w-0 items-center gap-ds-300">
        <div className={cn("relative shrink-0", LTR_PLOT)} style={{ width: ring, height: ring }}>
          {/* Recharts' accessibility layer makes the ring a tab stop whose arrow keys move an active sector
              but show and announce nothing, so it is off: every part is in words in the list beside the
              ring and in the data table. */}
          <RechartsPieChart width={ring} height={ring} accessibilityLayer={false}>
            <Pie
              rootTabIndex={-1}
              data={parts}
              dataKey="value"
              nameKey="name"
              innerRadius={ring / 2 - 18}
              outerRadius={ring / 2}
              startAngle={90}
              endAngle={-270}
              paddingAngle={1.2}
              stroke="none"
              isAnimationActive={animate}
            >
              {parts.map((part, index) => (
                <Cell key={index} fill={partColor(index)} />
              ))}
            </Pie>
            <Tooltip isAnimationActive={animate} content={<ChartTooltip valueFormatter={valueFormatter} labelFormatter={() => title} />} />
          </RechartsPieChart>
          {/* The total as text in the hole; the list beside the ring gives every part in words. */}
          <div data-slot="donut-center" className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <bdi className="text-[22px] leading-7 font-medium text-ds-text tabular-nums">{valueFormatter(total)}</bdi>
            {/* Isolated in its own direction, as the total: the ring is drawn left to right in RTL too. */}
            {centerLabel && <bdi className="text-body-small text-ds-text-subtle">{centerLabel}</bdi>}
          </div>
        </div>
        {showList && (
          <ul data-slot="donut-list" className="m-0 flex min-w-0 flex-1 list-none flex-col gap-ds-100 p-0">
            {rows.map((row, index) => (
              <li key={index} className="flex items-center gap-ds-100 text-body">
                <span aria-hidden className="size-2.5 shrink-0 rounded-ds-xsmall" style={{ background: partColor(index) }} />
                <bdi className="min-w-0 flex-1 truncate text-ds-text-subtle">{row.name}</bdi>
                <bdi className="tabular-nums text-ds-text">{valueFormatter(row.value)}</bdi>
                <bdi className="w-9 text-end tabular-nums text-ds-text-subtle">{row.share}%</bdi>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}

/* ── Gauge ────────────────────────────────────────────────────────────────── */

export type GaugeChartProps = Omit<FrameProps, "emptyMessage"> & {
  value: number;
  /** 0 by default. */
  min?: number;
  /** 100 by default: gauges are for bounded figures (occupancy, quota). */
  max?: number;
  /** A 2px tick on the arc, named under the value. */
  target?: number;
  valueFormatter?: ChartValueFormatter;
};

const polar = (cx: number, cy: number, r: number, angle: number) => [cx + r * Math.cos(angle), cy - r * Math.sin(angle)] as const;

/**
 * One bounded value against its range and a target: a half-circle 16px track in
 * `ds-background-neutral-pressed`, the value in `ds-chart-1` with round caps, the target as a 2px
 * `ds-text` tick, the value in the center with the target under it. Only for bounded percentages
 * (occupancy, quota), never money or open counts. A meter to screen readers.
 */
export function GaugeChart({ title, period, value, min = 0, max = 100, target, valueFormatter = plain, isLoading, height = 160 }: GaugeChartProps) {
  const { locale } = useLocale();
  const { isRtl } = useChartDirection();
  // A missing value reads as the minimum, and an empty range draws no fill or tick.
  const clamp = (n: number) => (Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);
  const ratioOf = (n: number) => (max > min ? (clamp(n) - min) / (max - min) : 0);
  const ratio = ratioOf(value);
  const width = height * 2 - 32;
  const cx = width / 2;
  const cy = height - 16;
  const r = Math.min(cx, cy) - 12;
  const arc = (to: number) => {
    const [x0, y0] = polar(cx, cy, r, Math.PI);
    const [x1, y1] = polar(cx, cy, r, Math.PI - to * Math.PI);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  const targetRatio = target === undefined || !Number.isFinite(target) || max <= min ? undefined : ratioOf(target);
  const tick = targetRatio === undefined ? undefined : [polar(cx, cy, r - 12, Math.PI - targetRatio * Math.PI), polar(cx, cy, r + 12, Math.PI - targetRatio * Math.PI)];
  // A missing value is said as missing, not formatted as NaN: a dash in the center, the sentence for screen readers.
  const hasValue = Number.isFinite(value);
  const valueText = hasValue ? valueFormatter(value) : chartNoDataLabel(locale);
  const targetText = target === undefined ? undefined : gaugeTargetLabel(locale, valueFormatter(target));
  const rows = [{ name: title, value, target }];
  const columns: TableColumn<(typeof rows)[number]>[] = [
    { key: "name", header: title, isRowHeader: true },
    { key: "value", header: chartValueLabel(locale), align: "end", render: (row) => valueFormatter(row.value) },
    ...(target === undefined ? [] : [{ key: "target", header: gaugeTargetLabel(locale, "").trim(), align: "end" as const, render: () => valueFormatter(target) }]),
  ];
  return (
    <Shell title={title} period={period} isLoading={isLoading} isEmpty={false} height={height} columns={columns} rows={rows}>
      <div
        role="meter"
        aria-label={title}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clamp(value)}
        aria-valuetext={targetText ? `${valueText}, ${targetText}` : valueText}
        data-slot="gauge"
        className="relative mx-auto h-full"
        style={{ width }}
      >
        {/* The fill runs from the inline start, like a progress bar: the drawing is mirrored in RTL. */}
        <svg aria-hidden width={width} height={height} className={cn("block overflow-visible", isRtl && "-scale-x-100")}>
          <path d={arc(1)} fill="none" stroke="var(--ds-background-neutral-pressed)" strokeWidth={16} strokeLinecap="round" />
          {ratio > 0 && <path data-slot="gauge-value" d={arc(ratio)} fill="none" stroke="var(--ds-chart-1)" strokeWidth={16} strokeLinecap="round" />}
          {tick && <line data-slot="gauge-target" x1={tick[0][0]} y1={tick[0][1]} x2={tick[1][0]} y2={tick[1][1]} stroke="var(--ds-text)" strokeWidth={2} />}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-ds-100 flex flex-col items-center">
          <bdi data-slot="gauge-text" className="text-[22px] leading-7 font-medium text-ds-text tabular-nums">{hasValue ? valueText : "—"}</bdi>
          {targetText && <bdi className="text-body-small text-ds-text-subtle">{targetText}</bdi>}
        </div>
      </div>
    </Shell>
  );
}

/* ── RadialChart ──────────────────────────────────────────────────────────── */

export type RadialChartProps = FrameProps & {
  /** Two or three values on one 0–100 scale. */
  data: readonly DonutDatum[];
  valueFormatter?: ChartValueFormatter;
};

/** Two or three values that share a 0–100 scale: 12px rings in `ds-chart-1`…`3` from 12 o'clock, with a key list. */
export function RadialChart({ title, period, data, valueFormatter = (value) => `${value}%`, isLoading, emptyMessage, height = 200 }: RadialChartProps) {
  const { locale } = useLocale();
  const animate = useChartAnimation();
  useOnce(data.length > 3, "RadialChart: two or three rings; use a BarChart for more.");
  const rings = data.slice(0, 3).map((ring, index) => ({ ...ring, fill: chartColor(index) }));
  const size = height - 8;
  const columns: TableColumn<DonutDatum>[] = [
    { key: "name", header: title, isRowHeader: true },
    { key: "value", header: chartValueLabel(locale), align: "end", render: (row) => valueFormatter(row.value) },
  ];
  return (
    <Shell title={title} period={period} isLoading={isLoading} emptyMessage={emptyMessage} isEmpty={rings.length === 0} height={height} columns={columns} rows={rings}>
      <div data-slot="radial" className="flex h-full min-w-0 items-center gap-ds-400">
        <div className={cn("shrink-0", LTR_PLOT)}>
          <RadialBarChart width={size} height={size} data={rings} innerRadius={size / 2 - 12 * rings.length - 6 * (rings.length - 1)} outerRadius={size / 2} barSize={12} startAngle={90} endAngle={-270} accessibilityLayer={false}>
            {/* No keyboard layer: with no tooltip its arrow keys would show nothing; the list gives every value. */}
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "var(--ds-background-neutral-pressed)" }} isAnimationActive={animate} />
          </RadialBarChart>
        </div>
        <ul data-slot="radial-list" className="m-0 flex min-w-0 flex-1 list-none flex-col gap-ds-100 p-0">
          {rings.map((ring, index) => (
            <li key={index} className="flex items-center gap-ds-100 text-body">
              <span aria-hidden className="size-2.5 shrink-0 rounded-ds-xsmall" style={{ background: ring.fill }} />
              <bdi className="min-w-0 flex-1 truncate text-ds-text-subtle">{ring.name}</bdi>
              <bdi className="tabular-nums text-ds-text">{valueFormatter(ring.value)}</bdi>
            </li>
          ))}
        </ul>
      </div>
    </Shell>
  );
}

/* ── Sparkline ────────────────────────────────────────────────────────────── */

export type SparklineProps = {
  data: readonly number[];
  type?: "line" | "bar";
  /** 120 in tables; leave out to fill the width (Stat). */
  width?: number;
  /** 32 in tables, 28 in a Stat. */
  height?: number;
  /** Names the trend when the text next to it does not; a summary of the values otherwise. */
  "aria-label"?: string;
  valueFormatter?: ChartValueFormatter;
};

/**
 * A word-sized trend with no axes, beside the number it explains (in tables, Stats, cards): a 1.5px
 * `ds-chart-1` line over a 14% fill with the last point marked, or bars. No gridlines, labels or tooltip;
 * screen readers get a text summary (first, last, low, high) instead of a table.
 */
export function Sparkline({ data, type = "line", width, height = 32, "aria-label": label, valueFormatter = plain }: SparklineProps) {
  const { locale } = useLocale();
  const animate = useChartAnimation();
  const direction = useChartDirection();
  const points = data.map((value, index) => ({ index, value }));
  const summary =
    data.length > 0
      ? sparklineSummaryLabel(locale, {
          first: valueFormatter(data[0]!),
          last: valueFormatter(data[data.length - 1]!),
          min: valueFormatter(Math.min(...data)),
          max: valueFormatter(Math.max(...data)),
        })
      : chartNoDataLabel(locale);
  const plot =
    type === "bar" ? (
      <RechartsBarChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barCategoryGap="20%" accessibilityLayer={false}>
        <XAxis dataKey="index" hide reversed={direction.reversed} />
        <YAxis hide domain={[(low: number) => Math.min(0, low), (high: number) => Math.max(0, high)]} />
        <Bar dataKey="value" fill="var(--ds-chart-1)" radius={1} isAnimationActive={animate} />
      </RechartsBarChart>
    ) : (
      <RechartsComposedChart data={points} margin={{ top: 3, right: 3, bottom: 3, left: 3 }} accessibilityLayer={false}>
        <XAxis dataKey="index" hide reversed={direction.reversed} />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Area dataKey="value" type="monotone" stroke="var(--ds-chart-1)" strokeWidth={1.5} fill="var(--ds-chart-1)" fillOpacity={0.14} isAnimationActive={animate}
          // The last point marked.
          dot={(props: { cx?: number; cy?: number; index?: number }) =>
            props.index === data.length - 1 && props.cx != null && props.cy != null ? (
              <circle key="last" data-slot="sparkline-last" cx={props.cx} cy={props.cy} r={2.5} fill="var(--ds-chart-1)" />
            ) : (
              <g key={props.index} />
            )
          }
        />
      </RechartsComposedChart>
    );
  return (
    <span role="img" aria-label={label ?? summary} title={summary} data-slot="sparkline" className={cn("inline-block align-middle", width == null && "w-full", LTR_PLOT)} style={{ width, height }}>
      {width != null ? (
        React.cloneElement(plot, { width, height })
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {plot}
        </ResponsiveContainer>
      )}
    </span>
  );
}

/* ── ScatterChart ─────────────────────────────────────────────────────────── */

export type ScatterChartProps<T extends Row> = FrameProps & {
  data: readonly T[];
  /** The key naming each point (a product's SKU); shown on hover and as the table's row header. */
  name: keyof T & string;
  x: keyof T & string;
  y: keyof T & string;
  /** A third measure as point size. */
  size?: keyof T & string;
  /** A second category: `ds-chart-2` and a diamond, so it differs by shape as well as hue. */
  category?: { key: keyof T & string; value: unknown; label: string; otherLabel: string };
  /** Axis names with their units ("Daily price (€)"). */
  xLabel: string;
  yLabel: string;
  valueFormatters?: { x?: ChartValueFormatter; y?: ChartValueFormatter };
  /** A least-squares trend line, dashed in `ds-chart-neutral`. */
  trendLine?: boolean;
  /** Opens the item: the row under the pointer. */
  onPointPress?: (row: T) => void;
};

/** Recharts' default tick count, set on the y axis so the width counts the ticks it draws. */
const SCATTER_TICKS = 5;
/** The y axis's narrowest, as it was before it was sized from its ticks. */
const SCATTER_Y_MIN = 56;
/** The y axis's name, turned on its side at the axis's outer edge: about 12px across (11px type), and 4px clear of the ticks. */
const AXIS_NAME_ROOM = 16;

/** The least-squares line through the points, as its two ends; null under two points. */
function fitTrend<T>(rows: readonly T[], px: (row: T) => number, py: (row: T) => number, x: string) {
  if (rows.length < 2) return null;
  const n = rows.length;
  const sx = rows.reduce((sum, row) => sum + px(row), 0);
  const sy = rows.reduce((sum, row) => sum + py(row), 0);
  const sxy = rows.reduce((sum, row) => sum + px(row) * py(row), 0);
  const sxx = rows.reduce((sum, row) => sum + px(row) ** 2, 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1);
  const intercept = (sy - slope * sx) / n;
  const xs = rows.map(px);
  const [lo, hi] = [Math.min(...xs), Math.max(...xs)];
  return [
    { [x]: lo, trend: slope * lo + intercept },
    { [x]: hi, trend: slope * hi + intercept },
  ];
}

/**
 * Each item by two measures, to show a relation and outliers: 4px `ds-chart-1` points at 80%, an optional
 * dashed trend line in `ds-chart-neutral`, an optional size measure or second category (`ds-chart-2`
 * diamonds). Hover names the item; a press opens it, and so does a row of the shown data table, which is
 * the keyboard's way in. Axes carry their units.
 */
export function ScatterChart<T extends Row>(props: ScatterChartProps<T>) {
  const { title, period, data, name, x, y, size, category, xLabel, yLabel, valueFormatters, trendLine, onPointPress, isLoading, emptyMessage, height = 260 } = props;
  const { locale } = useLocale();
  const animate = useChartAnimation();
  const direction = useChartDirection();
  const series = useChartSeries();
  const fx = valueFormatters?.x ?? plain;
  const fy = valueFormatters?.y ?? plain;
  const numeric = (row: T, key: string) => (typeof row[key] === "number" ? (row[key] as number) : NaN);
  // An item without both measures has no place on the plot, nor in its table.
  const valid = data.filter((row) => Number.isFinite(numeric(row, x)) && Number.isFinite(numeric(row, y)));
  const groups = category
    ? [
        { key: "main", label: category.otherLabel, rows: valid.filter((row) => row[category.key] !== category.value), color: chartColor(0), shape: "circle" as const },
        { key: "category", label: category.label, rows: valid.filter((row) => row[category.key] === category.value), color: chartColor(1), shape: "diamond" as const },
      ]
    : [{ key: "main", label: yLabel, rows: valid, color: chartColor(0), shape: "circle" as const }];
  // The trend follows what is shown: a group hidden from the legend leaves the fit too.
  const shown = groups.filter((group) => !series.isHidden(group.key)).flatMap((group) => group.rows);
  const trend = fitTrend(trendLine ? shown : [], (row) => numeric(row, x), (row) => numeric(row, y), x);
  // The trend is a series too: it gets a dashed key in the legend, and the legend can hide it.
  const legendItems = [
    ...(category ? groups.map((group) => ({ key: group.key, label: group.label, color: group.color })) : []),
    ...(trend ? [{ key: "trend", label: chartTrendLabel(locale), color: CHART_NEUTRAL, kind: "line" as const, strokeDasharray: "6 4" }] : []),
  ];
  // The y axis holds its name beside its ticks: as wide as its longest tick (Recharts' ticks for the y values
  // drawn, the trend's ends among them) plus the name's room, never under the 56px it always had. The x axis
  // needs no width: Recharts lets its ticks run the plot's width. Each y tick is given the room beside the name
  // (see axis-width's tickWrapWidth). Both axes draw the DS's ticks (ValueTick): a figure never parts from its
  // sign and currency, and an axis whose ticks pass their room shows them with compact figures, the y axis then
  // sized for those.
  const yTicks = valueAxisTicks([...shown.map((row) => numeric(row, y)), ...(trend && !series.isHidden("trend") ? trend.map((end) => end.trend) : [])], SCATTER_TICKS);
  const yValues = formattedValues(yTicks, fy);
  const yAxisWidth = tickAxisWidth(yTicks.map(fy), SCATTER_Y_MIN, AXIS_NAME_ROOM, locale, yValues);
  // The top y tick's lines past one stand above its gridline: the 8px top margin takes them (axis-width's tickOverhang).
  const yOverhang = tickOverhang(yTicks.length > 0 ? fy(yTicks.at(-1)!) : undefined, tickWrapWidth(yAxisWidth, AXIS_NAME_ROOM), locale, yTicks.map(fy), yValues);
  const xTicks = valueAxisTicks(shown.map((row) => numeric(row, x)), SCATTER_TICKS);
  const columns: TableColumn<T>[] = [
    { key: name, header: title, isRowHeader: true },
    { key: x, header: xLabel, align: "end", render: (row) => fx(numeric(row, x)) },
    { key: y, header: yLabel, align: "end", render: (row) => fy(numeric(row, y)) },
    ...(category ? [{ key: category.key, header: category.label, render: (row: T) => (row[category.key] === category.value ? category.label : category.otherLabel) }] : []),
  ];
  return (
    <Shell
      title={title}
      period={period}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      isEmpty={valid.length === 0}
      height={height}
      legend={legendItems.length > 0 ? <ChartLegend items={legendItems} hidden={series.hidden} onToggle={series.toggle} /> : undefined}
      columns={columns}
      rows={valid}
      onRowAction={onPointPress}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsComposedChart margin={{ top: 8 + yOverhang, right: 8, bottom: 16, left: 8 }} accessibilityLayer>
          <CartesianGrid stroke="var(--ds-border)" />
          <XAxis type="number" dataKey={x as string} name={xLabel} tickFormatter={fx} tick={<ValueTick {...AXIS_TICK} axisTicks={xTicks} />} tickLine={false} axisLine={{ stroke: "var(--ds-border-bold)" }} reversed={direction.reversed}
            label={{ value: xLabel, position: "insideBottom", offset: -12, fill: "var(--ds-text-subtle)", ...LABEL_SIZE, ...isolatedLabel(xLabel, "insideBottom") }} />
          <YAxis type="number" dataKey={y as string} name={yLabel} tickFormatter={fy} tick={<ValueTick {...AXIS_TICK} width={tickWrapWidth(yAxisWidth, AXIS_NAME_ROOM)} axisTicks={yTicks} />} tickLine={false} axisLine={false} orientation={direction.valueAxis} width={yAxisWidth} tickCount={SCATTER_TICKS}
            label={{ value: yLabel, angle: -90, position: direction.isRtl ? "insideRight" : "insideLeft", fill: "var(--ds-text-subtle)", ...LABEL_SIZE, ...isolatedLabel(yLabel, direction.isRtl ? "insideRight" : "insideLeft") }} />
          {size && <ZAxis type="number" dataKey={size as string} range={[16, 160]} />}
          {groups
            .filter((group) => !series.isHidden(group.key))
            .map((group) => (
              <Scatter
                key={group.key}
                name={group.label}
                data={group.rows}
                fill={group.color}
                fillOpacity={0.8}
                shape={group.shape}
                isAnimationActive={animate}
                onClick={(point: { payload?: T }) => point.payload && onPointPress?.(point.payload)}
                className={onPointPress ? "cursor-pointer" : undefined}
              />
            ))}
          {trend && !series.isHidden("trend") && <Line data={trend} dataKey="trend" type="linear" stroke={CHART_NEUTRAL} strokeDasharray="6 4" strokeWidth={1.5} dot={false} activeDot={false} legendType="none" isAnimationActive={animate} />}
          <Tooltip
            isAnimationActive={animate}
            cursor={{ strokeDasharray: "3 3", stroke: "var(--ds-border-bold)" }}
            content={({ active, payload }) => {
              const row = (payload?.[0]?.payload ?? null) as T | null;
              if (!active || !row || row[name] === undefined) return null;
              return (
                <ChartTooltip
                  active
                  label={String(row[name])}
                  payload={[
                    { dataKey: "x", name: xLabel, value: fx(numeric(row, x)), color: "transparent" },
                    { dataKey: "y", name: yLabel, value: fy(numeric(row, y)), color: "transparent" },
                  ]}
                />
              );
            }}
          />
        </RechartsComposedChart>
      </ResponsiveContainer>
    </Shell>
  );
}

/* ── RadarChart ───────────────────────────────────────────────────────────── */

export type RadarChartProps<T extends Row> = FrameProps & {
  /** One row per dimension (five to eight). */
  data: readonly T[];
  /** The dimension's name key. */
  dimension: keyof T & string;
  /** One or two profiles: the first is the main one, a second is the comparison. */
  categories: readonly (keyof T & string)[];
  labels?: Readonly<Partial<Record<string, string>>>;
  /** The shared scale's top. */
  max: number;
  valueFormatter?: ChartValueFormatter;
};

/**
 * One or two profiles across five to eight dimensions on one scale: five concentric polygon gridlines in
 * `ds-border`, labels outside in `ds-text-subtle`, the main profile `ds-chart-1` (2px edge, 18% fill), the
 * comparison `ds-chart-neutral` (12% fill, dashed edge).
 */
export function RadarChart<T extends Row>({ title, period, data, dimension, categories, labels, max, valueFormatter = plain, isLoading, emptyMessage, height = 280 }: RadarChartProps<T>) {
  const animate = useChartAnimation();
  const series = useChartSeries();
  useOnce(categories.length > 2, "RadarChart: one or two profiles.");
  useOnce(data.length > 0 && (data.length < 5 || data.length > 8), "RadarChart: five to eight dimensions; a horizontal BarChart reads faster otherwise.");
  const profiles = categories.slice(0, 2);
  const label = (key: string) => labels?.[key] ?? key;
  const styles = (key: string, index: number) =>
    index === 0 ? { color: chartColor(0), fillOpacity: 0.18, strokeDasharray: undefined } : { color: CHART_NEUTRAL, fillOpacity: 0.12, strokeDasharray: "6 4" };
  const columns: TableColumn<T>[] = [
    { key: dimension, header: title, isRowHeader: true },
    // A value as the radar plots it (a numeric string too); "—" for a gap.
    ...profiles.map((key) => ({ key, header: label(key), align: "end" as const, render: (row: T) => { const value = chartNumber(row[key]); return value === undefined ? "—" : valueFormatter(value); } })),
  ];
  return (
    <Shell
      title={title}
      period={period}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      isEmpty={data.length === 0}
      height={height}
      legend={
        profiles.length > 1 ? (
          <ChartLegend
            items={profiles.map((key, index) => ({ key, label: label(key), kind: "line" as const, color: styles(key, index).color, strokeDasharray: styles(key, index).strokeDasharray }))}
            hidden={series.hidden}
            onToggle={series.toggle}
          />
        ) : undefined
      }
      columns={columns}
      rows={data}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart data={data as Row[]} outerRadius="72%" accessibilityLayer>
          <PolarGrid gridType="polygon" stroke="var(--ds-border)" />
          {/* Recharts' own tick, each dimension's name in its own reading direction (value-tick's NameTick). */}
          <PolarAngleAxis dataKey={dimension as string} tick={<NameTick polar fill="var(--ds-text-subtle)" fontSize={11} />} />
          <PolarRadiusAxis domain={[0, max]} tickCount={6} tick={false} axisLine={false} />
          {profiles
            .filter((key) => !series.isHidden(key))
            .map((key) => {
              const style = styles(key, profiles.indexOf(key));
              return (
                <Radar key={key} name={key} dataKey={key as string} stroke={style.color} strokeWidth={2} strokeDasharray={style.strokeDasharray} fill={style.color} fillOpacity={style.fillOpacity} isAnimationActive={animate} />
              );
            })}
          <Tooltip isAnimationActive={animate} content={<PlottedTooltip valueFormatter={valueFormatter} labels={Object.fromEntries(profiles.map((key) => [key, label(key)]))} />} />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </Shell>
  );
}
