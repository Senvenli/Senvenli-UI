"use client";

import * as React from "react";
import {
  Button as AriaButton,
  ButtonContext,
  Calendar as AriaCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarStateContext,
  I18nProvider,
  RangeCalendar as AriaRangeCalendar,
  RangeCalendarContext,
  RangeCalendarStateContext,
  useSlottedContext,
  useLocale,
  type DateValue,
} from "react-aria-components";
import { getLocalTimeZone, isToday, toCalendarDate, today as todayIn, type CalendarDate } from "@internationalized/date";

import { hasLocalWords, localWords } from "../intl-locale";
import { cn } from "../utils";
import { IconGlyph } from "../display/icon";
import { formatDateTime, intlLocale, nextMonthLabel, previousMonthLabel, rangeCrossesClosedLabel, rangeTooLongLabel, rangeTooShortLabel } from "../i18n";

export type FirstDayOfWeek = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

/** A marker on a day: `true` for a dot, or a phrase that screen readers hear ("Fully booked"). */
export type DateMarker = boolean | string;

type CommonProps = {
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  /** Days that cannot be picked; they stay focusable and say why (`unavailableReason`). */
  isDateUnavailable?: (date: CalendarDate) => boolean;
  /** Why a day is unavailable ("Closed", "Sold out"); read with the day. */
  unavailableReason?: (date: CalendarDate) => string | undefined;
  /** Locale override; the DesignSystemProvider locale by default. Month and weekday names come from Intl. */
  locale?: string;
  /** Overrides the locale's first day of the week. */
  firstDayOfWeek?: FirstDayOfWeek;
  /** The time zone "today" is computed in (the location's); the device's by default. */
  timeZone?: string;
  /** Names the calendar ("Start date"). */
  "aria-label"?: string;
  /**
   * The month that opens while nothing is chosen (any day in it). A prerendered page passes a fixed one, so the HTML
   * does not depend on the build day; left out, the month of "today" (in `timeZone` when given).
   */
  defaultFocusedValue?: CalendarDate;
};

export type CalendarProps = CommonProps & {
  value?: CalendarDate | null;
  defaultValue?: CalendarDate | null;
  onChange?: (value: CalendarDate) => void;
  /** A dot under a day (events on it); a string is also said to screen readers. */
  getDateMarkers?: (date: CalendarDate) => DateMarker | undefined;
  visibleMonths?: 1 | 2;
};

export type DateRange = { start: CalendarDate; end: CalendarDate };

export type RangeCalendarProps = CommonProps & {
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onChange?: (value: DateRange) => void;
  /** Keep this false when a range may not cross an unavailable day (stays, trips, equipment hire). */
  allowsNonContiguousRanges?: boolean;
  /** Shortest and longest range in days (end − start). */
  minDuration?: number;
  maxDuration?: number;
  /** Two months side by side (from 720px), one below on narrow screens; default 2. */
  visibleMonths?: 1 | 2;
  /** In a popover: the footer shows the chosen range and its length beside this action ("Apply dates"). */
  action?: React.ReactNode;
};

const CELL_BASE =
  "relative grid size-ds-control cursor-pointer place-items-center rounded-ds-medium text-body tabular-nums text-ds-text outline-hidden select-none " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  "data-[outside-month]:text-ds-text-disabled " +
  "data-[unavailable]:cursor-not-allowed data-[unavailable]:text-ds-text-disabled " +
  "data-[disabled]:cursor-default data-[disabled]:text-ds-text-disabled";

/**
 * A chevron that points the other way in RTL, also turned back inside a calendar laid out LTR on an RTL page
 *. IconGlyph now applies it to every directional icon; kept here for callers.
 */
export { MIRROR_IN_RTL } from "../display/icon";

/**
 * An LTR locale's calendar is laid out left to right on an RTL page too: its weekdays, its days and its
 * "novembar 2026" heading read in the locale's order, as its arrow keys already move. An RTL locale's follows the page.
 */
function useLtrDir(): "ltr" | undefined {
  return useLocale().direction === "ltr" ? "ltr" : undefined;
}

/** Wraps the calendar in its own locale when one is given. */
function WithLocale({ locale, children }: { locale?: string; children: React.ReactNode }) {
  return locale ? <I18nProvider locale={intlLocale(locale)}>{children}</I18nProvider> : <>{children}</>;
}

/** One month's header: previous on the first month, next on the last, the month and year from Intl. */
function MonthHeader({ offset, months, range }: { offset: number; months: number; range?: boolean }) {
  const { locale } = useLocale();
  const single = React.useContext(CalendarStateContext);
  const ranged = React.useContext(RangeCalendarStateContext);
  const state = range ? ranged : single;
  const start = state?.visibleRange.start.add({ months: offset });
  const title = start
    ? formatDateTime(locale, { month: "long", year: "numeric", timeZone: state?.timeZone }, start.toDate(state!.timeZone))
    : "";
  const nav = "grid size-ds-control-compact cursor-pointer place-items-center rounded-ds-medium text-ds-icon outline-hidden data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused data-[disabled]:cursor-default data-[disabled]:opacity-40";
  return (
    <div data-slot="calendar-header" className="flex items-center justify-between gap-ds-100">
      {offset === 0 ? (
        <AriaButton slot="previous" aria-label={previousMonthLabel(locale)} data-slot="calendar-previous" className={nav}>
          <IconGlyph name="chevron-left" />
        </AriaButton>
      ) : (
        <span className="size-ds-control-compact" />
      )}
      <span data-slot="calendar-title" className="text-heading-xsmall" aria-hidden>
        {title}
      </span>
      {offset === months - 1 ? (
        <AriaButton slot="next" aria-label={nextMonthLabel(locale)} data-slot="calendar-next" className={nav}>
          <IconGlyph name="chevron-right" />
        </AriaButton>
      ) : (
        <span className="size-ds-control-compact" />
      )}
    </div>
  );
}

/** "Pzt", "Mon"; where Intl's short names are whole words (Arabic), the narrow ones keep the 36px columns apart. */
function useWeekdayStyle(): "short" | "narrow" {
  const { locale } = useLocale();
  return React.useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
    // 2026-01-01 is a Thursday; seven days cover the week.
    const longest = Math.max(...Array.from({ length: 7 }, (_, i) => format.format(Date.UTC(2026, 0, 1 + i)).length));
    return longest > 4 ? "narrow" : "short";
  }, [locale]);
}

/**
 * Today in the given zone (the device's by default), known only after mount: the server's clock and zone
 * would underline a different day than the browser, and the mismatch would break hydration.
 */
function useToday(timeZone?: string) {
  const [zone, setZone] = React.useState<string | null>(null);
  React.useEffect(() => setZone(timeZone ?? getLocalTimeZone()), [timeZone]);
  return (date: DateValue) => zone !== null && isToday(date, zone);
}

/**
 * The app's own words in what React Aria says itself (see `registerLocalWords`): the calendar's name and its hidden
 * heading, each grid's name, every day's label and the live announcements of a new month or a picked day, which a
 * screen reader reads instead of the visible text. React Aria sets them on every render of its own components, so
 * they are rewritten as they change. Only React Aria's words change: the caller's own `aria-label` at the start of
 * the calendar's name stays as given. Without a registered hook nothing runs.
 */
function useLocalAriaLabels(ref: React.RefObject<HTMLElement | null>, locale: string, own?: string) {
  React.useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !hasLocalWords()) return;
    const words = (text: string) => localWords(locale, text);
    // The calendar's name and hidden heading are the caller's label, ", ", then React Aria's month range.
    const after = (text: string) => {
      const lead = own ? `${own}, ` : "";
      return lead && text.startsWith(lead) ? lead + words(text.slice(lead.length)) : own === text ? text : words(text);
    };
    const fixLabel = (element: Element, rewrite: (text: string) => string) => {
      const label = element.getAttribute("aria-label");
      if (!label) return;
      const local = rewrite(label);
      if (local !== label) element.setAttribute("aria-label", local);
    };
    const fixText = (element: Element, rewrite: (text: string) => string) => {
      for (const node of Array.from(element.childNodes)) {
        if (node.nodeType !== Node.TEXT_NODE || !node.nodeValue) continue;
        const local = rewrite(node.nodeValue);
        if (local !== node.nodeValue) node.nodeValue = local;
      }
    };
    const fixAll = () => {
      fixLabel(root, after);
      root.querySelectorAll("h2").forEach((heading) => fixText(heading, after));
      root.querySelectorAll('[role="grid"]').forEach((grid) => fixLabel(grid, words));
      root.querySelectorAll('[role="gridcell"] [aria-label], [role="gridcell"][aria-label]').forEach((cell) => fixLabel(cell, words));
    };
    // React Aria announces a new month and a picked day in one live region at the end of the body.
    const fixAnnouncements = () => {
      document.querySelectorAll('[data-live-announcer="true"] *').forEach((element) => fixText(element, words));
    };
    fixAll();
    const observer = new MutationObserver(fixAll);
    observer.observe(root, { attributes: true, attributeFilter: ["aria-label"], subtree: true, childList: true, characterData: true });
    const announcements = new MutationObserver(fixAnnouncements);
    announcements.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => {
      observer.disconnect();
      announcements.disconnect();
    };
  }, [ref, locale, own]);
}

/**
 * Attaches a note (why a day is unavailable, what a marker means) to the day's button as its description.
 * React Aria names the button with aria-label, which hides any text inside it, and CalendarCell drops an
 * aria-describedby prop; so the id is added to the button here, beside any React Aria sets itself.
 */
function CellNote({ children }: { children: string }) {
  const id = React.useId();
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const button = ref.current?.parentElement;
    if (!button) return;
    const ids = (button.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
    if (!ids.includes(id)) button.setAttribute("aria-describedby", [...ids, id].join(" "));
    return () => {
      const rest = (button.getAttribute("aria-describedby") ?? "").split(" ").filter((x) => x && x !== id);
      if (rest.length) button.setAttribute("aria-describedby", rest.join(" "));
      else button.removeAttribute("aria-describedby");
    };
  });
  return <span ref={ref} id={id} hidden data-slot="calendar-day-note">{children}</span>;
}

const FRAME = "inline-flex w-fit max-w-full flex-col gap-ds-100 rounded-ds-large bg-ds-surface-raised p-ds-200 text-ds-text shadow-ds-raised";
/** Inside a picker's popover the popover is the surface; the calendar only lays out its months. */
const BARE = "flex flex-col gap-ds-100 text-ds-text outline-hidden";

/** Set by DatePicker and DateRangeField around their calendar (internal; not exported from the package). */
export const CalendarInPopoverContext = React.createContext(false);

/**
 * One month (or two) to pick a single date: the grid inside DatePicker, and on its own for a fleet
 * day view or holidays. Month and weekday names and the first day of the week follow the
 * locale. Arrow keys move by day, Page Up/Down by month, Home/End to the week's edges.
 */
export function Calendar({
  value, defaultValue, onChange, minValue, maxValue, isDateUnavailable, unavailableReason, getDateMarkers,
  locale, firstDayOfWeek, timeZone, visibleMonths = 1, defaultFocusedValue, "aria-label": ariaLabel,
}: CalendarProps) {
  return (
    <WithLocale locale={locale}>
      <CalendarBody
        {...{ value, defaultValue, onChange, minValue, maxValue, isDateUnavailable, unavailableReason, getDateMarkers, firstDayOfWeek, timeZone, visibleMonths, defaultFocusedValue, ariaLabel }}
      />
    </WithLocale>
  );
}

function CalendarBody({
  value, defaultValue, onChange, minValue, maxValue, isDateUnavailable, unavailableReason, getDateMarkers,
  firstDayOfWeek, timeZone, visibleMonths, defaultFocusedValue, ariaLabel,
}: Omit<CalendarProps, "locale" | "aria-label"> & { ariaLabel?: string; visibleMonths: 1 | 2 }) {
  const today = useToday(timeZone);
  const weekdayStyle = useWeekdayStyle();
  const inPopover = React.useContext(CalendarInPopoverContext);
  const dir = useLtrDir();
  const { locale } = useLocale();
  const root = React.useRef<HTMLDivElement>(null);
  useLocalAriaLabels(root, locale, ariaLabel);
  return (
    <AriaCalendar<CalendarDate>
      ref={root}
      dir={dir}
      aria-label={ariaLabel}
      value={value}
      defaultValue={defaultValue}
      // With a time zone and no date yet, open on that zone's month, the one "today" is underlined in.
      defaultFocusedValue={value || defaultValue ? undefined : (defaultFocusedValue ?? (timeZone ? todayIn(timeZone) : undefined))}
      onChange={onChange}
      minValue={minValue}
      maxValue={maxValue}
      isDateUnavailable={isDateUnavailable as ((date: DateValue) => boolean) | undefined}
      firstDayOfWeek={firstDayOfWeek}
      visibleDuration={{ months: visibleMonths }}
      data-slot="calendar"
      className={inPopover ? BARE : FRAME}
    >
      {/* In a popover the months stay side by side (the picker asks for two only from 720px), so the popover
          grows and React Aria shifts it into view instead of the months wrapping under each other. */}
      <div className={cn("flex gap-ds-400", inPopover ? "flex-nowrap" : "flex-wrap")}>
        {Array.from({ length: visibleMonths }, (_, offset) => (
          <div key={offset} data-slot="calendar-month" className="flex flex-col gap-ds-100">
            <MonthHeader offset={offset} months={visibleMonths} />
            <CalendarGrid offset={{ months: offset }} weekdayStyle={weekdayStyle} className="border-separate border-spacing-x-0 border-spacing-y-0.5">
              <CalendarGridHeader>
                {(day) => (
                  <CalendarHeaderCell data-slot="calendar-weekday" className="h-6 text-body-small font-normal text-ds-text-subtlest">
                    {day}
                  </CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => {
                  const marker = getDateMarkers?.(date as CalendarDate);
                  const closed = isDateUnavailable?.(date as CalendarDate) ?? false;
                  const reason = closed ? unavailableReason?.(date as CalendarDate) : undefined;
                  const note = [typeof marker === "string" ? marker : undefined, reason].filter(Boolean).join(", ");
                  return (
                    <CalendarCell
                      date={date}
                      data-slot="calendar-day"
                      className={cn(
                        CELL_BASE,
                        today(date) && "underline underline-offset-3",
                        closed && "line-through",
                        "data-[selected]:bg-ds-background-brand-bold data-[selected]:font-medium data-[selected]:text-ds-text-on-brand",
                      )}
                    >
                      {({ formattedDate, isSelected }) => (
                        <>
                          {formattedDate}
                          {marker && (
                            <span
                              data-slot="calendar-marker"
                              aria-hidden
                              className={cn("absolute bottom-[5px] start-1/2 size-1 -translate-x-1/2 rounded-ds-full rtl:translate-x-1/2 [&:dir(ltr)]:-translate-x-1/2", isSelected ? "bg-ds-text-on-brand" : "bg-ds-icon-brand")}
                            />
                          )}
                          {note && <CellNote>{note}</CellNote>}
                        </>
                      )}
                    </CalendarCell>
                  );
                }}
              </CalendarGridBody>
            </CalendarGrid>
          </div>
        ))}
      </div>
    </AriaCalendar>
  );
}

/** Keeps the parent informed of the day picked first, so durations can limit the second pick. */
function AnchorWatcher({ onAnchor }: { onAnchor: (date: CalendarDate | null) => void }) {
  const state = React.useContext(RangeCalendarStateContext);
  const anchor = (state?.anchorDate ?? null) as CalendarDate | null;
  const key = anchor?.toString() ?? "";
  React.useEffect(() => onAnchor(anchor), [key]);
  return null;
}

/**
 * A start and an end across two months: the grid inside DateRangeField and range flows. The ends
 * sit on the brand fill, rounded on their outer side; the days between form one square band on
 * ds-background-selected that runs across week rows and month edges, joined to both ends.
 */
export function RangeCalendar({
  value, defaultValue, onChange, minValue, maxValue, isDateUnavailable, unavailableReason, allowsNonContiguousRanges = false,
  minDuration, maxDuration, locale, firstDayOfWeek, timeZone, visibleMonths = 2, action, defaultFocusedValue, "aria-label": ariaLabel,
}: RangeCalendarProps) {
  return (
    <WithLocale locale={locale}>
      <RangeCalendarBody
        {...{ value, defaultValue, onChange, minValue, maxValue, isDateUnavailable, unavailableReason, allowsNonContiguousRanges, minDuration, maxDuration, firstDayOfWeek, timeZone, visibleMonths, action, defaultFocusedValue, ariaLabel }}
      />
    </WithLocale>
  );
}

function RangeCalendarBody({
  value, defaultValue, onChange, minValue, maxValue, isDateUnavailable, unavailableReason, allowsNonContiguousRanges,
  minDuration, maxDuration, firstDayOfWeek, timeZone, visibleMonths, action, defaultFocusedValue, ariaLabel,
}: Omit<RangeCalendarProps, "locale" | "aria-label"> & { ariaLabel?: string; visibleMonths: 1 | 2 }) {
  const { locale } = useLocale();
  const dir = useLtrDir();
  const today = useToday(timeZone);
  const weekdayStyle = useWeekdayStyle();
  const rangeRoot = React.useRef<HTMLDivElement>(null);
  useLocalAriaLabels(rangeRoot, locale, ariaLabel);
  const [anchor, setAnchor] = React.useState<CalendarDate | null>(null);
  const inPopover = React.useContext(CalendarInPopoverContext);
  // Inside DateRangeField the picker owns the value; the calendar reads and reports through it.
  const picker = useSlottedContext(RangeCalendarContext) as { value?: DateRange | null; onChange?: (value: DateRange) => void } | null;
  const [own, setOwn] = React.useState<DateRange | null>(defaultValue ?? null);
  const range = picker ? (picker.value ?? null) : value === undefined ? own : value;

  // React Aria cuts the end pick at the first unavailable day around the start, so a minDuration gap would
  // cut off every later day. Contiguity is kept here instead: past the first day the caller marks
  // unavailable (each side of the start), nothing can be the end. Worked out on every render, so a
  // callback that changes mid-pick (availability loading in) is always the one obeyed.
  const contiguous = !allowsNonContiguousRanges && !!isDateUnavailable;
  const edges: { before?: number; after?: number } = {};
  const edge = (side: "before" | "after") => {
    if (edges[side] === undefined) {
      const step = side === "before" ? -1 : 1;
      const limit = maxDuration ?? 731;
      edges[side] = Infinity;
      for (let i = 1; i <= limit; i++) {
        if (isDateUnavailable!(anchor!.add({ days: i * step }))) {
          edges[side] = i;
          break;
        }
      }
    }
    return edges[side]!;
  };

  /** Why the length limits or contiguity close a day while the end is picked (not booked, so not struck through). */
  const outOfReach = (day: CalendarDate): string | undefined => {
    if (!anchor) return undefined;
    const offset = day.compare(anchor);
    const length = Math.abs(offset);
    if (contiguous && length >= edge(offset < 0 ? "before" : "after")) return rangeCrossesClosedLabel(locale);
    if (minDuration !== undefined && length > 0 && length < minDuration) return rangeTooShortLabel(locale);
    if (maxDuration !== undefined && length > maxDuration) return rangeTooLongLabel(locale);
    return undefined;
  };
  const unavailable = (date: DateValue) => !!isDateUnavailable?.(date as CalendarDate) || outOfReach(date as CalendarDate) !== undefined;

  /** Backstop for a range that reaches React Aria some other way: it may not hold a day the caller closed. */
  const crossesClosedDay = (next: DateRange) => {
    if (!contiguous) return false;
    const end = toCalendarDate(next.end);
    for (let day = toCalendarDate(next.start); day.compare(end) <= 0; day = day.add({ days: 1 })) if (isDateUnavailable!(day)) return true;
    return false;
  };

  const formatDay = (day: CalendarDate) => formatDateTime(locale, { day: "numeric", month: "short", timeZone: "UTC" }, toCalendarDate(day).toDate("UTC"));
  // While the end is picked the footer follows the start, not the range it is replacing.
  const summary = anchor
    ? `${formatDay(anchor)} – …`
    : range
      ? `${formatDay(range.start)} – ${formatDay(range.end)} · ${new Intl.NumberFormat(locale, { style: "unit", unit: "day", unitDisplay: "long" }).format(toCalendarDate(range.end).compare(toCalendarDate(range.start)))}`
      : "";

  // React Aria would chain the picker's own onChange with ours and commit before our checks run; without it
  // in the context, ours is the only path and it forwards to the picker once the range passes.
  const pickerContext = picker ? { ...picker, onChange: undefined } : null;
  const calendar = (
    <AriaRangeCalendar<CalendarDate>
      ref={rangeRoot}
      dir={dir}
      aria-label={ariaLabel}
      value={range}
      // With a time zone and no range yet, open on that zone's month, the one "today" is underlined in.
      defaultFocusedValue={range ? undefined : (defaultFocusedValue ?? (timeZone ? todayIn(timeZone) : undefined))}
      onChange={(next) => {
        // Picking the start again ends a zero-day range; below minDuration it is not taken.
        if (minDuration !== undefined && toCalendarDate(next.end).compare(toCalendarDate(next.start)) < minDuration) return;
        if (crossesClosedDay(next)) return;
        if (picker) return picker.onChange?.(next);
        if (value === undefined) setOwn(next);
        onChange?.(next);
      }}
      minValue={minValue}
      maxValue={maxValue}
      isDateUnavailable={unavailable}
      allowsNonContiguousRanges
      firstDayOfWeek={firstDayOfWeek}
      visibleDuration={{ months: visibleMonths }}
      data-slot="range-calendar"
      className={inPopover ? BARE : FRAME}
    >
      <AnchorWatcher onAnchor={setAnchor} />
      {/* In a popover the months stay side by side (the picker asks for two only from 720px), so the popover
          grows and React Aria shifts it into view instead of the months wrapping under each other. */}
      <div className={cn("flex gap-ds-400", inPopover ? "flex-nowrap" : "flex-wrap")}>
        {Array.from({ length: visibleMonths }, (_, offset) => (
          <div key={offset} data-slot="calendar-month" className="flex flex-col gap-ds-100">
            <MonthHeader offset={offset} months={visibleMonths} range />
            <CalendarGrid offset={{ months: offset }} weekdayStyle={weekdayStyle} className="border-separate border-spacing-x-0 border-spacing-y-0.5">
              <CalendarGridHeader>
                {(day) => (
                  <CalendarHeaderCell data-slot="calendar-weekday" className="h-6 text-body-small font-normal text-ds-text-subtlest">
                    {day}
                  </CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => {
                  const closed = isDateUnavailable?.(date as CalendarDate) ?? false;
                  const limit = closed ? undefined : outOfReach(date as CalendarDate);
                  const reason = closed ? unavailableReason?.(date as CalendarDate) : limit;
                  return (
                    <CalendarCell
                      date={date}
                      data-slot="calendar-day"
                      data-out-of-reach={limit !== undefined || undefined}
                      className={({ isSelected, isSelectionStart, isSelectionEnd, isOutsideMonth }) => {
                        const end = isSelectionStart || isSelectionEnd;
                        const band = isSelected && !isOutsideMonth;
                        return cn(
                          CELL_BASE,
                          today(date) && "underline underline-offset-3",
                          // Struck through only when the caller closed the day; length limits just dim it.
                          closed && "line-through",
                          // The band: square, so it reads as one shape across rows and months.
                          band && !end && "rounded-none bg-ds-background-selected data-[hovered]:bg-ds-background-selected-hovered",
                          // The ends: brand fill, rounded on the outer side only; the square inner side meets the band.
                          band && end && "bg-ds-background-brand-bold font-medium text-ds-text-on-brand data-[hovered]:bg-ds-background-brand-bold-hovered",
                          band && isSelectionStart && !isSelectionEnd && "rounded-e-none",
                          band && isSelectionEnd && !isSelectionStart && "rounded-s-none",
                        );
                      }}
                    >
                      {({ formattedDate }) => (
                        <>
                          {formattedDate}
                          {reason && <CellNote>{reason}</CellNote>}
                        </>
                      )}
                    </CalendarCell>
                  );
                }}
              </CalendarGridBody>
            </CalendarGrid>
          </div>
        ))}
      </div>
      {action != null && (
        <div data-slot="range-calendar-footer" className="flex items-center justify-between gap-ds-200 border-t border-ds-border pt-ds-150">
          <span data-slot="range-calendar-summary" aria-live="polite" className="text-body-small text-ds-text-subtle tabular-nums">{summary}</span>
          {/* The calendar's button slots (previous/next) must not reach the caller's action. */}
          <ButtonContext.Provider value={null}>{action}</ButtonContext.Provider>
        </div>
      )}
    </AriaRangeCalendar>
  );
  return pickerContext ? <RangeCalendarContext.Provider value={pickerContext}>{calendar}</RangeCalendarContext.Provider> : calendar;
}
