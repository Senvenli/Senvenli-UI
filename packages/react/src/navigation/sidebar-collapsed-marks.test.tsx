import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Sidebar, SidebarFooter, SidebarHeader, SidebarItem } from "./index";

// `logo` and `avatar`: the marks the collapsed rail shows alone, with the brand name and the account beside them.

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
const items = [{ id: "home", label: "Home", icon: "house", href: "/" }];
const rail = () => document.querySelector<HTMLElement>("nav[data-slot=sidebar]")!;

describe("Sidebar logo and avatar", () => {
  it("renders the logo before the brand name, which stays the link's name and is visually hidden collapsed", () => {
    render(wrap(<Sidebar items={items} logo={<svg data-testid="logo" />} brand="Acme" defaultCollapsed />));
    const brand = rail().querySelector<HTMLElement>("[data-slot=sidebar-brand]")!;
    expect(brand.querySelector("[data-slot=sidebar-brand-logo] [data-testid=logo]")).not.toBeNull();
    const name = brand.querySelector<HTMLElement>("[data-slot=sidebar-brand-name]")!;
    expect(name.textContent).toBe("Acme");
    expect(name.className).toContain("group-data-[collapsed]/sidebar:sr-only");
    expect(brand.className).toContain("group-data-[collapsed]/sidebar:justify-center");
    expect(brand.textContent).toBe("Acme");
  });

  it("renders the avatar before the account, whose content is hidden collapsed", () => {
    render(wrap(<Sidebar items={items} avatar={<span data-testid="avatar" />} footer={<span>Sofia Marin</span>} />));
    const footer = rail().querySelector<HTMLElement>("[data-slot=sidebar-footer]")!;
    expect(footer.querySelector("[data-slot=sidebar-footer-avatar] [data-testid=avatar]")).not.toBeNull();
    const content = footer.querySelector<HTMLElement>("[data-slot=sidebar-footer-content]")!;
    expect(content.textContent).toBe("Sofia Marin");
    expect(content.className).toContain("group-data-[collapsed]/sidebar:hidden");
    expect(footer.className).toContain("group-data-[collapsed]/sidebar:justify-center");
  });

  it("takes them from SidebarHeader and SidebarFooter as well", () => {
    render(
      wrap(
        <Sidebar>
          <SidebarHeader logo={<svg data-testid="logo" />}>Acme</SidebarHeader>
          <SidebarItem id="home" label="Home" icon="house" href="/" />
          <SidebarFooter avatar={<span data-testid="avatar" />}>Sofia Marin</SidebarFooter>
        </Sidebar>,
      ),
    );
    expect(rail().querySelector("[data-slot=sidebar-brand-logo] [data-testid=logo]")).not.toBeNull();
    expect(rail().querySelector("[data-slot=sidebar-brand-name]")?.textContent).toBe("Acme");
    expect(rail().querySelector("[data-slot=sidebar-footer-avatar] [data-testid=avatar]")).not.toBeNull();
    expect(rail().querySelector("[data-slot=sidebar-footer-content]")?.textContent).toBe("Sofia Marin");
  });

  it("renders a logo or an avatar alone, with no brand or account beside it", () => {
    render(wrap(<Sidebar items={items} logo={<svg data-testid="logo" />} avatar={<span data-testid="avatar" />} />));
    expect(rail().querySelector("[data-slot=sidebar-brand] [data-testid=logo]")).not.toBeNull();
    expect(rail().querySelector("[data-slot=sidebar-brand-name]")).toBeNull();
    expect(rail().querySelector("[data-slot=sidebar-footer] [data-testid=avatar]")).not.toBeNull();
    expect(rail().querySelector("[data-slot=sidebar-footer-content]")).toBeNull();
  });

  it("keeps brand and footer content as given without a logo or avatar", () => {
    render(wrap(<Sidebar items={items} brand={<>Acme</>} footer={<span>Sofia Marin</span>} />));
    expect(rail().querySelector("[data-slot=sidebar-brand-logo]")).toBeNull();
    expect(rail().querySelector("[data-slot=sidebar-brand]")?.textContent).toBe("Acme");
    expect(rail().querySelector("[data-slot=sidebar-footer-avatar]")).toBeNull();
    expect(rail().querySelector("[data-slot=sidebar-footer]")?.textContent).toBe("Sofia Marin");
    expect(screen.getByRole("link", { name: "Acme" })).toBeTruthy();
  });
});
