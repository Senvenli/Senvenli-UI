import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Sidebar, type SidebarItemData, type SidebarSectionData } from "./index";

// Sidebar isFooterPinned: a sectioned sidebar keeps the account and the collapse toggle in view; only the
// navigation scrolls between the brand and them.

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-ds-sidebar");
});
afterEach(() => {
  cleanup();
  warn.mockRestore();
});

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

const TOP: SidebarItemData[] = [{ id: "dashboard", label: "Dashboard", icon: "layout-dashboard", href: "/" }];
const SECTIONS: SidebarSectionData[] = [
  { id: "work", label: "Work", items: [
    { id: "orders", label: "Orders", icon: "calendar-check", href: "/orders", badge: { value: 4 } },
    { id: "inbox", label: "Inbox", icon: "messages-square", href: "/inbox" },
  ] },
  { id: "catalog", label: "Catalog", items: [
    { id: "products", label: "Products", icon: "package", href: "/products" },
    { id: "locations", label: "Locations", icon: "map-pin", href: "/locations" },
  ] },
  { id: "management", label: "Management", items: [
    { id: "team", label: "Team", icon: "users", href: "/users" },
    { id: "config", label: "Configuration", icon: "settings", children: [{ id: "general", label: "General", href: "/settings" }] },
  ] },
];
const SETTINGS = { label: "Account", items: [{ id: "profile", label: "Profile", icon: "user" as const, href: "/profile" }] };
const LABELS = SECTIONS.map((section) => section.label);

function Panel(props: Partial<React.ComponentProps<typeof Sidebar>>) {
  return (
    <Sidebar brand={<span>Acme</span>} items={TOP} sections={SECTIONS} settings={SETTINGS} currentKey="products" footer={<button type="button">Ana Petrov</button>} {...props} />
  );
}

const sidebar = () => document.querySelector<HTMLElement>("[data-slot='sidebar']")!;
const desktop = () => screen.getByRole("navigation", { name: "Main menu" });
const slotOf = (element: Element) => element.getAttribute("data-slot") ?? element.tagName.toLowerCase();
const classes = (element: Element | null) => (element?.getAttribute("class") ?? "").split(" ");
const FOCUSABLE = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";
const stops = (root: Element) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((stop) => !stop.closest("[hidden]")).map((stop) => stop.getAttribute("aria-label") ?? stop.textContent);

describe("Sidebar isFooterPinned", () => {
  it("the nav is brand, the scrolling navigation, then the pinned account and toggle", () => {
    inLocale(<Panel isFooterPinned />);
    expect(sidebar().hasAttribute("data-footer-pinned")).toBe(true);
    expect([...sidebar().children].map(slotOf)).toEqual(["sidebar-brand", "sidebar-scroll", "div"]);
    // The nav itself no longer scrolls; the middle part does, and fills the room between brand and bottom.
    expect(classes(sidebar())).toContain("overflow-y-hidden");
    expect(classes(sidebar())).not.toContain("overflow-y-auto");
    const scroll = sidebar().querySelector("[data-slot='sidebar-scroll']")!;
    expect(classes(scroll)).toEqual(expect.arrayContaining(["min-h-0", "flex-1", "overflow-y-auto"]));
    // Every navigation group (the sections and the settings) scrolls; the account and the toggle do not.
    for (const label of [...LABELS, "Account"]) expect(scroll.contains(within(desktop()).getByRole("group", { name: label }))).toBe(true);
    const bottom = sidebar().lastElementChild!;
    expect([...bottom.children].map(slotOf)).toEqual(["sidebar-footer", "sidebar-toggle"]);
    expect(classes(bottom)).toContain("shrink-0");
    // Settings close the list: held at its bottom while the list is short.
    expect(classes(within(desktop()).getByRole("group", { name: "Account" }))).toContain("mt-auto");
  });

  it("keyboard: the Tab order is the same as without it (brand, items, sections, settings, account, toggle)", () => {
    inLocale(<Panel />);
    const before = stops(sidebar());
    cleanup();
    inLocale(<Panel isFooterPinned />);
    expect(stops(sidebar())).toEqual(before);
    expect(before).toEqual([
      "Acme", "Dashboard", "Orders4", "Inbox", "Products", "Locations", "Team", "Configuration", "Profile", "Ana Petrov", "Collapse menu",
    ]);
    // The scroll box is no stop of its own (its links are), and focus reaches the pinned account and toggle.
    expect(sidebar().querySelector("[data-slot='sidebar-scroll']")!.matches(FOCUSABLE)).toBe(false);
    const account = within(desktop()).getByRole("button", { name: "Ana Petrov" });
    act(() => account.focus());
    expect(document.activeElement).toBe(account);
  });

  it("screen readers: the same landmark, named groups and current page", () => {
    inLocale(<Panel isFooterPinned />);
    expect(desktop().tagName).toBe("NAV");
    for (const label of LABELS) expect(within(desktop()).getByRole("group", { name: label })).toBeTruthy();
    expect(within(desktop()).getByRole("link", { name: "Products" }).getAttribute("aria-current")).toBe("page");
    // The scroll box adds no role, landmark or name.
    const scroll = sidebar().querySelector("[data-slot='sidebar-scroll']")!;
    expect(scroll.getAttributeNames().sort()).toEqual(["class", "data-slot"]);
  });

  it("collapsed (own state): the toggle and account stay pinned, the scrollbar is hidden in the 56px rail, groups stay named", () => {
    inLocale(<Panel isFooterPinned />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse menu" }));
    expect(sidebar().hasAttribute("data-collapsed")).toBe(true);
    const scroll = sidebar().querySelector("[data-slot='sidebar-scroll']")!;
    expect(classes(scroll)).toContain("group-data-[collapsed]/sidebar:[scrollbar-width:none]");
    expect([...sidebar().lastElementChild!.children].map(slotOf)).toEqual(["sidebar-footer", "sidebar-toggle"]);
    for (const label of LABELS) expect(within(desktop()).getByRole("group", { name: label })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Expand menu" }));
    expect(sidebar().hasAttribute("data-collapsed")).toBe(false);
  });

  it("collapsed from a remembered choice (storageKey): the <html> attribute drives the same scroll classes, server and client", () => {
    window.localStorage.setItem("app-sidebar", "collapsed");
    inLocale(<Panel isFooterPinned storageKey="app-sidebar" />);
    expect(document.documentElement.getAttribute("data-ds-sidebar")).toBe("collapsed");
    expect(classes(sidebar().querySelector("[data-slot='sidebar-scroll']"))).toContain("[:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:[scrollbar-width:none]");
    const html = renderToStaticMarkup(
      <DesignSystemProvider locale="en" navigate={() => {}}>
        <Panel isFooterPinned storageKey="app-sidebar" />
      </DesignSystemProvider>,
    );
    expect(html).toContain('data-slot="sidebar-scroll"');
    expect(html).toContain("data-footer-pinned");
    expect(html).not.toContain("data-collapsed");
  });

  it("without sections or settings: brand, the item tree in the scroll box, then the bottom", () => {
    inLocale(<Panel sections={undefined} settings={undefined} isFooterPinned />);
    const scroll = sidebar().querySelector("[data-slot='sidebar-scroll']")!;
    expect([...scroll.children].map(slotOf)).toEqual(["sidebar-tree"]);
    expect(within(desktop()).queryAllByRole("group")).toHaveLength(0);
  });

  it("the phone panel: the list scrolls, the account stays below it; a link still closes the panel", async () => {
    const onMobileOpenChange = vi.fn();
    inLocale(<Panel isFooterPinned isMobileOpen onMobileOpenChange={onMobileOpenChange} />);
    const panel = await screen.findByRole("dialog", { name: "Main menu" });
    const nav = panel.querySelector("nav")!;
    expect(nav.hasAttribute("data-footer-pinned")).toBe(true);
    expect(classes(nav)).toContain("min-h-0");
    expect([...nav.children].map(slotOf)).toEqual(["sidebar-scroll", "sidebar-footer"]);
    const scroll = nav.firstElementChild!;
    expect(classes(scroll)).toEqual(expect.arrayContaining(["min-h-0", "flex-1", "overflow-y-auto"]));
    expect(classes(nav.lastElementChild)).toContain("shrink-0");
    for (const label of [...LABELS, "Account"]) expect(scroll.contains(within(panel).getByRole("group", { name: label }))).toBe(true);
    // Same order as without the option: close button, items, sections, settings, account.
    expect(stops(nav)).toEqual(["Dashboard", "Orders4", "Inbox", "Products", "Locations", "Team", "Configuration", "Profile", "Ana Petrov"]);
    fireEvent.click(within(panel).getByRole("link", { name: "Team" }));
    expect(onMobileOpenChange).toHaveBeenCalledWith(false);
  });

  it("a row Tab scrolls into view keeps its focus ring: both scroll boxes stop short of their edge by the inset (scroll padding)", () => {
    // Chromium scrolls a focused row's border box flush to the scrollport edge; the 2px ring outside it would be
    // clipped without a scroll padding as large as the box's own block padding.
    inLocale(<Panel isFooterPinned isMobileOpen />);
    const scrolls = [...document.querySelectorAll("[data-slot='sidebar-scroll']")];
    expect(scrolls).toHaveLength(2);
    for (const scroll of scrolls) expect(classes(scroll)).toEqual(expect.arrayContaining(["py-ds-050", "-my-ds-050", "scroll-py-ds-050"]));
  });

  it("RTL in he: logical sides only (the scroll box reaches over the padding with -mx/px), names kept", () => {
    inLocale(<Panel isFooterPinned />, "he", "rtl");
    const nav = screen.getByRole("navigation", { name: "Main menu" });
    for (const label of LABELS) expect(within(nav).getByRole("group", { name: label })).toBeTruthy();
    const check = () => {
      for (const element of document.querySelectorAll("[data-slot='sidebar-scroll'], [data-slot='sidebar'], [data-slot='sidebar-footer']")) {
        expect(element.getAttribute("class")).not.toMatch(PHYSICAL);
      }
    };
    check();
    cleanup();
    // The phone panel's scroll box too.
    inLocale(<Panel isFooterPinned isMobileOpen />, "he", "rtl");
    expect(document.querySelectorAll("[data-slot='sidebar-scroll']")).toHaveLength(2);
    check();
  });

  it("isFooterPinned={false} and left out render the same DOM as before (no scroll box, no attribute)", () => {
    const html = (props: Partial<React.ComponentProps<typeof Sidebar>>) =>
      renderToStaticMarkup(
        <DesignSystemProvider locale="en" navigate={() => {}}>
          <Panel isMobileOpen {...props} />
        </DesignSystemProvider>,
      );
    expect(html({ isFooterPinned: false })).toBe(html({}));
    inLocale(<Panel />);
    expect(sidebar().querySelector("[data-slot='sidebar-scroll']")).toBeNull();
    expect(sidebar().hasAttribute("data-footer-pinned")).toBe(false);
    expect(classes(sidebar())).toContain("overflow-y-auto");
  });
});
