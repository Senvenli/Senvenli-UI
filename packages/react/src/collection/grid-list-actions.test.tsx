import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { GridList, type GridTileAction } from "./index";

/**
 * GridList tile actions: a photo manager removes a photo through a confirm and moves it earlier or later,
 * from buttons on the tile, by mouse, keyboard and touch.
 */

beforeAll(() => {
  // jsdom lacks CSS.escape, which React Aria's collections use to find rows.
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(cleanup);

type Photo = { id: string; title: string };
const PHOTOS: Photo[] = [
  { id: "front", title: "Front view" },
  { id: "side", title: "Side view" },
  { id: "detail", title: "Detail" },
];

function inLocale(ui: React.ReactElement, dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={dir ? "ar" : "en"} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

const classesOf = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);

function photoActions(onRemove: (id: string) => void, onMove: (id: string, by: -1 | 1) => void) {
  return (photo: Photo): { title: string; media: React.ReactNode; actions: GridTileAction[] } => {
    const index = PHOTOS.indexOf(photo);
    return {
      title: photo.title,
      media: <span>photo</span>,
      actions: [
        { id: "earlier", label: `Move earlier: ${photo.title}`, icon: "chevron-left", onPress: () => onMove(photo.id, -1), isDisabled: index === 0 },
        { id: "later", label: `Move later: ${photo.title}`, icon: "chevron-right", onPress: () => onMove(photo.id, 1), isDisabled: index === PHOTOS.length - 1 },
        { id: "remove", label: `Remove photo: ${photo.title}`, icon: "trash-2", tone: "danger", onPress: () => onRemove(photo.id) },
      ],
    };
  };
}

describe("GridList tile actions", () => {
  it("each tile has its own named buttons, in order, inside its row", () => {
    inLocale(<GridList aria-label="Product photos" items={PHOTOS} renderItem={photoActions(vi.fn(), vi.fn())} />);
    const tiles = screen.getAllByRole("row");
    expect(tiles).toHaveLength(3);
    const names = within(tiles[1]!).getAllByRole("button").map((button) => button.getAttribute("aria-label"));
    expect(names).toEqual(["Move earlier: Side view", "Move later: Side view", "Remove photo: Side view"]);
    expect(screen.getByRole("button", { name: "Remove photo: Detail" }).closest("[role='row']")).toBe(tiles[2]);
  });

  it("a press runs the action only: the tile neither opens nor toggles", () => {
    const onRemove = vi.fn();
    const onAction = vi.fn();
    const onSelectionChange = vi.fn();
    inLocale(
      <GridList
        aria-label="Product photos"
        items={PHOTOS}
        renderItem={photoActions(onRemove, vi.fn())}
        onAction={onAction}
        selectionMode="multiple"
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove photo: Side view" }));
    expect(onRemove).toHaveBeenCalledWith("side");
    expect(onAction).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(screen.getAllByRole("row")[1]!.getAttribute("aria-selected")).toBe("false");
  });

  it("from the keyboard: Enter and Space on a focused action press it, not the tile; arrows on the tile still move between tiles", () => {
    const onMove = vi.fn();
    const onAction = vi.fn();
    inLocale(<GridList aria-label="Product photos" items={PHOTOS} renderItem={photoActions(vi.fn(), onMove)} onAction={onAction} />);
    const later = screen.getByRole("button", { name: "Move later: Front view" });
    act(() => later.focus());
    fireEvent.keyDown(later, { key: "Enter" });
    fireEvent.keyUp(later, { key: "Enter" });
    fireEvent.keyDown(later, { key: " " });
    fireEvent.keyUp(later, { key: " " });
    expect(onMove.mock.calls).toEqual([["front", 1], ["front", 1]]);
    expect(onAction).not.toHaveBeenCalled();
    const tiles = screen.getAllByRole("row");
    act(() => tiles[0]!.focus());
    fireEvent.keyDown(tiles[0]!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(tiles[1]);
  });

  it("the actions are Tab stops inside the tile, after its drag handle; Tab from the tile stays with the browser", () => {
    inLocale(<GridList aria-label="Product photos" items={PHOTOS} renderItem={photoActions(vi.fn(), vi.fn())} dragAndDrop={{ onReorder: vi.fn() }} />);
    const tile = screen.getAllByRole("row")[1]!;
    const tabbable = [...tile.querySelectorAll<HTMLElement>("button")].filter((button) => button.tabIndex >= 0 && !button.hasAttribute("disabled"));
    expect(tabbable.map((button) => button.getAttribute("data-slot"))).toEqual(["grid-list-drag", "grid-list-action", "grid-list-action", "grid-list-action"]);
    act(() => tile.focus());
    // React Aria leaves a Tab with a focusable child after it to the browser, which moves to the handle.
    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    tile.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
  });

  it("a disabled action is named and skipped: Earlier on the first tile, Later on the last", () => {
    inLocale(<GridList aria-label="Product photos" items={PHOTOS} renderItem={photoActions(vi.fn(), vi.fn())} />);
    expect(screen.getByRole("button", { name: "Move earlier: Front view" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Move later: Detail" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Move later: Front view" }).hasAttribute("disabled")).toBe(false);
  });

  it("sits at the bottom end of the media, always shown, 40px under a coarse pointer; danger tone on remove", () => {
    inLocale(<GridList aria-label="Product photos" items={PHOTOS} renderItem={photoActions(vi.fn(), vi.fn())} />, "rtl");
    const bar = document.querySelector("[data-slot='grid-list-actions']")!;
    const overlay = bar.parentElement!;
    expect(classesOf(overlay)).toEqual(expect.arrayContaining(["absolute", "inset-x-0", "top-0", "aspect-[4/3]", "items-end", "justify-end", "pointer-events-none"]));
    expect(classesOf(bar)).toContain("pointer-events-auto");
    const remove = screen.getByRole("button", { name: "Remove photo: Front view" });
    expect(classesOf(remove)).toEqual(expect.arrayContaining(["size-7", "pointer-coarse:size-10", "text-ds-icon-danger"]));
    // Nothing hides them until hover or focus.
    expect(classesOf(overlay).concat(classesOf(bar), classesOf(remove)).some((name) => name.includes("opacity-0"))).toBe(false);
    // Logical placement only: no left/right classes, so the bar follows the inline end in RTL.
    for (const element of [overlay, bar, remove]) expect(classesOf(element).some((name) => /(^|:)-?(left|right|ml|mr|pl|pr)-/.test(name))).toBe(false);
  });

  it("an action's focus is an inset ring, with no outer outline", () => {
    inLocale(<GridList aria-label="Product photos" items={PHOTOS} renderItem={photoActions(vi.fn(), vi.fn())} dragAndDrop={{ onReorder: vi.fn() }} />);
    const focusable = [document.querySelector("[data-slot='grid-list-action']"), document.querySelector("[data-slot='grid-list-drag']")];
    for (const element of focusable) {
      expect(classesOf(element)).toEqual(expect.arrayContaining(["outline-hidden", "data-[focus-visible]:inset-ring-2", "data-[focus-visible]:inset-ring-ds-border-focused"]));
      expect(classesOf(element).some((name) => name.includes("outline-2") || name.includes("outline-ds-"))).toBe(false);
    }
  });

  it("without actions there is no bar, and the media area is unchanged", () => {
    inLocale(<GridList aria-label="Product photos" items={PHOTOS} renderItem={(photo) => ({ title: photo.title, media: <span>photo</span> })} />);
    expect(document.querySelector("[data-slot='grid-list-actions']")).toBeNull();
    expect(document.querySelectorAll("[data-slot='grid-list-tile'] button")).toHaveLength(0);
  });

  it("ref is the grid: focusing it returns to the tile React Aria keeps focused, after a removed one (a confirm's returnFocusRef)", () => {
    const ref = React.createRef<HTMLDivElement>();
    function Removable() {
      const [items, setItems] = React.useState(PHOTOS);
      return (
        <>
          <button type="button" onClick={() => setItems((current) => current.filter((photo) => photo.id !== "side"))}>delete</button>
          <GridList ref={ref} aria-label="Product photos" items={items} renderItem={(photo) => ({ title: photo.title })} />
        </>
      );
    }
    inLocale(<Removable />);
    expect(ref.current).toBe(screen.getByRole("grid", { name: "Product photos" }));
    act(() => screen.getAllByRole("row")[1]!.focus());
    act(() => screen.getByRole("button", { name: "delete" }).focus());
    fireEvent.click(screen.getByRole("button", { name: "delete" }));
    act(() => ref.current!.focus());
    expect(document.activeElement?.getAttribute("role")).toBe("row");
    expect(document.activeElement?.textContent).toBe("Detail");
  });
});
