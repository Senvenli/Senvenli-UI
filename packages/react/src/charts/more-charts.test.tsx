import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { ChartAnimation, DonutChart, GaugeChart, RadarChart, RadialChart, ScatterChart, Sparkline } from "./index";
import { sharesOf } from "./more-charts";

beforeAll(() => {
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
  // jsdom has no layout: the observer reports a 640×260 box, as a browser would for the chart's frame.
  globalThis.ResizeObserver = class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback([{ target, contentRect: { width: 640, height: 260, top: 0, left: 0, right: 640, bottom: 260, x: 0, y: 0 } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 640 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 260 });
});
afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(
    <DesignSystemProvider locale={locale} navigate={vi.fn()}>
      <ChartAnimation isEnabled={false}>{ui}</ChartAnimation>
    </DesignSystemProvider>,
  );
}

describe("sharesOf", () => {
  it("rounds to whole percentages that add up to exactly 100", () => {
    expect(sharesOf([1, 1, 1])).toEqual([34, 33, 33]);
    expect(sharesOf([52, 31, 17]).reduce((a, b) => a + b, 0)).toBe(100);
    expect(sharesOf([0, 0])).toEqual([0, 0]);
  });
});

describe("DonutChart", () => {
  const CHANNELS = [
    { name: "Email", value: 31 },
    { name: "Website", value: 52 },
    { name: "Store", value: 17 },
  ];

  it("shows the total as text in the centre and every part with an exact share, largest first", () => {
    inLocale(<DonutChart title="Channels" data={CHANNELS} centerLabel="orders" />);
    expect(document.querySelector("[data-slot='donut-center']")!.textContent).toBe("100orders");
    const items = [...document.querySelectorAll("[data-slot='donut-list'] li")].map((item) => item.textContent);
    expect(items).toEqual(["Website5252%", "Email3131%", "Store1717%"]);
    expect(document.querySelectorAll(".recharts-pie-sector")).toHaveLength(3);
  });

  it("folds parts past five into Other, with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(<DonutChart title="Products" data={["a", "b", "c", "d", "e", "f"].map((name, index) => ({ name, value: 10 - index }))} />);
    const names = [...document.querySelectorAll("[data-slot='donut-list'] li bdi:first-of-type")].map((name) => name.textContent);
    expect(names).toEqual(["a", "b", "c", "d", "Other"]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("gives screen readers the parts as a table with values and shares", () => {
    inLocale(<DonutChart title="Channels" data={CHANNELS} />);
    const table = screen.getByRole("table", { name: "Channels" });
    expect(within(table).getAllByRole("row")[1]!.textContent).toBe("Website5252%");
  });
});

describe("Gauge", () => {
  it("is a meter with the value and target in words, and draws the value and target tick", () => {
    inLocale(<GaugeChart title="Utilization" value={72} target={80} valueFormatter={(value) => `${value}%`} />);
    const meter = screen.getByRole("meter", { name: "Utilization" });
    expect(meter.getAttribute("aria-valuenow")).toBe("72");
    expect(meter.getAttribute("aria-valuemin")).toBe("0");
    expect(meter.getAttribute("aria-valuemax")).toBe("100");
    expect(meter.getAttribute("aria-valuetext")).toBe("72%, Target 80%");
    expect(document.querySelector("[data-slot='gauge-text']")!.textContent).toBe("72%");
    expect(document.querySelector("[data-slot='gauge-value']")!.getAttribute("stroke")).toBe("var(--ds-chart-1)");
    expect(document.querySelector("[data-slot='gauge-target']")!.getAttribute("stroke")).toBe("var(--ds-text)");
  });

  it("clamps a value outside the range", () => {
    inLocale(<GaugeChart title="Quota" value={130} />);
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("100");
  });

  it("fills from the inline start: mirrored in RTL, not in LTR", () => {
    const { unmount } = inLocale(<GaugeChart title="Utilization" value={40} />);
    expect(document.querySelector("[data-slot='gauge'] svg")!.getAttribute("class")).not.toContain("-scale-x-100");
    unmount();
    inLocale(<GaugeChart title="Utilization" value={40} />, "ar-AE");
    expect(document.querySelector("[data-slot='gauge'] svg")!.getAttribute("class")).toContain("-scale-x-100");
  });
});

describe("RadialChart", () => {
  it("draws two or three rings with a key list", () => {
    inLocale(<RadialChart title="Targets" data={[{ name: "Fulfilment", value: 72 }, { name: "Retention", value: 88 }]} />);
    expect([...document.querySelectorAll("[data-slot='radial-list'] li")].map((item) => item.textContent)).toEqual(["Fulfilment72%", "Retention88%"]);
    expect(screen.getByRole("table", { name: "Targets" })).toBeTruthy();
  });
});

describe("Sparkline", () => {
  it("is an image named by a text summary of the values, with the last point marked", () => {
    inLocale(<Sparkline data={[31, 42, 48, 37]} width={120} />);
    const image = screen.getByRole("img");
    expect(image.getAttribute("aria-label")).toBe("First 31, last 37; low 31, high 48");
    expect(document.querySelectorAll("[data-slot='sparkline-last']")).toHaveLength(1);
    expect(document.querySelector(".recharts-area-curve")!.getAttribute("stroke-width")).toBe("1.5");
  });

  it("takes the consumer's label, and draws bars", () => {
    inLocale(<Sparkline data={[3, 5, 2]} type="bar" width={120} aria-label="Revenue trend, last 3 months" />);
    expect(screen.getByRole("img", { name: "Revenue trend, last 3 months" })).toBeTruthy();
    expect(document.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(3);
  });
});

describe("ScatterChart", () => {
  type Product = { product: string; price: number; sellThrough: number; segment: string };
  const PRODUCTS: Product[] = [
    { product: "Desk lamp", price: 45, sellThrough: 82, segment: "home" },
    { product: "Floor lamp", price: 60, sellThrough: 74, segment: "home" },
    { product: "Office chair", price: 95, sellThrough: 40, segment: "office" },
  ];

  it("plots each item, names axes with units, and opens the item on press", () => {
    const onPointPress = vi.fn();
    inLocale(<ScatterChart title="Price and sell-through" data={PRODUCTS} name="product" x="price" y="sellThrough" xLabel="Unit price (€)" yLabel="Sell-through (%)" onPointPress={onPointPress} />);
    const points = document.querySelectorAll(".recharts-scatter-symbol");
    expect(points).toHaveLength(3);
    fireEvent.click(points[2]!.querySelector("path") ?? points[2]!);
    expect(onPointPress).toHaveBeenCalledWith(PRODUCTS[2]);
    expect([...document.querySelectorAll(".recharts-surface text")].map((text) => text.textContent)).toEqual(expect.arrayContaining(["Unit price (€)", "Sell-through (%)"]));
    expect(within(screen.getByRole("table")).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["Desk lamp", "Floor lamp", "Office chair"]);
  });

  it("opens the item from a row of the shown data table, so a keyboard gets there too", () => {
    const onPointPress = vi.fn();
    inLocale(<ScatterChart title="Price and sell-through" data={PRODUCTS} name="product" x="price" y="sellThrough" xLabel="Unit price (€)" yLabel="Sell-through (%)" onPointPress={onPointPress} />);
    fireEvent.click(screen.getByRole("button", { name: "Show the data as a table" }));
    const row = within(screen.getByRole("grid")).getAllByRole("row")[2]!;
    act(() => row.focus());
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyUp(row, { key: "Enter" });
    expect(onPointPress).toHaveBeenCalledWith(PRODUCTS[1]);
  });

  it("a second category differs by shape as well as hue; the trend line is dashed neutral", () => {
    inLocale(
      <ScatterChart
        title="Price and sell-through"
        data={PRODUCTS}
        name="product"
        x="price"
        y="sellThrough"
        xLabel="Price"
        yLabel="Sell-through"
        category={{ key: "segment", value: "office", label: "Office", otherLabel: "Home" }}
        trendLine
      />,
    );
    const scatters = [...document.querySelectorAll(".recharts-scatter")];
    expect(scatters).toHaveLength(2);
    expect(scatters[1]!.querySelector("path")!.getAttribute("fill")).toBe("var(--ds-chart-2)");
    const trend = document.querySelector(".recharts-line-curve")!;
    expect(trend.getAttribute("stroke")).toBe("var(--ds-chart-neutral)");
    expect(trend.getAttribute("stroke-dasharray")).toBe("6 4");
    expect(screen.getByRole("button", { name: "Office" })).toBeTruthy();
  });
});

describe("RadarChart", () => {
  type Score = { dimension: string; us: number; market: number };
  const SCORES: Score[] = ["Price", "Range", "Location", "Speed", "Rating"].map((dimension, index) => ({ dimension, us: 60 + index * 5, market: 55 + index * 3 }));

  it("main profile ds-chart-1 at 18%, comparison neutral at 12% and dashed, polygon gridlines", () => {
    inLocale(<RadarChart title="Competition" data={SCORES} dimension="dimension" categories={["us", "market"]} labels={{ us: "Us", market: "Market" }} max={100} />);
    const shapes = [...document.querySelectorAll(".recharts-radar-polygon path")];
    expect(shapes.map((shape) => [shape.getAttribute("stroke"), shape.getAttribute("fill-opacity"), shape.getAttribute("stroke-dasharray")])).toEqual([
      ["var(--ds-chart-1)", "0.18", null],
      ["var(--ds-chart-neutral)", "0.12", "6 4"],
    ]);
    expect(document.querySelectorAll(".recharts-polar-grid-concentric-polygon").length).toBeGreaterThanOrEqual(5);
    fireEvent.click(screen.getByRole("button", { name: "Market" }));
    expect(document.querySelectorAll(".recharts-radar-polygon")).toHaveLength(1);
  });
});

describe("keyboard on data points", () => {
  const surface = () => document.querySelector<HTMLElement>(".recharts-surface[tabindex='0']");

  it("RadarChart: arrows move the tooltip across dimensions", () => {
    const scores = ["Price", "Range", "Location", "Speed", "Rating"].map((dimension, index) => ({ dimension, us: 60 + index * 5 }));
    inLocale(<RadarChart title="Competition" data={scores} dimension="dimension" categories={["us"]} labels={{ us: "Us" }} max={100} />);
    act(() => surface()!.focus());
    fireEvent.keyDown(surface()!, { key: "ArrowRight" });
    expect(document.querySelector("[data-slot='chart-tooltip']")?.textContent).toMatch(/Us\d+/);
  });

  it("DonutChart: no empty tab stop on the ring; every part is in words", () => {
    inLocale(<DonutChart title="Channels" data={[{ name: "Website", value: 52 }, { name: "Email", value: 31 }]} />);
    expect(document.querySelectorAll("[data-slot='donut'] [tabindex='0']")).toHaveLength(0);
    expect(document.querySelector("[data-slot='donut-center']")!.textContent).toBe("83");
    expect(document.querySelector("[data-slot='donut-list']")!.textContent).toContain("Website");
  });

  it("DonutChart: the ring gives way on a narrow row so the names keep room", () => {
    const wide = inLocale(<DonutChart title="Channels" data={[{ name: "Website", value: 52 }]} />);
    expect((document.querySelector("[data-slot='donut'] > div") as HTMLElement).style.width).toBe("176px");
    wide.unmount();
    const observer = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback([{ target, contentRect: { width: 310.6, height: 200 } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    try {
      inLocale(<DonutChart title="Channels" data={[{ name: "Website", value: 52 }]} />);
      expect((document.querySelector("[data-slot='donut'] > div") as HTMLElement).style.width).toBe("118px");
    } finally {
      globalThis.ResizeObserver = observer;
    }
  });
});

describe("edges and tab stops", () => {
  it("Sparkline and RadialChart are no tab stops: nothing in them would show or announce", () => {
    inLocale(
      <>
        <Sparkline data={[3, 5, 4]} width={120} />
        <Sparkline data={[3, 5, 4]} type="bar" width={120} />
        <RadialChart title="Targets" data={[{ name: "Fulfilment", value: 72 }, { name: "Retention", value: 88 }]} />
      </>,
    );
    expect(document.querySelectorAll("[data-slot='sparkline'] [tabindex='0'], [data-slot='radial'] [tabindex='0']")).toHaveLength(0);
  });

  it("DonutChart: the ring still gives way when the data arrives after loading", () => {
    const observer = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback([{ target, contentRect: { width: 310, height: 200 } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    try {
      const data = [{ name: "Website", value: 52 }];
      const view = inLocale(<DonutChart title="Channels" data={data} isLoading />);
      view.rerender(
        <DesignSystemProvider locale="en" navigate={vi.fn()}>
          <ChartAnimation isEnabled={false}>
            <DonutChart title="Channels" data={data} />
          </ChartAnimation>
        </DesignSystemProvider>,
      );
      expect((document.querySelector("[data-slot='donut'] > div") as HTMLElement).style.width).toBe("118px");
    } finally {
      globalThis.ResizeObserver = observer;
    }
  });

  it("DonutChart: Other is the neutral series; negative and missing values are left out", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(<DonutChart title="Channels" data={["a", "b", "c", "d", "e", "f"].map((name, index) => ({ name, value: 60 - index * 10 }))} />);
    const swatches = [...document.querySelectorAll<HTMLElement>("[data-slot='donut-list'] li > span")].map((swatch) => swatch.style.background);
    expect(swatches[4]).toBe("var(--ds-chart-neutral)");
    cleanup();
    inLocale(<DonutChart title="Channels" data={[{ name: "a", value: 10 }, { name: "b", value: -4 }, { name: "c", value: Number.NaN }]} />);
    expect(document.querySelector("[data-slot='donut-center']")!.textContent).toBe("10");
    expect(document.querySelectorAll("[data-slot='donut-list'] li")).toHaveLength(1);
    warn.mockRestore();
  });

  it("Gauge: an empty range or a missing value draws no NaN", () => {
    inLocale(<GaugeChart title="Quota" value={Number.NaN} min={5} max={5} target={5} />);
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("5");
    expect(document.querySelector("[data-slot='gauge-target']")).toBeNull();
    expect(document.querySelector("[data-slot='gauge'] svg")!.innerHTML).not.toContain("NaN");
  });

  it("ScatterChart: an item without both measures is left off the plot and the table", () => {
    inLocale(<ScatterChart title="Price" data={[{ product: "A", price: 40, use: 80 }, { product: "B", price: Number.NaN, use: 70 }]} name="product" x="price" y="use" xLabel="Price" yLabel="Use" />);
    expect(document.querySelectorAll(".recharts-scatter-symbol")).toHaveLength(1);
    expect(within(screen.getByRole("table")).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["A"]);
  });
});

describe("missing values, warnings and the trend key", () => {
  it("Gauge: a missing value is said as missing, not as NaN", () => {
    inLocale(<GaugeChart title="Utilization" value={Number.NaN} />);
    expect(document.querySelector("[data-slot='gauge-text']")!.textContent).toBe("—");
    expect(screen.getByRole("meter").getAttribute("aria-valuetext")).toBe("No data for this period");
  });

  it("DonutChart: the five-part warning counts only the parts that are drawn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(<DonutChart title="Channels" data={[1, 2, 3, 4, 5].map((value) => ({ name: `p${value}`, value })).concat({ name: "x", value: Number.NaN })} />);
    expect(warn.mock.calls.some(([message]) => String(message).includes("at most five parts"))).toBe(false);
    warn.mockRestore();
  });

  it("ScatterChart: the trend line has a dashed key in the legend, which hides it", () => {
    inLocale(<ScatterChart title="Price" data={[{ product: "A", price: 40, use: 80 }, { product: "B", price: 60, use: 70 }]} name="product" x="price" y="use" xLabel="Price" yLabel="Use" trendLine />);
    const key = screen.getByRole("button", { name: /Trend/ });
    expect(key.querySelector("[data-kind='line'] line")!.getAttribute("stroke-dasharray")).toBe("6 4");
    expect(document.querySelector(".recharts-line")).not.toBeNull();
    fireEvent.click(key);
    expect(document.querySelector(".recharts-line")).toBeNull();
  });
});


describe("ScatterChart ticks and axis names measured at the 11px they are drawn at", () => {
  // Recharts sizes a tick or label for wrapping in a hidden span that takes only its style; the size was only in
  // the font-size attribute, so the span had the page's body size and ticks that fit at 11px wrapped.
  it("every tick of both axes, and both axis names, carry 11px in style and in the attribute", () => {
    const euro = (value: number) => `€ ${value.toLocaleString("en-US")}`;
    inLocale(
      <ScatterChart
        title="Price and revenue"
        data={[{ product: "A", price: 1_200_000, revenue: 41_000 }, { product: "B", price: 900_000, revenue: 58_000 }, { product: "C", price: 1_450_000, revenue: 27_000 }]}
        name="product"
        x="price"
        y="revenue"
        xLabel="Price (€)"
        yLabel="Revenue (€)"
        valueFormatters={{ x: euro, y: euro }}
      />,
    );
    const ticks = [...document.querySelectorAll<SVGTextElement>(".recharts-cartesian-axis-tick-value")];
    expect(document.querySelectorAll(".recharts-xAxis-tick-labels text").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".recharts-yAxis-tick-labels text").length).toBeGreaterThan(0);
    const names = [...document.querySelectorAll<SVGTextElement>(".recharts-label")];
    expect(names.map((name) => name.textContent)).toEqual(expect.arrayContaining(["Price (€)", "Revenue (€)"]));
    for (const text of [...ticks, ...names]) {
      expect(text.style.fontSize).toBe("11px");
      expect(text.getAttribute("font-size")).toBe("11");
    }
  });
});

describe("ScatterChart axes sized for their ticks", () => {
  // The y axis holds its turned name at its outer edge and its ticks 8px in from the plot: the longest tick's
  // estimated width (axis-width's textWidth), plus those 8px, plus 16px for the name, never under the 56px it had. Its tick's x (LTR) is the
  // chart's 8px margin plus that width less the 8px: the width itself. The x axis has no width to size: Recharts
  // lets an x tick run the plot's width before it wraps.
  const euro = (value: number) => `€ ${value.toLocaleString("en-US")}`;
  const yAxis = () => [...document.querySelectorAll(".recharts-yAxis-tick-labels text")];
  const yWidth = () => Number(yAxis()[0]!.getAttribute("x"));
  const scatter = (rows: { product: string; price: number; revenue: number }[]) => (
    <ScatterChart title="Price and revenue" data={rows} name="product" x="price" y="revenue" xLabel="Price (€)" yLabel="Revenue (€)" valueFormatters={{ x: euro, y: euro }} />
  );

  it("both axes: the y axis from its longest tick and its name, the x ticks from Recharts' own ticks", () => {
    inLocale(scatter([{ product: "A", price: 1_200_000, revenue: 41_000 }, { product: "B", price: 900_000, revenue: 58_000 }]));
    expect(yAxis().map((tick) => tick.textContent)).toEqual(["€ 0", "€ 15,000", "€ 30,000", "€ 45,000", "€ 60,000"]);
    // "€ 60,000": 50px in tabular figures.
    expect(yWidth()).toBe(50 + 8 + 16);
    expect([...document.querySelectorAll(".recharts-xAxis-tick-labels text")].map((tick) => tick.textContent)).toContain("€ 1,200,000");
    cleanup();
    inLocale(scatter([{ product: "A", price: 1_200_000, revenue: 1_100_000 }, { product: "B", price: 900_000, revenue: 1_450_000 }]));
    expect(yAxis().at(-1)!.textContent).toBe("€ 1,600,000");
    expect(yWidth()).toBe(68 + 8 + 16);
  });

  it("small figures keep the 56px y axis", () => {
    inLocale(scatter([{ product: "A", price: 54, revenue: 41 }, { product: "B", price: 61, revenue: 58 }]));
    expect(yWidth()).toBe(56);
  });
});
