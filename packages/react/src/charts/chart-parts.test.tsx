import * as React from "react";
import { act, cleanup, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { Line, LineChart, Tooltip, XAxis } from "recharts";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import {
  CHART_NEUTRAL,
  ChartAnimation,
  ChartFrame,
  ChartLegend,
  ChartTooltip,
  chartColor,
  chartSeries,
  useChartAnimation,
  useChartDirection,
  useChartSeries,
} from "./index";

beforeAll(() => {
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
  // Recharts measures its container.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

type Month = { month: string; y2026: number; y2025: number };
const DATA: Month[] = [
  { month: "July", y2026: 52300, y2025: 46500 },
  { month: "August", y2026: 55000, y2025: 49200 },
  { month: "September", y2026: 41600, y2025: 37000 },
];
const euro = (value: number) => `€ ${(value / 1000).toFixed(1).replace(".", ",")}k`;
const TABLE = {
  caption: "Monthly revenue",
  rowKey: (row: Month) => row.month,
  columns: [
    { key: "month", header: "Month", isRowHeader: true },
    { key: "y2026", header: "2026", align: "end" as const, render: (row: Month) => euro(row.y2026) },
    { key: "y2025", header: "2025", align: "end" as const, render: (row: Month) => euro(row.y2025) },
  ],
  rows: DATA,
};

describe("chart series: lightness or pattern", () => {
  it("series 1 is the brand colour, comparison series are neutral, lines after the second are dashed", () => {
    expect(chartSeries(0)).toEqual({ color: "var(--ds-chart-1)" });
    expect(chartSeries(1, { isComparison: true })).toEqual({ color: CHART_NEUTRAL });
    expect(chartSeries(1, { kind: "line" }).strokeDasharray).toBeUndefined();
    expect(chartSeries(2, { kind: "line" }).strokeDasharray).toBe("6 4");
    expect(chartSeries(3, { kind: "line" }).strokeDasharray).toBe("2 3");
    expect(chartSeries(3, { kind: "area" }).strokeDasharray).toBeUndefined();
    expect(chartColor(5)).toBe("var(--ds-chart-1)");
    expect(chartColor(-1)).toBe("var(--ds-chart-5)");
  });
});

describe("ChartTooltip", () => {
  const payload = [
    { dataKey: "y2026", name: "y2026", value: 55000, color: "var(--ds-chart-1)" },
    { dataKey: "y2025", name: "y2025", value: 49200, color: CHART_NEUTRAL },
  ];

  it("the period as title, one row per series with its key and formatted value, and a change row by meaning", () => {
    inLocale(
      <ChartTooltip
        active
        payload={payload}
        label="August"
        labelFormatter={(label) => `${label} 2026`}
        labels={{ y2026: "2026", y2025: "2025" }}
        valueFormatter={euro}
        change={() => ({ label: "Change", value: "+11.8%", tone: "success" })}
      />,
    );
    const tooltip = document.querySelector("[data-slot='chart-tooltip']")!;
    expect(tooltip.firstElementChild!.textContent).toBe("August 2026");
    expect([...tooltip.querySelectorAll("[data-slot='chart-tooltip-row']")].map((row) => row.textContent)).toEqual(["2026€ 55,0k", "2025€ 49,2k"]);
    const change = tooltip.querySelector("[data-slot='chart-tooltip-change']")!;
    expect(change.textContent).toBe("Change+11.8%");
    expect(change.getAttribute("class")).toContain("text-ds-text-success");
  });

  it("renders nothing while inactive", () => {
    inLocale(<ChartTooltip active={false} payload={payload} label="August" />);
    expect(document.querySelector("[data-slot='chart-tooltip']")).toBeNull();
  });

  it("follows keyboard focus on data points in a Recharts chart", () => {
    inLocale(
      <LineChart width={400} height={200} data={DATA} accessibilityLayer>
        <XAxis dataKey="month" />
        <Line dataKey="y2026" isAnimationActive={false} />
        <Tooltip content={<ChartTooltip valueFormatter={euro} labels={{ y2026: "2026" }} />} isAnimationActive={false} />
      </LineChart>,
    );
    const surface = document.querySelector<HTMLElement>(".recharts-wrapper [tabindex='0'], .recharts-surface[tabindex='0']")!;
    expect(surface).toBeTruthy();
    act(() => surface.focus());
    fireEvent.keyDown(surface, { key: "ArrowRight" });
    expect(document.querySelector("[data-slot='chart-tooltip']")?.textContent).toMatch(/2026€ \d/);
  });
});

describe("ChartLegend and useChartSeries", () => {
  function Toggling() {
    const series = useChartSeries();
    return (
      <ChartLegend
        hidden={series.hidden}
        onToggle={series.toggle}
        items={[
          { key: "web", label: "Website", color: chartColor(0), kind: "area" },
          { key: "email", label: "Email", ...chartSeries(2, { kind: "line" }), kind: "line" },
        ]}
      />
    );
  }

  it("pressing a key hides its series (45%) and pressing again shows it", () => {
    inLocale(<Toggling />);
    const web = screen.getByRole("button", { name: "Website" });
    expect(web.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(web);
    expect(web.getAttribute("aria-pressed")).toBe("false");
    expect(web.getAttribute("class")).toContain("opacity-45");
    fireEvent.click(web);
    expect(web.getAttribute("aria-pressed")).toBe("true");
  });

  it("line series get a 2px line key, dashed like the line; others a 10px square", () => {
    inLocale(<Toggling />);
    const keys = [...document.querySelectorAll("[data-slot='chart-legend-key']")];
    expect(keys[0]!.getAttribute("data-kind")).toBe("area");
    expect(keys[0]!.getAttribute("class")).toContain("size-2.5");
    expect(keys[1]!.tagName.toLowerCase()).toBe("svg");
    expect(keys[1]!.querySelector("line")!.getAttribute("stroke-dasharray")).toBe("6 4");
  });

  it("without onToggle it is a static key list", () => {
    inLocale(<ChartLegend items={[{ key: "a", label: "Website", color: chartColor(0) }]} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Website")).toBeTruthy();
  });
});

describe("ChartFrame", () => {
  it("names the plot by the table's caption; collapsed, screen readers get a plain table and Tab never enters it", () => {
    inLocale(
      <>
        <ChartFrame height={200} dataTable={TABLE}>
          <div>plot</div>
        </ChartFrame>
        <button type="button">next</button>
      </>,
    );
    const plot = screen.getByRole("group", { name: "Monthly revenue" });
    expect(plot.getAttribute("data-slot")).toBe("chart-plot");
    expect(plot.hasAttribute("aria-hidden")).toBe(false);
    expect(plot.getAttribute("class")).toContain("[&_.recharts-surface:focus-visible]:outline-ds-border-focused");
    expect(plot.style.height).toBe("200px");
    // Collapsed: a plain table with its caption and every value, visually hidden, nothing focusable in it.
    const plain = screen.getByRole("table", { name: "Monthly revenue" });
    expect(plain.getAttribute("class")).toBe("sr-only");
    expect(within(plain).getAllByRole("row")).toHaveLength(4);
    expect(within(plain).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["July", "August", "September"]);
    expect(plain.querySelectorAll("[tabindex], a, button, input")).toHaveLength(0);
    expect(screen.queryByRole("grid")).toBeNull();
    const toggle = screen.getByRole("button", { name: "Show the data as a table" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBe(document.querySelector("[data-slot='chart-data-table']")!.id);
    // Shown: the interactive compact Table, and the toggle says so.
    fireEvent.click(toggle);
    expect(screen.getByRole("grid", { name: "Monthly revenue" })).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("button", { name: "Hide the table" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("the hidden table follows Table's row-header rule and keeps only text from render", () => {
    inLocale(
      <ChartFrame
        height={120}
        dataTable={{
          caption: "Monthly revenue",
          rowKey: (row: Month) => row.month,
          columns: [
            { key: "y2026", header: "2026", render: (row: Month) => <a href="#x">{row.y2026}</a> },
            { key: "month", header: "Month", isRowHeader: true },
          ],
          rows: DATA,
        }}
      >
        <div>plot</div>
      </ChartFrame>,
    );
    const plain = screen.getByRole("table");
    expect(within(plain).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["July", "August", "September"]);
    expect(plain.querySelector("a")).toBeNull();
    expect(within(plain).getAllByRole("cell")[0]!.textContent).toBe("52300");
  });

  it("loading and empty keep the legend's and the toggle's rows, so the frame does not jump when data arrives", () => {
    inLocale(
      <ChartFrame height={200} isLoading legend={<ChartLegend items={[{ key: "a", label: "Website", color: chartColor(0) }]} />} dataTable={TABLE}>
        <div>plot</div>
      </ChartFrame>,
    );
    const frame = document.querySelector("[data-slot='chart-frame']")!;
    const reserved = frame.firstElementChild!;
    expect(reserved.getAttribute("class")).toBe("invisible");
    expect(reserved.getAttribute("aria-hidden")).toBe("true");
    expect(reserved.hasAttribute("inert")).toBe(true);
    expect(frame.querySelector("[data-slot='chart-table-toggle-space']")!.getAttribute("class")).toBe("h-4");
  });

  it("while loading: a Skeleton at the chart's real size, no table toggle", () => {
    inLocale(
      <ChartFrame height={240} isLoading dataTable={TABLE}>
        <div>plot</div>
      </ChartFrame>,
    );
    const loading = document.querySelector<HTMLElement>("[data-slot='chart-loading']")!;
    expect(loading.style.height).toBe("240px");
    expect(loading.getAttribute("aria-busy")).toBe("true");
    expect(document.querySelector("[data-slot='chart-plot']")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("with nothing to draw: a compact EmptyState in the same space", () => {
    inLocale(
      <ChartFrame height={180} emptyMessage={{ title: "No data for this period", description: "The chart fills in after the first order." }} dataTable={{ ...TABLE, rows: [] }}>
        <div>plot</div>
      </ChartFrame>,
    );
    const empty = document.querySelector<HTMLElement>("[data-slot='chart-empty']")!;
    expect(empty.style.minHeight).toBe("180px");
    expect(empty.textContent).toContain("No data for this period");
    expect(document.querySelector("[data-slot='chart-plot']")).toBeNull();
  });
});

describe("useChartAnimation", () => {
  const wrapper =
    (isEnabled?: boolean) =>
    ({ children }: { children: React.ReactNode }) =>
      isEnabled === undefined ? <>{children}</> : <ChartAnimation isEnabled={isEnabled}>{children}</ChartAnimation>;

  it("animates by default, not inside ChartAnimation isEnabled={false}, and not under reduced motion", () => {
    expect(renderHook(() => useChartAnimation(), { wrapper: wrapper() }).result.current).toBe(true);
    expect(renderHook(() => useChartAnimation(), { wrapper: wrapper(false) }).result.current).toBe(false);
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
    expect(renderHook(() => useChartAnimation(), { wrapper: wrapper(true) }).result.current).toBe(false);
  });
});

describe("useChartDirection", () => {
  it("runs time from the right in RTL, with the value axis on the right", () => {
    const wrap = (locale: string) => ({ children }: { children: React.ReactNode }) => (
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{children}</DesignSystemProvider>
    );
    expect(renderHook(() => useChartDirection(), { wrapper: wrap("en") }).result.current).toEqual({ isRtl: false, reversed: false, valueAxis: "left" });
    expect(renderHook(() => useChartDirection(), { wrapper: wrap("ar-EG") }).result.current).toEqual({ isRtl: true, reversed: true, valueAxis: "right" });
  });
});
