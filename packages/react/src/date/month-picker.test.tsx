import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { CalendarDate } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DS_STRINGS, registerDsStrings } from "../i18n";
import { registerLocaleAliases } from "../intl-locale";
import { DateField, DatePicker } from "./index";

// DatePicker granularity="month": a picker for a month, such as a from–to month filter: a year stepper over a 4×3
// grid of Intl month names, clear and "this month", min and max. DateField granularity="month" types the same value.

afterEach(cleanup);

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;

function inLocale(ui: React.ReactElement, locale = "en-GB", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

/** The segments a user sees, in order. */
function shown(root: ParentNode) {
  return Array.from(root.querySelectorAll("[data-slot='date-segment']"))
    .map((s) => (s.textContent ?? "").replace(/[⁦-⁩]/g, ""))
    .filter((text) => text !== "");
}

function open(name: RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
  return screen.getByRole("dialog");
}
const grid = (dialog: HTMLElement) => within(dialog).getByRole("grid");
const months = (dialog: HTMLElement) => within(grid(dialog)).getAllByRole("button");
/** The runtime's own short month names (ICU versions differ: "Sep" or "Sept"). */
const SHORT_MONTHS = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(Date.UTC(2026, month, 1)));
const key = (key: string) => act(() => {
  fireEvent.keyDown(document.activeElement!, { key });
  fireEvent.keyUp(document.activeElement!, { key });
});

describe("DatePicker granularity=\"month\"", () => {
  it("the field types month and year only; the value is the month's first day", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DatePicker label="Start month" granularity="month" defaultValue={new CalendarDate(2026, 3, 1)} onChange={onChange} />);
    expect(shown(container)).toEqual(["03", "/", "2026"]);
    expect(container.querySelector("[data-slot='date-picker']")!.getAttribute("data-granularity")).toBe("month");
    expect(container.querySelector("[data-type='day']")).toBeNull();
  });

  it("the popover is a grid of the twelve months under the year, named and selected for screen readers", () => {
    inLocale(<DatePicker label="Start month" granularity="month" defaultValue={new CalendarDate(2026, 3, 1)} />);
    const dialog = open(/Start month/);
    expect(within(dialog).queryByRole("grid", { name: /March/ })).toBeNull();
    expect(grid(dialog).getAttribute("aria-label")).toBe("2026");
    expect(within(grid(dialog)).getAllByRole("row")).toHaveLength(4);
    expect(within(grid(dialog)).getAllByRole("gridcell")).toHaveLength(12);
    expect(months(dialog).map((button) => button.textContent)).toEqual(SHORT_MONTHS);
    expect([SHORT_MONTHS[0], SHORT_MONTHS[2], SHORT_MONTHS[11]]).toEqual(["Jan", "Mar", "Dec"]);
    const march = within(dialog).getByRole("button", { name: "March 2026" });
    expect(march.closest("[role='gridcell']")!.getAttribute("aria-selected")).toBe("true");
    expect(within(dialog).getByRole("button", { name: "January 2026" }).closest("[role='gridcell']")!.getAttribute("aria-selected")).toBe("false");
    expect(within(dialog).getByRole("button", { name: DS_STRINGS.previousYear.en })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: DS_STRINGS.nextYear.en })).toBeTruthy();
    // No day grid in month mode.
    expect(dialog.querySelector("[data-slot='calendar']")).toBeNull();
  });

  it("focus starts on the chosen month; it is the grid's only tab stop", async () => {
    inLocale(<DatePicker label="Start month" granularity="month" defaultValue={new CalendarDate(2026, 3, 1)} />);
    const dialog = open(/Start month/);
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "March 2026" })));
    expect(months(dialog).filter((button) => button.getAttribute("tabindex") !== "-1")).toHaveLength(1);
  });

  it("keyboard: arrows by a month and a row, across years; Home/End to the row's ends; Page Up/Down by a year; Enter picks", async () => {
    const onChange = vi.fn();
    inLocale(<DatePicker label="Start month" granularity="month" defaultValue={new CalendarDate(2026, 3, 1)} onChange={onChange} />);
    const dialog = open(/Start month/);
    const focused = () => document.activeElement!.getAttribute("aria-label");
    await waitFor(() => expect(focused()).toBe("March 2026"));
    key("ArrowRight");
    expect(focused()).toBe("April 2026");
    key("ArrowDown");
    expect(focused()).toBe("July 2026");
    key("ArrowLeft");
    expect(focused()).toBe("June 2026");
    key("Home");
    expect(focused()).toBe("April 2026");
    key("End");
    expect(focused()).toBe("June 2026");
    key("ArrowUp");
    expect(focused()).toBe("March 2026");
    key("PageDown");
    expect(focused()).toBe("March 2027");
    expect(grid(dialog).getAttribute("aria-label")).toBe("2027");
    key("PageUp");
    key("PageUp");
    expect(focused()).toBe("March 2025");
    // Past December into the next year's January.
    for (let i = 0; i < 10; i++) key("ArrowRight");
    expect(focused()).toBe("January 2026");
    expect(months(dialog).filter((button) => button.getAttribute("tabindex") !== "-1").map((b) => b.getAttribute("aria-label"))).toEqual(["January 2026"]);
    key("Enter");
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2026, 1, 1));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("picking with the pointer fills the field, closes and returns focus to the field", async () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DatePicker label="Start month" granularity="month" onChange={onChange} />);
    const dialog = open(/Start month/);
    fireEvent.click(within(dialog).getAllByRole("button", { name: /^October / })[0]!);
    const picked = onChange.mock.calls.at(-1)![0] as CalendarDate;
    expect([picked.month, picked.day]).toEqual([10, 1]);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(shown(container)).toEqual(["10", "/", String(picked.year)]);
    await waitFor(() => expect(document.activeElement!.getAttribute("data-type")).toBe("month"));
  });

  it("the year buttons step the grid a year and keep focus on themselves", () => {
    inLocale(<DatePicker label="Start month" granularity="month" defaultValue={new CalendarDate(2026, 3, 1)} />);
    const dialog = open(/Start month/);
    const next = within(dialog).getByRole("button", { name: DS_STRINGS.nextYear.en });
    act(() => next.focus());
    fireEvent.click(next);
    expect(grid(dialog).getAttribute("aria-label")).toBe("2027");
    expect(within(dialog).getByRole("button", { name: "March 2027" }).closest("[role='gridcell']")!.getAttribute("aria-selected")).toBe("false");
    expect(document.activeElement).toBe(next);
    fireEvent.click(within(dialog).getByRole("button", { name: DS_STRINGS.previousYear.en }));
    fireEvent.click(within(dialog).getByRole("button", { name: DS_STRINGS.previousYear.en }));
    expect(grid(dialog).getAttribute("aria-label")).toBe("2025");
  });

  it("a year button that a step disables at a bound hands focus to the grid; Esc still closes", () => {
    inLocale(
      <DatePicker label="Period" granularity="month" defaultValue={new CalendarDate(2025, 6, 1)} minValue={new CalendarDate(2024, 4, 1)} maxValue={new CalendarDate(2026, 11, 1)} />,
    );
    let dialog = open(/Period/);
    const next = within(dialog).getByRole("button", { name: DS_STRINGS.nextYear.en }) as HTMLButtonElement;
    act(() => next.focus());
    fireEvent.click(next);
    expect(grid(dialog).getAttribute("aria-label")).toBe("2026");
    expect(next.disabled).toBe(true);
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "June 2026" }));
    key("Escape");
    expect(screen.queryByRole("dialog")).toBeNull();

    dialog = open(/Period/);
    const previous = within(dialog).getByRole("button", { name: DS_STRINGS.previousYear.en }) as HTMLButtonElement;
    act(() => previous.focus());
    fireEvent.click(previous);
    expect(grid(dialog).getAttribute("aria-label")).toBe("2024");
    expect(previous.disabled).toBe(true);
    // June 2024 is inside the bounds (from April), so focus lands on it.
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "June 2024" }));
  });

  it("minValue and maxValue count by month: outside months are disabled, the year buttons stop at the bounds", () => {
    inLocale(
      <DatePicker label="Period" granularity="month" defaultValue={new CalendarDate(2026, 3, 1)} minValue={new CalendarDate(2026, 2, 15)} maxValue={new CalendarDate(2026, 11, 3)} />,
    );
    const dialog = open(/Period/);
    const disabled = months(dialog).filter((button) => (button as HTMLButtonElement).disabled).map((button) => button.textContent);
    expect(disabled).toEqual(["Jan", "Dec"]);
    // February is allowed although the minimum is the 15th: the month's first day stands for the month.
    expect((within(dialog).getByRole("button", { name: "February 2026" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: DS_STRINGS.previousYear.en }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole("button", { name: DS_STRINGS.nextYear.en }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("the arrows stop at the bounds instead of landing on a disabled month", async () => {
    inLocale(<DatePicker label="Period" granularity="month" defaultValue={new CalendarDate(2026, 3, 1)} minValue={new CalendarDate(2026, 2, 1)} />);
    open(/Period/);
    await waitFor(() => expect(document.activeElement!.getAttribute("aria-label")).toBe("March 2026"));
    key("ArrowLeft");
    key("ArrowLeft");
    key("ArrowLeft");
    expect(document.activeElement!.getAttribute("aria-label")).toBe("February 2026");
  });

  it("This month picks this month's first day; Clear empties the field", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<DatePicker label="Period" granularity="month" defaultValue={new CalendarDate(2020, 5, 1)} onChange={onChange} timeZone="Europe/Podgorica" />);
    let dialog = open(/Period/);
    fireEvent.click(within(dialog).getByRole("button", { name: DS_STRINGS.thisMonth.en }));
    const now = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Podgorica" }).format(new Date());
    expect((onChange.mock.calls.at(-1)![0] as CalendarDate).toString()).toBe(`${now.slice(0, 7)}-01`);
    dialog = open(/Period/);
    // This month is marked for screen readers and underlined.
    const current = within(dialog).getAllByRole("button").find((button) => button.getAttribute("aria-current") === "date")!;
    expect(current.getAttribute("class")).toContain("underline");
    fireEvent.click(within(dialog).getByRole("button", { name: DS_STRINGS.clear.en }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(shown(container)).toEqual(["mm", "/", "yyyy"]);
  });

  it("This month is disabled when this month is outside the bounds", () => {
    inLocale(<DatePicker label="Period" granularity="month" maxValue={new CalendarDate(2001, 1, 1)} />);
    const dialog = open(/Period/);
    expect((within(dialog).getByRole("button", { name: DS_STRINGS.thisMonth.en }) as HTMLButtonElement).disabled).toBe(true);
  });

  const marchIn = (tag: string) => new Intl.DateTimeFormat(tag, { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(2026, 2, 1));

  it("a registered language: month names from Intl, the year stepper and This month in its words", () => {
    for (const name of ["previousYear", "nextYear", "thisMonth"] as const) expect(DS_STRINGS[name].en, name).toBeTruthy();
    registerDsStrings("ru", { previousYear: "Предыдущий год", nextYear: "Следующий год", thisMonth: "Этот месяц" });
    // A regional tag uses its language's strings.
    for (const locale of ["ru", "ru-RU"]) {
      inLocale(<DatePicker label="Period" granularity="month" defaultValue={new CalendarDate(2026, 3, 1)} />, locale);
      const dialog = open(/Period/);
      expect(marchIn(locale).toLowerCase(), locale).toContain("март");
      expect(within(dialog).getByRole("button", { name: marchIn(locale) }), locale).toBeTruthy();
      expect(within(dialog).getByRole("button", { name: "Этот месяц" }), locale).toBeTruthy();
      expect(within(dialog).getByRole("button", { name: "Предыдущий год" }), locale).toBeTruthy();
      expect(within(dialog).getByRole("button", { name: "Следующий год" }), locale).toBeTruthy();
      cleanup();
    }
  });

  it.each([
    ["en-US", "March 2026"],
    ["sr-Cyrl", "март 2026"],
    ["de", "März 2026"],
  ])("a language nobody registered (%s): month names still from Intl, the strings in English", (locale, march) => {
    inLocale(<DatePicker label="Period" granularity="month" defaultValue={new CalendarDate(2026, 3, 1)} />, locale);
    const dialog = open(/Period/);
    expect(marchIn(locale).toLowerCase()).toContain(march.toLowerCase().split(" ")[0]!);
    expect(within(dialog).getByRole("button", { name: marchIn(locale) })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: DS_STRINGS.thisMonth.en })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: DS_STRINGS.previousYear.en })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: DS_STRINGS.nextYear.en })).toBeTruthy();
  });

  it("an aliased app locale: month names come from the tag it stands for, the strings are the app locale's own", () => {
    registerLocaleAliases({ "x-app": "sr-Latn-ME" });
    registerDsStrings("x-app", { thisMonth: "Ovaj mjesec" });
    inLocale(<DatePicker label="Period" granularity="month" defaultValue={new CalendarDate(2026, 3, 1)} />, "x-app");
    const dialog = open(/Period/);
    expect(marchIn("sr-Latn-ME")).toContain("mart");
    expect(within(dialog).getByRole("button", { name: marchIn("sr-Latn-ME") })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Ovaj mjesec" })).toBeTruthy();
    // A string the app did not give stays English.
    expect(within(dialog).getByRole("button", { name: DS_STRINGS.nextYear.en })).toBeTruthy();
  });

  it("RTL in ar: Left and Right follow the reading direction, the chevrons mirror, only logical classes", async () => {
    inLocale(<DatePicker label="الشهر" granularity="month" defaultValue={new CalendarDate(2026, 3, 1)} />, "ar", "rtl");
    const dialog = open(/الشهر/);
    const march = new Intl.DateTimeFormat("ar", { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(2026, 2, 1));
    const april = new Intl.DateTimeFormat("ar", { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(2026, 3, 1));
    const february = new Intl.DateTimeFormat("ar", { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(2026, 1, 1));
    await waitFor(() => expect(document.activeElement!.getAttribute("aria-label")).toBe(march));
    key("ArrowLeft");
    expect(document.activeElement!.getAttribute("aria-label")).toBe(april);
    key("ArrowRight");
    key("ArrowRight");
    expect(document.activeElement!.getAttribute("aria-label")).toBe(february);
    for (const svg of dialog.querySelectorAll("[data-slot='month-grid-previous'] svg, [data-slot='month-grid-next'] svg")) {
      expect(svg.getAttribute("class")).toContain("rtl:-scale-x-100");
    }
    for (const element of dialog.querySelectorAll("[data-slot^='month-grid']")) {
      expect(element.getAttribute("class") ?? "").not.toMatch(PHYSICAL);
    }
  });

  it("Esc closes the grid without changing the value", () => {
    const onChange = vi.fn();
    inLocale(<DatePicker label="Period" granularity="month" defaultValue={new CalendarDate(2026, 3, 1)} onChange={onChange} />);
    open(/Period/);
    act(() => {
      fireEvent.keyDown(document.activeElement!, { key: "Escape" });
      fireEvent.keyUp(document.activeElement!, { key: "Escape" });
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not duplicate DateField granularity=\"month\": the same segments, plus the grid", () => {
    const field = inLocale(<DateField label="Period" granularity="month" defaultValue={new CalendarDate(2026, 3, 1)} />);
    const typed = shown(field.container);
    cleanup();
    const picker = inLocale(<DatePicker label="Period" granularity="month" defaultValue={new CalendarDate(2026, 3, 1)} />);
    expect(shown(picker.container)).toEqual(typed);
  });

  it("granularity=\"day\" (the default) renders exactly as before: no data-granularity, the day calendar (client and server)", () => {
    const server = (extra: object) =>
      renderToStaticMarkup(
        <DesignSystemProvider locale="en-GB" navigate={() => {}}>
          <DatePicker label="Date" defaultValue={new CalendarDate(2026, 3, 14)} {...extra} />
        </DesignSystemProvider>,
      );
    expect(server({ granularity: "day" })).toBe(server({}));
    inLocale(<DatePicker label="Date" defaultValue={new CalendarDate(2026, 3, 14)} />);
    expect(document.querySelector("[data-slot='date-picker']")!.hasAttribute("data-granularity")).toBe(false);
    const dialog = open(/Date/);
    expect(dialog.querySelector("[data-slot='calendar']")).not.toBeNull();
    expect(dialog.querySelector("[data-slot='month-grid']")).toBeNull();
  });
});
