import fs from "node:fs";
import * as React from "react";
import { createTheme, toCSS } from "@senvenli/tokens";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Dialog, Modal } from "react-aria-components";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DS_STRINGS, moreCountLabel, registerDsStrings, removeItemLabel, selectAllLabel, selectPlaceholder, selectedCountLabel } from "../i18n";
import { MultiSelect, Select } from "./index";
import { LISTBOX, OPTION, OPTION_BOX, OPTION_BOX_SELECTED, POPOVER } from "./listbox";
import { MULTI_FIELD, MULTI_FOOTER, SELECT_ALL, TAG, TAG_REMOVE } from "./multi-select";
import { SELECT_TRIGGER } from "./select";

afterEach(cleanup);

// jsdom has no CSS.escape; React Aria uses it to find the selected option when a listbox opens.
if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

// A helper, not an inline `new URL("…", import.meta.url)`: Vite rewrites that literal form into an asset URL.
const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|left-|right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const classesOf = (element: Element | null) => element?.getAttribute("class") ?? "";

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

/** A real mouse press: React Aria opens on pointer events. */
function press(element: Element) {
  const pointer = { pointerType: "mouse", pointerId: 1, detail: 1, buttons: 1, width: 1, height: 1 };
  fireEvent.pointerDown(element, pointer);
  fireEvent.mouseDown(element, { detail: 1, buttons: 1 });
  fireEvent.pointerUp(element, { ...pointer, buttons: 0 });
  fireEvent.mouseUp(element, { detail: 1 });
  fireEvent.click(element, { detail: 1 });
}

const TEAMS = [
  { id: "des", label: "Design team", meta: "18 members", group: "Product" },
  { id: "eng", label: "Engineering team", meta: "14 members", group: "Product" },
  { id: "bil", label: "Billing desk", meta: "9 members", group: "Product" },
  { id: "sup", label: "Support north", meta: "22 members", group: "Company" },
];

describe("select recipes", () => {
  const recipes = [SELECT_TRIGGER, OPTION, POPOVER, LISTBOX, OPTION_BOX, OPTION_BOX_SELECTED, MULTI_FIELD, MULTI_FOOTER, SELECT_ALL, TAG, TAG_REMOVE]
    .join(" ").split(/\s+/);

  it("only uses design-system tokens that exist in the theme and logical classes", () => {
    for (const utility of recipes) {
      const color = /(?:^|:)(?:bg|text|border|inset-ring|outline)-(ds-[a-z-]+)$/.exec(utility);
      if (color) expect(theme, utility).toMatch(new RegExp(`--(color|text)-${color[1]}:`));
      const space = /(?:^|:)-?(?:gap|p|px|py|pe|ps|mx|mb|mt|h|min-h|size)-(ds-[a-z0-9-]+)$/.exec(utility);
      if (space) expect(theme, utility).toContain(`--spacing-${space[1]}:`);
      const radius = /(?:^|:)rounded-(ds-[a-z]+)$/.exec(utility);
      if (radius) expect(theme, utility).toContain(`--radius-${radius[1]}:`);
    }
    expect(recipes.filter((utility) => PHYSICAL.test(` ${utility}`))).toEqual([]);
  });

  it("keeps the invalid edge red while the field is focused or open, like TextField", () => {
    for (const compound of ["group-data-[invalid]:data-[focus-visible]:border-ds-border-danger", "group-data-[invalid]:group-data-[open]:border-ds-border-danger"]) {
      expect(SELECT_TRIGGER).toContain(compound);
    }
    expect(MULTI_FIELD).toContain("group-data-[invalid]:group-data-[open]:border-ds-border-danger");
    expect(MULTI_FIELD).toContain("group-data-[invalid]:has-[[data-slot=multi-select-trigger][data-focus-visible]]:border-ds-border-danger");
    // A focused tag-remove button does not paint the whole field.
    expect(MULTI_FIELD).not.toContain("has-[[data-focus-visible]]:");
  });

  it("scrolls the list, not the popover, so the footer stays pinned (also inside a Dialog)", () => {
    expect(POPOVER).toContain("overflow-hidden");
    expect(LISTBOX).toContain("overflow-auto");
    expect(LISTBOX).toContain("min-h-0");
    expect(MULTI_FOOTER).toContain("shrink-0");
  });

  it("marks keyboard focus on options with the 2px inner border, not only a fill", () => {
    expect(OPTION).toContain("data-[focus-visible]:inset-ring-2");
    expect(OPTION).toContain("data-[selected]:bg-ds-background-selected");
    expect(POPOVER).toContain("min-w-(--trigger-width)");
  });
});

describe("Select", () => {
  it("is labelled by the field label and shows the localized placeholder", () => {
    inLocale(<Select label="Assigned team" items={TEAMS} />);
    const trigger = screen.getByRole("button", { name: /Assigned team/ });
    expect(trigger.textContent).toContain(DS_STRINGS.selectPlaceholder.en);
  });

  it("opens below with groups, meta and a check on the chosen option, and selects on press", () => {
    const onSelectionChange = vi.fn();
    inLocale(<Select label="Assigned team" items={TEAMS} defaultSelectedKey="des" onSelectionChange={onSelectionChange} />);
    press(screen.getByRole("button", { name: /Assigned team/ }));
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getAllByRole("group").map((group) => group.getAttribute("aria-labelledby") && document.getElementById(group.getAttribute("aria-labelledby")!)?.textContent))
      .toEqual(["Product", "Company"]);
    const chosen = within(listbox).getByRole("option", { name: /Design/ });
    expect(chosen.getAttribute("aria-selected")).toBe("true");
    expect(chosen.querySelector('[data-slot="select-option-check"]')).not.toBeNull();
    expect(within(listbox).getByRole("option", { name: /Engineering/ }).querySelector('[data-slot="select-option-meta"]')?.textContent).toBe("14 members");
    press(within(listbox).getByRole("option", { name: /Billing/ }));
    expect(onSelectionChange).toHaveBeenLastCalledWith("bil");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows only the option's label in the field, never its meta or description", () => {
    inLocale(<Select label="Team" items={TEAMS} defaultSelectedKey="eng" />);
    expect(document.querySelector('[data-slot="select-value"]')?.textContent).toBe("Engineering team");
  });

  it("never flips between uncontrolled and controlled, and stays in sync", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    function Harness({ value }: { value?: string | null }) {
      return <Select label="Team" items={TEAMS} selectedKey={value} />;
    }
    const { rerender } = inLocale(<Harness />);
    const wrap = (value?: string | null) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}><Harness value={value} /></DesignSystemProvider>
    );
    rerender(wrap("eng"));
    expect(document.querySelector('[data-slot="select-value"]')?.textContent).toBe("Engineering team");
    rerender(wrap(null));
    expect(document.querySelector('[data-slot="select-value"]')?.textContent).toBe(DS_STRINGS.selectPlaceholder.en);
    rerender(wrap(undefined));
    rerender(wrap("bil"));
    expect(document.querySelector('[data-slot="select-value"]')?.textContent).toBe("Billing desk");
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(/controlled/i);
    errors.mockRestore();
  });

  it("brings the error to the control, also inside a Dialog", () => {
    for (const inDialog of [false, true]) {
      const field = <Select label="Team" items={TEAMS} isInvalid errorMessage="Select a team to continue." />;
      inLocale(inDialog ? <Modal isOpen><Dialog aria-label="Details">{field}</Dialog></Modal> : field);
      const trigger = screen.getByRole("button", { name: /Team/ });
      const described = (trigger.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent).join(" ");
      expect(described, inDialog ? "dialog" : "page").toContain("Select a team to continue.");
      cleanup();
    }
  });

  it("jumps to the first match when typing on the closed field", () => {
    const onSelectionChange = vi.fn();
    inLocale(<Select label="Team" items={TEAMS} onSelectionChange={onSelectionChange} />);
    const trigger = screen.getByRole("button", { name: /Team/ });
    act(() => trigger.focus());
    fireEvent.keyDown(trigger, { key: "b" });
    expect(onSelectionChange).toHaveBeenLastCalledWith("bil");
  });

  it("moves with End and Home and closes with Escape, returning focus to the field", async () => {
    inLocale(<Select label="Team" items={TEAMS} />);
    const trigger = screen.getByRole("button", { name: /Team/ });
    act(() => trigger.focus());
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const listbox = screen.getByRole("listbox");
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement).toBe(within(listbox).getByRole("option", { name: /Support/ }));
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(document.activeElement).toBe(within(listbox).getByRole("option", { name: /Design/ }));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    // React Aria restores focus on the next frame.
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("opens inside a Dialog with the list as the scrolling part", () => {
    inLocale(
      <Modal isOpen>
        <Dialog aria-label="Details">
          <Select label="Team" items={TEAMS} />
        </Dialog>
      </Modal>,
    );
    press(screen.getByRole("button", { name: /Team/ }));
    const listbox = screen.getByRole("listbox");
    expect(classesOf(listbox)).toContain("overflow-auto");
    expect(classesOf(listbox.closest('[data-slot="select-popover"]'))).toContain("overflow-hidden");
  });

  it("keeps the last controlled value when the consumer drops back to undefined", () => {
    const view = (value?: string) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}><Select label="Team" items={TEAMS} selectedKey={value} /></DesignSystemProvider>
    );
    const { rerender } = render(view("eng"));
    rerender(view("bil"));
    rerender(view(undefined));
    expect(document.querySelector('[data-slot="select-value"]')?.textContent).toBe("Billing desk");
  });

  it("is disabled as a whole and has a compact size", () => {
    inLocale(
      <>
        <Select label="Currency" items={[{ id: "eur", label: "Euro" }]} isDisabled />
        <Select label="Status" items={[{ id: "all", label: "All" }]} size="small" />
      </>,
    );
    expect((screen.getByRole("button", { name: /Currency/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(classesOf(screen.getByRole("button", { name: /Status/ }))).toContain("min-h-ds-control-compact");
  });
});

describe("MultiSelect", () => {
  it("shows chosen values as removable tags named in the provider locale", () => {
    const onSelectionChange = vi.fn();
    inLocale(<MultiSelect label="Teams" items={TEAMS} defaultSelectedKeys={["des", "eng"]} onSelectionChange={onSelectionChange} />);
    const tags = document.querySelectorAll('[data-slot="multi-select-tag"]');
    expect(Array.from(tags).map((tag) => tag.textContent)).toEqual(["Design team", "Engineering team"]);
    press(screen.getByRole("button", { name: DS_STRINGS.removeItem.en.replace("{label}", "Engineering team") }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["des"]);
    // Removing a tag never opens the menu.
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("keeps the menu open while picking and marks options with a checkbox", () => {
    const onSelectionChange = vi.fn();
    inLocale(<MultiSelect label="Teams" items={TEAMS} onSelectionChange={onSelectionChange} />);
    press(screen.getByRole("button", { name: /Teams/ }));
    const listbox = screen.getByRole("listbox");
    expect(listbox.getAttribute("aria-multiselectable")).toBe("true");
    press(within(listbox).getByRole("option", { name: /Billing/ }));
    press(within(listbox).getByRole("option", { name: /Engineering/ }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["bil", "eng"]);
    expect(screen.getByRole("listbox")).toBe(listbox);
    expect(within(listbox).getByRole("option", { name: /Billing/ }).querySelector('[data-slot="select-option-box"]')).not.toBeNull();
  });

  it("selects all from the footer and counts in the provider locale", () => {
    const onSelectionChange = vi.fn();
    inLocale(<MultiSelect label="Teams" items={TEAMS} defaultSelectedKeys={["des"]} allowsSelectAll onSelectionChange={onSelectionChange} />);
    press(screen.getByRole("button", { name: /Teams/ }));
    expect(document.querySelector('[data-slot="multi-select-count"]')?.textContent).toBe("1 selected");
    press(screen.getByRole("button", { name: DS_STRINGS.selectAll.en }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["des", "eng", "bil", "sup"]);
    expect(document.querySelector('[data-slot="multi-select-count"]')?.textContent).toBe("4 selected");
  });

  it("keeps select-all enabled, so focus never drops to the page, and Esc returns focus to the field", async () => {
    inLocale(<MultiSelect label="Teams" items={TEAMS} allowsSelectAll />);
    const trigger = document.querySelector('[data-slot="multi-select-trigger"]') as HTMLElement;
    press(trigger);
    const selectAll = screen.getByRole("button", { name: DS_STRINGS.selectAll.en });
    act(() => selectAll.focus());
    press(selectAll);
    expect((selectAll as HTMLButtonElement).disabled).toBe(false);
    expect(document.activeElement).not.toBe(document.body);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("removes the last tag shown with Backspace, whatever order the values were picked in", () => {
    const onSelectionChange = vi.fn();
    // Picked Support first, then Design; tags show in item order: Design, Support.
    inLocale(<MultiSelect label="Teams" items={TEAMS} defaultSelectedKeys={["sup", "des"]} onSelectionChange={onSelectionChange} />);
    const trigger = document.querySelector('[data-slot="multi-select-trigger"]') as HTMLElement;
    act(() => trigger.focus());
    fireEvent.keyDown(trigger, { key: "Backspace" });
    expect(onSelectionChange).toHaveBeenLastCalledWith(["des"]);
  });

  it("is named by the chosen labels and the field label, or the placeholder when empty", () => {
    inLocale(
      <>
        <MultiSelect label="Teams" items={TEAMS} defaultSelectedKeys={["des", "eng"]} />
        <MultiSelect label="Groups" items={TEAMS} placeholder="Add a group" />
      </>,
    );
    const [chosen, empty] = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="multi-select-trigger"]'));
    const nameOf = (element: HTMLElement) =>
      (element.getAttribute("aria-labelledby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
    // Labels only: no meta ("18 members"), no description, joined the way React Aria joins them.
    expect(nameOf(chosen).replace(/\s+/g, " ").trim()).toMatch(/^Design team(,| and) Engineering team Teams$/);
    expect(nameOf(chosen)).not.toContain("members");
    expect(nameOf(empty).replace(/\s+/g, " ").trim()).toBe("Add a group Groups");
    expect(document.querySelectorAll('[data-slot="multi-select-value"] [data-slot]')).toHaveLength(0);
  });

  it("moves focus to the next tag after a remove, never to the page", async () => {
    inLocale(<MultiSelect label="Teams" items={TEAMS} defaultSelectedKeys={["des", "eng", "bil"]} />);
    const remove = screen.getByRole("button", { name: DS_STRINGS.removeItem.en.replace("{label}", "Engineering team") });
    act(() => remove.focus());
    press(remove);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: DS_STRINGS.removeItem.en.replace("{label}", "Billing desk") })),
    );
  });

  it("goes back to its default values on a form reset", () => {
    const onSelectionChange = vi.fn();
    inLocale(
      <form data-testid="f">
        <MultiSelect label="Teams" name="teams" items={TEAMS} defaultSelectedKeys={["des"]} onSelectionChange={onSelectionChange} />
      </form>,
    );
    press(screen.getByRole("button", { name: DS_STRINGS.removeItem.en.replace("{label}", "Design team") }));
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    act(() => (screen.getByTestId("f") as HTMLFormElement).reset());
    expect(onSelectionChange).toHaveBeenLastCalledWith(["des"]);
  });

  it("removes the last visible tag with Backspace when the rest are collapsed into +N", () => {
    const onSelectionChange = vi.fn();
    inLocale(<MultiSelect label="Teams" items={TEAMS} defaultSelectedKeys={["des", "eng", "bil"]} maxVisibleTags={1} onSelectionChange={onSelectionChange} />);
    const trigger = document.querySelector('[data-slot="multi-select-trigger"]') as HTMLElement;
    act(() => trigger.focus());
    fireEvent.keyDown(trigger, { key: "Backspace" });
    expect(onSelectionChange).toHaveBeenLastCalledWith(["eng", "bil"]);
  });

  it("collapses tags past maxVisibleTags into +N with a spoken count", () => {
    inLocale(<MultiSelect label="Groups" items={TEAMS} defaultSelectedKeys={["des", "eng", "bil", "sup"]} maxVisibleTags={2} />);
    expect(document.querySelectorAll('[data-slot="multi-select-tag"]')).toHaveLength(2);
    const more = document.querySelector('[data-slot="multi-select-more"]');
    expect(more?.textContent).toContain("+2");
    expect(more?.textContent).toContain(DS_STRINGS.moreCount.en.replace("{count}", "2"));
  });

  it("never flips control when selectedKeys starts undefined", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = (keys?: string[]) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}><MultiSelect label="Teams" items={TEAMS} selectedKeys={keys} /></DesignSystemProvider>
    );
    const { rerender } = render(view());
    rerender(view(["sup"]));
    expect(document.querySelector('[data-slot="multi-select-tag"]')?.textContent).toBe("Support north");
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(/controlled/i);
    errors.mockRestore();
  });

  it("hides tag remove buttons when disabled", () => {
    inLocale(<MultiSelect label="Labels" items={[{ id: "a", label: "Enterprise" }]} defaultSelectedKeys={["a"]} isDisabled />);
    expect(document.querySelector('[data-slot="multi-select-tag-remove"]')).toBeNull();
    expect(document.querySelector('[data-slot="multi-select-field"]')?.hasAttribute("data-disabled")).toBe(true);
  });
});

describe("strings and direction", () => {
  it("has every select string in English with its placeholder; a registered language replaces them and any other falls back to English", () => {
    for (const key of ["selectPlaceholder", "selectAll", "selectedCount", "moreCount", "removeItem"] as const) {
      const text = DS_STRINGS[key].en;
      expect(text, key).toBeTruthy();
      if (key === "selectedCount" || key === "moreCount") expect(text, key).toContain("{count}");
      if (key === "removeItem") expect(text, key).toContain("{label}");
    }
    registerDsStrings("de", {
      selectPlaceholder: "Auswahl",
      selectAll: "Alle markieren",
      selectedCount: "{count} markiert",
      moreCount: "{count} weitere",
      removeItem: "{label} entfernen",
    });
    for (const locale of ["de", "de-AT"]) {
      expect(selectPlaceholder(locale), locale).toBe("Auswahl");
      expect(selectAllLabel(locale), locale).toBe("Alle markieren");
      expect(selectedCountLabel(locale, 2), locale).toBe("2 markiert");
      expect(moreCountLabel(locale, 2), locale).toBe("2 weitere");
      expect(removeItemLabel(locale, "Design team"), locale).toBe("Design team entfernen");
    }
    for (const locale of ["en", "en-GB", "nl", "xx"]) {
      expect(selectPlaceholder(locale), locale).toBe("Select");
      expect(selectAllLabel(locale), locale).toBe("Select all");
      expect(selectedCountLabel(locale, 2), locale).toBe("2 selected");
      expect(moreCountLabel(locale, 2), locale).toBe("2 more");
      expect(removeItemLabel(locale, "Design team"), locale).toBe("Remove Design team");
    }
    // The components read the registered words from the provider locale.
    inLocale(<MultiSelect label="Teams" items={TEAMS} defaultSelectedKeys={["des"]} allowsSelectAll />, "de");
    expect(screen.getByRole("button", { name: "Design team entfernen" })).toBeTruthy();
    cleanup();
    inLocale(<Select label="Team" items={TEAMS} />, "de");
    expect(document.querySelector('[data-slot="select-value"]')?.textContent).toBe("Auswahl");
  });

  it("renders every part with logical classes in a right-to-left page", () => {
    const { container } = inLocale(
      <div dir="rtl">
        <Select label="ا" items={TEAMS} defaultSelectedKey="des" />
        <MultiSelect label="ب" items={TEAMS} defaultSelectedKeys={["des", "eng"]} maxVisibleTags={1} allowsSelectAll />
      </div>,
      "ar",
    );
    const parts = Array.from(container.querySelectorAll("[data-slot]"));
    expect(parts.length).toBeGreaterThan(8);
    for (const part of parts) expect(classesOf(part), part.getAttribute("data-slot") ?? "").not.toMatch(PHYSICAL);
    expect(screen.getByRole("button", { name: /^ا|ا$/ }).textContent).toContain("Design");
  });
});
