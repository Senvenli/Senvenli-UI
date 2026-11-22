import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { TextField } from "../form/text-field";
import { DesignSystemProvider } from "../provider";
import { Dialog, DialogTrigger, type DialogProps } from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot='${name}']`);
const children = (element: Element) => [...element.children].map((child) => child.getAttribute("data-slot"));

function Logo() {
  return <svg data-testid="logo" aria-hidden="true" width="96" height="24" />;
}

/** A signup frame: a logo before a hidden title, no DS footer, the steps' own buttons in the body. */
function SignupFrame(props: Partial<DialogProps>) {
  return (
    <DialogTrigger>
      <Button>Get started</Button>
      <Dialog
        size="fullscreen"
        title="Create account"
        headerStart={<Logo />}
        isTitleHidden
        secondaryAction={null}
        {...props}
      >
        <TextField label="Email" />
        <Button>Continue</Button>
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

describe("Dialog size=\"fullscreen\" options", () => {
  describe("action icons: iconBefore / iconAfter", () => {
    it("render beside the label, aria-hidden; the label alone names the button", () => {
      inLocale(
        <Dialog
          defaultOpen
          size="fullscreen"
          title="Sign up"
          secondaryAction={{ label: "Back", iconBefore: "arrow-left" }}
          primaryAction={{ label: "Continue", iconAfter: "arrow-right" }}
        >
          x
        </Dialog>,
      );
      const back = screen.getByRole("button", { name: "Back" });
      const next = screen.getByRole("button", { name: "Continue" });
      for (const [button, side] of [[back, "first"], [next, "last"]] as const) {
        const content = button.querySelector("[data-slot='button-content']")!;
        const icons = content.querySelectorAll("[data-slot='button-icon']");
        expect(icons).toHaveLength(1);
        expect(icons[0].getAttribute("aria-hidden")).toBe("true");
        expect(side === "first" ? content.firstElementChild : content.lastElementChild).toBe(icons[0]);
      }
      expect(back.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    });

    it("keep the button's size and focus ring: the same classes as without an icon", () => {
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" primaryAction={{ label: "Continue" }}>x</Dialog>);
      const plain = screen.getByRole("button", { name: "Continue" }).className;
      cleanup();
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" primaryAction={{ label: "Continue", iconBefore: "check", iconAfter: "arrow-right" }}>x</Dialog>);
      const button = screen.getByRole("button", { name: "Continue" });
      expect(button.className).toBe(plain);
      expect(button.className).toContain("h-ds-control");
      expect(button.className).toContain("data-[focus-visible]:inset-ring-2");
      expect(button.querySelectorAll("[data-slot='button-icon'][aria-hidden='true']")).toHaveLength(2);
    });

    it("a pending primary still hides its icon with the label behind the spinner", () => {
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" primaryAction={{ label: "Continue", iconAfter: "arrow-right", isPending: true }}>x</Dialog>);
      const button = screen.getByRole("button", { name: "Continue" });
      expect(button.querySelector("[data-slot='button-content']")!.className).toContain("opacity-0");
      expect(button.querySelector("[data-slot='button-spinner']")).toBeTruthy();
    });
  });

  describe("footerLayout=\"spread\"", () => {
    it("secondary at the inline start, primary at the inline end (LTR); the footer stays sticky with its safe area", () => {
      inLocale(
        <Dialog defaultOpen size="fullscreen" title="Sign up" footerLayout="spread" secondaryAction={{ label: "Back" }} primaryAction={{ label: "Continue" }}>
          x
        </Dialog>,
      );
      const footer = slot("dialog-footer")!;
      expect(footer.getAttribute("data-layout")).toBe("spread");
      expect(children(footer)).toEqual(["dialog-secondary", "dialog-primary"]);
      expect(footer.className.split(" ")).toEqual(expect.arrayContaining(["shrink-0", "justify-end", "[&>[data-slot=dialog-secondary]]:me-auto"]));
      expect(footer.className).toContain("pb-[max(var(--ds-space-300),env(safe-area-inset-bottom,0px))]");
      expect(footer.className).not.toMatch(PHYSICAL);
    });

    // jsdom has no layout: the logical margin (me-auto) is what mirrors it; the Chromium run measures the edges.
    it("RTL: the same logical classes and order, so the secondary sits at the right edge and the primary at the left", () => {
      inLocale(
        <Dialog defaultOpen size="fullscreen" title="إنشاء حساب" footerLayout="spread" secondaryAction={{ label: "رجوع", iconBefore: "arrow-right" }} primaryAction={{ label: "متابعة", iconAfter: "arrow-left" }}>
          x
        </Dialog>,
        "ar",
        "rtl",
      );
      const footer = slot("dialog-footer")!;
      expect(children(footer)).toEqual(["dialog-secondary", "dialog-primary"]);
      expect(footer.className).toContain("[&>[data-slot=dialog-secondary]]:me-auto");
      expect(footer.className).not.toMatch(PHYSICAL);
      expect(screen.getByRole("dialog", { name: "إنشاء حساب" })).toBeTruthy();
    });

    it("a lone primary (secondaryAction null) stays at the end", () => {
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" footerLayout="spread" secondaryAction={null} primaryAction={{ label: "Continue" }}>x</Dialog>);
      const footer = slot("dialog-footer")!;
      expect(children(footer)).toEqual(["dialog-primary"]);
      expect(footer.className.split(" ")).toContain("justify-end");
    });

    it("the default (and footerLayout=\"end\") renders the footer exactly as before", () => {
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" primaryAction={{ label: "Continue" }}>x</Dialog>);
      const before = slot("dialog-footer")!.outerHTML;
      cleanup();
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" footerLayout="end" primaryAction={{ label: "Continue" }}>x</Dialog>);
      expect(slot("dialog-footer")!.outerHTML.replace(/react-aria\S*?"/g, "")).toBe(before.replace(/react-aria\S*?"/g, ""));
      expect(slot("dialog-footer")!.hasAttribute("data-layout")).toBe(false);
    });
  });

  describe("optional footer: secondaryAction={null} and no primaryAction", () => {
    it("renders no footer element and no wrapper: the dialog is the header and the body", () => {
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" secondaryAction={null}>x</Dialog>);
      expect(slot("dialog-footer")).toBeNull();
      expect(children(screen.getByRole("dialog"))).toEqual(["dialog-header", "dialog-body"]);
      expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Cancel" })).toBeNull();
    });

    it("the body takes the bottom safe area itself and still scrolls", () => {
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" secondaryAction={null}>x</Dialog>);
      const body = slot("dialog-body")!.className.split(" ");
      expect(body).toEqual(expect.arrayContaining(["min-h-0", "flex-1", "overflow-y-auto", "pt-ds-300", "pb-[max(var(--ds-space-300),env(safe-area-inset-bottom,0px))]"]));
      expect(body).not.toContain("py-ds-300");
    });

    it("with a primary action the footer stays, sticky with its safe area, and the body is unchanged", () => {
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" primaryAction={{ label: "Continue" }}>x</Dialog>);
      const body = slot("dialog-body")!.className;
      cleanup();
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" secondaryAction={null} primaryAction={{ label: "Continue" }}>x</Dialog>);
      expect(slot("dialog-body")!.className).toBe(body);
      expect(slot("dialog-footer")!.className.split(" ")).toContain("shrink-0");
      expect(slot("dialog-footer")!.className).toContain("pb-[max(var(--ds-space-300),env(safe-area-inset-bottom,0px))]");
    });
  });

  describe("headerStart", () => {
    it("comes first in the header, then the title, then the close button", () => {
      inLocale(<Dialog defaultOpen size="fullscreen" title="Create account" headerStart={<Logo />} primaryAction={{ label: "Continue" }}>x</Dialog>);
      const header = slot("dialog-header")!;
      expect(children(header)).toEqual(["dialog-header-start", "dialog-heading", "dialog-close-wrap"]);
      expect(within(slot("dialog-header-start")!).getByTestId("logo")).toBeTruthy();
      expect(slot("dialog-header-start")!.className.split(" ")).toContain("shrink-0");
      expect(header.querySelector("[data-slot='dialog-close']")).toBeTruthy();
    });

    it("the title side shrinks and the title truncates to one line; the close button does not shrink", () => {
      inLocale(<Dialog defaultOpen size="fullscreen" title="A very long sign-up title" headerStart={<Logo />}>x</Dialog>);
      expect(slot("dialog-heading")!.className.split(" ")).toEqual(expect.arrayContaining(["min-w-0", "flex-1"]));
      expect(slot("dialog-title")!.className.split(" ")).toContain("truncate");
      expect(slot("dialog-close")!.className.split(" ")).toContain("shrink-0");
    });

    it("with a description, the title truncates and the description sits under it", () => {
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" description="Step 1 of 2" headerStart={<Logo />}>x</Dialog>);
      expect(children(slot("dialog-heading")!)).toEqual(["dialog-title", "dialog-description"]);
      expect(slot("dialog-heading")!.className.split(" ")).toEqual(expect.arrayContaining(["min-w-0", "flex-1"]));
      expect(screen.getByRole("dialog", { name: "Sign up" }).getAttribute("aria-describedby")).toBe(slot("dialog-description")!.id);
    });

    it("the close button still closes it", () => {
      const onOpenChange = vi.fn();
      inLocale(<Dialog isOpen onOpenChange={onOpenChange} size="fullscreen" title="Sign up" headerStart={<Logo />}>x</Dialog>);
      fireEvent.click(slot("dialog-close")!);
      expect(onOpenChange.mock.calls).toEqual([[false]]);
    });
  });

  describe("isTitleHidden", () => {
    it("hides the title visually but it still names the dialog", () => {
      inLocale(<Dialog defaultOpen size="fullscreen" title="Create account" isTitleHidden>x</Dialog>);
      const dialog = screen.getByRole("dialog", { name: "Create account" });
      const title = slot("dialog-title")!;
      expect(title.className).toBe("sr-only");
      expect(dialog.getAttribute("aria-labelledby")).toBe(title.id);
      // The close button keeps the inline end although the title is out of flow.
      expect(slot("dialog-header")!.className).toContain("[&>[data-slot=dialog-close-wrap]]:ms-auto");
    });

    it("with headerStart: the logo, the hidden title, the close button; still named", () => {
      inLocale(<SignupFrame />);
      open();
      expect(screen.getByRole("dialog", { name: "Create account" })).toBeTruthy();
      expect(children(slot("dialog-header")!)).toEqual(["dialog-header-start", "dialog-title", "dialog-close-wrap"]);
      expect(slot("dialog-title")!.className).toBe("sr-only");
    });

    it("a description stays visible and still describes the dialog", () => {
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" description="Step 1 of 2" isTitleHidden>x</Dialog>);
      const dialog = screen.getByRole("dialog", { name: "Sign up" });
      expect(slot("dialog-description")!.className).not.toContain("sr-only");
      expect(dialog.getAttribute("aria-describedby")).toBe(slot("dialog-description")!.id);
    });

    it("a missing title is still a type error, as it is today; React Aria raises no new warning", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      // @ts-expect-error `title` stays required with isTitleHidden.
      inLocale(<Dialog defaultOpen size="fullscreen" isTitleHidden>x</Dialog>);
      expect(screen.getByRole("dialog").hasAttribute("aria-labelledby")).toBe(true);
      expect(warn.mock.calls.filter(([message]) => /aria-label|Dialog/.test(String(message)))).toEqual([]);
    });
  });

  describe("keyboard: focus trap, Esc and focus return with every option on", () => {
    it("focus moves to the first field and Tab wraps inside the dialog (close button first)", async () => {
      inLocale(<SignupFrame footerLayout="spread" primaryAction={{ label: "Submit", iconAfter: "arrow-right" }} />);
      open();
      const dialog = screen.getByRole("dialog", { name: "Create account" });
      await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole("textbox", { name: "Email" })));
      const last = within(dialog).getByRole("button", { name: "Submit" });
      act(() => last.focus());
      press("Tab", last);
      expect(document.activeElement).toBe(slot("dialog-close"));
      press("Tab", slot("dialog-close")!);
      expect(document.activeElement).toBe(within(dialog).getByRole("textbox", { name: "Email" }));
    });

    it("without a footer the trap wraps from the body's last control to the close button", async () => {
      inLocale(<SignupFrame />);
      open();
      const dialog = screen.getByRole("dialog");
      await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole("textbox", { name: "Email" })));
      const last = within(dialog).getByRole("button", { name: "Continue" });
      act(() => last.focus());
      press("Tab", last);
      expect(document.activeElement).toBe(slot("dialog-close"));
    });

    it("Esc closes it and focus returns to the trigger", async () => {
      inLocale(<SignupFrame />);
      const trigger = open();
      press("Escape", screen.getByRole("dialog"));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(trigger));
    });

    it("the close button closes it and focus returns to the trigger", async () => {
      inLocale(<SignupFrame />);
      const trigger = open();
      fireEvent.click(slot("dialog-close")!);
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(trigger));
    });
  });

  describe("RTL with every option", () => {
    it("logical classes only, named, footer spread", () => {
      inLocale(
        <Dialog
          defaultOpen
          size="fullscreen"
          title="إنشاء حساب"
          headerStart={<Logo />}
          isTitleHidden
          footerLayout="spread"
          secondaryAction={{ label: "رجوع" }}
          primaryAction={{ label: "متابعة", iconAfter: "arrow-left" }}
        >
          محتوى
        </Dialog>,
        "ar",
        "rtl",
      );
      expect(screen.getByRole("dialog", { name: "إنشاء حساب" })).toBeTruthy();
      for (const name of ["dialog-header", "dialog-header-start", "dialog-body", "dialog-footer"]) {
        expect(slot(name)!.className, name).not.toMatch(PHYSICAL);
      }
    });
  });

  describe("unchanged without the options", () => {
    it("fullscreen: header, body, footer with 'Cancel'; no start slot, no layout attribute", () => {
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up">x</Dialog>);
      expect(children(screen.getByRole("dialog"))).toEqual(["dialog-header", "dialog-body", "dialog-footer"]);
      expect(children(slot("dialog-header")!)).toEqual(["dialog-title", "dialog-close-wrap"]);
      expect(slot("dialog-title")!.className).toBe("m-0 text-heading-medium");
      expect(slot("dialog-footer")!.hasAttribute("data-layout")).toBe(false);
      expect(within(slot("dialog-footer")!).getByRole("button", { name: "Cancel" })).toBeTruthy();
      expect(slot("dialog-body")!.className.split(" ")).toContain("py-ds-300");
      expect(slot("dialog-footer")!.querySelector("[data-slot='button-icon']")).toBeNull();
    });

    it("an empty headerStart (null, false, \"\") counts as none", () => {
      for (const empty of [null, false, ""]) {
        inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" headerStart={empty}>x</Dialog>);
        expect(slot("dialog-header-start"), String(empty)).toBeNull();
        expect(children(slot("dialog-header")!)).toEqual(["dialog-title", "dialog-close-wrap"]);
        cleanup();
      }
    });

    for (const size of ["small", "medium", "large"] as const) {
      it(`${size}: ignores the full-screen-only options (same DOM) and warns in development`, () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        inLocale(<Dialog defaultOpen size={size} title="Note" primaryAction={{ label: "Save" }}>x</Dialog>);
        const plain = screen.getByRole("dialog").outerHTML.replace(/react-aria\S*?"/g, "");
        expect(warn).not.toHaveBeenCalled();
        cleanup();
        inLocale(
          <Dialog defaultOpen size={size} title="Note" primaryAction={{ label: "Save" }} footerLayout="spread" headerStart={<Logo />} isTitleHidden>
            x
          </Dialog>,
        );
        expect(screen.getByRole("dialog").outerHTML.replace(/react-aria\S*?"/g, "")).toBe(plain);
        expect(warn.mock.calls.map(([message]) => String(message))).toEqual([
          `Dialog: footerLayout, headerStart, isTitleHidden only apply to size="fullscreen"; size="${size}" ignores them.`,
        ]);
      });
    }

    it("small: action icons work there too (the action type is shared)", () => {
      inLocale(<Dialog defaultOpen title="Note" primaryAction={{ label: "Save", iconBefore: "check" }}>x</Dialog>);
      expect(screen.getByRole("button", { name: "Save" }).querySelector("[data-slot='button-icon']")?.getAttribute("aria-hidden")).toBe("true");
    });
  });
});

describe("Dialog follow-ups", () => {
  // jsdom lacks CSS.escape, which React Aria's production build uses.
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
  const dialogWarnings = (warn: ReturnType<typeof vi.spyOn>) =>
    warn.mock.calls.map(([message]: unknown[]) => String(message)).filter((message: string) => message.startsWith("Dialog:"));

  describe("the full-screen-only warning names only values that would change a full-screen dialog", () => {
    for (const size of ["small", "medium", "large"] as const) {
      it(`${size}: the full-screen defaults (isTitleHidden={false}, footerLayout="end", an empty headerStart) say nothing`, () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        for (const empty of [null, false, true, ""]) {
          inLocale(<Dialog defaultOpen size={size} title="Note" isTitleHidden={false} footerLayout="end" headerStart={empty}>x</Dialog>);
          cleanup();
        }
        inLocale(<Dialog defaultOpen size={size} title="Note" secondaryAction={undefined}>x</Dialog>);
        expect(dialogWarnings(warn)).toEqual([]);
      });

      it(`${size}: each value that would change a full-screen dialog is named on its own`, () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const cases: Array<[Partial<DialogProps>, string]> = [
          [{ isTitleHidden: true }, "isTitleHidden"],
          [{ footerLayout: "spread" }, "footerLayout"],
          [{ headerStart: <Logo /> }, "headerStart"],
          [{ headerStart: "Acme" }, "headerStart"],
          [{ headerStart: 0 }, "headerStart"],
          [{ isTitleHidden: false, footerLayout: "spread", headerStart: null }, "footerLayout"],
        ];
        for (const [props] of cases) {
          inLocale(<Dialog defaultOpen size={size} title="Note" {...props}>x</Dialog>);
          cleanup();
        }
        expect(dialogWarnings(warn)).toEqual(cases.map(([, name]) => `Dialog: ${name} only applies to size="fullscreen"; size="${size}" ignores it.`));
      });
    }

    it("fullscreen never warns about its own options", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" isTitleHidden footerLayout="spread" headerStart={<Logo />} secondaryAction={null}>x</Dialog>);
      expect(dialogWarnings(warn)).toEqual([]);
    });
  });

  describe("isTitleHidden with an empty title warns in development (the dialog would have no name)", () => {
    const MESSAGE = "Dialog: isTitleHidden hides the title, but the title is empty, so the dialog has no accessible name. Give it a title; it stays visually hidden.";

    it.each([["\"\"", ""], ["blank", "   "], ["null", null], ["false", false]] as const)("title %s: one warning, and the dialog is indeed unnamed", (_, title) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      inLocale(<Dialog defaultOpen size="fullscreen" title={title} isTitleHidden>x</Dialog>);
      expect(dialogWarnings(warn)).toEqual([MESSAGE]);
      const dialog = screen.getByRole("dialog");
      const labelledBy = document.getElementById(dialog.getAttribute("aria-labelledby") ?? "");
      expect((labelledBy?.textContent ?? "").trim()).toBe("");
    });

    it("a real title (text or an element) says nothing; neither does an empty title that is shown", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" isTitleHidden>x</Dialog>);
      cleanup();
      inLocale(<Dialog defaultOpen size="fullscreen" title={<span>Sign up</span>} isTitleHidden>x</Dialog>);
      cleanup();
      inLocale(<Dialog defaultOpen size="fullscreen" title="">x</Dialog>);
      expect(dialogWarnings(warn)).toEqual([]);
    });

    it("production says nothing", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.stubEnv("NODE_ENV", "production");
      try {
        inLocale(<Dialog defaultOpen size="fullscreen" title="" isTitleHidden>x</Dialog>);
      } finally {
        vi.unstubAllEnvs();
      }
      expect(dialogWarnings(warn)).toEqual([]);
    });

    it("fullscreen only: small, medium and large ignore isTitleHidden (their empty title shows), so only the full-screen-only warning names it", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      for (const size of ["small", "medium", "large"] as const) {
        inLocale(<Dialog defaultOpen size={size} title="" isTitleHidden>x</Dialog>);
        cleanup();
      }
      expect(dialogWarnings(warn)).toEqual(
        (["small", "medium", "large"] as const).map((size) => `Dialog: isTitleHidden only applies to size="fullscreen"; size="${size}" ignores it.`),
      );
      expect(dialogWarnings(warn)).not.toContain(MESSAGE);
      warn.mockClear();
      inLocale(<Dialog defaultOpen size="fullscreen" title="" isTitleHidden>x</Dialog>);
      expect(dialogWarnings(warn)).toEqual([MESSAGE]);
    });
  });

  describe("a danger primary with no secondary", () => {
    it("focus goes to the body's first field, as for any other dialog", async () => {
      inLocale(
        <Dialog defaultOpen size="fullscreen" title="Delete account" secondaryAction={null} primaryAction={{ label: "Delete", variant: "danger" }}>
          <TextField label="Confirmation" />
        </Dialog>,
      );
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Confirmation" })));
    });

    it("without a field, focus stays on the dialog itself (never the destructive button)", async () => {
      inLocale(
        <Dialog defaultOpen size="fullscreen" title="Delete account" secondaryAction={null} primaryAction={{ label: "Delete", variant: "danger" }}>
          This cannot be undone.
        </Dialog>,
      );
      const dialog = screen.getByRole("dialog", { name: "Delete account" });
      await waitFor(() => expect(document.activeElement).toBe(dialog));
      expect(document.activeElement).not.toBe(screen.getByRole("button", { name: "Delete" }));
    });

    it("with the secondary there, it still starts on the secondary (unchanged)", async () => {
      inLocale(
        <Dialog defaultOpen title="Delete account" primaryAction={{ label: "Delete", variant: "danger" }}>
          <TextField label="Confirmation" />
        </Dialog>,
      );
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" })));
    });
  });

  it("footerLayout=\"spread\" with a lone secondary: it sits at the inline start (LTR and RTL)", () => {
    for (const [locale, dir] of [["en", undefined], ["ar", "rtl"]] as const) {
      inLocale(<Dialog defaultOpen size="fullscreen" title="Sign up" footerLayout="spread" secondaryAction={{ label: "Back" }}>x</Dialog>, locale, dir);
      const footer = slot("dialog-footer")!;
      expect(children(footer)).toEqual(["dialog-secondary"]);
      expect(footer.className.split(" ")).toContain("[&>[data-slot=dialog-secondary]]:me-auto");
      cleanup();
    }
  });
});
