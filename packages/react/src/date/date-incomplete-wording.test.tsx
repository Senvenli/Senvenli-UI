import * as React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { CalendarDate } from "@internationalized/date";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DS_STRINGS, dateIncompleteLabel, datePartsLabel, registerDsStrings, type DatePartName } from "../i18n";
import { DateField } from "./index";

/**
 * The incomplete-date message, word for word. The missing parts are the library's own words in the form the sentence
 * takes ("the month", not Intl.DisplayNames' "month"), joined with its own "and", in one sentence per kind of field
 * (date, date and time, time). Each expected sentence is written out here, so a change of wording is a reviewed change.
 * Another language comes from `registerDsStrings`; a locale without registered words reads English.
 */

afterEach(cleanup);

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

type Kind = "date" | "dateTime" | "time";
/** The cases the wording is checked on, in this order. */
const CASES: [DatePartName[], Kind][] = [
  [["month"], "date"],
  [["day", "month"], "date"],
  [["day", "month", "year"], "date"],
  [["minute"], "time"],
  [["hour", "minute"], "time"],
  [["day", "hour"], "dateTime"],
  [["minute", "dayPeriod"], "time"],
];

const ENGLISH = [
  "Incomplete date: enter the month, or clear the field.",
  "Incomplete date: enter the day and the month, or clear the field.",
  "Incomplete date: enter the day, the month, and the year, or clear the field.",
  "Incomplete time: enter the minutes, or clear the field.",
  "Incomplete time: enter the hour and the minutes, or clear the field.",
  "Incomplete date and time: enter the day and the hour, or clear the field.",
  "Incomplete time: enter the minutes and AM/PM, or clear the field.",
];

const SENTENCE_KEYS = ["dateIncomplete", "dateTimeIncomplete", "timeIncomplete"] as const;

/** The sentences an app registers for German; the parts stay the library's own (see the last describe). */
const GERMAN = {
  dateIncomplete: "Datum unvollständig: {parts} eingeben oder das Feld leeren.",
  dateTimeIncomplete: "Datum und Uhrzeit unvollständig: {parts} eingeben oder das Feld leeren.",
  timeIncomplete: "Uhrzeit unvollständig: {parts} eingeben oder das Feld leeren.",
};

function clear(el: HTMLElement) {
  act(() => el.focus());
  for (let i = 0; i < 5 && !el.hasAttribute("data-placeholder"); i++) {
    act(() => {
      el.dispatchEvent(new InputEvent("beforeinput", { inputType: "deleteContentBackward", bubbles: true, cancelable: true }));
    });
  }
}
/** A DateField with a saved date, its month cleared and the field left. */
function monthCleared(locale: string) {
  const { container } = render(
    <DesignSystemProvider locale={locale} navigate={vi.fn()}>
      <DateField label="Date" defaultValue={new CalendarDate(2026, 3, 24)} />
    </DesignSystemProvider>,
  );
  clear(container.querySelector<HTMLElement>("[data-slot='date-segment'][data-type='month']")!);
  act(() => (document.activeElement as HTMLElement | null)?.blur());
}

describe("the incomplete-date message, word for word", () => {
  it("en: each part in the sentence's form, listed with \"and\"", () => {
    expect(CASES.map(([parts, kind]) => dateIncompleteLabel("en", parts, kind))).toEqual(ENGLISH);
  });

  it("English has all three sentences, each with one {parts}", () => {
    for (const key of SENTENCE_KEYS) expect(DS_STRINGS[key].en?.split("{parts}"), key).toHaveLength(2);
  });

  it("the parts are named as the object of \"enter\", with the article", () => {
    expect(datePartsLabel("en", ["month"])).toBe("the month");
    expect(datePartsLabel("en", ["day", "month", "year"])).toBe("the day, the month, and the year");
    expect(datePartsLabel("en", ["hour"])).toBe("the hour");
    expect(datePartsLabel("en", ["month", "year"])).toBe("the month and the year");
  });

  it("an English locale reads the same however it is spelled (en-GB, en-US, en_AU)", () => {
    for (const locale of ["en-GB", "en-US", "en_AU"]) expect(datePartsLabel(locale, ["month"]), locale).toBe("the month");
  });

  it("a locale without registered words (he, fa, nl) reads the whole English sentence, English parts included", () => {
    for (const locale of ["he", "fa-IR", "nl-NL"]) {
      expect(dateIncompleteLabel(locale, ["day", "month"]), locale).toBe("Incomplete date: enter the day and the month, or clear the field.");
      expect(dateIncompleteLabel(locale, ["minute"], "time"), locale).toBe("Incomplete time: enter the minutes, or clear the field.");
    }
  });
});

describe("the message a DateField shows", () => {
  it("en: the month cleared names the month in the sentence's form", () => {
    monthCleared("en");
    expect(screen.getByText(ENGLISH[0]!)).toBeTruthy();
  });

  it("a locale without registered words (nl): the English sentence", () => {
    monthCleared("nl");
    expect(screen.getByText(ENGLISH[0]!)).toBeTruthy();
  });
});

// Last: a registration lasts for the whole file.
describe("sentences an app registers (registerDsStrings)", () => {
  beforeAll(() => registerDsStrings("de", GERMAN));

  it("de: one sentence per kind of field, each with one {parts}", () => {
    const strings = DS_STRINGS as unknown as Record<string, Record<string, string>>;
    for (const key of SENTENCE_KEYS) expect(strings[key]!.de?.split("{parts}"), key).toHaveLength(2);
    expect(CASES.map(([parts, kind]) => dateIncompleteLabel("de", parts, kind))).toEqual(
      CASES.map(([parts, kind]) => GERMAN[kind === "time" ? "timeIncomplete" : kind === "dateTime" ? "dateTimeIncomplete" : "dateIncomplete"].replace("{parts}", datePartsLabel("de", parts))),
    );
    expect(dateIncompleteLabel("de", ["month"])).toMatch(/^Datum unvollständig: .+ eingeben oder das Feld leeren\.$/);
    expect(dateIncompleteLabel("de", ["minute"], "time")).toMatch(/^Uhrzeit unvollständig: /);
    expect(dateIncompleteLabel("de", ["day", "hour"], "dateTime")).toMatch(/^Datum und Uhrzeit unvollständig: /);
  });

  it("de: read from a region tag too (de-AT), and English is unchanged", () => {
    expect(dateIncompleteLabel("de-AT", ["month"])).toBe(dateIncompleteLabel("de", ["month"]));
    expect(CASES.map(([parts, kind]) => dateIncompleteLabel("en", parts, kind))).toEqual(ENGLISH);
    expect(dateIncompleteLabel("nl-NL", ["month"])).toBe(ENGLISH[0]);
  });

  it("de: a DateField with its month cleared shows the registered sentence", () => {
    monthCleared("de");
    expect(screen.getByText(dateIncompleteLabel("de", ["month"]))).toBeTruthy();
    expect(screen.queryByText(ENGLISH[0]!)).toBeNull();
  });
});
