import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { ChartAnimation, FlowChart } from "./index";

beforeAll(() => {
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
  globalThis.ResizeObserver = class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback([{ target, contentRect: { width: 640, height: 320, top: 0, left: 0, right: 640, bottom: 320, x: 0, y: 0 } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 640 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 320 });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const inLocale = (ui: React.ReactElement, locale = "en") =>
  render(
    <DesignSystemProvider locale={locale} navigate={vi.fn()}>
      <ChartAnimation isEnabled={false}>{ui}</ChartAnimation>
    </DesignSystemProvider>,
  );
const NODES = [
  { id: "home", label: "Home" },
  { id: "pricing", label: "Pricing" },
  { id: "docs", label: "Docs" },
  { id: "signup", label: "Signup" },
  { id: "unused", label: "Unused" },
];
const LINKS = [
  { source: "home", target: "pricing", value: 300 },
  { source: "home", target: "docs", value: 100 },
  { source: "pricing", target: "signup", value: 120 },
  { source: "docs", target: "signup", value: 40 },
];
const nodes = () => [...document.querySelectorAll<SVGGElement>("[data-slot='flow-node']")];

describe("FlowChart", () => {
  it("draws a node per used step and a band per flow; each node is named with its count and where it leads", () => {
    inLocale(<FlowChart title="Journeys" nodes={NODES} links={LINKS} />);
    expect(nodes()).toHaveLength(4);
    expect(document.querySelectorAll("[data-slot='flow-link']")).toHaveLength(4);
    expect(screen.getByRole("img", { name: "Home: 400. To Pricing 300, Docs 100" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Signup: 160" })).toBeTruthy();
  });

  it("one tab stop; the arrow keys move along a column and across columns, lighting the focused node's flows", () => {
    inLocale(<FlowChart title="Journeys" nodes={NODES} links={LINKS} />);
    expect(nodes().filter((node) => node.getAttribute("tabindex") === "0")).toHaveLength(1);
    const home = screen.getByRole("img", { name: /^Home/ });
    act(() => home.focus());
    expect(document.querySelectorAll("[data-slot='flow-link'][data-lit]")).toHaveLength(2);
    fireEvent.keyDown(home, { key: "ArrowRight" });
    expect(document.activeElement?.getAttribute("aria-label")).toMatch(/^(Pricing|Docs)/);
    const second = document.activeElement as SVGGElement;
    fireEvent.keyDown(second, { key: second.getAttribute("aria-label")!.startsWith("Pricing") ? "ArrowDown" : "ArrowUp" });
    expect(document.activeElement).not.toBe(second);
    expect(document.activeElement?.getAttribute("aria-label")).toMatch(/^(Pricing|Docs)/);
  });

  it("the table lists every flow as From, To, Value", () => {
    inLocale(<FlowChart title="Journeys" nodes={NODES} links={LINKS} defaultTableOpen />);
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["From", "To", "Value"]);
    expect(screen.getAllByRole("row")).toHaveLength(5);
  });

  it("warns and leaves out bad links; a cycle draws nothing (the table still lists the flows)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(<FlowChart title="Bad" nodes={NODES} links={[...LINKS, { source: "home", target: "nowhere", value: 5 }, { source: "docs", target: "docs", value: 3 }]} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("left out"));
    expect(document.querySelectorAll("[data-slot='flow-link']")).toHaveLength(4);
    cleanup();
    inLocale(<FlowChart title="Loop" nodes={NODES} links={[{ source: "home", target: "docs", value: 2 }, { source: "docs", target: "home", value: 1 }]} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("loop"));
    expect(nodes()).toHaveLength(0);
  });

  it("mirrors in RTL: the plot flips and the arrow keys follow the reading direction", () => {
    inLocale(<FlowChart title="Journeys" nodes={NODES} links={LINKS} />, "ar-AE");
    expect(document.querySelector("[data-slot='flow-chart']")!.className).toContain("-scale-x-100");
    const home = nodes().find((node) => node.getAttribute("aria-label")!.includes("300"))!;
    act(() => home.focus());
    fireEvent.keyDown(home, { key: "ArrowLeft" });
    expect(document.activeElement).not.toBe(home);
  });
});
