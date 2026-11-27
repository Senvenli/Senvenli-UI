"use client";

import * as React from "react";
import {
  Button as AriaButton,
  ButtonContext,
  DatePicker as AriaDatePicker,
  DatePickerStateContext,
  DateRangePicker as AriaDateRangePicker,
  DateRangePickerStateContext,
  Dialog,
  Popover,
  ToggleButton as AriaToggleButton,
  ToggleButtonGroup as AriaToggleButtonGroup,
  useLocale,
  type DateValue,
  type TimeValue,
} from "react-aria-components";
import { getLocalTimeZone, toCalendarDate, today as todayIn, type CalendarDate, type CalendarDateTime } from "@internationalized/date";

import { cn } from "../utils";
import { Button } from "../action/index";
import { IconGlyph } from "../display/icon";
import { FieldDescription, FieldError, FieldLabel } from "../form/field-parts";
import { InputGroup } from "../form/input-group";
import type { RequiredValidation } from "../form/validation";
import { FIELD_STACK, INLINE_ACTION } from "../form/styles";
import { clearLabel, dateMaxLabel, formatDateTime, dateMinLabel, dateUnavailableLabel, hasDsStrings, rangeStartLabel, rangeStartTimeLabel, rangeEndLabel, rangeEndTimeLabel, rangePresetsLabel, thisMonthLabel, todayLabel } from "../i18n";
import { POPOVER } from "../selection/listbox";
import { Calendar, CalendarInPopoverContext, RangeCalendar, type DateMarker, type FirstDayOfWeek } from "./calendar";
import { TimeField, fixedSegments, formValue, invalidProps, useDateValidation, type DateFieldProps } from "./fields";
import { MonthGrid, monthRange } from "./month-grid";
import { Segments } from "./segments";

// Scrolls rather than clips when the viewport is short (times under the calendar).
const PICKER_POPOVER = cn(POPOVER, "min-w-0 gap-ds-100 overflow-auto p-ds-200");

/** The calendar button at the end of the field (24px, like the other inline actions). */
function CalendarButton() {
  return (
    <AriaButton data-slot="date-picker-button" className={INLINE_ACTION}>
      <IconGlyph name="calendar" />
    </AriaButton>
  );
}

export type DatePickerProps = Omit<DateFieldProps, "granularity" | "hideYear" | "value"> & {
  /**
   * A calendar date, no time zone; with `granularity="month"` the month's first day.
   *
   * While the user leaves a date typed in part or impossible ("31.aa.2026", "31.11.2026"), the field reports
   * `onChange(null)` and keeps the typed parts on screen, so setting `null` changes nothing: the value already is null.
   * To clear the field (an app's own "Temizle" or form reset), give it a new `key` along with the value: React remounts
   * it empty, or at the value given.
   */
  value?: CalendarDate | null;
  isDateUnavailable?: (date: CalendarDate) => boolean;
  unavailableReason?: (date: CalendarDate) => string | undefined;
  getDateMarkers?: (date: CalendarDate) => DateMarker | undefined;
  firstDayOfWeek?: FirstDayOfWeek;
  /** "Today" in the calendar and the Today action: the location's zone; the device's by default. */
  timeZone?: string;
  /** Close the calendar once a day is picked (default). */
  shouldCloseOnSelect?: boolean;
  /**
   * `month`: a year and a month, for a report or history range. The field types month and year
   * (as DateField `granularity="month"`), the value is that month's first day, and the popover is a grid of the
   * twelve months under a year stepper, with "This month" and "Clear"; `minValue` and `maxValue` count by month.
   * The day-only props (unavailable days, markers, first day of the week) do not apply. Default `day`.
   */
  granularity?: "day" | "month";
};

const MONTH_ONLY = fixedSegments("month");

/** React Aria's bound format for a calendar date (numeric day, month, year), and a month's ("March 2026"). */
const DAY_FORMAT: Intl.DateTimeFormatOptions = { year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC" };
const MONTH_FORMAT: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", timeZone: "UTC" };

/**
 * The bounds and unavailable-day messages React Aria shows on its own, in the provider locale.
 * React Aria words them after the browser's language (navigator.language) on purpose, to match the browser's own
 * form messages, so a Turkish app in an English browser said "Value must be 3/1/2026 or later." These are returned
 * as the field's own validation, which React Aria shows in place of its built-in text; the conditions, the order
 * (lower bound, upper bound, unavailable) and the timing are React Aria's. A month picker names the month.
 * Only locales the app registered strings for: in any other locale this returns nothing, so React
 * Aria's own text stays, as it was before.
 */
function boundsErrors(
  value: DateValue | null,
  bounds: { minValue?: DateValue; maxValue?: DateValue; isDateUnavailable?: (date: DateValue) => boolean },
  locale: string,
  month: boolean,
): string[] | null {
  if (value == null || !hasDsStrings(locale)) return null;
  const format = (date: DateValue) => formatDateTime(locale, month ? MONTH_FORMAT : DAY_FORMAT, date.toDate("UTC"));
  const errors: string[] = [];
  if (bounds.minValue && value.compare(bounds.minValue) < 0) errors.push(dateMinLabel(locale, format(bounds.minValue), month));
  if (bounds.maxValue && value.compare(bounds.maxValue) > 0) errors.push(dateMaxLabel(locale, format(bounds.maxValue), month));
  if (bounds.isDateUnavailable?.(value)) errors.push(dateUnavailableLabel(locale));
  return errors.length ? errors : null;
}

/** A validate result that is an error (React Aria's reading: a non-empty string or list). */
const isError = (result: string | string[] | true | null | undefined): result is string | string[] =>
  Array.isArray(result) ? result.length > 0 : typeof result === "string" && result !== "";

/**
 * Today and Clear under the calendar; the picker's own button context must not reach them. A month picker
 * says "This month" and picks this month's first day, and cannot pick it when it is outside the bounds.
 */
function PickerActions({ timeZone, month }: { timeZone?: string; month?: { minValue?: CalendarDate; maxValue?: CalendarDate } }) {
  const state = React.useContext(DatePickerStateContext);
  const { locale } = useLocale();
  if (!state) return null;
  if (month) {
    const now = todayIn(timeZone ?? getLocalTimeZone()).set({ day: 1 });
    return (
      <ButtonContext.Provider value={null}>
        <div data-slot="date-picker-actions" className="flex items-center justify-between gap-ds-100">
          <Button
            variant="link"
            size="small"
            isDisabled={!monthRange(month.minValue, month.maxValue).contains(now.year * 12 + now.month - 1)}
            onPress={() => { state.setValue(now); state.close(); }}
          >
            {thisMonthLabel(locale)}
          </Button>
          <Button variant="subtle" size="small" onPress={() => { state.setValue(null); state.close(); }}>
            {clearLabel(locale)}
          </Button>
        </div>
      </ButtonContext.Provider>
    );
  }
  return (
    <ButtonContext.Provider value={null}>
      <div data-slot="date-picker-actions" className="flex items-center justify-between gap-ds-100">
        <Button variant="link" size="small" onPress={() => { state.setValue(todayIn(timeZone ?? getLocalTimeZone())); state.close(); }}>
          {todayLabel(locale)}
        </Button>
        <Button variant="subtle" size="small" onPress={() => { state.setValue(null); state.close(); }}>
          {clearLabel(locale)}
        </Button>
      </div>
    </ButtonContext.Provider>
  );
}

/**
 * A DateField with a calendar popover: type when you know the date, pick when you are browsing. The label
 * names the field and the calendar button; picking fills the field and closes (unless
 * `shouldCloseOnSelect={false}`). For a period (a stay, a trip) use DateRangePicker; for a birth date, DateField. For a
 * year and a month (a history from–to filter), `granularity="month"`: a month grid instead of the days.
 */
export function DatePicker({
  label, description, errorMessage, isOptional, validate, onBlur, onChange, value, defaultValue,
  isDateUnavailable, unavailableReason, getDateMarkers, firstDayOfWeek, timeZone, shouldCloseOnSelect = true, granularity = "day", requiredValidation, id, ...rest
}: DatePickerProps) {
  const month = granularity === "month";
  const { locale } = useLocale();
  const { timing, reporter, emptyError, value: held, reported } = useDateValidation<CalendarDate>({ validate, value, defaultValue, isRequired: rest.isRequired, requiredValidation, onBlur, onChange });
  const invalid = invalidProps(emptyError, rest.isInvalid, errorMessage);
  // A month's value is its first day: a minimum later in its month still lets that month through.
  const minValue = month && rest.minValue ? rest.minValue.set({ day: 1 }) : rest.minValue;
  const ownValidate = timing.validate as ((value: DateValue | null) => string | string[] | true | null | undefined) | undefined;
  const frame = React.useRef<HTMLDivElement>(null);
  // Picking in the calendar returns focus to the field (its first segment), not to the calendar button.
  // Only a change made while the calendar is open counts: typing and then Escape leaves focus alone.
  const picked = React.useRef(false);
  const open = React.useRef(false);
  return (
    <AriaDatePicker<CalendarDate>
      onOpenChange={(isOpen) => {
        open.current = isOpen;
        if (isOpen) {
          picked.current = false;
          return;
        }
        if (!picked.current) return;
        picked.current = false;
        requestAnimationFrame(() => frame.current?.querySelector<HTMLElement>("[role='spinbutton'][tabindex]")?.focus());
      }}
      {...rest}
      {...(month && minValue ? { minValue } : {})}
      isInvalid={invalid.isInvalid}
      value={held}
      defaultValue={defaultValue}
      granularity="day"
      isDateUnavailable={isDateUnavailable as ((date: DateValue) => boolean) | undefined}
      firstDayOfWeek={firstDayOfWeek}
      shouldCloseOnSelect={shouldCloseOnSelect}
      validationBehavior={timing.validationBehavior}
      // The field's own check first (it wins over the built-in one, as in React Aria), then the bounds in the app's locale.
      validate={(next) => {
        const own = ownValidate?.(next);
        return isError(own) ? own : boundsErrors(next, { minValue, maxValue: rest.maxValue, isDateUnavailable: isDateUnavailable as ((date: DateValue) => boolean) | undefined }, locale, month);
      }}
      onBlur={timing.onBlur}
      onChange={(next) => {
        if (open.current) picked.current = true;
        (timing.onChange as (value: CalendarDate | null) => void)(next);
      }}
      data-slot="date-picker"
      data-granularity={month ? "month" : undefined}
      className={FIELD_STACK}
    >
      {({ isInvalid, isDisabled }) => (
        <>
          <FieldLabel isRequired={rest.isRequired} isOptional={isOptional}>{label}</FieldLabel>
          <div ref={frame} className="contents">
          <InputGroup isDisabled={isDisabled} isInvalid={isInvalid}>
            <Segments fixed={month ? MONTH_ONLY : undefined} onReport={reporter("date")} id={id} formValue={formValue(reported)} />
            <CalendarButton />
          </InputGroup>
          </div>
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError>{invalid.errorMessage}</FieldError>
          <Popover data-slot="date-picker-popover" placement="bottom start" offset={4} className={PICKER_POPOVER}>
            <Dialog data-slot="date-picker-dialog" className="flex flex-col gap-ds-100 outline-hidden">
              {month ? (
                <>
                  <MonthGrid minValue={rest.minValue} maxValue={rest.maxValue} timeZone={timeZone} shouldCloseOnSelect={shouldCloseOnSelect} />
                  <PickerActions timeZone={timeZone} month={{ minValue: rest.minValue, maxValue: rest.maxValue }} />
                </>
              ) : (
                <>
                  <CalendarInPopoverContext.Provider value>
                    <Calendar
                      isDateUnavailable={isDateUnavailable}
                      unavailableReason={unavailableReason}
                      getDateMarkers={getDateMarkers}
                      firstDayOfWeek={firstDayOfWeek}
                      timeZone={timeZone}
                    />
                  </CalendarInPopoverContext.Provider>
                  <PickerActions timeZone={timeZone} />
                </>
              )}
            </Dialog>
          </Popover>
        </>
      )}
    </AriaDatePicker>
  );
}

type Span<T extends DateValue = CalendarDate> = { start: T; end: T };
/** Start and end: both calendar dates (`granularity="day"`) or both date-times (`"hour"`). */
export type DateRangePickerValue = Span<CalendarDate> | Span<CalendarDateTime>;

export type DateRangePickerProps = {
  /** "Trip dates". */
  label: React.ReactNode;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  /**
   * Start and end: calendar dates (`day`) or date-times (`hour`) in the location's time zone.
   *
   * While the user leaves a half typed in part or impossible ("14.aa.2026", "10:––", "31.11.2026"), or one half empty
   * while the other stands, the field reports `onChange(null)` and keeps the typed parts on screen, so setting `null`
   * changes nothing: the value already is null. To clear the field (an app's own "Temizle" or form reset), give it a new
   * `key` along with the value: React remounts it empty, or at the value given.
   */
  value?: DateRangePickerValue | null;
  defaultValue?: DateRangePickerValue | null;
  onChange?: (value: DateRangePickerValue | null) => void;
  /** `hour` adds start and end times. */
  granularity?: "day" | "hour";
  /** Now plus the lead time. */
  minValue?: DateValue;
  maxValue?: DateValue;
  /** Fleet availability: those days stay visible, struck through, and say why (`unavailableReason`). */
  isDateUnavailable?: (date: CalendarDate) => boolean;
  unavailableReason?: (date: CalendarDate) => string | undefined;
  allowsNonContiguousRanges?: boolean;
  /** Overline labels of the two halves; "Start" and "End" by default. */
  startLabel?: string;
  endLabel?: string;
  /** Week start and month names; the provider locale by default. */
  firstDayOfWeek?: FirstDayOfWeek;
  /** The location's zone, for "today" in the calendar. */
  timeZone?: string;
  /** Right of the duration under the calendar: the price total (`metric-small`). */
  footer?: React.ReactNode;
  /**
   * How the duration under the calendar counts dates. `elapsed` (default): the days between them, as a stay or a hire is
   * charged (14 → 18 is 4 days). `inclusive`: both ends count, as a report period reads (21 → 27 is 7 days, "Last 7
   * days"). Ranges with times always count started 24-hour blocks.
   */
  dayCount?: "elapsed" | "inclusive";
  isRequired?: boolean;
  /**
   * Who says an empty required field is missing: `field` (default) or `app`. With `app` a DS
   * Form's `onSubmit` runs with the field empty, and the app's own error must clear on change. See
   * {@link RequiredValidation} for the whole contract.
   */
  requiredValidation?: RequiredValidation;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isInvalid?: boolean;
  isOptional?: boolean;
  /**
   * The id of the start half's first typed segment, the element that takes focus, as on DateField:
   * `document.getElementById(id).focus()` puts the user in the field. Left out, the DOM is as before.
   */
  id?: string;
  /** Form field names for the two halves (ISO strings). */
  startName?: string;
  endName?: string;
  validate?: (value: Span<DateValue> | null) => string | string[] | true | null | undefined;
  onBlur?: (event: React.FocusEvent) => void;
  /**
   * Quick ranges in the popover ("Last 7 days"), a column beside the calendar from 720px and a row of chips above it
   * on phones. Picking one sets the dates (the field keeps showing dates), reports its `id` and closes the popover.
   * `range` gets today in `timeZone` and is called at the moment of the pick.
   */
  presets?: readonly DateRangePreset[];
  /** The chosen preset's id, controlled; `null` for dates set by hand. Keep it (not the dates) in the URL. */
  presetId?: string | null;
  defaultPresetId?: string | null;
  /** A preset picked (its id), or the dates changed by hand (`null`). */
  onPresetChange?: (id: string | null) => void;
};

export type DateRangePreset = {
  /** Stable, never the label ("7d", "mtd"). */
  id: string;
  label: string;
  /** The range for `today` (the location's today, in `timeZone`). */
  range: (today: CalendarDate) => { start: DateValue; end: DateValue };
};

/** Two months from 720px, one on phones (after mount; the server renders one). */
function useWide() {
  return React.useSyncExternalStore(
    (notify) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const query = window.matchMedia("(min-width: 720px)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => typeof window.matchMedia === "function" && window.matchMedia("(min-width: 720px)").matches,
    () => false,
  );
}

/**
 * Duration in started 24-hour blocks: 14 Eki 10:00 → 18 Eki 10:00 is 4 days, 10:00 → 10:30 four days
 * later is 5. Dates alone count nights (14 → 18 is 4).
 */
export function rangeDuration(start: DateValue, end: DateValue, dayCount: "elapsed" | "inclusive" = "elapsed"): { days: number; hours?: number } {
  if (!("hour" in start) || !("hour" in end)) return { days: toCalendarDate(end).compare(toCalendarDate(start)) + (dayCount === "inclusive" ? 1 : 0) };
  const hours = Math.ceil((end.toDate("UTC").getTime() - start.toDate("UTC").getTime()) / 3_600_000);
  return { days: Math.max(1, Math.ceil(hours / 24)), hours };
}

function Duration({ footer, dayCount }: { footer?: React.ReactNode; dayCount: "elapsed" | "inclusive" }) {
  const state = React.useContext(DateRangePickerStateContext);
  const { locale } = useLocale();
  const range = state?.value;
  let text = "";
  if (range?.start && range.end) {
    const { days, hours } = rangeDuration(range.start, range.end, dayCount);
    const unit = (n: number, u: "day" | "hour") => new Intl.NumberFormat(locale, { style: "unit", unit: u, unitDisplay: "long" }).format(n);
    text = hours === undefined ? unit(days, "day") : `${unit(days, "day")} · ${unit(hours, "hour")}`;
  }
  if (!text && footer == null) return null;
  return (
    <div data-slot="date-range-footer" className="flex items-center justify-between gap-ds-200 border-t border-ds-border pt-ds-150">
      <span data-slot="date-range-duration" aria-live="polite" className="text-body-small text-ds-text-subtle tabular-nums">{text}</span>
      {footer != null && <span data-slot="date-range-price" className="text-metric-small tabular-nums">{footer}</span>}
    </div>
  );
}

/** Start and end times under the calendar when the range has hours. */
function RangeTimes({ timeZone }: { timeZone?: string }) {
  const state = React.useContext(DateRangePickerStateContext);
  const { locale } = useLocale();
  if (!state) return null;
  return (
    <div data-slot="date-range-times" className="grid grid-cols-2 gap-ds-200">
      <TimeField label={rangeStartTimeLabel(locale)} value={state.timeRange?.start ?? null} timeZone={timeZone}
        onChange={(time) => time && state.setTime("start", time as TimeValue)} />
      <TimeField label={rangeEndTimeLabel(locale)} value={state.timeRange?.end ?? null} timeZone={timeZone}
        onChange={(time) => time && state.setTime("end", time as TimeValue)} />
    </div>
  );
}

/** The quick ranges: one is chosen (a radio group); picking applies it and closes the popover. */
function RangePresets({ presets, selected, timeZone, onPick, wide }: {
  presets: readonly DateRangePreset[]; selected: string | null; timeZone?: string; wide: boolean; onPick: (id: string, range: Span<DateValue>) => void;
}) {
  const state = React.useContext(DateRangePickerStateContext);
  const { locale } = useLocale();
  return (
    <AriaToggleButtonGroup
      aria-label={rangePresetsLabel(locale)}
      selectionMode="single"
      orientation={wide ? "vertical" : "horizontal"}
      selectedKeys={selected ? [selected] : []}
      onSelectionChange={(keys) => {
        const id = [...keys][0];
        const preset = presets.find((item) => item.id === id);
        if (!preset || !state) return;
        const range = preset.range(todayIn(timeZone ?? getLocalTimeZone()));
        onPick(preset.id, range);
        state.setValue(range as never);
        state.setOpen(false);
      }}
      data-slot="date-range-presets"
      className={cn(
        "flex gap-ds-050",
        // On phones a row that scrolls: width 0 with a full min-width, so the chips never widen the popover past the calendar.
        wide ? "w-40 shrink-0 flex-col border-e border-ds-border pe-ds-150" : "w-0 min-w-full overflow-x-auto pb-ds-050",
      )}
    >
      {presets.map((preset) => (
        <AriaToggleButton
          key={preset.id}
          id={preset.id}
          data-slot="date-range-preset"
          className={cn(
            "flex shrink-0 cursor-pointer items-center justify-between gap-ds-100 text-body-small text-ds-text outline-hidden",
            "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[selected]:bg-ds-background-selected data-[selected]:font-medium",
            "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused",
            wide ? "h-8 rounded-ds-small px-ds-100 text-start" : "h-8 whitespace-nowrap rounded-ds-full px-ds-150 inset-ring-1 inset-ring-ds-border data-[selected]:inset-ring-ds-border-selected",
          )}
        >
          {({ isSelected }) => (
            <>
              <span className="truncate">{preset.label}</span>
              {wide && isSelected && <IconGlyph name="check" size="small" />}
            </>
          )}
        </AriaToggleButton>
      ))}
    </AriaToggleButtonGroup>
  );
}

/** One half: its overline ("Start") over the typed date; the half being edited is underlined. */
const HALF =
  // `flex-auto`, not `flex-1`: each half starts from its own content, so a field sized to its content never cuts the
  // longer date ("3/18/2026" beside "3/2/2026"); on a narrow column both still shrink (min-w-0).
  "relative flex min-w-0 flex-auto flex-col justify-center py-ds-050 " +
  "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-ds-full after:bg-transparent " +
  "focus-within:after:bg-ds-border-selected";
const OVERLINE = "text-heading-xxsmall text-ds-text-subtle group-data-[disabled]/range:text-ds-text-disabled";

/**
 * Start and end in one control: two labelled halves over one calendar (two months from 720px). Type a
 * half or pick in the calendar; the footer counts the days (started 24-hour blocks) beside your `footer`.
 * Dates are the location's, never the browser's. `isDisabled`, `isRequired`, `id` and the error work as on
 * every field. With hours, a half too narrow for its date and time on one line (a phone column) puts the
 * time under the date, so the field fits a 320px screen in every locale.
 */
export function DateRangePicker({
  label, description, errorMessage, isOptional, granularity = "day", isDateUnavailable, unavailableReason, allowsNonContiguousRanges,
  startLabel, endLabel, firstDayOfWeek, timeZone, footer, validate, onBlur, onChange, value, defaultValue, requiredValidation, id,
  presets, presetId, defaultPresetId = null, onPresetChange, dayCount = "elapsed", ...rest
}: DateRangePickerProps) {
  const { locale } = useLocale();
  const wide = useWide();
  // The chosen preset: the app's, or our own. A pick sets it; any other change to the dates clears it.
  const [ownPreset, setOwnPreset] = React.useState<string | null>(defaultPresetId);
  const preset = presetId !== undefined ? presetId : ownPreset;
  const picking = React.useRef(false);
  const choosePreset = (next: string | null) => {
    if (next === preset) return;
    setOwnPreset(next);
    onPresetChange?.(next);
  };
  const changed = (next: Span<DateValue> | null) => {
    if (picking.current) picking.current = false;
    else if (preset !== null) choosePreset(null);
    onChange?.(next as DateRangePickerValue | null);
  };
  const { timing, reporter, emptyError, value: held, reported } = useDateValidation<Span<DateValue>>({
    validate, value: value as Span<DateValue> | null | undefined, defaultValue: defaultValue as Span<DateValue> | null | undefined,
    isRequired: rest.isRequired, requiredValidation, onBlur, onChange: changed,
  });
  const invalid = invalidProps(emptyError, rest.isInvalid, errorMessage);
  return (
    <AriaDateRangePicker
      {...rest}
      isInvalid={invalid.isInvalid}
      value={held as Span<DateValue> | null | undefined}
      defaultValue={defaultValue as Span<DateValue> | null | undefined}
      // "hour" means "with a time": the halves show hours and minutes (React Aria's "hour" would drop the minutes).
      granularity={granularity === "hour" ? "minute" : "day"}
      isDateUnavailable={isDateUnavailable as ((date: DateValue) => boolean) | undefined}
      allowsNonContiguousRanges={allowsNonContiguousRanges}
      firstDayOfWeek={firstDayOfWeek}
      shouldCloseOnSelect={granularity === "day"}
      validationBehavior={timing.validationBehavior}
      validate={timing.validate as (value: Span<DateValue> | null) => string | string[] | true | null | undefined}
      onBlur={timing.onBlur}
      onChange={timing.onChange as (value: Span<DateValue> | null) => void}
      data-slot="date-range-picker"
      className={cn("group/range", FIELD_STACK)}
    >
      {({ isInvalid, isDisabled }) => (
        <>
          <FieldLabel isRequired={rest.isRequired} isOptional={isOptional}>{label}</FieldLabel>
          <InputGroup isDisabled={isDisabled} isInvalid={isInvalid}>
            <div data-slot="date-range-start" data-field-part className={HALF}>
              <span aria-hidden data-slot="date-range-overline" className={OVERLINE}>{startLabel ?? rangeStartLabel(locale)}</span>
              <Segments slot="start" onReport={reporter("start")} id={id} formValue={formValue(reported?.start)} />
            </div>
            <span aria-hidden data-slot="date-range-separator" className="w-px self-stretch bg-ds-border my-ds-100" />
            <div data-slot="date-range-end" data-field-part className={HALF}>
              <span aria-hidden data-slot="date-range-overline" className={OVERLINE}>{endLabel ?? rangeEndLabel(locale)}</span>
              <Segments slot="end" onReport={reporter("end")} formValue={formValue(reported?.end)} />
            </div>
            <CalendarButton />
          </InputGroup>
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError>{invalid.errorMessage}</FieldError>
          <Popover data-slot="date-range-popover" placement="bottom start" offset={4} className={PICKER_POPOVER}>
            <Dialog data-slot="date-range-dialog" className={cn("flex gap-ds-150 outline-hidden", presets?.length && wide ? "flex-row" : "flex-col")}>
              {presets && presets.length > 0 && (
                <RangePresets
                  presets={presets}
                  selected={preset}
                  timeZone={timeZone}
                  wide={wide}
                  onPick={(id) => {
                    picking.current = true;
                    choosePreset(id);
                  }}
                />
              )}
              <div className="flex min-w-0 flex-col gap-ds-150">
              <CalendarInPopoverContext.Provider value>
                <RangeCalendar
                  visibleMonths={wide ? 2 : 1}
                  isDateUnavailable={isDateUnavailable}
                  unavailableReason={unavailableReason}
                  allowsNonContiguousRanges={allowsNonContiguousRanges}
                  firstDayOfWeek={firstDayOfWeek}
                  timeZone={timeZone}
                />
              </CalendarInPopoverContext.Provider>
              {granularity === "hour" && <RangeTimes timeZone={timeZone} />}
              <Duration footer={footer} dayCount={dayCount} />
              </div>
            </Dialog>
          </Popover>
        </>
      )}
    </AriaDateRangePicker>
  );
}
