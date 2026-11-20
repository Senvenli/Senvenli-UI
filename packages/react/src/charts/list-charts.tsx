"use client";

/**
 * The list-shaped charts: BarList, CalendarHeatmap, Tracker, Funnel.
 * Plain HTML on the shared ChartFrame (loading, empty and data-table states) rather than Recharts:
 * each is a list or grid that reads as text and compares like a chart. Logical properties
 * throughout, so the layout mirrors in RTL on its own.
 */

import * as React from "react";
import { Link as AriaLink, Button as AriaButton, useLocale } from "react-aria-components";
import { getDayOfWeek, parseDate, startOfWeek, type CalendarDate } from "@internationalized/date";

import { cn } from "../utils";
import type { TableColumn } from "../collection/table";
import {
  chartBandLabel,
  chartConversionLabel,
  chartNoDataLabel,
  chartPeriodLabel,
  chartStatusLabel,
  chartValueLabel,
  formatDateTime,
  heatmapLessLabel,
  heatmapMoreLabel,
  showAllLabel,
  showFewerLabel,
} from "../i18n";
import { ChartLegend, useChartDirection, type ChartValueFormatter } from "./chart-parts";
import { Shell, useOnce } from "./more-charts";

const plain: ChartValueFormatter = (value) => String(value);

type FrameProps = {
  title: string;
  period?: string;
  isLoading?: boolean;
  emptyMessage?: { title: string; description?: string };
};

/**
 * A day as an ISO date ("2026-09-14") or a CalendarDate. An ISO date-time counts as the calendar date
 * written in it, in its own offset: `new Date().toISOString()` gives the UTC date, which near midnight
 * can be the day before or after the reader's. Pass the local date when that matters.
 */
export type ChartDay = string | CalendarDate;
const toDay = (day: ChartDay): CalendarDate => (typeof day === "string" ? parseDate(day.slice(0, 10)) : day);

/** "Mon, Sep 14, 2026" style labels in the locale, computed at noon UTC so no zone shifts the day. */
function useDayFormat(options: Intl.DateTimeFormatOptions) {
  const { locale } = useLocale();
  return React.useMemo(() => {
    return (day: CalendarDate) => formatDateTime(locale, { ...options, timeZone: "UTC" }, new Date(Date.UTC(day.year, day.month - 1, day.day, 12)));
  }, [locale]); // The options are literals at each call site.
}

/**
 * One tab stop for a strip or grid of cells, moved with the arrow keys (WAI-ARIA grid): the focused
 * cell keeps `tabIndex=0`, the rest `-1`. Until a cell is chosen the stop is the latest one, also when
 * the data arrives after a loading state. `move` maps a key to the next index, or undefined.
 */
function useRovingCells(count: number) {
  const [active, setActive] = React.useState<number | null>(null);
  const cells = React.useRef<(HTMLElement | null)[]>([]);
  const current = Math.min(Math.max(active ?? count - 1, 0), Math.max(count - 1, 0));
  const focus = (index: number) => {
    setActive(index);
    cells.current[index]?.focus();
  };
  // Stable across renders, so memoized cells skip re-rendering on every hover or key press.
  const register = React.useCallback((index: number, element: HTMLElement | null) => {
    cells.current[index] = element;
  }, []);
  const activate = React.useCallback((index: number) => setActive(index), []);
  return {
    current,
    register,
    activate,
    cellProps: (index: number) => ({
      ref: (element: HTMLElement | null) => {
        cells.current[index] = element;
      },
      tabIndex: index === current ? 0 : -1,
      onFocus: () => setActive(index),
    }),
    onKeyDown: (event: React.KeyboardEvent, move: (key: string, from: number) => number | undefined) => {
      const next = move(event.key, current);
      if (next === undefined || next === current || next < 0 || next >= count) return;
      event.preventDefault();
      focus(next);
    },
  };
}

/** The active cell's details in words under a strip or grid: what a hover tooltip would say, for every input. */
function Detail({ children }: { children?: React.ReactNode }) {
  return (
    <div aria-hidden data-slot="chart-detail" className="h-5 truncate text-body-small text-ds-text-subtle tabular-nums">
      {children}
    </div>
  );
}

/* ── BarList ──────────────────────────────────────────────────────────────── */

export type BarListDatum = { name: string; value: number; href?: string };

export type BarListProps = FrameProps & {
  data: readonly BarListDatum[];
  valueFormatter?: ChartValueFormatter;
  /** The rows shown before "Show all": five by default, ten at most. */
  limit?: number;
};

const BAR_ROW = 28;
const BAR_GAP = 6;

/**
 * Named items ranked with a proportional bar behind each label: reads like a list, compares like a
 * chart. 28px rows, the bar in `ds-background-brand-subtle` from the inline start, width relative to the
 * top item; the name in `ds-text` (a link when it has `href`), the value at the end in medium tabular
 * figures. Sorted largest first; the rest behind "Show all".
 */
export function BarList({ title, period, data, valueFormatter = plain, limit = 5, isLoading, emptyMessage }: BarListProps) {
  const { locale } = useLocale();
  const [expanded, setExpanded] = React.useState(false);
  const rows = data.filter((item) => Number.isFinite(item.value)).sort((a, b) => b.value - a.value);
  useOnce(rows.length < data.length, "BarList: items without a finite value are left out.");
  const top = Math.max(0, ...rows.map((item) => item.value));
  const cap = Number.isFinite(limit) ? Math.min(Math.max(1, Math.floor(limit)), 10) : 5;
  const shown = expanded ? rows : rows.slice(0, cap);
  const canExpand = rows.length > cap;
  const lines = shown.length + (canExpand ? 1 : 0);
  const height = Math.max(BAR_ROW, lines * BAR_ROW + Math.max(0, lines - 1) * BAR_GAP);
  const columns: TableColumn<BarListDatum>[] = [
    { key: "name", header: title, isRowHeader: true },
    { key: "value", header: chartValueLabel(locale), align: "end", render: (row) => valueFormatter(row.value) },
  ];
  return (
    <Shell title={title} period={period} isLoading={isLoading} emptyMessage={emptyMessage} isEmpty={rows.length === 0} height={height} columns={columns} rows={rows}>
      <div data-slot="barlist" className="flex flex-col gap-[6px]">
        <ul data-slot="barlist-list" className="m-0 flex list-none flex-col gap-[6px] p-0">
          {shown.map((item, index) => (
            <li key={index} data-slot="barlist-row" className="relative flex h-7 items-center justify-between gap-ds-200 px-ds-100 text-body">
              <span
                aria-hidden
                data-slot="barlist-bar"
                className="absolute inset-y-0 start-0 rounded-ds-small bg-ds-background-brand-subtle"
                style={{ width: top > 0 ? `${(Math.max(0, item.value) / top) * 100}%` : 0 }}
              />
              {item.href ? (
                <AriaLink
                  href={item.href}
                  data-slot="barlist-link"
                  className="relative min-w-0 truncate rounded-ds-xsmall text-ds-text no-underline outline-hidden data-[hovered]:underline data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused"
                >
                  {item.name}
                </AriaLink>
              ) : (
                <bdi data-slot="barlist-name" className="relative min-w-0 truncate text-ds-text">{item.name}</bdi>
              )}
              <bdi data-slot="barlist-value" className="relative shrink-0 font-medium tabular-nums text-ds-text">{valueFormatter(item.value)}</bdi>
            </li>
          ))}
        </ul>
        {canExpand && (
          <AriaButton
            data-slot="barlist-toggle"
            aria-expanded={expanded}
            onPress={() => setExpanded((value) => !value)}
            className="h-7 w-max cursor-pointer rounded-ds-small px-ds-100 text-body-small font-[500] text-ds-link outline-hidden data-[hovered]:underline data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused"
          >
            {expanded ? showFewerLabel(locale) : `${showAllLabel(locale)} (${rows.length})`}
          </AriaButton>
        )}
      </div>
    </Shell>
  );
}

/* ── CalendarHeatmap ──────────────────────────────────────────────────────── */

export type CalendarHeatmapDatum = { date: ChartDay; value: number };

export type CalendarHeatmapProps = FrameProps & {
  data: readonly CalendarHeatmapDatum[];
  /** The first and last day drawn; the data's range by default. */
  start?: ChartDay;
  end?: ChartDay;
  /** Four ascending lower bounds of the four intensity steps; from the data's quartiles by default. */
  thresholds?: readonly [number, number, number, number];
  valueFormatter?: ChartValueFormatter;
  onDayPress?: (day: { date: CalendarDate; value: number | undefined }) => void;
};

/**
 * Five steps that differ in lightness, not hue alone: none, then the selected brand ramp to `ds-chart-1`.
 * Light runs pale to deep, dark runs deep to bright; the third step is a mix, so no new token.
 * @internal Shared with SeasonalityHeatmap; not exported from the package.
 */
export const HEAT_LEVELS = [
  "var(--ds-background-neutral)",
  "var(--ds-background-selected-hovered)",
  "var(--ds-background-selected-pressed)",
  "color-mix(in oklab, var(--ds-chart-1) 65%, var(--ds-background-selected-pressed))",
  "var(--ds-chart-1)",
] as const;

/** The lower bounds of steps 1–4: the smallest positive value, then the quartiles of the positive values. */
export function heatmapThresholds(values: readonly number[]): [number, number, number, number] {
  const positive = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (positive.length === 0) return [1, 2, 3, 4];
  const at = (q: number) => positive[Math.min(positive.length - 1, Math.floor(q * positive.length))]!;
  return [positive[0]!, at(0.25), at(0.5), at(0.75)];
}

/** @internal The step (0–4) of a value: 0 for none, zero or less. Shared with SeasonalityHeatmap. */
export const levelOf = (value: number | undefined, thresholds: readonly number[]) =>
  value === undefined || !(value > 0) ? 0 : thresholds.reduce((level, bound) => (value >= bound ? level + 1 : level), 0);

/**
 * A daily measure as a grid of weekdays (rows) by weeks (columns): weekly and seasonal patterns at a
 * glance. 12px cells, 3px gaps, five steps from `ds-background-neutral` through the brand ramp; weekday
 * labels on alternate rows; a "Less … More" scale under it. Weeks start on the locale's first day. One tab
 * stop: the arrow keys move a day (up, down) or a week (start, end); every cell is named by its date and
 * value, and the active one is spelled out under the grid with its step's range.
 */
export function CalendarHeatmap({ title, period, data, start, end, thresholds, valueFormatter = plain, onDayPress, isLoading, emptyMessage }: CalendarHeatmapProps) {
  const { locale } = useLocale();
  const { isRtl } = useChartDirection();
  const longDay = useDayFormat({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const shortDay = useDayFormat({ day: "numeric", month: "short", year: "numeric" });
  const weekday = useDayFormat({ weekday: "short" });
  const values = new Map<string, number>();
  for (const item of data) if (Number.isFinite(item.value)) values.set(toDay(item.date).toString(), item.value);
  useOnce(values.size < data.filter((item) => Number.isFinite(item.value)).length, "CalendarHeatmap: a date given twice keeps its last value.");
  const days = [...values.keys()].sort();
  const first = start ? toDay(start) : days[0] ? parseDate(days[0]) : undefined;
  const last = end ? toDay(end) : days.length ? parseDate(days[days.length - 1]!) : undefined;
  const range = first && last && last.compare(first) >= 0 ? { first, last } : undefined;
  const rangeKey = range ? `${range.first}/${range.last}` : "";
  const inRange = days.filter((day) => !range || (day >= range.first.toString() && day <= range.last.toString()));
  const inRangeValues = inRange.map((day) => values.get(day)!);
  const bounds = thresholds ?? heatmapThresholds(inRangeValues);
  const gridStart = range ? startOfWeek(range.first, locale) : undefined;
  const count = range ? range.last.compare(range.first) + 1 : 0;
  const offset = range && gridStart ? range.first.compare(gridStart) : 0;
  const weeks = Math.ceil((offset + count) / 7);
  const dayAt = (index: number) => range!.first.add({ days: index });
  const roving = useRovingCells(count);
  // A narrow column scrolls the grid: it opens on the latest weeks, at the inline end, and stays pinned
  // while the column settles (fonts, the page's layout) until the reader scrolls it themselves.
  const [scroller, setScroller] = React.useState<HTMLDivElement | null>(null);
  const touched = React.useRef(false);
  React.useLayoutEffect(() => {
    if (!scroller) return;
    // A new range opens on its latest weeks again, even after the reader scrolled the old one.
    touched.current = false;
    const pin = () => {
      if (!touched.current) scroller.scrollLeft = isRtl ? -scroller.scrollWidth : scroller.scrollWidth;
    };
    pin();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(pin);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [scroller, isRtl, weeks, rangeKey]);
  const active = count > 0 ? dayAt(roving.current) : undefined;
  const activeValue = active ? values.get(active.toString()) : undefined;
  const activeLevel = levelOf(activeValue, bounds);
  const formatBand = (level: number) =>
    chartBandLabel(locale, valueFormatter(bounds[level - 1]!), level < 4 ? valueFormatter(bounds[level]!) : valueFormatter(Math.max(...inRangeValues, bounds[3])));
  // Every day's name once per data and locale, not on each hover or key press.
  const names = React.useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const day = range!.first.add({ days: index });
        const value = values.get(day.toString());
        return `${longDay(day)}: ${value === undefined ? chartNoDataLabel(locale) : valueFormatter(value)}`;
      }),
    // `values` and `range` derive from these.
    [data, rangeKey, count, longDay, locale, valueFormatter],
  );
  const rows = inRange.map((day) => ({ day, value: values.get(day)! }));
  const columns: TableColumn<(typeof rows)[number]>[] = [
    { key: "day", header: chartPeriodLabel(locale), isRowHeader: true, render: (row) => shortDay(parseDate(row.day)) },
    { key: "value", header: chartValueLabel(locale), align: "end", render: (row) => valueFormatter(row.value) },
  ];
  // Seven rows of 12px with 3px gaps, room for a classic scrollbar under them, the detail line and the scale.
  const height = 7 * 12 + 6 * 3 + 12 + 8 + 20 + 8 + 16;
  // A stable press for the memoized cells; it reads the latest data and callback.
  const latest = React.useRef({ dayAt, values, onDayPress });
  latest.current = { dayAt, values, onDayPress };
  const press = React.useCallback((index: number) => {
    const { dayAt: at, values: map, onDayPress: onPress } = latest.current;
    const day = at(index);
    onPress?.({ date: day, value: map.get(day.toString()) });
  }, []);
  const cell = (row: number, week: number) => {
    const index = week * 7 + row - offset;
    if (index < 0 || index >= count) return <span key={week} aria-hidden className="size-3 shrink-0" />;
    const date = dayAt(index).toString();
    return (
      <HeatCell
        key={week}
        index={index}
        date={date}
        label={names[index]!}
        level={levelOf(values.get(date), bounds)}
        isStop={index === roving.current}
        isPressable={Boolean(onDayPress)}
        register={roving.register}
        activate={roving.activate}
        press={press}
      />
    );
  };
  return (
    <Shell title={title} period={period} isLoading={isLoading} emptyMessage={emptyMessage} isEmpty={count === 0 || values.size === 0} height={height} columns={columns} rows={rows}>
      <div data-slot="heatmap" className="flex min-w-0 flex-col gap-ds-100">
        <div className="flex min-w-0 gap-ds-100">
          {/* Weekday labels on alternate rows, from the locale's first day. */}
          <div aria-hidden data-slot="heatmap-weekdays" className="flex shrink-0 flex-col gap-[3px] text-[10px] leading-3 text-ds-text-subtlest">
            {Array.from({ length: 7 }, (_, row) => (
              <span key={row} className="h-3">
                {gridStart && row % 2 === 0 ? weekday(gridStart.add({ days: row })) : ""}
              </span>
            ))}
          </div>
          <div
            ref={setScroller}
            data-slot="heatmap-scroll"
            className="min-w-0 overflow-x-auto"
            onPointerDown={() => (touched.current = true)}
            onWheel={() => (touched.current = true)}
            onKeyDown={() => (touched.current = true)}
          >
            <div
              role="grid"
              aria-label={title}
              data-slot="heatmap-grid"
              className="flex w-max flex-col gap-[3px]"
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  // Space never scrolls the page from inside the grid.
                  event.preventDefault();
                  press(roving.current);
                  return;
                }
                roving.onKeyDown(event, (key, from) => {
                  const forward = isRtl ? "ArrowLeft" : "ArrowRight";
                  const back = isRtl ? "ArrowRight" : "ArrowLeft";
                  if (key === "ArrowDown") return from + 1;
                  if (key === "ArrowUp") return from - 1;
                  if (key === forward) return from + 7;
                  if (key === back) return from - 7;
                  if (key === "Home") return 0;
                  if (key === "End") return count - 1;
                  return undefined;
                });
              }}
            >
              {Array.from({ length: 7 }, (_, row) => (
                <div key={row} role="row" data-slot="heatmap-row" className="flex gap-[3px]">
                  {Array.from({ length: weeks }, (_, week) => cell(row, week))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <Detail>
          {active && `${shortDay(active)} · ${activeValue === undefined ? chartNoDataLabel(locale) : valueFormatter(activeValue)}${activeLevel > 0 ? ` · ${formatBand(activeLevel)}` : ""}`}
        </Detail>
        <div data-slot="heatmap-scale" className="flex items-center gap-ds-075 text-body-small text-ds-text-subtle">
          <span>{heatmapLessLabel(locale)}</span>
          <span aria-hidden className="flex gap-[3px]">
            {HEAT_LEVELS.map((background, level) => (
              <span key={level} data-level={level} className="size-3 rounded-[2px]" style={{ background }} />
            ))}
          </span>
          <span>{heatmapMoreLabel(locale)}</span>
        </div>
      </div>
    </Shell>
  );
}

/** One day of the heatmap, memoized: a hover or key press re-renders the two cells it changes, not the year. */
const HeatCell = React.memo(function HeatCell({
  index,
  date,
  label,
  level,
  isStop,
  isPressable,
  register,
  activate,
  press,
}: {
  index: number;
  date: string;
  label: string;
  level: number;
  isStop: boolean;
  isPressable: boolean;
  register: (index: number, element: HTMLElement | null) => void;
  activate: (index: number) => void;
  press: (index: number) => void;
}) {
  return (
    <span
      role="gridcell"
      aria-label={label}
      data-slot="heatmap-day"
      data-date={date}
      data-level={level}
      ref={(element) => register(index, element)}
      tabIndex={isStop ? 0 : -1}
      onFocus={() => activate(index)}
      onMouseEnter={() => activate(index)}
      onClick={() => press(index)}
      className={cn(
        "size-3 shrink-0 rounded-[2px] outline-hidden focus-visible:inset-ring-2 focus-visible:inset-ring-ds-border-focused",
        isPressable && "cursor-pointer",
      )}
      style={{ background: HEAT_LEVELS[level] }}
    />
  );
});

/* ── Tracker ──────────────────────────────────────────────────────────────── */

export type TrackerTone = "success" | "warning" | "danger" | "neutral";
export type TrackerDatum = { date: ChartDay; status: string; tooltip?: string };

export type TrackerProps = FrameProps & {
  data: readonly TrackerDatum[];
  /** Each status's tone and the word for it ("Operational", "Outage"); the legend follows this order. */
  statusMap: Readonly<Record<string, { tone: TrackerTone; label: string }>>;
  /** The result in a sentence ("26 days operational, 1 outage"); the counts per status by default. */
  summary?: string;
};

/** A status missing from statusMap: hatched, so it never passes for a mapped neutral ("No data"). */
const TRACKER_UNMAPPED = "repeating-linear-gradient(135deg, var(--ds-background-neutral-pressed) 0 3px, var(--ds-background-neutral) 3px 6px)";

const TRACKER_TONE: Record<TrackerTone, string> = {
  success: "var(--ds-icon-success)",
  warning: "var(--ds-icon-warning)",
  danger: "var(--ds-icon-danger)",
  neutral: "var(--ds-background-neutral-pressed)",
};

/**
 * One status per period (day, hour) as a strip of blocks: integration uptime, daily service availability.
 * 28px blocks with 2px gaps in the success, warning and danger icon tokens, `ds-background-neutral-pressed`
 * for no data; the first and last date under it. The summary sentence states the result and the legend
 * names every color, so color repeats the words and never carries them alone. One tab stop: the arrow
 * keys move along the strip, each block named by its date and status.
 */
export function Tracker({ title, period, data, statusMap, summary, isLoading, emptyMessage }: TrackerProps) {
  const { locale } = useLocale();
  const { isRtl } = useChartDirection();
  const longDay = useDayFormat({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const shortDay = useDayFormat({ day: "numeric", month: "short" });
  const summaryId = React.useId();
  const blocks = data.map((item) => ({ ...item, day: toDay(item.date), state: statusMap[item.status] ?? { tone: "neutral" as const, label: item.status } }));
  useOnce(data.some((item) => !statusMap[item.status]), "Tracker: a status missing from statusMap is shown as neutral, by its own name.");
  const roving = useRovingCells(blocks.length);
  const fill = (status: string, tone: TrackerTone) => (statusMap[status] ? TRACKER_TONE[tone] : TRACKER_UNMAPPED);
  // Mapped statuses in the map's order, then any unmapped one by its own name, so no color goes unnamed.
  const unmapped = [...new Set(blocks.filter((block) => !statusMap[block.status]).map((block) => block.status))];
  const used: [string, { tone: TrackerTone; label: string }][] = [
    ...Object.entries(statusMap).filter(([status]) => blocks.some((block) => block.status === status)),
    ...unmapped.map((status) => [status, { tone: "neutral" as const, label: status }] as [string, { tone: TrackerTone; label: string }]),
  ];
  const counted = used.map(([status, state]) => `${state.label} ${blocks.filter((block) => block.status === status).length}`).join(" · ");
  const sentence = summary ?? counted;
  const active = blocks[roving.current];
  const rows = blocks.map((block, index) => ({ index, day: shortDay(block.day), status: block.tooltip ? `${block.state.label} · ${block.tooltip}` : block.state.label }));
  const columns: TableColumn<(typeof rows)[number]>[] = [
    { key: "day", header: chartPeriodLabel(locale), isRowHeader: true },
    { key: "status", header: chartStatusLabel(locale) },
  ];
  return (
    <Shell
      title={title}
      period={period}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      isEmpty={blocks.length === 0}
      height={20 + 8 + 28 + 8 + 16 + 8 + 20}
      legend={used.length > 0 ? <ChartLegend items={used.map(([status, state]) => ({ key: status, label: state.label, color: fill(status, state.tone), kind: "bar" as const }))} /> : undefined}
      columns={columns}
      rows={rows}
    >
      <div data-slot="tracker" className="flex min-w-0 flex-col gap-ds-100">
        {/* The result in words: the strip's description, and what its colors repeat. */}
        <p id={summaryId} data-slot="tracker-summary" className="m-0 h-5 truncate text-body-small text-ds-text">
          {/* Isolated, so a sentence that opens with a figure keeps its order in RTL. */}
          <bdi>{sentence}</bdi>
        </p>
        <div
          role="grid"
          aria-label={title}
          aria-describedby={summaryId}
          data-slot="tracker-strip"
          className="h-7"
          onKeyDown={(event) =>
            roving.onKeyDown(event, (key, from) => {
              if (key === (isRtl ? "ArrowLeft" : "ArrowRight")) return from + 1;
              if (key === (isRtl ? "ArrowRight" : "ArrowLeft")) return from - 1;
              if (key === "Home") return 0;
              if (key === "End") return blocks.length - 1;
              return undefined;
            })
          }
        >
          <div role="row" data-slot="tracker-row" className="grid h-full gap-[2px]" style={{ gridTemplateColumns: `repeat(${Math.max(1, blocks.length)}, minmax(0, 1fr))` }}>
            {blocks.map((block, index) => (
              <span
                key={index}
                role="gridcell"
                aria-label={`${longDay(block.day)}: ${block.state.label}${block.tooltip ? `, ${block.tooltip}` : ""}`}
                data-slot="tracker-block"
                data-tone={block.state.tone}
                {...roving.cellProps(index)}
                onMouseEnter={() => roving.activate(index)}
                className="rounded-[2px] outline-hidden focus-visible:inset-ring-2 focus-visible:inset-ring-ds-border-focused"
                style={{ background: fill(block.status, block.state.tone) }}
              />
            ))}
          </div>
        </div>
        <div data-slot="tracker-range" className="flex justify-between text-body-small text-ds-text-subtle tabular-nums">
          <bdi>{blocks[0] && shortDay(blocks[0].day)}</bdi>
          <bdi>{blocks.length > 0 && shortDay(blocks[blocks.length - 1]!.day)}</bdi>
        </div>
        <Detail>{active && `${shortDay(active.day)} · ${active.state.label}${active.tooltip ? ` · ${active.tooltip}` : ""}`}</Detail>
      </div>
    </Shell>
  );
}

/* ── Funnel ───────────────────────────────────────────────────────────────── */

export type FunnelStep = { name: string; value: number };

export type FunnelProps = FrameProps & {
  /** Truly ordered steps, each a subset of the one before. */
  steps: readonly FunnelStep[];
  valueFormatter?: ChartValueFormatter;
  /** The conversion from the previous step beside each count. On by default. */
  showStepConversion?: boolean;
  /** The first-to-last conversion in the subtitle. On by default. */
  showTotalConversion?: boolean;
};

/**
 * How many items reach each ordered step and where they drop off (search to payment). Bars from a
 * shared inline-start edge, width relative to the first step, `ds-chart-1` fading 12% per step; the step
 * name before the bar, the count after it and the conversion from the previous step in
 * `ds-text-subtlest`. The subtitle states the total conversion. Every figure is text.
 */
export function Funnel({ title, period, steps, valueFormatter = plain, showStepConversion = true, showTotalConversion = true, isLoading, emptyMessage }: FunnelProps) {
  const { locale } = useLocale();
  const valid = steps.filter((step) => Number.isFinite(step.value) && step.value >= 0);
  useOnce(valid.length < steps.length, "Funnel: steps without a finite, non-negative value are left out.");
  useOnce(valid.some((step, index) => index > 0 && step.value > valid[index - 1]!.value), "Funnel: each step should be a subset of the one before.");
  const percent = React.useMemo(() => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }), [locale]);
  const percentFine = React.useMemo(() => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }), [locale]);
  const head = valid[0]?.value ?? 0;
  const rate = (value: number, of: number) => (of > 0 ? value / of : undefined);
  const rows = valid.map((step, index) => ({ ...step, conversion: index === 0 ? undefined : rate(step.value, valid[index - 1]!.value) }));
  const total = valid.length > 1 ? rate(valid[valid.length - 1]!.value, head) : undefined;
  const subtitle = [period, showTotalConversion && total !== undefined ? `${chartConversionLabel(locale)} ${percentFine.format(total)}` : undefined].filter(Boolean).join(" · ") || undefined;
  const columns: TableColumn<(typeof rows)[number]>[] = [
    { key: "name", header: title, isRowHeader: true },
    { key: "value", header: chartValueLabel(locale), align: "end", render: (row) => valueFormatter(row.value) },
    { key: "conversion", header: chartConversionLabel(locale), align: "end", render: (row) => (row.conversion === undefined ? "" : percent.format(row.conversion)) },
  ];
  const height = Math.max(28, valid.length * 28 + Math.max(0, valid.length - 1) * 8);
  return (
    <Shell title={title} period={subtitle} isLoading={isLoading} emptyMessage={emptyMessage} isEmpty={valid.length === 0 || head <= 0} height={height} columns={columns} rows={rows}>
      <ol data-slot="funnel" className="m-0 grid list-none grid-cols-[minmax(0,max-content)_minmax(0,1fr)] items-center gap-x-ds-150 gap-y-ds-100 p-0">
        {rows.map((step, index) => (
          <li key={index} data-slot="funnel-step" className="col-span-2 grid grid-cols-subgrid items-center">
            <bdi data-slot="funnel-name" className="max-w-40 truncate text-end text-body-small text-ds-text-subtle">{step.name}</bdi>
            <span className="flex min-w-0 items-center gap-ds-100">
              <span
                aria-hidden
                data-slot="funnel-bar"
                className="h-7 shrink-0 rounded-[3px]"
                style={{
                  // Room after the longest bar for its count and conversion.
                  // A step larger than the first (warned) stays within the track.
                  width: `calc((100% - 7.5rem) * ${head > 0 ? Math.min(1, step.value / head) : 0})`,
                  minWidth: 2,
                  background: "var(--ds-chart-1)",
                  opacity: Math.max(0.2, 1 - 0.12 * index),
                }}
              />
              <bdi data-slot="funnel-value" className="text-body font-medium tabular-nums text-ds-text">
                {valueFormatter(step.value)}
              </bdi>
              {showStepConversion && step.conversion !== undefined && (
                <bdi data-slot="funnel-conversion" className="text-body-small tabular-nums text-ds-text-subtlest">
                  {percent.format(step.conversion)}
                </bdi>
              )}
            </span>
          </li>
        ))}
      </ol>
    </Shell>
  );
}
