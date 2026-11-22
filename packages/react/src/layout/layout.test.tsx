import fs from "node:fs";
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createTheme, toCSS } from "@senvenli/tokens";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Box, Grid, Stack, Pressable, SPACE_TOKENS } from "./index";
import { BACKGROUND, GAP, PADDING, PADDING_BLOCK, PADDING_INLINE, RADIUS, SHADOW } from "./tokens";
import { pressableClasses } from "./pressable";

afterEach(cleanup);

// A helper, not an inline `new URL("…", import.meta.url)`: Vite rewrites that literal form into an asset URL.
const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const PHYSICAL = /(^|\s)(-?m[lr]-|p[lr]-|left-|right-|border-[lr]\b|rounded-[lr]-|text-left|text-right|float-)/;

function classesOf(element: Element | null) {
  return element?.getAttribute("class") ?? "";
}

describe("layout token maps", () => {
  it("covers every space token and maps each to a theme utility", () => {
    // The theme's own spacing steps: every `--ds-space-<step>` custom property it defines.
    const names = Array.from(new Set(Array.from(theme.matchAll(/--ds-(space-[0-9]+):/g), (match) => match[1])));
    expect(names.length).toBeGreaterThan(0);
    expect([...SPACE_TOKENS].sort()).toEqual([...names].sort());
    for (const map of [GAP, PADDING, PADDING_INLINE, PADDING_BLOCK]) {
      for (const [space, utility] of Object.entries(map)) {
        const step = space.replace("space-", "");
        expect(utility).toMatch(new RegExp(`-ds-${step}$`));
        expect(theme).toContain(`--spacing-ds-${step}:`);
      }
    }
  });

  it("maps surfaces, radii and shadows to tokens that exist", () => {
    for (const utility of Object.values(BACKGROUND)) {
      expect(theme).toContain(`--color-${utility.replace(/^bg-/, "")}:`);
    }
    for (const utility of Object.values(RADIUS)) expect(theme).toContain(`--radius-${utility.replace(/^rounded-/, "")}:`);
    for (const utility of Object.values(SHADOW)) expect(theme).toContain(`--shadow-${utility.replace(/^shadow-/, "")}:`);
  });
});

describe("Box", () => {
  it("turns token props into utilities and passes HTML attributes through", () => {
    render(
      <Box as="section" aria-label="Summary" padding="space-300" background="surface-raised" radius="large" shadow="raised" border>
        Content
      </Box>,
    );
    const box = screen.getByRole("region", { name: "Summary" });
    expect(box.tagName).toBe("SECTION");
    expect(box.getAttribute("data-slot")).toBe("box");
    for (const utility of ["p-ds-300", "bg-ds-surface-raised", "rounded-ds-large", "shadow-ds-raised", "border-ds-border"]) {
      expect(classesOf(box)).toContain(utility);
    }
  });

  it("uses the bold border for edges the user must see", () => {
    render(<Box data-testid="b" border="bold" />);
    expect(classesOf(screen.getByTestId("b"))).toContain("border-ds-border-bold");
  });

  it("rejects className and style at the type level and never forwards them to class", () => {
    // @ts-expect-error — look comes from token props only
    render(<Box data-testid="c" className="mt-4" />);
    expect(classesOf(screen.getByTestId("c"))).not.toContain("mt-4");
  });
});

describe("Stack and Inline", () => {
  it("space children with gap, never margins", () => {
    render(
      <Stack data-testid="stack" space="space-200" align="start">
        <span>1</span>
        <span>2</span>
      </Stack>,
    );
    const stack = screen.getByTestId("stack");
    expect(classesOf(stack)).toContain("flex-col");
    expect(classesOf(stack)).toContain("gap-ds-200");
    expect(classesOf(stack)).toContain("items-start");
    for (const child of Array.from(stack.children)) expect(classesOf(child)).not.toMatch(/(^|\s)m[trblxy]?-/);
  });

  it("wraps Inline by default and can turn wrapping off", () => {
    render(
      <>
        <Stack direction="horizontal" data-testid="wrap" space="space-100" />
        <Stack direction="horizontal" data-testid="nowrap" wrap={false} justify="between" />
      </>,
    );
    expect(classesOf(screen.getByTestId("wrap"))).toContain("flex-wrap");
    expect(classesOf(screen.getByTestId("wrap"))).toContain("items-center");
    expect(classesOf(screen.getByTestId("nowrap"))).toContain("flex-nowrap");
    expect(classesOf(screen.getByTestId("nowrap"))).toContain("justify-between");
  });
});

describe("Grid", () => {
  it("lays out fixed columns", () => {
    render(<Grid data-testid="g" columns={3} space="space-150" />);
    expect(classesOf(screen.getByTestId("g"))).toContain("grid-cols-3");
    expect(classesOf(screen.getByTestId("g"))).toContain("gap-ds-150");
  });

  it("auto-fits columns from a minimum width without overflowing", () => {
    render(<Grid data-testid="g" minColumnWidth={220} space="space-200" />);
    const grid = screen.getByTestId("g");
    expect(grid.style.getPropertyValue("--ds-grid-min")).toBe("220px");
    expect(classesOf(grid)).toContain("minmax(min(var(--ds-grid-min),100%),1fr)");
  });
});

describe("Grid input guard", () => {
  it.each([0, -40, Number.NaN])("falls back to one column for minColumnWidth=%s", (width) => {
    render(<Grid data-testid="g" minColumnWidth={width} />);
    const grid = screen.getByTestId("g");
    expect(classesOf(grid)).toContain("grid-cols-1");
    expect(grid.getAttribute("style")).toBeNull();
  });
});

describe("right-to-left", () => {
  it("uses only logical or symmetric classes, so RTL needs no override", () => {
    const { container } = render(
      <div dir="rtl">
        <Stack space="space-200" padding="space-300" paddingInline="space-400" border>
          <Stack direction="horizontal" space="space-100" justify="start" paddingBlock="space-100">
            <Box padding="space-100" radius="small">ا</Box>
          </Stack>
          <Grid minColumnWidth={120} space="space-100">
            <Pressable onPress={() => {}} padding="space-200">ب</Pressable>
          </Grid>
        </Stack>
      </div>,
    );
    const elements = Array.from(container.querySelectorAll("[data-slot]"));
    expect(elements.length).toBe(5);
    for (const element of elements) expect(classesOf(element)).not.toMatch(PHYSICAL);
  });
});

describe("Pressable", () => {
  it("fills its container by default, as a button and as a link; width=content hugs what it holds", () => {
    render(
      <>
        <Pressable onPress={() => {}}>Button</Pressable>
        <Pressable href="/x">Link</Pressable>
        <Pressable onPress={() => {}} width="content">Hug</Pressable>
      </>,
    );
    expect(screen.getByRole("button", { name: "Button" }).className.split(/\s+/)).toContain("w-full");
    expect(screen.getByRole("link", { name: "Link" }).className.split(/\s+/)).toContain("w-full");
    const hug = screen.getByRole("button", { name: "Hug" }).className.split(/\s+/);
    expect(hug).toContain("w-fit");
    expect(hug).not.toContain("w-full");
  });

  it("is a button that fires onPress for pointer and keyboard", () => {
    const onPress = vi.fn();
    render(<Pressable onPress={onPress}>Select item</Pressable>);
    const button = screen.getByRole("button", { name: "Select item" });
    expect(button.getAttribute("type")).toBe("button");
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyUp(button, { key: "Enter" });
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it("has a minimum hit area and a keyboard-only 2px inner focus border, no ring", () => {
    render(<Pressable onPress={() => {}}>Card</Pressable>);
    const classes = classesOf(screen.getByRole("button"));
    expect(classes).toContain("min-h-6");
    expect(classes).toContain("min-w-6");
    expect(classes).toContain("data-[focus-visible]:inset-ring-2");
    expect(classes).toContain("data-[focus-visible]:inset-ring-ds-border-focused");
    expect(classes).not.toMatch(/(^|\s)(focus:|outline-none(\s|$))/);
    expect(classes).not.toMatch(/outline-(offset|ds-|2|solid)/);
  });

  it("shows the focus state on keyboard focus only", () => {
    render(<Pressable onPress={() => {}}>Card</Pressable>);
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

  it("gives a shadowed card pressed feedback too", () => {
    render(<Pressable onPress={() => {}} shadow="raised" background="surface-raised">Card</Pressable>);
    const classes = classesOf(screen.getByRole("button"));
    expect(classes).toContain("data-[hovered]:shadow-ds-overlay");
    expect(classes).toContain("data-[pressed]:shadow-ds-raised");
    expect(classes).toContain("data-[pressed]:bg-ds-background-neutral-hovered");
  });

  it("keeps the meaning of its ground on hover", () => {
    render(
      <>
        <Pressable onPress={() => {}} background="selected">Selected</Pressable>
        <Pressable onPress={() => {}} background="neutral">Neutral</Pressable>
        <Pressable onPress={() => {}} background="danger">Danger</Pressable>
      </>,
    );
    expect(classesOf(screen.getByRole("button", { name: "Selected" }))).toContain("data-[hovered]:bg-ds-background-selected-hovered");
    expect(classesOf(screen.getByRole("button", { name: "Selected" }))).toContain("data-[pressed]:bg-ds-background-selected-pressed");
    expect(classesOf(screen.getByRole("button", { name: "Selected" }))).not.toContain("bg-ds-surface-hovered");
    expect(classesOf(screen.getByRole("button", { name: "Neutral" }))).toContain("data-[pressed]:bg-ds-background-neutral-pressed");
    expect(classesOf(screen.getByRole("button", { name: "Danger" }))).not.toMatch(/data-\[(hovered|pressed)\]:bg-/);
  });

  it("only uses state colours and shadows that exist in the theme", () => {
    const grounds = [undefined, "surface", "surface-raised", "surface-sunken", "surface-overlay", "neutral", "selected", "brand-subtle", "information", "danger"] as const;
    for (const background of grounds) {
      for (const shadow of [undefined, "raised"] as const) {
        const classes = pressableClasses({ background, shadow }).split(/\s+/);
        for (const utility of classes) {
          const color = /(?:^|:)(?:bg|outline|inset-ring)-(ds-[a-z-]+)$/.exec(utility);
          if (color) expect(theme, utility).toContain(`--color-${color[1]}:`);
          const lift = /(?:^|:)shadow-(ds-[a-z-]+)$/.exec(utility);
          if (lift) expect(theme, utility).toContain(`--shadow-${lift[1]}:`);
        }
      }
    }
  });

  it("lifts a shadowed surface on hover and fills a flat one", () => {
    render(
      <>
        <Pressable onPress={() => {}} shadow="raised">Raised</Pressable>
        <Pressable onPress={() => {}}>Flat</Pressable>
      </>,
    );
    expect(classesOf(screen.getByRole("button", { name: "Raised" }))).toContain("data-[hovered]:shadow-ds-overlay");
    expect(classesOf(screen.getByRole("button", { name: "Flat" }))).toContain("data-[hovered]:bg-ds-surface-hovered");
  });

  it("reports pressed state while pressed", () => {
    render(<Pressable onPress={() => {}}>Pressed</Pressable>);
    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: " " });
    expect(button.hasAttribute("data-pressed")).toBe(true);
    fireEvent.keyUp(button, { key: " " });
    expect(button.hasAttribute("data-pressed")).toBe(false);
  });

  it("does not fire when disabled", () => {
    const onPress = vi.fn();
    render(<Pressable onPress={onPress} isDisabled>Disabled</Pressable>);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button.hasAttribute("data-disabled")).toBe(true);
  });

  it("is a link through the host router when it has an href", () => {
    const navigate = vi.fn();
    render(
      <DesignSystemProvider locale="en" navigate={navigate}>
        <Pressable href="/orders/ord-0914">ORD-0914</Pressable>
      </DesignSystemProvider>,
    );
    const link = screen.getByRole("link", { name: "ORD-0914" });
    expect(link.getAttribute("href")).toBe("/orders/ord-0914");
    fireEvent.click(link);
    expect(navigate).toHaveBeenCalledWith("/orders/ord-0914", undefined);
  });
});
