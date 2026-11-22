import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { AlertDialog } from "./index";

/**
 * AlertDialog gaps: a confirm held back while the app loads (isConfirmDisabled), a neutral tone for confirms such
 * as "reactivate", and aria-describedby for the app's own warning.
 */

afterEach(cleanup);

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}
const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot='${name}']`);
const press = (key: string, target: Element) => {
  fireEvent.keyDown(target, { key });
  fireEvent.keyUp(target, { key });
};

describe("AlertDialog isConfirmDisabled", () => {
  it("holds the confirm back: named, disabled, not pressable by pointer or keys; Cancel and Esc still close", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    inLocale(
      <AlertDialog defaultOpen onOpenChange={onOpenChange} title="Delete project?" confirmLabel="Delete project" isConfirmDisabled onConfirm={onConfirm}>
        Loading linked tasks.
      </AlertDialog>,
    );
    const confirm = screen.getByRole("button", { name: "Delete project" });
    expect(confirm.hasAttribute("disabled")).toBe(true);
    expect(confirm.hasAttribute("data-disabled")).toBe(true);
    fireEvent.click(confirm);
    press("Enter", confirm);
    press(" ", confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    // Cancel keeps the first focus and the dialog can still be left.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    press("Escape", screen.getByRole("alertdialog"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("enables when the app clears it, and the confirm then runs", () => {
    const onConfirm = vi.fn();
    function Loading() {
      const [loading, setLoading] = React.useState(true);
      return (
        <>
          <button type="button" onClick={() => setLoading(false)}>loaded</button>
          <AlertDialog defaultOpen title="Delete project?" confirmLabel="Delete project" isConfirmDisabled={loading} onConfirm={onConfirm}>Text</AlertDialog>
        </>
      );
    }
    inLocale(<Loading />);
    expect(screen.getByRole("button", { name: "Delete project" }).hasAttribute("disabled")).toBe(true);
    act(() => (screen.getByText("loaded", { selector: "button" }) as HTMLButtonElement).click());
    const confirm = screen.getByRole("button", { name: "Delete project" });
    expect(confirm.hasAttribute("disabled")).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("isConfirmDisabled={false} is the default", () => {
    inLocale(<AlertDialog defaultOpen title="T" confirmLabel="Delete" isConfirmDisabled={false} onConfirm={vi.fn()}>M</AlertDialog>);
    const withFalse = slot("dialog")!.outerHTML.replace(/_r_[0-9a-z]+_|react-aria\d+-\d+/g, "");
    cleanup();
    inLocale(<AlertDialog defaultOpen title="T" confirmLabel="Delete" onConfirm={vi.fn()}>M</AlertDialog>);
    expect(slot("dialog")!.outerHTML.replace(/_r_[0-9a-z]+_|react-aria\d+-\d+/g, "")).toBe(withFalse);
  });
});

describe("AlertDialog tone neutral", () => {
  it("an info mark on a neutral ground and a primary confirm; still an alertdialog", () => {
    inLocale(<AlertDialog defaultOpen tone="neutral" title="Reactivate ORD-482?" confirmLabel="Reactivate" onConfirm={vi.fn()}>The project opens for new tasks again.</AlertDialog>);
    expect(screen.getByRole("alertdialog", { name: "Reactivate ORD-482?" })).toBeTruthy();
    const mark = slot("alert-dialog-icon")!;
    expect(mark.className.split(" ")).toEqual(expect.arrayContaining(["bg-ds-background-neutral", "text-ds-icon"]));
    expect(mark.querySelector("svg")!.getAttribute("class")).toContain("lucide-info");
    const confirm = screen.getByRole("button", { name: "Reactivate" });
    expect(confirm.getAttribute("data-variant")).toBe("primary");
  });

  it("danger and warning are unchanged", () => {
    inLocale(<AlertDialog defaultOpen title="T" confirmLabel="Delete" onConfirm={vi.fn()}>M</AlertDialog>);
    expect(slot("alert-dialog-icon")!.className).toContain("bg-ds-background-danger");
    expect(screen.getByRole("button", { name: "Delete" }).getAttribute("data-tone")).toBe("danger");
    cleanup();
    inLocale(<AlertDialog defaultOpen tone="warning" title="T" confirmLabel="Continue" onConfirm={vi.fn()}>M</AlertDialog>);
    expect(slot("alert-dialog-icon")!.className).toContain("bg-ds-background-warning");
    expect(screen.getByRole("button", { name: "Continue" }).getAttribute("data-variant")).toBe("primary");
    expect(screen.getByRole("button", { name: "Continue" }).getAttribute("data-tone")).toBe("neutral");
  });
});

describe("AlertDialog aria-describedby", () => {
  it("adds the app's warning after the alert's own description", () => {
    inLocale(
      <>
        <p id="lab-warning">This project has 3 open tasks.</p>
        <AlertDialog defaultOpen aria-describedby="lab-warning" title="Archive project?" confirmLabel="Archive" onConfirm={vi.fn()}>
          The project no longer shows in new tasks.
        </AlertDialog>
      </>,
    );
    const dialog = screen.getByRole("alertdialog");
    const ids = dialog.getAttribute("aria-describedby")!.split(" ");
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[0]!)!.textContent).toBe("The project no longer shows in new tasks.");
    expect(ids[1]).toBe("lab-warning");
  });

  it("a warning inside the alert's body works too; blank or absent leaves only the description", () => {
    inLocale(<AlertDialog defaultOpen aria-describedby="  " title="T" confirmLabel="Delete" onConfirm={vi.fn()}>M</AlertDialog>);
    expect(screen.getByRole("alertdialog").getAttribute("aria-describedby")!.split(" ")).toHaveLength(1);
    cleanup();
    inLocale(
      <AlertDialog defaultOpen aria-describedby="inside" title="T" confirmLabel="Delete" onConfirm={vi.fn()}>
        M <span id="inside">This cannot be undone.</span>
      </AlertDialog>,
    );
    expect(screen.getByRole("alertdialog").getAttribute("aria-describedby")!.split(" ")[1]).toBe("inside");
  });
});
