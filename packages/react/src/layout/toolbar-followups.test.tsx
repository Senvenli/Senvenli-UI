import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { DateField, TimeField } from "../date/index";
import { DesignSystemProvider } from "../provider";
import { Toolbar } from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Presses a key on the focused element; returns false when a handler called preventDefault (the key was taken). */
function press(key: string) {
  const target = document.activeElement ?? document.body;
  const notPrevented = fireEvent.keyDown(target, { key });
  fireEvent.keyUp(target, { key });
  return notPrevented;
}

function segment(root: ParentNode, type: string) {
  return root.querySelector<HTMLElement>(`[data-slot='date-segment'][data-type='${type}']`)!;
}

/** Renders [first][field][last] and lays the field's segments out at the given x (jsdom has no layout). */
function bar(field: React.ReactElement, locale: string, x: Record<string, number>, dir?: "rtl") {
  render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>
        <Toolbar aria-label="Tools">
          <Button size="small">Before</Button>
          {field}
          <Button size="small">After</Button>
        </Toolbar>
      </DesignSystemProvider>
    </div>,
  );
  const group = document.querySelector<HTMLElement>("[data-slot='date-input']")!;
  for (const [type, start] of Object.entries(x)) {
    vi.spyOn(segment(group, type), "getBoundingClientRect").mockReturnValue(new DOMRect(start, 0, 40, 20));
  }
  const toolbar = screen.getByRole("toolbar");
  const domOrder = Array.from(group.querySelectorAll<HTMLElement>("[data-slot='date-segment'][tabindex]")).map((element) => element.dataset.type);
  return {
    first: within(toolbar).getByRole("button", { name: "Before" }),
    last: within(toolbar).getByRole("button", { name: "After" }),
    seg: (type: string) => segment(group, type),
    domOrder,
  };
}

describe("Toolbar: arrowing INTO a segment group in RTL lands on the visually nearest segment", () => {
  it("an ar TimeField (DOM order): ← from the start-side control focuses the start-most (rightmost) segment", () => {
    const b = bar(<TimeField label="الوقت" />, "ar", { dayPeriod: 0, hour: 100, minute: 200 }, "rtl");
    expect(b.domOrder).toEqual(["hour", "minute", "dayPeriod"]);
    act(() => b.first.focus());
    expect(press("ArrowLeft")).toBe(false);
    // The DOM-first segment is the hour, one segment in from the side focus entered.
    expect(document.activeElement).toBe(b.seg("minute"));
    // → from the end-side control focuses the end-most (leftmost) segment.
    act(() => b.last.focus());
    expect(press("ArrowRight")).toBe(false);
    expect(document.activeElement).toBe(b.seg("dayPeriod"));
  });

  it("a he-IL date (DOM order): the year from the start side, the day from the end side", () => {
    const b = bar(<DateField label="תאריך" />, "he-IL", { day: 0, month: 100, year: 200 }, "rtl");
    expect(b.domOrder).toEqual(["day", "month", "year"]);
    act(() => b.first.focus());
    expect(press("ArrowLeft")).toBe(false);
    expect(document.activeElement).toBe(b.seg("year"));
    act(() => b.last.focus());
    expect(press("ArrowRight")).toBe(false);
    expect(document.activeElement).toBe(b.seg("day"));
  });

  it("an ar date (laid out reversed): the day from the start side, the year from the end side", () => {
    const b = bar(<DateField label="التاريخ" />, "ar", { day: 200, month: 100, year: 0 }, "rtl");
    expect(b.domOrder).toEqual(["day", "month", "year"]);
    act(() => b.first.focus());
    expect(press("ArrowLeft")).toBe(false);
    expect(document.activeElement).toBe(b.seg("day"));
    act(() => b.last.focus());
    expect(press("ArrowRight")).toBe(false);
    expect(document.activeElement).toBe(b.seg("year"));
  });

  it("after entering, the arrows keep walking inside and leave at the far visual edge", () => {
    const b = bar(<DateField label="תאריך" />, "he-IL", { day: 0, month: 100, year: 200 }, "rtl");
    act(() => b.first.focus());
    press("ArrowLeft");
    expect(document.activeElement).toBe(b.seg("year"));
    // React Aria moves by position inside: year → month → day, then the toolbar hands off.
    press("ArrowLeft");
    expect(document.activeElement).toBe(b.seg("month"));
    press("ArrowLeft");
    expect(document.activeElement).toBe(b.seg("day"));
    expect(press("ArrowLeft")).toBe(false);
    expect(document.activeElement).toBe(b.last);
  });

  it("RTL segments without a layout (equal boxes) keep the DOM-order choice", () => {
    const b = bar(<DateField label="תאריך" />, "he-IL", { day: 0, month: 0, year: 0 }, "rtl");
    act(() => b.first.focus());
    press("ArrowLeft");
    expect(document.activeElement).toBe(b.seg("day"));
    act(() => b.last.focus());
    press("ArrowRight");
    expect(document.activeElement).toBe(b.seg("year"));
  });

  it("LTR is unchanged: DOM-first going forward, DOM-last going back, whatever the boxes say", () => {
    const b = bar(<TimeField label="Time" />, "en-US", { hour: 200, minute: 100, dayPeriod: 0 });
    expect(b.domOrder).toEqual(["hour", "minute", "dayPeriod"]);
    act(() => b.first.focus());
    expect(press("ArrowRight")).toBe(false);
    expect(document.activeElement).toBe(b.seg("hour"));
    act(() => b.last.focus());
    expect(press("ArrowLeft")).toBe(false);
    expect(document.activeElement).toBe(b.seg("dayPeriod"));
  });
});
