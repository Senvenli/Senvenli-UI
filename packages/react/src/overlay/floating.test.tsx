import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { DesignSystemProvider } from "../provider";
import { Menu, Popover, Tooltip, type MenuEntry } from "./index";

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
  const ariaWarnings = warn.mock.calls.map(([message]: unknown[]) => String(message)).filter((message: string) => /aria-label|accessible|trigger|provider/i.test(message));
  warn.mockRestore();
  vi.useRealTimers();
  expect(ariaWarnings).toEqual([]);
});

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

function press(key: string, target: Element = document.activeElement ?? document.body) {
  fireEvent.keyDown(target, { key });
  fireEvent.keyUp(target, { key });
}

describe("Popover", () => {
  function Filters() {
    return (
      <Popover trigger={<Button>Filters</Button>} title="Filter">
        <label>
          <input type="checkbox" defaultChecked /> Only available items
        </label>
        <Button variant="primary">Apply</Button>
      </Popover>
    );
  }

  it("opens from its trigger, named by its title, with focus inside and an arrow", async () => {
    inLocale(<Filters />);
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = screen.getByRole("dialog", { name: "Filter" });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    expect(document.querySelector("[data-slot='popover-arrow']")).toBeTruthy();
  });

  it("Esc closes it and focus returns to the trigger", async () => {
    inLocale(<Filters />);
    const trigger = screen.getByRole("button", { name: "Filters" });
    act(() => trigger.focus());
    fireEvent.click(trigger);
    press("Escape", screen.getByRole("dialog"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("240–360px wide; it scrolls inside when the screen is short", () => {
    inLocale(<Filters />);
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    const popover = document.querySelector("[data-slot='popover']")!;
    expect(popover.className).toContain("min-w-60");
    expect(popover.className).toContain("max-w-90");
    // The content scrolls inside, capped to the surface's height; the surface itself does not clip (the arrow).
    expect(document.querySelector("[data-slot='popover-dialog']")!.className).toContain("overflow-auto");
    expect(document.querySelector("[data-slot='popover-dialog']")!.className).toContain("max-h-[inherit]");
    expect(popover.className).toContain("duration-(--ds-duration-medium)");
  });
});

describe("Tooltip", () => {
  it("an icon-only button keeps its aria-label; the tooltip describes it, after 300ms of hover", () => {
    vi.useFakeTimers();
    inLocale(
      <Tooltip content="Filter" shortcut="F">
        <Button iconOnly iconBefore="sliders-horizontal" aria-label="Filter" />
      </Tooltip>,
    );
    const button = screen.getByRole("button", { name: "Filter" });
    // React Aria opens tooltips on hover only once the user is on a pointer; a move sets that, as in a browser.
    fireEvent.pointerMove(document.body, { pointerType: "mouse" });
    fireEvent.pointerDown(document.body, { pointerType: "mouse" });
    fireEvent.pointerUp(document.body, { pointerType: "mouse" });
    // React builds onPointerEnter from pointerover.
    fireEvent.pointerOver(button, { pointerType: "mouse" });
    fireEvent.mouseOver(button);
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole("tooltip")).toBeNull();
    act(() => vi.advanceTimersByTime(150));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toBe("FilterF");
    expect(button.getAttribute("aria-describedby")).toBe(tooltip.id);
    expect(screen.getByRole("button", { name: "Filter" })).toBe(button);
  });

  it("keyboard focus shows it at once; Esc hides it", () => {
    inLocale(
      <Tooltip content="Filter">
        <Button iconOnly iconBefore="sliders-horizontal" aria-label="Filter" />
      </Tooltip>,
    );
    fireEvent.keyDown(document.body, { key: "Tab" });
    const button = screen.getByRole("button", { name: "Filter" });
    act(() => button.focus());
    expect(screen.getByRole("tooltip")).toBeTruthy();
    press("Escape", button);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("a non-interactive trigger (a truncated lozenge) is made focusable, so keyboard users get it too", () => {
    inLocale(
      <Tooltip content="Due 18 Oct 10:00 · 2 h 14 min late">
        <span>Overdue</span>
      </Tooltip>,
    );
    const lozenge = screen.getByText("Overdue");
    expect(lozenge.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => lozenge.focus());
    expect(screen.getByRole("tooltip").textContent).toContain("2 h 14 min");
  });

  it("needs no provider: two tooltips render side by side with nothing around them", () => {
    render(
      <>
        <Tooltip content="A"><button>a</button></Tooltip>
        <Tooltip content="B"><button>b</button></Tooltip>
      </>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});

const ITEMS: MenuEntry[] = [
  { id: "cancel", label: "Cancel order", icon: "circle-x", tone: "danger" },
  { id: "edit", label: "Edit", icon: "pencil", shortcut: "E" },
  { id: "copy", label: "Duplicate", icon: "copy" },
  {
    id: "owner",
    label: "Change owner",
    icon: "arrow-left-right",
    children: [
      { id: "design", label: "Design team" },
      { id: "support", label: "Support team" },
    ],
  },
  { id: "mail", label: "Mail the customer", icon: "send" },
  { id: "invoice", label: "Issue invoice (awaiting payment)", icon: "receipt", isDisabled: true },
];

function RowMenu(props: Partial<React.ComponentProps<typeof Menu>>) {
  return (
    <Menu
      trigger={<Button iconOnly iconBefore="ellipsis" aria-label="Order actions" />}
      items={ITEMS}
      {...props}
    />
  );
}

describe("Menu", () => {
  it("lists verbs; the destructive action sits last, after a separator", () => {
    inLocale(<RowMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Order actions" }));
    const menu = screen.getByRole("menu");
    const items = within(menu).getAllByRole("menuitem").map((item) => item.textContent);
    expect(items.at(-1)).toBe("Cancel order");
    expect(items[0]).toBe("EditE");
    const last = within(menu).getAllByRole("menuitem").at(-1)!;
    expect(last.previousElementSibling?.getAttribute("role")).toBe("separator");
    expect(last.className).toContain("text-ds-text-danger");
    expect(within(menu).getByRole("menuitem", { name: /Issue invoice/ }).getAttribute("aria-disabled")).toBe("true");
  });

  it("keyboard: arrows, Home/End, type-ahead, Enter acts, Esc returns focus to the trigger", async () => {
    const onAction = vi.fn();
    inLocale(<RowMenu onAction={onAction} />);
    const trigger = screen.getByRole("button", { name: "Order actions" });
    act(() => trigger.focus());
    press("Enter", trigger);
    const menu = await screen.findByRole("menu");
    await waitFor(() => expect(document.activeElement?.textContent).toBe("EditE"));
    press("ArrowDown");
    expect(document.activeElement?.textContent).toBe("Duplicate");
    press("End");
    expect(document.activeElement?.textContent).toBe("Cancel order");
    press("Home");
    expect(document.activeElement?.textContent).toBe("EditE");
    fireEvent.keyDown(document.activeElement!, { key: "m" });
    expect(document.activeElement?.textContent).toBe("Mail the customer");
    press("Enter");
    expect(onAction.mock.calls.at(-1)?.[0]).toBe("mail");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    // React Aria restores focus a frame after the menu unmounts.
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    void menu;
  });

  it("Esc closes and returns focus to the trigger", async () => {
    inLocale(<RowMenu />);
    const trigger = screen.getByRole("button", { name: "Order actions" });
    act(() => trigger.focus());
    press("Enter", trigger);
    await screen.findByRole("menu");
    press("Escape");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    // React Aria restores focus a frame after the menu unmounts.
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("a submenu opens on →", async () => {
    inLocale(<RowMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Order actions" }));
    const owner = screen.getByRole("menuitem", { name: "Change owner" });
    act(() => owner.focus());
    press("ArrowRight", owner);
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Design team" })).toBeTruthy());
  });

  it("sections carry titles; a selection mode shows checkmarks", () => {
    inLocale(
      <Menu
        trigger={<Button>View</Button>}
        selectionMode="single"
        defaultSelectedKeys={["list"]}
        items={[{ id: "view", title: "View", items: [{ id: "list", label: "List" }, { id: "calendar", label: "Calendar" }] }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(document.querySelector("[data-slot='menu-section-title']")?.textContent).toBe("View");
    const list = screen.getByRole("menuitemradio", { name: "List" });
    expect(list.getAttribute("aria-checked")).toBe("true");
    expect(list.querySelector("[data-slot='menu-item-check'] svg")).toBeTruthy();
  });

  describe("a row menu stays anchored to its trigger", () => {
    // jsdom reports a 0px-wide document, which would clamp every overlay to the left edge (the very symptom).
    // Give the page a real viewport so React Aria positions as a browser does.
    beforeEach(() => {
      Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 1280 });
      Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: 900 });
    });
    afterEach(() => {
      delete (document.documentElement as unknown as Record<string, unknown>).clientWidth;
      delete (document.documentElement as unknown as Record<string, unknown>).clientHeight;
    });
    function openAt(left: number) {
      const trigger = screen.getByRole("button", { name: "Order actions" });
      trigger.getBoundingClientRect = () => ({ left, right: left + 32, top: 400, bottom: 432, width: 32, height: 32, x: left, y: 400, toJSON: () => ({}) });
      fireEvent.click(trigger);
      const popover = document.querySelector<HTMLElement>("[data-slot='menu-popover']")!;
      return { left: parseFloat(popover.style.left), top: parseFloat(popover.style.top), placement: popover.getAttribute("data-placement") };
    }

    it("LTR: under the trigger, its end on the trigger's end (a row's … at the right edge)", () => {
      inLocale(<RowMenu />);
      const box = openAt(900);
      expect(box.placement).toBe("bottom");
      expect(box.top).toBe(436);
      // jsdom measures the menu as 0px wide, so its end and start coincide at the trigger's right edge.
      expect(box.left).toBe(932);
    });

    it("RTL: under the trigger, its end on the trigger's end, which is its left edge", () => {
      inLocale(<RowMenu />, "ar", "rtl");
      const box = openAt(100);
      expect(box.placement).toBe("bottom");
      expect(box.top).toBe(436);
      expect(box.left).toBe(100);
    });
  });

  it("RTL: the submenu chevron mirrors; no physical classes", () => {
    inLocale(<RowMenu />, "ar", "rtl");
    fireEvent.click(screen.getByRole("button", { name: "Order actions" }));
    expect(document.querySelector("[data-slot='menu-item-submenu']")!.getAttribute("class")).toContain("rtl:-scale-x-100");
    for (const el of Array.from(document.querySelectorAll("[data-slot^='menu'] , [data-slot^='menu'] [class]"))) {
      expect(el.getAttribute("class") ?? "").not.toMatch(PHYSICAL);
    }
  });
});

describe("Menu order, tooltip triggers and popover clipping", () => {
  function open(items: MenuEntry[]) {
    inLocale(<Menu trigger={<Button>Open</Button>} items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const menu = screen.getByRole("menu");
    // What a screen reader walks through: items and separators in DOM order.
    return Array.from(menu.querySelectorAll("[role='menuitem'], [role='separator']")).map((el) =>
      el.getAttribute("role") === "separator" ? "|" : el.textContent,
    );
  }

  it("mixed entries keep their order; separators only between groups, none leading", () => {
    expect(
      open([
        { id: "a", label: "Loose first" },
        { id: "s", title: "Section", items: [{ id: "x", label: "In section" }] },
        { id: "b", label: "Loose last" },
      ]),
    ).toEqual(["Loose first", "|", "In section", "|", "Loose last"]);
  });

  it("the destructive item goes last, after a separator, whichever group it came from", () => {
    expect(
      open([
        { id: "s1", title: "Record", items: [{ id: "edit", label: "Edit" }, { id: "del", label: "Delete", tone: "danger" }] },
        { id: "s2", title: "Share", items: [{ id: "mail", label: "Email" }] },
      ]),
    ).toEqual(["Edit", "|", "Email", "|", "Delete"]);
    cleanup();
    expect(open([{ id: "s1", title: "Record", items: [{ id: "edit", label: "Edit" }] }, { id: "del", label: "Delete", tone: "danger" }])).toEqual([
      "Edit",
      "|",
      "Delete",
    ]);
  });

  it("a component trigger (the DS Badge) gets a focusable wrapper and its tooltip", async () => {
    const { Badge } = await import("../display/index");
    inLocale(
      <Tooltip content="Due 18 Oct 10:00 · 2 h 14 min late">
        <Badge tone="danger">Overdue</Badge>
      </Tooltip>,
    );
    const target = document.querySelector<HTMLElement>("[data-slot='tooltip-target']")!;
    expect(target.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => target.focus());
    expect(screen.getByRole("tooltip").textContent).toContain("2 h 14 min");
  });

  it("a DS button is used as it is (no extra tab stop)", () => {
    inLocale(
      <Tooltip content="Filter">
        <Button iconOnly iconBefore="sliders-horizontal" aria-label="Filter" />
      </Tooltip>,
    );
    expect(document.querySelector("[data-slot='tooltip-target']")).toBeNull();
  });

  it("a plain element keeps its own tabIndex", () => {
    inLocale(
      <Tooltip content="x">
        <span tabIndex={-1}>y</span>
      </Tooltip>,
    );
    expect(screen.getByText("y").getAttribute("tabindex")).toBe("-1");
  });

  it("the surface does not clip (the arrow sits outside it); the content scrolls inside", () => {
    inLocale(
      <Popover trigger={<Button>Filters</Button>} title="Filter">
        x
      </Popover>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(document.querySelector("[data-slot='popover']")!.className).not.toContain("overflow-auto");
    expect(document.querySelector("[data-slot='popover-dialog']")!.className).toContain("overflow-auto");
  });

  it("the tooltip's shortcut is the DS Kbd", () => {
    inLocale(
      <Tooltip content="Filter" shortcut="F">
        <Button iconOnly iconBefore="sliders-horizontal" aria-label="Filter" />
      </Tooltip>,
    );
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => screen.getByRole("button", { name: "Filter" }).focus());
    expect(screen.getByRole("tooltip").querySelector("[data-slot='kbd']")?.textContent).toBe("F");
  });
});

describe("one tab stop per tooltip trigger", () => {
  it("a DS Fab is used as it is", async () => {
    const { Fab } = await import("../action/index");
    inLocale(
      <Tooltip content="New">
        <Fab label="New" icon="plus" placement="inline" />
      </Tooltip>,
    );
    expect(document.querySelector("[data-slot='tooltip-target']")).toBeNull();
  });

  it("a wrapper around something already focusable takes no tab stop of its own", async () => {
    const { Button: AriaButton } = await import("react-aria-components");
    inLocale(
      <Tooltip content="Raw">
        <AriaButton>raw</AriaButton>
      </Tooltip>,
    );
    const wrapper = document.querySelector("[data-slot='tooltip-target']")!;
    // Out of the tab order (-1): the button inside is the one stop.
    expect(wrapper.getAttribute("tabindex")).toBe("-1");
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => screen.getByRole("button", { name: "raw" }).focus());
    expect(screen.getByRole("tooltip").textContent).toBe("Raw");
  });
});
