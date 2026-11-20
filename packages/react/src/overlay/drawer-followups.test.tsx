import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Drawer } from "./index";

afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "tr-TR", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

describe("Drawer subtitle describes the drawer (RENENG-3462)", () => {
  it("a subtitle is the dialog's aria-describedby", () => {
    for (const [locale, dir] of [["tr-TR", undefined], ["ar", "rtl"]] as const) {
      inLocale(<Drawer defaultOpen title="RS-0914" subtitle="Ana Petrović · 14–18 Eki">Gövde</Drawer>, locale, dir);
      const dialog = screen.getByRole("dialog");
      const subtitle = document.querySelector<HTMLElement>("[data-slot='drawer-subtitle']")!;
      expect(subtitle.id, locale).not.toBe("");
      expect(dialog.getAttribute("aria-describedby"), locale).toBe(subtitle.id);
      expect(document.getElementById(dialog.getAttribute("aria-describedby")!)?.textContent, locale).toBe("Ana Petrović · 14–18 Eki");
      // The title still names it.
      expect(dialog.getAttribute("aria-labelledby"), locale).toBeTruthy();
      cleanup();
    }
  });

  it("a node subtitle describes the drawer too", () => {
    inLocale(<Drawer defaultOpen title="RS-0914" subtitle={<span>Ana · <b>14–18 Eki</b></span>}>Gövde</Drawer>);
    const describedBy = screen.getByRole("dialog").getAttribute("aria-describedby");
    expect(document.getElementById(describedBy!)?.textContent).toBe("Ana · 14–18 Eki");
  });

  it("without a subtitle (or with an empty one) there is no aria-describedby and no subtitle node", () => {
    for (const subtitle of [undefined, "", null, false]) {
      inLocale(<Drawer defaultOpen title="RS-0914" subtitle={subtitle}>Gövde</Drawer>);
      const dialog = screen.getByRole("dialog");
      expect(dialog.hasAttribute("aria-describedby"), String(subtitle)).toBe(false);
      expect(document.querySelector("[data-slot='drawer-subtitle']"), String(subtitle)).toBeNull();
      cleanup();
    }
  });

  it("an empty subtitle renders the same drawer as none", () => {
    const strip = () => document.body.innerHTML.replace(/_r_[0-9a-z]+_/g, "");
    inLocale(<Drawer defaultOpen title="RS-0914">Gövde</Drawer>);
    const plain = strip();
    cleanup();
    inLocale(<Drawer defaultOpen title="RS-0914" subtitle="">Gövde</Drawer>);
    expect(strip()).toBe(plain);
  });
});
