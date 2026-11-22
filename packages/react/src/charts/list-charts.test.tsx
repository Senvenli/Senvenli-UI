import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { BarList, CalendarHeatmap, ChartAnimation, FunnelChart, Tracker } from "./index";
import { heatmapThresholds } from "./list-charts";

afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(
    <DesignSystemProvider locale={locale} navigate={vi.fn()}>
      <ChartAnimation isEnabled={false}>{ui}</ChartAnimation>
    </DesignSystemProvider>,
  );
}

const focused = () => document.activeElement as HTMLElement;

describe("BarList", () => {
  const REGIONS = [
    { name: "North Central", value: 57 },
    { name: "Capital Region", value: 148, href: "/regions/capital" },
    { name: "Coast", value: 13 },
    { name: "Western Region", value: 112 },
    { name: "Harbour", value: 26 },
    { name: "Islands", value: 7 },
  ];

  it("ranks largest first, with bars from the inline start relative to the top item", () => {
    inLocale(<BarList title="Orders by region" data={REGIONS} />);
    const rows = [...document.querySelectorAll("[data-slot='barlist-row']")];
    expect(rows.map((row) => row.textContent)).toEqual(["Capital Region148", "Western Region112", "North Central57", "Harbour26", "Coast13"]);
    const bars = rows.map((row) => row.querySelector<HTMLElement>("[data-slot='barlist-bar']")!);
    expect(bars[0]!.style.width).toBe("100%");
    expect(parseFloat(bars[1]!.style.width)).toBeCloseTo((112 / 148) * 100, 3);
    // A logical edge, so RTL mirrors without a branch.
    expect(bars[0]!.className).toContain("start-0");
  });

  it("a row with href is a link; the rest wait behind \"Show all\"", () => {
    inLocale(<BarList title="Orders by region" data={REGIONS} />);
    expect(screen.getByRole("link", { name: "Capital Region" }).getAttribute("href")).toBe("/regions/capital");
    const toggle = screen.getByRole("button", { name: "Show all (6)" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(document.querySelectorAll("[data-slot='barlist-row']")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Show fewer" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("gives screen readers every item in the data table, and has loading and empty states", () => {
    inLocale(<BarList title="Orders by region" data={REGIONS} />);
    expect(within(screen.getByRole("table")).getAllByRole("rowheader")).toHaveLength(6);
    cleanup();
    inLocale(<BarList title="Orders by region" data={REGIONS} isLoading />);
    expect(document.querySelector("[data-slot='chart-loading']")).not.toBeNull();
    cleanup();
    inLocale(<BarList title="Orders by region" data={[]} />);
    expect(document.querySelector("[data-slot='chart-empty']")).not.toBeNull();
  });
});

describe("CalendarHeatmap", () => {
  // 1–14 September 2026; the 1st is a Tuesday.
  const DAYS = Array.from({ length: 14 }, (_, index) => ({ date: `2026-09-${String(index + 1).padStart(2, "0")}`, value: [0, 2, 5, 9, 14, 3, 1, 8, 12, 20, 4, 0, 6, 11][index]! }));

  it("weeks start on the locale's first day: Monday in British English, Sunday in American English", () => {
    inLocale(<CalendarHeatmap title="Deliveries" data={DAYS} />, "en-GB");
    const firstCell = () => within(document.querySelector<HTMLElement>("[data-slot='heatmap-grid'] [role='row']")!).getAllByRole("gridcell")[0]!;
    // en-GB: Monday 31 August opens the grid, so the first row's first cell is empty and its second is 7 September.
    expect(firstCell().getAttribute("data-date")).toBe("2026-09-07");
    // Intl writes the weekday with or without a comma after it, by its CLDR version.
    expect(firstCell().getAttribute("aria-label")).toMatch(/^Monday,? 7 September 2026: 1$/);
    cleanup();
    inLocale(<CalendarHeatmap title="Deliveries" data={DAYS} />, "en-US");
    expect(firstCell().getAttribute("aria-label")).toBe("Sunday, September 6, 2026: 3");
  });

  it("names every day by date and value; steps differ in lightness and come from the data's quartiles", () => {
    inLocale(<CalendarHeatmap title="Deliveries" data={DAYS} thresholds={[1, 4, 8, 12]} />);
    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(14);
    const byDay = (day: number) => cells.find((cell) => cell.getAttribute("aria-label")!.includes(`, September ${day}, 2026: `))!;
    expect(byDay(1).getAttribute("aria-label")).toBe("Tuesday, September 1, 2026: 0");
    expect(byDay(1).getAttribute("data-level")).toBe("0");
    expect(byDay(2).getAttribute("data-level")).toBe("1");
    expect(byDay(8).getAttribute("data-level")).toBe("3");
    expect(byDay(10).getAttribute("data-level")).toBe("4");
    expect(byDay(10).style.background).toBe("var(--ds-chart-1)");
    expect(byDay(1).style.background).toBe("var(--ds-background-neutral)");
    expect(heatmapThresholds([0, 2, 4, 6, 8, Number.NaN])).toEqual([2, 4, 6, 8]);
  });

  it("one tab stop; arrows move a day (up, down) or a week (start, end, mirrored in RTL); Enter presses the day", () => {
    const onDayPress = vi.fn();
    inLocale(<CalendarHeatmap title="Deliveries" data={DAYS} onDayPress={onDayPress} />);
    const cells = screen.getAllByRole("gridcell");
    expect(cells.filter((cell) => cell.tabIndex === 0)).toHaveLength(1);
    const last = cells.find((cell) => cell.tabIndex === 0)!;
    expect(last.getAttribute("aria-label")).toMatch(/^Monday, September 14, 2026/);
    act(() => last.focus());
    fireEvent.keyDown(focused(), { key: "ArrowUp" });
    expect(focused().getAttribute("aria-label")).toMatch(/^Sunday, September 13, 2026/);
    fireEvent.keyDown(focused(), { key: "ArrowLeft" });
    expect(focused().getAttribute("aria-label")).toMatch(/^Sunday, September 6, 2026/);
    expect(document.querySelector("[data-slot='chart-detail']")!.textContent).toContain("Sep 6, 2026");
    fireEvent.keyDown(focused(), { key: "Enter" });
    expect(onDayPress).toHaveBeenCalledWith(expect.objectContaining({ value: 3 }));
    expect(onDayPress.mock.calls[0]![0].date.toString()).toBe("2026-09-06");
    cleanup();
    inLocale(<CalendarHeatmap title="Deliveries" data={DAYS} />, "ar-AE");
    const start = screen.getAllByRole("gridcell").find((cell) => cell.tabIndex === 0)!;
    act(() => start.focus());
    expect(start.getAttribute("data-date")).toBe("2026-09-14");
    // In RTL the weeks run right to left, so ArrowRight goes a week back.
    fireEvent.keyDown(focused(), { key: "ArrowRight" });
    expect(focused().getAttribute("data-date")).toBe("2026-09-07");
  });
});

describe("Tracker", () => {
  const STATUS = {
    ok: { tone: "success", label: "Operational" },
    slow: { tone: "warning", label: "Delayed" },
    down: { tone: "danger", label: "Outage" },
    none: { tone: "neutral", label: "No data" },
  } as const;
  const DAYS = ["ok", "ok", "slow", "ok", "down", "none", "ok"].map((status, index) => ({ date: `2026-09-0${index + 1}`, status, tooltip: status === "down" ? "42 min" : undefined }));

  it("states the result in words and names every colour, so colour never carries it alone", () => {
    inLocale(<Tracker title="Payments" data={DAYS} statusMap={STATUS} />);
    expect(document.querySelector("[data-slot='tracker-summary']")!.textContent).toBe("Operational 4 · Delayed 1 · Outage 1 · No data 1");
    expect(screen.getByRole("grid", { name: "Payments" }).getAttribute("aria-describedby")).toBe(document.querySelector("[data-slot='tracker-summary']")!.id);
    expect([...document.querySelectorAll("[data-slot='chart-legend']")[0]!.querySelectorAll("span:not([aria-hidden])")].map((item) => item.textContent)).toEqual(
      expect.arrayContaining(["Operational", "Delayed", "Outage", "No data"]),
    );
    const blocks = screen.getAllByRole("gridcell");
    expect(blocks[4]!.getAttribute("aria-label")).toBe("Saturday, September 5, 2026: Outage, 42 min");
    expect(blocks[4]!.style.background).toBe("var(--ds-icon-danger)");
  });

  it("takes the consumer's summary; one tab stop, arrows move along the strip, mirrored in RTL", () => {
    inLocale(<Tracker title="Payments" data={DAYS} statusMap={STATUS} summary="6 days operational, 1 outage" />);
    expect(document.querySelector("[data-slot='tracker-summary']")!.textContent).toBe("6 days operational, 1 outage");
    const blocks = screen.getAllByRole("gridcell");
    expect(blocks.filter((block) => block.tabIndex === 0)).toEqual([blocks[6]]);
    act(() => blocks[6]!.focus());
    fireEvent.keyDown(focused(), { key: "ArrowLeft" });
    expect(focused()).toBe(blocks[5]);
    fireEvent.keyDown(focused(), { key: "Home" });
    expect(focused()).toBe(blocks[0]);
    cleanup();
    inLocale(<Tracker title="Payments" data={DAYS} statusMap={STATUS} />, "ar-AE");
    const rtl = screen.getAllByRole("gridcell");
    act(() => rtl[6]!.focus());
    fireEvent.keyDown(focused(), { key: "ArrowRight" });
    expect(focused()).toBe(rtl[5]);
  });
});

describe("Funnel", () => {
  const STEPS = [
    { name: "Search", value: 4820 },
    { name: "Product selected", value: 2140 },
    { name: "Checkout", value: 812 },
  ];

  it("shows every count and step conversion as text, and the total conversion in the subtitle", () => {
    inLocale(<FunnelChart title="Order funnel" period="September" steps={STEPS} valueFormatter={(value) => new Intl.NumberFormat("en-US").format(value)} />);
    const steps = [...document.querySelectorAll("[data-slot='funnel-step']")];
    expect(steps.map((step) => step.textContent)).toEqual(["Search4,820", "Product selected2,14044%", "Checkout81238%"]);
    expect(document.querySelector("[data-slot='chart-header']")!.textContent).toContain("September · Conversion 16.8%");
    const bars = steps.map((step) => step.querySelector<HTMLElement>("[data-slot='funnel-bar']")!);
    expect(bars[0]!.style.opacity).toBe("1");
    expect(bars[1]!.style.opacity).toBe("0.88");
    expect(within(screen.getByRole("table")).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["Search", "Product selected", "Checkout"]);
  });

  it("no tab stops in a figure with nothing to act on; warns when a step outgrows the one before", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(<FunnelChart title="Funnel" steps={[{ name: "a", value: 10 }, { name: "b", value: 12 }]} showStepConversion={false} showTotalConversion={false} />);
    expect(document.querySelectorAll("[data-slot='funnel'] [tabindex]")).toHaveLength(0);
    expect(document.querySelector("[data-slot='funnel-conversion']")).toBeNull();
    expect(warn.mock.calls.some(([message]) => String(message).includes("subset"))).toBe(true);
    warn.mockRestore();
  });
});

describe("ChartFrame's hidden table", () => {
  it("stays clipped inside the frame while collapsed, so a long caption cannot widen the page", () => {
    inLocale(<FunnelChart title="Order funnel" period="September 2026 · website · every device and every channel" steps={[{ name: "Search", value: 10 }, { name: "Checkout", value: 4 }]} />);
    const box = document.querySelector<HTMLElement>("[data-slot='chart-data-table']")!;
    expect(box.className).toContain("overflow-hidden");
    expect(box.className).toContain("relative");
    fireEvent.click(screen.getByRole("button", { name: "Show the data as a table" }));
    expect(box.className).not.toContain("overflow-hidden");
  });
});

describe("late data, unmapped statuses and edge values", () => {
  const wrap = (ui: React.ReactElement) => (
    <DesignSystemProvider locale="en" navigate={vi.fn()}>
      <ChartAnimation isEnabled={false}>{ui}</ChartAnimation>
    </DesignSystemProvider>
  );
  const DAYS = Array.from({ length: 14 }, (_, index) => ({ date: `2026-09-${String(index + 1).padStart(2, "0")}`, value: index + 1 }));

  it("the tab stop is the latest day or block also when the data arrives after loading", () => {
    const heat = render(wrap(<CalendarHeatmap title="Deliveries" data={[]} isLoading />));
    heat.rerender(wrap(<CalendarHeatmap title="Deliveries" data={DAYS} />));
    expect(screen.getAllByRole("gridcell").find((cell) => cell.tabIndex === 0)!.getAttribute("data-date")).toBe("2026-09-14");
    expect(document.querySelector("[data-slot='chart-detail']")!.textContent).toContain("Sep 14, 2026");
    cleanup();
    const STATUS = { ok: { tone: "success", label: "Operational" } } as const;
    const track = render(wrap(<Tracker title="Payments" data={[]} statusMap={STATUS} isLoading />));
    track.rerender(wrap(<Tracker title="Payments" data={DAYS.map((day) => ({ date: day.date, status: "ok" }))} statusMap={STATUS} />));
    const blocks = screen.getAllByRole("gridcell");
    expect(blocks.findIndex((block) => block.tabIndex === 0)).toBe(13);
  });

  it("Tracker: a status missing from statusMap is named in the summary and the legend", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(<Tracker title="Payments" data={[{ date: "2026-09-01", status: "ok" }, { date: "2026-09-02", status: "maintenance" }]} statusMap={{ ok: { tone: "success", label: "Operational" } }} />);
    expect(document.querySelector("[data-slot='tracker-summary']")!.textContent).toBe("Operational 1 · maintenance 1");
    expect(document.querySelector("[data-slot='chart-legend']")!.textContent).toContain("maintenance");
    warn.mockRestore();
  });

  it("an ISO date-time counts as its date; default steps come from the shown days' quartiles", () => {
    inLocale(<CalendarHeatmap title="Deliveries" data={[{ date: "2026-09-01T00:00:00.000Z", value: 2 }, { date: "2026-09-02", value: 8 }, { date: "2026-09-03", value: 4 }, { date: "2026-09-04", value: 6 }]} />);
    const level = (date: string) => document.querySelector(`[data-date='${date}']`)!.getAttribute("data-level");
    // Quartile bounds of 2, 4, 6, 8: [2, 4, 6, 8].
    expect([level("2026-09-01"), level("2026-09-03"), level("2026-09-04"), level("2026-09-02")]).toEqual(["1", "2", "3", "4"]);
  });

  it("Space in the grid never scrolls the page; BarList treats a NaN limit as the default", () => {
    inLocale(<CalendarHeatmap title="Deliveries" data={DAYS} />);
    const cell = screen.getAllByRole("gridcell").find((candidate) => candidate.tabIndex === 0)!;
    act(() => cell.focus());
    expect(fireEvent.keyDown(cell, { key: " " })).toBe(false);
    cleanup();
    inLocale(<BarList title="List" data={DAYS.map((day) => ({ name: day.date, value: day.value }))} limit={Number.NaN} />);
    expect(document.querySelectorAll("[data-slot='barlist-row']")).toHaveLength(5);
  });
});

describe("unmapped status colour and hover re-renders", () => {
  it("Tracker: an unmapped status is hatched, never the mapped neutral's colour", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(<Tracker title="Payments" data={[{ date: "2026-09-01", status: "none" }, { date: "2026-09-02", status: "maintenance" }]} statusMap={{ none: { tone: "neutral", label: "No data" } }} />);
    const [mapped, unmapped] = screen.getAllByRole("gridcell");
    expect(mapped!.style.background).toBe("var(--ds-background-neutral-pressed)");
    expect(unmapped!.style.background).toContain("repeating-linear-gradient");
    warn.mockRestore();
  });

  it("CalendarHeatmap: a hover re-renders only the cells it changes", () => {
    const DAYS = Array.from({ length: 28 }, (_, index) => ({ date: `2026-09-${String(index + 1).padStart(2, "0")}`, value: index }));
    inLocale(<CalendarHeatmap title="Deliveries" data={DAYS} />);
    const cells = screen.getAllByRole("gridcell");
    const before = new Map(cells.map((cell) => [cell, cell.getAttribute("aria-label")]));
    fireEvent.mouseEnter(cells[3]!);
    // Same nodes, same names.
    expect(screen.getAllByRole("gridcell").every((cell) => before.get(cell) === cell.getAttribute("aria-label"))).toBe(true);
    // The hovered day becomes the active one: its tab stop moves there, and only there.
    expect(screen.getAllByRole("gridcell").filter((cell) => cell.tabIndex === 0)).toEqual([cells[3]]);
  });
});
