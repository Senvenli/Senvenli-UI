import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { CalendarDate, CalendarDateTime, Time } from "@internationalized/date";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { contentLang, hasDsStrings, hasIntlData, intlLocale, nextMonthLabel, previousMonthLabel, registerDsStrings, todayLabel } from "../i18n";
import { registerLocaleAliases } from "../intl-locale";
import { Calendar, DateField, DateRangeField, RangeCalendar, TimeField } from "./index";
import { breakAtLastSpace } from "./segments";

/**
 * Locales the app maps to another tag for formatting (`registerLocaleAliases`), locales without registered words
 * (English), and LTR locales on RTL pages. The library ships no stand-in table of its own: a tag goes to `Intl` as it
 * is unless the app registered an alias for it.
 */

afterEach(cleanup);

describe("intlLocale without aliases: the tag as it is", () => {
  it("keeps every tag, with or without region, script or extensions", () => {
    for (const locale of ["mk", "sq", "de", "en", "de-AT", "sr-Latn-ME", "en-DE-u-hc-h12", "ja-JP-u-ca-japanese"]) {
      expect(intlLocale(locale), locale).toBe(locale);
    }
  });

  it("keeps a tag the runtime has no data for (formatting then falls back as Intl does)", () => {
    expect(hasIntlData("zxx")).toBe(false);
    expect(intlLocale("zxx")).toBe("zxx");
  });

  it("tells data from root data and from the host's locale", () => {
    expect(hasIntlData("de")).toBe(true);
    expect(hasIntlData("sr-Latn-BA")).toBe(true);
    // A language no ICU has: Intl falls back to the host's locale.
    expect(hasIntlData("zxx")).toBe(false);
    expect(hasIntlData("not a tag")).toBe(false);
  });

  it("a locale without registered words reads the English strings", () => {
    for (const locale of ["mk", "sq-AL", "nl"]) {
      expect(hasDsStrings(locale), locale).toBe(false);
      expect(previousMonthLabel(locale), locale).toBe("Previous month");
      expect(nextMonthLabel(locale), locale).toBe("Next month");
      expect(todayLabel(locale), locale).toBe("Today");
    }
  });

  it("content is marked with the locale it was given (lang)", () => {
    for (const locale of ["sr-Latn-ME", "de", "en-DE-u-hc-h12"]) expect(contentLang(locale), locale).toBe(locale);
  });
});

describe("an LTR locale on an RTL page", () => {
  function onRtlPage(ui: React.ReactElement, locale: string) {
    return render(
      <div dir="rtl">
        <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
      </div>,
    );
  }
  const inputs = (root: ParentNode) => Array.from(root.querySelectorAll<HTMLElement>("[data-slot='date-input']"));

  it("lays a time field's and a range's segments out left to right, on the page's side of the box", () => {
    for (const locale of ["en", "el", "de"]) {
      const { container } = onRtlPage(
        <>
          <TimeField label="Time" defaultValue={new Time(10, 30)} />
          <DateRangeField label="Trip dates" granularity="hour" defaultValue={{ start: new CalendarDateTime(2026, 10, 14, 10), end: new CalendarDateTime(2026, 10, 18, 10) }} />
          <DateField label="Date" defaultValue={new CalendarDate(2026, 10, 14)} />
        </>,
        locale,
      );
      expect(inputs(container)).toHaveLength(4);
      for (const input of inputs(container)) {
        expect(input.getAttribute("dir"), locale).toBe("ltr");
        expect(input.className, locale).toContain("[:dir(rtl)>&]:text-end");
      }
      cleanup();
    }
  });

  it("leaves an RTL locale's segments to follow the page", () => {
    const { container } = onRtlPage(<TimeField label="الوقت" defaultValue={new Time(10, 30)} />, "ar");
    const [input] = inputs(container);
    expect(input!.hasAttribute("dir")).toBe(false);
    expect(input!.className).not.toContain("[:dir(rtl)>&]");
  });

  it("lays an LTR locale's calendars out left to right; an RTL locale's follow the page", () => {
    const { container } = onRtlPage(
      <>
        <Calendar aria-label="Start date" defaultValue={new CalendarDate(2026, 10, 9)} locale="en-US" />
        <RangeCalendar aria-label="Trip dates" visibleMonths={1} locale="de" />
        <Calendar aria-label="التاريخ" locale="ar" />
      </>,
      "ar",
    );
    const roots = Array.from(container.querySelectorAll<HTMLElement>("[data-slot='calendar'], [data-slot='range-calendar']"));
    expect(roots.map((root) => root.getAttribute("dir"))).toEqual(["ltr", "ltr", null]);
    // The chevrons still mirror under an RTL calendar, and turn back under an LTR one on the RTL page.
    for (const chevron of container.querySelectorAll("[data-slot='calendar-previous'] svg")) {
      expect(chevron.getAttribute("class")).toContain("rtl:-scale-x-100");
      expect(chevron.getAttribute("class")).toContain("[&:dir(ltr)]:scale-x-100");
    }
  });
});

describe("breakAtLastSpace: the date–time separator breaks only before the time", () => {
  it("keeps every space but the last from breaking", () => {
    expect(breakAtLastSpace(". u ")).toBe(".\u00a0u ");
    expect(breakAtLastSpace(" г., ")).toBe("\u00a0г., ");
    expect(breakAtLastSpace(" klo ")).toBe("\u00a0klo ");
    expect(breakAtLastSpace(" à ")).toBe("\u00a0à ");
  });

  it("leaves a separator with one space as it is", () => {
    for (const text of [", ", " ", "، ", "\u00a0 "]) expect(breakAtLastSpace(text)).toBe(text);
  });

  it("renders the separator that way in a range with hours (bg)", () => {
    const { container } = render(
      <DesignSystemProvider locale="bg" navigate={vi.fn()}>
        <DateRangeField label="Trip dates" granularity="hour" defaultValue={{ start: new CalendarDateTime(2026, 10, 14, 10), end: new CalendarDateTime(2026, 10, 18, 10) }} />
      </DesignSystemProvider>,
    );
    const breaks = Array.from(container.querySelectorAll<HTMLElement>("[data-slot='date-segment'].whitespace-pre-wrap"));
    expect(breaks).toHaveLength(2);
    for (const literal of breaks) {
      const spaces = literal.textContent!.match(/[^\S\u00a0\u2007\u202f]/g) ?? [];
      expect(spaces, JSON.stringify(literal.textContent)).toHaveLength(1);
      expect(literal.textContent!.endsWith(" ")).toBe(true);
    }
  });
});

// Last: aliases and registered strings last for the whole file. "zz" and "yy" are tags no runtime has data for.
describe("registerLocaleAliases: the tag the app hands Intl for one of its locales", () => {
  beforeAll(() => {
    registerLocaleAliases({ zz: "de-CH", "yy-ZZ": "en-DE-u-hc-h12" });
    registerDsStrings("de", { previousMonth: "Vorheriger Monat", nextMonth: "Folgemonat", today: "Heute" });
  });

  it("maps the exact tag, whatever its case, and a tag of the aliased language", () => {
    expect(intlLocale("zz")).toBe("de-CH");
    expect(intlLocale("ZZ")).toBe("de-CH");
    expect(intlLocale("zz-AB")).toBe("de-CH");
    expect(intlLocale("yy-ZZ")).toBe("en-DE-u-hc-h12");
    expect(intlLocale("yy-zz")).toBe("en-DE-u-hc-h12");
  });

  it("leaves every other locale alone, the alias's own language included", () => {
    // Only "yy-ZZ" was aliased, not "yy".
    for (const locale of ["yy", "yy-AB", "de", "en", "mk"]) expect(intlLocale(locale), locale).toBe(locale);
  });

  it("passes an alias target through: components hand it back (useLocale) and it stays the same", () => {
    for (const tag of ["de-CH", "en-DE-u-hc-h12"]) expect(intlLocale(tag), tag).toBe(tag);
  });

  it("an alias target with English words and other conventions: 12-hour clock, decimal comma, day first", () => {
    const tag = intlLocale("yy-ZZ");
    const when = new Date(Date.UTC(2026, 10, 30, 22, 30));
    expect(new Intl.DateTimeFormat(tag, { dateStyle: "short", timeZone: "UTC" }).format(when)).toBe("30/11/2026");
    expect(new Intl.DateTimeFormat(tag, { timeStyle: "short", timeZone: "UTC" }).format(when)).toMatch(/^10:30\spm$/i);
    expect(new Intl.DateTimeFormat(tag, { month: "long", timeZone: "UTC" }).format(when)).toBe("November");
    expect(new Intl.NumberFormat(tag).format(1234.5)).toBe("1.234,5");
  });

  it("reads the strings registered for the alias target's language", () => {
    expect(previousMonthLabel(intlLocale("zz"))).toBe("Vorheriger Monat");
    expect(nextMonthLabel(intlLocale("zz"))).toBe("Folgemonat");
    expect(todayLabel(intlLocale("zz"))).toBe("Heute");
    // The other alias's target is English.
    expect(todayLabel(intlLocale("yy-ZZ"))).toBe("Today");
  });

  it("a calendar under the aliased locale formats in the target and speaks its registered words", () => {
    for (const ui of [
      <Calendar key="own" aria-label="Date" locale="zz" defaultValue={new CalendarDate(2026, 11, 9)} />,
      <DesignSystemProvider key="provider" locale="zz" navigate={vi.fn()}>
        <Calendar aria-label="Date" defaultValue={new CalendarDate(2026, 11, 9)} />
      </DesignSystemProvider>,
    ]) {
      const { container } = render(ui);
      expect(container.querySelector("[data-slot='calendar-title']")?.textContent).toBe("November 2026");
      expect(container.querySelector("[data-slot='calendar-previous']")?.getAttribute("aria-label")).toBe("Vorheriger Monat");
      cleanup();
    }
  });

  it("a time field under an alias with a 12-hour clock has the AM/PM segment", () => {
    const { container } = render(
      <DesignSystemProvider locale="yy-ZZ" navigate={vi.fn()}>
        <TimeField label="Time" defaultValue={new Time(22, 30)} />
      </DesignSystemProvider>,
    );
    const types = Array.from(container.querySelectorAll("[data-slot='date-segment']"), (segment) => segment.getAttribute("data-type"));
    expect(types).toContain("dayPeriod");
    expect(container.querySelector("[data-slot='date-segment'][data-type='hour']")?.textContent).toBe("10");
  });
});
