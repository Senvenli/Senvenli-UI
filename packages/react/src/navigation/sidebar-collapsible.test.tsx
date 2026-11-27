import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Sidebar, SidebarTrigger } from "./index";

const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);
const ITEMS = [{ id: "home", label: "Home", icon: "house" as const, href: "#" }];
const nav = () => document.querySelector<HTMLElement>('[data-slot="sidebar"]')!;

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-ds-sidebar");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Sidebar collapsible", () => {
  it("icon stays the default: a toggle, the 56px rail classes", () => {
    inLocale(<Sidebar brand="Acme" items={ITEMS} />);
    expect(nav().getAttribute("data-collapsible")).toBe("icon");
    expect(nav().className).toContain("data-[collapsed]:w-14");
    expect(document.querySelectorAll('[data-slot="sidebar-toggle"]')).toHaveLength(1);
  });

  it("none: static, no toggle, no bottom row without an account, never collapsed, nothing stored", () => {
    inLocale(<Sidebar brand="Acme" items={ITEMS} collapsible="none" defaultCollapsed storageKey="nav" togglePlacement="header" />);
    expect(nav().getAttribute("data-collapsible")).toBe("none");
    expect(nav().hasAttribute("data-collapsed")).toBe(false);
    expect(nav().className).not.toContain("w-14");
    expect(document.querySelector('[data-slot="sidebar-toggle"]')).toBeNull();
    expect(document.querySelector('[data-slot="sidebar-header"]')).toBeNull();
    expect(window.localStorage.getItem("nav")).toBeNull();
  });

  it("none under a leftover remembered 'collapsed' resets the attribute and warns once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.documentElement.setAttribute("data-ds-sidebar", "collapsed");
    inLocale(<Sidebar brand="Acme" items={ITEMS} collapsible="none" />);
    expect(document.documentElement.getAttribute("data-ds-sidebar")).toBe("expanded");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("offcanvas: collapsed is out of view and out of reach; a SidebarTrigger the app holds brings it back", () => {
    function Shell() {
      const [collapsed, setCollapsed] = React.useState(true);
      return (
        <>
          <SidebarTrigger isCollapsed={collapsed} onCollapsedChange={setCollapsed} aria-controls="main-nav" />
          <Sidebar id="main-nav" brand="Acme" items={ITEMS} collapsible="offcanvas" isCollapsed={collapsed} onCollapsedChange={setCollapsed} />
        </>
      );
    }
    inLocale(<Shell />);
    expect(nav().getAttribute("data-collapsible")).toBe("offcanvas");
    expect(nav().id).toBe("main-nav");
    expect(nav().hasAttribute("inert")).toBe(true);
    expect(nav().className).toContain("data-[collapsed]:w-0");
    expect(nav().className).toContain("data-[collapsed]:invisible");
    const trigger = screen.getAllByRole("button", { name: "Expand menu" }).find((b) => b.closest('[data-slot="sidebar-trigger"]'))!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-controls")).toBe("main-nav");
    fireEvent.click(trigger);
    expect(nav().hasAttribute("inert")).toBe(false);
    expect(nav().hasAttribute("data-collapsed")).toBe(false);
  });

  it("offcanvas controlled with a storageKey remembers changes, not the first render", () => {
    window.localStorage.setItem("nav", "collapsed");
    function Shell() {
      const [collapsed, setCollapsed] = React.useState(false);
      return (
        <>
          <SidebarTrigger isCollapsed={collapsed} onCollapsedChange={setCollapsed} />
          <Sidebar brand="Acme" items={ITEMS} collapsible="offcanvas" storageKey="nav" isCollapsed={collapsed} onCollapsedChange={setCollapsed} />
        </>
      );
    }
    inLocale(<Shell />);
    expect(window.localStorage.getItem("nav")).toBe("collapsed");
    fireEvent.click(screen.getAllByRole("button", { name: "Collapse menu" }).find((b) => b.closest('[data-slot="sidebar-trigger"]'))!);
    expect(window.localStorage.getItem("nav")).toBe("collapsed");
    fireEvent.click(screen.getAllByRole("button", { name: "Expand menu" }).find((b) => b.closest('[data-slot="sidebar-trigger"]'))!);
    expect(window.localStorage.getItem("nav")).toBe("expanded");
  });
});
