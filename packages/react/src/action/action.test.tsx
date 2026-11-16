import fs from "node:fs";
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createTheme, toCSS } from "@senvenli/tokens";
import { afterEach, describe, expect, it, vi } from "vitest";

import { registerDsStrings } from "../i18n";
import { DesignSystemProvider } from "../provider";
import { Button, ButtonGroup, CloseButton, Link, ToggleButton, ToggleGroup } from "./index";
import { closeLabel } from "./close-button";
import * as styles from "./styles";

afterEach(cleanup);

// A helper, not an inline `new URL("…", import.meta.url)`: Vite rewrites that literal form into an asset URL.
const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|left-|right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const classesOf = (element: Element | null) => element?.getAttribute("class") ?? "";

function withProvider(ui: React.ReactElement, locale = "en", navigate = vi.fn()) {
  return render(<DesignSystemProvider locale={locale} navigate={navigate}>{ui}</DesignSystemProvider>);
}

describe("action class recipes", () => {
  const recipes = [
    styles.FOCUS_INSET, styles.FOCUS_COLOR, styles.LINK_FOCUS, styles.BUTTON_BASE, ...Object.values(styles.BUTTON_VARIANT), ...Object.values(styles.BUTTON_SIZE),
    ...Object.values(styles.ICON_ONLY_SIZE), styles.TOGGLE, ...Object.values(styles.TOGGLE_SIZE), styles.LINK_BASE,
    ...Object.values(styles.LINK_VARIANT),
  ].join(" ").split(/\s+/);

  it("only uses design-system tokens that exist in the theme", () => {
    for (const utility of recipes) {
      const color = /(?:^|:)(?:bg|text|border|outline|inset-ring|decoration)-(ds-[a-z-]+)$/.exec(utility);
      if (color && !/^ds-control/.test(color[1])) {
        const name = color[1];
        const isTypeStyle = theme.includes(`--text-${name.replace(/^ds-/, "")}:`);
        expect(theme.includes(`--color-${name}:`) || isTypeStyle, utility).toBe(true);
      }
      const size = /(?:^|:)(?:h|w|size|px|py|gap)-(ds-[a-z0-9-]+)$/.exec(utility);
      if (size) expect(theme, utility).toContain(`--spacing-${size[1]}:`);
      const radius = /(?:^|:)rounded-(ds-[a-z-]+)$/.exec(utility);
      if (radius) expect(theme, utility).toContain(`--radius-${radius[1]}:`);
      const typeStyle = /(?:^|:)text-(body[a-z-]*|heading-[a-z-]+)$/.exec(utility);
      if (typeStyle) expect(theme, utility).toContain(`--text-${typeStyle[1]}:`);
    }
  });

  it("uses no physical left/right utilities", () => {
    for (const utility of recipes) expect(utility).not.toMatch(PHYSICAL);
  });

  it("marks keyboard focus with a 2px inner border, never an outer ring", () => {
    const all = recipes.join(" ");
    expect(all).not.toMatch(/outline-(offset|ds-|2|solid)|(^|\s)ring-|(^|\s)focus:/);
    expect(styles.BUTTON_BASE).toContain("data-[focus-visible]:inset-ring-2");
    expect(styles.TOGGLE).toContain("data-[focus-visible]:inset-ring-2");
    expect(styles.LINK_FOCUS).toContain("data-[focus-visible]:decoration-2");
  });

  it("picks a focus colour that contrasts with each filled variant", () => {
    expect(styles.BUTTON_VARIANT.primary).toContain("data-[focus-visible]:inset-ring-ds-text-on-brand");
    expect(styles.BUTTON_VARIANT.danger).toContain("data-[focus-visible]:inset-ring-ds-text-on-danger");
    for (const variant of ["default", "subtle", "link"] as const) {
      expect(styles.BUTTON_VARIANT[variant]).toContain("data-[focus-visible]:inset-ring-ds-border-focused");
    }
  });

  it("keeps the brand colour for the primary action only", () => {
    for (const [variant, recipe] of Object.entries(styles.BUTTON_VARIANT)) {
      expect(recipe.includes("brand-bold"), variant).toBe(variant === "primary");
    }
    for (const recipe of Object.values(styles.LINK_VARIANT)) expect(recipe).not.toMatch(/brand|gold/);
  });
});

describe("Button", () => {
  it("defaults to type=button so it never submits a form by accident", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button>Save draft</Button>
        <Button type="submit" variant="primary">Save</Button>
      </form>,
    );
    const draft = screen.getByRole("button", { name: "Save draft" });
    expect(draft.getAttribute("type")).toBe("button");
    fireEvent.click(draft);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save" }).getAttribute("type")).toBe("submit");
  });

  it("fires onPress from pointer and keyboard", () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Create invoice</Button>);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyUp(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });
    fireEvent.keyUp(button, { key: " " });
    expect(onPress).toHaveBeenCalledTimes(3);
  });

  it("marks variant, size and every part with data-slot", () => {
    const { container } = render(
      <Button variant="primary" size="large" iconBefore="plus" iconAfter="download">Create invoice</Button>,
    );
    const button = screen.getByRole("button");
    expect(button.dataset.slot).toBe("button");
    expect(button.dataset.variant).toBe("primary");
    expect(button.dataset.size).toBe("large");
    expect(container.querySelector('[data-slot="button-content"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="button-icon"][aria-hidden="true"]')).toHaveLength(2);
    expect(classesOf(button)).toContain("h-ds-control-large");
  });

  it("needs an accessible name when it shows only an icon", () => {
    render(<Button iconOnly iconBefore="plus" aria-label="Add item" />);
    const button = screen.getByRole("button", { name: "Add item" });
    expect(classesOf(button)).toContain("w-ds-control");
    // @ts-expect-error — an icon-only button without aria-label is a type error
    void (<Button iconOnly iconBefore="plus" />);
  });

  it("keeps its width, shows a spinner and ignores presses while pending", () => {
    const onPress = vi.fn();
    const { container } = render(<Button isPending onPress={onPress} variant="primary">Saving</Button>);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(classesOf(container.querySelector('[data-slot="button-content"]'))).toContain("opacity-0");
    // The label stays in the accessible name while pending (opacity, not visibility).
    expect(screen.getByRole("button", { name: /Saving/ })).toBe(button);
    expect(container.querySelector('[data-slot="button-spinner"]')).not.toBeNull();
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("does not fire when disabled", () => {
    const onPress = vi.fn();
    render(<Button isDisabled onPress={onPress}>Delete item</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("does not support asChild (no Radix Slot)", () => {
    // @ts-expect-error — asChild is gone; links use Link or Pressable href
    render(<Button asChild>All items</Button>);
    expect(screen.getByRole("button").tagName).toBe("BUTTON");
  });
});

describe("CloseButton", () => {
  it("is named in a registered language, by exact or regional tag, and in English otherwise", () => {
    registerDsStrings("de", { close: "Schließen" });
    for (const [locale, label] of [["de", "Schließen"], ["de-AT", "Schließen"], ["en", "Close"], ["en-US", "Close"], ["nl", "Close"]] as const) {
      withProvider(<CloseButton />, locale);
      const button = screen.getByRole("button", { name: label });
      expect(button.dataset.variant, locale).toBe("subtle");
      expect(button.dataset.slot, locale).toBe("close-button");
      cleanup();
    }
  });

  it("closeLabel uses a registered language and falls back to English", () => {
    registerDsStrings("de", { close: "Schließen" });
    expect(closeLabel("de")).toBe("Schließen");
    expect(closeLabel("de-CH")).toBe("Schließen");
    expect(closeLabel("en")).toBe("Close");
    for (const locale of ["nl", "xx"]) expect(closeLabel(locale), locale).toBe("Close");
  });
});

describe("ButtonGroup", () => {
  it("is a labelled group with logical inner corners and seams", () => {
    render(
      <ButtonGroup aria-label="View">
        <Button>List</Button>
        <Button>Board</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole("group", { name: "View" });
    expect(classesOf(group)).toContain("[&>*:not(:first-child)]:rounded-s-none");
    expect(classesOf(group)).toContain("[&>*+*]:border-s");
    expect(classesOf(group)).toContain("[&>*+*]:border-ds-border");
    expect(classesOf(group)).not.toMatch(PHYSICAL);
  });

  it("uses the pressed brand seam for a split button", () => {
    render(
      <ButtonGroup aria-label="Send" variant="split">
        <Button variant="primary">Send invoice</Button>
        <Button variant="primary" iconOnly iconBefore="plus" aria-label="More send options" />
      </ButtonGroup>,
    );
    expect(classesOf(screen.getByRole("group"))).toContain("[&>*+*]:border-ds-background-brand-bold-pressed");
  });
});

describe("ToggleButton and ToggleGroup", () => {
  it("toggles aria-pressed without changing its label", () => {
    const onChange = vi.fn();
    render(<ToggleButton onChange={onChange}>Pin</ToggleButton>);
    const toggle = screen.getByRole("button", { name: "Pin" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.textContent).toBe("Pin");
  });

  it("combines filters in a labelled group", () => {
    const onSelectionChange = vi.fn();
    render(
      <ToggleGroup label="Text style" onSelectionChange={onSelectionChange}>
        <ToggleButton id="bold">Bold</ToggleButton>
        <ToggleButton id="italic">Italic</ToggleButton>
      </ToggleGroup>,
    );
    expect(screen.getByRole("toolbar", { name: "Text style" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bold" }));
    fireEvent.click(screen.getByRole("button", { name: "Italic" }));
    const last = onSelectionChange.mock.calls.at(-1)![0] as Set<string>;
    expect([...last].sort()).toEqual(["bold", "italic"]);
  });

  it("moves between toggles with the arrow keys and enters the group with one Tab stop", () => {
    render(
      <ToggleGroup label="Text style">
        <ToggleButton id="bold">Bold</ToggleButton>
        <ToggleButton id="italic">Italic</ToggleButton>
      </ToggleGroup>,
    );
    const [bold, italic] = screen.getAllByRole("button");
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => bold.focus());
    expect(bold.hasAttribute("data-focus-visible")).toBe(true);
    fireEvent.keyDown(bold, { key: "ArrowRight" });
    expect(document.activeElement).toBe(italic);
  });

  it("allows one choice in single mode", () => {
    render(
      <ToggleGroup label="Text alignment" selectionMode="single" defaultSelectedKeys={["left"]}>
        <ToggleButton id="left">Left</ToggleButton>
        <ToggleButton id="center">Center</ToggleButton>
      </ToggleGroup>,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Center" }));
    expect(screen.getByRole("radio", { name: "Center" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Left" }).getAttribute("aria-checked")).toBe("false");
  });
});

describe("Link", () => {
  it("navigates through the host router", () => {
    const navigate = vi.fn();
    withProvider(<Link href="/orders">All orders</Link>, "en", navigate);
    const link = screen.getByRole("link", { name: "All orders" });
    expect(link.dataset.variant).toBe("default");
    fireEvent.click(link);
    expect(navigate).toHaveBeenCalledWith("/orders", undefined);
  });

  it("opens external links in a new tab safely, with the arrow icon", () => {
    const { container } = withProvider(<Link href="https://example.com/billing" isExternal>Billing portal</Link>);
    const link = screen.getByRole("link", { name: /^Billing portal/ });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
    expect(container.querySelector('[data-slot="link-external-icon"][aria-hidden="true"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="link-external-label"]')?.textContent).toBe(" (opens in a new tab)");
  });

  it("underlines inline links and mutes subtle ones", () => {
    withProvider(
      <p>
        <Link href="/terms" variant="inline">terms of service</Link>
        <Link href="/privacy" variant="subtle">Privacy policy</Link>
      </p>,
    );
    expect(classesOf(screen.getByRole("link", { name: "terms of service" }))).toMatch(/(^|\s)underline(\s|$)/);
    expect(classesOf(screen.getByRole("link", { name: "Privacy policy" }))).toContain("text-ds-text-subtle");
  });
});

describe("keyboard focus", () => {
  it("is visible on Tab and absent on pointer focus", () => {
    render(<Button>Save draft</Button>);
    const button = screen.getByRole("button");
    fireEvent.pointerDown(button, { pointerType: "mouse", pointerId: 1, detail: 1, buttons: 1, width: 1, height: 1 });
    fireEvent.mouseDown(button, { detail: 1, buttons: 1 });
    act(() => button.focus());
    expect(button.hasAttribute("data-focus-visible")).toBe(false);
    act(() => button.blur());
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => button.focus());
    expect(button.hasAttribute("data-focus-visible")).toBe(true);
  });
});

describe("right-to-left rendering", () => {
  it("renders every action without physical classes", () => {
    const { container } = withProvider(
      <div dir="rtl">
        <ButtonGroup aria-label="g"><Button>ا</Button><Button>ب</Button></ButtonGroup>
        <CloseButton />
        <ToggleGroup label="t"><ToggleButton id="x">ت</ToggleButton></ToggleGroup>
        <Link href="https://example.com" isExternal>ث</Link>
      </div>,
      "ar",
    );
    const parts = Array.from(container.querySelectorAll("[data-slot]"));
    expect(parts.length).toBeGreaterThan(6);
    for (const part of parts) expect(classesOf(part)).not.toMatch(PHYSICAL);
  });
});
