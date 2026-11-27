import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Stat, StatGroup } from "./index";

afterEach(cleanup);
const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);

describe("Stat period", () => {
  it("sits beside the label; without period or help the label is as before", () => {
    inLocale(<Stat label="Revenue" value="$4,200" period="this month" />);
    const head = document.querySelector("[data-slot='stat-head']")!;
    expect(head.querySelector("[data-slot='stat-label']")!.textContent).toBe("Revenue");
    expect(head.querySelector("[data-slot='stat-period']")!.textContent).toBe(" · this month");
    cleanup();
    inLocale(<Stat label="Revenue" value="$4,200" />);
    expect(document.querySelector("[data-slot='stat-head']")).toBeNull();
    expect(document.querySelector("[data-slot='stat']")!.firstElementChild!.getAttribute("data-slot")).toBe("stat-label");
  });
});

describe("Stat help", () => {
  it("an info button named after the label opens the definition in a popover", () => {
    inLocale(<Stat label="MRR" value="$12,400" help="Monthly recurring revenue: active paid plans, normalised to a month." />);
    const button = screen.getByRole("button", { name: "About MRR" });
    act(() => fireEvent.click(button));
    const dialog = screen.getByRole("dialog", { name: "About MRR" });
    expect(within(dialog).getByText(/Monthly recurring revenue/)).toBeTruthy();
  });

  it("on a selectable tile the press target is a layer beside the help button, never around it", () => {
    const onSelectionChange = vi.fn();
    inLocale(
      <StatGroup aria-label="Metric" selectionMode="single" onSelectionChange={onSelectionChange}>
        <Stat id="mrr" label="MRR" value="$12,400" help="Monthly recurring revenue." />
        <Stat id="arr" label="ARR" value="$148,800" />
      </StatGroup>,
    );
    const radio = screen.getByRole("radio", { name: "MRR $12,400" });
    const help = screen.getByRole("button", { name: "About MRR" });
    expect(radio.contains(help)).toBe(false);
    expect(radio.getAttribute("data-slot")).toBe("stat-press");
    act(() => fireEvent.click(radio));
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(["mrr"]));
    // Opening the help does not select the tile.
    onSelectionChange.mockClear();
    act(() => fireEvent.click(help));
    expect(onSelectionChange).not.toHaveBeenCalled();
    // The wrapper shows the selected state of its layer.
    expect(radio.closest("[data-slot='stat']")!.className).toContain("has-[[data-slot=stat-press][data-selected]]:inset-ring-ds-border-selected");
  });

  it("on a link tile the link is a layer beside the help button", () => {
    inLocale(<Stat label="MRR" value="$12,400" href="/reports/mrr" help="Monthly recurring revenue." />);
    const link = screen.getByRole("link", { name: "MRR $12,400" });
    expect(link.contains(screen.getByRole("button", { name: "About MRR" }))).toBe(false);
    expect(link.getAttribute("href")).toBe("/reports/mrr");
  });
});
