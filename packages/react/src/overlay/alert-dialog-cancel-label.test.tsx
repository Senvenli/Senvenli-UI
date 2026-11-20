import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLocale } from "react-aria-components";

import { Button } from "../action/index";
import { cancelLabel as defaultCancelLabel, PRODUCT_LOCALES } from "../i18n";
import { DesignSystemProvider } from "../provider";
import { AlertDialog, DialogTrigger, type AlertDialogProps } from "./index";

afterEach(() => cleanup());

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const LONG = "Hayır, aracı filoda tut ve rezervasyonları olduğu gibi bırak; bu kararı daha sonra yeniden gözden geçireceğim";

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

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot='${name}']`)!;

type Props = Partial<AlertDialogProps>;
function Alert(props: Props) {
  return (
    <AlertDialog title="PG AB 482 filodan silinsin mi?" confirmLabel="Aracı sil" onConfirm={vi.fn()} {...props}>
      Silinen araç geri getirilemez.
    </AlertDialog>
  );
}

function DeleteVehicle(props: Props) {
  return (
    <DialogTrigger>
      <Button>Sil</Button>
      <Alert {...props} />
    </DialogTrigger>
  );
}

describe("AlertDialog cancelLabel (RENENG-3486)", () => {
  it("the cancel button's text and accessible name follow cancelLabel; the DS's Vazgeç is gone", () => {
    inLocale(<Alert defaultOpen cancelLabel="Hayır, aracı tut" />);
    const cancel = screen.getByRole("button", { name: "Hayır, aracı tut" });
    expect(cancel.getAttribute("data-slot")).toBe("alert-dialog-cancel");
    expect(cancel.textContent).toBe("Hayır, aracı tut");
    expect(screen.queryByRole("button", { name: "Vazgeç" })).toBeNull();
    // Not translated: the same string in another locale.
    cleanup();
    inLocale(<Alert defaultOpen cancelLabel="Hayır, aracı tut" />, "en");
    expect(screen.getByRole("button", { name: "Hayır, aracı tut" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("the cancel button has the first focus, also when opened from a trigger", async () => {
    inLocale(<DeleteVehicle cancelLabel="Hayır, aracı tut" />);
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Hayır, aracı tut" })));
  });

  it("Esc cancels: the dialog closes and reports onOpenChange(false)", async () => {
    const onOpenChange = vi.fn();
    inLocale(<DeleteVehicle cancelLabel="Hayır, aracı tut" />);
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    press("Escape", screen.getByRole("alertdialog"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    cleanup();
    inLocale(<Alert isOpen onOpenChange={onOpenChange} cancelLabel="Hayır, aracı tut" />);
    press("Escape", screen.getByRole("alertdialog"));
    expect(onOpenChange.mock.calls).toEqual([[false]]);
  });

  it("while the action runs, the custom cancel is disabled, a press does nothing and Esc does not close", async () => {
    let resolve!: () => void;
    const onOpenChange = vi.fn();
    inLocale(
      <Alert isOpen onOpenChange={onOpenChange} cancelLabel="Hayır, aracı tut" onConfirm={() => new Promise<void>((r) => (resolve = r))} />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Aracı sil" }));
    });
    const cancel = screen.getByRole("button", { name: "Hayır, aracı tut" }) as HTMLButtonElement;
    expect(cancel.disabled).toBe(true);
    fireEvent.click(cancel);
    press("Escape", screen.getByRole("alertdialog"));
    expect(onOpenChange).not.toHaveBeenCalled();
    await act(async () => resolve());
    expect(onOpenChange.mock.calls).toEqual([[false]]);
    expect((screen.getByRole("button", { name: "Hayır, aracı tut" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("pressing the custom cancel calls onOpenChange(false) once and never the action", () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    inLocale(<Alert isOpen onOpenChange={onOpenChange} onConfirm={onConfirm} cancelLabel="Hayır, aracı tut" />);
    fireEvent.click(screen.getByRole("button", { name: "Hayır, aracı tut" }));
    expect(onOpenChange.mock.calls).toEqual([[false]]);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("RTL in ar: the app's Arabic label is the name and has focus; the footer uses logical sides only", async () => {
    let direction = "";
    function Direction() {
      direction = useLocale().direction;
      return null;
    }
    inLocale(<><Direction /><Alert defaultOpen cancelLabel="لا، احتفظ بالمركبة" /></>, "ar", "rtl");
    expect(direction).toBe("rtl");
    const cancel = screen.getByRole("button", { name: "لا، احتفظ بالمركبة" });
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

  it("a whitespace-only label counts as unset: the locale's Vazgeç and the footer's own classes (#508 review)", async () => {
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
    expect(screen.getByRole("button", { name: "Vazgeç" }).textContent).toBe("Vazgeç");
    expect(slot("alert-dialog-footer").className).not.toContain("alert-dialog-cancel");
  });

  it("left out, undefined or \"\": byte-identical output in every DS locale, with the locale's own Vazgeç", async () => {
    const normalise = (html: string) => html.replace(/_r_[0-9a-z]+_/g, "_r_ID_");
    const capture = async (locale: string, extra: Props) => {
      const dir = locale === "ar" ? "rtl" : undefined;
      inLocale(<Alert defaultOpen requireTypedConfirmation="PG AB 482" {...extra} />, locale, dir);
      await waitFor(() => expect(document.activeElement?.getAttribute("data-slot")).toBe("alert-dialog-cancel"));
      const html = normalise(document.body.innerHTML);
      cleanup();
      return html;
    };
    const locales = [...PRODUCT_LOCALES, "ar"];
    expect(locales).toHaveLength(15);
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
  }, 60_000);
});
