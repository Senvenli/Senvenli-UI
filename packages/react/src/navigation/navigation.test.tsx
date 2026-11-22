import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { Menu } from "../overlay/index";
import { DesignSystemProvider } from "../provider";
import { BottomNav, Navbar, Sidebar, sidebarScript, type SidebarItem } from "./index";

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;

if (!globalThis.CSS?.escape) {
  (globalThis as { CSS?: { escape?: (value: string) => string } }).CSS = {
    ...(globalThis.CSS ?? {}),
    escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`),
  };
}

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-ds-sidebar");
});
afterEach(() => {
  cleanup();
  const ariaWarnings = warn.mock.calls.map(([message]: unknown[]) => String(message)).filter((message: string) => /aria-label|accessible|provider/i.test(message));
  warn.mockRestore();
  expect(ariaWarnings).toEqual([]);
});

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  const navigate = vi.fn();
  const view = render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={navigate}>{ui}</DesignSystemProvider>
    </div>,
  );
  return { ...view, navigate };
}

const classesOf = (element: Element | null) => element?.getAttribute("class") ?? "";
const allClasses = () => Array.from(document.querySelectorAll("[class]")).map(classesOf).join(" ");

const LINKS = [
  { key: "product", label: "Product", href: "/#product" },
  { key: "pricing", label: "Pricing", href: "/#pricing" },
  { key: "faq", label: "FAQ", href: "/#faq" },
];
const LANGUAGES = {
  current: "en",
  items: [
    { code: "en", label: "English", href: "/en/" },
    { code: "de", label: "Deutsch", href: "/de/" },
  ],
};

/** A language menu as an app puts one in the Navbar's end actions: the code on a subtle button, each language a link. */
function LanguageMenu() {
  const active = LANGUAGES.items.find((item) => item.code === LANGUAGES.current)!;
  return (
    <Menu
      aria-label="Language"
      selectionMode="single"
      selectedKeys={[LANGUAGES.current]}
      items={LANGUAGES.items.map((item) => ({ id: item.code, label: item.label, href: item.href, lang: item.code }))}
      trigger={
        <Button variant="subtle" size="compact" iconBefore="globe" aria-label={`Language: ${active.label} (${LANGUAGES.current.toUpperCase()})`} data-slot="navbar-language">
          <span aria-hidden>{LANGUAGES.current.toUpperCase()}</span>
        </Button>
      }
    />
  );
}

function SiteNavbar(props: Partial<React.ComponentProps<typeof Navbar>>) {
  return (
    <Navbar
      brand={<span>Acme</span>}
      links={LINKS}
      currentKey="pricing"
      endActions={
        <>
          <LanguageMenu />
          <Button variant="primary">Get started</Button>
        </>
      }
      {...props}
    />
  );
}

describe("Navbar", () => {
  it("is a banner with a named navigation landmark; the current link is the page", () => {
    inLocale(<SiteNavbar />);
    expect(document.querySelector("header[data-slot='navbar']")).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: "Main menu" });
    const current = within(nav).getByRole("link", { name: "Pricing" });
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByRole("link", { name: "Product" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "Acme" }).getAttribute("href")).toBe("/");
  });

  it("routes links through the host router", () => {
    const { navigate } = inLocale(<SiteNavbar />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Main menu" })).getByRole("link", { name: "FAQ" }));
    expect(navigate).toHaveBeenCalledWith("/#faq", undefined);
  });

  it("shows the language code; the menu lists each language as a link to the same page in it", async () => {
    inLocale(<SiteNavbar />);
    const trigger = screen.getByRole("button", { name: "Language: English (EN)" });
    expect(trigger.textContent).toContain("EN");
    fireEvent.click(trigger);
    const menu = await screen.findByRole("menu");
    // Labelled by its trigger ("Language: English").
    expect(document.getElementById(menu.getAttribute("aria-labelledby")!)?.getAttribute("aria-label")).toBe("Language: English (EN)");
    const german = within(menu).getByRole("menuitemradio", { name: "Deutsch" });
    expect(german.getAttribute("href")).toBe("/de/");
    expect(german.querySelector("[lang='de']")?.textContent).toBe("Deutsch");
    expect(within(menu).getByRole("menuitemradio", { name: "English" }).getAttribute("aria-checked")).toBe("true");
  });

  it("opens the phone menu panel from the menu button: links, language and actions, closing back to the button", async () => {
    inLocale(<SiteNavbar />);
    const button = screen.getByRole("button", { name: "Open menu" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    act(() => button.focus());
    fireEvent.click(button);
    const panel = await screen.findByRole("dialog", { name: "Main menu" });
    expect(within(panel).getByRole("link", { name: "Pricing" }).getAttribute("aria-current")).toBe("page");
    expect(within(panel).getByRole("button", { name: "Get started" })).toBeTruthy();
    expect(within(panel).getByRole("button", { name: "Language: English (EN)" })).toBeTruthy();
    fireEvent.click(within(panel).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(button));
  });

  it("a link in the panel closes it (an in-page anchor would leave it open)", async () => {
    inLocale(<SiteNavbar />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const panel = await screen.findByRole("dialog", { name: "Main menu" });
    fireEvent.click(within(panel).getByRole("link", { name: "FAQ" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("any link in the panel closes it: an action, a language in its menu", async () => {
    const { Link } = await import("../action/index");
    const { navigate } = inLocale(
      <SiteNavbar
        endActions={
          <>
            <LanguageMenu />
            <Link href="/sign-in/">Sign in</Link>
          </>
        }
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    let panel = await screen.findByRole("dialog", { name: "Main menu" });
    fireEvent.click(within(panel).getByRole("link", { name: "Sign in" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // Closing in the capture phase never swallows the navigation.
    expect(navigate).toHaveBeenCalledWith("/sign-in/", undefined);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    panel = await screen.findByRole("dialog", { name: "Main menu" });
    fireEvent.click(within(panel).getByRole("button", { name: "Language: English (EN)" }));
    const menu = await screen.findByRole("menu");
    fireEvent.click(within(menu).getByRole("menuitemradio", { name: "Deutsch" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Main menu" })).toBeNull());
    expect(navigate).toHaveBeenCalledWith("/de/", undefined);
  });

  it("a plain action button closes the panel and still runs; menu triggers and toggles keep it open", async () => {
    const onStart = vi.fn();
    const { ToggleButton } = await import("../action/index");
    inLocale(
      <SiteNavbar
        endActions={
          <>
            <ToggleButton aria-label="Bold">B</ToggleButton>
            <Button variant="primary" onPress={onStart}>Get started</Button>
          </>
        }
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const panel = await screen.findByRole("dialog", { name: "Main menu" });
    fireEvent.click(within(panel).getByRole("button", { name: "Bold" }));
    expect(screen.getByRole("dialog", { name: "Main menu" })).toBeTruthy();
    fireEvent.click(within(panel).getByRole("button", { name: "Get started" }));
    expect(onStart).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Main menu" })).toBeNull());
  });

  it("from the keyboard too: Enter on a plain action button closes the panel and still runs", async () => {
    const onStart = vi.fn();
    inLocale(<SiteNavbar endActions={<Button variant="primary" onPress={onStart}>Get started</Button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const panel = await screen.findByRole("dialog", { name: "Main menu" });
    const start = within(panel).getByRole("button", { name: "Get started" });
    act(() => start.focus());
    fireEvent.keyDown(start, { key: "Enter" });
    fireEvent.keyUp(start, { key: "Enter" });
    expect(onStart).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Main menu" })).toBeNull());
  });

  it("from the keyboard, Enter on the language trigger opens its menu and keeps the panel", async () => {
    inLocale(<SiteNavbar />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const panel = await screen.findByRole("dialog", { name: "Main menu" });
    const trigger = within(panel).getByRole("button", { name: "Language: English (EN)" });
    act(() => trigger.focus());
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyUp(trigger, { key: "Enter" });
    expect(await screen.findByRole("menu")).toBeTruthy();
    expect(document.querySelector("[data-slot='navbar-panel']")).toBeTruthy();
  });

  it("the language trigger in the panel opens its menu and keeps the panel", async () => {
    inLocale(<SiteNavbar />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const panel = await screen.findByRole("dialog", { name: "Main menu" });
    fireEvent.click(within(panel).getByRole("button", { name: "Language: English (EN)" }));
    expect(await screen.findByRole("menu")).toBeTruthy();
    // The open menu hides the rest from assistive tech, so the panel is checked in the DOM.
    expect(document.querySelector("[data-slot='navbar-panel']")).toBeTruthy();
  });

  it("brandLabel names the brand link", () => {
    inLocale(<SiteNavbar brandLabel="Acme home" />);
    expect(screen.getByRole("link", { name: "Acme home" }).getAttribute("href")).toBe("/");
  });

  it("a modified click (new tab) leaves the panel open", async () => {
    inLocale(<SiteNavbar />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const panel = await screen.findByRole("dialog", { name: "Main menu" });
    fireEvent.click(within(panel).getByRole("link", { name: "FAQ" }), { ctrlKey: true });
    expect(screen.getByRole("dialog", { name: "Main menu" })).toBeTruthy();
  });

  it("sticky pins it above page content and pads it for the notch; compact is 48px", () => {
    inLocale(<SiteNavbar isSticky isCompact />);
    const header = document.querySelector("[data-slot='navbar']")!;
    expect(classesOf(header)).toMatch(/\bsticky\b/);
    expect(classesOf(header)).toContain("z-20");
    expect(classesOf(header)).toContain("safe-area-inset-top");
    expect(header.hasAttribute("data-compact")).toBe(true);
    expect(classesOf(header.firstElementChild)).toContain("h-12");
  });

  it("reads in English where no strings are registered and uses logical sides only (RTL)", () => {
    inLocale(<SiteNavbar />, "he", "rtl");
    expect(screen.getByRole("navigation", { name: "Main menu" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeTruthy();
    expect(allClasses()).not.toMatch(PHYSICAL);
  });
});

const ITEMS: SidebarItem[] = [
  { id: "overview", label: "Overview", icon: "layout-dashboard", href: "/" },
  { id: "orders", label: "Orders", icon: "calendar-range", href: "/orders", badge: { value: 4, tone: "brand" } },
  {
    id: "projects",
    label: "Projects",
    icon: "folder",
    children: [
      { id: "active", label: "Active", href: "/projects/active" },
      { id: "archived", label: "Archived", href: "/projects/archived" },
    ],
  },
  { id: "inbox", label: "Inbox", icon: "message-circle", href: "/inbox", badge: { value: 2, tone: "danger" } },
];
const SETTINGS = { label: "Settings", items: [{ id: "billing", label: "Billing", icon: "tags" as const, href: "/settings/billing" }] };

function Panel(props: Partial<React.ComponentProps<typeof Sidebar>>) {
  return <Sidebar brand={<span>Acme</span>} items={ITEMS} settings={SETTINGS} currentKey="orders" footer={<span>Ana Petrov</span>} {...props} />;
}

const sidebar = () => document.querySelector("[data-slot='sidebar']")!;

describe("Sidebar", () => {
  it("marks the current page, counts as badges, settings in a labelled group at the bottom", () => {
    inLocale(<Panel />);
    const nav = screen.getByRole("navigation", { name: "Main menu" });
    const current = within(nav).getByRole("link", { name: /Orders/ });
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(classesOf(current)).toContain("aria-[current=page]:bg-ds-background-selected");
    expect(within(current).getByText("4")).toBeTruthy();
    expect(within(nav).getByRole("group", { name: "Settings" })).toBeTruthy();
  });

  it("a group toggles its nested items with aria-expanded; the group of the current page starts open", () => {
    inLocale(<Panel currentKey="archived" />);
    const nav = screen.getByRole("navigation", { name: "Main menu" });
    const group = within(nav).getByRole("button", { name: "Projects" });
    expect(group.getAttribute("aria-expanded")).toBe("true");
    expect(within(nav).getByRole("link", { name: "Archived" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(group);
    expect(group.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens a closed group when the page moves into it", () => {
    const { rerender } = inLocale(<Panel currentKey="orders" />);
    const group = () => within(screen.getByRole("navigation", { name: "Main menu" })).getByRole("button", { name: "Projects" });
    expect(group().getAttribute("aria-expanded")).toBe("false");
    rerender(
      <div>
        <DesignSystemProvider locale="en" navigate={vi.fn()}>
          <Panel currentKey="active" />
        </DesignSystemProvider>
      </div>,
    );
    expect(group().getAttribute("aria-expanded")).toBe("true");
  });

  it("collapses to icons with tooltips; the toggle says what it does next", () => {
    const onCollapsedChange = vi.fn();
    inLocale(<Panel onCollapsedChange={onCollapsedChange} />);
    const toggle = screen.getByRole("button", { name: "Collapse menu" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
    expect(sidebar().hasAttribute("data-collapsed")).toBe(true);
    expect(classesOf(sidebar())).toContain("data-[collapsed]:w-14");
    // Labels stay in the accessible name when only the icon shows.
    expect(screen.getByRole("link", { name: /Orders/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Expand menu" })).toBeTruthy();
  });

  it("collapsed, an item's tooltip carries its label on keyboard focus, with no extra tab stop", () => {
    inLocale(<Panel defaultCollapsed />);
    expect(document.querySelector("[data-slot='sidebar'] [data-slot='tooltip-target']")).toBeNull();
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => screen.getByRole("link", { name: /Inbox/ }).focus());
    expect(screen.getByRole("tooltip").textContent).toBe("Inbox");
  });

  it("collapsed, the group holding the page reports closed and carries the current mark", () => {
    inLocale(<Panel defaultCollapsed currentKey="archived" />);
    const group = within(screen.getByRole("navigation", { name: "Main menu" })).getByRole("button", { name: "Projects" });
    expect(group.getAttribute("aria-expanded")).toBe("false");
    expect(group.hasAttribute("data-current")).toBe(true);
  });

  it("settings sit in the bottom block with the footer", () => {
    inLocale(<Panel />);
    const bottom = document.querySelector("[data-slot='sidebar-footer']")!.parentElement!;
    expect(within(bottom).getByRole("group", { name: "Settings" })).toBeTruthy();
  });

  it("collapsed, a group's icon opens the sidebar on that group", () => {
    inLocale(<Panel defaultCollapsed />);
    expect(sidebar().hasAttribute("data-collapsed")).toBe(true);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Main menu" })).getByRole("button", { name: "Projects" }));
    expect(sidebar().hasAttribute("data-collapsed")).toBe(false);
    expect(within(screen.getByRole("navigation", { name: "Main menu" })).getByRole("button", { name: "Projects" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("applies the default collapsed state on the first visit", () => {
    inLocale(<Panel defaultCollapsed storageKey="app-sidebar" />);
    expect(document.documentElement.getAttribute("data-ds-sidebar")).toBe("collapsed");
  });

  it("remembers the choice, and a remembered choice wins over the default", () => {
    inLocale(<Panel storageKey="app-sidebar" />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse menu" }));
    expect(window.localStorage.getItem("app-sidebar")).toBe("collapsed");
    expect(document.documentElement.getAttribute("data-ds-sidebar")).toBe("collapsed");
    cleanup();
    window.localStorage.setItem("app-sidebar", "expanded");
    inLocale(<Panel defaultCollapsed storageKey="app-sidebar" />);
    expect(document.documentElement.getAttribute("data-ds-sidebar")).toBe("expanded");
    expect(screen.getByRole("button", { name: "Collapse menu" })).toBeTruthy();
  });

  it("reads storage inside a guard: a throwing storage does not break the sidebar", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    inLocale(<Panel defaultCollapsed storageKey="app-sidebar" />);
    fireEvent.click(screen.getByRole("button", { name: "Expand menu" }));
    expect(document.documentElement.getAttribute("data-ds-sidebar")).toBe("expanded");
    getItem.mockRestore();
    setItem.mockRestore();
  });

  it("with a remembered choice, the server markup has no collapsed attribute to disagree with the head script", () => {
    const html = renderToStaticMarkup(
      <DesignSystemProvider locale="en" navigate={() => {}}>
        <Panel defaultCollapsed storageKey="app-sidebar" />
      </DesignSystemProvider>,
    );
    expect(html).not.toContain("data-collapsed");
    expect(html).toContain("[:root[data-ds-sidebar=collapsed]_&amp;]:w-14");
  });

  it("the head script sets the remembered or default state before paint, carries the nonce, and survives a blocked storage", () => {
    const script = (key: string, options?: Parameters<typeof sidebarScript>[1]) => {
      const html = renderToStaticMarkup(sidebarScript(key, options));
      return { html, source: html.replace(/^<script[^>]*>|<\/script>$/g, "") };
    };
    const run = (source: string) => new Function(source)();
    const { html, source } = script("app-sidebar", { defaultCollapsed: true, nonce: "abc" });
    expect(html).toContain('nonce="abc"');
    run(source);
    expect(document.documentElement.getAttribute("data-ds-sidebar")).toBe("collapsed");
    window.localStorage.setItem("app-sidebar", "expanded");
    run(source);
    expect(document.documentElement.getAttribute("data-ds-sidebar")).toBe("expanded");
    expect(script("</script><script>alert(1)").html).not.toContain("</script><script>");
  });

  it("under 1024px it is a menu panel from the start edge, closed by a link", async () => {
    const onMobileOpenChange = vi.fn();
    inLocale(<Panel isMobileOpen onMobileOpenChange={onMobileOpenChange} />);
    const panel = await screen.findByRole("dialog", { name: "Main menu" });
    expect(classesOf(document.querySelector("[data-slot='sidebar-panel']"))).toContain("start-0");
    fireEvent.click(within(panel).getByRole("link", { name: /Inbox/ }));
    expect(onMobileOpenChange).toHaveBeenCalledWith(false);
  });

  it("uses logical sides only and mirrors the selection marker in RTL", () => {
    inLocale(<Panel />, "he", "rtl");
    expect(screen.getByRole("navigation", { name: "Main menu" })).toBeTruthy();
    expect(allClasses()).not.toMatch(PHYSICAL);
    expect(classesOf(screen.getByRole("link", { name: /Orders/ }))).toContain("rtl:aria-[current=page]:shadow-[inset_-2px_0_0_var(--ds-border-selected)]");
  });
});

const DOCK = [
  { key: "today", label: "Today", icon: "layout-dashboard" as const, href: "/" },
  { key: "orders", label: "Orders", icon: "calendar-range" as const, href: "/orders" },
  { key: "projects", label: "Projects", icon: "folder" as const, href: "/projects" },
  { key: "inbox", label: "Messages", icon: "message-circle" as const, href: "/inbox", badge: { value: 2, tone: "danger" as const } },
  { key: "more", label: "More", icon: "menu" as const, href: "/more" },
];

describe("BottomNav", () => {
  it("icon over label for each destination; the current one is the page", () => {
    inLocale(<BottomNav items={DOCK} currentKey="projects" />);
    const nav = screen.getByRole("navigation", { name: "Main menu" });
    expect(within(nav).getAllByRole("link")).toHaveLength(5);
    expect(within(nav).getByRole("link", { name: "Projects" }).getAttribute("aria-current")).toBe("page");
    // The count is read after the label.
    expect(within(nav).getByRole("link", { name: "Messages, 2" })).toBeTruthy();
  });

  it("sits on the bottom edge, padded for the home indicator, phones only", () => {
    inLocale(<BottomNav items={DOCK} />);
    const dock = document.querySelector("[data-slot='bottom-nav']")!;
    expect(classesOf(dock)).toMatch(/\bfixed\b.*\bbottom-0\b/);
    expect(classesOf(dock)).toContain("safe-area-inset-bottom");
    expect(classesOf(dock)).toContain("md:hidden");
  });

  it("hides while the on-screen keyboard is open", () => {
    const listeners: Record<string, () => void> = {};
    const viewport = { height: 800, addEventListener: (type: string, fn: () => void) => (listeners[type] = fn), removeEventListener: () => {} };
    Object.defineProperty(window, "visualViewport", { value: viewport, configurable: true });
    const innerHeight = Object.getOwnPropertyDescriptor(window, "innerHeight");
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    inLocale(
      <>
        <input aria-label="Search" />
        <BottomNav items={DOCK} />
      </>,
    );
    const dock = () => document.querySelector("[data-slot='bottom-nav']")!;
    act(() => screen.getByRole("textbox", { name: "Search" }).focus());
    viewport.height = 450;
    act(() => listeners.resize?.());
    expect(dock().hasAttribute("hidden")).toBe(true);
    act(() => (document.activeElement as HTMLElement).blur());
    viewport.height = 800;
    act(() => listeners.resize?.());
    expect(dock().hasAttribute("hidden")).toBe(false);
    Reflect.deleteProperty(window, "visualViewport");
    if (innerHeight) Object.defineProperty(window, "innerHeight", innerHeight);
  });

  it("uses logical sides only (RTL)", () => {
    inLocale(<BottomNav items={DOCK} />, "ar", "rtl");
    expect(allClasses()).not.toMatch(PHYSICAL);
  });
});
