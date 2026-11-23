import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Sidebar, type SidebarItemData, type SidebarSectionData } from "./index";

// Sidebar labelled sections: an app's six sections as the Sidebar's `sections`.

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;

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

/** Client useId ids count up across renders: each is renamed by its first appearance, so two renders compare. */
function normalizeIds(html: string) {
  const seen = new Map<string, string>();
  return html.replace(/_r_[0-9a-z]+_/g, (id) => {
    if (!seen.has(id)) seen.set(id, `id${seen.size}`);
    return seen.get(id)!;
  });
}

const TOP: SidebarItemData[] = [{ id: "dashboard", label: "Dashboard", icon: "layout-dashboard", href: "/" }];
const SECTIONS: SidebarSectionData[] = [
  {
    id: "work",
    label: "Work",
    items: [
      { id: "orders", label: "Orders", icon: "calendar-check", href: "/orders", badge: { value: 4, tone: "brand" } },
      { id: "notifications", label: "Notifications", icon: "bell", href: "/notifications" },
      { id: "inbox", label: "Inbox", icon: "messages-square", href: "/inbox" },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { id: "products", label: "Products", icon: "package", href: "/products" },
      { id: "locations", label: "Locations", icon: "map-pin", href: "/locations" },
    ],
  },
  { id: "pricing", label: "Pricing", items: [{ id: "seasons", label: "Seasons", icon: "calendar-range", href: "/seasons" }] },
  { id: "content", label: "Content", items: [{ id: "slides", label: "Slides", icon: "images", href: "/slides" }] },
  { id: "business", label: "Business", items: [{ id: "reports", label: "Reports", icon: "chart-column", href: "/reports" }] },
  {
    id: "management",
    label: "Management",
    items: [
      { id: "team", label: "Team", icon: "users", href: "/users" },
      {
        id: "settings",
        label: "Settings",
        icon: "settings",
        children: [
          { id: "general", label: "General", href: "/settings" },
          { id: "billing", label: "Billing", href: "/settings/billing" },
        ],
      },
    ],
  },
];
const LABELS = SECTIONS.map((section) => section.label);

function Panel(props: Partial<React.ComponentProps<typeof Sidebar>>) {
  return <Sidebar brand={<span>Acme</span>} items={TOP} sections={SECTIONS} currentKey="products" footer={<span>Ana Petrov</span>} {...props} />;
}

const sidebar = () => document.querySelector("[data-slot='sidebar']")!;
const desktop = () => screen.getByRole("navigation", { name: "Main menu" });
const FOCUSABLE = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

describe("Sidebar sections", () => {
  it("renders each section under its label, in order, after the unlabelled items", () => {
    inLocale(<Panel />);
    const sections = [...sidebar().querySelectorAll("[data-slot='sidebar-sections'] > [data-slot='sidebar-nav-section']")];
    expect(sections.map((section) => section.querySelector("[data-slot='sidebar-nav-section-label']")!.textContent)).toEqual(LABELS);
    expect(sections.map((section) => section.getAttribute("data-section"))).toEqual(SECTIONS.map((section) => section.id));
    // The top list (Dashboard) comes first, the sections after it, both before the bottom block.
    const children = [...sidebar().children].map((child) => child.getAttribute("data-slot") ?? child.tagName.toLowerCase());
    expect(children.slice(0, 3)).toEqual(["sidebar-brand", "sidebar-tree", "sidebar-sections"]);
    // The label keeps the settings overline's look: sentence case, never uppercase.
    const label = sections[0]!.querySelector("[data-slot='sidebar-nav-section-label']");
    expect(classesOf(label)).toContain("text-heading-xxsmall");
    expect(classesOf(label).split(" ")).not.toContain("uppercase");
    expect(classesOf(label).split(" ")).not.toContain("font-semibold");
    expect(classesOf(label)).toContain("text-ds-text-subtlest");
  });

  it("each section is a group named by its label (aria-labelledby on the label's id)", () => {
    inLocale(<Panel />);
    for (const label of LABELS) {
      const group = within(desktop()).getByRole("group", { name: label });
      const labelledBy = group.getAttribute("aria-labelledby")!;
      expect(document.getElementById(labelledBy)!.textContent).toBe(label);
      expect(group.contains(document.getElementById(labelledBy))).toBe(true);
    }
    // Ids are unique across the sections.
    const ids = [...sidebar().querySelectorAll("[data-slot='sidebar-nav-section-label']")].map((label) => label.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("a section is a list of items in its own <ul>; not collapsible (no button, no aria-expanded on it)", () => {
    inLocale(<Panel />);
    const catalog = within(desktop()).getByRole("group", { name: "Catalog" });
    const list = within(catalog).getByRole("list");
    expect(list.getAttribute("data-slot")).toBe("sidebar-tree");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getAllByRole("link").map((link) => link.textContent)).toEqual(["Products", "Locations"]);
    expect(catalog.hasAttribute("aria-expanded")).toBe(false);
    // The label is text, not a control.
    const label = catalog.querySelector("[data-slot='sidebar-nav-section-label']")!;
    expect(label.tagName).toBe("SPAN");
    expect(label.closest("button")).toBeNull();
    // An item group inside a section still opens and closes.
    const management = within(desktop()).getByRole("group", { name: "Management" });
    const settings = within(management).getByRole("button", { name: "Settings" });
    expect(settings.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(settings);
    expect(settings.getAttribute("aria-expanded")).toBe("true");
  });

  it("keyboard: the tab order runs through every item across sections, in order; labels and separators are no stops", () => {
    const { navigate } = inLocale(<Panel />);
    // A closed item group's panel is hidden, so its links are no stops until it opens.
    const stops = [...sidebar().querySelectorAll<HTMLElement>(FOCUSABLE)].filter((stop) => !stop.closest("[hidden]"));
    const names = stops.map((stop) => stop.getAttribute("aria-label") ?? stop.textContent);
    expect(names).toEqual([
      "Acme",
      "Dashboard",
      "Orders4",
      "Notifications",
      "Inbox",
      "Products",
      "Locations",
      "Seasons",
      "Slides",
      "Reports",
      "Team",
      "Settings",
      "Collapse menu",
    ]);
    for (const slot of ["sidebar-nav-section-label", "sidebar-nav-section-separator", "sidebar-sections"]) {
      for (const element of sidebar().querySelectorAll(`[data-slot='${slot}']`)) expect(element.matches(FOCUSABLE)).toBe(false);
    }
    // Each item takes focus; it is a real <a href> (Enter follows it natively), routed through the host router.
    const slides = within(desktop()).getByRole("link", { name: "Slides" });
    act(() => slides.focus());
    expect(document.activeElement).toBe(slides);
    expect(slides.tagName).toBe("A");
    expect(slides.getAttribute("href")).toBe("/slides");
    fireEvent.click(slides);
    expect(navigate).toHaveBeenCalledWith("/slides", undefined);
  });

  it("currentKey inside a section marks that item aria-current=page, and only it", () => {
    const { rerender } = inLocale(<Panel currentKey="products" />);
    const current = () => [...desktop().querySelectorAll("[aria-current='page']")];
    expect(current().map((element) => element.textContent)).toEqual(["Products"]);
    expect(within(within(desktop()).getByRole("group", { name: "Catalog" })).getByRole("link", { name: "Products" }).getAttribute("aria-current")).toBe("page");
    // A nested item inside a section: its item group starts open.
    rerender(
      <div>
        <DesignSystemProvider locale="en" navigate={vi.fn()}>
          <Panel currentKey="billing" />
        </DesignSystemProvider>
      </div>,
    );
    expect(current().map((element) => element.textContent)).toEqual(["Billing"]);
    expect(within(desktop()).getByRole("button", { name: "Settings" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("expanded, the separator is hidden and the label is visible", () => {
    inLocale(<Panel />);
    expect(sidebar().hasAttribute("data-collapsed")).toBe(false);
    for (const separator of sidebar().querySelectorAll("[data-slot='sidebar-nav-section-separator']")) {
      expect(separator.getAttribute("aria-hidden")).toBe("true");
      expect(classesOf(separator).split(" ")).toContain("hidden");
    }
    expect(sidebar().querySelectorAll("[data-slot='sidebar-nav-section-separator']")).toHaveLength(SECTIONS.length);
  });

  it("collapsed: the label is visually hidden, a separator shows instead, and every group keeps its name", () => {
    inLocale(<Panel defaultCollapsed />);
    expect(sidebar().hasAttribute("data-collapsed")).toBe(true);
    for (const section of sidebar().querySelectorAll("[data-slot='sidebar-sections'] > [data-slot='sidebar-nav-section']")) {
      const label = section.querySelector("[data-slot='sidebar-nav-section-label']")!;
      const separator = section.querySelector("[data-slot='sidebar-nav-section-separator']")!;
      // Both sources of collapse: the sidebar's own data-collapsed and the remembered <html> attribute.
      expect(classesOf(label)).toContain("group-data-[collapsed]/sidebar:sr-only");
      expect(classesOf(label)).toContain("[:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:sr-only");
      expect(classesOf(separator)).toContain("group-data-[collapsed]/sidebar:block");
      expect(classesOf(separator)).toContain("[:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:block");
      expect(classesOf(separator)).toContain("border-t");
      expect(separator.getAttribute("aria-hidden")).toBe("true");
      expect(separator.textContent).toBe("");
    }
    for (const label of LABELS) expect(within(desktop()).getByRole("group", { name: label })).toBeTruthy();
    // Items stay named and tooltipped as icons.
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => within(desktop()).getByRole("link", { name: "Locations" }).focus());
    expect(screen.getByRole("tooltip").textContent).toBe("Locations");
  });

  it("collapsed from a remembered choice (storageKey): no data-collapsed, the <html> attribute drives the same classes", () => {
    window.localStorage.setItem("app-sidebar", "collapsed");
    inLocale(<Panel storageKey="app-sidebar" />);
    expect(document.documentElement.getAttribute("data-ds-sidebar")).toBe("collapsed");
    expect(sidebar().hasAttribute("data-collapsed")).toBe(false);
    expect(within(desktop()).getByRole("group", { name: "Content" })).toBeTruthy();
    const html = renderToStaticMarkup(
      <DesignSystemProvider locale="en" navigate={() => {}}>
        <Panel storageKey="app-sidebar" />
      </DesignSystemProvider>,
    );
    expect(html).not.toContain("data-collapsed");
    expect(html).toContain("[:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&amp;]:block");
  });

  it("the toggle collapses and expands a sectioned sidebar; the groups stay named both ways", () => {
    inLocale(<Panel />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse menu" }));
    expect(sidebar().hasAttribute("data-collapsed")).toBe(true);
    expect(within(desktop()).getAllByRole("group").map((group) => group.getAttribute("aria-labelledby") && document.getElementById(group.getAttribute("aria-labelledby")!)!.textContent)).toEqual(LABELS);
    fireEvent.click(screen.getByRole("button", { name: "Expand menu" }));
    expect(sidebar().hasAttribute("data-collapsed")).toBe(false);
  });

  it("the mobile panel shows the same labelled sections, expanded, and a link closes it", async () => {
    const onMobileOpenChange = vi.fn();
    inLocale(<Panel isMobileOpen onMobileOpenChange={onMobileOpenChange} defaultCollapsed />);
    const panel = await screen.findByRole("dialog", { name: "Main menu" });
    for (const label of LABELS) expect(within(panel).getByRole("group", { name: label })).toBeTruthy();
    // The panel is outside the collapsed rail: its labels are not hidden by it, its links carry no tooltip.
    expect(panel.closest("[data-slot='sidebar']")).toBeNull();
    expect(panel.querySelectorAll("[data-slot='sidebar-sections'] > [data-slot='sidebar-nav-section']")).toHaveLength(SECTIONS.length);
    expect(within(panel).getByRole("link", { name: "Products" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(within(panel).getByRole("link", { name: "Reports" }));
    expect(onMobileOpenChange).toHaveBeenCalledWith(false);
  });

  it("RTL in he: the groups keep their names, the marker mirrors, and only logical sides are used", () => {
    inLocale(<Panel />, "he", "rtl");
    const nav = screen.getByRole("navigation", { name: "Main menu" });
    for (const label of LABELS) expect(within(nav).getByRole("group", { name: label })).toBeTruthy();
    expect(classesOf(within(nav).getByRole("link", { name: "Products" }))).toContain("aria-[current=page]:bg-ds-background-neutral-hovered");
    for (const slot of ["sidebar-sections", "sidebar-nav-section", "sidebar-nav-section-label", "sidebar-nav-section-separator"]) {
      for (const element of document.querySelectorAll(`[data-slot='${slot}']`)) expect(classesOf(element)).not.toMatch(PHYSICAL);
    }
    expect(screen.getByRole("button", { name: "Collapse menu" }).querySelector("svg")).toBeTruthy();
  });

  it("with sections and no unlabelled items, the empty top list is left out", () => {
    inLocale(<Panel items={[]} />);
    const children = [...sidebar().children].map((child) => child.getAttribute("data-slot") ?? child.tagName.toLowerCase());
    expect(children.slice(0, 2)).toEqual(["sidebar-brand", "sidebar-sections"]);
    expect(sidebar().querySelectorAll(":scope > [data-slot='sidebar-tree']")).toHaveLength(0);
  });

});

describe("Sidebar without sections: unchanged", () => {
  const ITEMS: SidebarItemData[] = [
    { id: "overview", label: "Overview", icon: "layout-dashboard", href: "/" },
    { id: "catalog", label: "Catalog", icon: "package", children: [{ id: "products", label: "Products", href: "/c" }] },
  ];
  const plain = (props: Partial<React.ComponentProps<typeof Sidebar>> = {}) => (
    <Sidebar brand={<span>Acme</span>} items={ITEMS} currentKey="products" {...props} />
  );

  it("renders no section wrapper or separator; the nav is brand, tree, bottom block", () => {
    inLocale(plain());
    expect(document.querySelector("[data-slot='sidebar-sections']")).toBeNull();
    expect(document.querySelector("[data-slot='sidebar-nav-section-separator']")).toBeNull();
    expect([...sidebar().children].map((child) => child.getAttribute("data-slot") ?? child.tagName.toLowerCase())).toEqual(["sidebar-brand", "sidebar-tree", "div"]);
  });

  it.each([
    ["expanded", {}],
    ["collapsed", { isCollapsed: true }],
    ["remembered", { storageKey: "app-sidebar", defaultCollapsed: true }],
    ["mobile", { isMobileOpen: true }],
  ] as const)("an empty sections array renders the same DOM as none (%s, LTR and RTL, client and server)", (_, props) => {
    for (const [locale, dir] of [["en", undefined], ["ar", "rtl"]] as const) {
      const none = inLocale(plain(props), locale, dir);
      const before = normalizeIds(document.body.innerHTML);
      none.unmount();
      cleanup();
      inLocale(plain({ ...props, sections: [] }), locale, dir);
      expect(normalizeIds(document.body.innerHTML)).toBe(before);
      cleanup();
      const server = (extra: object) =>
        renderToStaticMarkup(
          <DesignSystemProvider locale={locale} navigate={() => {}}>
            {plain({ ...props, ...extra })}
          </DesignSystemProvider>,
        );
      expect(server({ sections: [] })).toBe(server({}));
    }
  });
});

describe("Sidebar sections: slots and repeated ids", () => {
  const sidebarWarnings = () => warn.mock.calls.map(([message]: unknown[]) => String(message)).filter((message: string) => message.startsWith("Sidebar:"));

  it("unique ids: no warning", () => {
    inLocale(<Panel />);
    expect(sidebarWarnings()).toEqual([]);
  });

  it("an id repeated across items and sections is named once in development; both items are then current", () => {
    const repeated: SidebarSectionData[] = [
      ...SECTIONS,
      { id: "extra", label: "Extra", items: [{ id: "products", label: "Products 2", icon: "package", href: "/products-2" }] },
      { id: "account", label: "Account", items: [{ id: "dashboard", label: "Dashboard 2", icon: "user", href: "/d2" }] },
    ];
    const view = inLocale(<Panel sections={repeated} />);
    expect(within(desktop()).getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page")).toHaveLength(2);
    // A re-render with the same ids says nothing new.
    view.rerender(
      <div>
        <DesignSystemProvider locale="en" navigate={vi.fn()}>
          <Panel sections={repeated} currentKey="products" />
        </DesignSystemProvider>
      </div>,
    );
    const messages = sidebarWarnings();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('the item ids "products", "dashboard" repeat');
  });
});

describe("Sidebar repeated-id check in production", () => {
  // jsdom lacks CSS.escape, which React Aria's production build uses (as in table-duplicate-ids.test.tsx).
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
  /** Items whose `id` reads are counted: the check walks every id once, rendering reads them on its own. */
  function counted(): { sections: SidebarSectionData[]; reads: () => number; ids: number } {
    let reads = 0;
    let ids = 0;
    const wrap = (item: SidebarItemData): SidebarItemData => {
      ids += 1;
      const copy = { ...item, children: item.children?.map(wrap) };
      const id = item.id;
      Object.defineProperty(copy, "id", { get: () => { reads += 1; return id; }, enumerable: true });
      return copy;
    };
    const sections = SECTIONS.map((section) => ({ ...section, items: section.items.map(wrap) }));
    return { sections, reads: () => reads, ids };
  }

  it("production does not walk the item ids at all (development walks each once); neither warns for unique ids", () => {
    const dev = counted();
    inLocale(<Panel items={[]} sections={dev.sections} />);
    const devReads = dev.reads();
    cleanup();
    vi.stubEnv("NODE_ENV", "production");
    try {
      const prod = counted();
      inLocale(<Panel items={[]} sections={prod.sections} />);
      expect(devReads - prod.reads()).toBe(prod.ids);
    } finally {
      vi.unstubAllEnvs();
    }
    expect(warn.mock.calls.filter(([message]: unknown[]) => String(message).startsWith("Sidebar:"))).toEqual([]);
  });

  it("production says nothing about repeated ids (and renders both items current, as before)", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const repeated: SidebarSectionData[] = [...SECTIONS, { id: "extra", label: "Extra", items: [{ id: "products", label: "Products 2", icon: "package", href: "/p2" }] }];
      inLocale(<Panel sections={repeated} />);
      expect(within(desktop()).getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page")).toHaveLength(2);
    } finally {
      vi.unstubAllEnvs();
    }
    expect(warn.mock.calls.filter(([message]: unknown[]) => String(message).startsWith("Sidebar:"))).toEqual([]);
  });
});
