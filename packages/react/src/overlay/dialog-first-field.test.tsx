import * as React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DatePicker } from "../date/index";
import { TextField } from "../form/text-field";
import { ComboBox, Select } from "../selection/index";
import { MultiSelect } from "../selection/multi-select";
import { Dialog } from "./index";

/**
 * A Dialog's first focus skips the native fields React Aria hides behind a Select: the hidden <select>
 * (aria-hidden, tabIndex -1, data-react-aria-prevent-focus) matched `select:not([disabled])` and took the focus.
 */

afterEach(cleanup);

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

function open(body: React.ReactNode) {
  return render(
    <DesignSystemProvider locale="en" navigate={vi.fn()}>
      <Dialog defaultOpen title="Details" primaryAction={{ label: "Save" }}>{body}</Dialog>
    </DesignSystemProvider>,
  );
}
const ITEMS = [{ id: "a", label: "First" }, { id: "b", label: "Second" }];
const focused = () => document.activeElement as HTMLElement;

describe("Dialog first-field focus", () => {
  it("a Select first: its button, not its hidden native select", async () => {
    open(<><Select label="Category" items={ITEMS} name="category" /><TextField label="Name" /></>);
    expect(document.querySelector("select")).not.toBeNull();
    await waitFor(() => expect(focused().tagName).toBe("BUTTON"));
    expect(focused().getAttribute("aria-haspopup")).toBe("listbox");
    expect(focused().closest("[data-slot='select']")).not.toBeNull();
  });

  it("a MultiSelect first: its button", async () => {
    open(<><MultiSelect label="Options" items={ITEMS} name="options" /><TextField label="Name" /></>);
    await waitFor(() => expect(focused().getAttribute("aria-haspopup")).toBe("listbox"));
    expect(focused().closest("[data-slot='multi-select']")).not.toBeNull();
  });

  it("a ComboBox first: its text input, not its hidden input or its button", async () => {
    open(<><ComboBox label="Type" items={ITEMS} name="type" /><TextField label="Name" /></>);
    await waitFor(() => expect(focused().getAttribute("role")).toBe("combobox"));
    expect(focused().tagName).toBe("INPUT");
  });

  it("a DatePicker first: its first segment, not its hidden input", async () => {
    open(<><DatePicker label="Review date" name="review" /><TextField label="Name" /></>);
    expect(document.querySelector("input[type='hidden'][name='review']")).not.toBeNull();
    await waitFor(() => expect(focused().getAttribute("role")).toBe("spinbutton"));
  });

  it("a text field before a Select keeps the focus; document order decides", async () => {
    open(<><TextField label="Name" /><Select label="Category" items={ITEMS} name="category" /></>);
    await waitFor(() => expect(focused()).toBe(screen.getByRole("textbox", { name: "Name" })));
  });
});
