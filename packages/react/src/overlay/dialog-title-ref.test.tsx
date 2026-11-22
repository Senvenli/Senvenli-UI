import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { TextField } from "../form/text-field";
import { DesignSystemProvider } from "../provider";
import { Dialog, DialogTrigger, type DialogProps } from "./index";

/**
 * Dialog `titleRef`: the title's heading takes a ref and `tabIndex={-1}`, so an app can move focus to it (a
 * completion view, say), on open through `initialFocusRef={titleRef}` or later from code. It stays the dialog's
 * heading and name. Left out, the heading renders as before.
 */

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
const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

const SIZES = ["small", "medium", "large", "xlarge", "fullscreen"] as const;
const FOCUSABLE_CLASSES = [
  "-mx-ds-050",
  "px-ds-050",
  "outline-hidden",
  "focus-visible:rounded-ds-small",
  "focus-visible:inset-ring-2",
  "focus-visible:inset-ring-ds-border-focused",
];

/** A dialog with a title ref; `initial` opens on the title. */
function Titled({ initial = true, ...props }: Partial<DialogProps> & { initial?: boolean }) {
  const title = React.useRef<HTMLHeadingElement>(null);
  return (
    <Dialog defaultOpen title="Your account is ready" titleRef={title} initialFocusRef={initial ? title : undefined} {...props}>
      {props.children ?? <TextField label="Name" />}
    </Dialog>
  );
}

describe("Dialog titleRef", () => {
  it("the ref holds the title's heading, which takes tabIndex -1 and stays the dialog's level-2 heading and name", () => {
    const title = React.createRef<HTMLHeadingElement>();
    inLocale(<Dialog defaultOpen title="Your account is ready" titleRef={title}>Your password is saved.</Dialog>);
    const heading = screen.getByRole("heading", { name: "Your account is ready", level: 2 });
    expect(title.current).toBe(heading);
    expect(heading.tagName).toBe("H2");
    expect(heading.getAttribute("tabindex")).toBe("-1");
    expect(heading.getAttribute("data-slot")).toBe("dialog-title");
    expect(heading.id).not.toBe("");
    const dialog = screen.getByRole("dialog", { name: "Your account is ready" });
    expect(dialog.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(heading.className.split(" ")).toEqual(["m-0", "text-heading-medium", ...FOCUSABLE_CLASSES]);
  });

  it("a callback ref gets the heading too", () => {
    const seen: (HTMLHeadingElement | null)[] = [];
    inLocale(<Dialog defaultOpen title="Note" titleRef={(element) => { seen.push(element); }}>x</Dialog>);
    expect(seen[0]).toBe(screen.getByRole("heading", { name: "Note" }));
  });

  for (const size of SIZES) {
    it(`${size}: with initialFocusRef={titleRef} focus lands on the heading on open, ahead of the first field`, async () => {
      inLocale(<Titled size={size} />);
      const heading = screen.getByRole("heading", { name: "Your account is ready" });
      await waitFor(() => expect(document.activeElement).toBe(heading));
      await frames();
      expect(document.activeElement).toBe(heading);
    });
  }

  it("ahead of the safe secondary action too (a danger primary)", async () => {
    inLocale(<Titled primaryAction={{ label: "Delete", tone: "danger" }}>This cannot be undone.</Titled>);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your account is ready" })));
  });

  it("titleRef alone does not move first focus: the DS rule (the first field) is unchanged", async () => {
    inLocale(<Titled initial={false} />);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" })));
  });

  it("the heading is never a Tab stop: Tab from it goes on to the controls, and the trap wraps past it", async () => {
    inLocale(<Titled primaryAction={{ label: "Sign in" }} />);
    const heading = screen.getByRole("heading", { name: "Your account is ready" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    const dialog = screen.getByRole("dialog");
    const go = within(dialog).getByRole("button", { name: "Sign in" });
    act(() => go.focus());
    press("Tab", go);
    expect(document.activeElement).toBe(slot("dialog-close"));
    press("Tab", slot("dialog-close")!, { shiftKey: true });
    expect(document.activeElement).toBe(go);
  });

  it("a later step moves focus to the title from code, with the dialog open", async () => {
    function Steps() {
      const title = React.useRef<HTMLHeadingElement>(null);
      const [done, setDone] = React.useState(false);
      return (
        <Dialog
          defaultOpen
          title={done ? "Your account is ready" : "Set your password"}
          titleRef={title}
          primaryAction={done ? { label: "Sign in" } : { label: "Save", onPress: () => { setDone(true); requestAnimationFrame(() => title.current?.focus()); } }}
        >
          {done ? "Your password is saved." : <TextField label="Password" />}
        </Dialog>
      );
    }
    inLocale(<Steps />);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Password" })));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your account is ready" })));
    expect(screen.getByRole("dialog", { name: "Your account is ready" })).toBeTruthy();
  });

  // An sr-only heading would show no focus indicator, so a hidden title is never a focus target.
  it("isTitleHidden (fullscreen): the hidden title holds the ref and names the dialog, but is never a focus target", async () => {
    const title = React.createRef<HTMLHeadingElement>();
    inLocale(
      <Dialog defaultOpen size="fullscreen" isTitleHidden headerLeading={<span>Logo</span>} title="Your account is ready" titleRef={title} initialFocusRef={title}>
        <TextField label="Name" />
      </Dialog>,
    );
    const heading = screen.getByRole("heading", { name: "Your account is ready" });
    expect(title.current).toBe(heading);
    // sr-only alone: no tabIndex, no focus ring, and no margin or padding partly overriding sr-only's.
    expect(heading.className.split(" ")).toEqual(["sr-only"]);
    expect(heading.hasAttribute("tabindex")).toBe(false);
    expect(screen.getByRole("dialog").getAttribute("aria-labelledby")).toBe(heading.id);
    // initialFocusRef={titleRef} falls through to the dialog's own rule: the first field.
    const field = screen.getByRole("textbox", { name: "Name" });
    await waitFor(() => expect(document.activeElement).toBe(field));
    await frames();
    expect(document.activeElement).toBe(field);
    // Focusing it from code does nothing: focus stays on the visible field.
    act(() => title.current?.focus());
    expect(document.activeElement).toBe(field);
  });

  it("isTitleHidden with a danger primary: the hidden title falls through to the safe secondary action", async () => {
    inLocale(<Titled size="fullscreen" isTitleHidden primaryAction={{ label: "Delete", tone: "danger" }}>This cannot be undone.</Titled>);
    await waitFor(() => expect(document.activeElement).toBe(slot("dialog-secondary")));
  });

  it("isTitleHidden markup with titleRef is the same as without it", () => {
    const html = (withRef: boolean) => {
      const view = inLocale(
        <Dialog defaultOpen size="fullscreen" isTitleHidden headerLeading={<span>Logo</span>} title="Your account is ready" titleRef={withRef ? React.createRef() : undefined}>
          x
        </Dialog>,
      );
      const markup = slot("dialog-header")!.outerHTML.replace(/ id="[^"]*"/g, "");
      view.unmount();
      return markup;
    };
    expect(html(true)).toBe(html(false));
  });

  it("headerLeading (fullscreen): the truncating title keeps its classes, with the focus ring after them", () => {
    inLocale(<Titled size="fullscreen" headerLeading={<span>Logo</span>} />);
    expect(screen.getByRole("heading", { name: "Your account is ready" }).className.split(" ")).toEqual(["m-0", "truncate", "text-heading-medium", ...FOCUSABLE_CLASSES]);
  });

  it("partData.title still reaches the heading; data-slot stays the DS's own", () => {
    inLocale(<Titled partData={{ title: { "data-testid": "heading", "data-slot": "x" } as never }} />);
    const heading = screen.getByTestId("heading");
    expect(heading.getAttribute("data-slot")).toBe("dialog-title");
    expect(heading.getAttribute("tabindex")).toBe("-1");
  });

  for (const how of ["Esc", "the close button"] as const) {
    it(`closing by ${how} returns focus to the trigger, as without it`, async () => {
      function Flow() {
        const title = React.useRef<HTMLHeadingElement>(null);
        return (
          <DialogTrigger>
            <Button>Open</Button>
            <Dialog title="Your account is ready" titleRef={title} initialFocusRef={title}>Your password is saved.</Dialog>
          </DialogTrigger>
        );
      }
      inLocale(<Flow />);
      const trigger = screen.getByRole("button", { name: "Open" });
      act(() => trigger.focus());
      fireEvent.click(trigger);
      const heading = await screen.findByRole("heading", { name: "Your account is ready" });
      await waitFor(() => expect(document.activeElement).toBe(heading));
      if (how === "Esc") press("Escape", heading);
      else fireEvent.click(slot("dialog-close")!);
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(trigger));
    });
  }

  it("returnFocusRef still wins on close", async () => {
    function Flow() {
      const title = React.useRef<HTMLHeadingElement>(null);
      const next = React.useRef<HTMLHeadingElement>(null);
      return (
        <>
          <h2 ref={next} tabIndex={-1}>Next step</h2>
          <DialogTrigger>
            <Button>Open</Button>
            <Dialog title="Your account is ready" titleRef={title} initialFocusRef={title} returnFocusRef={next}>x</Dialog>
          </DialogTrigger>
        </>
      );
    }
    inLocale(<Flow />);
    const trigger = screen.getByRole("button", { name: "Open" });
    act(() => trigger.focus());
    fireEvent.click(trigger);
    const heading = await screen.findByRole("heading", { name: "Your account is ready" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    press("Escape", heading);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Next step" })));
  });

  it("RTL: the same focus and naming, and only logical or symmetric classes on the title", async () => {
    inLocale(<Titled />, "ar", "rtl");
    const heading = screen.getByRole("heading", { name: "Your account is ready" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(heading.className).not.toMatch(/(^|\s|:)(-?m[lr]-|p[lr]-|rounded-[lr]-|text-left|text-right)/);
  });

  it("Strict Mode: focus lands on the heading and stays", async () => {
    render(
      <React.StrictMode>
        <DesignSystemProvider locale="en" navigate={vi.fn()}>
          <Titled />
        </DesignSystemProvider>
      </React.StrictMode>,
    );
    const heading = screen.getByRole("heading", { name: "Your account is ready" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    await frames();
    expect(document.activeElement).toBe(heading);
  });

  it("without titleRef (or with null) the heading has no tabindex and its classes are those before", () => {
    for (const titleRef of [undefined, null]) {
      inLocale(<Dialog defaultOpen title="Note" titleRef={titleRef}>x</Dialog>);
      const heading = screen.getByRole("heading", { name: "Note" });
      expect(heading.hasAttribute("tabindex")).toBe(false);
      expect(heading.className).toBe("m-0 text-heading-medium");
      cleanup();
    }
  });
});
