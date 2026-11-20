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

function inLocale(ui: React.ReactElement, locale = "tr-TR", dir?: "rtl") {
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

describe("Popover (RENENG-3375)", () => {
  function Filters() {
    return (
      <Popover trigger={<Button>Filtre</Button>} title="Filtrele">
        <label>
          <input type="checkbox" defaultChecked /> Yalnız müsait araçlar
        </label>
        <Button variant="primary">Uygula</Button>
      </Popover>
    );
  }

  it("opens from its trigger, named by its title, with focus inside and an arrow", async () => {
    inLocale(<Filters />);
    fireEvent.click(screen.getByRole("button", { name: "Filtre" }));
    const dialog = screen.getByRole("dialog", { name: "Filtrele" });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    expect(document.querySelector("[data-slot='popover-arrow']")).toBeTruthy();
  });

  it("Esc closes it and focus returns to the trigger", async () => {
    inLocale(<Filters />);
    const trigger = screen.getByRole("button", { name: "Filtre" });
    act(() => trigger.focus());
    fireEvent.click(trigger);
    press("Escape", screen.getByRole("dialog"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("240–360px wide; it scrolls inside when the screen is short", () => {
    inLocale(<Filters />);
    fireEvent.click(screen.getByRole("button", { name: "Filtre" }));
    const popover = document.querySelector("[data-slot='popover']")!;
    expect(popover.className).toContain("min-w-60");
    expect(popover.className).toContain("max-w-90");
    // The content scrolls inside, capped to the surface's height; the surface itself does not clip (the arrow).
    expect(document.querySelector("[data-slot='popover-dialog']")!.className).toContain("overflow-auto");
    expect(document.querySelector("[data-slot='popover-dialog']")!.className).toContain("max-h-[inherit]");
    expect(popover.className).toContain("duration-(--ds-duration-medium)");
  });
});

describe("Tooltip (RENENG-3375)", () => {
  it("an icon-only button keeps its aria-label; the tooltip describes it, after 300ms of hover", () => {
    vi.useFakeTimers();
    inLocale(
      <Tooltip content="Filtrele" shortcut="F">
        <Button iconOnly iconBefore="sliders-horizontal" aria-label="Filtrele" />
      </Tooltip>,
    );
    const button = screen.getByRole("button", { name: "Filtrele" });
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
    expect(tooltip.textContent).toBe("FiltreleF");
    expect(button.getAttribute("aria-describedby")).toBe(tooltip.id);
    expect(screen.getByRole("button", { name: "Filtrele" })).toBe(button);
  });

  it("keyboard focus shows it at once; Esc hides it", () => {
    inLocale(
      <Tooltip content="Filtrele">
        <Button iconOnly iconBefore="sliders-horizontal" aria-label="Filtrele" />
      </Tooltip>,
    );
    fireEvent.keyDown(document.body, { key: "Tab" });
    const button = screen.getByRole("button", { name: "Filtrele" });
    act(() => button.focus());
    expect(screen.getByRole("tooltip")).toBeTruthy();
    press("Escape", button);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("a non-interactive trigger (a truncated lozenge) is made focusable, so keyboard users get it too", () => {
    inLocale(
      <Tooltip content="Son iade 18 Eki 10:00 · 2 saat 14 dk gecikme">
        <span>Gecikmiş</span>
      </Tooltip>,
    );
    const lozenge = screen.getByText("Gecikmiş");
    expect(lozenge.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => lozenge.focus());
    expect(screen.getByRole("tooltip").textContent).toContain("2 saat 14 dk");
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
  { id: "cancel", label: "Rezervasyonu iptal et", icon: "circle-x", tone: "danger" },
  { id: "edit", label: "Düzenle", icon: "pencil", shortcut: "E" },
  { id: "copy", label: "Kopyasını oluştur", icon: "copy" },
  {
    id: "swap",
    label: "Araç değiştir",
    icon: "arrow-left-right",
    children: [
      { id: "golf", label: "VW Golf 8" },
      { id: "duster", label: "Dacia Duster" },
    ],
  },
  { id: "mail", label: "Müşteriye e-posta gönder", icon: "send" },
  { id: "invoice", label: "Fatura kes (ödeme bekleniyor)", icon: "receipt", isDisabled: true },
];

function RowMenu(props: Partial<React.ComponentProps<typeof Menu>>) {
  return (
    <Menu
      trigger={<Button iconOnly iconBefore="ellipsis" aria-label="Rezervasyon işlemleri" />}
      items={ITEMS}
      {...props}
    />
  );
}

describe("Menu (RENENG-3375)", () => {
  it("lists verbs; the destructive action sits last, after a separator", () => {
    inLocale(<RowMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Rezervasyon işlemleri" }));
    const menu = screen.getByRole("menu");
    const items = within(menu).getAllByRole("menuitem").map((item) => item.textContent);
    expect(items.at(-1)).toBe("Rezervasyonu iptal et");
    expect(items[0]).toBe("DüzenleE");
    const last = within(menu).getAllByRole("menuitem").at(-1)!;
    expect(last.previousElementSibling?.getAttribute("role")).toBe("separator");
    expect(last.className).toContain("text-ds-text-danger");
    expect(within(menu).getByRole("menuitem", { name: /Fatura kes/ }).getAttribute("aria-disabled")).toBe("true");
  });

  it("keyboard: arrows, Home/End, type-ahead, Enter acts, Esc returns focus to the trigger", async () => {
    const onAction = vi.fn();
    inLocale(<RowMenu onAction={onAction} />);
    const trigger = screen.getByRole("button", { name: "Rezervasyon işlemleri" });
    act(() => trigger.focus());
    press("Enter", trigger);
    const menu = await screen.findByRole("menu");
    await waitFor(() => expect(document.activeElement?.textContent).toBe("DüzenleE"));
    press("ArrowDown");
    expect(document.activeElement?.textContent).toBe("Kopyasını oluştur");
    press("End");
    expect(document.activeElement?.textContent).toBe("Rezervasyonu iptal et");
    press("Home");
    expect(document.activeElement?.textContent).toBe("DüzenleE");
    fireEvent.keyDown(document.activeElement!, { key: "m" });
    expect(document.activeElement?.textContent).toBe("Müşteriye e-posta gönder");
    press("Enter");
    expect(onAction.mock.calls.at(-1)?.[0]).toBe("mail");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    // React Aria restores focus a frame after the menu unmounts.
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    void menu;
  });

  it("Esc closes and returns focus to the trigger", async () => {
    inLocale(<RowMenu />);
    const trigger = screen.getByRole("button", { name: "Rezervasyon işlemleri" });
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
    fireEvent.click(screen.getByRole("button", { name: "Rezervasyon işlemleri" }));
    const swap = screen.getByRole("menuitem", { name: "Araç değiştir" });
    act(() => swap.focus());
    press("ArrowRight", swap);
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "VW Golf 8" })).toBeTruthy());
  });

  it("sections carry titles; a selection mode shows checkmarks", () => {
    inLocale(
      <Menu
        trigger={<Button>Görünüm</Button>}
        selectionMode="single"
        defaultSelectedKeys={["list"]}
        items={[{ id: "view", title: "Görünüm", items: [{ id: "list", label: "Liste" }, { id: "calendar", label: "Takvim" }] }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Görünüm" }));
    expect(document.querySelector("[data-slot='menu-section-title']")?.textContent).toBe("Görünüm");
    const list = screen.getByRole("menuitemradio", { name: "Liste" });
    expect(list.getAttribute("aria-checked")).toBe("true");
    expect(list.querySelector("[data-slot='menu-item-check'] svg")).toBeTruthy();
  });

  describe("RENENG-3258: a row menu stays anchored to its trigger", () => {
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
      const trigger = screen.getByRole("button", { name: "Rezervasyon işlemleri" });
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
    fireEvent.click(screen.getByRole("button", { name: "Rezervasyon işlemleri" }));
    expect(document.querySelector("[data-slot='menu-item-submenu']")!.getAttribute("class")).toContain("rtl:-scale-x-100");
    for (const el of Array.from(document.querySelectorAll("[data-slot^='menu'] , [data-slot^='menu'] [class]"))) {
      expect(el.getAttribute("class") ?? "").not.toMatch(PHYSICAL);
    }
  });
});

describe("review of the first PR head (RENENG-3375)", () => {
  function open(items: MenuEntry[]) {
    inLocale(<Menu trigger={<Button>Aç</Button>} items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    const menu = screen.getByRole("menu");
    // What a screen reader walks through: items and separators in DOM order.
    return Array.from(menu.querySelectorAll("[role='menuitem'], [role='separator']")).map((el) =>
      el.getAttribute("role") === "separator" ? "|" : el.textContent,
    );
  }

  it("3. mixed entries keep their order; separators only between groups, none leading", () => {
    expect(
      open([
        { id: "a", label: "Loose first" },
        { id: "s", title: "Bölüm", items: [{ id: "x", label: "In section" }] },
        { id: "b", label: "Loose last" },
      ]),
    ).toEqual(["Loose first", "|", "In section", "|", "Loose last"]);
  });

  it("4. the destructive item goes last, after a separator, whichever group it came from", () => {
    expect(
      open([
        { id: "s1", title: "Kayıt", items: [{ id: "edit", label: "Düzenle" }, { id: "del", label: "Sil", tone: "danger" }] },
        { id: "s2", title: "Paylaş", items: [{ id: "mail", label: "E-posta" }] },
      ]),
    ).toEqual(["Düzenle", "|", "E-posta", "|", "Sil"]);
    cleanup();
    expect(open([{ id: "s1", title: "Kayıt", items: [{ id: "edit", label: "Düzenle" }] }, { id: "del", label: "Sil", tone: "danger" }])).toEqual([
      "Düzenle",
      "|",
      "Sil",
    ]);
  });

  it("5. a component trigger (the DS Lozenge) gets a focusable wrapper and its tooltip", async () => {
    const { Lozenge } = await import("../display/index");
    inLocale(
      <Tooltip content="Son iade 18 Eki 10:00 · 2 saat 14 dk gecikme">
        <Lozenge tone="danger">Gecikmiş</Lozenge>
      </Tooltip>,
    );
    const target = document.querySelector<HTMLElement>("[data-slot='tooltip-target']")!;
    expect(target.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => target.focus());
    expect(screen.getByRole("tooltip").textContent).toContain("2 saat 14 dk");
  });

  it("5. a DS button is used as it is (no extra tab stop)", () => {
    inLocale(
      <Tooltip content="Filtrele">
        <Button iconOnly iconBefore="sliders-horizontal" aria-label="Filtrele" />
      </Tooltip>,
    );
    expect(document.querySelector("[data-slot='tooltip-target']")).toBeNull();
  });

  it("6. a plain element keeps its own tabIndex", () => {
    inLocale(
      <Tooltip content="x">
        <span tabIndex={-1}>y</span>
      </Tooltip>,
    );
    expect(screen.getByText("y").getAttribute("tabindex")).toBe("-1");
  });

  it("1. the surface does not clip (the arrow sits outside it); the content scrolls inside", () => {
    inLocale(
      <Popover trigger={<Button>Filtre</Button>} title="Filtrele">
        x
      </Popover>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Filtre" }));
    expect(document.querySelector("[data-slot='popover']")!.className).not.toContain("overflow-auto");
    expect(document.querySelector("[data-slot='popover-dialog']")!.className).toContain("overflow-auto");
  });

  it("7. the tooltip's shortcut is the DS Kbd", () => {
    inLocale(
      <Tooltip content="Filtrele" shortcut="F">
        <Button iconOnly iconBefore="sliders-horizontal" aria-label="Filtrele" />
      </Tooltip>,
    );
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => screen.getByRole("button", { name: "Filtrele" }).focus());
    expect(screen.getByRole("tooltip").querySelector("[data-slot='kbd']")?.textContent).toBe("F");
  });
});

describe("review of 56e56f3: one tab stop per tooltip trigger (RENENG-3375 nit)", () => {
  it("a DS Fab is used as it is", async () => {
    const { Fab } = await import("../action/index");
    inLocale(
      <Tooltip content="Yeni">
        <Fab label="Yeni" icon="plus" placement="inline" />
      </Tooltip>,
    );
    expect(document.querySelector("[data-slot='tooltip-target']")).toBeNull();
  });

  it("a wrapper around something already focusable takes no tab stop of its own", async () => {
    const { Button: AriaButton } = await import("react-aria-components");
    inLocale(
      <Tooltip content="Ham">
        <AriaButton>ham</AriaButton>
      </Tooltip>,
    );
    const wrapper = document.querySelector("[data-slot='tooltip-target']")!;
    // Out of the tab order (-1): the button inside is the one stop.
    expect(wrapper.getAttribute("tabindex")).toBe("-1");
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => screen.getByRole("button", { name: "ham" }).focus());
    expect(screen.getByRole("tooltip").textContent).toBe("Ham");
  });
});
