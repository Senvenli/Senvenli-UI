import * as React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { List, ListItem } from "./index";

/**
 * A List that shows one open record beside it (an inbox's conversations) selects by replacing: no
 * checkboxes, a press picks that row, the arrow keys move the pick, and the row keeps its selected marker.
 * The default stays `toggle`, with a checkbox per row.
 */
beforeAll(() => {
  // jsdom lacks CSS.escape, which React Aria's collections use to find rows.
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(cleanup);

function Inbox({ behavior, onChange }: { behavior?: "toggle" | "replace"; onChange?: (key: string) => void }) {
  const [selected, setSelected] = React.useState<string>("ap");
  return (
    <DesignSystemProvider locale="en" navigate={vi.fn()}>
      <List
        aria-label="Conversations"
        selectionMode="single"
        selectionBehavior={behavior}
        selectedKeys={[selected]}
        onSelectionChange={(keys) => {
          if (keys === "all") return;
          const [next] = Array.from(keys);
          if (next !== undefined) {
            setSelected(String(next));
            onChange?.(String(next));
          }
        }}
      >
        <ListItem id="ap" title="Ana Petrović" description="+49 30 000 001" />
        <ListItem id="ms" title="maria.shop" />
        <ListItem id="jw" title="Jonas Weber" />
      </List>
    </DesignSystemProvider>
  );
}

const rows = () => within(screen.getByRole("grid", { name: "Conversations" })).getAllByRole("row");

describe("List selectionBehavior", () => {
  it("keeps a checkbox per row by default (toggle)", () => {
    render(<Inbox />);
    expect(rows()).toHaveLength(3);
    for (const row of rows()) expect(row.querySelector('[data-slot="selection-checkbox"]')).not.toBeNull();
  });

  it("replace draws no checkbox and marks the open row", () => {
    render(<Inbox behavior="replace" />);
    for (const row of rows()) expect(row.querySelector('[data-slot="selection-checkbox"]')).toBeNull();
    expect(rows()[0]!.getAttribute("aria-selected")).toBe("true");
    expect(rows()[0]!.querySelector('[data-slot="list-item-marker"]')).not.toBeNull();
  });

  it("replace: a press picks that row in place of the last", () => {
    const onChange = vi.fn();
    render(<Inbox behavior="replace" onChange={onChange} />);
    fireEvent.pointerDown(rows()[2]!, { pointerType: "mouse", button: 0 });
    fireEvent.pointerUp(rows()[2]!, { pointerType: "mouse", button: 0 });
    fireEvent.click(rows()[2]!);
    expect(onChange).toHaveBeenLastCalledWith("jw");
    expect(rows()[2]!.getAttribute("aria-selected")).toBe("true");
    expect(rows()[0]!.getAttribute("aria-selected")).toBe("false");
  });

  it("replace: the arrow keys move the pick", () => {
    const onChange = vi.fn();
    render(<Inbox behavior="replace" onChange={onChange} />);
    rows()[0]!.focus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith("ms");
    expect(rows()[1]!.getAttribute("aria-selected")).toBe("true");
  });
});
