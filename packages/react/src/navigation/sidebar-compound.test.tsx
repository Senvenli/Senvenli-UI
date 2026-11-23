import * as React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Sidebar, SidebarFooter, SidebarHeader, SidebarItem, SidebarSection, SidebarSubmenu } from "./index";

// Sidebar composed from parts: the same navigation as `items` + `sections`, built from children.

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-ds-sidebar");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const wrap = (ui: React.ReactElement) => <DesignSystemProvider navigate={() => {}}>{ui}</DesignSystemProvider>;

const composed = (
  <Sidebar currentKey="returns">
    <SidebarHeader>Acme</SidebarHeader>
    <SidebarItem id="home" label="Home" icon="house" href="/" />
    <SidebarSection id="sales" label="Sales">
      <SidebarItem id="orders" label="Orders" icon="shopping-cart" href="/orders" badge={{ value: 4 }} />
      <SidebarSubmenu id="after-sales" label="After sales" icon="package">
        <SidebarItem id="returns" label="Returns" href="/returns" />
        <SidebarItem id="claims" label="Claims" href="/claims" />
      </SidebarSubmenu>
    </SidebarSection>
    <SidebarFooter>Sofia Marin</SidebarFooter>
  </Sidebar>
);

const data = (
  <Sidebar
    currentKey="returns"
    brand="Acme"
    items={[{ id: "home", label: "Home", icon: "house", href: "/" }]}
    sections={[
      {
        id: "sales",
        label: "Sales",
        items: [
          { id: "orders", label: "Orders", icon: "shopping-cart", href: "/orders", badge: { value: 4 } },
          {
            id: "after-sales",
            label: "After sales",
            icon: "package",
            children: [
              { id: "returns", label: "Returns", href: "/returns" },
              { id: "claims", label: "Claims", href: "/claims" },
            ],
          },
        ],
      },
    ]}
    footer="Sofia Marin"
  />
);

describe("Sidebar composed from parts", () => {
  it("renders the same markup as items and sections", () => {
    const strip = (html: string) => html.replace(/(id|aria-labelledby|aria-controls|aria-describedby)="[^"]*"/g, "");
    expect(strip(renderToStaticMarkup(wrap(composed)))).toBe(strip(renderToStaticMarkup(wrap(data))));
  });

  it("marks the page, opens the submenu holding it and names the section", () => {
    render(wrap(composed));
    const nav = screen.getByRole("navigation", { name: "Main menu" });
    expect(within(nav).getByRole("link", { name: "Acme" })).toBeTruthy();
    expect(within(nav).getByRole("link", { name: "Returns" }).getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByRole("button", { name: "After sales" }).getAttribute("aria-expanded")).toBe("true");
    expect(within(nav).getByRole("group", { name: "Sales" })).toBeTruthy();
    expect(within(nav).getByText("Sofia Marin")).toBeTruthy();
  });

  it("takes isCurrent on an item instead of currentKey", () => {
    render(
      wrap(
        <Sidebar brand="Acme">
          <SidebarItem id="home" label="Home" icon="house" href="/" />
          <SidebarItem id="orders" label="Orders" icon="shopping-cart" href="/orders" isCurrent />
        </Sidebar>,
      ),
    );
    const nav = screen.getByRole("navigation", { name: "Main menu" });
    expect(within(nav).getByRole("link", { name: "Orders" }).getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBeNull();
  });

  it("says where a part belongs when it is used outside a Sidebar", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(wrap(<SidebarItem id="x" label="X" />))).toThrow("SidebarItem must be inside a Sidebar.");
  });
});
