import * as React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { FunnelChart } from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en">{ui}</DesignSystemProvider>);
const STEPS = [
  { name: "Visitors", value: 12000, group: "Website" },
  { name: "Pricing views", value: 2400, group: "Website" },
  { name: "Signups", value: 3100, group: "Signups" },
  { name: "Trials", value: 900, group: "Signups" },
  { name: "Paid", value: 210, group: "Signups" },
];

describe("FunnelChart groups", () => {
  it("each group is a named list; steps keep their order", () => {
    inLocale(<FunnelChart aria-label="Visitor to paid" steps={STEPS} />);
    const website = screen.getByRole("list", { name: "Website" });
    const signups = screen.getByRole("list", { name: "Signups" });
    expect(within(website).getAllByRole("listitem").map((item) => item.querySelector("[data-slot='funnel-name']")!.textContent)).toEqual(["Visitors", "Pricing views"]);
    expect(within(signups).getAllByRole("listitem")).toHaveLength(3);
  });

  it("no step conversion where a group starts; within a group it stays", () => {
    inLocale(<FunnelChart aria-label="Visitor to paid" steps={STEPS} />);
    const conversionOf = (name: string) =>
      [...document.querySelectorAll("[data-slot='funnel-step']")].find((step) => step.querySelector("[data-slot='funnel-name']")!.textContent === name)!.querySelector("[data-slot='funnel-conversion']")?.textContent;
    expect(conversionOf("Pricing views")).toBe("20%");
    expect(conversionOf("Signups")).toBeUndefined();
    expect(conversionOf("Trials")).toBe("29%");
  });

  it("groups and scale='max' drop the subset warning; a strict funnel keeps it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(<FunnelChart aria-label="Grouped" steps={STEPS} />);
    inLocale(<FunnelChart aria-label="Max" scale="max" steps={STEPS.map(({ group: _group, ...step }) => step)} />);
    expect(warn).not.toHaveBeenCalled();
    inLocale(<FunnelChart aria-label="Strict" steps={STEPS.map(({ group: _group, ...step }) => step)} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("subset"));
  });

  it("scale='max' measures bars against the largest step", () => {
    inLocale(<FunnelChart aria-label="Max" scale="max" steps={[{ name: "A", value: 50 }, { name: "B", value: 100 }]} />);
    const bars = [...document.querySelectorAll<HTMLElement>("[data-slot='funnel-bar']")].map((bar) => bar.style.width);
    // The browser writes the calc() back as "calc(<ratio> * (100% - 7.5rem))".
    expect(bars[0]).toMatch(/calc\(0\.5 \*/);
    expect(bars[1]).toMatch(/calc\(1 \*|calc\(100% - 7\.5rem\)/);
  });

  it("without groups the markup is as before", () => {
    inLocale(<FunnelChart aria-label="Plain" steps={[{ name: "A", value: 100 }, { name: "B", value: 40 }]} />);
    expect(document.querySelector("[data-slot='funnel-group']")).toBeNull();
    expect(document.querySelector("[data-slot='funnel']")!.children[0]!.getAttribute("data-slot")).toBe("funnel-step");
  });
});
