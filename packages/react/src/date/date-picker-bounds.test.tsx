import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { CalendarDate } from "@internationalized/date";
import { DatePicker as AriaDatePicker, DateInput, DateSegment, FieldError, Group, I18nProvider } from "react-aria-components";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { Form } from "../form/index";
import { DesignSystemProvider } from "../provider";
import { DS_STRINGS, registerDsStrings } from "../i18n";
import { DatePicker } from "./index";

// DatePicker bounds text: React Aria words its min/max (and unavailable-day) messages after the browser's language
// (navigator.language), not the I18nProvider's, so an English app in a German browser said "Der Wert muss 1.3.2026
// oder später sein."; a month picker also quoted a whole day. The library now words them in the provider locale, and a
// month picker names the month ("March 2026"). A locale without registered words (de, he) keeps React Aria's own
// text.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** The browser's language, as React Aria reads it. */
function browser(language: string) {
  vi.spyOn(window.navigator, "language", "get").mockReturnValue(language);
}

function inLocale(ui: React.ReactElement, locale = "en-GB", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

const MIN = new CalendarDate(2026, 3, 1);
const MAX = new CalendarDate(2026, 8, 31);
const error = (root: ParentNode = document) => root.querySelector("[data-slot='field-error']")?.textContent ?? null;
const group = () => screen.getByRole("group");

/** React Aria's own message for the same props and locale (without the library's validate), read from its FieldError. */
function reactAriaText(locale: string, props: Partial<React.ComponentProps<typeof AriaDatePicker<CalendarDate>>>) {
  const { container, unmount } = render(
    <I18nProvider locale={locale}>
      <AriaDatePicker<CalendarDate> aria-label="x" validationBehavior="aria" {...props}>
        <Group>
          <DateInput>{(segment) => <DateSegment segment={segment} />}</DateInput>
        </Group>
        <FieldError data-testid="ra-error" />
      </AriaDatePicker>
    </I18nProvider>,
  );
  const text = container.querySelector("[data-testid='ra-error']")?.textContent ?? null;
  unmount();
  return text;
}

/** React Aria's sentence in a German browser: what the field would say if the browser's language won. */
const GERMAN = /Wert|Datum/;

describe("DatePicker bounds text follows the provider locale", () => {
  it("en-GB app in a de-DE browser: the minimum is said in English, with the day in British order", () => {
    browser("de-DE");
    // What React Aria says on its own here: German, after the browser.
    expect(reactAriaText("en-GB", { minValue: MIN, defaultValue: new CalendarDate(2026, 1, 14) })).toMatch(GERMAN);
    inLocale(<DatePicker label="Date" minValue={MIN} defaultValue={new CalendarDate(2026, 1, 14)} />);
    expect(error()).toBe("Value must be 01/03/2026 or later.");
  });

  it("en-US app in a de-DE browser: the maximum is said in English", () => {
    browser("de-DE");
    inLocale(<DatePicker label="Date" maxValue={MAX} defaultValue={new CalendarDate(2026, 9, 14)} />, "en-US");
    expect(error()).toBe("Value must be 8/31/2026 or earlier.");
  });

  it("same browser and app language: React Aria's own text, unchanged", () => {
    browser("en-US");
    inLocale(<DatePicker label="Date" minValue={MIN} defaultValue={new CalendarDate(2026, 1, 14)} />, "en-US");
    expect(error()).toBe("Value must be 3/1/2026 or later.");
  });

  it("screen readers: the field is invalid and described by the message", () => {
    browser("de-DE");
    inLocale(<DatePicker label="Date" minValue={MIN} defaultValue={new CalendarDate(2026, 1, 14)} />);
    const field = group();
    const message = document.querySelector("[data-slot='field-error']")!;
    const segment = within(field).getAllByRole("spinbutton")[0]!;
    expect(segment.getAttribute("aria-invalid")).toBe("true");
    expect((segment.getAttribute("aria-describedby") ?? "").split(" ")).toContain(message.id);
  });

  it("an unavailable day is said in the provider locale too", () => {
    browser("de-DE");
    expect(reactAriaText("en-GB", { isDateUnavailable: (date) => date.day === 14, defaultValue: new CalendarDate(2026, 5, 14) })).not.toBe("Selected date unavailable.");
    inLocale(<DatePicker label="Date" isDateUnavailable={(date) => date.day === 14} defaultValue={new CalendarDate(2026, 5, 14)} />);
    expect(error()).toBe("Selected date unavailable.");
  });

  it("the field's own validate still wins over the bounds (as over React Aria's built-in text)", () => {
    browser("de-DE");
    inLocale(
      <Form onSubmit={(event) => event.preventDefault()}>
        <DatePicker label="Date" minValue={MIN} defaultValue={new CalendarDate(2026, 1, 14)} validate={() => "My own message"} />
        <button type="submit">Send</button>
      </Form>,
    );
    // Before a submit the form's timing holds the field's own message back: the bound shows, in English.
    expect(error()).toBe("Value must be 01/03/2026 or later.");
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(error()).toBe("My own message");
  });

  it("in range: no message, not invalid", () => {
    browser("de-DE");
    inLocale(<DatePicker label="Date" minValue={MIN} maxValue={MAX} defaultValue={new CalendarDate(2026, 5, 14)} />);
    expect(error()).toBeNull();
    expect(within(group()).getAllByRole("spinbutton")[0]!.hasAttribute("aria-invalid")).toBe(false);
  });

  it("typing past the minimum shows the message in the provider locale (keyboard)", () => {
    browser("de-DE");
    inLocale(<DatePicker label="Date" minValue={MIN} defaultValue={new CalendarDate(2026, 3, 1)} />);
    expect(error()).toBeNull();
    // Day, month, year in British order: the month steps back to February, before the minimum.
    const month = within(group()).getAllByRole("spinbutton")[1]!;
    act(() => month.focus());
    act(() => {
      fireEvent.keyDown(month, { key: "ArrowDown" });
      fireEvent.keyUp(month, { key: "ArrowDown" });
    });
    expect(error()).toBe("Value must be 01/03/2026 or later.");
  });

  it("server render: the message is in the provider locale too", () => {
    browser("de-DE");
    const html = renderToStaticMarkup(
      <DesignSystemProvider locale="en-GB" navigate={() => {}}>
        <DatePicker label="Date" minValue={MIN} defaultValue={new CalendarDate(2026, 1, 14)} />
      </DesignSystemProvider>,
    );
    expect(html).toContain("Value must be 01/03/2026 or later.");
    // Not the sentence React Aria words after the browser's language.
    const own = reactAriaText("en-GB", { minValue: MIN, defaultValue: new CalendarDate(2026, 1, 14) })!;
    expect(own).toMatch(GERMAN);
    expect(html).not.toContain(own);
  });
});

describe("DatePicker granularity=\"month\" names the month in its bounds", () => {
  it("below the minimum: \"March 2026 or later\", not a day", () => {
    browser("de-DE");
    inLocale(<DatePicker label="Start month" granularity="month" minValue={new CalendarDate(2026, 3, 15)} defaultValue={new CalendarDate(2026, 1, 1)} />);
    expect(error()).toBe("Value must be March 2026 or later.");
  });

  it("above the maximum: \"August 2026 or earlier\"", () => {
    browser("de-DE");
    inLocale(<DatePicker label="End month" granularity="month" maxValue={MAX} defaultValue={new CalendarDate(2026, 10, 1)} />);
    expect(error()).toBe("Value must be August 2026 or earlier.");
  });

  it("en-US app in a de-DE browser: \"March 2026\" in English", () => {
    browser("de-DE");
    inLocale(<DatePicker label="From" granularity="month" minValue={MIN} defaultValue={new CalendarDate(2026, 1, 1)} />, "en-US");
    expect(error()).toBe("Value must be March 2026 or later.");
  });

  it("the minimum's own month is allowed (the value is its first day)", () => {
    browser("de-DE");
    inLocale(<DatePicker label="Month" granularity="month" minValue={new CalendarDate(2026, 3, 15)} defaultValue={new CalendarDate(2026, 3, 1)} />);
    expect(error()).toBeNull();
  });

  it("RTL in he (no registered words): React Aria's own text, as before, still the field's description", () => {
    browser("en-US");
    const own = reactAriaText("he", { minValue: MIN, defaultValue: new CalendarDate(2026, 1, 1) });
    expect(own).toBeTruthy();
    inLocale(<DatePicker label="חודש" granularity="month" minValue={MIN} defaultValue={new CalendarDate(2026, 1, 1)} />, "he", "rtl");
    expect(error()).toBe(own);
    // Not the library's English sentence (no month named, no Hebrew date inside it).
    expect(error()).not.toBe("Value must be March 2026 or later.");
    expect(document.querySelector<HTMLElement>("[data-slot='field-error']")!.closest("[dir='rtl']")).not.toBeNull();
    const message = document.querySelector("[data-slot='field-error']")!;
    expect((within(group()).getAllByRole("spinbutton")[0]!.getAttribute("aria-describedby") ?? "").split(" ")).toContain(message.id);
  });

  it("de-DE (no registered words): React Aria's own text for the minimum, the maximum and an unavailable day", () => {
    browser("de-DE");
    const cases: Array<[Partial<React.ComponentProps<typeof AriaDatePicker<CalendarDate>>>, React.ComponentProps<typeof DatePicker>]> = [
      [{ minValue: MIN, defaultValue: new CalendarDate(2026, 1, 14) }, { label: "Date", minValue: MIN, defaultValue: new CalendarDate(2026, 1, 14) }],
      [{ maxValue: MAX, defaultValue: new CalendarDate(2026, 9, 14) }, { label: "Date", maxValue: MAX, defaultValue: new CalendarDate(2026, 9, 14) }],
      [{ isDateUnavailable: (date) => date.day === 14, defaultValue: new CalendarDate(2026, 1, 14) }, { label: "Date", isDateUnavailable: (date) => date.day === 14, defaultValue: new CalendarDate(2026, 1, 14) }],
    ];
    for (const [aria, ds] of cases) {
      const own = reactAriaText("de-DE", aria);
      expect(own).toBeTruthy();
      inLocale(<DatePicker {...ds} />, "de-DE");
      expect(error()).toBe(own);
      cleanup();
    }
  });

  it("English has all five sentences, the bounds with one {date}", () => {
    for (const key of ["dateMin", "dateMax", "monthMin", "monthMax", "dateUnavailable"] as const) expect(DS_STRINGS[key].en, key).toBeTruthy();
    for (const key of ["dateMin", "dateMax", "monthMin", "monthMax"] as const) expect(DS_STRINGS[key].en?.split("{date}"), key).toHaveLength(2);
  });
});

// Last: a registration lasts for the whole file. French, so de-DE above stays a locale without registered words.
describe("bounds an app registers (registerDsStrings)", () => {
  const FRENCH = {
    dateMin: "La valeur doit correspondre au {date} ou plus tard.",
    dateMax: "La valeur doit correspondre au {date} ou plus tard au maximum.",
    monthMin: "Choisissez {date} ou un mois suivant.",
    monthMax: "Choisissez {date} ou un mois avant.",
    dateUnavailable: "La date choisie est indisponible.",
  };
  beforeAll(() => registerDsStrings("fr", FRENCH));

  it("fr app in an en-US browser: the registered sentences, with the date in French order", () => {
    browser("en-US");
    inLocale(<DatePicker label="Date" minValue={MIN} defaultValue={new CalendarDate(2026, 1, 14)} />, "fr-FR");
    expect(error()).toBe("La valeur doit correspondre au 01/03/2026 ou plus tard.");
    cleanup();
    inLocale(<DatePicker label="Date" maxValue={MAX} defaultValue={new CalendarDate(2026, 9, 14)} />, "fr-FR");
    expect(error()).toBe("La valeur doit correspondre au 31/08/2026 ou plus tard au maximum.");
    cleanup();
    inLocale(<DatePicker label="Date" isDateUnavailable={(date) => date.day === 14} defaultValue={new CalendarDate(2026, 5, 14)} />, "fr-FR");
    expect(error()).toBe("La date choisie est indisponible.");
  });

  it("fr: a month picker takes the month sentences, which name the month in the form they need", () => {
    browser("en-US");
    inLocale(<DatePicker label="Month" granularity="month" minValue={MIN} defaultValue={new CalendarDate(2026, 1, 1)} />, "fr");
    expect(error()).toBe("Choisissez mars 2026 ou un mois suivant.");
    cleanup();
    inLocale(<DatePicker label="Month" granularity="month" maxValue={MAX} defaultValue={new CalendarDate(2026, 10, 1)} />, "fr");
    expect(error()).toMatch(/^Choisissez ao.t 2026 ou un mois avant\.$/);
  });

  it("English and a locale without registered words are unchanged", () => {
    browser("fr-FR");
    inLocale(<DatePicker label="Date" minValue={MIN} defaultValue={new CalendarDate(2026, 1, 14)} />, "en-US");
    expect(error()).toBe("Value must be 3/1/2026 or later.");
    cleanup();
    const own = reactAriaText("nl-NL", { minValue: MIN, defaultValue: new CalendarDate(2026, 1, 14) });
    inLocale(<DatePicker label="Date" minValue={MIN} defaultValue={new CalendarDate(2026, 1, 14)} />, "nl-NL");
    expect(error()).toBe(own);
  });
});
