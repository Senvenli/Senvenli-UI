import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { AlertDialog, Dialog } from "./index";

afterEach(cleanup);

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

function inLocale(ui: React.ReactElement, locale = "tr-TR") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}
const modal = () => document.querySelector<HTMLElement>("[data-slot='dialog-modal']")!;

// Every size names itself on the modal, so an app's test reads data-size, never a width class (RENENG-3564).
describe("Dialog data-size on every size (RENENG-3564)", () => {
  for (const size of ["small", "medium", "large", "xlarge", "fullscreen"] as const) {
    it(`size="${size}" sets data-size="${size}"`, () => {
      inLocale(<Dialog defaultOpen size={size} title="Not">Gövde</Dialog>);
      expect(modal().getAttribute("data-size")).toBe(size);
    });
  }

  it("the default size reads small", () => {
    inLocale(<Dialog defaultOpen title="Not">Gövde</Dialog>);
    expect(modal().getAttribute("data-size")).toBe("small");
  });

  it("an AlertDialog, drawn in the same frame, reads small", () => {
    inLocale(<AlertDialog defaultOpen title="Araç silinsin mi?" confirmLabel="Sil" onConfirm={vi.fn()}>Metin</AlertDialog>);
    expect(modal().getAttribute("data-size")).toBe("small");
  });

  it("holds in RTL", () => {
    inLocale(<Dialog defaultOpen size="large" title="ملاحظة">نص</Dialog>, "ar-EG");
    expect(modal().getAttribute("data-size")).toBe("large");
  });
});
