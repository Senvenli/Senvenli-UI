import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { CalendarDate } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatDateTime } from "../i18n";
import { registerLocaleAliases, registerLocalWords } from "../intl-locale";
import { DesignSystemProvider } from "../provider";
import { DatePicker } from "./index";

/**
 * Month words through an app's word hook. An app whose language has no browser data formats with a stand-in tag and
 * registers a hook (`registerLocalWords`) that puts its own words into the text `Intl` wrote. The fixture is an app that
 * shows Macedonian through a Bulgarian stand-in (`bg-MK-x-mk`): the stand-in writes Bulgarian month words ("юни"), the
 * hook swaps them for the Macedonian ones ("јуни"). Without a hook `formatDateTime` is native `Intl`.
 */

afterEach(() => {
  cleanup();
  registerLocalWords(null);
});

const STAND_IN = "bg-MK-x-mk";
/** The app's own tag, aliased to the stand-in in one test. */
const APP_TAG = "mk-x-app";
const BG = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"];
const MK = ["јануари", "февруари", "март", "април", "мај", "јуни", "јули", "август", "септември", "октомври", "ноември", "декември"];
/** The app's hook: whole words only, and only for its own tags. */
const appWords = (tag: string, text: string) =>
  tag === STAND_IN || tag === APP_TAG ? text.replace(/\p{L}+/gu, (word) => MK[BG.indexOf(word)] ?? word) : text;
const at = (month: number) => Date.UTC(2026, month, 28, 9, 15);
const JUNE = Date.UTC(2026, 5, 30, 9, 15);
const UTC = { timeZone: "UTC" } as const;
const native = (tag: string, options: Intl.DateTimeFormatOptions, when: number) => new Intl.DateTimeFormat(tag, options).format(when);

describe("formatDateTime with a registered word hook", () => {
  it("names all 12 long months in the app's words", () => {
    registerLocalWords(appWords);
    for (let month = 0; month < 12; month++) {
      expect(native(STAND_IN, { month: "long", ...UTC }, at(month)), `stand-in ${month + 1}`).toBe(BG[month]);
      expect(formatDateTime(STAND_IN, { month: "long", ...UTC }, at(month)), `long ${month + 1}`).toBe(MK[month]);
    }
  });

  it("changes only the month word: the stand-in's order, spacing and punctuation stay", () => {
    registerLocalWords(appWords);
    for (const options of [
      { day: "numeric", month: "long", year: "numeric" },
      { month: "long", year: "numeric" },
      { dateStyle: "long" },
      { weekday: "long", day: "numeric", month: "long", year: "numeric" },
    ] as Intl.DateTimeFormatOptions[]) {
      const written = native(STAND_IN, { ...options, ...UTC }, JUNE);
      expect(written, JSON.stringify(options)).toContain("юни");
      expect(formatDateTime(STAND_IN, { ...options, ...UTC }, JUNE), JSON.stringify(options)).toBe(written.replace("юни", "јуни"));
    }
  });

  it("leaves a numeric month numeric", () => {
    registerLocalWords(appWords);
    const nov = Date.UTC(2026, 10, 30, 9, 15);
    for (const options of [
      { day: "numeric", month: "numeric", year: "numeric", ...UTC },
      { dateStyle: "short", ...UTC },
    ] as Intl.DateTimeFormatOptions[]) {
      const written = formatDateTime(STAND_IN, options, nov);
      expect(written, JSON.stringify(options)).toBe(native(STAND_IN, options, nov));
      expect(written, JSON.stringify(options)).toMatch(/^30\.11\.(20)?26/);
    }
  });

  it("leaves the words the hook has no entry for: a narrow month, another calendar's months", () => {
    registerLocalWords(appWords);
    for (const options of [
      { month: "narrow", ...UTC },
      { day: "numeric", month: "long", calendar: "islamic", ...UTC },
      { day: "numeric", month: "short", calendar: "islamic", ...UTC },
    ] as Intl.DateTimeFormatOptions[]) {
      expect(formatDateTime(STAND_IN, options, JUNE), JSON.stringify(options)).toBe(native(STAND_IN, options, JUNE));
    }
  });

  it("uses the month in the time zone asked, not the runtime's", () => {
    registerLocalWords(appWords);
    // 23:30 UTC on 31 May is 1 June in Skopje.
    expect(formatDateTime(STAND_IN, { day: "numeric", month: "long", timeZone: "Europe/Skopje" }, Date.UTC(2026, 4, 31, 23, 30))).toBe("1 јуни");
  });

  it("an aliased app locale formats with its stand-in's data, and the hook is given the app's own tag", () => {
    const hook = vi.fn(appWords);
    registerLocaleAliases({ [APP_TAG]: STAND_IN });
    registerLocalWords(hook);
    expect(formatDateTime(APP_TAG, { day: "numeric", month: "long", ...UTC }, JUNE)).toBe("30 јуни");
    expect(hook).toHaveBeenLastCalledWith(APP_TAG, "30 юни");
    // The alias is exact: the bare language keeps its own data.
    expect(formatDateTime("mk", { month: "long", ...UTC }, JUNE)).toBe(native("mk", { month: "long", ...UTC }, JUNE));
  });

  it("never changes the options given", () => {
    registerLocalWords(appWords);
    const options = Object.freeze({ month: "short", ...UTC } as Intl.DateTimeFormatOptions);
    formatDateTime(STAND_IN, options, at(5));
    formatDateTime("en-GB", options, at(5));
    expect(options).toEqual({ month: "short", timeZone: "UTC" });
  });
});

describe("formatDateTime for every other tag, and for every tag without a hook", () => {
  const OPTIONS: Intl.DateTimeFormatOptions[] = [
    { month: "short", ...UTC },
    { month: "long", ...UTC },
    { day: "numeric", month: "short", year: "numeric", ...UTC },
    { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", ...UTC },
    { dateStyle: "long", ...UTC },
  ];
  const TAGS = ["mk", "bg", "bg-MK", "sr-Cyrl-MK", "fr", "en-GB", "de", "ru", "el", "sr-Cyrl-BA-x-me", "sr-Cyrl-BA-x-bs", "en-DE-u-hc-h12-x-sq"];

  function expectNative(tags: string[]) {
    for (const tag of tags) {
      for (const options of OPTIONS) {
        for (let month = 0; month < 12; month++) {
          expect(formatDateTime(tag, options, at(month)), `${tag} ${JSON.stringify(options)}`).toBe(native(tag, options, at(month)));
        }
      }
    }
  }

  it("a hook that rewrites only its own tags leaves the others native Intl, real Macedonian data included", () => {
    registerLocalWords(appWords);
    expectNative(TAGS);
  });

  it("with no hook registered every tag is native Intl, the stand-in included", () => {
    expectNative([...TAGS, STAND_IN]);
    // Taking the hook away again restores Intl's own words.
    registerLocalWords(appWords);
    expect(formatDateTime(STAND_IN, { month: "long", ...UTC }, JUNE)).toBe("јуни");
    registerLocalWords(null);
    expect(formatDateTime(STAND_IN, { month: "long", ...UTC }, JUNE)).toBe("юни");
  });
});

describe("components under the word hook", () => {
  it("the DatePicker month grid names its months in the app's words, never in the stand-in's", () => {
    registerLocalWords(appWords);
    render(
      <DesignSystemProvider locale={STAND_IN} navigate={vi.fn()}>
        <DatePicker label="Month" granularity="month" defaultValue={new CalendarDate(2026, 6, 1)} />
      </DesignSystemProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Month/ }));
    const dialog = screen.getByRole("dialog");
    const names = within(within(dialog).getByRole("grid")).getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? "");
    expect(names).toHaveLength(12);
    expect(names[5]).toBe(native(STAND_IN, { month: "long", year: "numeric", ...UTC }, JUNE).replace("юни", "јуни"));
    expect(names.map((name) => name.split(" ")[0])).toEqual(MK);
    expect(names.join(" ")).not.toMatch(/юни|юли|януари|май/);
  });
});
