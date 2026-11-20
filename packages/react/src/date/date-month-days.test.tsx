import * as React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { CalendarDate, IslamicUmalquraCalendar, toCalendar } from "@internationalized/date";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DS_STRINGS, monthHasDaysLabel, registerDsStrings } from "../i18n";
import { DateField } from "./index";

/**
 * The impossible-date message ("November has 30 days.") in the library's own words. The month name is never taken
 * from Intl: a runtime without data for the locale gives the host's name or "M11", and a locale without registered
 * words would mix its own month name and digits into the English sentence ("نوفمبر has ٣٠ days.").
 */

afterEach(cleanup);

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

/** November (30 days), February (28) and a leap February (29). */
const ENGLISH = ["November has 30 days.", "February has 28 days.", "February has 29 days."];

describe("monthHasDaysLabel", () => {
  it("en: the library's month name in the form the sentence takes", () => {
    expect([monthHasDaysLabel("en", 30, 11), monthHasDaysLabel("en", 28, 2), monthHasDaysLabel("en", 29, 2)]).toEqual(ENGLISH);
  });

  it("the other short months, by name", () => {
    expect([4, 6, 9].map((month) => monthHasDaysLabel("en", 30, month))).toEqual(["April has 30 days.", "June has 30 days.", "September has 30 days."]);
  });

  it("reads English from its tags: region tags as their language", () => {
    for (const locale of ["en-GB", "en-US", "en_AU", "EN-ie"]) expect(monthHasDaysLabel(locale, 30, 11), locale).toBe("November has 30 days.");
  });

  it("a locale without registered words reads the whole sentence in English, with Western Arabic digits", () => {
    for (const locale of ["he", "he-IL", "nl", "fa-IR", "fa-AF", "ar-EG"]) {
      expect(monthHasDaysLabel(locale, 30, 11), locale).toBe("November has 30 days.");
      expect(monthHasDaysLabel(locale, 29), locale).toBe("This month has 29 days.");
    }
  });

  it("a month the library cannot name (another calendar) is \"this month\"", () => {
    expect(monthHasDaysLabel("en", 29)).toBe("This month has 29 days.");
    expect(DS_STRINGS.thisMonthHasDays.en).toContain("{n}");
    expect(DS_STRINGS.monthHasDays.en).toContain("{n}");
    expect(DS_STRINGS.monthHasDays.en).toContain("{month}");
  });
});

function inLocale(ui: React.ReactElement, locale: string) {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}
function segment(root: ParentNode, kind: string) {
  return root.querySelector<HTMLElement>(`[data-slot='date-segment'][data-type='${kind}']`)!;
}
function type(el: HTMLElement, text: string) {
  act(() => el.focus());
  for (const data of text) {
    act(() => {
      (document.activeElement ?? el).dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data, bubbles: true, cancelable: true }));
    });
  }
}
function clear(el: HTMLElement) {
  act(() => el.focus());
  for (let i = 0; i < 5 && !el.hasAttribute("data-placeholder"); i++) {
    act(() => {
      el.dispatchEvent(new InputEvent("beforeinput", { inputType: "deleteContentBackward", bubbles: true, cancelable: true }));
    });
  }
}
function blur() {
  act(() => (document.activeElement as HTMLElement | null)?.blur());
}
/** A saved 31.10.2026 with month 11 typed over it, the field left: the message on screen. */
function november31(locale: string) {
  const onChange = vi.fn();
  const { container } = inLocale(<DateField label="Date" defaultValue={new CalendarDate(2026, 10, 31)} onChange={onChange} />, locale);
  clear(segment(container, "month"));
  type(segment(container, "month"), "11");
  blur();
  expect(onChange).toHaveBeenLastCalledWith(null);
  return container.querySelector("[data-slot='field-error']")?.textContent ?? null;
}

describe("DateField says it in the field's locale", () => {
  // en and two of its regions; then locales without registered words, which read English whatever their own digits,
  // order and direction (ar-EG, ar and ja-JP format the date their own way).
  it.each(["en", "en-GB", "en-US", "de-DE", "ar-EG", "ar", "ja-JP", "nl"] as const)("%s: a saved 31.10.2026 with month 11 typed", (locale) => {
    expect(november31(locale)).toBe("November has 30 days.");
  });

  it("th (Buddhist calendar): 29.02.2567 is a date (2024 is a leap year), 30.02 is not", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DateField label="Date" defaultValue={new CalendarDate(2024, 2, 10)} onChange={onChange} />, "th-TH");
    clear(segment(container, "day"));
    type(segment(container, "day"), "29");
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2024, 2, 29));
    expect(screen.queryByText(/days\./)).toBeNull();
    clear(segment(container, "day"));
    type(segment(container, "day"), "30");
    blur();
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText("February has 29 days.")).toBeTruthy();
  });

  it("ar-SA-u-ca-islamic-umalqura (Umm al-Qura calendar): days counted in the field's own month, which the library does not name", () => {
    // A 29-day Umm al-Qura month near 2026, on its 10th.
    const calendar = new IslamicUmalquraCalendar();
    let islamic = toCalendar(new CalendarDate(2026, 1, 1), calendar).set({ day: 10 });
    while (calendar.getDaysInMonth(islamic) !== 29) islamic = islamic.add({ months: 1 });
    const onChange = vi.fn();
    const { container } = inLocale(<DateField label="Date" defaultValue={toCalendar(islamic, new CalendarDate(2026, 1, 1).calendar)} onChange={onChange} />, "ar-SA-u-ca-islamic-umalqura");
    clear(segment(container, "day"));
    type(segment(container, "day"), "30");
    blur();
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText("This month has 29 days.")).toBeTruthy();
  });
});

// Last: a registration lasts for the whole file.
describe("sentences an app registers (registerDsStrings)", () => {
  beforeAll(() => {
    registerDsStrings("de", { monthHasDays: "Der {month} hat {n} Tage.", thisMonthHasDays: "Dieser Monat hat {n} Tage." });
    registerDsStrings("ro", { thisMonthHasDays: "Luna aceasta are {n} de zile." });
    // An app that translated something else, and neither of these sentences.
    registerDsStrings("fr", { close: "Fermer" });
  });

  it("de: \"this month\" in the registered sentence, from the language or a region tag; English is unchanged", () => {
    expect(monthHasDaysLabel("de", 29)).toBe("Dieser Monat hat 29 Tage.");
    expect(monthHasDaysLabel("de-AT", 29)).toBe("Dieser Monat hat 29 Tage.");
    expect(monthHasDaysLabel("en", 29)).toBe("This month has 29 days.");
    expect(monthHasDaysLabel("nl", 30, 11)).toBe("November has 30 days.");
  });

  it("de: a named month reads one whole sentence, never English words in the registered one", () => {
    for (const label of [monthHasDaysLabel("de", 30, 11), monthHasDaysLabel("de", 28, 2)]) {
      expect(label).toMatch(/^(Dieser Monat|Der .+) hat \d+ Tage\.$/);
      expect(label).not.toMatch(/\{|has|days/);
    }
  });

  it("de: a DateField with 31.11 typed says it in the registered words", () => {
    expect(november31("de-DE")).toMatch(/^(Dieser Monat|Der .+) hat 30 Tage\.$/);
  });

  it("ro: \"de\" from 20 on only (a 5-day Ethiopic month is \"5 zile\")", () => {
    expect(monthHasDaysLabel("ro", 5)).toBe("Luna aceasta are 5 zile.");
    expect(monthHasDaysLabel("ro", 29)).toBe("Luna aceasta are 29 de zile.");
  });

  it("a registered locale without these sentences (fr) falls back to the English ones", () => {
    expect(monthHasDaysLabel("fr", 30, 11)).toBe("November has 30 days.");
    expect(monthHasDaysLabel("fr", 29)).toBe("This month has 29 days.");
    expect(november31("fr-FR")).toBe("November has 30 days.");
  });
});
