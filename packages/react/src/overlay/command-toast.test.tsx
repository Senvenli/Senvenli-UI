import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { CommandPalette, toast, type CommandGroup, type CommandItem } from "./index";
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

function inLocale(ui: React.ReactElement, locale = "tr-TR", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

describe("Toast (RENENG-3376)", () => {
  it("toast() works under the provider with no Toaster of the app's own; title, detail, tone icon", () => {
    inLocale(<span>page</span>);
    act(() => {
      toast.success("Rezervasyon onaylandı", { description: "RS-2026-10-0914 · müşteriye e-posta gönderildi" });
    });
    const item = document.querySelector("[data-slot='toast']")!;
    expect(item.getAttribute("data-tone")).toBe("success");
    expect(within(item as HTMLElement).getByText("Rezervasyon onaylandı")).toBeTruthy();
    expect(item.querySelector("[data-slot='toast-icon']")!.getAttribute("class")).toContain("text-ds-icon-success");
    // A landmark region screen readers reach (F6) and that announces new toasts.
    expect(screen.getByRole("region")).toBeTruthy();
  });

  it("one region even with nested providers", () => {
    inLocale(
      <DesignSystemProvider locale="tr-TR" navigate={vi.fn()}>
        <span>inner</span>
      </DesignSystemProvider>,
    );
    act(() => {
      toast("Kaydedildi");
    });
    expect(document.querySelectorAll("[data-slot='toast-region']")).toHaveLength(1);
  });

  it("closes after 6s by default; a danger toast stays until dismissed", () => {
    vi.useFakeTimers();
    inLocale(<span>page</span>);
    act(() => {
      toast("Kaydedildi");
      toast.danger("Fotoğraf yüklenemedi", { description: "Dosya 10 MB sınırını aşıyor." });
    });
    expect(document.querySelectorAll("[data-slot='toast']")).toHaveLength(2);
    act(() => vi.advanceTimersByTime(6100));
    const left = Array.from(document.querySelectorAll("[data-slot='toast']"));
    expect(left).toHaveLength(1);
    expect(left[0]!.getAttribute("data-tone")).toBe("danger");
    act(() => vi.advanceTimersByTime(60_000));
    expect(document.querySelectorAll("[data-slot='toast']")).toHaveLength(1);
    fireEvent.click(within(left[0] as HTMLElement).getByRole("button", { name: "Kapat" }));
    expect(document.querySelectorAll("[data-slot='toast']")).toHaveLength(0);
  });

  it("pauses while hovered", () => {
    vi.useFakeTimers();
    inLocale(<span>page</span>);
    act(() => {
      toast("Kaydedildi");
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

  it("one link action (Geri al): it runs and the toast closes", () => {
    const undo = vi.fn();
    inLocale(<span>page</span>);
    act(() => {
      toast.information("Araç silindi", { action: { label: "Geri al", onPress: undo } });
    });
    fireEvent.click(screen.getByRole("button", { name: "Geri al" }));
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
  title: "İşlemler",
  items: [
    { id: "new", label: "Yeni rezervasyon oluştur", icon: "plus", shortcut: "N", kind: "action" },
    { id: "prices", label: "Fiyat tarifesine git", icon: "settings", kind: "action" },
    { id: "a3", label: "Araç ekle", kind: "action" },
    { id: "a4", label: "Şube ekle", kind: "action" },
    { id: "a5", label: "Rapor indir", kind: "action" },
    { id: "a6", label: "Kullanıcı davet et", kind: "action" },
  ],
};
const RECENT: CommandItem[] = [{ id: "rs-914", label: "Ana Petrović", detail: "RS-0914", icon: "calendar", kind: "record" }];

function Palette(props: Partial<React.ComponentProps<typeof CommandPalette>>) {
  return <CommandPalette defaultOpen groups={[ACTIONS]} recent={RECENT} onSelect={vi.fn()} {...props} />;
}

function options() {
  return screen.queryAllByRole("option").map((option) => option.getAttribute("data-key") ?? option.textContent);
}

describe("CommandPalette (RENENG-3376)", () => {
  it("an empty query shows recent records and the five most used actions; the field has focus", async () => {
    inLocale(<Palette />);
    expect(screen.getByRole("dialog", { name: "Komut paleti" })).toBeTruthy();
    const titles = Array.from(document.querySelectorAll("[data-slot='command-palette-group-title']")).map((title) => title.textContent);
    expect(titles).toEqual(["Son kayıtlar", "Sık kullanılan işlemler"]);
    expect(screen.getAllByRole("option")).toHaveLength(1 + 5);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("searchbox")));
  });

  it("matching ignores case and accents; records come first with their status", async () => {
    const search = vi.fn(async (query: string) => [
      { id: "cars", title: "Araçlar", items: [{ id: "golf", label: "VW Golf 8", detail: "PG AB 482", icon: "car" as const, kind: "record" as const, status: { label: "Müsait", tone: "success" as const } }] },
    ]);
    inLocale(<Palette search={search} groups={[ACTIONS, { id: "people", title: "Müşteriler", items: [{ id: "durovic", label: "Đurović", kind: "page" }] }]} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "durovic" } });
    expect(screen.getByRole("option", { name: /Đurović/ })).toBeTruthy();
    fireEvent.change(input, { target: { value: "golf" } });
    await waitFor(() => expect(search).toHaveBeenCalledWith("golf", expect.any(AbortSignal)));
    await waitFor(() => expect(screen.getByRole("option", { name: /VW Golf 8/ })).toBeTruthy());
    const first = screen.getAllByRole("option")[0]!;
    expect(first.textContent).toContain("VW Golf 8");
    expect(within(first).getByText("Müsait")).toBeTruthy();
  });

  it("an older search that answers late does not overwrite a newer query", async () => {
    let resolveOld!: (groups: CommandGroup[]) => void;
    const search = vi.fn((query: string, signal: AbortSignal) =>
      query === "go" ? new Promise<CommandGroup[]>((resolve) => (resolveOld = resolve)) : Promise.resolve([{ id: "r", title: "Kayıtlar", items: [{ id: "new-result", label: "Yeni sonuç", kind: "record" as const }] }]).then((groups) => (signal.aborted ? [] : groups)),
    );
    inLocale(<Palette search={search} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "go" } });
    await waitFor(() => expect(search).toHaveBeenCalledWith("go", expect.any(AbortSignal)));
    fireEvent.change(input, { target: { value: "gol" } });
    await waitFor(() => expect(screen.getByRole("option", { name: "Yeni sonuç" })).toBeTruthy());
    await act(async () => resolveOld([{ id: "r", title: "Kayıtlar", items: [{ id: "old-result", label: "Eski sonuç", kind: "record" }] }]));
    expect(screen.queryByRole("option", { name: "Eski sonuç" })).toBeNull();
  });

  it("no match says so", () => {
    inLocale(<Palette />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    expect(screen.getByText("“zzz” ile eşleşen sonuç yok.")).toBeTruthy();
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
    inLocale(<CommandPalette shortcut groups={[ACTIONS]} onSelect={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog", { name: "Komut paleti" })).toBeTruthy();
    // A Cyrillic layout reports "л" for the K key.
    fireEvent.keyDown(document, { key: "л", code: "KeyK", ctrlKey: true });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("leaves Ctrl K alone when an editor already handled it, or during IME composition", () => {
    inLocale(<CommandPalette shortcut groups={[ACTIONS]} onSelect={vi.fn()} />);
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
    expect(document.querySelector("[data-slot='command-palette-footer']")!.querySelectorAll("[data-slot='kbd']").length).toBeGreaterThanOrEqual(4);
    for (const el of Array.from(document.querySelectorAll("[data-slot^='command']"))) expect(el.getAttribute("class") ?? "").not.toMatch(PHYSICAL);
  });
});

describe("review of a27c20a (RENENG-3376)", () => {
  it("1. ids that repeat across groups stay separate rows, and each selects its own item", async () => {
    const onSelect = vi.fn();
    const search = vi.fn(async () => [
      { id: "cars", title: "Araçlar", items: [{ id: "12", label: "VW Golf 8", kind: "record" as const }] },
      { id: "bookings", title: "Rezervasyonlar", items: [{ id: "12", label: "Ana Petrović", detail: "RS-12", kind: "record" as const }] },
    ]);
    inLocale(<Palette search={search} onSelect={onSelect} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "a" } });
    await waitFor(() => expect(screen.getByRole("option", { name: /VW Golf 8/ })).toBeTruthy());
    expect(screen.getByRole("option", { name: /Ana Petrović/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("option", { name: /VW Golf 8/ }));
    expect(onSelect.mock.calls[0]![0].label).toBe("VW Golf 8");
  });

  it("4. the last answer stays while the next loads; a failed search says so, not 'no match'", async () => {
    const search = vi.fn(async (query: string) => {
      if (query === "pg ab") throw new Error("offline");
      return [{ id: "cars", title: "Araçlar", items: [{ id: "golf", label: "VW Golf 8", kind: "record" as const }] }];
    });
    inLocale(<Palette search={search} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "golf" } });
    await waitFor(() => expect(screen.getByRole("option", { name: /VW Golf 8/ })).toBeTruthy());
    fireEvent.change(input, { target: { value: "golf 8" } });
    expect(screen.getByRole("option", { name: /VW Golf 8/ })).toBeTruthy();
    fireEvent.change(input, { target: { value: "pg ab" } });
    await waitFor(() => expect(document.querySelector("[data-slot='command-palette-empty']")?.textContent).not.toMatch(/eşleşen sonuç yok/));
    await waitFor(() => expect(document.querySelector("[data-slot='command-palette-empty']")?.textContent).toBeTruthy());
  });

  it("5. a group ranks by its highest kind: a mixed group holding a record comes first", () => {
    inLocale(
      <Palette
        groups={[
          { id: "mixed", title: "Karışık", items: [{ id: "p", label: "Golf sayfası", kind: "page" }, { id: "r", label: "Golf 8", kind: "record" }] },
          { id: "acts", title: "İşlemler", items: [{ id: "a", label: "Golf ekle", kind: "action" }] },
        ]}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "golf" } });
    expect(Array.from(document.querySelectorAll("[data-slot='command-palette-group-title']")).map((t) => t.textContent)).toEqual(["Karışık", "İşlemler"]);
  });

  it("6. Esc closes at once, even with a query, and focus returns to the opener", async () => {
    function Opener() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Aç</button>
          <CommandPalette isOpen={open} onOpenChange={setOpen} groups={[ACTIONS]} onSelect={vi.fn()} />
        </>
      );
    }
    inLocale(<Opener />);
    const opener = screen.getByRole("button", { name: "Aç" });
    act(() => opener.focus());
    fireEvent.click(opener);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "golf" } });
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("7. one region per page across trees: a standalone Toaster beside the provider adds none", async () => {
    const { Toaster } = await import("./index");
    render(
      <>
        <DesignSystemProvider locale="tr-TR" navigate={vi.fn()}><span>a</span></DesignSystemProvider>
        <Toaster />
      </>,
    );
    act(() => {
      toast("Bir kez");
    });
    expect(document.querySelectorAll("[data-slot='toast-region']")).toHaveLength(1);
    expect(screen.getAllByText("Bir kez")).toHaveLength(1);
  });

  it("8–10. above popovers; the title is body-strong; the toast is announced (role alert)", () => {
    inLocale(<span>page</span>);
    act(() => {
      toast.success("Rezervasyon onaylandı");
    });
    expect(document.querySelector("[data-slot='toast-region']")!.getAttribute("class")).toContain("z-[100001]");
    expect(document.querySelector("[data-slot='toast-title']")!.getAttribute("class")).toContain("text-body-strong");
    expect(screen.getByRole("alert").textContent).toContain("Rezervasyon onaylandı");
  });

  it("11. timeout 0 keeps any toast until dismissed", () => {
    vi.useFakeTimers();
    inLocale(<span>page</span>);
    act(() => {
      toast({ title: "Kalıcı", timeout: 0 });
    });
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText("Kalıcı")).toBeTruthy();
  });
});

describe("review of 53095c7 (RENENG-3376)", () => {
  it("1. a Toaster inside the provider leaves the provider's region showing toasts", async () => {
    const { Toaster } = await import("./index");
    render(
      <DesignSystemProvider locale="tr-TR" navigate={vi.fn()}>
        <span>a</span>
        <Toaster />
      </DesignSystemProvider>,
    );
    act(() => {
      toast("Kaydedildi");
    });
    expect(document.querySelectorAll("[data-slot='toast-region']")).toHaveLength(1);
    expect(screen.getAllByText("Kaydedildi")).toHaveLength(1);
  });

  it("2. when the owning tree unmounts, exactly one of the others takes over", async () => {
    const { createRoot } = await import("react-dom/client");
    const hosts = [0, 1, 2].map(() => document.body.appendChild(document.createElement("div")));
    const roots = hosts.map((host) => createRoot(host));
    act(() => {
      for (const root of roots) root.render(<DesignSystemProvider locale="tr-TR" navigate={vi.fn()}><span>a</span></DesignSystemProvider>);
    });
    act(() => {
      toast("Tek");
    });
    expect(document.querySelectorAll("[data-slot='toast-region']")).toHaveLength(1);
    act(() => roots[0]!.unmount());
    expect(document.querySelectorAll("[data-slot='toast-region']")).toHaveLength(1);
    expect(screen.getAllByText("Tek")).toHaveLength(1);
    act(() => {
      roots[1]!.unmount();
      roots[2]!.unmount();
    });
    hosts.forEach((host) => host.remove());
  });

  it("3. Esc during IME composition leaves the palette open", () => {
    inLocale(<Palette groups={[ACTIONS]} />);
    const input = screen.getByRole("searchbox");
    fireEvent.keyDown(input, { key: "Escape", isComposing: true });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
