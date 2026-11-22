import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Command, toast, type CommandGroup, type CommandItem } from "./index";
import { clearToastsForTests } from "./toast";

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;

if (!globalThis.CSS?.escape) {
  (globalThis as { CSS?: { escape?: (value: string) => string } }).CSS = {
    ...(globalThis.CSS ?? {}),
    escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`),
  };
}

beforeEach(() => act(() => clearToastsForTests()));
afterEach(() => {
  act(() => clearToastsForTests());
  cleanup();
  vi.useRealTimers();
});

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

describe("Toast", () => {
  it("toast() works under the provider with no Toaster of the app's own; title, detail, tone icon", () => {
    inLocale(<span>page</span>);
    act(() => {
      toast.success("Order confirmed", { description: "ORD-482 · email sent to the customer" });
    });
    const item = document.querySelector("[data-slot='toast']")!;
    expect(item.getAttribute("data-tone")).toBe("success");
    expect(within(item as HTMLElement).getByText("Order confirmed")).toBeTruthy();
    expect(item.querySelector("[data-slot='toast-icon']")!.getAttribute("class")).toContain("text-ds-icon-success");
    // A landmark region screen readers reach (F6) and that announces new toasts.
    expect(screen.getByRole("region")).toBeTruthy();
  });

  it("one region even with nested providers", () => {
    inLocale(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <span>inner</span>
      </DesignSystemProvider>,
    );
    act(() => {
      toast("Saved");
    });
    expect(document.querySelectorAll("[data-slot='toast-region']")).toHaveLength(1);
  });

  it("closes after 6s by default; a danger toast stays until dismissed", () => {
    vi.useFakeTimers();
    inLocale(<span>page</span>);
    act(() => {
      toast("Saved");
      toast.danger("Photo not uploaded", { description: "The file is over the 10 MB limit." });
    });
    expect(document.querySelectorAll("[data-slot='toast']")).toHaveLength(2);
    act(() => vi.advanceTimersByTime(6100));
    const left = Array.from(document.querySelectorAll("[data-slot='toast']"));
    expect(left).toHaveLength(1);
    expect(left[0]!.getAttribute("data-tone")).toBe("danger");
    act(() => vi.advanceTimersByTime(60_000));
    expect(document.querySelectorAll("[data-slot='toast']")).toHaveLength(1);
    fireEvent.click(within(left[0] as HTMLElement).getByRole("button", { name: "Close" }));
    expect(document.querySelectorAll("[data-slot='toast']")).toHaveLength(0);
  });

  it("pauses while hovered", () => {
    vi.useFakeTimers();
    inLocale(<span>page</span>);
    act(() => {
      toast("Saved");
    });
    const region = document.querySelector("[data-slot='toast-region']")!;
    fireEvent.pointerMove(document.body, { pointerType: "mouse" });
    fireEvent.pointerOver(region, { pointerType: "mouse" });
    fireEvent.mouseOver(region);
    act(() => vi.advanceTimersByTime(10_000));
    expect(document.querySelectorAll("[data-slot='toast']")).toHaveLength(1);
  });

  it("at most three on screen; the rest wait their turn", () => {
    inLocale(<span>page</span>);
    act(() => {
      for (const title of ["1", "2", "3", "4", "5"]) toast(title);
    });
    expect(document.querySelectorAll("[data-slot='toast']")).toHaveLength(3);
  });

  it("one link action (Undo): it runs and the toast closes", () => {
    const undo = vi.fn();
    inLocale(<span>page</span>);
    act(() => {
      toast.information("Project deleted", { action: { label: "Undo", onPress: undo } });
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(undo).toHaveBeenCalled();
    expect(document.querySelectorAll("[data-slot='toast']")).toHaveLength(0);
  });

  it("motion: ds-duration-medium with the enter easing, none for reduced motion; RTL logical classes", () => {
    inLocale(<span>page</span>, "ar", "rtl");
    act(() => {
      toast("x");
    });
    const item = document.querySelector("[data-slot='toast']")!.getAttribute("class")!;
    expect(item).toContain("duration-(--ds-duration-medium)");
    expect(item).toContain("ease-ds-enter");
    expect(item).toContain("motion-reduce:transition-none");
    for (const el of Array.from(document.querySelectorAll("[data-slot^='toast']"))) expect(el.getAttribute("class") ?? "").not.toMatch(PHYSICAL);
    // Clear of a shown floating banner, like the Fab.
    expect(document.querySelector("[data-slot='toast-region']")!.getAttribute("class")).toContain("var(--ds-floating-banner-offset,0px)");
  });
});

const ACTIONS: CommandGroup = {
  id: "actions",
  title: "Actions",
  items: [
    { id: "new", label: "Create new order", icon: "plus", shortcut: "N", kind: "action" },
    { id: "prices", label: "Go to price list", icon: "settings", kind: "action" },
    { id: "a3", label: "Add product", kind: "action" },
    { id: "a4", label: "Add team", kind: "action" },
    { id: "a5", label: "Download report", kind: "action" },
    { id: "a6", label: "Invite user", kind: "action" },
  ],
};
const RECENT: CommandItem[] = [{ id: "ord-482", label: "Jordan Lee", detail: "ORD-482", icon: "calendar", kind: "record" }];

function Palette(props: Partial<React.ComponentProps<typeof Command>>) {
  return <Command defaultOpen groups={[ACTIONS]} recent={RECENT} onSelect={vi.fn()} {...props} />;
}

function options() {
  return screen.queryAllByRole("option").map((option) => option.getAttribute("data-key") ?? option.textContent);
}

describe("Command", () => {
  it("an empty query shows recent records and the five most used actions; the field has focus", async () => {
    inLocale(<Palette />);
    expect(screen.getByRole("dialog", { name: "Command" })).toBeTruthy();
    const titles = Array.from(document.querySelectorAll("[data-slot='command-group-title']")).map((title) => title.textContent);
    expect(titles).toEqual(["Recent", "Frequent actions"]);
    expect(screen.getAllByRole("option")).toHaveLength(1 + 5);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("searchbox")));
  });

  it("matching ignores case and accents; records come first with their status", async () => {
    const search = vi.fn(async (query: string) => [
      { id: "products", title: "Products", items: [{ id: "lamp", label: "Desk lamp 8", detail: "SKU-482", icon: "package" as const, kind: "record" as const, status: { label: "In stock", tone: "success" as const } }] },
    ]);
    inLocale(<Palette search={search} groups={[ACTIONS, { id: "people", title: "Customers", items: [{ id: "durovic", label: "Đurović", kind: "page" }] }]} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "durovic" } });
    expect(screen.getByRole("option", { name: /Đurović/ })).toBeTruthy();
    fireEvent.change(input, { target: { value: "lamp" } });
    await waitFor(() => expect(search).toHaveBeenCalledWith("lamp", expect.any(AbortSignal)));
    await waitFor(() => expect(screen.getByRole("option", { name: /Desk lamp 8/ })).toBeTruthy());
    const first = screen.getAllByRole("option")[0]!;
    expect(first.textContent).toContain("Desk lamp 8");
    expect(within(first).getByText("In stock")).toBeTruthy();
  });

  it("an older search that answers late does not overwrite a newer query", async () => {
    let resolveOld!: (groups: CommandGroup[]) => void;
    const search = vi.fn((query: string, signal: AbortSignal) =>
      query === "la" ? new Promise<CommandGroup[]>((resolve) => (resolveOld = resolve)) : Promise.resolve([{ id: "r", title: "Records", items: [{ id: "new-result", label: "New result", kind: "record" as const }] }]).then((groups) => (signal.aborted ? [] : groups)),
    );
    inLocale(<Palette search={search} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "la" } });
    await waitFor(() => expect(search).toHaveBeenCalledWith("la", expect.any(AbortSignal)));
    fireEvent.change(input, { target: { value: "lam" } });
    await waitFor(() => expect(screen.getByRole("option", { name: "New result" })).toBeTruthy());
    await act(async () => resolveOld([{ id: "r", title: "Records", items: [{ id: "old-result", label: "Old result", kind: "record" }] }]));
    expect(screen.queryByRole("option", { name: "Old result" })).toBeNull();
  });

  it("no match says so", () => {
    inLocale(<Palette />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    expect(screen.getByText("No results for “zzz”.")).toBeTruthy();
  });

  it("arrows move through the results from the field, Enter selects and closes", async () => {
    const onSelect = vi.fn();
    inLocale(<Palette onSelect={onSelect} />);
    const input = screen.getByRole("searchbox");
    act(() => input.focus());
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const active = input.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyUp(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("Ctrl K (⌘K on Apple) opens and closes it when bound; the physical key counts on other layouts", async () => {
    inLocale(<Command shortcut groups={[ACTIONS]} onSelect={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog", { name: "Command" })).toBeTruthy();
    // A Cyrillic layout reports "л" for the K key.
    fireEvent.keyDown(document, { key: "л", code: "KeyK", ctrlKey: true });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("leaves Ctrl K alone when an editor already handled it, or during IME composition", () => {
    inLocale(<Command shortcut groups={[ACTIONS]} onSelect={vi.fn()} />);
    const handled = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true });
    handled.preventDefault();
    act(() => {
      document.dispatchEvent(handled);
    });
    fireEvent.keyDown(document, { key: "k", ctrlKey: true, isComposing: true });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("the footer shows the key hints; RTL logical classes", () => {
    inLocale(<Palette />, "ar", "rtl");
    expect(document.querySelector("[data-slot='command-footer']")!.querySelectorAll("[data-slot='kbd']").length).toBeGreaterThanOrEqual(4);
    for (const el of Array.from(document.querySelectorAll("[data-slot^='command']"))) expect(el.getAttribute("class") ?? "").not.toMatch(PHYSICAL);
  });
});

describe("Command and Toast details", () => {
  it("ids that repeat across groups stay separate rows, and each selects its own item", async () => {
    const onSelect = vi.fn();
    const search = vi.fn(async () => [
      { id: "products", title: "Products", items: [{ id: "12", label: "Desk lamp 8", kind: "record" as const }] },
      { id: "orders", title: "Orders", items: [{ id: "12", label: "Jordan Lee", detail: "ORD-12", kind: "record" as const }] },
    ]);
    inLocale(<Palette search={search} onSelect={onSelect} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "a" } });
    await waitFor(() => expect(screen.getByRole("option", { name: /Desk lamp 8/ })).toBeTruthy());
    expect(screen.getByRole("option", { name: /Jordan Lee/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("option", { name: /Desk lamp 8/ }));
    expect(onSelect.mock.calls[0]![0].label).toBe("Desk lamp 8");
  });

  it("the last answer stays while the next loads; a failed search says so, not 'no match'", async () => {
    const search = vi.fn(async (query: string) => {
      if (query === "sku 4") throw new Error("offline");
      return [{ id: "products", title: "Products", items: [{ id: "lamp", label: "Desk lamp 8", kind: "record" as const }] }];
    });
    inLocale(<Palette search={search} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "lamp" } });
    await waitFor(() => expect(screen.getByRole("option", { name: /Desk lamp 8/ })).toBeTruthy());
    fireEvent.change(input, { target: { value: "lamp 8" } });
    expect(screen.getByRole("option", { name: /Desk lamp 8/ })).toBeTruthy();
    fireEvent.change(input, { target: { value: "sku 4" } });
    await waitFor(() => expect(document.querySelector("[data-slot='command-empty']")?.textContent).not.toMatch(/No results for/));
    await waitFor(() => expect(document.querySelector("[data-slot='command-empty']")?.textContent).toBeTruthy());
  });

  it("a group ranks by its highest kind: a mixed group holding a record comes first", () => {
    inLocale(
      <Palette
        groups={[
          { id: "mixed", title: "Mixed", items: [{ id: "p", label: "Lamp page", kind: "page" }, { id: "r", label: "Lamp 8", kind: "record" }] },
          { id: "acts", title: "Actions", items: [{ id: "a", label: "Add lamp", kind: "action" }] },
        ]}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "lamp" } });
    expect(Array.from(document.querySelectorAll("[data-slot='command-group-title']")).map((t) => t.textContent)).toEqual(["Mixed", "Actions"]);
  });

  it("Esc closes at once, even with a query, and focus returns to the opener", async () => {
    function Opener() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Command isOpen={open} onOpenChange={setOpen} groups={[ACTIONS]} onSelect={vi.fn()} />
        </>
      );
    }
    inLocale(<Opener />);
    const opener = screen.getByRole("button", { name: "Open" });
    act(() => opener.focus());
    fireEvent.click(opener);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "lamp" } });
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("one region per page across trees: a standalone Toaster beside the provider adds none", async () => {
    const { Toaster } = await import("./index");
    render(
      <>
        <DesignSystemProvider locale="en" navigate={vi.fn()}><span>a</span></DesignSystemProvider>
        <Toaster />
      </>,
    );
    act(() => {
      toast("Once");
    });
    expect(document.querySelectorAll("[data-slot='toast-region']")).toHaveLength(1);
    expect(screen.getAllByText("Once")).toHaveLength(1);
  });

  it("above popovers; the title is body-strong; the toast is announced (role alert)", () => {
    inLocale(<span>page</span>);
    act(() => {
      toast.success("Order confirmed");
    });
    expect(document.querySelector("[data-slot='toast-region']")!.getAttribute("class")).toContain("z-[100001]");
    expect(document.querySelector("[data-slot='toast-title']")!.getAttribute("class")).toContain("text-body-strong");
    expect(screen.getByRole("alert").textContent).toContain("Order confirmed");
  });

  it("timeout 0 keeps any toast until dismissed", () => {
    vi.useFakeTimers();
    inLocale(<span>page</span>);
    act(() => {
      toast({ title: "Sticky", timeout: 0 });
    });
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText("Sticky")).toBeTruthy();
  });
});

describe("Toaster ownership and IME", () => {
  it("a Toaster inside the provider leaves the provider's region showing toasts", async () => {
    const { Toaster } = await import("./index");
    render(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <span>a</span>
        <Toaster />
      </DesignSystemProvider>,
    );
    act(() => {
      toast("Saved");
    });
    expect(document.querySelectorAll("[data-slot='toast-region']")).toHaveLength(1);
    expect(screen.getAllByText("Saved")).toHaveLength(1);
  });

  it("when the owning tree unmounts, exactly one of the others takes over", async () => {
    const { createRoot } = await import("react-dom/client");
    const hosts = [0, 1, 2].map(() => document.body.appendChild(document.createElement("div")));
    const roots = hosts.map((host) => createRoot(host));
    act(() => {
      for (const root of roots) root.render(<DesignSystemProvider locale="en" navigate={vi.fn()}><span>a</span></DesignSystemProvider>);
    });
    act(() => {
      toast("Single");
    });
    expect(document.querySelectorAll("[data-slot='toast-region']")).toHaveLength(1);
    act(() => roots[0]!.unmount());
    expect(document.querySelectorAll("[data-slot='toast-region']")).toHaveLength(1);
    expect(screen.getAllByText("Single")).toHaveLength(1);
    act(() => {
      roots[1]!.unmount();
      roots[2]!.unmount();
    });
    hosts.forEach((host) => host.remove());
  });

  it("Esc during IME composition leaves the palette open", () => {
    inLocale(<Palette groups={[ACTIONS]} />);
    const input = screen.getByRole("searchbox");
    fireEvent.keyDown(input, { key: "Escape", isComposing: true });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});

describe("toast.promise", () => {
  it("shows a spinner and the loading words, then turns into the result in place, and says it", async () => {
    let resolve!: (value: string) => void;
    inLocale(<p>page</p>);
    let returned: Promise<string> | undefined;
    act(() => {
      returned = toast.promise(new Promise<string>((done) => (resolve = done)), {
        loading: "Saving the order…",
        success: (id) => `Order ${id} saved`,
        error: "The order was not saved",
      });
    });
    const toastElement = await screen.findByText("Saving the order…");
    const root = toastElement.closest('[data-slot="toast"]')!;
    expect(root.hasAttribute("data-pending")).toBe(true);
    expect(root.querySelector('[data-slot="toast-spinner"]')).not.toBeNull();
    await act(async () => resolve("ORD-1"));
    await waitFor(() => expect(screen.getAllByText("Order ORD-1 saved").length).toBeGreaterThan(0));
    const settled = document.querySelector('[data-slot="toast"]')!;
    expect(settled.getAttribute("data-tone")).toBe("success");
    expect(settled.querySelector('[data-slot="toast-spinner"]')).toBeNull();
    expect(settled.querySelector('[role="status"]')!.textContent).toBe("Order ORD-1 saved");
    await expect(returned).resolves.toBe("ORD-1");
  });

  it("an error turns the toast red and keeps it", async () => {
    inLocale(<p>page</p>);
    act(() => {
      void toast.promise(() => Promise.reject(new Error("offline")), { loading: "Sending…", success: "Sent", error: (e) => `Not sent: ${(e as Error).message}` }).catch(() => {});
    });
    await waitFor(() => expect(screen.getAllByText("Not sent: offline").length).toBeGreaterThan(0));
    expect(document.querySelector('[data-slot="toast"]')!.getAttribute("data-tone")).toBe("danger");
  });
});
