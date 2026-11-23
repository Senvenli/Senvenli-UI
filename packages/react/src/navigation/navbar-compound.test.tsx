import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Navbar, NavbarActions, NavbarBrand, NavbarItem } from "./index";

// Navbar composed from parts: the same bar as `brand`, `links` and `actions`, built from children.

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const wrap = (ui: React.ReactElement) => <DesignSystemProvider navigate={() => {}}>{ui}</DesignSystemProvider>;

const composed = (
  <Navbar brandHref="/" brandLabel="Acme home" currentKey="pricing">
    <NavbarBrand>Acme</NavbarBrand>
    <NavbarItem id="features" href="/features">
      Features
    </NavbarItem>
    <NavbarItem id="pricing" href="/pricing">
      Pricing
    </NavbarItem>
    <NavbarActions>
      <a href="/sign-in">Sign in</a>
    </NavbarActions>
  </Navbar>
);

const data = (
  <Navbar
    brand="Acme"
    brandHref="/"
    brandLabel="Acme home"
    currentKey="pricing"
    links={[
      { key: "features", label: "Features", href: "/features" },
      { key: "pricing", label: "Pricing", href: "/pricing" },
    ]}
    actions={<a href="/sign-in">Sign in</a>}
  />
);

describe("Navbar composed from parts", () => {
  it("renders the same markup as brand, links and actions", () => {
    const strip = (html: string) => html.replace(/(id|aria-labelledby|aria-controls|aria-describedby)="[^"]*"/g, "");
    expect(strip(renderToStaticMarkup(wrap(composed)))).toBe(strip(renderToStaticMarkup(wrap(data))));
  });

  it("marks the page in the bar and in the phone panel", () => {
    render(wrap(composed));
    const nav = screen.getByRole("navigation", { name: "Main menu" });
    expect(within(nav).getByRole("link", { name: "Pricing" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Acme home" })).toBeTruthy();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    });
    const panel = screen.getByRole("dialog");
    expect(within(panel).getByRole("link", { name: "Pricing" }).getAttribute("aria-current")).toBe("page");
    expect(within(panel).getByRole("link", { name: "Sign in" })).toBeTruthy();
  });

  it("takes isCurrent on an item instead of currentKey", () => {
    render(
      wrap(
        <Navbar brand="Acme">
          <NavbarItem id="docs" href="/docs" isCurrent>
            Docs
          </NavbarItem>
        </Navbar>,
      ),
    );
    expect(within(screen.getByRole("navigation")).getByRole("link", { name: "Docs" }).getAttribute("aria-current")).toBe("page");
  });

  it("says where an item belongs when it is used outside a Navbar", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(wrap(<NavbarItem id="x" href="/x">X</NavbarItem>))).toThrow("NavbarItem must be inside a Navbar.");
  });
});
