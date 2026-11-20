import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Button } from "../action";
import { AlertDialog, Menu } from "./index";

afterEach(cleanup);

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

function inLocale(ui: React.ReactElement, locale = "tr-TR") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const press = (key: string, target: Element) => {
  fireEvent.keyDown(target, { key });
  fireEvent.keyUp(target, { key });
};

/** Operations' row actions: "Sil" in a DS Menu opens the delete confirm; the menu item is gone once it opens. */
function RowActions({ withReturn = true, pending }: { withReturn?: boolean; pending?: Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const menuButton = React.useRef<HTMLButtonElement>(null);
  return (
    <>
      <Menu
        trigger={<Button ref={menuButton} variant="subtle" aria-label="Satır işlemleri">…</Button>}
        items={[
          { id: "edit", label: "Düzenle" },
          { id: "delete", label: "Sil", tone: "danger" },
        ]}
        onAction={(key) => key === "delete" && setOpen(true)}
      />
      <AlertDialog
        isOpen={open}
        onOpenChange={setOpen}
        title="PG AB 482 silinsin mi?"
        confirmLabel="Aracı sil"
        onConfirm={() => pending}
        returnFocusRef={withReturn ? menuButton : undefined}
      >
        Geri alınamaz.
      </AlertDialog>
    </>
  );
}

function openFromMenu() {
  const trigger = screen.getByRole("button", { name: "Satır işlemleri" });
  act(() => trigger.focus());
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("menuitem", { name: "Sil" }));
  return trigger;
}

describe("AlertDialog returnFocusRef (RENENG-3517 M1)", () => {
  for (const how of ["Vazgeç", "Esc"] as const) {
    it(`opened from a Menu item: closing by ${how} gives focus to the Menu button, not the page`, async () => {
      inLocale(<RowActions />);
      const trigger = openFromMenu();
      const cancel = await screen.findByRole("button", { name: "Vazgeç" });
      await waitFor(() => expect(document.activeElement).toBe(cancel));
      if (how === "Vazgeç") fireEvent.click(cancel);
      else press("Escape", cancel);
      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(trigger));
      await frames();
      expect(document.activeElement).toBe(trigger);
    });
  }

  it("after a confirmed action too", async () => {
    inLocale(<RowActions pending={Promise.resolve()} />);
    const trigger = openFromMenu();
    fireEvent.click(await screen.findByRole("button", { name: "Aracı sil" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("Vazgeç still takes the first focus, and the alert is still named and described", async () => {
    inLocale(<RowActions />);
    openFromMenu();
    const alert = await screen.findByRole("alertdialog", { name: "PG AB 482 silinsin mi?" });
    expect(document.getElementById(alert.getAttribute("aria-describedby")!)!.textContent).toBe("Geri alınamaz.");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Vazgeç" })));
  });

  it("RTL: the same return", async () => {
    inLocale(<RowActions />, "ar-AE");
    const trigger = openFromMenu();
    await screen.findByRole("alertdialog");
    fireEvent.click(document.querySelector<HTMLElement>("[data-slot='alert-dialog-cancel']")!);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  /**
   * The bug itself, made deterministic: in Chromium the Menu item that opened the alert is gone when it closes, so
   * React Aria's return lands on the page (jsdom closes the menu in another order and returns to the Menu button).
   * Here the opener removes itself as it opens the alert, as that item does.
   */
  function VanishingOpener({ withReturn }: { withReturn: boolean }) {
    const [open, setOpen] = React.useState(false);
    const target = React.useRef<HTMLButtonElement>(null);
    return (
      <>
        <button ref={target} type="button">Satır işlemleri</button>
        {!open && <Button onPress={() => setOpen(true)}>Sil</Button>}
        <AlertDialog isOpen={open} onOpenChange={setOpen} title="Silinsin mi?" confirmLabel="Sil" onConfirm={() => {}} returnFocusRef={withReturn ? target : undefined}>
          Geri alınamaz.
        </AlertDialog>
      </>
    );
  }

  it("an opener that is gone by the close: focus goes to the ref's element; without the ref it falls to the page as before", async () => {
    for (const withReturn of [true, false]) {
      inLocale(<VanishingOpener withReturn={withReturn} />);
      const opener = screen.getByRole("button", { name: "Sil" });
      act(() => opener.focus());
      fireEvent.click(opener);
      const cancel = await screen.findByRole("button", { name: "Vazgeç" });
      await waitFor(() => expect(document.activeElement).toBe(cancel));
      fireEvent.click(cancel);
      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
      await frames();
      const target = screen.getByRole("button", { name: "Satır işlemleri" });
      if (withReturn) expect(document.activeElement).toBe(target);
      else expect(document.activeElement).toBe(document.body);
      cleanup();
    }
  });
});
