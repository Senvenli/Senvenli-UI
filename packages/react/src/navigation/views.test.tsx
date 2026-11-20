import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Accordion, Breadcrumbs, Disclosure, Pagination, SegmentedControl, Tabs } from "./index";
import { pageWindow } from "./pagination";

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

function press(key: string, target: Element = document.activeElement ?? document.body) {
  fireEvent.keyDown(target, { key });
  fireEvent.keyUp(target, { key });
}

const classesOf = (element: Element | null) => element?.getAttribute("class") ?? "";
const allClasses = () => Array.from(document.querySelectorAll("[class]")).map(classesOf).join(" ");

function Counter() {
  const [n, setN] = React.useState(0);
  return <button onClick={() => setN(n + 1)}>Count {n}</button>;
}

const TABS = [
  { id: "overview", label: "Overview", panel: <Counter /> },
  { id: "activity", label: "Activity", count: 4, panel: <p>Activity list</p> },
  { id: "notes", label: "Notes", panel: <p>Notes list</p> },
];

describe("Tabs", () => {
  it("a tablist whose selected tab has an underline, not colour alone; counts as badges", () => {
    inLocale(<Tabs items={TABS} aria-label="Project" />);
    const list = screen.getByRole("tablist", { name: "Project" });
    const selected = within(list).getByRole("tab", { name: "Overview" });
    expect(selected.getAttribute("aria-selected")).toBe("true");
    expect(classesOf(selected)).toContain("data-[selected]:after:bg-ds-border-selected");
    expect(within(list).getByRole("tab", { name: /Activity/ }).textContent).toContain("4");
  });

  it("arrows, Home and End move the selection; the selected tab holds focus", () => {
    inLocale(<Tabs items={TABS} aria-label="Project" />);
    const first = screen.getByRole("tab", { name: "Overview" });
    act(() => first.focus());
    press("ArrowRight");
    expect(document.activeElement?.textContent).toContain("Activity");
    expect(document.activeElement?.getAttribute("aria-selected")).toBe("true");
    press("End");
    expect(document.activeElement?.textContent).toBe("Notes");
    press("Home");
    expect(document.activeElement?.textContent).toBe("Overview");
  });

  it("mirrors the arrows in RTL", () => {
    inLocale(<Tabs items={TABS} aria-label="Project" />, "ar", "rtl");
    act(() => screen.getByRole("tab", { name: "Overview" }).focus());
    press("ArrowLeft");
    expect(document.activeElement?.textContent).toContain("Activity");
    expect(allClasses()).not.toMatch(PHYSICAL);
  });

  it("keeps each panel's state when switching", () => {
    inLocale(<Tabs items={TABS} aria-label="Project" />);
    fireEvent.click(screen.getByRole("button", { name: "Count 0" }));
    fireEvent.click(screen.getByRole("tab", { name: /Activity/ }));
    expect(screen.getByRole("tabpanel").textContent).toBe("Activity list");
    fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
    expect(screen.getByRole("button", { name: "Count 1" })).toBeTruthy();
  });

  it("stays reachable on a narrow screen: the row scrolls sideways", () => {
    inLocale(<Tabs items={TABS} aria-label="Project" />);
    expect(classesOf(screen.getByRole("tablist"))).toContain("overflow-x-auto");
  });

  it("brings the selected tab into view by scrolling the row only, never the page", () => {
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      inLocale(<Tabs items={TABS} aria-label="Project" defaultSelectedKey="notes" />);
      const row = screen.getByRole("tablist");
      const selected = screen.getByRole("tab", { name: "Notes" });
      vi.spyOn(row, "getBoundingClientRect").mockReturnValue({ left: 0, right: 200 } as DOMRect);
      vi.spyOn(selected, "getBoundingClientRect").mockReturnValue({ left: 260, right: 360 } as DOMRect);
      fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
      fireEvent.click(selected);
      expect(row.scrollLeft).toBe(160);
      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("controlled: reports the key and follows the prop", () => {
    const onSelectionChange = vi.fn();
    const { rerender } = inLocale(<Tabs items={TABS} aria-label="Project" selectedKey="overview" onSelectionChange={onSelectionChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Notes" }));
    expect(onSelectionChange).toHaveBeenCalledWith("notes");
    expect(screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected")).toBe("true");
    rerender(
      <div>
        <DesignSystemProvider locale="en" navigate={vi.fn()}>
          <Tabs items={TABS} aria-label="Project" selectedKey="notes" onSelectionChange={onSelectionChange} />
        </DesignSystemProvider>
      </div>,
    );
    expect(screen.getByRole("tab", { name: "Notes" }).getAttribute("aria-selected")).toBe("true");
  });
});

const PERIODS = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

describe("SegmentedControl", () => {
  it("a named radio group; the chosen segment lifts (surface and shadow), one is always chosen", () => {
    const onChange = vi.fn();
    inLocale(<SegmentedControl label="Period" items={PERIODS} defaultValue="week" onChange={onChange} />);
    const group = screen.getByRole("radiogroup", { name: "Period" });
    const week = within(group).getByRole("radio", { name: "Week" });
    expect(week.getAttribute("aria-checked")).toBe("true");
    expect(classesOf(week)).toContain("data-[selected]:shadow-ds-raised");
    fireEvent.click(week);
    expect(week.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(within(group).getByRole("radio", { name: "Month" }));
    expect(onChange).toHaveBeenCalledWith("month");
  });

  it("arrow keys move between segments", () => {
    inLocale(<SegmentedControl label="Period" items={PERIODS} />);
    act(() => screen.getByRole("radio", { name: "Day" }).focus());
    press("ArrowRight");
    expect(document.activeElement?.textContent).toBe("Week");
  });
});

describe("Breadcrumbs", () => {
  const PATH = [
    { label: "Projects", href: "/projects" },
    { label: "Design team", href: "/projects/design" },
    { label: "Atlas · Q3 roadmap" },
  ];

  it("a named landmark with an ordered list; the page is current and not a link", () => {
    const { navigate } = inLocale(<Breadcrumbs items={PATH} />);
    const nav = screen.getByRole("navigation", { name: "Location" });
    expect(within(nav).getByRole("list").tagName).toBe("OL");
    expect(within(nav).getAllByRole("link")).toHaveLength(2);
    const current = within(nav).getByText("Atlas · Q3 roadmap");
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(current.closest("a")).toBeNull();
    fireEvent.click(within(nav).getByRole("link", { name: "Projects" }));
    expect(navigate).toHaveBeenCalledWith("/projects", undefined);
  });

  it("more than four levels fold the middle into a menu; root, parent and page stay", async () => {
    inLocale(
      <Breadcrumbs
        items={[
          { label: "Settings", href: "/s" },
          { label: "Account", href: "/s/a" },
          { label: "Billing", href: "/s/a/b" },
          { label: "Cards", href: "/s/a/b/c" },
          { label: "Payment methods" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Location" });
    expect(within(nav).getAllByRole("link").map((link) => link.textContent)).toEqual(["Settings", "Cards"]);
    fireEvent.click(within(nav).getByRole("button", { name: "Show hidden levels" }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((item) => [item.textContent, item.getAttribute("href")])).toEqual([
      ["Account", "/s/a"],
      ["Billing", "/s/a/b"],
    ]);
  });

  it("a folded level without a page is left out of the menu", async () => {
    inLocale(
      <Breadcrumbs
        items={[{ label: "Settings", href: "/s" }, { label: "Account" }, { label: "Billing", href: "/s/b" }, { label: "Cards", href: "/s/c" }, { label: "Payment methods" }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show hidden levels" }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Billing"]);
  });

  it("a fold whose levels have no page is a plain, hidden ellipsis, not an empty menu", () => {
    inLocale(
      <Breadcrumbs
        items={[{ label: "Settings", href: "/s" }, { label: "Account" }, { label: "Billing" }, { label: "Cards", href: "/s/c" }, { label: "Payment methods" }]}
      />,
    );
    expect(screen.queryByRole("button", { name: "Show hidden levels" })).toBeNull();
    const fold = document.querySelector("[data-slot='breadcrumbs-fold']")!;
    expect(fold.textContent).toBe("…");
    expect(fold.getAttribute("aria-hidden")).toBe("true");
  });

  it("separators point the reading direction and are hidden from screen readers (RTL)", () => {
    inLocale(<Breadcrumbs items={PATH} />, "he", "rtl");
    const separator = document.querySelector("[data-slot='breadcrumbs-separator']")!;
    expect(separator.getAttribute("aria-hidden")).toBe("true");
    expect(classesOf(separator)).toContain("rtl:-scale-x-100");
    expect(screen.getByRole("navigation", { name: "Location" })).toBeTruthy();
    expect(allClasses()).not.toMatch(PHYSICAL);
  });
});

describe("Pagination", () => {
  it("pageWindow keeps first, last, current and neighbours, with gaps", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(3, 61)).toEqual([1, 2, 3, 4, "gap", 61]);
    expect(pageWindow(30, 61)).toEqual([1, "gap", 29, 30, 31, "gap", 61]);
    // A gap of exactly one page shows the page, not "…".
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("states the range in the locale and marks the current page", () => {
    inLocale(<Pagination page={3} pageSize={20} total={1204} onPageChange={vi.fn()} />);
    expect(document.querySelector("[data-slot='pagination-range']")!.textContent).toBe("41–60 of 1,204");
    const nav = screen.getByRole("navigation", { name: "Pages" });
    const current = within(nav).getByRole("button", { name: "Page 3" });
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(classesOf(current)).toContain("aria-[current=page]:inset-ring-ds-border-selected");
    expect(document.querySelector("[data-slot='pagination-compact']")!.textContent).toBe("Page 3 of 61");
  });

  it("the consumer names the items in the range sentence", () => {
    inLocale(<Pagination page={3} pageSize={20} total={1204} onPageChange={vi.fn()} formatRange={(from, to, total) => `${from}–${to} of ${total} records`} />);
    expect(document.querySelector("[data-slot='pagination-range']")!.textContent).toBe("41–60 of 1204 records");
  });

  it("previous and next move one page and stop at the ends", () => {
    const onPageChange = vi.fn();
    inLocale(<Pagination page={1} pageSize={20} total={45} onPageChange={onPageChange} />);
    expect(screen.getByRole("button", { name: "Previous page" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("the page-size name formats the size as shown (label in name)", () => {
    inLocale(<Pagination page={1} pageSize={1000} total={5000} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} pageSizeOptions={[1000]} />);
    expect(screen.getByRole("button", { name: "Per page: 1,000" }).textContent).toContain("1,000");
  });

  it("a page size the options do not list joins them, so the control is never empty", async () => {
    const onPageSizeChange = vi.fn();
    inLocale(<Pagination page={1} pageSize={25} total={300} onPageChange={vi.fn()} onPageSizeChange={onPageSizeChange} />);
    const trigger = screen.getByRole("button", { name: "Per page: 25" });
    expect(trigger.textContent).toContain("25");
    fireEvent.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(within(menu).getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual(["20", "25", "50", "100"]);
    expect(within(menu).getByRole("menuitemradio", { name: "25" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(within(menu).getByRole("menuitemradio", { name: "50" }));
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it("an empty list states no range and has one page", () => {
    inLocale(<Pagination page={1} pageSize={20} total={0} onPageChange={vi.fn()} />);
    expect(document.querySelector("[data-slot='pagination-range']")!.textContent).toBe("");
    expect(screen.getByRole("button", { name: "Next page" }).hasAttribute("disabled")).toBe(true);
  });

  it("previous points to the inline start in RTL; logical sides only", () => {
    inLocale(<Pagination page={2} pageSize={20} total={100} onPageChange={vi.fn()} />, "ar", "rtl");
    const previous = document.querySelector("[data-slot='pagination-previous']")!;
    // Named for LTR and mirrored by IconGlyph on the RTL page: it points right, to the inline start.
    expect(previous.querySelector("[data-icon='chevron-left']")?.getAttribute("class")).toContain("rtl:-scale-x-100");
    expect(allClasses()).not.toMatch(PHYSICAL);
  });
});

const FAQ = [
  { id: "invoice", title: "When is my invoice issued?", content: "On the first day of each month." },
  { id: "refund", title: "Can I get a refund after cancelling?", content: "Yes, within 14 days." },
];

describe("Accordion and Disclosure", () => {
  it("each title is a heading holding a button with aria-expanded; one open at a time by default", () => {
    inLocale(<Accordion items={FAQ} defaultExpandedKeys={["invoice"]} />);
    const invoice = screen.getByRole("button", { name: "When is my invoice issued?" });
    const refund = screen.getByRole("button", { name: "Can I get a refund after cancelling?" });
    expect(invoice.closest("h3")).toBeTruthy();
    expect(invoice.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("On the first day of each month.")).toBeTruthy();
    fireEvent.click(refund);
    expect(refund.getAttribute("aria-expanded")).toBe("true");
    expect(invoice.getAttribute("aria-expanded")).toBe("false");
  });

  it("allowsMultipleExpanded keeps several open and reports the keys", () => {
    const onExpandedChange = vi.fn();
    inLocale(<Accordion items={FAQ} allowsMultipleExpanded onExpandedChange={onExpandedChange} headingLevel={2} />);
    fireEvent.click(screen.getByRole("button", { name: "When is my invoice issued?" }));
    fireEvent.click(screen.getByRole("button", { name: "Can I get a refund after cancelling?" }));
    expect([...onExpandedChange.mock.calls.at(-1)![0]].sort()).toEqual(["invoice", "refund"]);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
  });

  it("a single Disclosure opens from the keyboard and controls its panel", async () => {
    inLocale(<Disclosure title="Can I change my plan later?">Yes, at any time.</Disclosure>);
    const trigger = screen.getByRole("button", { name: "Can I change my plan later?" });
    act(() => trigger.focus());
    press("Enter", trigger);
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("true"));
    const panel = document.getElementById(trigger.getAttribute("aria-controls")!)!;
    expect(panel.textContent).toContain("Yes, at any time.");
  });
});
