import * as React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { Link } from "../action/index";
import { DesignSystemProvider } from "../provider";
import { Footer, type FooterColumn } from "./index";

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  warn.mockRestore();
});

const COLUMNS: FooterColumn[] = [
  { title: "Product", links: [{ label: "Platform", href: "/#product" }, { label: "Pricing", href: "/#pricing" }] },
  { title: "Company", links: [{ label: "Contact", href: "/contact/" }, { label: "Acme Group", href: "https://example.com", isExternal: true }] },
  { title: "Legal", links: [{ label: "Privacy policy", href: "/privacy/" }, { label: "Cookie policy", href: "/cookies/" }] },
];

function inLocale(ui: React.ReactElement, dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={dir ? "ar-EG" : "en"} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

const footer = (props: Partial<React.ComponentProps<typeof Footer>> = {}) => (
  <Footer
    brand={<span>Acme</span>}
    brandLabel="Acme home"
    about="Everything your team needs in one place."
    contact={<Link href="mailto:hello@example.com" variant="subtle">hello@example.com</Link>}
    columns={COLUMNS}
    legal={<span>© 2026 Acme</span>}
    languageSwitch={<Button variant="subtle" size="compact">English · EN</Button>}
    {...props}
  />
);

describe("Footer", () => {
  it("is the contentinfo landmark with each column a navigation named by its title", () => {
    inLocale(footer());
    const landmark = screen.getByRole("contentinfo");
    const navs = within(landmark).getAllByRole("navigation");
    expect(navs.map((nav) => nav.getAttribute("aria-labelledby") && document.getElementById(nav.getAttribute("aria-labelledby")!)?.textContent)).toEqual(["Product", "Company", "Legal"]);
    expect(within(screen.getByRole("navigation", { name: "Legal" })).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/privacy/", "/cookies/"]);
    expect(within(landmark).getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["Product", "Company", "Legal"]);
  });

  it("column links are subtle links; an external one opens in a new tab and says so", () => {
    inLocale(footer());
    const company = screen.getByRole("navigation", { name: "Company" });
    for (const link of within(company).getAllByRole("link")) expect(link.getAttribute("data-variant")).toBe("subtle");
    const external = within(company).getByRole("link", { name: /Acme Group/ });
    expect(external.getAttribute("target")).toBe("_blank");
    expect(external.getAttribute("rel")).toContain("noopener");
    expect(external.querySelector("[data-slot='link-external-icon']")).toBeTruthy();
    expect(within(company).getByRole("link", { name: "Contact" }).hasAttribute("target")).toBe(false);
  });

  it("names the brand link and sends it home; about and contact sit under it", () => {
    inLocale(footer({ brandHref: "/en/" }));
    const brand = screen.getByRole("link", { name: "Acme home" });
    expect(brand.getAttribute("href")).toBe("/en/");
    const block = brand.closest("[data-slot='footer-brand']")!;
    expect(block.textContent).toContain("Everything your team needs in one place.");
    expect(within(block as HTMLElement).getByRole("link", { name: "hello@example.com" })).toBeTruthy();
  });

  it("keeps reading order for the keyboard: brand, columns left to right, then the legal row", () => {
    inLocale(footer());
    const focusable = [...screen.getByRole("contentinfo").querySelectorAll<HTMLElement>("a[href], button")].map(
      (element) => element.getAttribute("aria-label") ?? element.textContent?.trim(),
    );
    expect(focusable).toEqual(["Acme home", "hello@example.com", "Platform", "Pricing", "Contact", expect.stringContaining("Acme Group"), "Privacy policy", "Cookie policy", "English · EN"]);
    const legal = screen.getByRole("contentinfo").querySelector("[data-slot='footer-legal']")!;
    expect(legal.textContent).toContain("© 2026 Acme");
    expect(within(legal as HTMLElement).getByRole("button", { name: "English · EN" })).toBeTruthy();
  });

  it("holds no primary action", () => {
    inLocale(footer());
    expect(screen.getByRole("contentinfo").querySelector("[data-variant='primary']")).toBeNull();
  });

  it("leaves out the about line, contact and language switch when not given", () => {
    inLocale(footer({ about: undefined, contact: undefined, languageSwitch: undefined }));
    const landmark = screen.getByRole("contentinfo");
    expect(landmark.querySelector("[data-slot='footer-contact']")).toBeNull();
    expect(landmark.querySelector("[data-slot='footer-language']")).toBeNull();
    expect(landmark.querySelector("p")).toBeNull();
  });

  it("lays out by its own width with static classes: one column, then brand plus a track per column", () => {
    inLocale(footer());
    const top = screen.getByRole("contentinfo").querySelector<HTMLElement>("[data-slot='footer-top']")!;
    expect(top.className).toContain("grid-cols-1");
    expect(top.className).toContain("@min-[48rem]:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]");
    expect(top.getAttribute("style")).toBeNull();
    expect(screen.getByRole("contentinfo").className).toContain("@container");
  });

  it("takes duplicate hrefs and titles without key clashes, and a heading level", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    inLocale(
      footer({
        headingLevel: 3,
        columns: [
          { title: "Support", links: [{ label: "Contact", href: "/contact/" }, { label: "Support", href: "/contact/" }] },
          { title: "Support", links: [{ label: "Placeholder", href: "#" }, { label: "Placeholder", href: "#" }] },
        ],
      }),
    );
    expect(error.mock.calls.filter(([message]) => String(message).includes("same key"))).toEqual([]);
    error.mockRestore();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
    expect(screen.queryAllByRole("heading", { level: 2 })).toEqual([]);
  });

  it("links show the focus ring from ds-border-focused", () => {
    inLocale(footer());
    for (const link of screen.getByRole("contentinfo").querySelectorAll("a")) {
      // The brand link draws a 2px inner edge; a Link draws its 2px focus underline; both in ds-border-focused.
      expect(link.getAttribute("class")).toMatch(/data-\[focus-visible\]:(?:inset-ring|decoration)-ds-border-focused/);
    }
  });

  it("in RTL uses only logical placement, and column ids stay unique across two footers", () => {
    inLocale(
      <>
        {footer()}
        {footer()}
      </>,
      "rtl",
    );
    const all = [...document.querySelectorAll<HTMLElement>("[data-slot^='footer'] , [data-slot^='footer'] *")];
    const physical = all.filter((element) => /(^|\s)(?:[\w-]+:)*(?:ml|mr|pl|pr|left|right|text-left|text-right|border-l|border-r)-/.test(element.getAttribute("class") ?? ""));
    expect(physical).toEqual([]);
    expect(screen.getAllByRole("contentinfo")[1]!.querySelector("[data-slot='footer-language']")!.className).toContain("ms-auto");
    const ids = [...document.querySelectorAll("[data-slot='footer-column'] h2")].map((heading) => heading.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("warns once under StrictMode too", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ title: `Column ${i}`, links: [{ label: "Link", href: `/${i}` }] }));
    render(
      <React.StrictMode>
        <DesignSystemProvider locale="en" navigate={vi.fn()}>{footer({ columns: many })}</DesignSystemProvider>
      </React.StrictMode>,
    );
    expect(warn.mock.calls.filter(([message]: unknown[]) => String(message).startsWith("Footer:"))).toHaveLength(1);
  });

  it("warns once when given more than four columns or six links in one", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ title: `Column ${i}`, links: [{ label: "Link", href: `/${i}` }] }));
    const view = inLocale(footer({ columns: many }));
    view.rerender(
      <div>
        <DesignSystemProvider locale="en" navigate={vi.fn()}>{footer({ columns: many })}</DesignSystemProvider>
      </div>,
    );
    expect(warn.mock.calls.filter(([message]: unknown[]) => String(message).startsWith("Footer:"))).toHaveLength(1);
  });
});
