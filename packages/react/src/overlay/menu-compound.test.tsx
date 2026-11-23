import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { DesignSystemProvider } from "../provider";
import { ContextMenu, ContextMenuTrigger, Menu, MenuItem, MenuSection, MenuSeparator, MenuSubmenu } from "./index";

// Menu and ContextMenu composed from parts.

if (!globalThis.CSS?.escape) {
  (globalThis as { CSS?: { escape?: (value: string) => string } }).CSS = {
    ...(globalThis.CSS ?? {}),
    escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`),
  };
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const wrap = (ui: React.ReactElement) => <DesignSystemProvider>{ui}</DesignSystemProvider>;

function open(name: string) {
  const trigger = screen.getByRole("button", { name });
  act(() => {
    fireEvent.pointerDown(trigger, { pointerType: "mouse", button: 0 });
    fireEvent.pointerUp(trigger, { pointerType: "mouse", button: 0 });
    fireEvent.click(trigger);
  });
  return screen.getByRole("menu");
}

describe("Menu composed from parts", () => {
  it("renders items, a titled section, a separator and a submenu, and runs actions", () => {
    const onAction = vi.fn();
    render(
      wrap(
        <Menu trigger={<Button>Actions</Button>} onAction={onAction}>
          <MenuItem id="edit" icon="pencil" shortcut="E">
            Edit
          </MenuItem>
          <MenuSection title="Share">
            <MenuItem id="link">Copy link</MenuItem>
          </MenuSection>
          <MenuSubmenu id="move" label="Move to">
            <MenuItem id="archive">Archive</MenuItem>
          </MenuSubmenu>
          <MenuSeparator />
          <MenuItem id="delete" tone="danger" icon="trash-2">
            Delete
          </MenuItem>
        </Menu>,
      ),
    );
    const menu = open("Actions");
    expect(within(menu).getByRole("group", { name: "Share" })).toBeTruthy();
    expect(within(menu).getByRole("menuitem", { name: "Move to" }).getAttribute("aria-haspopup")).toBe("menu");
    expect(menu.querySelector('[data-slot="menu-separator"]')).not.toBeNull();
    expect(within(menu).getByRole("menuitem", { name: "Delete" }).getAttribute("data-tone")).toBe("danger");
    const edit = within(menu).getByRole("menuitem", { name: /Edit/ });
    act(() => edit.focus());
    fireEvent.keyDown(edit, { key: "Enter" });
    fireEvent.keyUp(edit, { key: "Enter" });
    expect(onAction.mock.calls[0]?.[0]).toBe("edit");
  });

  it("takes a rich label with a textValue", () => {
    render(
      wrap(
        <Menu trigger={<Button>Account</Button>}>
          <MenuItem id="sofia" textValue="Sofia Marin">
            <strong>Sofia Marin</strong> · Owner
          </MenuItem>
        </Menu>,
      ),
    );
    const menu = open("Account");
    expect(within(menu).getByRole("menuitem").textContent).toContain("Sofia Marin");
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("renders the same item markup as items", () => {
    const strip = (html: string) => html.replace(/(id|aria-labelledby|aria-controls|data-key)="[^"]*"/g, "");
    const one = (ui: React.ReactElement) =>
      strip(renderToStaticMarkup(wrap(<Menu trigger={<button type="button">A</button>} isOpen>{ui}</Menu>)));
    const data = strip(
      renderToStaticMarkup(
        wrap(<Menu trigger={<button type="button">A</button>} isOpen items={[{ id: "edit", label: "Edit", icon: "pencil", shortcut: "E" }]} />),
      ),
    );
    expect(one(<MenuItem id="edit" icon="pencil" shortcut="E">Edit</MenuItem>)).toBe(data);
  });
});

describe("ContextMenu composed from parts", () => {
  it("opens on the ContextMenuTrigger region and lists the parts after it", () => {
    const onAction = vi.fn();
    render(
      wrap(
        <ContextMenu aria-label="Row actions" onAction={onAction}>
          <ContextMenuTrigger>
            <div>Row</div>
          </ContextMenuTrigger>
          <MenuItem id="open">Open</MenuItem>
          <MenuSeparator />
          <MenuItem id="delete" tone="danger">
            Delete
          </MenuItem>
        </ContextMenu>,
      ),
    );
    expect(screen.queryByText("Open")).toBeNull();
    act(() => {
      fireEvent.contextMenu(screen.getByText("Row"), { clientX: 10, clientY: 10 });
    });
    const menu = screen.getByRole("menu", { name: "Row actions" });
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Open" }));
    expect(onAction.mock.calls[0]?.[0]).toBe("open");
  });
});
