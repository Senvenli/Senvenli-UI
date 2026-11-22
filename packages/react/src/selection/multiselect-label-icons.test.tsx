import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DS_STRINGS } from "../i18n";
import { Select, type SelectItem } from "./index";
import { MultiSelect } from "./multi-select";

// MultiSelect aria-label and item icons: an app can name the field with an `aria-label` (its dialog row has its own
// heading) and give each option an `icon` (a flag mark here), shown before the name in the list and in the selected
// badges.

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  warn.mockRestore();
});
const warnings = (): string[] => warn.mock.calls.map(([message]: unknown[]) => String(message));

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

function press(element: Element) {
  const pointer = { pointerType: "mouse", pointerId: 1, detail: 1, buttons: 1, width: 1, height: 1 };
  fireEvent.pointerDown(element, pointer);
  fireEvent.mouseDown(element, { detail: 1, buttons: 1 });
  fireEvent.pointerUp(element, { ...pointer, buttons: 0 });
  fireEvent.mouseUp(element, { detail: 1 });
  fireEvent.click(element, { detail: 1 });
}

/** The app's flag mark (a decorative node; the DS ships no flag of its own). */
const Flag = ({ code }: { code: string }) => <span data-testid={`flag-${code}`} className="inline-flex h-4 w-5">{code}</span>;
const COUNTRIES: SelectItem[] = [
  { id: "DE", label: "Germany", icon: <Flag code="DE" /> },
  { id: "FR", label: "France", icon: <Flag code="FR" /> },
  { id: "IT", label: "Italy", icon: <Flag code="IT" />, description: "Inactive", isDisabled: true },
  { id: "ES", label: "Spain" },
];
const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|text-left|text-right)/;

describe("MultiSelect aria-label", () => {
  it("an aria-label names the field when the context already shows its name; no visible label renders", () => {
    inLocale(<MultiSelect aria-label="Shipping countries" items={COUNTRIES} defaultSelectedKeys={["DE"]} />);
    expect(document.querySelector("[data-slot='field-label']")).toBeNull();
    const trigger = screen.getByRole("button", { name: /Shipping countries/ });
    expect(trigger.getAttribute("data-slot")).toBe("multi-select-trigger");
    expect(warnings()).toEqual([]);
  });

  it("keyboard: Enter opens the list, arrows move, Space picks; the menu stays open; Esc closes it back to the trigger", () => {
    const onSelectionChange = vi.fn();
    inLocale(<MultiSelect aria-label="Shipping countries" items={COUNTRIES} onSelectionChange={onSelectionChange} />);
    const trigger = screen.getByRole("button", { name: /Shipping countries/ });
    act(() => trigger.focus());
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyUp(trigger, { key: "ArrowDown" });
    const listbox = screen.getByRole("listbox", { name: /Shipping countries/ });
    expect(listbox.getAttribute("aria-multiselectable")).toBe("true");
    const first = within(listbox).getByRole("option", { name: "Germany" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: " " });
    fireEvent.keyUp(first, { key: " " });
    expect(onSelectionChange).toHaveBeenLastCalledWith(["DE"]);
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(within(listbox).getByRole("option", { name: "France" }));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    fireEvent.keyUp(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("an empty aria-label counts as none: the label shows; with no name at all it warns in development", () => {
    inLocale(<MultiSelect {...({ label: "Countries", "aria-label": "" } as unknown as { label: string })} items={COUNTRIES} />);
    expect(document.querySelector("[data-slot='field-label']")!.textContent).toBe("Countries");
    expect(screen.getByRole("button", { name: /Countries/ }).hasAttribute("aria-label")).toBe(false);
    cleanup();
    inLocale(<MultiSelect {...({} as { label: string })} items={COUNTRIES} />);
    expect(warnings().filter((message) => message.startsWith("MultiSelect:"))).toHaveLength(1);
  });
});

describe("MultiSelect and Select item icons", () => {
  it("each option shows its icon before the label, hidden from screen readers; the option is named by its label", () => {
    inLocale(<MultiSelect label="Countries" items={COUNTRIES} />);
    press(screen.getByRole("button", { name: /Countries/ }));
    const listbox = screen.getByRole("listbox");
    const germany = within(listbox).getByRole("option", { name: "Germany" });
    const icon = germany.querySelector("[data-slot='select-option-icon']")!;
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(within(icon as HTMLElement).getByTestId("flag-DE")).toBeTruthy();
    // After the checkbox, before the label.
    const slots = [...germany.querySelectorAll("[data-slot]")].map((element) => element.getAttribute("data-slot"));
    expect(slots.indexOf("select-option-box")).toBeLessThan(slots.indexOf("select-option-icon"));
    expect(slots.indexOf("select-option-icon")).toBeLessThan(slots.indexOf("select-option-label"));
    // A disabled option keeps its icon and its description; an item without an icon has no slot.
    expect(within(listbox).getByRole("option", { name: "Italy" }).querySelector("[data-slot='select-option-icon']")).not.toBeNull();
    expect(within(listbox).getByRole("option", { name: "Spain" }).querySelector("[data-slot='select-option-icon']")).toBeNull();
  });

  it("each chosen tag shows its icon before its name; removing a tag still says the name only", () => {
    const onSelectionChange = vi.fn();
    inLocale(<MultiSelect aria-label="Shipping countries" items={COUNTRIES} defaultSelectedKeys={["FR", "ES"]} onSelectionChange={onSelectionChange} />);
    const tags = [...document.querySelectorAll("[data-slot='multi-select-tag']")];
    expect(tags.map((tag) => tag.textContent)).toEqual(["FRFrance", "Spain"]);
    const icon = tags[0]!.querySelector("[data-slot='multi-select-tag-icon']")!;
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(tags[0]!.firstElementChild).toBe(icon);
    expect(tags[1]!.querySelector("[data-slot='multi-select-tag-icon']")).toBeNull();
    const remove = screen.getByRole("button", { name: DS_STRINGS.removeItem.en.replace("{label}", "France") });
    press(remove);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["ES"]);
  });

  it("the trigger's name is the chosen labels and the field's name, never the icons' text", () => {
    inLocale(<MultiSelect aria-label="Shipping countries" items={COUNTRIES} defaultSelectedKeys={["FR"]} />);
    const trigger = screen.getByRole("button", { name: /Shipping countries/ });
    const value = document.querySelector("[data-slot='multi-select-value']")!;
    expect(value.textContent).toBe("France");
    expect(trigger.contains(document.querySelector("[data-slot='multi-select-tag-icon']"))).toBe(false);
  });

  it("Select shows the icon in its list too (the option row is shared), not in its field", () => {
    inLocale(<Select label="Country" items={COUNTRIES} defaultSelectedKey="DE" />);
    expect(document.querySelector("[data-slot='select-value']")!.textContent).toBe("Germany");
    press(screen.getByRole("button", { name: /Country/ }));
    const option = within(screen.getByRole("listbox")).getByRole("option", { name: "Germany" });
    expect(option.querySelector("[data-slot='select-option-icon']")).not.toBeNull();
  });

  it("RTL in ar: the icon sits at the inline start; only logical classes; names unchanged", () => {
    inLocale(<MultiSelect aria-label="Shipping countries" items={COUNTRIES} defaultSelectedKeys={["DE"]} />, "ar", "rtl");
    const tagIcon = document.querySelector("[data-slot='multi-select-tag-icon']")!;
    expect(tagIcon.parentElement!.firstElementChild).toBe(tagIcon);
    press(screen.getByRole("button", { name: /Shipping countries/ }));
    const option = within(screen.getByRole("listbox")).getByRole("option", { name: "Germany" });
    for (const element of [tagIcon, option.querySelector("[data-slot='select-option-icon']")!]) {
      expect(element.getAttribute("class") ?? "").not.toMatch(PHYSICAL);
    }
  });

  it("without icons and with a visible label the field and list render as before (no icon slot, label above)", () => {
    const plain = COUNTRIES.map(({ icon: _icon, ...item }) => item);
    inLocale(<MultiSelect label="Countries" items={plain} defaultSelectedKeys={["DE"]} />);
    expect(document.querySelector("[data-slot='field-label']")!.textContent).toBe("Countries");
    expect(document.querySelector("[data-slot='multi-select-tag']")!.children).toHaveLength(2);
    press(screen.getByRole("button", { name: /Countries/ }));
    expect(document.querySelector("[data-slot='select-option-icon']")).toBeNull();
  });
});
