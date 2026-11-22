"use client";

import type { Tone } from "../tone";
import * as React from "react";
import { useLocale } from "react-aria-components";

import { formatDateTime } from "../intl-locale";
import { cn } from "../utils";
import { IconGlyph, type IconName } from "./icon";

export type TimelineTone = Extract<Tone, "neutral" | "brand" | "success" | "danger">;

const NODE: Record<TimelineTone, string> = {
  neutral: "bg-ds-background-neutral text-ds-icon-subtle",
  brand: "bg-ds-background-brand-bold text-ds-text-on-brand",
  success: "bg-ds-background-success text-ds-icon-success",
  danger: "bg-ds-background-danger text-ds-icon-danger",
};

export type TimelineItem = {
  id: string;
  icon: IconName;
  /** neutral for edits, brand for the record's milestones (created, delivered), success / danger for outcomes. */
  tone?: TimelineTone;
  title: React.ReactNode;
  /** Who and where from ("Ada L. · from the mobile app"); shown after the time. */
  meta?: React.ReactNode;
  timestamp: Date;
  children?: React.ReactNode;
};

export type TimelineProps = {
  items: TimelineItem[];
  /** `newest` first (default) or `oldest` first. */
  order?: "newest" | "oldest";
  /**
   * The time zone the events belong to ("Europe/Berlin"). Required: times show in it, and server and
   * browser then format the same text. An unknown zone falls back to UTC with a warning.
   */
  timeZone: string;
  /**
   * "Now" for relative times. Without it, times render absolute on the server and on the first
   * client render, then read relative ("3 min. ago") after mount and stay current while any event
   * is under an hour old.
   */
  now?: Date;
  /** Heading level of the day titles when the list groups by day (more than ten items). */
  dayHeadingLevel?: 2 | 3 | 4 | 5 | 6;
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const isValid = (date: Date) => !Number.isNaN(date.getTime());

function validZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return timeZone;
  } catch {
    console.warn(`Timeline: unknown time zone "${timeZone}", showing UTC.`);
    return "UTC";
  }
}

/** The current time after mount, ticking each minute while something is under an hour old. */
function useNow(given: Date | undefined, items: TimelineItem[]) {
  const [now, setNow] = React.useState<Date | undefined>(given);
  React.useEffect(() => {
    if (given) {
      setNow(given);
      return;
    }
    // Recent means within the last hour; a timestamp in the future is not, so it never keeps the tick alive.
    const recent = () =>
      items.some((item) => {
        const age = Date.now() - item.timestamp.getTime();
        return isValid(item.timestamp) && age > -MINUTE && age < HOUR;
      });
    let timer: number | undefined;
    const tick = () => {
      setNow(new Date());
      // Nothing left under an hour old: every time is absolute now, so stop ticking.
      if (!recent() && timer !== undefined) window.clearInterval(timer);
    };
    tick();
    if (!recent()) return;
    timer = window.setInterval(tick, MINUTE);
    return () => window.clearInterval(timer);
  }, [given, items]);
  return given ?? now;
}

const dayKey = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(date);

/**
 * Events in time order with who did what, as an ordered list. Times within
 * the last hour read relative ("3 min. ago") with the exact time on the
 * <time> element; past ten items the list groups by day.
 */
export function Timeline({ items, order = "newest", timeZone: zone, now: givenNow, dayHeadingLevel = 3 }: TimelineProps) {
  const { locale } = useLocale();
  const timeZone = React.useMemo(() => validZone(zone), [zone]);
  const now = useNow(givenNow, items);
  const absolute = (date: Date) => formatDateTime(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone }, date);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  const dayTitle = (date: Date) => formatDateTime(locale, { dateStyle: "long", timeZone }, date);

  // Stable both ways: equal times keep input order oldest-first and reverse it newest-first.
  const sorted = items
    .map((item, index) => ({ item, index, time: isValid(item.timestamp) ? item.timestamp.getTime() : Number.NEGATIVE_INFINITY }))
    .sort((a, b) => (order === "newest" ? b.time - a.time || b.index - a.index : a.time - b.time || a.index - b.index))
    .map(({ item }) => item);

  const when = (date: Date) => {
    if (!isValid(date)) return <span data-slot="timeline-time">—</span>;
    const exact = absolute(date);
    const age = now ? now.getTime() - date.getTime() : Number.NaN;
    // Up to a minute ahead is clock skew, not the future.
    let text = exact;
    if (age > -MINUTE && age < MINUTE) text = relative.format(0, "second");
    else if (age >= MINUTE && age < HOUR) text = relative.format(-Math.floor(age / MINUTE), "minute");
    return (
      // Server and browser ICU may differ in punctuation or month abbreviations; the text settles on the client.
      <time data-slot="timeline-time" dateTime={date.toISOString()} title={text === exact ? undefined : exact} suppressHydrationWarning>
        {text}
      </time>
    );
  };

  const renderList = (list: TimelineItem[]) => (
    <ol data-slot="timeline" className="m-0 flex list-none flex-col p-0">
      {list.map((item, index) => (
        <li key={item.id} data-slot="timeline-item" className="grid grid-cols-[24px_1fr] gap-ds-150">
          <div aria-hidden data-slot="timeline-marker" className="flex flex-col items-center">
            <span data-slot="timeline-node" data-tone={item.tone ?? "neutral"} className={cn("grid size-6 shrink-0 place-items-center rounded-ds-full", NODE[item.tone ?? "neutral"])}>
              <IconGlyph name={item.icon} size="small" />
            </span>
            {index < list.length - 1 && <span data-slot="timeline-rail" className="my-ds-050 min-h-3 w-px flex-1 bg-ds-border" />}
          </div>
          <div data-slot="timeline-body" className={cn("flex min-w-0 flex-col gap-ds-025", index < list.length - 1 && "pb-ds-200")}>
            <span data-slot="timeline-title" className="text-body-strong text-ds-text">{item.title}</span>
            <span data-slot="timeline-meta" className="text-body-small text-ds-text-subtlest tabular-nums">
              {when(item.timestamp)}
              {/* Actor and source are isolated, so mixed-direction text keeps its order. */}
              {item.meta != null && <> · <bdi>{item.meta}</bdi></>}
            </span>
            {item.children != null && <div data-slot="timeline-content" className="mt-ds-050 text-body">{item.children}</div>}
          </div>
        </li>
      ))}
    </ol>
  );

  if (sorted.length <= 10) return renderList(sorted);

  const groups: { key: string; items: TimelineItem[] }[] = [];
  for (const item of sorted) {
    const key = isValid(item.timestamp) ? dayKey(item.timestamp, timeZone) : "unknown";
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  const DayHeading = `h${dayHeadingLevel}` as const;
  return (
    <div data-slot="timeline-groups" className="flex flex-col gap-ds-200">
      {groups.map((group) => (
        <section key={group.key} data-slot="timeline-day" className="flex flex-col gap-ds-150">
          {/* The formatting tag, not contentLang: this title comes from Intl, in the formatting locale's language. */}
          <DayHeading lang={locale} data-slot="timeline-day-title" className="m-0 text-body-small font-medium text-ds-text-subtle">
            {group.key === "unknown" ? "—" : dayTitle(group.items[0].timestamp)}
          </DayHeading>
          {renderList(group.items)}
        </section>
      ))}
    </div>
  );
}
