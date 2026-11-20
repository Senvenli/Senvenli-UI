import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { TextField } from "../form/index";
import { DesignSystemProvider } from "../provider";
import { Dialog, DialogTrigger } from "./index";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;

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

/** A phone (below 640px) or a wide screen, as Drawer's `(max-width: 639px)` query sees it. */
function stubViewport(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: width <= Number(/max-width:\s*(\d+)px/.exec(query)?.[1] ?? Infinity),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot='${name}']`)!;

function SignupDialog({ onContinue = vi.fn(), isDismissable }: { onContinue?: () => void; isDismissable?: boolean }) {
  return (
    <DialogTrigger>
      <Button>Get started</Button>
      <Dialog
        size="fullscreen"
        title="Create account"
        description="Plan and account details"
        isDismissable={isDismissable}
        secondaryAction={{ label: "Back" }}
        primaryAction={{ label: "Continue", onPress: onContinue }}
      >
        <TextField label="Email" />
        <p>A long form.</p>
      </Dialog>
    </DialogTrigger>
  );
}

function open() {
  const trigger = screen.getByRole("button", { name: "Get started" });
  act(() => trigger.focus());
  fireEvent.click(trigger);
  return trigger;
}

describe("Dialog size=\"fullscreen\"", () => {
  describe("structure: a header and a footer that stay, the body scrolling between them", () => {
    it("header, body and footer are the dialog's three slots, in that order, inside a viewport-filling modal", () => {
      inLocale(<SignupDialog />);
      open();
      const dialog = screen.getByRole("dialog");
      const parts = [...dialog.children].map((child) => child.getAttribute("data-slot"));
      expect(parts).toEqual(["dialog-header", "dialog-body", "dialog-footer"]);
      const modal = slot("dialog-modal");
      expect(modal.getAttribute("data-size")).toBe("fullscreen");
      expect(modal.className).toMatch(/(^|\s)fixed(\s|$)/);
      expect(modal.className).toMatch(/(^|\s)inset-0(\s|$)/);
      // No width cap, no radius, no max height: it fills the viewport.
      expect(modal.className).not.toMatch(/max-w-|max-h-|rounded-/);
    });

    it("only the body scrolls; header and footer never shrink, so they stay at the top and bottom (sticky)", () => {
      inLocale(<SignupDialog />);
      open();
      const body = slot("dialog-body");
      for (const token of ["min-h-0", "flex-1", "overflow-y-auto"]) expect(body.className.split(" ")).toContain(token);
      for (const name of ["dialog-header", "dialog-footer"]) {
        const part = slot(name);
        expect(part.className.split(" "), name).toContain("shrink-0");
        expect(part.className, name).not.toMatch(/overflow-/);
      }
      expect(slot("dialog-header").className).toContain("border-b");
      expect(slot("dialog-footer").className).toContain("border-t");
      // The title and the close button are in the header; the actions in the footer; the content in the body.
      expect(within(slot("dialog-header")).getByRole("heading", { name: "Create account" })).toBeTruthy();
      expect(slot("dialog-header").querySelector("[data-slot='dialog-close']")).toBeTruthy();
      expect(within(slot("dialog-footer")).getAllByRole("button").map((button) => button.textContent)).toEqual(["Back", "Continue"]);
      expect(within(slot("dialog-body")).getByText("A long form.")).toBeTruthy();
    });
  });

  describe("safe areas: notch, home indicator and landscape sides", () => {
    it("the header clears the top inset, the footer the bottom inset, the modal the side insets", () => {
      inLocale(<SignupDialog />);
      open();
      expect(slot("dialog-header").className).toContain("pt-[max(var(--ds-space-300),env(safe-area-inset-top,0px))]");
      expect(slot("dialog-footer").className).toContain("pb-[max(var(--ds-space-300),env(safe-area-inset-bottom,0px))]");
      const modal = slot("dialog-modal").className;
      expect(modal).toContain("ps-[env(safe-area-inset-left,0px)]");
      expect(modal).toContain("pe-[env(safe-area-inset-right,0px)]");
    });

    it("the overlay adds no padding of its own (the modal covers it edge to edge)", () => {
      inLocale(<SignupDialog />);
      open();
      expect(slot("dialog-overlay").className).not.toMatch(/(^|\s)p[tbxy]?-/);
    });
  });

  describe("focus and closing", () => {
    it("focus moves to the first field and stays inside: Tab from the last control wraps to the close button", async () => {
      inLocale(<SignupDialog />);
      open();
      const dialog = screen.getByRole("dialog");
      await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole("textbox", { name: "Email" })));
      const primary = within(dialog).getByRole("button", { name: "Continue" });
      act(() => primary.focus());
      press("Tab", primary);
      expect(document.activeElement).toBe(dialog.querySelector("[data-slot='dialog-close']"));
    });

    it("Esc closes it and focus returns to the trigger", async () => {
      inLocale(<SignupDialog />);
      const trigger = open();
      press("Escape", screen.getByRole("dialog"));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(trigger));
    });

    it("a press outside the frame (a toast or banner layered above) never closes it; Esc still does", async () => {
      const onOpenChange = vi.fn();
      inLocale(<Dialog isOpen onOpenChange={onOpenChange} size="fullscreen" title="T">x</Dialog>);
      const above = document.createElement("button");
      above.textContent = "Toast action";
      document.body.appendChild(above);
      fireEvent.pointerDown(above, { pointerType: "mouse", button: 0 });
      fireEvent.pointerUp(above, { pointerType: "mouse", button: 0 });
      fireEvent.click(above);
      expect(onOpenChange).not.toHaveBeenCalled();
      press("Escape", screen.getByRole("dialog"));
      expect(onOpenChange.mock.calls).toEqual([[false]]);
      above.remove();
    });

    it("isDismissable={false}: Esc does not close it", () => {
      inLocale(<SignupDialog isDismissable={false} />);
      open();
      press("Escape", screen.getByRole("dialog"));
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    it("the close button closes it and focus returns to the trigger; the primary action runs its handler", async () => {
      const onContinue = vi.fn();
      inLocale(<SignupDialog onContinue={onContinue} />);
      const trigger = open();
      fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Continue" }));
      expect(onContinue).toHaveBeenCalledTimes(1);
      fireEvent.click(slot("dialog-close"));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(trigger));
    });

    it("controlled: every close (button, Esc) reports onOpenChange(false) once", () => {
      const onOpenChange = vi.fn();
      inLocale(<Dialog isOpen onOpenChange={onOpenChange} size="fullscreen" title="T">x</Dialog>);
      fireEvent.click(slot("dialog-close"));
      press("Escape", screen.getByRole("dialog"));
      expect(onOpenChange.mock.calls).toEqual([[false], [false]]);
    });
  });

  describe("accessibility: the same contract as every Dialog size", () => {
    it("role dialog, named by its title, described by its description", () => {
      inLocale(<SignupDialog />);
      open();
      const dialog = screen.getByRole("dialog", { name: "Create account" });
      const describedBy = dialog.getAttribute("aria-describedby");
      expect(document.getElementById(describedBy!)?.textContent).toBe("Plan and account details");
    });

    it("modal like the other sizes: the page behind is hidden from assistive tech; aria-modal matches the small dialog", () => {
      inLocale(
        <>
          <span>Background</span>
          <SignupDialog />
        </>,
      );
      open();
      expect(screen.getByText("Background").closest("[aria-hidden='true']")).toBeTruthy();
      const full = screen.getByRole("dialog").getAttribute("aria-modal");
      cleanup();
      inLocale(<Dialog defaultOpen title="Small">x</Dialog>);
      expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe(full);
    });
  });

  describe("presentation: a sheet on phones, full-screen on larger screens", () => {
    it("a phone (390px) gets the sheet: it slides up from the bottom edge and still fills the viewport", () => {
      stubViewport(390);
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up">x</Dialog>);
      const modal = slot("dialog-modal");
      expect(modal.getAttribute("data-presentation")).toBe("sheet");
      expect(modal.className).toContain("data-[entering]:translate-y-full");
      expect(modal.className).toContain("data-[exiting]:translate-y-full");
      expect(modal.className).toMatch(/(^|\s)inset-0(\s|$)/);
    });

    it("640px and up (1280px) stays full-screen: no width cap, it fades in", () => {
      for (const width of [640, 1280]) {
        stubViewport(width);
        inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up">x</Dialog>);
        const modal = slot("dialog-modal");
        expect(modal.getAttribute("data-presentation"), String(width)).toBe("fullscreen");
        expect(modal.className, String(width)).toMatch(/(^|\s)inset-0(\s|$)/);
        expect(modal.className, String(width)).not.toMatch(/max-w-|rounded-|translate-y-full/);
        expect(modal.className, String(width)).toContain("data-[entering]:opacity-0");
        cleanup();
      }
    });

    it("without matchMedia (server, old browsers) it is full-screen", () => {
      vi.stubGlobal("matchMedia", undefined);
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up">x</Dialog>);
      expect(slot("dialog-modal").getAttribute("data-presentation")).toBe("fullscreen");
    });

    it("reduced motion: no transition in either presentation", () => {
      for (const width of [390, 1280]) {
        stubViewport(width);
        inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up">x</Dialog>);
        expect(slot("dialog-modal").className).toContain("motion-reduce:transition-none");
        cleanup();
      }
    });
  });

  describe("RTL", () => {
    it("logical classes only; the side insets swap under rtl; named, footer order kept, Esc closes", async () => {
      for (const width of [390, 1280]) {
        stubViewport(width);
        inLocale(
          <Dialog defaultOpen size="fullscreen" title="إنشاء حساب" description="الخطة والحساب" primaryAction={{ label: "متابعة" }}>
            محتوى
          </Dialog>,
          "ar",
          "rtl",
        );
        const dialog = screen.getByRole("dialog", { name: "إنشاء حساب" });
        for (const name of ["dialog-overlay", "dialog-modal", "dialog-header", "dialog-body", "dialog-footer"]) {
          expect(slot(name).className, `${name} ${width}`).not.toMatch(PHYSICAL);
        }
        const modal = slot("dialog-modal").className;
        expect(modal).toContain("rtl:ps-[env(safe-area-inset-right,0px)]");
        expect(modal).toContain("rtl:pe-[env(safe-area-inset-left,0px)]");
        // The footer keeps its order (secondary, then primary at the inline end); flex-row mirrors it in RTL.
        const actions = within(slot("dialog-footer")).getAllByRole("button");
        expect(actions).toHaveLength(2);
        expect(actions[1].textContent).toBe("متابعة");
        press("Escape", dialog);
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        cleanup();
      }
    });
  });
});

describe("existing sizes are unchanged by the full-screen variant", () => {
  // The exact classes small, medium and large rendered before the variant was added.
  const OVERLAY =
    "fixed inset-0 z-50 bg-ds-blanket transition-opacity duration-(--ds-duration-slow) ease-ds-enter data-[entering]:opacity-0 data-[exiting]:opacity-0 data-[exiting]:ease-ds-exit motion-reduce:transition-none grid place-items-center overflow-y-auto p-ds-300 pt-[max(var(--ds-space-300),env(safe-area-inset-top,0px))] pb-[max(var(--ds-space-300),env(safe-area-inset-bottom,0px))]";
  const MODAL =
    "flex max-h-[calc(100dvh-2*var(--ds-space-300))] w-full flex-col overflow-hidden rounded-ds-xlarge bg-ds-surface-overlay text-ds-text shadow-ds-overlay outline-hidden transition-[opacity,translate] duration-(--ds-duration-slow) ease-ds-enter data-[entering]:translate-y-2 data-[entering]:opacity-0 data-[exiting]:opacity-0 data-[exiting]:ease-ds-exit motion-reduce:transition-none";
  const HEADER = "flex items-start justify-between gap-ds-200 px-ds-300 pt-ds-300";
  const BODY = "min-h-0 flex-1 overflow-y-auto px-ds-300 py-ds-200 text-body text-ds-text-subtle";
  const FOOTER = "flex flex-wrap items-center justify-end gap-ds-100 px-ds-300 pb-ds-300 pt-ds-100";
  const WIDTH = { small: "max-w-110", medium: "max-w-150", large: "max-w-200" } as const;

  for (const viewport of [390, 1280]) {
    for (const size of [undefined, "small", "medium", "large"] as const) {
      it(`${size ?? "default"} at ${viewport}px: the same classes and slots, and no full-screen attributes`, () => {
        stubViewport(viewport);
        inLocale(
          <Dialog
            defaultOpen
            size={size}
            title="Save note"
            description="Short description"
            primaryAction={{ label: "Save", isDisabled: true }}
            secondaryAction={{ label: "Back", isDisabled: true }}
          >
            Body
          </Dialog>,
        );
        expect(slot("dialog-overlay").className).toBe(OVERLAY);
        expect(slot("dialog-modal").className).toBe(`${MODAL} ${WIDTH[size ?? "small"]}`);
        expect(slot("dialog-header").className).toBe(HEADER);
        expect(slot("dialog-body").className).toBe(BODY);
        expect(slot("dialog-footer").className).toBe(FOOTER);
        expect(slot("dialog-modal").getAttribute("data-size")).toBe(size ?? "small");
        expect(slot("dialog-modal").hasAttribute("data-presentation")).toBe(false);
        expect([...screen.getByRole("dialog").children].map((child) => child.getAttribute("data-slot"))).toEqual(["dialog-header", "dialog-body", "dialog-footer"]);
      });
    }
  }
});
