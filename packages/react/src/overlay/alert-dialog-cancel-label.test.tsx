import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLocale } from "react-aria-components";

import { Button } from "../action/index";
import { cancelLabel as defaultCancelLabel, registerDsStrings } from "../i18n";
import { DesignSystemProvider } from "../provider";
import { AlertDialog, DialogTrigger, type AlertDialogProps } from "./index";

afterEach(() => cleanup());

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const LONG = "No, keep the project in the workspace and leave its tasks as they are; I will look at this decision again later";

const GERMAN = { cancel: "Abbrechen", typeToConfirm: "Zur Sicherheit {text} eingeben" };

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

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot='${name}']`)!;

type Props = Partial<AlertDialogProps>;
function Alert(props: Props) {
  return (
    <AlertDialog title="Delete project ORD-482?" confirmLabel="Delete project" onConfirm={vi.fn()} {...props}>
      A deleted project cannot be restored.
    </AlertDialog>
  );
}

function DeleteProject(props: Props) {
  return (
    <DialogTrigger>
      <Button>Delete</Button>
      <Alert {...props} />
    </DialogTrigger>
  );
}

describe("AlertDialog cancelLabel", () => {
  it("the cancel button's text and accessible name follow cancelLabel; the DS's Cancel is gone", () => {
    inLocale(<Alert defaultOpen cancelLabel="No, keep the project" />);
    const cancel = screen.getByRole("button", { name: "No, keep the project" });
    expect(cancel.getAttribute("data-slot")).toBe("alert-dialog-cancel");
    expect(cancel.textContent).toBe("No, keep the project");
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    // Not translated: the same string in a registered locale.
    cleanup();
    registerDsStrings("de", GERMAN);
    inLocale(<Alert defaultOpen cancelLabel="No, keep the project" />, "de");
    expect(screen.getByRole("button", { name: "No, keep the project" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Abbrechen" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("the cancel button has the first focus, also when opened from a trigger", async () => {
    inLocale(<DeleteProject cancelLabel="No, keep the project" />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "No, keep the project" })));
  });

  it("Esc cancels: the dialog closes and reports onOpenChange(false)", async () => {
    const onOpenChange = vi.fn();
    inLocale(<DeleteProject cancelLabel="No, keep the project" />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    press("Escape", screen.getByRole("alertdialog"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    cleanup();
    inLocale(<Alert isOpen onOpenChange={onOpenChange} cancelLabel="No, keep the project" />);
    press("Escape", screen.getByRole("alertdialog"));
    expect(onOpenChange.mock.calls).toEqual([[false]]);
  });

  it("while the action runs, the custom cancel is disabled, a press does nothing and Esc does not close", async () => {
    let resolve!: () => void;
    const onOpenChange = vi.fn();
    inLocale(
      <Alert isOpen onOpenChange={onOpenChange} cancelLabel="No, keep the project" onConfirm={() => new Promise<void>((r) => (resolve = r))} />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
    });
    const cancel = screen.getByRole("button", { name: "No, keep the project" }) as HTMLButtonElement;
    expect(cancel.disabled).toBe(true);
    fireEvent.click(cancel);
    press("Escape", screen.getByRole("alertdialog"));
    expect(onOpenChange).not.toHaveBeenCalled();
    await act(async () => resolve());
    expect(onOpenChange.mock.calls).toEqual([[false]]);
    expect((screen.getByRole("button", { name: "No, keep the project" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("pressing the custom cancel calls onOpenChange(false) once and never the action", () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    inLocale(<Alert isOpen onOpenChange={onOpenChange} onConfirm={onConfirm} cancelLabel="No, keep the project" />);
    fireEvent.click(screen.getByRole("button", { name: "No, keep the project" }));
    expect(onOpenChange.mock.calls).toEqual([[false]]);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("RTL in ar: the app's Arabic label is the name and has focus; the footer uses logical sides only", async () => {
    let direction = "";
    function Direction() {
      direction = useLocale().direction;
      return null;
    }
    inLocale(<><Direction /><Alert defaultOpen cancelLabel="لا، احتفظ بالمشروع" /></>, "ar", "rtl");
    expect(direction).toBe("rtl");
    const cancel = screen.getByRole("button", { name: "لا، احتفظ بالمشروع" });
    await waitFor(() => expect(document.activeElement).toBe(cancel));
    const footer = slot("alert-dialog-footer");
    expect(footer.className).not.toMatch(PHYSICAL);
    expect(cancel.className).not.toMatch(PHYSICAL);
    // The DOM order (cancel, then confirm) is the same; the flex row mirrors it.
    expect([...footer.children].map((child) => child.getAttribute("data-slot"))).toEqual(["alert-dialog-cancel", "alert-dialog-confirm"]);
  });

  it("a long label is the whole name and may wrap inside the footer's width (custom labels only)", () => {
    inLocale(<Alert defaultOpen cancelLabel={LONG} />);
    const cancel = screen.getByRole("button", { name: LONG });
    expect(cancel.textContent).toBe(LONG);
    const footer = slot("alert-dialog-footer").className.split(/\s+/);
    for (const rule of ["h-auto", "min-h-ds-control", "max-w-full", "whitespace-normal", "break-words"]) {
      expect(footer).toContain(`[&>[data-slot=alert-dialog-cancel]]:${rule}`);
    }
    expect(slot("alert-dialog-footer").className).not.toMatch(PHYSICAL);
    // The confirm button is not affected.
    expect(footer.some((rule) => rule.includes("alert-dialog-confirm"))).toBe(false);
  });

  it("a whitespace-only label counts as unset: the default Cancel and the footer's own classes", async () => {
    const normalise = (html: string) => html.replace(/_r_[0-9a-z]+_/g, "_r_ID_");
    const capture = async (extra: Props) => {
      inLocale(<Alert defaultOpen {...extra} />);
      await waitFor(() => expect(document.activeElement?.getAttribute("data-slot")).toBe("alert-dialog-cancel"));
      const html = normalise(document.body.innerHTML);
      cleanup();
      return html;
    };
    const omitted = await capture({});
    for (const blank of ["  ", "\t\n ", " "]) {
      expect(await capture({ cancelLabel: blank }), JSON.stringify(blank)).toBe(omitted);
    }
    inLocale(<Alert defaultOpen cancelLabel="  " />);
    expect(screen.getByRole("button", { name: "Cancel" }).textContent).toBe("Cancel");
    expect(slot("alert-dialog-footer").className).not.toContain("alert-dialog-cancel");
  });

  it("left out, undefined or \"\": byte-identical output in English, a registered locale and an English fallback, each with its own Cancel", async () => {
    const normalise = (html: string) => html.replace(/_r_[0-9a-z]+_/g, "_r_ID_");
    const capture = async (locale: string, extra: Props) => {
      const dir = locale === "ar" ? "rtl" : undefined;
      inLocale(<Alert defaultOpen requireTypedConfirmation="ORD-482" {...extra} />, locale, dir);
      await waitFor(() => expect(document.activeElement?.getAttribute("data-slot")).toBe("alert-dialog-cancel"));
      const html = normalise(document.body.innerHTML);
      cleanup();
      return html;
    };
    registerDsStrings("de", GERMAN);
    // "de" has its own words; "ar" has none registered, so it falls back to English (and is RTL).
    expect(defaultCancelLabel("en")).toBe("Cancel");
    expect(defaultCancelLabel("de")).toBe("Abbrechen");
    expect(defaultCancelLabel("ar")).toBe("Cancel");
    const locales = ["en", "de", "ar"];
    for (const locale of locales) {
      const omitted = await capture(locale, {});
      expect(await capture(locale, { cancelLabel: undefined }), locale).toBe(omitted);
      expect(await capture(locale, { cancelLabel: "" }), locale).toBe(omitted);
      // The default text is the DS string for the locale, and the footer keeps its original classes.
      const doc = new DOMParser().parseFromString(omitted, "text/html");
      expect(doc.querySelector("[data-slot='alert-dialog-cancel']")!.textContent, locale).toBe(defaultCancelLabel(locale));
      expect(doc.querySelector("[data-slot='alert-dialog-footer']")!.getAttribute("class"), locale).toBe(
        "flex flex-wrap items-center justify-end gap-ds-100 px-ds-300 pb-ds-300 pt-ds-200",
      );
    }
  });
});
