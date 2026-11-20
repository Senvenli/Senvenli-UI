"use client";

import * as React from "react";
import {
  DateFieldStateContext,
  DateInput,
  DateSegment,
  FormContext,
  FormValidationContext,
  InputContext,
  TimeFieldStateContext,
  useLocale,
} from "react-aria-components";
import { CalendarDate, GregorianCalendar, toCalendar, type Calendar } from "@internationalized/date";

import { cn } from "../utils";
import { FormSubmittedContext } from "../form/validation";
import { dateIncompleteLabel, monthHasDaysLabel, type DatePartName } from "../i18n";

/**
 * One segment: the active one fills with the brand colour; an empty one shows its placeholder ("GG",
 * "AA", "YYYY") in the subtlest text, upper-cased because Intl gives "gg.aa.yyyy".
 */
const SEGMENT =
  "rounded-ds-small px-px tabular-nums outline-hidden caret-transparent select-none " +
  "data-[placeholder]:uppercase data-[placeholder]:text-ds-text-subtlest " +
  "data-[focused]:bg-ds-background-brand-bold data-[focused]:text-ds-text-on-brand data-[focused]:data-[placeholder]:text-ds-text-on-brand " +
  "data-[disabled]:text-ds-text-disabled";
// whitespace-pre: a literal that is only a space ("10:30 AM") would otherwise collapse inside the flex row.
const LITERAL = "whitespace-pre px-0 text-ds-text-subtle data-[disabled]:text-ds-text-disabled";
/**
 * The separator between a date and its time ("14.10.2026 10:00", "10/14/2026, 10:00 AM"; see {@link isDateTimeBreak})
 *. The segments never wrap (the field's `whitespace-nowrap`), except after this one's space: pre-wrap
 * keeps the space and makes it the one place the line may break, so a field too narrow for both (a range with hours
 * in a phone column) puts the time under the date instead of cutting it off, and its min-content is the wider of the
 * two, not both. A field wide enough for both is laid out exactly as before.
 */
const LITERAL_BREAK = "whitespace-pre-wrap px-0 text-ds-text-subtle data-[disabled]:text-ds-text-disabled";

// Typed from React Aria's own context, so no direct dependency on react-stately is needed.
type DateFieldState = NonNullable<React.ContextType<typeof DateFieldStateContext>>;
type SegmentState = DateFieldState["segments"][number];
type DateSegmentType = SegmentState["type"];

/**
 * A segment the field keeps out of sight with a fixed value: the year of a month–day, the day of a month. The year is a
 * Gregorian one (2000): the field holds it as the same year in its own calendar, era and all (see {@link heldYear}).
 */
export type FixedSegments = Partial<Record<"year" | "day", number>>;

/**
 * The segments kept out of sight for `fixed`: its own, and with a hidden year its era too (a Japanese "H", a ROC
 * "Minguo"), which names a year that is not shown.
 */
export function hiddenSegments(fixed?: FixedSegments): Set<string> {
  const hidden = new Set(Object.keys(fixed ?? {}));
  if (hidden.has("year")) hidden.add("era");
  return hidden;
}

/**
 * The Gregorian year `gregorianYear` as the field's calendar counts it: Gregorian 2000 is 2543 in the
 * Buddhist calendar, Heisei 12 in the Japanese and Minguo 89 in the ROC one, each a leap year with the same months, so
 * 29 February exists. Set as 2000 in those calendars it was 1457 CE, Reiwa 2000 (4018 CE) and 3911 CE, none of them
 * leap, and a valid 29.02 was refused.
 */
export function heldYear(calendar: Calendar, gregorianYear: number): { era: string; year: number } {
  const date = toCalendar(new CalendarDate(gregorianYear, 1, 1), calendar);
  return { era: date.era, year: date.year };
}

type AnyFieldState = {
  segments: SegmentState[];
  setSegment: ((type: "era", value: string) => void) & ((type: DateSegmentType, value: number) => void);
  confirmPlaceholder: () => void;
  value: unknown;
  isDisabled?: boolean;
  /** The calendar the segments are typed in (a date field's; React Aria takes it from the locale). */
  calendar?: Calendar;
  /** What the field shows of its validation, and the form reset's way to clear it (React Aria's form validation state). */
  displayValidation?: { isInvalid: boolean; validationErrors: string[] };
  resetValidation?: () => void;
};

function useFieldState(): AnyFieldState | null {
  const date = React.useContext(DateFieldStateContext) as AnyFieldState | null;
  const time = React.useContext(TimeFieldStateContext) as AnyFieldState | null;
  return date ?? time;
}

/**
 * Which of React Aria's segments show when some are hidden. A hidden segment takes one separator with it:
 * the one before it when no shown part follows it (the year of a month–day: "dd. mm. yyyy." → "dd. mm."; with its
 * era after it, "mm/dd/yyyy Minguo" → "mm/dd"), otherwise the one after it (the day of a month: "dd.mm.yyyy г." →
 * "mm.yyyy г."). Leading and closing literals ("." in me, " г." in bg) stay, so every locale keeps its own full-date
 * style.
 */
export function visibleIndexes(segments: readonly SegmentState[], hidden: ReadonlySet<string>): Set<number> {
  const visible = new Set(segments.map((_, index) => index));
  const parts = segments.map((segment, index) => ({ segment, index })).filter(({ segment }) => segment.type !== "literal");
  const lastShown = parts.filter(({ segment }) => !hidden.has(segment.type)).at(-1)?.index ?? -1;
  for (const { segment, index } of parts) {
    if (!hidden.has(segment.type)) continue;
    visible.delete(index);
    const step = index > lastShown ? -1 : 1;
    for (let i = index + step; i >= 0 && i < segments.length && segments[i]!.type === "literal"; i += step) {
      visible.delete(i);
    }
    // A hidden year also takes its own word with it (" г." in bg and mk); a closing "." of the date stays.
    if (segment.type === "year") {
      for (let i = index + 1; i < segments.length && segments[i]!.type === "literal"; i++) {
        if (/\p{L}/u.test(segments[i]!.text)) visible.delete(i);
      }
    }
  }
  return visible;
}

/**
 * Keeps a hidden segment filled. React Aria commits a value only when every segment is set, so the
 * year of a month–day must be set for it: the user never sees or types it. The month stays empty
 * until the user types one, so a day picked first never turns into January.
 */
function Fixed({ segment, value }: { segment: SegmentState; value: number }) {
  const state = useFieldState();
  React.useLayoutEffect(() => {
    if (state && segment.isPlaceholder && !state.isDisabled) state.setSegment(segment.type, value);
  });
  return null;
}

/**
 * Keeps the hidden year of a month–day at the Gregorian year given, as the field's calendar counts it (see
 * {@link heldYear}). In a calendar with eras the era is set first, in its own commit: React Aria would otherwise give the
 * year the era of today (Reiwa), and two segments set in one handler would both start from the same old value.
 */
function FixedYear({ segment, gregorianYear }: { segment: SegmentState; gregorianYear: number }) {
  const state = useFieldState();
  React.useLayoutEffect(() => {
    if (!state || !segment.isPlaceholder || state.isDisabled) return;
    const calendar = state.calendar ?? new GregorianCalendar();
    const held = heldYear(calendar, gregorianYear);
    const eras = calendar.getEras();
    const eraSegment = state.segments.find((s) => s.type === "era");
    if (eras.length > 1 && eraSegment && (eraSegment.isPlaceholder || eras[eraSegment.value!] !== held.era)) {
      state.setSegment("era", held.era);
      return;
    }
    state.setSegment("year", held.year);
  });
  return null;
}

/** Arrow keys step the minutes by `step` (15 or 30); typed minutes are left as typed. */
function SteppedMinute({ segment, step, children }: { segment: SegmentState; step: number; children: React.ReactNode }) {
  const state = useFieldState();
  return (
    <span
      className="contents"
      onKeyDownCapture={(event) => {
        if (!state || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
        const current = segment.isPlaceholder ? null : (segment.value ?? 0);
        const up = event.key === "ArrowUp";
        const next =
          current === null ? 0 : up ? (Math.floor(current / step) + 1) * step : (Math.ceil(current / step) - 1) * step;
        event.preventDefault();
        event.stopPropagation();
        state.setSegment("minute", ((next % 60) + 60) % 60);
      }}
    >
      {children}
    </span>
  );
}

export type SegmentsProps = {
  /** Kept out of sight with a fixed value (month–day: `{ year: 2000 }`; month: `{ day: 1 }`). */
  fixed?: FixedSegments;
  minuteStep?: number;
  slot?: "start" | "end";
  className?: string;
  /**
   * Told, in the commit that changes it, what the typed parts amount to: what is wrong with them (a day
   * past the month's end, or a value typed in part, "Incomplete date: enter the month, or clear the field."), whether they are
   * all empty, partly filled or all filled, and the message naming every part (said when a whole half of a range is
   * left empty while the other half stands). Told from a layout effect, so it reaches the field before the field's
   * own effects in that commit read it: the value the field reports always matches the parts on screen.
   */
  onReport?: (report: SegmentsReport) => void;
  /**
   * The field's `id`, put on its first segment that takes typing, so `getElementById(id).focus()`
   * lands in the field. Left out, the segments are as before.
   */
  id?: string;
  /**
   * What the field's form input holds: the value the field reports, as an ISO string, or "" while it
   * reports none (a date typed in part, impossible, or emptied around a hidden part). See {@link FormValue}.
   */
  formValue?: string;
};

/** The typed segments of a date or time field, in the locale's order and with its separators. */
export function Segments({ fixed, minuteStep, slot, className, onReport, id, formValue }: SegmentsProps) {
  const hidden = React.useMemo(() => hiddenSegments(fixed), [fixed]);
  const { direction } = useLocale();
  // An LTR locale's segments are laid out left to right on an RTL page too: React Aria isolates only the
  // hour to minute, so the AM/PM beside them ("10:30 AM", "10:30 π.μ.") went to the other side ("AM 10:30"). The
  // segments keep the page's side of the box (the right, under an RTL parent), where they were. An RTL locale's
  // follow the page, as before.
  const ltr = direction === "ltr";

  return (
    // Inline flow, not flex: React Aria wraps times in bidi isolates (U+2066…U+2069) so "10:30" reads left to
    // right on an RTL page too; flex items would ignore them and lay the segments out as "30:10".
    <DateInput
      slot={slot}
      data-slot="date-input"
      dir={ltr ? "ltr" : undefined}
      className={cn("min-w-0 flex-1 overflow-hidden whitespace-nowrap text-body", ltr && "[:dir(rtl)>&]:text-end", className)}
    >
      {(segment) => <Segment segment={segment} fixed={fixed} hidden={hidden} minuteStep={minuteStep} onReport={onReport} id={id} formValue={formValue} slot={slot} />}
    </DateInput>
  );
}

/**
 * The first segment the user types in, in DOM order (the locale's): not a separator, not a hidden one (the year of a
 * month–day, the day of a month). The field's `id` goes on it, so focusing that id reaches the field.
 */
export function firstTypedIndex(segments: readonly SegmentState[], hidden: ReadonlySet<string>): number {
  return segments.findIndex((segment) => segment.isEditable && segment.type !== "literal" && !hidden.has(segment.type));
}

const DATE_SIDE = new Set<string>(["era", "year", "month", "day"]);
const TIME_SIDE = new Set<string>(["hour", "minute", "second", "dayPeriod", "timeZoneName"]);

/** A space the line may break at: any white space but the no-break ones (U+00A0, U+2007, U+202F). */
const BREAKING_SPACE = /[^\S\u00a0\u2007\u202f]/;

/**
 * Whether the segment at `index` is the separator between the date and the time of a date-time: a
 * literal with a space to break at (", ", " ", "، "; not the bidi isolate React Aria puts before a time as a literal of
 * its own), a date part on one side and a time part on the other, in the locale's order (time first works too). Only
 * there may the segments wrap (see `LITERAL_BREAK`); a date alone, a time alone, and the AM/PM beside its hour never do.
 */
export function isDateTimeBreak(segments: readonly Pick<SegmentState, "type" | "text">[], index: number): boolean {
  const segment = segments[index];
  if (segment?.type !== "literal" || !BREAKING_SPACE.test(segment.text)) return false;
  const side = (step: 1 | -1) => {
    for (let at = index + step; at >= 0 && at < segments.length; at += step) {
      const type = segments[at]!.type;
      if (type === "literal") continue;
      return DATE_SIDE.has(type) ? "date" : TIME_SIDE.has(type) ? "time" : null;
    }
    return null;
  };
  const before = side(-1);
  const after = side(1);
  return before !== null && after !== null && before !== after;
}

/**
 * The date–time separator with only its last space left to break at: the
 * earlier ones become no-break spaces, so a time that goes under its date starts the line with its hour, not with the
 * rest of the separator (". u " in bs, " г., " in bg and mk, " klo " in fi left "u 10:00" or "г., 10:00" below).
 */
export function breakAtLastSpace(text: string): string {
  const breaking = new RegExp(BREAKING_SPACE.source, "g");
  const last = Math.max(...Array.from(text.matchAll(breaking), (match) => match.index));
  return text.replace(breaking, (space, at: number) => (at === last ? space : "\u00a0"));
}

/** The ARIA attributes that hold id references; React Aria names a segment with its own id in `aria-labelledby`. */
const ID_REFERENCES = [
  "aria-labelledby",
  "aria-describedby",
  "aria-controls",
  "aria-owns",
  "aria-details",
  "aria-errormessage",
  "aria-flowto",
  "aria-activedescendant",
] as const;

/**
 * A segment's props with the app's `id` in place of React Aria's own, and every reference to the old id swapped
 * too: the segment is named by `aria-labelledby="<its own id> <field label id>"` ("day, Start date"), and a
 * reference to an id no element has would drop the segment's name.
 *
 * React Aria's `useLabels` puts that self-reference first whenever a segment has both `aria-label` (its own name)
 * and `aria-labelledby`. Until its ids settle (on the server, and in the first client render) the self-reference is
 * a second id of React Aria's that is not the element's, so the first token is swapped as well: the server HTML
 * then names the segment fully, and hydration sees the same attribute.
 */
export function withId<P extends { id?: string; "aria-label"?: string; "aria-labelledby"?: string }>(props: P, id: string): P {
  const own = props.id;
  const next: Record<string, unknown> = { ...props, id };
  for (const key of ID_REFERENCES) {
    const value = next[key];
    if (typeof value !== "string" || !value.trim()) continue;
    const refs = value.trim().split(/\s+/).map((ref) => (own && ref === own ? id : ref));
    if (key === "aria-labelledby" && props["aria-label"]) refs[0] = id;
    next[key] = [...new Set(refs)].join(" ");
  }
  return next as P;
}

function Segment({ segment, fixed, hidden, minuteStep, onReport, id, formValue, slot }: {
  segment: SegmentState; fixed?: FixedSegments; hidden: ReadonlySet<string>; minuteStep?: number; onReport?: (report: SegmentsReport) => void; id?: string; formValue?: string;
  slot?: "start" | "end";
}) {
  const state = useFieldState();
  const index = state ? state.segments.indexOf(segment) : -1;
  // Only with an `id`, so a field without one renders exactly as before.
  const targetId = id !== undefined && state && index >= 0 && index === firstTypedIndex(state.segments, hidden) ? id : undefined;
  // The watcher needs the field's state, which only exists inside DateInput: it rides along with the first segment.
  const watcher = index === 0 ? (
    <>
      <OverflowWatcher fixed={fixed} onReport={onReport} />
      {formValue !== undefined && <FormValue value={formValue} />}
      {/* A range's two halves share one validation state: its start half clears it. */}
      {slot !== "end" && <ResetWatcher />}
    </>
  ) : null;
  if (hidden.has(segment.type)) {
    // The era of a hidden year is set with the year (FixedYear).
    const keep =
      segment.type === "year" ? <FixedYear segment={segment} gregorianYear={fixed!.year!} />
      : segment.type === "day" ? <Fixed segment={segment} value={fixed!.day!} />
      : null;
    return <>{watcher}{keep}</>;
  }
  if (hidden.size && state && index >= 0 && !visibleIndexes(state.segments, hidden).has(index)) return watcher;
  const dateTimeBreak = segment.type === "literal" && state !== null && isDateTimeBreak(state.segments, index);
  const element = (
    <DateSegment
      // The id is set on the element itself: React Aria's prop merge would swap it for its own on the server.
      {...(targetId !== undefined ? { render: (props: React.ComponentProps<"span">) => <span {...withId(props, targetId)} /> } : null)}
      segment={segment}
      data-slot="date-segment"
      className={segment.type !== "literal" ? SEGMENT : dateTimeBreak ? LITERAL_BREAK : LITERAL}
    >
      {dateTimeBreak ? breakAtLastSpace(segment.text) : undefined}
    </DateSegment>
  );
  const shown = segment.type === "minute" && minuteStep && minuteStep > 1 ? (
    <SteppedMinute segment={segment} step={minuteStep}>{element}</SteppedMinute>
  ) : (
    element
  );
  return watcher ? <>{watcher}{shown}</> : shown;
}

/**
 * Keeps the field's form input (React Aria's hidden `<input name>`, which a native form submit and `FormData` read) at
 * the value the field reports. React Aria writes the date it holds into that input, and while a date is
 * typed in part, impossible or emptied around a hidden part the field holds its last complete date underneath (so the
 * typed parts stay on screen) and reports null: a hideYear 10.02 edited to 30.02 held 2000-02-03, a date the user never
 * saw, and a native submit sent it. The input now says "" whenever the field reports null, and the reported date
 * otherwise, which is React Aria's own string for it, so a complete date's DOM is unchanged.
 *
 * React Aria re-renders that input whenever its field state changes, and this component (among the segments, under the
 * same state) with it, so the value is set again in the same commit, after React has written its own; on the first
 * commit the input's ref is attached after these layout effects run, so the passive effect sets it then. The input's
 * name, its native validity (the field's message under validationBehavior "native") and the server errors a Form keys
 * by name stay React Aria's.
 */
function FormValue({ value }: { value: string }) {
  // The field's input props, with the ref React Aria puts on its hidden input (a date field's, or the one a picker's
  // field makes for itself).
  const input = React.useContext(InputContext) as { ref?: React.Ref<HTMLInputElement> } | null;
  const sync = () => {
    const ref = input?.ref;
    const element = ref && typeof ref === "object" ? ref.current : null;
    if (element && element.value !== value) element.value = value;
  };
  React.useLayoutEffect(sync);
  React.useEffect(sync);
  return null;
}

/**
 * A DS Form's reset clears what the field shows under `validationBehavior="native"`, as it does under `aria`. There React Aria shows a field's message from the last submit or
 * commit, and clears it on a form reset only when the reset comes from a user event (a reset button, a press that
 * calls `form.reset()`): a programmatic `form.reset()` outside one (after an `await`, in a timer) is passed over, so
 * that React's automatic reset after a form action keeps the server's errors. The value went back to the default,
 * but "Incomplete date: enter the month, or clear the field." (or "February has 29 days.", or the browser's required message)
 * stayed on screen, the field still drawn invalid, until the next interaction.
 *
 * The DS Form tells every field of each reset (`resetCount`, for any reset), so here the field clears what it shows,
 * as React Aria does for a user's reset: its next submit or commit shows it again if it still applies. A message
 * that is a server error the form holds (`validationErrors`) is left to React Aria, as React Aria leaves it. Outside a
 * DS Form, and under `aria` (where the DS shows the messages itself, on its own timing), nothing here runs.
 */
function ResetWatcher() {
  const state = useFieldState();
  const { resetCount } = React.useContext(FormSubmittedContext);
  const form = React.useContext(FormContext) as { validationBehavior?: "aria" | "native" } | null;
  const serverErrors = React.useContext(FormValidationContext);
  const seen = React.useRef(resetCount);
  React.useLayoutEffect(() => {
    if (seen.current === resetCount) return;
    seen.current = resetCount;
    const shown = state?.displayValidation;
    if (form?.validationBehavior !== "native" || !shown?.isInvalid || !state?.resetValidation) return;
    const server = new Set(Object.values(serverErrors ?? {}).flat());
    if (shown.validationErrors.some((message) => server.has(message))) return;
    state.resetValidation();
  });
  return null;
}

/** Calendars whose months are the Gregorian ones, so the DS's month names fit them (and a month–day is typed in them). */
export const GREGORIAN_MONTHS: ReadonlySet<string> = new Set(["gregory", "buddhist", "roc", "japanese"]);

/**
 * A day past the month's end (31.11) stays on screen as typed and the value stays empty, so the field can
 * say why ("November has 30 days."). React Aria would clamp it to 30.11 when focus leaves the field
 * (`confirmPlaceholder`) and report that date as if the user had typed it; for an impossible date that
 * step is skipped. So it is for a part typed out of its range: a month left at "00" would become
 * January, a day "00" the 1st and a 12-hour "0" one o'clock; it stays as typed, with what is missing. Every other use
 * of it (filling an untouched AM/PM) still runs.
 */
export function OverflowWatcher({ fixed, onReport }: { fixed?: FixedSegments; onReport?: (report: SegmentsReport) => void }) {
  const state = useFieldState();
  const { locale } = useLocale();
  const calendar = state?.calendar ?? new GregorianCalendar();
  // A hidden year not set yet (the commit before FixedYear sets it) counts as the one it is about to be.
  const held = fixed?.year !== undefined ? heldYear(calendar, fixed.year) : undefined;
  // Each part as the field holds it: a hidden one too, so a hidden year is the year on the field (2543 in
  // the Buddhist calendar, or an app's own), never the Gregorian number counted in another calendar.
  const read = (type: DateSegmentType) => {
    const segment = state?.segments.find((s) => s.type === type);
    if (segment && isFilled(segment)) return segment.value!;
    if (type === "year") return held?.year;
    if (type === "day") return fixed?.day;
    return undefined;
  };
  const day = read("day");
  const month = read("month");
  const year = read("year");
  let message: string | null = null;
  // Judged on what is on screen, not on the committed value: editing a saved 31.10 to month 11 shows 31.11
  // while the state still holds 31.10, and that must not be clamped to 30.11 on blur either.
  if (day !== undefined && month !== undefined && year !== undefined) {
    // Counted in the field's own calendar (its segments are typed in it), with the era it holds, if any.
    const eraSegment = state?.segments.find((s) => s.type === "era");
    const era = eraSegment && isFilled(eraSegment) ? calendar.getEras()[eraSegment.value!] : held?.era;
    const first = era !== undefined ? new CalendarDate(calendar, era, year, month, 1) : new CalendarDate(calendar, year, month, 1);
    const days = calendar.getDaysInMonth(first);
    if (day > days) {
      // Named with the DS's own words, never Intl's: see monthHasDaysLabel. Only a Gregorian month has one
      // (the Buddhist, ROC and Japanese calendars count the same months); in any other calendar it is "this month".
      message = monthHasDaysLabel(locale, days, GREGORIAN_MONTHS.has(calendar.identifier) ? month : undefined);
    }
  }
  const overflowing = message !== null;
  // A date or time typed in part: React Aria keeps the last complete value until every segment is cleared
  // (and a hidden year never is), so "mm/1" would still hold the old month and "10:––" the old minutes. Judged on the
  // visible parts only.
  const shape = dateShape(state?.segments ?? [], fixed);
  if (message === null && shape.shape === "incomplete") message = incompleteMessage(shape.missing, locale, shape.kind);
  const whole = incompleteMessage(shape.parts, locale, shape.kind);
  const outOfRange = (state?.segments ?? []).some((segment) => segment.isEditable && !segment.isPlaceholder && segment.type !== "literal" && !isFilled(segment));
  const asTyped = overflowing || outOfRange;
  React.useLayoutEffect(() => {
    if (!state || !asTyped) return;
    const confirm = state.confirmPlaceholder;
    state.confirmPlaceholder = () => {};
    return () => {
      state.confirmPlaceholder = confirm;
    };
  });
  // Told in this commit's layout phase, before the field's own effects run, and only when it changes: the field then
  // judges the value it reports on these parts, never on the ones of the render before.
  const report = React.useRef(onReport);
  report.current = onReport;
  React.useLayoutEffect(() => {
    report.current?.({ message, overflowing, shape: shape.shape, whole });
  }, [message, overflowing, shape.shape, whole]);
  return null;
}

/** What a field's typed parts amount to, told to the field. */
export type SegmentsReport = {
  /** A day past the month's end, or what a value typed in part is missing; null when nothing is wrong. */
  message: string | null;
  /** The parts are all filled but name no date (31.11): React Aria keeps its old value, so the field holds none. */
  overflowing: boolean;
  shape: DateShape;
  /** The message naming every visible part. */
  whole: string;
};

/**
 * Whether a part holds a value React Aria can use. A first digit can leave a part out of its range while
 * the user is still typing it: a first "0" shows "00" in a month or a day, "0" in a year and "0" in the hour of a
 * 12-hour clock (which runs 1–12), none of them a value and none with its placeholder (React Aria keeps the old date
 * until they are one). Such a part is as good as missing.
 */
export function isFilled(segment: SegmentState) {
  if (segment.isPlaceholder || segment.value == null) return false;
  if (segment.minValue !== undefined && segment.value < segment.minValue) return false;
  if (segment.maxValue !== undefined && segment.value > segment.maxValue) return false;
  return true;
}

/** Whether a date's or time's visible parts are all empty, partly filled or all filled. */
export type DateShape = "empty" | "incomplete" | "complete";

/** What a field types: a date, a date and a time (a range with hours), or a time (TimeField). */
export type FieldKind = "date" | "dateTime" | "time";

const DATE_PARTS = new Set<string>(["day", "month", "year"]);
const TIME_PARTS = new Set<string>(["hour", "minute", "second"]);

/**
 * The shape of a field's visible parts: day, month and year, less the hidden ones (a month–day's year, a
 * month's day), and hour, minute and second. `parts` is every visible part and `missing` the empty ones, both in the
 * field's (the locale's) order, as the message names them.
 *
 * A part typed out of its range ("00" for a month) is missing too (see {@link isFilled}).
 *
 * The AM/PM of a 12-hour clock goes with its hour: React Aria fills it when the hour is typed, so it counts as missing
 * only when the hour is typed and it is not ("10:30 ––"), and an AM/PM left over in a field emptied of everything else
 * is an empty field (React Aria would keep the old time until it is cleared too).
 */
export function dateShape(
  segments: readonly SegmentState[],
  fixed?: FixedSegments,
): { shape: DateShape; missing: DatePartName[]; parts: DatePartName[]; kind: FieldKind } {
  const visible = segments.filter(
    (segment) => segment.isEditable && fixed?.[segment.type as "year" | "day"] === undefined && (DATE_PARTS.has(segment.type) || TIME_PARTS.has(segment.type) || segment.type === "dayPeriod"),
  );
  const core = visible.filter((segment) => segment.type !== "dayPeriod");
  const hasDate = core.some((segment) => DATE_PARTS.has(segment.type));
  const hasTime = core.some((segment) => TIME_PARTS.has(segment.type));
  const kind: FieldKind = hasDate && hasTime ? "dateTime" : hasTime ? "time" : "date";
  const parts = core.map((segment) => segment.type as DatePartName);
  const hourTyped = core.some((segment) => segment.type === "hour" && !segment.isPlaceholder);
  const missing = visible
    .filter((segment) => !isFilled(segment) && (segment.type !== "dayPeriod" || hourTyped))
    .map((segment) => segment.type as DatePartName);
  if (core.length === 0 || missing.length === 0) return { shape: "complete", missing: [], parts, kind };
  const emptyCore = core.every((segment) => segment.isPlaceholder);
  return { shape: emptyCore ? "empty" : "incomplete", missing, parts, kind };
}

/**
 * "Incomplete date: enter the day and month, or clear the field.": the missing parts in the field's order, each in the form the
 * sentence takes (DS strings, not Intl's nominative names), in the locale's sentence for a date, a date and time or a
 * time. A locale without DS words reads the English sentence with the English names.
 */
export function incompleteMessage(missing: readonly DatePartName[], locale: string, kind: FieldKind = "date") {
  return dateIncompleteLabel(locale, missing, kind);
}
