import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { TextField } from "../form/text-field";
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

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
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

function ArchiveDialog({ onArchive = vi.fn(), isDismissable }: { onArchive?: () => void; isDismissable?: boolean }) {
  return (
    <DialogTrigger>
      <Button>Archive</Button>
      <Dialog
        title="Archive order"
        isDismissable={isDismissable}
        primaryAction={{ label: "Archive order", variant: "danger", onPress: onArchive }}
      >
        The customer gets an email about it.
        <TextField label="Refund amount" defaultValue="248.00" />
      </Dialog>
    </DialogTrigger>
  );
}

describe("Dialog", () => {
  it("opens from its trigger, is named by its title, and React Aria has nothing to warn about", () => {
    inLocale(<ArchiveDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = screen.getByRole("dialog", { name: "Archive order" });
    expect(dialog).toBeTruthy();
    expect(warn.mock.calls.filter(([message]: unknown[]) => /aria-label|aria-labelledby|accessible/i.test(String(message)))).toEqual([]);
  });

  it("a destructive dialog focuses Cancel; another focuses its first field", async () => {
    const { unmount } = inLocale(<ArchiveDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" })));
    unmount();
    inLocale(
      <Dialog defaultOpen title="Add note" primaryAction={{ label: "Save note" }}>
        <TextField label="Note" />
      </Dialog>,
    );
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Note" })));
  });

  it("Esc closes it and focus returns to the trigger", async () => {
    inLocale(<ArchiveDialog />);
    const trigger = screen.getByRole("button", { name: "Archive" });
    act(() => trigger.focus());
    fireEvent.click(trigger);
    press("Escape", screen.getByRole("dialog"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("isDismissable={false}: Esc does not close it", () => {
    inLocale(<ArchiveDialog isDismissable={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    press("Escape", screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("Cancel closes; the primary action runs its handler", async () => {
    const onArchive = vi.fn();
    inLocale(<ArchiveDialog onArchive={onArchive} />);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Archive order" }));
    expect(onArchive).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("focus stays inside: Tab from the last control wraps to the first (the close button)", () => {
    inLocale(<ArchiveDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = screen.getByRole("dialog");
    const primary = within(dialog).getByRole("button", { name: "Archive order" });
    act(() => primary.focus());
    press("Tab", primary);
    expect(document.activeElement).toBe(dialog.querySelector("[data-slot='dialog-close']"));
  });

  it("one size dictionary; a default max height with the body scrolling inside", () => {
    inLocale(<Dialog defaultOpen size="large" title="Long content">x</Dialog>);
    const modal = document.querySelector("[data-slot='dialog-modal']")!;
    expect(modal.className).toContain("max-w-200");
    expect(modal.className).toContain("max-h-[calc(100dvh-2*var(--ds-space-300))]");
    expect(document.querySelector("[data-slot='dialog-body']")!.className).toContain("overflow-y-auto");
  });

  it("motion: ds-duration-slow, still for reduced motion", () => {
    inLocale(<Dialog defaultOpen title="Motion">x</Dialog>);
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
      <Dialog defaultOpen title="Choose team" primaryAction={{ label: "Choose this team" }}>
        <Select label="Team" items={[{ id: "des", label: "Design team" }, { id: "sup", label: "Support team" }]} />
      </Dialog>,
    );
    fireEvent.click(document.querySelector("[data-slot='select-trigger']")!);
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByRole("option", { name: "Support team" })).toBeTruthy();
  });
});

describe("AlertDialog", () => {
  function DeleteProject({ onConfirm = vi.fn(), typed }: { onConfirm?: () => void | Promise<void>; typed?: string }) {
    return (
      <DialogTrigger>
        <Button>Delete</Button>
        <AlertDialog
          title="Delete project ORD-482?"
          confirmLabel="Delete project"
          onConfirm={onConfirm}
          requireTypedConfirmation={typed}
        >
          A deleted project cannot be restored.
        </AlertDialog>
      </DialogTrigger>
    );
  }

  it("role alertdialog, named by the question and described by the consequence; Cancel has focus", async () => {
    inLocale(<DeleteProject />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("alertdialog", { name: "Delete project ORD-482?" });
    const describedBy = dialog.getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy)?.textContent).toBe("A deleted project cannot be restored.");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" })));
  });

  it("Esc cancels; a scrim click does not", async () => {
    inLocale(<DeleteProject />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const overlay = document.querySelector("[data-slot='dialog-overlay']")!;
    fireEvent.pointerDown(overlay);
    fireEvent.pointerUp(overlay);
    fireEvent.click(overlay);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    press("Escape", screen.getByRole("alertdialog"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("typed confirmation enables the action only once the text matches", () => {
    inLocale(<DeleteProject typed="ORD-482" />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const confirm = screen.getByRole("button", { name: "Delete project" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    const field = screen.getByRole("textbox", { name: "Type ORD-482 to confirm" });
    fireEvent.change(field, { target: { value: "ORD-48" } });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(field, { target: { value: "ORD-482" } });
    expect(confirm.disabled).toBe(false);
  });

  it("an async confirm shows pending, then closes; a failure keeps it open", async () => {
    let resolve!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    inLocale(<DeleteProject onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
    await waitFor(() => expect(document.querySelector("[data-slot='alert-dialog-confirm']")!.hasAttribute("data-pending")).toBe(true));
    await act(async () => resolve());
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    cleanup();
    const failing = vi.fn(() => Promise.reject(new Error("409")));
    inLocale(<DeleteProject onConfirm={failing} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
    });
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });
});

describe("Drawer", () => {
  function Record({ unsaved, position }: { unsaved?: boolean; position?: "start" | "end" | "top" | "bottom" }) {
    return (
      <DialogTrigger>
        <Button>Open</Button>
        <Drawer
          title="ORD-482"
          subtitle="Jordan Lee · 14–18 Oct"
          position={position}
          hasUnsavedChanges={unsaved}
          footer={<Button variant="primary">Save</Button>}
        >
          Desk lamp
        </Drawer>
      </DialogTrigger>
    );
  }

  it("on the inline end, named by its title; the footer keeps clear of the home indicator", () => {
    inLocale(<Record />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog", { name: "ORD-482" })).toBeTruthy();
    const drawer = document.querySelector("[data-slot='drawer']")!;
    expect(drawer.className).toContain("end-0");
    expect(drawer.className).toContain("w-95");
    expect(document.querySelector("[data-slot='drawer-footer']")!.className).toContain("safe-area-inset-bottom");
  });

  it("bottom sheet: a grip snaps it between half and full height", () => {
    inLocale(<Record position="bottom" />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const drawer = document.querySelector("[data-slot='drawer']")!;
    expect(drawer.className).toContain("h-[50dvh]");
    const grip = screen.getByRole("button", { name: "Expand panel" });
    expect(grip.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(grip);
    expect(screen.getByRole("button", { name: "Collapse panel" }).getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector("[data-slot='drawer']")!.className).toContain("100dvh");
  });

  it("comes from the edge `position` names, at every width (a phone included): the app decides", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("max-width: 639px"), media: query, addEventListener: () => {}, removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      for (const position of ["start", "end", "top", "bottom"] as const) {
        const { unmount } = inLocale(<Record position={position} />);
        fireEvent.click(screen.getByRole("button", { name: "Open" }));
        expect(document.querySelector("[data-slot='drawer-overlay']")!.getAttribute("data-position")).toBe(position);
        unmount();
      }
    } finally {
      window.matchMedia = original;
    }
  });

  it("unsaved edits: closing asks first; Keep editing stays, Close without saving closes", async () => {
    inLocale(<Record unsaved />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    expect(screen.getByRole("alertdialog", { name: "Changes not saved" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
    press("Escape", screen.getByRole("dialog"));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close without saving" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("RTL: slides from the inline end; no physical classes", () => {
    inLocale(<Record />, "ar", "rtl");
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const drawer = document.querySelector("[data-slot='drawer']")!;
    expect(drawer.className).toContain("rtl:data-[entering]:-translate-x-full");
    for (const el of Array.from(document.querySelectorAll("[data-slot^='drawer'], [data-slot^='dialog'] [class]"))) {
      expect(el.getAttribute("class") ?? "").not.toMatch(PHYSICAL);
    }
  });
});

describe("Overlay close, nesting and safe areas", () => {
  it("opened with isOpen, every close reports onOpenChange(false) once", async () => {
    const cases: [string, (onOpenChange: (open: boolean) => void) => React.ReactElement, () => void][] = [
      ["dialog close", (o) => <Dialog isOpen onOpenChange={o} title="T">x</Dialog>, () => fireEvent.click(document.querySelector("[data-slot='dialog-close']")!)],
      ["dialog Cancel", (o) => <Dialog isOpen onOpenChange={o} title="T">x</Dialog>, () => fireEvent.click(screen.getByRole("button", { name: "Cancel" }))],
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
    inLocale(<AlertDialog isOpen onOpenChange={onOpenChange} title="Delete?" confirmLabel="Delete" onConfirm={() => Promise.resolve()}>x</AlertDialog>);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });
    expect(onOpenChange.mock.calls).toEqual([[false]]);
  });

  function Unsaved({ inner }: { inner?: React.ReactNode }) {
    return (
      <Drawer defaultOpen title="ORD-482" hasUnsavedChanges footer={<Button>Save</Button>}>
        <TextField label="Note" defaultValue="a" />
        {inner}
      </Drawer>
    );
  }

  it("the unsaved prompt is a real modal: focus stays in it, the drawer is out of reach, Esc keeps editing", async () => {
    inLocale(<Unsaved />);
    fireEvent.click(document.querySelector("[data-slot='drawer-close']")!);
    const prompt = screen.getByRole("alertdialog", { name: "Changes not saved" });
    const keep = within(prompt).getByRole("button", { name: "Keep editing" });
    const discard = within(prompt).getByRole("button", { name: "Close without saving" });
    act(() => discard.focus());
    press("Tab", discard);
    expect(prompt.contains(document.activeElement)).toBe(true);
    act(() => keep.focus());
    fireEvent.keyDown(keep, { key: "Tab", shiftKey: true });
    expect(prompt.contains(document.activeElement)).toBe(true);
    // The drawer behind is hidden from assistive tech while the prompt is up.
    expect(screen.queryByRole("textbox", { name: "Note" })).toBeNull();
    press("Escape", prompt);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByRole("dialog", { name: "ORD-482" })).toBeTruthy();
  });

  it("Esc inside a nested non-dismissable dialog does not open the drawer's prompt", () => {
    inLocale(
      <Unsaved
        inner={
          <DialogTrigger>
            <Button>Open inner</Button>
            <Dialog isDismissable={false} title="Inner">inner</Dialog>
          </DialogTrigger>
        }
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open inner" }));
    press("Escape", screen.getByRole("dialog", { name: "Inner" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("dialog", { name: "Inner" })).toBeTruthy();
  });

  it("a dialog nested in a drawer has its own open state: closing it leaves the drawer open", async () => {
    inLocale(
      <Drawer defaultOpen title="ORD-482">
        <DialogTrigger>
          <Button>Open inner</Button>
          <Dialog title="Inner">inner</Dialog>
        </DialogTrigger>
      </Drawer>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open inner" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Inner" })).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Inner" })).toBeNull());
    expect(screen.getByRole("dialog", { name: "ORD-482" })).toBeTruthy();
  });

  it("a scrim click with unsaved edits asks first", () => {
    inLocale(<Unsaved />);
    const overlay = document.querySelector("[data-slot='drawer-overlay']")!;
    fireEvent.pointerDown(overlay, { button: 0, pointerType: "mouse" });
    fireEvent.pointerUp(overlay, { button: 0, pointerType: "mouse" });
    fireEvent.click(overlay);
    expect(screen.getByRole("alertdialog", { name: "Changes not saved" })).toBeTruthy();
  });

  it("while the alert's action runs, Cancel is disabled and Esc does not close it", async () => {
    let resolve!: () => void;
    inLocale(
      <AlertDialog defaultOpen title="Delete?" confirmLabel="Delete" onConfirm={() => new Promise<void>((r) => (resolve = r))}>x</AlertDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(true));
    press("Escape", screen.getByRole("alertdialog"));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    await act(async () => resolve());
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("safe areas: a footerless body clears the home indicator; the side drawer clears a landscape notch", () => {
    inLocale(<Drawer defaultOpen title="T">x</Drawer>);
    expect(document.querySelector("[data-slot='drawer-body']")!.className).toContain("safe-area-inset-bottom");
    const drawer = document.querySelector("[data-slot='drawer']")!.className;
    expect(drawer).toContain("pe-[env(safe-area-inset-right,0px)]");
    expect(drawer).toContain("rtl:pe-[env(safe-area-inset-left,0px)]");
  });

  it("the grip: swipe up expands, swipe down from half asks to close", () => {
    inLocale(<Drawer defaultOpen position="bottom" title="Filters" hasUnsavedChanges>x</Drawer>);
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
    expect(screen.getByRole("alertdialog", { name: "Changes not saved" })).toBeTruthy();
  });
});

describe("Drawer close hook, trigger and grip", () => {
  function SaveAndClose() {
    const close = useDrawerClose();
    return <Button onPress={() => close({ force: true })}>Save and close</Button>;
  }
  function Editor() {
    const [note, setNote] = React.useState("a");
    const [saved, setSaved] = React.useState("a");
    return (
      <Drawer defaultOpen title="ORD-482" hasUnsavedChanges={note !== saved} footer={<span onClick={() => setSaved(note)}><SaveAndClose /></span>}>
        <TextField label="Note" value={note} onChange={setNote} />
      </Drawer>
    );
  }

  it("save and close: close({ force: true }) closes without asking", async () => {
    inLocale(<Editor />);
    fireEvent.change(screen.getByRole("textbox", { name: "Note" }), { target: { value: "ab" } });
    fireEvent.click(screen.getByRole("button", { name: "Save and close" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "ORD-482" })).toBeNull());
  });

  it("without force, the same button still asks while edits are unsaved", () => {
    function Ask() {
      const close = useDrawerClose();
      return <Button onPress={() => close()}>Close and ask</Button>;
    }
    inLocale(<Drawer defaultOpen title="ORD-482" hasUnsavedChanges footer={<Ask />}>x</Drawer>);
    fireEvent.click(screen.getByRole("button", { name: "Close and ask" }));
    expect(screen.getByRole("alertdialog", { name: "Changes not saved" })).toBeTruthy();
  });

  it("a ds Dialog inside React Aria's own DialogTrigger opens and closes", async () => {
    inLocale(
      <AriaDialogTrigger>
        <Button>Open</Button>
        <Dialog title="RA trigger">x</Dialog>
      </AriaDialogTrigger>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog", { name: "RA trigger" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("the grip keeps the pointer while it drags", () => {
    inLocale(<Drawer defaultOpen position="bottom" title="Filters">x</Drawer>);
    const grip = document.querySelector("[data-slot='drawer-grip']") as HTMLElement;
    const capture = vi.fn();
    grip.setPointerCapture = capture;
    fireEvent.pointerDown(grip, { clientY: 400, pointerId: 7 });
    expect(capture).toHaveBeenCalledWith(7);
  });

  it("a sheet reopens at half height", async () => {
    inLocale(
      <DialogTrigger>
        <Button>Open</Button>
        <Drawer position="bottom" title="Filters">x</Drawer>
      </DialogTrigger>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("button", { name: "Expand panel" }));
    fireEvent.click(document.querySelector("[data-slot='drawer-close']")!);
    // Closing keeps the full height while it slides out.
    expect(document.querySelector("[data-slot='drawer']")?.className ?? "100dvh").toContain("100dvh");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("button", { name: "Expand panel" }).getAttribute("aria-expanded")).toBe("false");
  });
});
