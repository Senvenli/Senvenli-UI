import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CopyButton } from "./action/index";
import { Tree } from "./collection/index";
import { Image, VisuallyHidden } from "./display/index";
import { ContextMenu, HoverCard } from "./overlay/index";
import { DesignSystemProvider } from "./provider";
import { ListBox } from "./selection/index";

if (!globalThis.CSS?.escape) {
  (globalThis as { CSS?: { escape?: (value: string) => string } }).CSS = {
    ...(globalThis.CSS ?? {}),
    escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`),
  };
}

const wrap = (ui: React.ReactElement) => render(<DesignSystemProvider>{ui}</DesignSystemProvider>);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CopyButton", () => {
  it("copies the value and announces it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const onCopy = vi.fn();
    wrap(<CopyButton value="INV-1" aria-label="Copy the invoice number" onCopy={onCopy} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy the invoice number" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Copied"));
    expect(writeText).toHaveBeenCalledWith("INV-1");
    expect(onCopy).toHaveBeenCalled();
  });
});

describe("VisuallyHidden", () => {
  it("keeps its text in the accessibility tree but off screen", () => {
    wrap(<VisuallyHidden>Rated 4 out of 5</VisuallyHidden>);
    const node = screen.getByText("Rated 4 out of 5");
    expect(node.className).toContain("sr-only");
  });
});

describe("Image", () => {
  it("shows a named fallback when the picture fails", () => {
    wrap(<Image src="/missing.webp" alt="The product photo" ratio="4/3" />);
    const img = screen.getByRole("img", { name: "The product photo" });
    fireEvent.error(img);
    const fallback = screen.getByRole("img", { name: "The product photo" });
    expect(fallback.tagName).not.toBe("IMG");
  });
});

describe("ListBox", () => {
  it("selects an option", () => {
    const onSelectionChange = vi.fn();
    wrap(
      <ListBox
        label="Default view"
        onSelectionChange={onSelectionChange}
        items={[
          { id: "list", label: "List" },
          { id: "board", label: "Board" },
        ]}
      />,
    );
    expect(screen.getByRole("listbox", { name: "Default view" })).toBeTruthy();
    fireEvent.click(screen.getByRole("option", { name: "Board" }));
    expect(screen.getByRole("option", { name: "Board" }).getAttribute("aria-selected")).toBe("true");
    expect(onSelectionChange).toHaveBeenCalled();
  });
});

describe("Tree", () => {
  it("opens a folder from its chevron", () => {
    wrap(
      <Tree
        aria-label="Files"
        items={[{ id: "src", label: "src", children: [{ id: "index", label: "index.ts" }] }]}
      />,
    );
    expect(screen.getByRole("treegrid", { name: "Files" })).toBeTruthy();
    expect(screen.queryByText("index.ts")).toBeNull();
    const row = screen.getByRole("row", { name: /src/ });
    expect(row.getAttribute("aria-expanded")).toBe("false");
    const chevron = row.querySelector("[slot='chevron']") ?? row.querySelector("button");
    fireEvent.click(chevron as Element);
    expect(screen.getByText("index.ts")).toBeTruthy();
  });
});

describe("ContextMenu", () => {
  const items = [
    { id: "open", label: "Open" },
    { id: "delete", label: "Delete" },
  ];

  it("opens at the pointer on right-click and runs an action", async () => {
    const onAction = vi.fn();
    wrap(
      <ContextMenu aria-label="Row actions" items={items} onAction={onAction}>
        <div>Row</div>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText("Row"), { clientX: 40, clientY: 50 });
    const menu = await screen.findByRole("menu", { name: "Row actions" });
    expect(menu).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));
    expect(onAction).toHaveBeenCalledWith("open");
  });

  it("opens from the keyboard with Shift+F10", async () => {
    wrap(
      <ContextMenu aria-label="Row actions" items={items}>
        <button type="button">Row</button>
      </ContextMenu>,
    );
    const row = screen.getByRole("button", { name: "Row" });
    row.focus();
    fireEvent.keyDown(row, { key: "F10", shiftKey: true });
    expect(await screen.findByRole("menu", { name: "Row actions" })).toBeTruthy();
  });
});

describe("HoverCard", () => {
  it("opens on focus after the delay and closes on blur", async () => {
    vi.useFakeTimers();
    wrap(
      <HoverCard trigger={<a href="#sofia">Sofia Marin</a>} openDelay={300} closeDelay={100}>
        <p>Operations · Lisbon</p>
      </HoverCard>,
    );
    const link = screen.getByRole("link", { name: "Sofia Marin" });
    act(() => {
      fireEvent.focus(link);
    });
    expect(screen.queryByText("Operations · Lisbon")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(320);
    });
    expect(screen.getByText("Operations · Lisbon")).toBeTruthy();
    act(() => {
      fireEvent.blur(link);
      vi.advanceTimersByTime(150);
    });
    expect(screen.queryByText("Operations · Lisbon")).toBeNull();
  });
});
