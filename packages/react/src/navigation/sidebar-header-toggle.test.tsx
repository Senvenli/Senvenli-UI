import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Sidebar } from "./index";

afterEach(cleanup);
const inLocale = (ui: React.ReactElement, locale = "en") => render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);

const shell = (props: Partial<React.ComponentProps<typeof Sidebar>> = {}) => (
  <Sidebar
    brand="Acme"
    logo={<span>A</span>}
    items={[{ id: "home", label: "Home", icon: "house", href: "#" }]}
    footer={<span>Sofia Marin</span>}
    togglePlacement="header"
    {...props}
  />
);

describe("Sidebar togglePlacement header", () => {
  it("puts the toggle at the end of the brand row, not in the bottom row", () => {
    inLocale(shell());
    const nav = document.querySelector<HTMLElement>('[data-slot="sidebar"]')!;
    const header = nav.querySelector<HTMLElement>('[data-slot="sidebar-header"]')!;
    expect(header.querySelector('[data-slot="sidebar-brand"]')).not.toBeNull();
    const toggle = header.querySelector('[data-slot="sidebar-toggle"] button')!;
    expect(toggle.getAttribute("aria-label")).toBe("Collapse menu");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    // The brand comes first, the toggle after it, in the DOM (and so the Tab order).
    expect(header.lastElementChild!.getAttribute("data-slot")).toBe("sidebar-toggle");
    // Only one toggle: none is left in the bottom row.
    expect(nav.querySelectorAll('[data-slot="sidebar-toggle"]')).toHaveLength(1);
  });

  it("collapsed: the brand is hidden and the toggle, now Expand, takes its place in the centre", () => {
    inLocale(shell({ defaultCollapsed: true }));
    const header = document.querySelector<HTMLElement>('[data-slot="sidebar-header"]')!;
    expect(header.className).toContain("group-data-[collapsed]/sidebar:justify-center");
    expect(header.querySelector('[data-slot="sidebar-brand"]')!.parentElement!.className).toContain("group-data-[collapsed]/sidebar:hidden");
    const toggle = screen.getByRole("button", { name: "Expand menu" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Collapse menu" })).toBeTruthy();
  });

  it("without a footer, no empty bottom row is left", () => {
    inLocale(shell({ footer: undefined }));
    const nav = document.querySelector<HTMLElement>('[data-slot="sidebar"]')!;
    expect(nav.querySelector('[data-slot="sidebar-footer"]')).toBeNull();
    expect(nav.lastElementChild!.getAttribute("data-slot")).not.toBe(null);
  });

  it("footer stays the default", () => {
    inLocale(shell({ togglePlacement: undefined }));
    expect(document.querySelector('[data-slot="sidebar-header"]')).toBeNull();
    expect(document.querySelectorAll('[data-slot="sidebar-toggle"]')).toHaveLength(1);
  });
});
