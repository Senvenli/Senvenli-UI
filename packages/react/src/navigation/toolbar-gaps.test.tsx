import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { DateField, TimeField } from "../date/index";
import { SearchField } from "../form/index";
import { DesignSystemProvider } from "../provider";
import { Toolbar, ToolbarSpacer } from "./index";

afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "en-GB", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

/** Presses a key on the focused element; returns false when a handler called preventDefault (the key was swallowed). */
function press(key: string) {
  const target = document.activeElement ?? document.body;
  const notPrevented = fireEvent.keyDown(target, { key });
  fireEvent.keyUp(target, { key });
  return notPrevented;
}

function segment(root: ParentNode, type: string) {
  return root.querySelector<HTMLElement>(`[data-slot='date-segment'][data-type='${type}']`)!;
}

function Bar() {
  return (
    <Toolbar aria-label="List tools">
      <Button size="small" iconBefore="filter">Filter</Button>
      <SearchField aria-label="Search" defaultValue="alpha beta" />
      <DateField label="Date" />
      <ToolbarSpacer />
      <Button size="small" variant="subtle" iconOnly iconBefore="download" aria-label="Export" />
    </Toolbar>
  );
}

describe("Toolbar with text-editing controls inside", () => {
  it("←/→ in a SearchField stay in the input and reach the caret (not swallowed)", () => {
    inLocale(<Bar />);
    const input = screen.getByRole<HTMLInputElement>("searchbox", { name: "Search" });
    act(() => input.focus());
    // The caret in the middle of the text: neither arrow is at the field's edge.
    input.setSelectionRange(4, 4);
    expect(press("ArrowLeft")).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(press("ArrowRight")).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it("←/→ on a date segment move between segments, and leave the DateField only at its ends", () => {
    inLocale(<Bar />);
    const field = document.querySelector<HTMLElement>("[data-slot='date-field']")!;
    // en-GB order: day / month / year
    act(() => segment(field, "day").focus());
    press("ArrowRight");
    expect(document.activeElement).toBe(segment(field, "month"));
    press("ArrowRight");
    expect(document.activeElement).toBe(segment(field, "year"));
    // At the field's ends the toolbar takes the arrow and moves on to the neighbouring control.
    expect(press("ArrowRight")).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Export" }));
    act(() => segment(field, "year").focus());
    press("ArrowLeft");
    expect(document.activeElement).toBe(segment(field, "month"));
    press("ArrowLeft");
    expect(document.activeElement).toBe(segment(field, "day"));
    expect(press("ArrowLeft")).toBe(false);
    expect(field.contains(document.activeElement)).toBe(false);
  });

  it("arrow navigation between the toolbar's buttons is unchanged", () => {
    inLocale(
      <Toolbar aria-label="List tools">
        <Button size="small" iconBefore="filter">Filter</Button>
        <Button size="small" iconBefore="calendar">This week</Button>
        <ToolbarSpacer />
        <Button size="small" variant="subtle" iconOnly iconBefore="download" aria-label="Export" />
      </Toolbar>,
    );
    const [filter, week, exportButton] = within(screen.getByRole("toolbar")).getAllByRole("button");
    act(() => filter!.focus());
    expect(press("ArrowRight")).toBe(false);
    expect(document.activeElement).toBe(week);
    press("ArrowRight");
    expect(document.activeElement).toBe(exportButton);
    // No wrap at the ends, as before.
    press("ArrowRight");
    expect(document.activeElement).toBe(exportButton);
    press("ArrowLeft");
    expect(document.activeElement).toBe(week);
    press("ArrowLeft");
    press("ArrowLeft");
    expect(document.activeElement).toBe(filter);
  });

  it("a button next to a SearchField still arrows into the field", () => {
    inLocale(<Bar />);
    const filter = screen.getByRole("button", { name: "Filter" });
    act(() => filter.focus());
    press("ArrowRight");
    expect(document.activeElement).toBe(screen.getByRole("searchbox", { name: "Search" }));
  });

  it("Tab still leaves the toolbar via its last control, from a text field too", () => {
    inLocale(<Bar />);
    const input = screen.getByRole("searchbox", { name: "Search" });
    act(() => input.focus());
    fireEvent.keyDown(input, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Export" }));
    act(() => input.focus());
    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Filter" }));
  });

  it("in RTL the button arrows are reversed and a SearchField still keeps its arrows", () => {
    inLocale(
      <Toolbar aria-label="أدوات">
        <Button size="small">أ</Button>
        <Button size="small">ب</Button>
        <SearchField aria-label="بحث" defaultValue="abc" />
      </Toolbar>,
      "ar",
      "rtl",
    );
    const [first, second] = within(screen.getByRole("toolbar")).getAllByRole("button");
    act(() => first!.focus());
    press("ArrowLeft");
    expect(document.activeElement).toBe(second);
    press("ArrowRight");
    expect(document.activeElement).toBe(first);
    const input = screen.getByRole<HTMLInputElement>("searchbox", { name: "بحث" });
    act(() => input.focus());
    input.setSelectionRange(1, 1);
    expect(press("ArrowLeft")).toBe(true);
    expect(press("ArrowRight")).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it("keeps the toolbar's role, orientation, name and slot", () => {
    inLocale(<Bar />);
    const toolbar = screen.getByRole("toolbar", { name: "List tools" });
    expect(toolbar.getAttribute("aria-orientation")).toBe("horizontal");
    expect(toolbar.getAttribute("data-orientation")).toBe("horizontal");
    expect(toolbar.getAttribute("data-slot")).toBe("toolbar");
  });
});

/**
 * Presses an arrow and, when nothing took it and focus is in a text input, moves the caret one step the
 * way the browser would (jsdom does not): the arrow's visual direction in the input's own direction.
 */
function arrow(key: "ArrowLeft" | "ArrowRight") {
  const target = document.activeElement;
  const notPrevented = press(key);
  if (notPrevented && target instanceof HTMLInputElement && document.activeElement === target) {
    const rtl = target.matches(":dir(rtl)");
    const step = (key === "ArrowRight") !== rtl ? 1 : -1;
    const caret = Math.min(Math.max((target.selectionStart ?? 0) + step, 0), target.value.length);
    target.setSelectionRange(caret, caret);
  }
  return document.activeElement;
}

/** Presses the arrow until focus stops moving; returns every element focus visited, in order. */
function walk(key: "ArrowLeft" | "ArrowRight") {
  const visited: Element[] = [document.activeElement!];
  for (let i = 0; i < 40; i++) {
    const before = document.activeElement;
    const caret = before instanceof HTMLInputElement ? before.selectionStart : null;
    const after = arrow(key);
    if (after !== before) visited.push(after!);
    else if (!(after instanceof HTMLInputElement) || after.selectionStart === caret) break;
  }
  return visited;
}

function EdgeBar() {
  return (
    <Toolbar aria-label="List tools">
      <Button size="small" iconBefore="filter">Filter</Button>
      <SearchField aria-label="Search" defaultValue="sample" />
      <DateField label="Date" />
      <ToolbarSpacer />
      <Button size="small" variant="subtle" iconOnly iconBefore="download" aria-label="Export" />
    </Toolbar>
  );
}

describe("Toolbar arrows leave a text-editing control at its edge", () => {
  function controls() {
    const field = document.querySelector<HTMLElement>("[data-slot='date-field']")!;
    return {
      filter: screen.getByRole("button", { name: "Filter" }),
      input: screen.getByRole<HTMLInputElement>("searchbox", { name: "Search" }),
      day: segment(field, "day"),
      month: segment(field, "month"),
      year: segment(field, "year"),
      exportButton: screen.getByRole("button", { name: "Export" }),
    };
  }

  /** The visited elements keep the given ones in this order (other stops, like the clear button, may sit between). */
  function expectInOrder(visited: Element[], expected: Element[]) {
    const indexes = expected.map((element) => visited.indexOf(element));
    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
  }

  it("→ alone reaches every control from the first one", () => {
    inLocale(<EdgeBar />);
    const { filter, input, day, month, year, exportButton } = controls();
    act(() => filter.focus());
    // The caret starts at the text's start, as when the user arrives with the caret there.
    input.setSelectionRange(0, 0);
    const visited = walk("ArrowRight");
    expectInOrder(visited, [filter, input, day, month, year, exportButton]);
    expect(document.activeElement).toBe(exportButton);
  });

  it("← alone reaches every control from the last one", () => {
    inLocale(<EdgeBar />);
    const { filter, input, day, month, year, exportButton } = controls();
    act(() => exportButton.focus());
    input.setSelectionRange(input.value.length, input.value.length);
    const visited = walk("ArrowLeft");
    expectInOrder(visited, [exportButton, year, month, day, input, filter]);
    expect(document.activeElement).toBe(filter);
  });

  it("the caret in the middle of the text keeps → and ← in the field", () => {
    inLocale(<EdgeBar />);
    const { input } = controls();
    act(() => input.focus());
    input.setSelectionRange(3, 3);
    expect(press("ArrowRight")).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(press("ArrowLeft")).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it("at the text's end → moves on, and ← there stays for the caret", () => {
    inLocale(<EdgeBar />);
    const { input, day } = controls();
    act(() => input.focus());
    input.setSelectionRange(input.value.length, input.value.length);
    expect(press("ArrowLeft")).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(press("ArrowRight")).toBe(false);
    // The SearchField's clear button may come first; the next → reaches the DateField.
    if (document.activeElement !== day) press("ArrowRight");
    expect(document.activeElement).toBe(day);
  });

  it("at the text's start ← moves back to the previous control", () => {
    inLocale(<EdgeBar />);
    const { input, filter } = controls();
    act(() => input.focus());
    input.setSelectionRange(0, 0);
    expect(press("ArrowLeft")).toBe(false);
    expect(document.activeElement).toBe(filter);
  });

  it("a selection (not collapsed) keeps both arrows, even one touching an edge", () => {
    inLocale(<EdgeBar />);
    const { input } = controls();
    act(() => input.focus());
    input.setSelectionRange(0, input.value.length);
    expect(press("ArrowLeft")).toBe(true);
    expect(press("ArrowRight")).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it("in RTL the edges follow the input's direction and the arrows are mirrored", () => {
    inLocale(
      <Toolbar aria-label="أدوات">
        <Button size="small">أ</Button>
        <SearchField aria-label="بحث" defaultValue="abc" />
        <Button size="small">ب</Button>
      </Toolbar>,
      "ar",
      "rtl",
    );
    const [first, last] = within(screen.getByRole("toolbar")).getAllByRole("button", { name: /^[أب]$/ });
    const input = screen.getByRole<HTMLInputElement>("searchbox", { name: "بحث" });
    // RTL: → is back. At the text's start it returns to the control before the field.
    act(() => input.focus());
    input.setSelectionRange(0, 0);
    expect(press("ArrowLeft")).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(press("ArrowRight")).toBe(false);
    expect(document.activeElement).toBe(first);
    // At the text's end ← (forward) moves on past the field.
    act(() => input.focus());
    input.setSelectionRange(3, 3);
    expect(press("ArrowRight")).toBe(true);
    expect(document.activeElement).toBe(input);
    press("ArrowLeft");
    if (document.activeElement !== last) press("ArrowLeft");
    expect(document.activeElement).toBe(last);
    // ← alone walks the whole bar from its first control, → alone walks it back.
    act(() => first!.focus());
    input.setSelectionRange(0, 0);
    expect(walk("ArrowLeft")).toEqual(expect.arrayContaining([first, input, last]));
    expect(document.activeElement).toBe(last);
    input.setSelectionRange(3, 3);
    walk("ArrowRight");
    expect(document.activeElement).toBe(first);
  });

  it("an input forced LTR in an RTL toolbar uses its own direction for the caret's edges", () => {
    inLocale(
      <Toolbar aria-label="أدوات">
        <Button size="small">أ</Button>
        <div dir="ltr">
          <SearchField aria-label="بحث" defaultValue="abc" />
        </div>
        <Button size="small">ب</Button>
      </Toolbar>,
      "ar",
      "rtl",
    );
    const input = screen.getByRole<HTMLInputElement>("searchbox", { name: "بحث" });
    act(() => input.focus());
    input.setSelectionRange(0, 0);
    // LTR field: ← is its back key, so at the start it leaves (to the control visually there, the next one in RTL).
    expect(press("ArrowRight")).toBe(true);
    expect(press("ArrowLeft")).toBe(false);
    expect(document.activeElement).not.toBe(input);
  });

  it("in RTL a date segment leaves the field only when no segment lies that way", () => {
    inLocale(
      <Toolbar aria-label="أدوات">
        <Button size="small">أ</Button>
        <DateField label="التاريخ" />
        <Button size="small">ب</Button>
      </Toolbar>,
      "ar",
      "rtl",
    );
    const field = document.querySelector<HTMLElement>("[data-slot='date-field']")!;
    const [first, last] = within(screen.getByRole("toolbar")).getAllByRole("button", { name: /^[أب]$/ });
    // Lay the segments out as an RTL line does: day at the inline start, year at the inline end.
    const x = { day: 200, month: 100, year: 0 } as const;
    for (const type of ["day", "month", "year"] as const) {
      vi.spyOn(segment(field, type), "getBoundingClientRect").mockReturnValue(new DOMRect(x[type], 0, 40, 20));
    }
    act(() => segment(field, "month").focus());
    // A segment lies each way: React Aria moves between them, the toolbar stays out.
    press("ArrowLeft");
    expect(document.activeElement).toBe(segment(field, "year"));
    // No segment further that way: the toolbar moves on to the next control.
    expect(press("ArrowLeft")).toBe(false);
    expect(document.activeElement).toBe(last);
    act(() => segment(field, "day").focus());
    expect(press("ArrowRight")).toBe(false);
    expect(document.activeElement).toBe(first);
  });

  it("a radio group and a slider keep ←/→ (they change the value)", async () => {
    const { RadioGroup, Radio, Slider } = await import("../selection/index");
    inLocale(
      <Toolbar aria-label="View">
        <Button size="small">Before</Button>
        <RadioGroup label="Density" defaultValue="a">
          <Radio value="a">A</Radio>
          <Radio value="b">B</Radio>
        </RadioGroup>
        <Slider label="Scale" defaultValue={50} />
        <Button size="small">After</Button>
      </Toolbar>,
    );
    const radio = screen.getByRole("radio", { name: "A" });
    act(() => radio.focus());
    expect(press("ArrowRight")).toBe(false);
    expect(document.activeElement?.closest("[role='radiogroup']")).not.toBeNull();
    const slider = screen.getByRole("slider");
    act(() => slider.focus());
    press("ArrowRight");
    expect(document.activeElement).toBe(slider);
  });
});

describe("Toolbar RTL segment hand-off steps from the segment group", () => {
  /** Renders [first][field][last] in an RTL locale and lays the field's segments out at the given x. */
  function rtlBar(field: React.ReactElement, locale: string, x: Record<string, number>) {
    inLocale(
      <Toolbar aria-label="أدوات">
        <Button size="small">أ</Button>
        {field}
        <Button size="small">ب</Button>
      </Toolbar>,
      locale,
      "rtl",
    );
    const group = document.querySelector<HTMLElement>("[data-slot='date-input']")!;
    for (const [type, start] of Object.entries(x)) {
      vi.spyOn(segment(group, type), "getBoundingClientRect").mockReturnValue(new DOMRect(start, 0, 40, 20));
    }
    const [first, last] = within(screen.getByRole("toolbar")).getAllByRole("button", { name: /^[أب]$/ });
    return { group, first: first!, last: last!, seg: (type: string) => segment(group, type) };
  }

  /** ← alone from the first control reaches the last one through the field, and → alone comes back. */
  function walksBothWays({ group, first, last }: { group: HTMLElement; first: HTMLElement; last: HTMLElement }) {
    act(() => first.focus());
    const forward = walk("ArrowLeft");
    expect(forward.at(-1)).toBe(last);
    expect(forward.some((element) => group.contains(element))).toBe(true);
    const back = walk("ArrowRight");
    expect(back.at(-1)).toBe(first);
    expect(back.some((element) => group.contains(element))).toBe(true);
  }

  it("an ar TimeField (laid out in DOM order): → on the minute, the rightmost segment, leaves backward", () => {
    // Times render LTR on an RTL page: hour:minute isolated, the day period after them on the line's end.
    const bar = rtlBar(<TimeField label="الوقت" />, "ar", { dayPeriod: 0, hour: 100, minute: 200 });
    act(() => bar.seg("minute").focus());
    expect(press("ArrowRight")).toBe(false);
    expect(document.activeElement).toBe(bar.first);
    // ← from the hour moves to the day period (next that way); from there it leaves forward.
    act(() => bar.seg("hour").focus());
    press("ArrowLeft");
    expect(document.activeElement).toBe(bar.seg("dayPeriod"));
    expect(press("ArrowLeft")).toBe(false);
    expect(document.activeElement).toBe(bar.last);
    walksBothWays(bar);
  });

  it("a he-IL date (laid out in DOM order): the visual edges hand off past the whole field", () => {
    const bar = rtlBar(<DateField label="תאריך" />, "he-IL", { day: 0, month: 100, year: 200 });
    // The day is the leftmost segment: ← leaves forward, not onto the month.
    act(() => bar.seg("day").focus());
    expect(press("ArrowLeft")).toBe(false);
    expect(document.activeElement).toBe(bar.last);
    // The year is the rightmost: → leaves backward, not onto the month.
    act(() => bar.seg("year").focus());
    expect(press("ArrowRight")).toBe(false);
    expect(document.activeElement).toBe(bar.first);
    // Inside, React Aria moves by position.
    act(() => bar.seg("month").focus());
    press("ArrowRight");
    expect(document.activeElement).toBe(bar.seg("year"));
    walksBothWays(bar);
  });

  it("an ar date (laid out reversed) still hands off at its visual edges and walks both ways", () => {
    const bar = rtlBar(<DateField label="التاريخ" />, "ar", { day: 200, month: 100, year: 0 });
    act(() => bar.seg("year").focus());
    expect(press("ArrowLeft")).toBe(false);
    expect(document.activeElement).toBe(bar.last);
    act(() => bar.seg("day").focus());
    expect(press("ArrowRight")).toBe(false);
    expect(document.activeElement).toBe(bar.first);
    walksBothWays(bar);
  });

  it("LTR hand-off from a segment also steps past the whole field", () => {
    inLocale(
      <Toolbar aria-label="Tools">
        <Button size="small">Before</Button>
        <TimeField label="Time" />
        <Button size="small">After</Button>
      </Toolbar>,
      "en-US",
    );
    const group = document.querySelector<HTMLElement>("[data-slot='date-input']")!;
    act(() => segment(group, "dayPeriod").focus());
    expect(press("ArrowRight")).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
    act(() => segment(group, "hour").focus());
    expect(press("ArrowLeft")).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Before" }));
  });
});

describe("Toolbar and inputs without a caret API", () => {
  function NumberBar({ value }: { value: string }) {
    return (
      <Toolbar aria-label="Tools">
        <Button size="small">Before</Button>
        <input aria-label="Quantity" type="number" defaultValue={value} />
        <Button size="small">After</Button>
      </Toolbar>
    );
  }

  it("an empty number input hands the arrows on (no caret to move)", () => {
    inLocale(<NumberBar value="" />);
    act(() => screen.getByRole("spinbutton", { name: "Quantity" }).focus());
    expect(press("ArrowRight")).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
  });

  it("a number input with a value keeps ←/→ for its caret (documented); Tab still leaves", () => {
    inLocale(<NumberBar value="12" />);
    const field = screen.getByRole("spinbutton", { name: "Quantity" });
    act(() => field.focus());
    expect(press("ArrowRight")).toBe(true);
    expect(press("ArrowLeft")).toBe(true);
    expect(document.activeElement).toBe(field);
    fireEvent.keyDown(field, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
  });
});
