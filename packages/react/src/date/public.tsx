"use client";

import * as React from "react";

import { Calendar as SingleCalendar, RangeCalendar, type CalendarProps as SingleCalendarProps, type RangeCalendarProps } from "./calendar";
import { DatePicker as SingleDatePicker, DateRangePicker, type DatePickerProps as SingleDatePickerProps, type DateRangePickerProps } from "./pickers";

export type CalendarSingleProps = SingleCalendarProps & {
  /** `single` (default): one day. */
  selectionMode?: "single";
};
export type CalendarRangeProps = RangeCalendarProps & {
  /** `range`: a start and an end, picked with two presses. */
  selectionMode: "range";
};
export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

/** A month grid to pick a day, or with `selectionMode="range"` a start and an end (as Mantine, Chakra, shadcn). */
export function Calendar(props: CalendarProps) {
  if (props.selectionMode === "range") {
    const { selectionMode: _mode, ...rest } = props;
    return <RangeCalendar {...rest} />;
  }
  const { selectionMode: _mode, ...rest } = props;
  return <SingleCalendar {...rest} />;
}

export type DatePickerSingleProps = SingleDatePickerProps & {
  /** `single` (default): one date (and time with `granularity="hour"`). */
  selectionMode?: "single";
};
export type DatePickerRangeProps = DateRangePickerProps & {
  /** `range`: a start and an end in one control, over one calendar (two months on wide screens). */
  selectionMode: "range";
};
export type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps;

/** A typed date with a calendar popover; `selectionMode="range"` for a period (start and end in one control). */
export function DatePicker(props: DatePickerProps) {
  if (props.selectionMode === "range") {
    const { selectionMode: _mode, ...rest } = props;
    return <DateRangePicker {...rest} />;
  }
  const { selectionMode: _mode, ...rest } = props;
  return <SingleDatePicker {...rest} />;
}
