"use client";

import * as React from "react";
import {
  DateField as AriaDateField,
  FormContext,
  GroupContext,
  I18nProvider,
  TimeField as AriaTimeField,
  useLocale,
  type DateValue,
  type GroupProps,
  type TimeValue,
} from "react-aria-components";
import { getLocalTimeZone, toTime, type CalendarDate } from "@internationalized/date";

import { IconGlyph } from "../display/icon";
import { FieldDescription, FieldError, FieldLabel } from "../form/field-parts";
import { InputGroup } from "../form/input-group";
import { FIELD_ICON, FIELD_STACK } from "../form/styles";
import { useFieldValidation, type RequiredValidation } from "../form/validation";
import { GREGORIAN_MONTHS, Segments, type FixedSegments, type SegmentsReport } from "./segments";
import { requiredLabel } from "../i18n";

type FieldCommon = {
  /** Always given; the label sits above the field and names its segments. */
  label: React.ReactNode;
  description?: React.ReactNode;
  /** What happened and what to do; shown when the field is invalid. */
  errorMessage?: React.ReactNode;
  isRequired?: boolean;
  /**
   * Who says an empty required field is missing: `field` (default) or `app`. With `app` a DS
   * Form's `onSubmit` runs with the field empty, and the app's own error must clear on change. See
   * {@link RequiredValidation} for the whole contract.
   */
  requiredValidation?: RequiredValidation;
  /** Shows "(optional)" when most of the form is required. */
  isOptional?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** Marks the field invalid from outside (a server error); `errorMessage` says why. */
  isInvalid?: boolean;
  /**
   * The id of the field's first typed segment (day, or the locale's first part), the element that takes focus
   *: `document.getElementById(id).focus()` puts the user in the field, as a focus-on-error does. The
   * field's group gets an id of its own. Left out, the DOM is as before.
   */
  id?: string;
  /** The form field name; the value is submitted as an ISO string. */
  name?: string;
  autoFocus?: boolean;
  onBlur?: (event: React.FocusEvent) => void;
};

export type DateFieldProps = FieldCommon & {
  /**
   * A calendar date, no time zone. With `hideYear` its year is 2000 (a leap year, so 29 February exists; see `hideYear`);
   * with `granularity="month"` it is the month's first day.
   *
   * While the user leaves a date typed in part or impossible ("31.aa.2026", "31.11.2026"), the field reports
   * `onChange(null)` and keeps the typed parts on screen, so setting `null` changes nothing: the value already is null.
   * To clear the field (an app's own "Temizle" or form reset), give it a new `key` along with the value: React remounts
   * it empty, or at the value given.
   */
  value?: CalendarDate | null;
  defaultValue?: CalendarDate | null;
  onChange?: (value: CalendarDate | null) => void;
  /** `day` types day, month and year; `month` types month and year (a card's expiry) and the day is 1. */
  granularity?: "day" | "month";
  /**
   * Day and month only: a yearly date (a campaign day, a birthday reminder). The value is that day in the Gregorian
   * year 2000, a leap year, so 29 February exists, whatever calendar the locale writes dates in:
   * - A calendar with the Gregorian months (the Buddhist one of th-TH, ROC, Japanese): the day and month are typed as
   *   the locale writes them, and the hidden year is 2000 as that calendar counts it (2543, Minguo 89, Heisei 12), its
   *   era hidden with it.
   * - A calendar with months of its own (Hebrew, Islamic, Persian, Indian, Ethiopic, Coptic, Chinese): one of its days
   *   falls on another Gregorian day every year, so no month–day of it is a yearly date the value can hold. The field
   *   types the Gregorian day and month instead, in the locale's language and digits.
   *
   * Give `value` and `defaultValue` in 2000 (`new CalendarDate(2000, month, day)`). The field never changes the year it
   * is given: a value in another year keeps it, an edit reports in it, and the day is judged in it, so 29 February typed
   * over a 2023 value says "February has 28 days." and reports null.
   */
  hideYear?: boolean;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  /** Your own check; return the message to show, or nothing when the date is fine. */
  validate?: (value: CalendarDate | null) => string | string[] | true | null | undefined;
};

/**
 * Hidden segments per mode: month–day keeps the year at Gregorian 2000 (29 February exists; held as the field's calendar
 * counts it), month keeps the day at 1.
 */
export function fixedSegments(granularity: "day" | "month", hideYear?: boolean): FixedSegments | undefined {
  if (granularity === "month") return { day: 1 };
  if (hideYear) return { year: 2000 };
  return undefined;
}

/**
 * The locale a month–day field (`hideYear`) types in: the app's, unless its calendar has months of its own
 * (fa-IR's Persian, an `-u-ca-islamic-umalqura` or `-u-ca-hebrew` tag); then the same locale in the Gregorian calendar, as a
 * month–day is a Gregorian one (see `hideYear`). Null when the app's locale is the one. The calendar is found as React
 * Aria finds it.
 */
export function monthDayLocale(locale: string): string | null {
  try {
    const calendar = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).resolvedOptions().calendar;
    if (GREGORIAN_MONTHS.has(calendar)) return null;
    return new Intl.Locale(locale, { calendar: "gregory" }).toString();
  } catch {
    return null;
  }
}

/**
 * Validation for a typed date or time: the form's timing (errors on blur and submit) plus the ones React Aria leaves
 * silent, a day past the month's end, which keeps the value empty but must still say why, and a value
 * typed in part.
 *
 * A date typed in part is no date, and a time typed in part no time. React Aria keeps its last complete value until
 * every segment is cleared, and a hidden year (`hideYear`) is never cleared, so "mm/1" or "aa/1/2026" would still hold
 * the old month, and "10:––" (a TimeField, a range with hours) the old minutes, and the form would save it. Here, as
 * soon as the visible parts are partly empty (or, with a hidden part, all empty) the field reports `onChange(null)`,
 * the value it holds; partly empty, it is also invalid, with what is missing ("Incomplete date: enter the
 * month, or clear the field.", "Incomplete time: enter the minutes…"), on the form's timing, so a DS Form blocks its submit and
 * `validationBehavior` "native" blocks the browser's. React Aria still holds the old date underneath, so the typed parts stay on screen
 * (a controlled `null` would wipe them) and, if the user types that same date again, `onChange` reports it again. A
 * date whose parts are all typed but name no day (31.11, edited from a saved 31.10) holds none either.
 *
 * The value reported always matches the parts on screen, once per change: the parts tell the field what they amount
 * to from a layout effect (see `Segments`' `onReport`), into a ref read by the field's own layout effect in the same
 * commit, so a value React Aria reports is never followed by a null judged on the parts of the render before.
 */
export function useDateValidation<T>(props: {
  validate?: (value: T | null) => string | string[] | true | null | undefined;
  value?: T | null;
  defaultValue?: T | null;
  isRequired?: boolean;
  requiredValidation?: RequiredValidation;
  onBlur?: (event: React.FocusEvent) => void;
  onChange?: (value: T | null) => void;
}) {
  const { locale } = useLocale();
  // One entry per typed part (the two halves of a range report separately): the latest in a ref, for the report below,
  // and the same in state, so the messages render with it.
  const reports = React.useRef<Record<string, SegmentsReport>>({});
  const [shown, setShown] = React.useState<Record<string, SegmentsReport>>({});
  const reporters = React.useRef(new Map<string, (report: SegmentsReport) => void>());
  const reporter = React.useCallback((part: string) => {
    let tell = reporters.current.get(part);
    if (!tell) {
      tell = (report: SegmentsReport) => {
        reports.current = { ...reports.current, [part]: report };
        setShown(reports.current);
      };
      reporters.current.set(part, tell);
    }
    return tell;
  }, []);
  // The value React Aria holds: every change it reports, and every non-null value the app passes.
  const committed = React.useRef<T | null>(props.value ?? props.defaultValue ?? null);
  if (props.value != null) committed.current = props.value;
  // True from the null reported here (a date typed in part) until React Aria or the app gives a value: meanwhile React
  // Aria is handed the date it holds, as a controlled null would wipe the typed parts.
  const holding = React.useRef(false);
  if (props.value != null) holding.current = false;
  const selfReport = React.useRef(false);
  // The value as it stands, controlled or not: an empty one is judged here (see below).
  const [own, setOwn] = React.useState<T | null>(props.defaultValue ?? null);
  const current = props.value !== undefined ? props.value : own;
  const { partial, allEmpty, halfMessage, message: partMessage } = summarize(shown);
  const form = React.useContext(FormContext) as { validationBehavior?: "aria" | "native" } | null;
  const native = form?.validationBehavior === "native";
  // Native validation reads React Aria's (old) value, so a required field emptied around its hidden part says so here.
  const nativeRequired = native && allEmpty && committed.current != null && props.isRequired && props.requiredValidation !== "app" ? requiredLabel(locale) : null;
  const overflow = partMessage ?? halfMessage ?? nativeRequired;
  const timing = useFieldValidation<T | null>({
    // A typed 31.11 leaves the value empty; the overflow message, not "required", is the one to show.
    validate: (value) => overflow ?? props.validate?.(value),
    value: props.value,
    initialValue: props.value ?? props.defaultValue ?? null,
    isRequired: props.isRequired && !overflow,
    requiredValidation: props.requiredValidation,
    onBlur: props.onBlur,
    onChange: (value) => {
      if (!selfReport.current) {
        committed.current = value;
        holding.current = false;
      }
      setOwn(value);
      props.onChange?.(value);
    },
  });
  // Report what the field holds: nothing while it is typed in part, emptied around a hidden part or names no day, and
  // React Aria's date again once the parts are complete and it did not report it itself (the same date typed again).
  // Through the form's own change handler, so blur and submit judge the value reported. Every commit, on the parts as
  // this commit leaves them (their layout effects ran first); the same report for the same value is made once, so an
  // app that keeps its own value does not hear it again on every render.
  const change = React.useRef(timing.onChange);
  change.current = timing.onChange;
  const last = React.useRef<{ from: T | null; to: T | null } | null>(null);
  React.useLayoutEffect(() => {
    const parts = summarize(reports.current);
    let next: { value: T | null } | null = null;
    if ((parts.partial || parts.allEmpty || parts.overflowing) && current != null) next = { value: null };
    else if (parts.complete && current == null && holding.current && committed.current != null) next = { value: committed.current };
    if (!next) {
      last.current = null;
      return;
    }
    if (last.current && last.current.from === current && last.current.to === next.value) return;
    last.current = { from: current, to: next.value };
    holding.current = next.value === null;
    selfReport.current = true;
    try {
      change.current?.(next.value);
    } finally {
      selfReport.current = false;
    }
  });
  // While the app's value is the null reported here, React Aria keeps the date it holds, so the typed parts stay.
  const held = props.value === null && holding.current && committed.current != null ? committed.current : props.value;
  // React Aria never validates an empty date value, so "required" and an impossible date (both empty)
  // would stay silent. The same timing decides them here; the field is then marked invalid with that message.
  // Under native validation React Aria judges the date it still holds itself, with the message, so it is left to it.
  const racValue = props.value !== undefined ? held : committed.current;
  const emptyError = current == null && !(native && racValue != null) ? (timing.validate?.(null) ?? null) : null;
  const message = Array.isArray(emptyError) ? emptyError.join(" ") : typeof emptyError === "string" ? emptyError : null;
  // `current` is the value the field reports (the app's, when it controls it): the form input follows it (see Segments'
  // `formValue`).
  return { timing, reporter, emptyError: message, value: held, reported: current };
}

/**
 * What the typed parts of a field amount to together. A range with one half empty and the other not is a
 * range typed in part too; a whole half left empty names all its parts (with a time, its hour and minutes too), a part
 * missing inside a half is named by that half.
 */
function summarize(reports: Record<string, SegmentsReport>) {
  const list = Object.values(reports);
  const shapes = list.map((entry) => entry.shape);
  const partial = shapes.includes("incomplete") || (shapes.includes("empty") && shapes.includes("complete"));
  const allEmpty = shapes.length > 0 && shapes.every((shape) => shape === "empty");
  const overflowing = list.some((entry) => entry.overflowing);
  const complete = shapes.length > 0 && shapes.every((shape) => shape === "complete") && !overflowing;
  const halfMessage = partial && !shapes.includes("incomplete") ? (list.find((entry) => entry.shape === "empty")?.whole ?? null) : null;
  const message = list.find((entry) => entry.message)?.message ?? null;
  return { partial, allEmpty, complete, overflowing, halfMessage, message };
}

/**
 * What a field's form input holds for the value it reports: React Aria's string for that value (an ISO
 * date, or date and time), "" for none. See Segments' `formValue`.
 */
export function formValue(value: { toString(): string } | null | undefined): string {
  return value == null ? "" : value.toString();
}

/** A TimeField's form input: the time alone, as React Aria writes it (a zoned date-time's time of day). */
function timeFormValue(value: TimeValue | null | undefined): string {
  return formValue(value && "day" in value ? toTime(value) : value);
}

/** Props that mark a field invalid with the empty-value message, keeping the caller's own `isInvalid`. */
function invalidProps(emptyError: string | null, isInvalid: boolean | undefined, errorMessage: React.ReactNode) {
  return { isInvalid: emptyError ? true : isInvalid, errorMessage: emptyError ?? errorMessage };
}
export { invalidProps };

/**
 * The frame of a DateField or TimeField. React Aria hands its field props (role=group, the field's id,
 * aria-labelledby, aria-describedby, the focus, press and arrow-key handlers) to every Group under the field, and both
 * the frame (InputGroup) and the segments' DateInput are Groups: the same id was on two role=group elements (invalid
 * HTML, and the field announced as a group twice). The DateInput stays the field's one named group with React Aria's
 * id, exactly as before; the frame keeps the handlers and the bidi isolation it had (so a press on its padding and the
 * keyboard behave as before) but is presentational, with no id and no name of its own.
 */
function FieldFrame({ isDisabled, isInvalid, children }: { isDisabled: boolean; isInvalid: boolean; children: React.ReactNode }) {
  const field = React.useContext(GroupContext);
  const frame = React.useMemo(() => {
    if (!field || "slots" in field) return field;
    const { id: _id, "aria-labelledby": _labelledBy, "aria-describedby": _describedBy, "aria-label": _label, "aria-details": _details, "aria-disabled": _disabled, ...handlers } =
      field as GroupProps & { "aria-disabled"?: boolean | "true" | "false" };
    return { ...handlers, role: "presentation" } as GroupProps;
  }, [field]);
  return (
    <GroupContext.Provider value={frame}>
      <InputGroup isDisabled={isDisabled} isInvalid={isInvalid}>
        <GroupContext.Provider value={field}>{children}</GroupContext.Provider>
      </InputGroup>
    </GroupContext.Provider>
  );
}

/**
 * Types a date in segments (day, month, year) in the locale's order, without a calendar: for dates far
 * from today (birth, licence). Typing moves to the next segment, Backspace clears and moves back, arrows
 * step a segment. An impossible date (31.11) stays as typed with an error; it is never moved to another day.
 */
export function DateField({
  label, description, errorMessage, isOptional, granularity = "day", hideYear, validate, onBlur, onChange, value, defaultValue, requiredValidation, id, ...rest
}: DateFieldProps) {
  const fixed = React.useMemo(() => fixedSegments(granularity, hideYear), [granularity, hideYear]);
  const { timing, reporter, emptyError, value: held, reported } = useDateValidation<CalendarDate>({ validate, value, defaultValue, isRequired: rest.isRequired, requiredValidation, onBlur, onChange });
  const invalid = invalidProps(emptyError, rest.isInvalid, errorMessage);
  const { locale } = useLocale();
  const typedIn = React.useMemo(() => (fixed?.year !== undefined ? monthDayLocale(locale) : null), [fixed, locale]);
  const field = (
    <AriaDateField<CalendarDate>
      {...rest}
      isInvalid={invalid.isInvalid}
      value={held}
      defaultValue={defaultValue}
      granularity="day"
      validationBehavior={timing.validationBehavior}
      validate={timing.validate as (value: DateValue | null) => string | string[] | true | null | undefined}
      onBlur={timing.onBlur}
      onChange={timing.onChange as (value: CalendarDate | null) => void}
      data-slot="date-field"
      data-granularity={granularity}
      data-hide-year={hideYear || undefined}
      className={FIELD_STACK}
    >
      {({ isInvalid, isDisabled }) => (
        <>
          <FieldLabel isRequired={rest.isRequired} isOptional={isOptional}>{label}</FieldLabel>
          <FieldFrame isDisabled={isDisabled} isInvalid={isInvalid}>
            <Segments fixed={fixed} onReport={reporter("date")} id={id} formValue={formValue(reported)} />
          </FieldFrame>
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError>{invalid.errorMessage}</FieldError>
        </>
      )}
    </AriaDateField>
  );
  // A month–day in a calendar with months of its own is typed in the Gregorian one (see `hideYear`).
  return typedIn ? <I18nProvider locale={typedIn}>{field}</I18nProvider> : field;
}

export type TimeFieldProps = FieldCommon & {
  /**
   * A time, or a zoned date-time when a location's zone travels with it.
   *
   * While the user leaves a time typed in part ("10:––"), the field reports `onChange(null)` and keeps the typed parts
   * on screen, so setting `null` changes nothing: the value already is null. To clear the field (an app's own "Temizle"
   * or form reset), give it a new `key` along with the value: React remounts it empty, or at the value given
   *.
   */
  value?: TimeValue | null;
  defaultValue?: TimeValue | null;
  onChange?: (value: TimeValue | null) => void;
  /** 24-hour in tr and me, 12-hour in en-US; from the locale unless set. */
  hourCycle?: 12 | 24;
  granularity?: "minute" | "hour";
  /** Arrow keys step the minutes by this much (15 or 30). */
  minuteStep?: number;
  /** The location's zone (IANA, "Europe/Lisbon"). Named after the time when it differs from the user's. */
  timeZone?: string;
  minValue?: TimeValue;
  maxValue?: TimeValue;
  validate?: (value: TimeValue | null) => string | string[] | true | null | undefined;
};

/** "Podgorica (GMT+2)": the city from the zone id and its offset now, in the locale. */
function zoneLabel(timeZone: string, locale: string) {
  const city = (timeZone.split("/").pop() ?? timeZone).replace(/_/g, " ");
  const offset = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value;
  return offset ? `${city} (${offset})` : city;
}

/** The zone label, decided after mount: the server does not know the user's zone. */
function useZoneLabel(timeZone: string | undefined) {
  const { locale } = useLocale();
  const [label, setLabel] = React.useState<string | null>(null);
  React.useEffect(() => {
    setLabel(timeZone && timeZone !== getLocalTimeZone() ? zoneLabel(timeZone, locale) : null);
  }, [timeZone, locale]);
  return label;
}

/**
 * Types a time in segments in the locale's clock (24-hour in most of Europe). Times are the location's: when the
 * user is in another zone, the zone is named at the end of the field ("Podgorica (GMT+2)"). A time typed in part
 * ("10:––") is no time, as on DateField: `onChange(null)` and, on blur or submit, what is missing.
 */
export function TimeField({
  label, description, errorMessage, isOptional, minuteStep, timeZone, validate, onBlur, onChange, value, defaultValue, requiredValidation, id, ...rest
}: TimeFieldProps) {
  const zone = useZoneLabel(timeZone);
  const { timing, reporter, emptyError, value: held, reported } = useDateValidation<TimeValue>({ validate, value, defaultValue, isRequired: rest.isRequired, requiredValidation, onBlur, onChange });
  const invalid = invalidProps(emptyError, rest.isInvalid, errorMessage);
  return (
    <AriaTimeField<TimeValue>
      {...rest}
      isInvalid={invalid.isInvalid}
      value={held}
      defaultValue={defaultValue}
      hideTimeZone
      validationBehavior={timing.validationBehavior}
      validate={timing.validate as (value: TimeValue | null) => string | string[] | true | null | undefined}
      onBlur={timing.onBlur}
      onChange={timing.onChange as (value: TimeValue | null) => void}
      data-slot="time-field"
      className={FIELD_STACK}
    >
      {({ isInvalid, isDisabled }) => (
        <>
          <FieldLabel isRequired={rest.isRequired} isOptional={isOptional}>{label}</FieldLabel>
          <FieldFrame isDisabled={isDisabled} isInvalid={isInvalid}>
            <IconGlyph name="clock" className={FIELD_ICON} data-slot="field-icon" />
            <Segments minuteStep={minuteStep} onReport={reporter("time")} id={id} formValue={timeFormValue(reported)} />
            {zone && (
              <span data-slot="time-field-zone" className="shrink-0 text-body-small text-ds-text-subtlest">{zone}</span>
            )}
          </FieldFrame>
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError>{invalid.errorMessage}</FieldError>
        </>
      )}
    </AriaTimeField>
  );
}

