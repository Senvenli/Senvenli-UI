import * as React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { BuddhistCalendar, CalendarDate, GregorianCalendar, JapaneseCalendar, TaiwanCalendar } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { monthDayLocale } from "./fields";
import { heldYear } from "./segments";
import { DateField } from "./index";

/**
 * A month–day (`hideYear`) in a locale whose calendar is not the Gregorian one. The hidden year was
 * set to the number 2000 in the field's own calendar: Buddhist 2000 is 1457 CE, Reiwa 2000 is 4018 CE and Minguo 2000 is
 * 3911 CE, none of them leap, so a valid 29.02 said "February has 28 days." and reported nothing. The hidden year is now
 * Gregorian 2000 as the field's calendar counts it; a calendar with months of its own types the Gregorian months.
 */

afterEach(cleanup);

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

function inLocale(locale: string, ui: React.ReactElement) {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}
function segment(root: ParentNode, kind: string) {
  return root.querySelector<HTMLElement>(`[data-slot='date-segment'][data-type='${kind}']`)!;
}
/** The segments on screen: their types and their text (bidi marks dropped). */
function types(root: ParentNode) {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-slot='date-segment']")).map((s) => s.dataset.type);
}
function shown(root: ParentNode) {
  return Array.from(root.querySelectorAll("[data-slot='date-segment']")).map((s) => (s.textContent ?? "").replace(/[⁦-⁩‎‏]/g, "")).join("");
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
const errorText = (root: ParentNode) => root.querySelector("[data-slot='field-error']")?.textContent ?? "";
const reported = (onChange: ReturnType<typeof vi.fn>) => onChange.mock.calls.map(([value]) => (value ? `${value.toString()} ${value.calendar.identifier}` : null));

/** Types day 29 and month 2, each in its own segment (the locale decides which comes first). */
function type2902(root: ParentNode) {
  type(segment(root, "day"), "29");
  type(segment(root, "month"), "02");
}

describe("heldYear: Gregorian 2000 as each calendar counts it", () => {
  it("is a leap year with the Gregorian months in every one of them", () => {
    expect(heldYear(new GregorianCalendar(), 2000)).toEqual({ era: "AD", year: 2000 });
    expect(heldYear(new BuddhistCalendar(), 2000)).toEqual({ era: "BE", year: 2543 });
    expect(heldYear(new JapaneseCalendar(), 2000)).toEqual({ era: "heisei", year: 12 });
    expect(heldYear(new TaiwanCalendar(), 2000)).toEqual({ era: "minguo", year: 89 });
    for (const calendar of [new BuddhistCalendar(), new JapaneseCalendar(), new TaiwanCalendar()]) {
      const { era, year } = heldYear(calendar, 2000);
      expect(calendar.getDaysInMonth(new CalendarDate(calendar, era, year, 2, 1)), calendar.identifier).toBe(29);
    }
  });
});

describe("monthDayLocale: the locale a month–day is typed in", () => {
  it("the app's own when its calendar has the Gregorian months", () => {
    for (const locale of ["de-DE", "en-US", "sr-Latn-ME", "th-TH", "ja-JP-u-ca-japanese", "zh-TW-u-ca-roc", "ar-EG"]) {
      expect(monthDayLocale(locale), locale).toBeNull();
    }
  });

  it("the same locale in the Gregorian calendar when its months are its own", () => {
    expect(monthDayLocale("fa-IR")).toBe("fa-IR-u-ca-gregory");
    expect(monthDayLocale("ar-SA-u-ca-islamic-umalqura")).toBe("ar-SA-u-ca-gregory");
    expect(monthDayLocale("he-IL-u-ca-hebrew")).toBe("he-IL-u-ca-gregory");
    expect(monthDayLocale("de-DE-u-ca-islamic-civil")).toBe("de-DE-u-ca-gregory");
  });
});

describe("DateField hideYear in a calendar with the Gregorian months", () => {
  it.each([
    ["th-TH", "29/2"],
    ["ja-JP-u-ca-japanese", "2/29"],
    ["zh-TW-u-ca-roc", "2/29"],
    ["en-US-u-ca-roc", "2/29"],
  ])("%s: 29 February typed fresh is Gregorian 2000-02-29, no message, no era or year on screen", (locale, text) => {
    const onChange = vi.fn();
    const { container } = inLocale(locale, <DateField label="Anniversary" hideYear onChange={onChange} />);
    expect(types(container).filter((kind) => kind !== "literal").sort()).toEqual(["day", "month"]);
    type2902(container);
    blur();
    expect(shown(container)).toBe(text);
    expect(reported(onChange)).toEqual(["2000-02-29 gregory"]);
    expect(errorText(container)).toBe("");
  });

  it.each(["th-TH", "ja-JP-u-ca-japanese", "zh-TW-u-ca-roc", "en-US-u-ca-roc"])(
    "%s: a saved 10 February edited to the 29th is 2000-02-29, no message",
    (locale) => {
      const onChange = vi.fn();
      const { container } = inLocale(locale, <DateField label="Anniversary" hideYear defaultValue={new CalendarDate(2000, 2, 10)} onChange={onChange} />);
      clear(segment(container, "day"));
      type(segment(container, "day"), "29");
      blur();
      expect(reported(onChange).at(-1)).toBe("2000-02-29 gregory");
      expect(errorText(container)).toBe("");
    },
  );

  it("th-TH: 30 February is still refused, counted in the leap February (29 days)", () => {
    const onChange = vi.fn();
    const { container } = inLocale("th-TH", <DateField label="Anniversary" hideYear onChange={onChange} />);
    type(segment(container, "day"), "30");
    type(segment(container, "month"), "02");
    blur();
    expect(shown(container)).toBe("30/2");
    expect(errorText(container)).toBe("February has 29 days.");
    expect(reported(onChange).every((value) => value !== "2000-02-29 gregory" && value !== "2000-03-01 gregory")).toBe(true);
  });
});

describe("DateField hideYear in a Gregorian locale (en-GB) is unchanged", () => {
  it("29/02 is 2000-02-29; 30/02 says February has 29 days", () => {
    const onChange = vi.fn();
    const { container } = inLocale("en-GB", <DateField label="Anniversary" hideYear onChange={onChange} />);
    expect(shown(container)).toBe("dd/mm");
    type2902(container);
    blur();
    expect(shown(container)).toBe("29/02");
    expect(reported(onChange)).toEqual(["2000-02-29 gregory"]);
    expect(errorText(container)).toBe("");
    clear(segment(container, "day"));
    type(segment(container, "day"), "30");
    blur();
    expect(errorText(container)).toBe("February has 29 days.");
  });
});

describe("DateField hideYear in a calendar with months of its own: the Gregorian months", () => {
  it.each([
    ["fa-IR", "۲/۲۹"],
    ["ar-SA-u-ca-islamic-umalqura", "٢٩/٢"],
    ["he-IL-u-ca-hebrew", "29.2"],
  ])("%s: 29 February, in the locale's digits, is 2000-02-29", (locale, text) => {
    const onChange = vi.fn();
    const { container } = inLocale(locale, <DateField label="Anniversary" hideYear onChange={onChange} />);
    type2902(container);
    blur();
    expect(shown(container)).toBe(text);
    expect(reported(onChange)).toEqual(["2000-02-29 gregory"]);
    expect(errorText(container)).toBe("");
  });

  it("en-GB-u-ca-hebrew: 30/02 names February with the library's own words", () => {
    const { container } = inLocale("en-GB-u-ca-hebrew", <DateField label="Anniversary" hideYear />);
    type(segment(container, "day"), "30");
    type(segment(container, "month"), "02");
    blur();
    expect(errorText(container)).toBe("February has 29 days.");
  });

  it("a field with the year (no hideYear) still types in the locale's own calendar", () => {
    const { container } = inLocale("he-IL-u-ca-hebrew", <DateField label="Date" defaultValue={new CalendarDate(2024, 3, 10)} />);
    expect(shown(container)).toContain("5784");
  });
});

describe("DateField hideYear with a value outside 2000", () => {
  // The contract is a value in 2000. The field keeps the year it is given and judges the day in it: February 2023 has
  // 28 days. Before, blur clamped 29/02 to 28/02 and reported 2023-02-28 without a word.
  it("en-GB: 2023-03-29 with its month edited to 02 says February has 28 days and reports null", () => {
    const onChange = vi.fn();
    const { container } = inLocale("en-GB", <DateField label="Anniversary" hideYear defaultValue={new CalendarDate(2023, 3, 29)} onChange={onChange} />);
    clear(segment(container, "month"));
    type(segment(container, "month"), "02");
    blur();
    expect(shown(container)).toBe("29/02");
    expect(errorText(container)).toBe("February has 28 days.");
    expect(reported(onChange).at(-1)).toBeNull();
  });

  it("en-GB: an edit to another month reports in the year it was given", () => {
    const onChange = vi.fn();
    const { container } = inLocale("en-GB", <DateField label="Anniversary" hideYear defaultValue={new CalendarDate(2023, 3, 29)} onChange={onChange} />);
    clear(segment(container, "month"));
    type(segment(container, "month"), "04");
    blur();
    expect(reported(onChange).at(-1)).toBe("2023-04-29 gregory");
  });
});
