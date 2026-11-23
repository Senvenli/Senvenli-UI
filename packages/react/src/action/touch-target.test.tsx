import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DescriptionList } from "../display/index";
import { GridList } from "../collection/index";
import { Button, ButtonGroup, CloseButton } from "./index";
import { LinkButton } from "./link-button";
import { hasTouchTarget, TOUCH_TARGET } from "./styles";

afterEach(cleanup);

function withProvider(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

const classSet = (element: Element) => new Set((element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean));
const touchTarget = (element: Element) => element.querySelector(':scope > [data-slot="button-touch-target"]');

describe("44px touch target under a coarse pointer", () => {
  it("is an empty span shown only under a coarse pointer, covering the button, laid out on its own", () => {
    const classes = TOUCH_TARGET.split(/\s+/);
    // Not displayed for a mouse; under a coarse pointer it covers the button and contains its own layout, so the
    // growth is ink overflow (no scrollable overflow, no baseline).
    expect(classes.slice(0, 5)).toEqual(["hidden", "pointer-coarse:block", "absolute", "inset-0", "contain-layout"]);
    expect(classes.slice(5)).toEqual([
      "before:absolute",
      "before:inset-y-[min(0px,calc((100%_-_44px)/2))]",
      "not-in-data-[slot=button-group]:before:inset-x-[min(0px,calc((100%_-_44px)/2))]",
      // In a group its sides sit on the button's: an absolute box needs both, or it is 0px wide.
      "in-data-[slot=button-group]:before:inset-x-0",
    ]);
    // Nothing drawn and no physical side (RTL-safe): equal insets on both sides of each axis.
    for (const utility of classes) {
      expect(utility).not.toMatch(/(^|:)(bg|border|ring|inset-ring|shadow|outline)-/);
      expect(utility).not.toMatch(/(^|:)(left|right|start|end|top|bottom)-/);
    }
  });

  it("which sizes get it: small, and icon-only small and medium; large is already 44px", () => {
    expect(hasTouchTarget("small", false)).toBe(true);
    expect(hasTouchTarget("small", true)).toBe(true);
    expect(hasTouchTarget("medium", true)).toBe(true);
    expect(hasTouchTarget("medium", false)).toBe(false);
    expect(hasTouchTarget("large", true)).toBe(false);
    expect(hasTouchTarget("large", false)).toBe(false);
  });

  it("compact buttons and the compact and default icon-only buttons render it, aria-hidden and empty", () => {
    withProvider(
      <>
        <Button size="small">Edit</Button>
        <Button size="small" iconOnly iconBefore="plus" aria-label="Add" />
        <Button iconOnly iconBefore="settings" aria-label="Settings" />
      </>,
    );
    for (const name of ["Edit", "Add", "Settings"]) {
      const button = screen.getByRole("button", { name });
      const target = touchTarget(button);
      expect(target, name).not.toBeNull();
      expect(target!.getAttribute("aria-hidden")).toBe("true");
      expect(target!.textContent).toBe("");
      expect(target!.getAttribute("class")).toBe(TOUCH_TARGET);
    }
    // The accessible name and the text are unchanged.
    expect(screen.getByRole("button", { name: "Edit" }).textContent).toBe("Edit");
  });

  it("default and large text buttons and the 44px large icon button render nothing new", () => {
    withProvider(
      <>
        <Button>Save</Button>
        <Button size="large">Continue</Button>
        <Button size="large" iconOnly iconBefore="search" aria-label="Search" />
      </>,
    );
    for (const name of ["Save", "Continue", "Search"]) {
      const button = screen.getByRole("button", { name });
      expect(touchTarget(button), name).toBeNull();
      expect(button.children, name).toHaveLength(1);
    }
  });

  it("the size and position classes of the button itself are unchanged", () => {
    withProvider(<Button size="small" iconOnly iconBefore="plus" aria-label="Add" />);
    const button = screen.getByRole("button", { name: "Add" });
    for (const utility of ["relative", "h-ds-control-compact", "w-ds-control-compact", "px-0"]) expect(classSet(button).has(utility), utility).toBe(true);
    expect([...classSet(button)].some((utility) => utility.includes("coarse") || utility.includes("before:"))).toBe(false);
  });

  it("the DS's own compact icon buttons on Button get it: close and copy", () => {
    withProvider(
      <>
        <CloseButton />
        <DescriptionList items={[{ label: "Reference", value: "AB 482", copyValue: "AB 482" }]} />
      </>,
    );
    expect(touchTarget(screen.getByRole("button", { name: "Close" }))).not.toBeNull();
    expect(touchTarget(document.querySelector('[data-slot="copy-button"]')!)).not.toBeNull();
  });

  it("LinkButton renders the same hit area as Button", () => {
    withProvider(
      <>
        <LinkButton href="/x" size="small" iconOnly iconBefore="download" aria-label="Download" />
        <LinkButton href="/y">Orders</LinkButton>
      </>,
    );
    expect(touchTarget(screen.getByRole("link", { name: "Download" }))).not.toBeNull();
    expect(touchTarget(screen.getByRole("link", { name: "Orders" }))).toBeNull();
  });

  it("inside a ButtonGroup the buttons render it; the group rules keep its sides on the button's", () => {
    withProvider(
      <ButtonGroup aria-label="View">
        <Button size="small" iconOnly iconBefore="list" aria-label="List" />
        <Button size="small" iconOnly iconBefore="map" aria-label="Map" />
      </ButtonGroup>,
    );
    expect(screen.getByRole("group", { name: "View" }).dataset.slot).toBe("button-group");
    for (const name of ["List", "Map"]) expect(touchTarget(screen.getByRole("button", { name })), name).not.toBeNull();
  });

  it("GridList's tile actions, small icon buttons that are not Buttons, render the same span; its drag handle does not", () => {
    globalThis.CSS ??= {} as typeof CSS;
    CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
    withProvider(
      <GridList layout="grid"
        aria-label="Product photos"
        items={[{ id: "front", title: "Front view" }]}
        dragAndDrop={{ onReorder: vi.fn() }}
        renderItem={(photo) => ({
          title: photo.title,
          actions: [
            { id: "later", label: `Move to end: ${photo.title}`, icon: "chevron-right", onPress: vi.fn() },
            { id: "remove", label: `Remove photo: ${photo.title}`, icon: "trash-2", tone: "danger", onPress: vi.fn() },
          ],
        })}
      />,
    );
    const controls = [...document.querySelectorAll('[data-slot="grid-list-action"]')];
    expect(controls).toHaveLength(2);
    for (const control of controls) {
      const target = touchTarget(control);
      expect(target, control.getAttribute("aria-label") ?? "").not.toBeNull();
      expect(target!.getAttribute("aria-hidden")).toBe("true");
      expect(target!.getAttribute("class")).toBe(TOUCH_TARGET);
    }
    // The span is absolutely placed, so an action is positioned; its visible size is unchanged (28px, 40px under a
    // coarse pointer).
    const action = screen.getByRole("button", { name: "Move to end: Front view" });
    for (const utility of ["relative", "size-7", "pointer-coarse:size-10"]) expect(classSet(action).has(utility), utility).toBe(true);
    // React Aria takes pointer input off the drag handle (the tile under it is what a pointer drags): no hit area.
    const handle = document.querySelector<HTMLElement>('[data-slot="grid-list-drag"]')!;
    expect(handle.style.pointerEvents).toBe("none");
    expect(touchTarget(handle)).toBeNull();
    // The names are unchanged: the span adds no text.
    expect(action.textContent).toBe("");
    expect(action.getAttribute("aria-label")).toBe("Move to end: Front view");
  });

  it("server render: the span is in the markup, so hydration matches", () => {
    const html = renderToStaticMarkup(
      <DesignSystemProvider locale="en" navigate={() => {}}>
        <Button size="small">Edit</Button>
      </DesignSystemProvider>,
    );
    expect(html).toContain('data-slot="button-touch-target"');
  });
});
