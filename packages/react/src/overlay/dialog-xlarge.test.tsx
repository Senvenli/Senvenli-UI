import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Button } from "../action";
import { TextField } from "../form/text-field";
import { Dialog, DialogTrigger } from "./index";

afterEach(cleanup);

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}
const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot='${name}']`);

describe("Dialog size xlarge", () => {
  it("is 1152px wide at most (max-w-288), in the same frame as the other sizes", () => {
    inLocale(<Dialog defaultOpen size="xlarge" title="Edit profile">Body</Dialog>);
    const modal = slot("dialog-modal")!;
    const classes = modal.className.split(" ");
    expect(classes).toContain("max-w-288");
    expect(classes).not.toContain("max-w-200");
    // The frame every non-fullscreen size has: full width below its max, the body scrolling inside 100dvh less the padding.
    expect(classes).toContain("w-full");
    expect(classes).toContain("max-h-[calc(100dvh-2*var(--ds-space-300))]");
    expect(modal.getAttribute("data-size")).toBe("xlarge");
    expect(slot("dialog-overlay")!.className).toContain("p-ds-300");
  });

  it("the other sizes are unchanged", () => {
    const WIDTH = { small: "max-w-110", medium: "max-w-150", large: "max-w-200" } as const;
    for (const [size, width] of Object.entries(WIDTH)) {
      inLocale(<Dialog defaultOpen size={size as keyof typeof WIDTH} title="Note">Body</Dialog>);
      expect(slot("dialog-modal")!.className.split(" "), size).toContain(width);
      expect(slot("dialog-modal")!.className, size).not.toContain("max-w-288");
      cleanup();
    }
  });

  it("focus, naming, Esc and the return to the trigger are those of every size (also RTL)", async () => {
    for (const locale of ["en", "ar-AE"]) {
      inLocale(
        <DialogTrigger>
          <Button>Edit</Button>
          <Dialog size="xlarge" title="Edit profile" description="Name and contact details" primaryAction={{ label: "Save" }}>
            <TextField label="Name" />
          </Dialog>
        </DialogTrigger>,
        locale,
      );
      const trigger = screen.getByRole("button", { name: "Edit" });
      act(() => trigger.focus());
      fireEvent.click(trigger);
      const dialog = await screen.findByRole("dialog", { name: "Edit profile" });
      expect(document.getElementById(dialog.getAttribute("aria-describedby")!)!.textContent).toBe("Name and contact details");
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" })));
      fireEvent.keyDown(document.activeElement!, { key: "Escape" });
      fireEvent.keyUp(document.activeElement!, { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(trigger));
      cleanup();
    }
  });

  it("the full-screen-only options warn as on the other sizes", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(<Dialog defaultOpen size="xlarge" title="Note" footerLayout="spread">Body</Dialog>);
    expect(warn).toHaveBeenCalledWith('Dialog: footerLayout only applies to size="fullscreen"; size="xlarge" ignores it.');
    warn.mockRestore();
  });
});
