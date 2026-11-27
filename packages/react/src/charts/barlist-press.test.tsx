import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { BarList } from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);

const DATA = Array.from({ length: 7 }, (_, i) => ({ id: `c${i}`, name: `Country ${i}`, value: 70 - i * 10, secondaryValue: `${10 - i}%` }));

it("onRowPress makes each row a button; selectedIds marks it pressed, not by colour alone", () => {
  const onRowPress = vi.fn();
  inLocale(<BarList title="Countries" data={DATA} onRowPress={onRowPress} selectedIds={["c1"]} />);
  const row = screen.getByRole("button", { name: /Country 1/ });
  expect(row.getAttribute("aria-pressed")).toBe("true");
  expect(row.className).toContain("inset-ring-ds-border-selected");
  expect(screen.getByRole("button", { name: /Country 0/ }).getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: /Country 2/ }));
  expect(onRowPress).toHaveBeenCalledWith(DATA[2]);
});

it("a selected row beyond the limit stays in view while collapsed", () => {
  inLocale(<BarList title="Countries" data={DATA} limit={3} onRowPress={() => {}} selectedIds={["c6"]} />);
  const names = [...document.querySelectorAll('[data-slot="barlist-name"]')].map((n) => n.textContent);
  expect(names).toEqual(["Country 0", "Country 1", "Country 2", "Country 6"]);
});

it("secondaryValue shows before the value", () => {
  inLocale(<BarList title="Countries" data={DATA.slice(0, 2)} />);
  const row = document.querySelector('[data-slot="barlist-row"]')!;
  expect(row.querySelector('[data-slot="barlist-secondary"]')!.textContent).toBe("10%");
});

it("href and onRowPress: the press wins, the link is dropped, a dev warning says so", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  inLocale(<BarList title="Pages" data={[{ name: "/home", value: 3, href: "/home" }]} onRowPress={() => {}} />);
  expect(document.querySelector('[data-slot="barlist-link"]')).toBeNull();
  expect(warn).toHaveBeenCalled();
});

it("without onRowPress, rows are not buttons and links still work", () => {
  inLocale(<BarList title="Pages" data={[{ name: "/home", value: 3, href: "/home" }]} />);
  expect(screen.queryByRole("button", { name: /home/ })).toBeNull();
  expect(screen.getByRole("link", { name: "/home" })).toBeTruthy();
});
