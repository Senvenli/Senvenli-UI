import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { GridList, GridListItem, GridListSection } from "./index";

beforeAll(() => {
  // jsdom lacks CSS.escape, which React Aria's collections use to find rows.
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(cleanup);

function inLocale(ui: React.ReactElement, dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={dir ? "ar" : "en"} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

const classesOf = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);

type Photo = { id: string; title: string; meta: string };
const PHOTOS: Photo[] = [
  { id: "front", title: "Front view", meta: "Cover photo" },
  { id: "side", title: "Side view", meta: "1.9 MB" },
  { id: "detail", title: "Detail", meta: "2.4 MB" },
];

describe("GridList", () => {
  const tile = (photo: Photo) => ({ title: photo.title, meta: photo.meta, media: <span>photo</span> });

  it("tiles in a grid: arrows move in both directions, Space selects, a checkbox and ring show it", () => {
    inLocale(<GridList layout="grid" aria-label="Product photos" items={PHOTOS} renderItem={tile} selectionMode="multiple" />);
    const grid = screen.getByRole("grid", { name: "Product photos" });
    const tiles = within(grid).getAllByRole("row");
    expect(tiles.map((element) => element.querySelector("[data-slot='grid-list-title']")?.textContent)).toEqual(["Front view", "Side view", "Detail"]);
    expect(within(grid).getAllByRole("checkbox")).toHaveLength(3);
    act(() => tiles[0]!.focus());
    fireEvent.keyDown(tiles[0]!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(tiles[1]);
    fireEvent.keyDown(tiles[1]!, { key: " " });
    fireEvent.keyUp(tiles[1]!, { key: " " });
    expect(tiles[1]!.getAttribute("aria-selected")).toBe("true");
    expect(classesOf(tiles[1]!)).toEqual(expect.arrayContaining(["data-[selected]:ring-2", "data-[selected]:ring-ds-border-selected"]));
    expect(within(tiles[1]!).getByRole("checkbox")).toHaveProperty("checked", true);
    expect(classesOf(tiles[1]!).some((name) => name.includes("ring-offset"))).toBe(false);
  });

  it("a tile's focus is an inset ring, with no outer outline", () => {
    inLocale(<GridList layout="grid" aria-label="Product photos" items={PHOTOS} renderItem={tile} selectionMode="multiple" />);
    for (const element of screen.getAllByRole("row")) {
      const classes = classesOf(element);
      expect(classes).toEqual(expect.arrayContaining(["outline-hidden", "data-[focus-visible]:inset-ring-2", "data-[focus-visible]:inset-ring-ds-border-focused"]));
      expect(classes.some((name) => name.includes("outline-2") || name.includes("outline-ds-") || name.includes("outline-offset"))).toBe(false);
    }
  });

  it("Enter opens a tile; with onReorder each tile gets a named drag handle", () => {
    const onAction = vi.fn();
    inLocale(<GridList layout="grid" aria-label="Product photos" items={PHOTOS} renderItem={tile} onAction={onAction} dragAndDrop={{ onReorder: vi.fn() }} />);
    const tiles = screen.getAllByRole("row");
    act(() => tiles[2]!.focus());
    fireEvent.keyDown(tiles[2]!, { key: "Enter" });
    fireEvent.keyUp(tiles[2]!, { key: "Enter" });
    expect(onAction).toHaveBeenCalledWith("detail");
    const handles = document.querySelectorAll("[data-slot='grid-list-drag']");
    expect(handles).toHaveLength(3);
    expect(handles[0]!.getAttribute("aria-label")).toBeTruthy();
  });

  it("no handles without dragAndDrop; tiles are at least 150px wide in a 4:3 media frame", () => {
    inLocale(<GridList layout="grid" aria-label="Product photos" items={PHOTOS} renderItem={tile} />);
    expect(document.querySelector("[data-slot='grid-list-drag']")).toBeNull();
    expect(classesOf(document.querySelector("[data-slot='grid-list']"))).toContain("grid-cols-[repeat(auto-fill,minmax(150px,1fr))]");
    expect(classesOf(document.querySelector("[data-slot='grid-list-media']"))).toEqual(expect.arrayContaining(["aspect-[4/3]", "bg-ds-surface-sunken"]));
  });
});

describe("List with items, sections and renderItem", () => {
  it("builds rows and section headers from data", () => {
    type Delivery = { id: string; name: string; when: string };
    inLocale(
      <GridList<Delivery>
        aria-label="Deliveries"
        sections={[
          { title: "Today", items: [{ id: "a", name: "Ana Petrović", when: "10:00" }] },
          { title: "Tomorrow", items: [{ id: "b", name: "Jonas Weber", when: "09:00" }] },
        ]}
        renderItem={(item) => ({ id: item.id, title: item.name, description: item.when })}
      />,
    );
    expect([...document.querySelectorAll("[data-slot='list-section-header']")].map((header) => header.textContent)).toEqual(["Today", "Tomorrow"]);
    expect([...document.querySelectorAll("[data-slot='list-item-title']")].map((title) => title.textContent)).toEqual(["Ana Petrović", "Jonas Weber"]);
  });
});

describe("List and GridListItem", () => {
  const rows = (
    <>
      <GridListSection title="Today">
        <GridListItem id="ap" leading={<span>AP</span>} title="Ana Petrović" description="Order 1042 · 10:00 · Berlin" trailing={<span>Confirmed</span>} />
        <GridListItem id="mk" title="Maria Keller" description="Order 1043 · 13:30 · Hamburg" />
      </GridListSection>
      <GridListSection title="Tomorrow">
        <GridListItem id="jw" title="Jonas Weber" description="Order 1044 · 09:00 · Munich" />
      </GridListSection>
    </>
  );

  it("rows under section headers, with leading, two lines and trailing", () => {
    inLocale(<GridList aria-label="Deliveries">{rows}</GridList>);
    const list = screen.getByRole("grid", { name: "Deliveries" });
    expect([...list.querySelectorAll("[data-slot='list-section-header']")].map((header) => header.textContent)).toEqual(["Today", "Tomorrow"]);
    const first = list.querySelector("[data-slot='list-item']")!;
    expect(first.querySelector("[data-slot='list-item-leading']")!.textContent).toBe("AP");
    expect(first.querySelector("[data-slot='list-item-title']")!.textContent).toBe("Ana Petrović");
    expect(first.querySelector("[data-slot='list-item-description']")!.textContent).toBe("Order 1042 · 10:00 · Berlin");
    expect(first.querySelector("[data-slot='list-item-description']")!.tagName).toBe("BDI");
    expect(first.querySelector("[data-slot='list-item-trailing']")!.textContent).toBe("Confirmed");
    expect(classesOf(first)).toContain("min-h-14");
  });

  it("section headers are small medium-weight text in sentence case, not an uppercase overline", () => {
    inLocale(<GridList aria-label="Deliveries">{rows}</GridList>);
    const headers = [...document.querySelectorAll("[data-slot='list-section-header']")];
    expect(headers).toHaveLength(2);
    for (const header of headers) {
      const classes = classesOf(header);
      expect(classes).toEqual(expect.arrayContaining(["text-body-small", "font-medium", "text-ds-text-subtle", "bg-ds-surface-sunken"]));
      expect(classes.some((name) => name.includes("uppercase") || name.includes("text-heading") || name.includes("tracking-"))).toBe(false);
    }
    // The title is rendered as written.
    expect(headers[0]!.textContent).toBe("Today");
  });

  it("a row's focus is an inset ring, with no outer outline", () => {
    inLocale(<GridList aria-label="Deliveries">{rows}</GridList>);
    const classes = classesOf(document.querySelector("[data-slot='list-item']"));
    expect(classes).toEqual(expect.arrayContaining(["outline-hidden", "data-[focus-visible]:inset-ring-2", "data-[focus-visible]:inset-ring-ds-border-focused"]));
    expect(classes.some((name) => name.includes("outline-2") || name.includes("outline-ds-"))).toBe(false);
  });

  it("arrows move between rows across sections; Enter opens the record", () => {
    const onAction = vi.fn();
    inLocale(<GridList aria-label="Deliveries" onAction={onAction}>{rows}</GridList>);
    const items = [...document.querySelectorAll<HTMLElement>("[data-slot='list-item']")];
    act(() => items[1]!.focus());
    fireEvent.keyDown(items[1]!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[2]);
    fireEvent.keyDown(items[2]!, { key: "Enter" });
    fireEvent.keyUp(items[2]!, { key: "Enter" });
    expect(onAction).toHaveBeenCalledWith("jw");
  });

  it("selection shows the leading marker; multiple adds checkboxes", () => {
    inLocale(<GridList aria-label="Deliveries" selectionMode="multiple" defaultSelectedKeys={["mk"]}>{rows}</GridList>);
    const items = [...document.querySelectorAll("[data-slot='list-item']")];
    expect(items[1]!.getAttribute("aria-selected")).toBe("true");
    expect(classesOf(items[1]!.querySelector("[data-slot='list-item-marker']"))).toEqual(expect.arrayContaining(["start-0", "group-data-[selected]/row:block"]));
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("single selection shows a checkbox per row too", () => {
    inLocale(<GridList aria-label="Deliveries" selectionMode="single">{rows}</GridList>);
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });
});
