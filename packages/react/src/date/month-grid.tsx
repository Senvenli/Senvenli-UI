"use client";

import * as React from "react";
import { Button as AriaButton, ButtonContext, DatePickerStateContext, useLocale } from "react-aria-components";
import { CalendarDate, getLocalTimeZone, today as todayIn } from "@internationalized/date";

import { cn } from "../utils";
import { IconGlyph } from "../display/icon";
import { formatDateTime, nextYearLabel, previousYearLabel } from "../i18n";

/**
 * A month as one number (year × 12 + month index), so stepping by a month, a row or a year is arithmetic and a
 * step past December lands in the next year's January.
 */
type MonthIndex = number;
const toIndex = (date: { year: number; month: number }): MonthIndex => date.year * 12 + date.month - 1;
const toDate = (index: MonthIndex) => new CalendarDate(Math.floor(index / 12), (index % 12) + 1, 1);

/** Three months a row, four rows: the quarters. */
const COLUMNS = 3;

const NAV =
  "grid size-ds-control-compact cursor-pointer place-items-center rounded-ds-control-medium text-ds-icon outline-hidden " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  "data-[disabled]:cursor-default data-[disabled]:opacity-40";

/** A month tile: the Calendar's day cell, as wide as a third of the 252px grid. */
const MONTH =
  "grid h-ds-control w-full cursor-pointer place-items-center rounded-ds-control-medium px-ds-050 text-body text-ds-text outline-hidden select-none " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  "data-[disabled]:cursor-default data-[disabled]:text-ds-text-disabled";
const MONTH_SELECTED =
  "bg-ds-background-brand-bold font-medium text-ds-text-on-brand data-[hovered]:bg-ds-background-brand-bold-hovered";

/** Inclusive month range from the picker's bounds (only their year and month count). */
export function monthRange(minValue?: CalendarDate, maxValue?: CalendarDate) {
  const min = minValue ? toIndex(minValue) : -Infinity;
  const max = maxValue ? toIndex(maxValue) : Infinity;
  return { min, max, contains: (index: MonthIndex) => index >= min && index <= max };
}

export type MonthGridProps = {
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  /** "This month" in the location's zone; the device's by default. */
  timeZone?: string;
  /** Close the picker once a month is picked (default). */
  shouldCloseOnSelect?: boolean;
};

/**
 * DatePicker `granularity="month"`: the popover's year stepper over a grid of the twelve months,
 * in place of the day calendar. Internal to the DS (not exported). A `role="grid"` like the Calendar's: each
 * month a button named "Ocak 2026" that shows "Oca", the chosen one `aria-selected` on its cell, this month
 * underlined, months outside the bounds disabled. Arrows move a month (left and right follow the reading
 * direction) or a row of three, across years; Home and End go to the row's ends, Page Up and Page Down a year.
 * Focus starts on the chosen month, else this month.
 */
export function MonthGrid({ minValue, maxValue, timeZone, shouldCloseOnSelect = true }: MonthGridProps) {
  const state = React.useContext(DatePickerStateContext);
  const { locale, direction } = useLocale();
  const range = monthRange(minValue, maxValue);
  const value = state?.value as CalendarDate | null | undefined;
  const chosen = value ? toIndex(value) : null;
  const clamp = (index: MonthIndex) => Math.min(Math.max(index, range.min), range.max);
  // The popover only renders in the browser, so "today" is safe to read here for the first focus.
  const [focused, setFocused] = React.useState<MonthIndex>(() => clamp(chosen ?? toIndex(todayIn(timeZone ?? getLocalTimeZone()))));
  // This month, underlined: known after mount (the server's clock and zone would disagree).
  const [current, setCurrent] = React.useState<MonthIndex | null>(null);
  React.useEffect(() => setCurrent(toIndex(todayIn(timeZone ?? getLocalTimeZone()))), [timeZone]);

  const buttons = React.useRef(new Map<MonthIndex, HTMLButtonElement>());
  // Keyboard moves (and opening) take focus to the month; the year buttons keep it where it is (see stepYear).
  const moveFocus = React.useRef(true);
  React.useLayoutEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    buttons.current.get(focused)?.focus();
  }, [focused]);

  const year = Math.floor(focused / 12);
  const yearText = new Intl.DateTimeFormat(locale, { year: "numeric", timeZone: "UTC" }).format(Date.UTC(year, 0, 1));
  const short = (when: Date | number) => formatDateTime(locale, { month: "short", timeZone: "UTC" }, when);
  const long = (when: Date | number) => formatDateTime(locale, { month: "long", year: "numeric", timeZone: "UTC" }, when);

  const go = (index: MonthIndex, focus = true) => {
    moveFocus.current = focus;
    setFocused(clamp(index));
  };
  const previousDisabled = (at: MonthIndex) => Math.floor(at / 12) * 12 - 1 < range.min;
  const nextDisabled = (at: MonthIndex) => (Math.floor(at / 12) + 1) * 12 > range.max;
  // A year button keeps focus, unless the step takes it to a bound and disables it: then focus goes to the
  // focused month, as the day Calendar does, so it never falls to the page (where Esc no longer closes).
  const stepYear = (by: number, disables: (at: MonthIndex) => boolean) => {
    const target = clamp(focused + by);
    go(target, disables(target));
  };
  const pick = (index: MonthIndex) => {
    state?.setValue(toDate(index));
    if (shouldCloseOnSelect) state?.close();
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    const forward = direction === "rtl" ? -1 : 1;
    const column = ((focused % 12) + 12) % COLUMNS;
    const steps: Record<string, number> = {
      ArrowRight: forward,
      ArrowLeft: -forward,
      ArrowDown: COLUMNS,
      ArrowUp: -COLUMNS,
      Home: -column,
      End: COLUMNS - 1 - column,
      PageDown: 12,
      PageUp: -12,
    };
    const step = steps[event.key];
    if (step === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    go(focused + step);
  };

  const rows = Array.from({ length: 12 / COLUMNS }, (_, row) => Array.from({ length: COLUMNS }, (_, column) => year * 12 + row * COLUMNS + column));
  return (
    // The picker's own button context (its calendar button) must not reach these buttons.
    <ButtonContext.Provider value={null}>
      {/* An LTR locale's months read left to right on an RTL page too, as its arrow keys move. */}
      <div data-slot="month-grid" dir={direction === "ltr" ? "ltr" : undefined} className="flex w-63 max-w-full flex-col gap-ds-100">
        <div data-slot="month-grid-header" className="flex items-center justify-between gap-ds-100">
          <AriaButton
            aria-label={previousYearLabel(locale)}
            data-slot="month-grid-previous"
            isDisabled={previousDisabled(focused)}
            onPress={() => stepYear(-12, previousDisabled)}
            className={NAV}
          >
            <IconGlyph name="chevron-left" />
          </AriaButton>
          <span data-slot="month-grid-year" aria-live="polite" className="text-heading-xsmall tabular-nums">
            {yearText}
          </span>
          <AriaButton
            aria-label={nextYearLabel(locale)}
            data-slot="month-grid-next"
            isDisabled={nextDisabled(focused)}
            onPress={() => stepYear(12, nextDisabled)}
            className={NAV}
          >
            <IconGlyph name="chevron-right" />
          </AriaButton>
        </div>
        <div role="grid" aria-label={yearText} data-slot="month-grid-months" className="flex flex-col gap-ds-050" onKeyDown={onKeyDown}>
          {rows.map((months, row) => (
            <div key={row} role="row" className="grid grid-cols-3 gap-ds-050">
              {months.map((index) => {
                const when = Date.UTC(Math.floor(index / 12), index % 12, 1);
                const selected = index === chosen;
                return (
                  <div key={index} role="gridcell" aria-selected={selected} data-slot="month-grid-cell" className="flex">
                    <AriaButton
                      ref={(element) => {
                        if (element) buttons.current.set(index, element);
                        else buttons.current.delete(index);
                      }}
                      aria-label={long(when)}
                      aria-current={index === current ? "date" : undefined}
                      data-slot="month-grid-month"
                      data-selected={selected || undefined}
                      excludeFromTabOrder={index !== focused}
                      isDisabled={!range.contains(index)}
                      onFocus={() => {
                        if (index !== focused) go(index, false);
                      }}
                      onPress={() => pick(index)}
                      className={cn(MONTH, selected && MONTH_SELECTED, index === current && "underline underline-offset-3")}
                    >
                      {short(when)}
                    </AriaButton>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </ButtonContext.Provider>
  );
}
