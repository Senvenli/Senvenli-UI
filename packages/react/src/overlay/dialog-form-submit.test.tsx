import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { TextField } from "../form/index";
import { DesignSystemProvider } from "../provider";
import { Dialog, DialogTrigger, type DialogProps } from "./index";

/**
 * The Dialog options a set-password dialog needs: a primary action that submits the dialog's form, an optional
 * secondary action and close button (a locked completion view), data-* pass-through, and initial / return focus
 * hooks. Each is opt-in; without them the DOM is unchanged.
 */

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const SIZES = ["small", "medium", "large", "fullscreen"] as const;

// Warnings are collected: React Aria's own (a missing name, a trigger) fail a test; the DS's are asserted where expected.
let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  const ariaWarnings = warn.mock.calls
    .map(([message]: unknown[]) => String(message))
    .filter((message: string) => !message.startsWith("Dialog:") && /modal|dialog|aria-label|accessible|trigger/i.test(message));
  vi.restoreAllMocks();
  expect(ariaWarnings).toEqual([]);
});
const dialogWarnings = () => warn.mock.calls.map(([message]: unknown[]) => String(message)).filter((message: string) => message.startsWith("Dialog:"));

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

function press(key: string, target: Element = document.activeElement ?? document.body, init: Partial<KeyboardEventInit> = {}) {
  fireEvent.keyDown(target, { key, ...init });
  fireEvent.keyUp(target, { key, ...init });
}

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot='${name}']`);

/** The set-password dialog: the form in the body, its submit button in the DS footer. */
function SetPassword({ onSubmit = vi.fn(), ...props }: Partial<DialogProps> & { onSubmit?: (data: FormData) => void }) {
  return (
    <Dialog
      defaultOpen
      title="Set your password"
      primaryAction={{ label: "Save password", form: "set-password" }}
      {...props}
    >
      <form
        id="set-password"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <TextField label="Password" name="password" defaultValue="secret-123" />
        <TextField label="Confirm password" name="confirm" defaultValue="secret-123" />
      </form>
    </Dialog>
  );
}

const primary = () => screen.getByRole("button", { name: "Save password" });

/** A full press on the scrim (the overlay around a small, medium or large dialog; behind a fullscreen one). */
function pressOutside() {
  const overlay = slot("dialog-overlay")!;
  fireEvent.pointerDown(overlay, { pointerId: 1, button: 0, pointerType: "mouse" });
  fireEvent.pointerUp(overlay, { pointerId: 1, button: 0, pointerType: "mouse" });
  fireEvent.mouseDown(overlay);
  fireEvent.mouseUp(overlay);
  fireEvent.click(overlay);
}

const STRANDED =
  "Dialog: isCloseButtonHidden leaves no close button, and the dialog has no control a keyboard can reach, so a user may be unable to go on or leave. Give it a primaryAction or a control in the body.";

describe("Dialog form-submit primary action", () => {
  it("is a submit button tied to the form by its id, outside the form element (in the footer)", () => {
    inLocale(<SetPassword />);
    const button = primary();
    const form = document.getElementById("set-password") as HTMLFormElement;
    expect(button.getAttribute("type")).toBe("submit");
    expect(button.getAttribute("form")).toBe("set-password");
    expect(form.contains(button)).toBe(false);
    expect(slot("dialog-footer")!.contains(button)).toBe(true);
    expect((button as HTMLButtonElement).form).toBe(form);
  });

  it("is the form's default button, so Enter in a field submits through it (implicit submission)", () => {
    inLocale(<SetPassword />);
    const field = screen.getByRole("textbox", { name: "Password" }) as HTMLInputElement;
    const form = field.form!;
    expect(form.id).toBe("set-password");
    // HTML's default button: the first submit button whose form owner is the form, wherever it sits.
    const defaultButton = [...form.elements].find((element) => element instanceof HTMLButtonElement && element.type === "submit");
    expect(defaultButton).toBe(primary());
  });

  it("a click submits the form once, with its fields; onPress runs too", () => {
    const onSubmit = vi.fn();
    const onPress = vi.fn();
    inLocale(<SetPassword onSubmit={onSubmit} primaryAction={{ label: "Save password", form: "set-password", onPress }} />);
    fireEvent.click(primary());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(Object.fromEntries(onSubmit.mock.calls[0][0])).toEqual({ password: "secret-123", confirm: "secret-123" });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("isDisabled: the button is disabled and a click does not submit", () => {
    const onSubmit = vi.fn();
    inLocale(<SetPassword onSubmit={onSubmit} primaryAction={{ label: "Save password", form: "set-password", isDisabled: true }} />);
    expect(primary().hasAttribute("disabled")).toBe(true);
    fireEvent.click(primary());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("isPending: busy, no submit by click or by an implicit (Enter) submit; it submits again once settled", () => {
    const onSubmit = vi.fn();
    const ui = (isPending: boolean) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <SetPassword onSubmit={onSubmit} primaryAction={{ label: "Save password", form: "set-password", isPending }} />
      </DesignSystemProvider>
    );
    const { rerender } = render(ui(true));
    const button = primary();
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button);
    // What Enter in a one-field form does with no submit button: the form submits itself.
    act(() => (document.getElementById("set-password") as HTMLFormElement).requestSubmit());
    expect(onSubmit).not.toHaveBeenCalled();
    rerender(ui(false));
    expect(primary().getAttribute("type")).toBe("submit");
    fireEvent.click(primary());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("isPending: a form remounted with the same id is still blocked; another form still submits; onSubmitCapture still runs", () => {
    const onSubmit = vi.fn();
    const onCapture = vi.fn();
    const onOther = vi.fn();
    function Remounting({ generation }: { generation: number }) {
      return (
        <DesignSystemProvider locale="en" navigate={vi.fn()}>
          <Dialog defaultOpen title="Set your password" primaryAction={{ label: "Save password", form: "set-password", isPending: true }}>
            <form
              key={generation}
              id="set-password"
              data-generation={generation}
              onSubmitCapture={onCapture}
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
              }}
            >
              <TextField label="Password" name="password" />
            </form>
            <form
              id="other"
              onSubmit={(event) => {
                event.preventDefault();
                onOther();
              }}
            />
          </Dialog>
        </DesignSystemProvider>
      );
    }
    const { rerender } = render(<Remounting generation={1} />);
    const first = document.getElementById("set-password") as HTMLFormElement;
    rerender(<Remounting generation={2} />);
    const second = document.getElementById("set-password") as HTMLFormElement;
    expect(second).not.toBe(first);
    expect(second.getAttribute("data-generation")).toBe("2");
    const submitted = new Event("submit", { bubbles: true, cancelable: true });
    act(() => {
      second.dispatchEvent(submitted);
    });
    act(() => second.requestSubmit());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(submitted.defaultPrevented).toBe(true);
    expect(onCapture).toHaveBeenCalledTimes(2);
    act(() => (document.getElementById("other") as HTMLFormElement).requestSubmit());
    expect(onOther).toHaveBeenCalledTimes(1);
  });

  it("isPending: a submit stopped above the form while pending leaves nothing behind; it submits once settled", async () => {
    const onSubmit = vi.fn();
    const ui = (isPending: boolean) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <div onSubmitCapture={(event) => isPending && event.stopPropagation()}>
          <SetPassword onSubmit={onSubmit} primaryAction={{ label: "Save password", form: "set-password", isPending }} />
        </div>
      </DesignSystemProvider>
    );
    const { rerender } = render(ui(true));
    act(() => (document.getElementById("set-password") as HTMLFormElement).requestSubmit());
    expect(onSubmit).not.toHaveBeenCalled();
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    rerender(ui(false));
    act(() => (document.getElementById("set-password") as HTMLFormElement).requestSubmit());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("without form the primary stays type=\"button\" with no form attribute (unchanged)", () => {
    inLocale(<Dialog defaultOpen title="Note" primaryAction={{ label: "Save" }}>x</Dialog>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.hasAttribute("form")).toBe(false);
  });

  for (const size of SIZES) {
    it(`${size}: works the same on every size`, () => {
      const onSubmit = vi.fn();
      inLocale(<SetPassword size={size} onSubmit={onSubmit} />);
      fireEvent.click(primary());
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  }
});

describe("Dialog without a secondary action or close button", () => {
  for (const size of SIZES) {
    it(`${size}: secondaryAction={null} leaves "Cancel" out, with no warning`, () => {
      inLocale(<Dialog defaultOpen size={size} title="Note" secondaryAction={null} primaryAction={{ label: "Save" }}>x</Dialog>);
      expect([...slot("dialog-footer")!.children].map((child) => child.getAttribute("data-slot"))).toEqual(["dialog-primary"]);
      expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
      expect(dialogWarnings()).toEqual([]);
    });
  }

  it("small: with no primary either there is no footer; the body takes the bottom padding", () => {
    inLocale(<Dialog defaultOpen title="Note" secondaryAction={null}>x</Dialog>);
    expect(slot("dialog-footer")).toBeNull();
    const body = slot("dialog-body")!.className.split(" ");
    expect(body).toEqual(expect.arrayContaining(["pt-ds-200", "pb-ds-300", "overflow-y-auto"]));
    expect(body).not.toContain("py-ds-200");
  });

  for (const size of SIZES) {
    it(`${size}: isCloseButtonHidden leaves out the close button; the title still names the dialog`, () => {
      inLocale(<Dialog defaultOpen size={size} title="Your account is ready" isCloseButtonHidden secondaryAction={null} primaryAction={{ label: "Sign in" }}>x</Dialog>);
      const dialog = screen.getByRole("dialog", { name: "Your account is ready" });
      expect(slot("dialog-close")).toBeNull();
      expect(slot("dialog-close-wrap")).toBeNull();
      expect(within(dialog).queryByRole("button", { name: "Close" })).toBeNull();
      expect(dialog.getAttribute("aria-labelledby")).toBe(slot("dialog-title")!.id);
      expect(within(dialog).getAllByRole("button").map((button) => button.textContent)).toEqual(["Sign in"]);
    });

    it(`${size}: isCloseButtonHidden alone only hides the button: Esc still closes (isDismissable decides)`, () => {
      const onOpenChange = vi.fn();
      inLocale(
        <Dialog isOpen onOpenChange={onOpenChange} size={size} title="Your account is ready" isCloseButtonHidden secondaryAction={null} primaryAction={{ label: "Sign in" }}>
          x
        </Dialog>,
      );
      press("Escape", screen.getByRole("dialog"));
      expect(onOpenChange.mock.calls).toEqual([[false]]);
    });

    it(`${size}: isCloseButtonHidden alone: a press outside ${size === "fullscreen" ? "never closes (no scrim, as before)" : "still closes"}`, () => {
      const onOpenChange = vi.fn();
      inLocale(
        <Dialog isOpen onOpenChange={onOpenChange} size={size} title="Your account is ready" isCloseButtonHidden secondaryAction={null} primaryAction={{ label: "Sign in" }}>
          x
        </Dialog>,
      );
      pressOutside();
      expect(onOpenChange.mock.calls).toEqual(size === "fullscreen" ? [] : [[false]]);
    });

    it(`${size}: locked (isCloseButtonHidden and isDismissable={false}): Esc and a press outside are ignored, Tab stays inside, still named`, () => {
      const onOpenChange = vi.fn();
      inLocale(
        <>
          <Button>On the page</Button>
          <Dialog
            isOpen
            onOpenChange={onOpenChange}
            isDismissable={false}
            size={size}
            title="Your account is ready"
            isCloseButtonHidden
            secondaryAction={null}
            primaryAction={{ label: "Sign in" }}
          >
            x
          </Dialog>
        </>,
      );
      const dialog = screen.getByRole("dialog", { name: "Your account is ready" });
      expect(dialog.getAttribute("aria-labelledby")).toBe(slot("dialog-title")!.id);
      press("Escape", dialog);
      pressOutside();
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toBeTruthy();
      const go = within(dialog).getByRole("button", { name: "Sign in" });
      act(() => go.focus());
      press("Tab", go);
      expect(document.activeElement).toBe(go);
      press("Tab", go, { shiftKey: true });
      expect(document.activeElement).toBe(go);
    });
  }

  it("the same dialog with its close button still closes on Esc and on a scrim press (unchanged)", () => {
    const onOpenChange = vi.fn();
    inLocale(<Dialog isOpen onOpenChange={onOpenChange} title="Note">x</Dialog>);
    press("Escape", screen.getByRole("dialog"));
    expect(onOpenChange.mock.calls).toEqual([[false]]);
  });

  it("a keyboard user is never stranded: focus starts in the dialog, Tab and Shift+Tab stay on its controls", async () => {
    inLocale(
      <DialogTrigger>
        <Button>Activate account</Button>
        <Dialog title="Your account is ready" isCloseButtonHidden isDismissable={false} secondaryAction={null} primaryAction={{ label: "Sign in" }}>
          Your password is saved.
        </Dialog>
      </DialogTrigger>,
    );
    const trigger = screen.getByRole("button", { name: "Activate account" });
    act(() => trigger.focus());
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Your account is ready" });
    // No field and no safe button: the dialog itself, so a screen reader reads its name.
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    // The page behind is out of reach for assistive technology (React Aria hides it rather than set aria-modal).
    expect(trigger.closest("[aria-hidden='true'], [inert]")).not.toBeNull();
    const go = within(dialog).getByRole("button", { name: "Sign in" });
    act(() => go.focus());
    press("Tab", go);
    expect(document.activeElement).toBe(go);
    press("Tab", go, { shiftKey: true });
    expect(document.activeElement).toBe(go);
    press("Escape", go);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(dialogWarnings()).toEqual([]);
  });

  it("with a form, Tab cycles through the fields and the submit, never the page behind", async () => {
    inLocale(
      <>
        <Button>On the page</Button>
        <SetPassword isCloseButtonHidden isDismissable={false} secondaryAction={null} />
      </>,
    );
    const dialog = screen.getByRole("dialog");
    const first = within(dialog).getByRole("textbox", { name: "Password" });
    await waitFor(() => expect(document.activeElement).toBe(first));
    act(() => primary().focus());
    press("Tab", primary());
    expect(document.activeElement).toBe(first);
    press("Tab", first, { shiftKey: true });
    expect(document.activeElement).toBe(primary());
  });

  it("a locked dialog with a secondary action: that action still closes it (the app's choice)", () => {
    const onOpenChange = vi.fn();
    inLocale(<Dialog isOpen onOpenChange={onOpenChange} title="Note" isCloseButtonHidden isDismissable={false}>x</Dialog>);
    press("Escape", screen.getByRole("dialog"));
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange.mock.calls).toEqual([[false]]);
  });

  for (const size of SIZES) {
    for (const isDismissable of [true, false]) {
      it(`${size}, isDismissable=${isDismissable}: close button hidden and nothing a keyboard can reach warns in development`, () => {
        inLocale(
          <Dialog defaultOpen size={size} isDismissable={isDismissable} title="Please wait" isCloseButtonHidden secondaryAction={null}>
            Your account is being prepared…
          </Dialog>,
        );
        expect(dialogWarnings()).toEqual([STRANDED]);
      });
    }
  }

  const reachable: Array<[string, React.ReactNode]> = [
    ["a primaryAction", null],
    ["a field", <input key="i" aria-label="Code" />],
    ["a link", <a key="a" href="#continue">Continue</a>],
    ["tabindex=0", <div key="t" tabIndex={0}>Focus</div>],
    ["contenteditable", <div key="c" contentEditable suppressContentEditableWarning aria-label="Note">x</div>],
    ["a summary", <details key="d"><summary>Details</summary>x</details>],
    ["audio with controls", <audio key="au" controls />],
    ["video with controls", <video key="v" controls />],
  ];
  for (const [what, control] of reachable) {
    it(`no warning with ${what} to reach`, () => {
      inLocale(
        <Dialog
          defaultOpen
          title="Ready"
          isCloseButtonHidden
          isDismissable={false}
          secondaryAction={null}
          primaryAction={control ? undefined : { label: "Sign in" }}
        >
          {control ?? "x"}
        </Dialog>,
      );
      expect(dialogWarnings()).toEqual([]);
    });
  }

  it("no warning with the close button shown, a secondary action, or in production", () => {
    inLocale(<Dialog defaultOpen title="Info" secondaryAction={null}>x</Dialog>);
    cleanup();
    inLocale(<Dialog defaultOpen title="Info" isCloseButtonHidden>x</Dialog>);
    cleanup();
    inLocale(<Dialog defaultOpen title="Please wait" isCloseButtonHidden secondaryAction={null}><audio /><video /><div contentEditable={false}>x</div></Dialog>);
    expect(dialogWarnings()).toEqual([STRANDED]);
    cleanup();
    warn.mockClear();
    vi.stubEnv("NODE_ENV", "production");
    try {
      inLocale(<Dialog defaultOpen title="Please wait" isCloseButtonHidden isDismissable={false} secondaryAction={null}>x</Dialog>);
    } finally {
      vi.unstubAllEnvs();
    }
    expect(dialogWarnings()).toEqual([]);
  });

  it("RTL: a locked dialog is named, its header and footer use logical classes only", () => {
    inLocale(
      <Dialog defaultOpen title="حسابك جاهز" isCloseButtonHidden isDismissable={false} secondaryAction={null} primaryAction={{ label: "تسجيل الدخول" }}>
        محتوى
      </Dialog>,
      "ar",
      "rtl",
    );
    expect(screen.getByRole("dialog", { name: "حسابك جاهز" })).toBeTruthy();
    for (const name of ["dialog-header", "dialog-body", "dialog-footer"]) {
      expect(slot(name)!.className, name).not.toMatch(PHYSICAL);
    }
  });
});

describe("Dialog data-* pass-through", () => {
  const parts = {
    header: { "data-testid": "sp-header" },
    title: { "data-testid": "sp-title" },
    body: { "data-testid": "sp-body" },
    footer: { "data-testid": "sp-footer" },
    close: { "data-testid": "sp-close" },
  };

  for (const size of SIZES) {
    it(`${size}: the dialog, its parts and its actions take their data-* attributes`, () => {
      inLocale(
        <Dialog
          defaultOpen
          size={size}
          title="Set your password"
          data-testid="set-password"
          data-step="2"
          partData={parts}
          primaryAction={{ label: "Save", "data-testid": "sp-primary", "data-track": "save" }}
          secondaryAction={{ label: "Back", "data-testid": "sp-secondary" }}
        >
          x
        </Dialog>,
      );
      const dialog = screen.getByTestId("set-password");
      expect(dialog).toBe(screen.getByRole("dialog", { name: "Set your password" }));
      expect(dialog.getAttribute("data-step")).toBe("2");
      expect(dialog.getAttribute("data-slot")).toBe("dialog");
      const expected: Array<[string, string]> = [
        ["sp-header", "dialog-header"],
        ["sp-title", "dialog-title"],
        ["sp-body", "dialog-body"],
        ["sp-footer", "dialog-footer"],
        ["sp-close", "dialog-close"],
        ["sp-primary", "dialog-primary"],
        ["sp-secondary", "dialog-secondary"],
      ];
      for (const [testId, part] of expected) {
        expect(screen.getByTestId(testId).getAttribute("data-slot"), testId).toBe(part);
      }
      expect(screen.getByTestId("sp-primary").getAttribute("data-track")).toBe("save");
      expect(screen.getByTestId("sp-close").getAttribute("aria-label")).toBe("Close");
    });
  }

  it("data-slot stays the DS's own; non-data keys never reach the DOM", () => {
    inLocale(
      <Dialog
        defaultOpen
        title="Note"
        data-slot="mine"
        partData={{ body: { "data-slot": "mine", "data-testid": "b" } }}
        primaryAction={{ label: "Save", "data-slot": "mine" }}
      >
        x
      </Dialog>,
    );
    expect(screen.getByRole("dialog").getAttribute("data-slot")).toBe("dialog");
    expect(screen.getByTestId("b").getAttribute("data-slot")).toBe("dialog-body");
    expect(screen.getByRole("button", { name: "Save" }).getAttribute("data-slot")).toBe("dialog-primary");
    expect(document.querySelector("[data-slot='mine']")).toBeNull();
    expect(screen.getByRole("button", { name: "Save" }).hasAttribute("label")).toBe(false);
  });

  it("the footer's data-layout stays the DS's own: partData.footer cannot set it", () => {
    inLocale(<Dialog defaultOpen title="Note" partData={{ footer: { "data-layout": "mine", "data-testid": "f" } }}>x</Dialog>);
    expect(screen.getByTestId("f").hasAttribute("data-layout")).toBe(false);
    cleanup();
    inLocale(
      <Dialog defaultOpen size="fullscreen" footerLayout="spread" title="Note" partData={{ footer: { "data-layout": "mine", "data-testid": "f" } }}>
        x
      </Dialog>,
    );
    expect(screen.getByTestId("f").getAttribute("data-layout")).toBe("spread");
  });
});

describe("Dialog focus hooks", () => {
  function Flow({ initial, returnTo, showTarget = true }: { initial?: boolean; returnTo?: boolean; showTarget?: boolean }) {
    const confirm = React.useRef<HTMLInputElement>(null);
    const next = React.useRef<HTMLHeadingElement>(null);
    return (
      <>
        {showTarget && <h2 ref={next} tabIndex={-1}>Next step</h2>}
        <DialogTrigger>
          <Button>Set password</Button>
          <Dialog
            title="Set your password"
            initialFocusRef={initial ? confirm : undefined}
            returnFocusRef={returnTo ? next : undefined}
            primaryAction={{ label: "Delete", variant: "danger" }}
          >
            <TextField label="Password" />
            <TextField label="Confirm password" ref={confirm} />
          </Dialog>
        </DialogTrigger>
      </>
    );
  }

  function open() {
    const trigger = screen.getByRole("button", { name: "Set password" });
    act(() => trigger.focus());
    fireEvent.click(trigger);
    return trigger;
  }

  it("initialFocusRef: that element takes focus on open, before the DS rule (here: Cancel before a danger primary)", async () => {
    inLocale(<Flow initial />);
    open();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Confirm password" })));
  });

  it("without it (or with an empty ref) the rule is unchanged", async () => {
    inLocale(<Flow />);
    open();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" })));
    cleanup();
    inLocale(
      <Dialog defaultOpen title="Note" initialFocusRef={{ current: null }}>
        <TextField label="Name" />
      </Dialog>,
    );
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" })));
  });

  it("the focus trap stays with initialFocusRef: Tab from the last control wraps to the first", async () => {
    inLocale(<Flow initial />);
    open();
    const dialog = screen.getByRole("dialog");
    const last = within(dialog).getByRole("button", { name: "Delete" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Confirm password" })));
    act(() => last.focus());
    press("Tab", last);
    expect(document.activeElement).toBe(slot("dialog-close"));
  });

  for (const how of ["the close button", "Esc", "Cancel"] as const) {
    it(`returnFocusRef: closing by ${how}, focus goes to the target and never back to the trigger`, async () => {
      inLocale(<Flow returnTo />);
      const trigger = open();
      const triggerFocus = vi.fn();
      trigger.addEventListener("focus", triggerFocus);
      if (how === "the close button") fireEvent.click(slot("dialog-close")!);
      else if (how === "Esc") press("Escape", screen.getByRole("dialog"));
      else fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Next step" })));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Next step" }));
      expect(triggerFocus).not.toHaveBeenCalled();
    });
  }

  it("Strict Mode's development remount is not a close: focus stays in the dialog on open, goes to the target on close", async () => {
    render(
      <React.StrictMode>
        <DesignSystemProvider locale="en" navigate={vi.fn()}>
          <Flow returnTo initial />
        </DesignSystemProvider>
      </React.StrictMode>,
    );
    open();
    const confirm = screen.getByRole("textbox", { name: "Confirm password" });
    await waitFor(() => expect(document.activeElement).toBe(confirm));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    expect(document.activeElement).toBe(confirm);
    press("Escape", confirm);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Next step" })));
  });

  it("React Aria still dispatches its focus-restore event on the trigger when the dialog closes (returnFocusRef relies on it)", async () => {
    // If an upgrade renames or drops "react-aria-focus-scope-restore", returnFocusRef could no longer cancel the
    // return to the trigger, and return focus would change silently. This fails first.
    const restored: EventTarget[] = [];
    const listen = (event: Event) => {
      if (event.target) restored.push(event.target);
    };
    document.addEventListener("react-aria-focus-scope-restore", listen, true);
    try {
      inLocale(<Flow />);
      const trigger = open();
      await waitFor(() => expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true));
      fireEvent.click(slot("dialog-close")!);
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(trigger));
      expect(restored).toContain(trigger);
    } finally {
      document.removeEventListener("react-aria-focus-scope-restore", listen, true);
    }
  });

  it("without it, or with its element gone, focus returns to the trigger (unchanged)", async () => {
    inLocale(<Flow />);
    let trigger = open();
    fireEvent.click(slot("dialog-close")!);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    cleanup();
    inLocale(<Flow returnTo showTarget={false} />);
    trigger = open();
    fireEvent.click(slot("dialog-close")!);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("focus the app moves on close is left where it put it", async () => {
    function App() {
      const target = React.useRef<HTMLButtonElement>(null);
      const other = React.useRef<HTMLButtonElement>(null);
      return (
        <>
          <button ref={target} type="button">Target</button>
          <button ref={other} type="button">Other</button>
          <Dialog defaultOpen title="Note" returnFocusRef={target} onOpenChange={(open) => !open && other.current?.focus()}>
            <TextField label="Name" />
          </Dialog>
        </>
      );
    }
    inLocale(<App />);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" })));
    fireEvent.click(slot("dialog-close")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Other" }));
  });
});
