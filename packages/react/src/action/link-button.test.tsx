import * as React from "react";
import { renderToString } from "react-dom/server";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Button } from "./index";
import { LinkButton } from "./link-button";
import { BUTTON_BASE, BUTTON_SIZE, BUTTON_VARIANT, ICON_ONLY_SIZE, LINK_BUTTON_PADDING, type ButtonSize, type ButtonVariant } from "./styles";

afterEach(cleanup);

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const VARIANTS: ButtonVariant[] = ["primary", "default", "subtle", "link"];
const SIZES: ButtonSize[] = ["small", "medium", "large"];
const classesOf = (element: Element | null) => element?.getAttribute("class") ?? "";
const classSet = (element: Element | null) => new Set(classesOf(element).split(/\s+/).filter(Boolean));

function withProvider(ui: React.ReactElement, { locale = "en", navigate = vi.fn(), dir }: { locale?: string; navigate?: (href: string, options?: unknown) => void; dir?: "rtl" } = {}) {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={navigate}>{ui}</DesignSystemProvider>
    </div>,
  );
}

/** Dispatches a click the way the browser does and reports whether something cancelled it. */
function click(element: Element, init: MouseEventInit = {}) {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, detail: 1, ...init });
  act(() => {
    element.dispatchEvent(event);
  });
  return event;
}

function key(element: Element, value: string) {
  fireEvent.keyDown(element, { key: value });
  fireEvent.keyUp(element, { key: value });
}

describe("LinkButton, server-rendered", () => {
  it("is a real <a href> in the server HTML, with no handler needed to navigate", () => {
    const html = renderToString(
      <DesignSystemProvider locale="en" navigate={() => {}}>
        <LinkButton href="/items/new" variant="primary" onPress={() => {}}>Add item</LinkButton>
      </DesignSystemProvider>,
    );
    const template = document.createElement("template");
    template.innerHTML = html;
    const anchor = template.content.querySelector("[data-slot='link-button']")!;
    expect(anchor.tagName).toBe("A");
    expect(anchor.getAttribute("href")).toBe("/items/new");
    expect(anchor.textContent).toBe("Add item");
    // No JS: nothing in the markup stands between the reader and the href (no onclick, no role override).
    expect(html).not.toMatch(/onclick/i);
    expect(anchor.hasAttribute("role")).toBe(false);
    expect(anchor.hasAttribute("aria-disabled")).toBe(false);
    // In the tab order, as any link.
    expect(anchor.getAttribute("tabindex")).toBe("0");
  });
});

describe("LinkButton, onPress", () => {
  it("a plain primary click calls onPress and cancels the navigation, router included", () => {
    const onPress = vi.fn();
    const navigate = vi.fn();
    withProvider(<LinkButton href="/items/new" onPress={onPress}>Add item</LinkButton>, { navigate });
    const event = click(screen.getByRole("link", { name: "Add item" }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress.mock.calls[0]![0].type).toBe("click");
    expect(event.defaultPrevented).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  for (const [name, init] of [
    ["ctrl", { ctrlKey: true }],
    ["meta (cmd)", { metaKey: true }],
    ["shift", { shiftKey: true }],
    ["alt", { altKey: true }],
  ] as const) {
    it(`a ${name} click is left to the browser: not intercepted, onPress not called`, () => {
      const onPress = vi.fn();
      const navigate = vi.fn();
      withProvider(<LinkButton href="/items/new" onPress={onPress}>Add item</LinkButton>, { navigate });
      const event = click(screen.getByRole("link"), init);
      expect(onPress).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
      // React Aria's router also leaves a modified click alone, so the browser opens the tab or window.
      expect(navigate).not.toHaveBeenCalled();
    });
  }

  it("a middle-button click is not intercepted", () => {
    // Outside a DesignSystemProvider React Aria's router is the browser's own, so whatever cancels the
    // event here could only be LinkButton. (Browsers fire auxclick, not click, for the middle button; the
    // next test covers that path under the provider.)
    const onPress = vi.fn();
    render(<LinkButton href="/items/new" onPress={onPress}>Add item</LinkButton>);
    const event = click(screen.getByRole("link"), { button: 1 });
    expect(onPress).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("a middle-button auxclick is not intercepted either", () => {
    const onPress = vi.fn();
    withProvider(<LinkButton href="/items/new" onPress={onPress}>Add item</LinkButton>);
    const event = new MouseEvent("auxclick", { bubbles: true, cancelable: true, button: 1 });
    act(() => {
      screen.getByRole("link").dispatchEvent(event);
    });
    expect(onPress).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("without onPress nothing is intercepted: an internal link goes through the host router, as Link does", () => {
    const navigate = vi.fn();
    withProvider(<LinkButton href="/orders">Orders</LinkButton>, { navigate });
    const link = screen.getByRole("link", { name: "Orders" });
    const event = click(link);
    expect(navigate).toHaveBeenCalledWith("/orders", undefined);
    // The router cancels the full page load itself (client navigation); that is React Aria's, not LinkButton's.
    expect(event.defaultPrevented).toBe(true);
    cleanup();
    const modified = vi.fn();
    withProvider(<LinkButton href="/orders">Orders</LinkButton>, { navigate: modified });
    const ctrl = click(screen.getByRole("link"), { ctrlKey: true });
    expect(ctrl.defaultPrevented).toBe(false);
    expect(modified).not.toHaveBeenCalled();
  });

  it("a touch tap (pointer sequence, then the click) calls onPress once and never the router", () => {
    const onPress = vi.fn();
    const navigate = vi.fn();
    withProvider(<LinkButton href="/items/new" onPress={onPress}>Add item</LinkButton>, { navigate });
    const link = screen.getByRole("link");
    const touch = { pointerType: "touch", pointerId: 2, width: 1, height: 1, isPrimary: true, clientX: 1, clientY: 1 };
    fireEvent.pointerDown(link, { ...touch, buttons: 1 });
    fireEvent.pointerUp(link, { ...touch, buttons: 0 });
    const event = click(link);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("a virtual click (detail 0 with no keydown: a screen reader's activation) calls onPress once, no router", () => {
    const onPress = vi.fn();
    const navigate = vi.fn();
    withProvider(<LinkButton href="/items/new" onPress={onPress}>Add item</LinkButton>, { navigate });
    const event = click(screen.getByRole("link"), { detail: 0 });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("an onClickCapture of the caller still runs, and a click it cancels does not reach onPress", () => {
    const onPress = vi.fn();
    const onClickCapture = vi.fn((event: React.MouseEvent) => event.preventDefault());
    withProvider(<LinkButton href="/x" onPress={onPress} onClickCapture={onClickCapture}>X</LinkButton>);
    click(screen.getByRole("link"));
    expect(onClickCapture).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("LinkButton, keyboard and semantics", () => {
  it("has role link (not button) and its label as the accessible name", () => {
    withProvider(<LinkButton href="/items/new" variant="primary">Add item</LinkButton>);
    const link = screen.getByRole("link", { name: "Add item" });
    expect(link.tagName).toBe("A");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("an icon-only LinkButton is named by its aria-label; the icon is hidden", () => {
    withProvider(<LinkButton href="/settings" iconOnly iconBefore="settings" aria-label="Settings" />);
    const link = screen.getByRole("link", { name: "Settings" });
    expect(link.querySelector("[data-slot='link-button-icon']")!.getAttribute("aria-hidden")).toBe("true");
    for (const utility of ICON_ONLY_SIZE.medium.split(" ")) expect(classSet(link).has(utility), utility).toBe(true);
  });

  it("Enter activates: React Aria takes Enter as a press on a link and the browser's Enter click runs onPress", () => {
    const onPress = vi.fn();
    withProvider(<LinkButton href="/items/new" onPress={onPress}>Add item</LinkButton>);
    const link = screen.getByRole("link");
    act(() => link.focus());
    fireEvent.keyDown(link, { key: "Enter" });
    expect(link.hasAttribute("data-pressed")).toBe(true);
    // jsdom has no default actions: this is the click a browser fires for Enter on <a href> (detail 0).
    const event = click(link, { detail: 0 });
    fireEvent.keyUp(link, { key: "Enter" });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("Space does not activate: no press, no onPress, no router navigation", () => {
    const onPress = vi.fn();
    const navigate = vi.fn();
    withProvider(<LinkButton href="/items/new" onPress={onPress}>Add item</LinkButton>, { navigate });
    const link = screen.getByRole("link");
    act(() => link.focus());
    fireEvent.keyDown(link, { key: " " });
    expect(link.hasAttribute("data-pressed")).toBe(false);
    fireEvent.keyUp(link, { key: " " });
    expect(onPress).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    // Without onPress, Space does not follow the link either (React Aria opens links only for Enter).
    cleanup();
    const plain = vi.fn();
    withProvider(<LinkButton href="/items/new">Add item</LinkButton>, { navigate: plain });
    const other = screen.getByRole("link");
    act(() => other.focus());
    key(other, " ");
    expect(plain).not.toHaveBeenCalled();
  });

  it("keyboard focus is visible (Button's inner ring), pointer focus is not", () => {
    withProvider(<LinkButton href="/x" variant="primary">X</LinkButton>);
    const link = screen.getByRole("link");
    fireEvent.pointerDown(link, { pointerType: "mouse", pointerId: 1, detail: 1, buttons: 1, width: 1, height: 1 });
    fireEvent.mouseDown(link, { detail: 1, buttons: 1 });
    act(() => link.focus());
    expect(link.hasAttribute("data-focus-visible")).toBe(false);
    act(() => link.blur());
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => link.focus());
    expect(link.hasAttribute("data-focus-visible")).toBe(true);
    expect(classesOf(link)).toContain("data-[focus-visible]:inset-ring-2");
    expect(classesOf(link)).toContain("data-[focus-visible]:inset-ring-ds-text-on-brand");
  });

  it("isExternal follows Link: new tab, noopener noreferrer, the arrow, and the new-tab words", () => {
    withProvider(<LinkButton href="https://example.com/billing" isExternal rel="external">Billing portal</LinkButton>);
    const link = screen.getByRole("link", { name: /^Billing portal/ });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer external");
    expect(link.querySelector("[data-icon='arrow-up-right']")).not.toBeNull();
    expect(link.querySelector("[data-slot='link-button-external-label']")!.textContent).toBe(" (opens in a new tab)");
  });

  it("isExternal with onPress: a plain click opens nothing, so no arrow and no new-tab words", () => {
    const onPress = vi.fn();
    withProvider(
      <>
        <LinkButton href="https://example.com/billing" isExternal onPress={onPress}>Billing portal</LinkButton>
        <LinkButton href="https://example.com" isExternal onPress={onPress} iconOnly iconBefore="settings" aria-label="Settings" />
      </>,
    );
    const link = screen.getByRole("link", { name: "Billing portal" });
    expect(link.querySelector("[data-icon='arrow-up-right']")).toBeNull();
    expect(link.querySelector("[data-slot='link-button-external-label']")).toBeNull();
    expect(screen.getByRole("link", { name: "Settings" })).toBeTruthy();
    // Before JavaScript the href still opens in a new tab, safely.
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    const event = click(link);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("isExternal on an icon-only LinkButton adds the new-tab words to its aria-label", () => {
    withProvider(<LinkButton href="https://example.com" isExternal iconOnly iconBefore="settings" aria-label="Settings" />);
    expect(screen.getByRole("link", { name: "Settings (opens in a new tab)" })).toBeTruthy();
  });
});

describe("LinkButton, disabled", () => {
  it("is not navigable, as Link's isDisabled: aria-disabled, no href, out of the tab order, onPress never runs", () => {
    const onPress = vi.fn();
    const navigate = vi.fn();
    withProvider(<LinkButton href="/items/new" variant="primary" isDisabled onPress={onPress}>Add item</LinkButton>, { navigate });
    const link = screen.getByRole("link", { name: "Add item" });
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.hasAttribute("href")).toBe(false);
    expect(link.hasAttribute("tabindex")).toBe(false);
    expect(link.tabIndex).toBe(-1);
    expect(link.hasAttribute("data-disabled")).toBe(true);
    click(link);
    act(() => link.focus());
    key(link, "Enter");
    expect(onPress).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(classesOf(link)).toContain("data-[disabled]:bg-ds-background-disabled");
  });

  it("disabled and isExternal: no target, no rel, no new-tab words", () => {
    withProvider(
      <>
        <LinkButton href="https://example.com/billing" isExternal isDisabled rel="external">Billing portal</LinkButton>
        <LinkButton href="https://example.com" isExternal isDisabled iconOnly iconBefore="settings" aria-label="Settings" />
      </>,
    );
    const link = screen.getByRole("link", { name: "Billing portal" });
    expect(link.tagName).toBe("SPAN");
    expect(link.hasAttribute("target")).toBe(false);
    expect(link.hasAttribute("rel")).toBe(false);
    expect(link.querySelector("[data-slot='link-button-external-label']")).toBeNull();
    expect(screen.getByRole("link", { name: "Settings" }).hasAttribute("target")).toBe(false);
    const html = renderToString(
      <DesignSystemProvider locale="en" navigate={() => {}}>
        <LinkButton href="https://example.com/billing" isExternal isDisabled>Billing portal</LinkButton>
      </DesignSystemProvider>,
    );
    expect(html).not.toMatch(/target=|rel=|new tab/);
  });

  it("server-rendered disabled has no href either", () => {
    const html = renderToString(
      <DesignSystemProvider locale="en" navigate={() => {}}>
        <LinkButton href="/items/new" isDisabled>Add item</LinkButton>
      </DesignSystemProvider>,
    );
    expect(html).not.toContain("href=");
    expect(html).toContain('aria-disabled="true"');
  });
});

describe("Button tone and fullWidth", () => {
  it("tone=\"danger\" keeps the variant's shape: a red fill for primary, red text for subtle; fullWidth fills", () => {
    withProvider(
      <>
        <Button variant="primary" tone="danger">Delete</Button>
        <Button variant="subtle" tone="danger">Remove</Button>
        <Button fullWidth>Wide</Button>
      </>,
    );
    const fill = screen.getByRole("button", { name: "Delete" });
    expect(fill.dataset.tone).toBe("danger");
    expect(classSet(fill).has("bg-ds-background-danger-bold")).toBe(true);
    expect(classSet(screen.getByRole("button", { name: "Remove" })).has("text-ds-text-danger")).toBe(true);
    expect(classSet(screen.getByRole("button", { name: "Wide" })).has("w-full")).toBe(true);
  });
});

describe("LinkButton, Button's look", () => {
  for (const variant of VARIANTS) {
    for (const size of SIZES) {
      it(`${variant} × ${size}: Button's classes, data-variant and data-size`, () => {
        withProvider(
          <>
            <Button variant={variant} size={size}>B</Button>
            <LinkButton href="/x" variant={variant} size={size}>L</LinkButton>
          </>,
        );
        const button = screen.getByRole("button");
        const link = screen.getByRole("link");
        expect(link.dataset.slot).toBe("link-button");
        expect(link.dataset.variant).toBe(variant);
        expect(link.dataset.size).toBe(size);
        const expected = [BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size], variant === "link" ? LINK_BUTTON_PADDING : ""].join(" ");
        for (const utility of expected.split(/\s+/).filter(Boolean)) expect(classSet(link).has(utility), utility).toBe(true);
        // Everything Button draws, LinkButton draws; its only extra is the anchor's underline reset.
        const extra = [...classSet(link)].filter((utility) => !classSet(button).has(utility));
        expect(extra).toEqual(["no-underline"]);
      });
    }
  }

  it("defaults to Button's defaults", () => {
    withProvider(<LinkButton href="/x">X</LinkButton>);
    const link = screen.getByRole("link");
    expect(link.dataset.variant).toBe("default");
    expect(link.dataset.size).toBe("medium");
  });

  it("marks its parts with data-slot", () => {
    withProvider(<LinkButton href="/x" iconBefore="plus" iconAfter="arrow-right">X</LinkButton>);
    const link = screen.getByRole("link");
    expect(link.querySelector("[data-slot='link-button-content']")).not.toBeNull();
    expect(link.querySelectorAll("[data-slot='link-button-icon']")).toHaveLength(2);
  });
});

describe("LinkButton, right to left (he)", () => {
  it("icons sit at the inline start and end, with logical classes only", () => {
    withProvider(
      <>
        <LinkButton href="/x" iconBefore="plus">إضافة</LinkButton>
        <LinkButton href="/y" iconAfter="arrow-left" variant="link">التالي</LinkButton>
        <LinkButton href="https://example.com" isExternal variant="primary">خارجي</LinkButton>
      </>,
      { locale: "he", dir: "rtl" },
    );
    const [before, after, external] = screen.getAllByRole("link");
    const content = (link: Element) => link.querySelector("[data-slot='link-button-content']")!;
    // Flex order follows the writing direction: first child at the inline start (the right side in RTL).
    expect(content(before!).firstElementChild!.getAttribute("data-icon")).toBe("plus");
    expect(content(after!).lastElementChild!.getAttribute("data-icon")).toBe("arrow-left");
    expect(external!.querySelector("[data-slot='link-button-external-label']")!.textContent).toBe(" (opens in a new tab)");
    for (const element of document.querySelectorAll("[class]")) expect(classesOf(element)).not.toMatch(PHYSICAL);
  });
});
