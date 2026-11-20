import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Lozenge } from "../display";
import { ComboBox, type ComboBoxItem } from "./index";

// ComboBoxItem.icon: a country picker shows each country's code chip before its name, in the list and with the
// chosen value, as MultiSelect does. Any node works as the icon; a Lozenge with the code stands in for the chip here.

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

const COUNTRIES: ComboBoxItem[] = [
  { id: "ME", label: "Montenegro", icon: <Lozenge>ME</Lozenge> },
  { id: "TR", label: "Turkey", icon: <Lozenge>TR</Lozenge>, description: "Inactive" },
  { id: "RS", label: "Serbia" },
];

const openList = async () => {
  await act(async () => {
    fireEvent.click(document.querySelector<HTMLElement>("[data-slot='combobox-button']")!);
  });
  return screen.getByRole("listbox");
};

const press = (element: Element, key: string) => {
  fireEvent.keyDown(element, { key });
  fireEvent.keyUp(element, { key });
};

describe("ComboBoxItem icon", () => {
  it("list: the icon sits before the label, hidden from assistive technology; the option is named by its label only", async () => {
    inLocale(<ComboBox label="Country" items={COUNTRIES} />);
    const list = await openList();
    const option = within(list).getByRole("option", { name: "Montenegro" });
    const icon = option.querySelector("[data-slot='combobox-option-icon']")!;
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(icon.querySelector("[data-slot='lozenge']")!.textContent).toBe("ME");
    // Before the label in DOM order, so it sits at the inline start in both directions.
    const label = option.querySelector("[data-slot='combobox-option-label']")!;
    expect(icon.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // An item without an icon has no empty slot.
    expect(within(list).getByRole("option", { name: "Serbia" }).querySelector("[data-slot='combobox-option-icon']")).toBeNull();
    // Searching never matches the icon's text: "TR" is not "Turkey".
    expect(within(list).getByRole("option", { name: "Turkey" }).querySelector("[data-slot='combobox-option-icon']")).not.toBeNull();
  });

  it("typing filters by label, not by the icon's code", async () => {
    inLocale(<ComboBox label="Country" items={COUNTRIES} />);
    const input = screen.getByRole("combobox", { name: "Country" });
    await act(async () => {
      fireEvent.change(input, { target: { value: "TR" } });
    });
    expect(screen.queryByRole("option", { name: "Turkey" })).toBeNull();
  });

  it("single: the chosen item's icon leads the field (aria-hidden), and the input stays a plain text field named by the label", () => {
    inLocale(<ComboBox label="Country" items={COUNTRIES} defaultSelectedKey="ME" />);
    const input = screen.getByRole("combobox", { name: "Country" }) as HTMLInputElement;
    expect(input.value).toBe("Montenegro");
    const field = document.querySelector("[data-slot='combobox-field']")!;
    const icon = field.querySelector("[data-slot='combobox-value-icon']")!;
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(icon.textContent).toBe("ME");
    expect(icon.nextElementSibling).toBe(input);
  });

  it("keyboard: ArrowDown and Enter pick a country and its icon appears; typing other text hides it; Escape brings it back", async () => {
    inLocale(<ComboBox label="Country" items={COUNTRIES} menuTrigger="focus" />);
    const input = screen.getByRole("combobox", { name: "Country" }) as HTMLInputElement;
    expect(document.querySelector("[data-slot='combobox-value-icon']")).toBeNull();
    await act(async () => {
      input.focus();
    });
    await act(async () => press(input, "ArrowDown"));
    await act(async () => press(input, "Enter"));
    expect(input.value).toBe("Montenegro");
    expect(document.querySelector("[data-slot='combobox-value-icon']")!.textContent).toBe("ME");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Ser" } });
    });
    expect(document.querySelector("[data-slot='combobox-value-icon']")).toBeNull();
    await act(async () => press(input, "Escape"));
    await act(async () => press(input, "Escape"));
    expect(input.value).toBe("Montenegro");
    expect(document.querySelector("[data-slot='combobox-value-icon']")).not.toBeNull();
  });

  it("a chosen item without an icon shows none", () => {
    inLocale(<ComboBox label="Country" items={COUNTRIES} defaultSelectedKey="RS" />);
    expect(document.querySelector("[data-slot='combobox-value-icon']")).toBeNull();
  });

  it("multiple: each tag shows its icon before its label; the remove button keeps its name", () => {
    inLocale(<ComboBox selectionMode="multiple" label="Countries" items={COUNTRIES} defaultSelectedKeys={["ME", "RS"]} />);
    const tags = [...document.querySelectorAll("[data-slot='combobox-tag']")];
    expect(tags).toHaveLength(2);
    const icon = tags[0]!.querySelector("[data-slot='combobox-tag-icon']")!;
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(icon.textContent).toBe("ME");
    expect(tags[1]!.querySelector("[data-slot='combobox-tag-icon']")).toBeNull();
    expect(screen.getByRole("button", { name: /Montenegro/ }).getAttribute("data-slot")).toBe("combobox-tag-remove");
    expect(document.querySelector("[data-slot='combobox-value-icon']")).toBeNull();
  });

  it("RTL: the icon comes first in DOM order, so it sits at the inline start (the right) of option and field", async () => {
    inLocale(<ComboBox label="البلد" items={COUNTRIES} defaultSelectedKey="TR" />, "ar", "rtl");
    const input = screen.getByRole("combobox", { name: "البلد" });
    const icon = document.querySelector("[data-slot='combobox-value-icon']")!;
    expect(icon.closest("[dir='rtl']")).not.toBeNull();
    expect(icon.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const list = await openList();
    const option = within(list).getByRole("option", { name: "Turkey" });
    expect(option.firstElementChild!.getAttribute("data-slot")).toBe("combobox-option-icon");
  });

  it("server render: the chosen item's icon is in the first paint", () => {
    const html = renderToStaticMarkup(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <ComboBox label="Country" items={COUNTRIES} defaultSelectedKey="ME" />
      </DesignSystemProvider>,
    );
    expect(html).toContain('data-slot="combobox-value-icon"');
    expect(html).toContain('data-slot="lozenge"');
  });

  it("320px: a list with icons is capped to the viewport, so a long name truncates beside its chip; without icons the popover is as before", async () => {
    inLocale(<ComboBox label="Country" items={[...COUNTRIES, { id: "BA", label: "Bosnia and Herzegovina: the joint service area of both of its entities", icon: <Lozenge>BA</Lozenge> }]} />);
    const list = await openList();
    const popover = list.closest("[data-slot='combobox-popover']")!;
    expect(popover.className).toContain("max-w-[calc(100vw-1.5rem)]");
    const label = within(list).getByRole("option", { name: /Bosnia and Herzegovina/ }).querySelector("[data-slot='combobox-option-label']")!;
    expect(label.className).toContain("truncate");
    expect(label.parentElement!.className).toContain("min-w-0");
    expect(within(list).getByRole("option", { name: /Bosnia and Herzegovina/ }).querySelector("[data-slot='lozenge']")!.className).toContain("shrink-0");
    cleanup();
    inLocale(<ComboBox label="Country" items={[{ id: "a", label: "A" }]} />);
    const plain = await openList();
    expect(plain.closest("[data-slot='combobox-popover']")!.className).not.toContain("max-w-");
  });

  it("without icons the DOM has no icon slot anywhere", async () => {
    inLocale(<ComboBox label="Country" items={[{ id: "a", label: "A" }]} defaultSelectedKey="a" />);
    await openList();
    expect(document.querySelector("[data-slot$='-icon'][data-slot^='combobox-']:not([data-slot='combobox-create-icon'])")).toBeNull();
  });
});

// The value's mark is part of the field, so a press on it focuses
// the input (it is aria-hidden and not a control of its own); it dims with the field when disabled.
describe("ComboBox value icon: press and disabled", () => {
  it("a press on the value icon focuses the input and keeps the value", () => {
    inLocale(<ComboBox label="Country" items={COUNTRIES} defaultSelectedKey="ME" />);
    const input = screen.getByRole("combobox", { name: "Country" }) as HTMLInputElement;
    const icon = document.querySelector<HTMLElement>("[data-slot='combobox-value-icon']")!;
    expect(document.activeElement).not.toBe(input);
    const pressed = fireEvent.mouseDown(icon);
    expect(pressed).toBe(false); // default prevented: focus does not land on the page first
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("Montenegro");
    expect(icon.getAttribute("class")).toBe("inline-flex shrink-0 items-center");
  });

  it("disabled: the icon is dimmed and a press does not focus the input (LTR and RTL)", () => {
    for (const [locale, dir] of [["en", undefined], ["ar", "rtl"]] as const) {
      const { unmount } = inLocale(<ComboBox label="Country" items={COUNTRIES} defaultSelectedKey="ME" isDisabled />, locale, dir);
      const input = screen.getByRole("combobox") as HTMLInputElement;
      const icon = document.querySelector<HTMLElement>("[data-slot='combobox-value-icon']")!;
      expect(icon.getAttribute("class")!.split(" ")).toContain("opacity-40");
      fireEvent.mouseDown(icon);
      expect(document.activeElement).not.toBe(input);
      expect(input.disabled).toBe(true);
      unmount();
    }
  });
});
