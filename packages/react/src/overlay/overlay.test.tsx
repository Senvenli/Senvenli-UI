import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { TextField } from "../form/index";
import { DesignSystemProvider } from "../provider";
import { Select } from "../selection/index";
import { DialogTrigger as AriaDialogTrigger } from "react-aria-components";
import { AlertDialog, Dialog, DialogTrigger, Drawer, useDrawerClose } from "./index";

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;

// jsdom has no CSS.escape; React Aria's collections use it.
if (!globalThis.CSS?.escape) {
  (globalThis as { CSS?: { escape?: (value: string) => string } }).CSS = {
    ...(globalThis.CSS ?? {}),
    escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`),
  };
}

// Warnings are collected, not hidden: React Aria's own ("controlled by a trigger", a missing label) fail a test.
let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  const ariaWarnings = warn.mock.calls.map(([message]: unknown[]) => String(message)).filter((message: string) => /modal|dialog|aria-label|accessible|trigger/i.test(message));
  warn.mockRestore();
  expect(ariaWarnings).toEqual([]);
});

function inLocale(ui: React.ReactElement, locale = "tr-TR", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

function press(key: string, target: Element = document.activeElement ?? document.body) {
  fireEvent.keyDown(target, { key });
  fireEvent.keyUp(target, { key });
}

function CancelDialog({ onCancel = vi.fn(), isDismissable }: { onCancel?: () => void; isDismissable?: boolean }) {
  return (
    <DialogTrigger>
      <Button>İptal et</Button>
      <Dialog
        title="Rezervasyonu iptal et"
        isDismissable={isDismissable}
        primaryAction={{ label: "Rezervasyonu iptal et", variant: "danger", onPress: onCancel }}
      >
        Müşteriye iptal e-postası gönderilir.
        <TextField label="İade tutarı" defaultValue="248,00" />
      </Dialog>
    </DialogTrigger>
  );
}

describe("Dialog (RENENG-3374)", () => {
  it("opens from its trigger, is named by its title, and React Aria has nothing to warn about", () => {
    inLocale(<CancelDialog />);
    fireEvent.click(screen.getByRole("button", { name: "İptal et" }));
    const dialog = screen.getByRole("dialog", { name: "Rezervasyonu iptal et" });
    expect(dialog).toBeTruthy();
    expect(warn.mock.calls.filter(([message]: unknown[]) => /aria-label|aria-labelledby|accessible/i.test(String(message)))).toEqual([]);
  });

  it("a destructive dialog focuses Vazgeç; another focuses its first field", async () => {
    const { unmount } = inLocale(<CancelDialog />);
    fireEvent.click(screen.getByRole("button", { name: "İptal et" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Vazgeç" })));
    unmount();
    inLocale(
      <Dialog defaultOpen title="Not ekle" primaryAction={{ label: "Notu kaydet" }}>
        <TextField label="Not" />
      </Dialog>,
    );
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Not" })));
  });

  it("Esc closes it and focus returns to the trigger", async () => {
    inLocale(<CancelDialog />);
    const trigger = screen.getByRole("button", { name: "İptal et" });
    act(() => trigger.focus());
    fireEvent.click(trigger);
    press("Escape", screen.getByRole("dialog"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("isDismissable={false}: Esc does not close it", () => {
    inLocale(<CancelDialog isDismissable={false} />);
    fireEvent.click(screen.getByRole("button", { name: "İptal et" }));
    press("Escape", screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("Vazgeç closes; the primary action runs its handler", async () => {
    const onCancel = vi.fn();
    inLocale(<CancelDialog onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "İptal et" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Rezervasyonu iptal et" }));
    expect(onCancel).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("focus stays inside: Tab from the last control wraps to the first (the close button)", () => {
    inLocale(<CancelDialog />);
    fireEvent.click(screen.getByRole("button", { name: "İptal et" }));
    const dialog = screen.getByRole("dialog");
    const primary = within(dialog).getByRole("button", { name: "Rezervasyonu iptal et" });
    act(() => primary.focus());
    press("Tab", primary);
    expect(document.activeElement).toBe(dialog.querySelector("[data-slot='dialog-close']"));
  });

  it("one size dictionary; a default max height with the body scrolling inside", () => {
    inLocale(<Dialog defaultOpen size="large" title="Uzun içerik">x</Dialog>);
    const modal = document.querySelector("[data-slot='dialog-modal']")!;
    expect(modal.className).toContain("max-w-200");
    expect(modal.className).toContain("max-h-[calc(100dvh-2*var(--ds-space-300))]");
    expect(document.querySelector("[data-slot='dialog-body']")!.className).toContain("overflow-y-auto");
  });

  it("motion: ds-duration-slow, still for reduced motion", () => {
    inLocale(<Dialog defaultOpen title="Hareket">x</Dialog>);
    for (const slot of ["dialog-overlay", "dialog-modal"]) {
      const className = document.querySelector(`[data-slot='${slot}']`)!.className;
      expect(className).toContain("duration-(--ds-duration-slow)");
      expect(className).toContain("ease-ds-enter");
      expect(className).toContain("data-[exiting]:ease-ds-exit");
      expect(className).toContain("motion-reduce:transition-none");
    }
  });

  it("a Select inside opens its list above the dialog", () => {
    inLocale(
      <Dialog defaultOpen title="Şube seç" primaryAction={{ label: "Şubeyi seç" }}>
        <Select label="Şube" items={[{ id: "pg", label: "Podgorica" }, { id: "tv", label: "Tivat" }]} />
      </Dialog>,
    );
    fireEvent.click(document.querySelector("[data-slot='select-trigger']")!);
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByRole("option", { name: "Tivat" })).toBeTruthy();
  });
});

describe("AlertDialog (RENENG-3374)", () => {
  function DeleteVehicle({ onConfirm = vi.fn(), typed }: { onConfirm?: () => void | Promise<void>; typed?: string }) {
    return (
      <DialogTrigger>
        <Button>Sil</Button>
        <AlertDialog
          title="PG AB 482 filodan silinsin mi?"
          confirmLabel="Aracı sil"
          onConfirm={onConfirm}
          requireTypedConfirmation={typed}
        >
          Silinen araç geri getirilemez.
        </AlertDialog>
      </DialogTrigger>
    );
  }

  it("role alertdialog, named by the question and described by the consequence; Vazgeç has focus", async () => {
    inLocale(<DeleteVehicle />);
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    const dialog = screen.getByRole("alertdialog", { name: "PG AB 482 filodan silinsin mi?" });
    const describedBy = dialog.getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy)?.textContent).toBe("Silinen araç geri getirilemez.");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Vazgeç" })));
  });

  it("Esc cancels; a scrim click does not", async () => {
    inLocale(<DeleteVehicle />);
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    const overlay = document.querySelector("[data-slot='dialog-overlay']")!;
    fireEvent.pointerDown(overlay);
    fireEvent.pointerUp(overlay);
    fireEvent.click(overlay);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    press("Escape", screen.getByRole("alertdialog"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("typed confirmation enables the action only once the text matches", () => {
    inLocale(<DeleteVehicle typed="PG AB 482" />);
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    const confirm = screen.getByRole("button", { name: "Aracı sil" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    const field = screen.getByRole("textbox", { name: "Onaylamak için PG AB 482 yazın" });
    fireEvent.change(field, { target: { value: "PG AB 48" } });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(field, { target: { value: "PG AB 482" } });
    expect(confirm.disabled).toBe(false);
  });

  it("an async confirm shows pending, then closes; a failure keeps it open", async () => {
    let resolve!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    inLocale(<DeleteVehicle onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    fireEvent.click(screen.getByRole("button", { name: "Aracı sil" }));
    await waitFor(() => expect(document.querySelector("[data-slot='alert-dialog-confirm']")!.hasAttribute("data-pending")).toBe(true));
    await act(async () => resolve());
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    cleanup();
    const failing = vi.fn(() => Promise.reject(new Error("409")));
    inLocale(<DeleteVehicle onConfirm={failing} />);
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Aracı sil" }));
    });
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });
});

describe("Drawer (RENENG-3374)", () => {
  function Record({ unsaved, placement }: { unsaved?: boolean; placement?: "end" | "bottom" }) {
    return (
      <DialogTrigger>
        <Button>Aç</Button>
        <Drawer
          title="RS-0914"
          subtitle="Ana Petrović · 14–18 Eki"
          placement={placement}
          hasUnsavedChanges={unsaved}
          footer={<Button variant="primary">Kaydet</Button>}
        >
          VW Golf 8
        </Drawer>
      </DialogTrigger>
    );
  }

  it("on the inline end, named by its title; the footer keeps clear of the home indicator", () => {
    inLocale(<Record />);
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    expect(screen.getByRole("dialog", { name: "RS-0914" })).toBeTruthy();
    const drawer = document.querySelector("[data-slot='drawer']")!;
    expect(drawer.className).toContain("end-0");
    expect(drawer.className).toContain("w-95");
    expect(document.querySelector("[data-slot='drawer-footer']")!.className).toContain("safe-area-inset-bottom");
  });

  it("bottom sheet: a grip snaps it between half and full height", () => {
    inLocale(<Record placement="bottom" />);
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    const drawer = document.querySelector("[data-slot='drawer']")!;
    expect(drawer.className).toContain("h-[50dvh]");
    const grip = screen.getByRole("button", { name: "Paneli büyüt" });
    expect(grip.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(grip);
    expect(screen.getByRole("button", { name: "Paneli küçült" }).getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector("[data-slot='drawer']")!.className).toContain("100dvh");
  });

  it("on a phone the side drawer becomes the bottom sheet", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("max-width: 639px"), media: query, addEventListener: () => {}, removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      inLocale(<Record />);
      fireEvent.click(screen.getByRole("button", { name: "Aç" }));
      expect(document.querySelector("[data-slot='drawer-overlay']")!.getAttribute("data-placement")).toBe("bottom");
    } finally {
      window.matchMedia = original;
    }
  });

  it("unsaved edits: closing asks first; Düzenlemeye dön stays, Kaydetmeden kapat closes", async () => {
    inLocale(<Record unsaved />);
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Kapat" }));
    expect(screen.getByRole("alertdialog", { name: "Değişiklikler kaydedilmedi" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Düzenlemeye dön" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
    press("Escape", screen.getByRole("dialog"));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kaydetmeden kapat" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("RTL: slides from the inline end; no physical classes", () => {
    inLocale(<Record />, "ar", "rtl");
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    const drawer = document.querySelector("[data-slot='drawer']")!;
    expect(drawer.className).toContain("rtl:data-[entering]:-translate-x-full");
    for (const el of Array.from(document.querySelectorAll("[data-slot^='drawer'], [data-slot^='dialog'] [class]"))) {
      expect(el.getAttribute("class") ?? "").not.toMatch(PHYSICAL);
    }
  });
});

describe("review of 030c645 (RENENG-3374)", () => {
  it("1. opened with isOpen, every close reports onOpenChange(false) once", async () => {
    const cases: [string, (onOpenChange: (open: boolean) => void) => React.ReactElement, () => void][] = [
      ["dialog close", (o) => <Dialog isOpen onOpenChange={o} title="T">x</Dialog>, () => fireEvent.click(document.querySelector("[data-slot='dialog-close']")!)],
      ["dialog Vazgeç", (o) => <Dialog isOpen onOpenChange={o} title="T">x</Dialog>, () => fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }))],
      ["dialog Esc", (o) => <Dialog isOpen onOpenChange={o} title="T">x</Dialog>, () => press("Escape", screen.getByRole("dialog"))],
      ["drawer close", (o) => <Drawer isOpen onOpenChange={o} title="T">x</Drawer>, () => fireEvent.click(document.querySelector("[data-slot='drawer-close']")!)],
    ];
    for (const [, ui, act_] of cases) {
      const onOpenChange = vi.fn();
      inLocale(ui(onOpenChange));
      act_();
      expect(onOpenChange.mock.calls).toEqual([[false]]);
      cleanup();
    }
    const onOpenChange = vi.fn();
    inLocale(<AlertDialog isOpen onOpenChange={onOpenChange} title="Sil?" confirmLabel="Sil" onConfirm={() => Promise.resolve()}>x</AlertDialog>);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    });
    expect(onOpenChange.mock.calls).toEqual([[false]]);
  });

  function Unsaved({ inner }: { inner?: React.ReactNode }) {
    return (
      <Drawer defaultOpen title="RS-0914" hasUnsavedChanges footer={<Button>Kaydet</Button>}>
        <TextField label="Not" defaultValue="a" />
        {inner}
      </Drawer>
    );
  }

  it("2. the unsaved prompt is a real modal: focus stays in it, the drawer is out of reach, Esc keeps editing", async () => {
    inLocale(<Unsaved />);
    fireEvent.click(document.querySelector("[data-slot='drawer-close']")!);
    const prompt = screen.getByRole("alertdialog", { name: "Değişiklikler kaydedilmedi" });
    const keep = within(prompt).getByRole("button", { name: "Düzenlemeye dön" });
    const discard = within(prompt).getByRole("button", { name: "Kaydetmeden kapat" });
    act(() => discard.focus());
    press("Tab", discard);
    expect(prompt.contains(document.activeElement)).toBe(true);
    act(() => keep.focus());
    fireEvent.keyDown(keep, { key: "Tab", shiftKey: true });
    expect(prompt.contains(document.activeElement)).toBe(true);
    // The drawer behind is hidden from assistive tech while the prompt is up.
    expect(screen.queryByRole("textbox", { name: "Not" })).toBeNull();
    press("Escape", prompt);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByRole("dialog", { name: "RS-0914" })).toBeTruthy();
  });

  it("3. Esc inside a nested non-dismissable dialog does not open the drawer's prompt", () => {
    inLocale(
      <Unsaved
        inner={
          <DialogTrigger>
            <Button>İç aç</Button>
            <Dialog isDismissable={false} title="İç">iç</Dialog>
          </DialogTrigger>
        }
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "İç aç" }));
    press("Escape", screen.getByRole("dialog", { name: "İç" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("dialog", { name: "İç" })).toBeTruthy();
  });

  it("a dialog nested in a drawer has its own open state: closing it leaves the drawer open", async () => {
    inLocale(
      <Drawer defaultOpen title="RS-0914">
        <DialogTrigger>
          <Button>İç aç</Button>
          <Dialog title="İç">iç</Dialog>
        </DialogTrigger>
      </Drawer>,
    );
    fireEvent.click(screen.getByRole("button", { name: "İç aç" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "İç" })).getByRole("button", { name: "Vazgeç" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "İç" })).toBeNull());
    expect(screen.getByRole("dialog", { name: "RS-0914" })).toBeTruthy();
  });

  it("4. a scrim click with unsaved edits asks first", () => {
    inLocale(<Unsaved />);
    const overlay = document.querySelector("[data-slot='drawer-overlay']")!;
    fireEvent.pointerDown(overlay, { button: 0, pointerType: "mouse" });
    fireEvent.pointerUp(overlay, { button: 0, pointerType: "mouse" });
    fireEvent.click(overlay);
    expect(screen.getByRole("alertdialog", { name: "Değişiklikler kaydedilmedi" })).toBeTruthy();
  });

  it("5. while the alert's action runs, Vazgeç is disabled and Esc does not close it", async () => {
    let resolve!: () => void;
    inLocale(
      <AlertDialog defaultOpen title="Sil?" confirmLabel="Sil" onConfirm={() => new Promise<void>((r) => (resolve = r))}>x</AlertDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Vazgeç" }) as HTMLButtonElement).disabled).toBe(true));
    press("Escape", screen.getByRole("alertdialog"));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    await act(async () => resolve());
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("6. safe areas: a footerless body clears the home indicator; the side drawer clears a landscape notch", () => {
    inLocale(<Drawer defaultOpen title="T">x</Drawer>);
    expect(document.querySelector("[data-slot='drawer-body']")!.className).toContain("safe-area-inset-bottom");
    const drawer = document.querySelector("[data-slot='drawer']")!.className;
    expect(drawer).toContain("pe-[env(safe-area-inset-right,0px)]");
    expect(drawer).toContain("rtl:pe-[env(safe-area-inset-left,0px)]");
  });

  it("7. the grip: swipe up expands, swipe down from half asks to close", () => {
    inLocale(<Drawer defaultOpen placement="bottom" title="Filtreler" hasUnsavedChanges>x</Drawer>);
    const grip = document.querySelector("[data-slot='drawer-grip']")!;
    fireEvent.pointerDown(grip, { clientY: 400 });
    fireEvent.pointerUp(grip, { clientY: 330 });
    fireEvent.click(grip);
    expect(grip.getAttribute("aria-expanded")).toBe("true");
    fireEvent.pointerDown(grip, { clientY: 300 });
    fireEvent.pointerUp(grip, { clientY: 380 });
    fireEvent.click(grip);
    expect(grip.getAttribute("aria-expanded")).toBe("false");
    fireEvent.pointerDown(grip, { clientY: 300 });
    fireEvent.pointerUp(grip, { clientY: 380 });
    fireEvent.click(grip);
    expect(screen.getByRole("alertdialog", { name: "Değişiklikler kaydedilmedi" })).toBeTruthy();
  });
});

describe("re-review of 4d8865e (RENENG-3374)", () => {
  function SaveAndClose() {
    const close = useDrawerClose();
    return <Button onPress={() => close({ force: true })}>Kaydet ve kapat</Button>;
  }
  function Editor() {
    const [note, setNote] = React.useState("a");
    const [saved, setSaved] = React.useState("a");
    return (
      <Drawer defaultOpen title="RS-0914" hasUnsavedChanges={note !== saved} footer={<span onClick={() => setSaved(note)}><SaveAndClose /></span>}>
        <TextField label="Not" value={note} onChange={setNote} />
      </Drawer>
    );
  }

  it("1. save and close: close({ force: true }) closes without asking", async () => {
    inLocale(<Editor />);
    fireEvent.change(screen.getByRole("textbox", { name: "Not" }), { target: { value: "ab" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet ve kapat" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "RS-0914" })).toBeNull());
  });

  it("1. without force, the same button still asks while edits are unsaved", () => {
    function Ask() {
      const close = useDrawerClose();
      return <Button onPress={() => close()}>Kapat ve sor</Button>;
    }
    inLocale(<Drawer defaultOpen title="RS-0914" hasUnsavedChanges footer={<Ask />}>x</Drawer>);
    fireEvent.click(screen.getByRole("button", { name: "Kapat ve sor" }));
    expect(screen.getByRole("alertdialog", { name: "Değişiklikler kaydedilmedi" })).toBeTruthy();
  });

  it("2. a ds Dialog inside React Aria's own DialogTrigger opens and closes", async () => {
    inLocale(
      <AriaDialogTrigger>
        <Button>Aç</Button>
        <Dialog title="RA tetikleyici">x</Dialog>
      </AriaDialogTrigger>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    expect(screen.getByRole("dialog", { name: "RA tetikleyici" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("3. the grip keeps the pointer while it drags", () => {
    inLocale(<Drawer defaultOpen placement="bottom" title="Filtreler">x</Drawer>);
    const grip = document.querySelector("[data-slot='drawer-grip']") as HTMLElement;
    const capture = vi.fn();
    grip.setPointerCapture = capture;
    fireEvent.pointerDown(grip, { clientY: 400, pointerId: 7 });
    expect(capture).toHaveBeenCalledWith(7);
  });

  it("4. a sheet reopens at half height", async () => {
    inLocale(
      <DialogTrigger>
        <Button>Aç</Button>
        <Drawer placement="bottom" title="Filtreler">x</Drawer>
      </DialogTrigger>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    fireEvent.click(screen.getByRole("button", { name: "Paneli büyüt" }));
    fireEvent.click(document.querySelector("[data-slot='drawer-close']")!);
    // Closing keeps the full height while it slides out.
    expect(document.querySelector("[data-slot='drawer']")?.className ?? "100dvh").toContain("100dvh");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    expect(screen.getByRole("button", { name: "Paneli büyüt" }).getAttribute("aria-expanded")).toBe("false");
  });
});
