import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Button } from "../action/index";
import { Tooltip } from "./index";

// Tooltip openOnTouch: so a phone can read a name that has no room on screen (a country behind its flag), a touch
// tap toggles the tooltip and a tap elsewhere closes it; mouse and keyboard keep the shared behaviour.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  // React Aria ignores emulated mouse events for a moment after a touch, on a timer: let it run out, so a touch
  // in one test never hides the next test's mouse hover.
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
});

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
      <p>Somewhere else</p>
    </div>,
  );
}

const pointer = (pointerType: string) => ({ pointerType, pointerId: 1, isPrimary: true, width: 1, height: 1 });
/** A finger tap: pointer down and up (then the browser's compatibility click). */
function tap(element: Element) {
  act(() => {
    fireEvent.pointerDown(element, { ...pointer("touch"), buttons: 1 });
    fireEvent.pointerUp(element, { ...pointer("touch"), buttons: 0 });
    fireEvent.click(element, { detail: 1 });
  });
}
/** A touch that turns into a scroll: the browser cancels the pointer, so no pointerup follows. */
function scrollTouch(element: Element) {
  act(() => {
    fireEvent.pointerDown(element, { ...pointer("touch"), buttons: 1 });
    fireEvent.pointerCancel(element, pointer("touch"));
  });
}
function mouseClick(element: Element) {
  act(() => {
    fireEvent.pointerDown(element, { ...pointer("mouse"), buttons: 1 });
    fireEvent.mouseDown(element, { detail: 1, buttons: 1 });
    fireEvent.pointerUp(element, { ...pointer("mouse"), buttons: 0 });
    fireEvent.mouseUp(element, { detail: 1 });
    fireEvent.click(element, { detail: 1 });
  });
}

const tooltip = () => screen.queryByRole("tooltip");
/** A flag: a focusable image named after the country. */
const flag = (props: Partial<React.ComponentProps<typeof Tooltip>> = {}) => (
  <Tooltip content="Montenegro" openOnTouch {...props}>
    <span role="img" aria-label="Montenegro">ME</span>
  </Tooltip>
);

describe("Tooltip openOnTouch", () => {
  it("a tap opens it at once; a second tap on the trigger closes it", () => {
    inLocale(flag());
    const trigger = screen.getByRole("img", { name: "Montenegro" });
    tap(trigger);
    expect(tooltip()!.textContent).toBe("Montenegro");
    tap(trigger);
    expect(tooltip()).toBeNull();
    tap(trigger);
    expect(tooltip()).not.toBeNull();
  });

  it("a tap anywhere else closes it; a tap on the bubble itself leaves it open", () => {
    inLocale(flag());
    tap(screen.getByRole("img", { name: "Montenegro" }));
    tap(tooltip()!);
    expect(tooltip()).not.toBeNull();
    tap(screen.getByText("Somewhere else"));
    expect(tooltip()).toBeNull();
  });

  it("Esc closes a tapped-open tooltip", () => {
    inLocale(flag());
    tap(screen.getByRole("img", { name: "Montenegro" }));
    act(() => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    });
    expect(tooltip()).toBeNull();
  });

  it("a touch that becomes a scroll (pointercancel) changes nothing", () => {
    inLocale(flag());
    scrollTouch(screen.getByRole("img", { name: "Montenegro" }));
    expect(tooltip()).toBeNull();
  });

  it("screen readers: the open tooltip is a role=tooltip that describes the trigger, which keeps its own name", () => {
    inLocale(flag());
    const trigger = screen.getByRole("img", { name: "Montenegro" });
    tap(trigger);
    const bubble = screen.getByRole("tooltip");
    expect(trigger.getAttribute("aria-describedby")).toBe(bubble.id);
    expect(trigger.getAttribute("aria-label")).toBe("Montenegro");
  });

  it("keyboard focus still opens it at once and Esc hides it, as without the prop", () => {
    inLocale(flag());
    const trigger = screen.getByRole("img", { name: "Montenegro" });
    expect(trigger.getAttribute("tabindex")).toBe("0");
    act(() => {
      fireEvent.keyDown(document.body, { key: "Tab" });
      trigger.focus();
    });
    expect(tooltip()!.textContent).toBe("Montenegro");
    act(() => {
      fireEvent.keyDown(trigger, { key: "Escape" });
    });
    expect(tooltip()).toBeNull();
  });

  it("mouse hover still waits 300ms; a mouse click does not toggle it open", () => {
    inLocale(flag());
    const trigger = screen.getByRole("img", { name: "Montenegro" });
    // React Aria opens tooltips on hover only once the user is on a pointer; a move sets that, as in a browser.
    act(() => {
      fireEvent.pointerMove(document.body, { pointerType: "mouse" });
      fireEvent.pointerDown(document.body, { pointerType: "mouse" });
      fireEvent.pointerUp(document.body, { pointerType: "mouse" });
      fireEvent.pointerOver(trigger, { pointerType: "mouse" });
      fireEvent.mouseOver(trigger);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(tooltip()).toBeNull();
    expect(tooltip()).toBeNull();
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(tooltip()).not.toBeNull();
    act(() => {
      fireEvent.pointerOut(trigger, { pointerType: "mouse" });
      fireEvent.mouseOut(trigger);
    });
    expect(tooltip()).toBeNull();
    mouseClick(trigger);
    expect(tooltip()).toBeNull();
  });

  it("only one is open: tapping another flag closes the first", () => {
    inLocale(
      <>
        {flag()}
        <Tooltip content="Norway" openOnTouch><span role="img" aria-label="Norway">NO</span></Tooltip>
      </>,
    );
    tap(screen.getByRole("img", { name: "Montenegro" }));
    tap(screen.getByRole("img", { name: "Norway" }));
    expect(screen.getAllByRole("tooltip").map((element) => element.textContent)).toEqual(["Norway"]);
  });

  it("on a DS button a tap toggles the tooltip and still presses the button", () => {
    const onPress = vi.fn();
    inLocale(
      <Tooltip content="Edit" openOnTouch>
        <Button iconOnly iconBefore="pencil" aria-label="Edit" onPress={onPress} />
      </Tooltip>,
    );
    const button = screen.getByRole("button", { name: "Edit" });
    tap(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(tooltip()!.textContent).toBe("Edit");
  });

  it("RTL in ar: the tap opens it the same way; the wrapper adds no box (display: contents)", () => {
    inLocale(flag(), "ar", "rtl");
    const wrapper = document.querySelector("[data-slot='tooltip-touch']")!;
    expect(wrapper.getAttribute("class")).toBe("contents");
    tap(screen.getByRole("img", { name: "Montenegro" }));
    expect(tooltip()!.textContent).toBe("Montenegro");
  });

  it("without openOnTouch a tap never opens it, and the DOM has no wrapper (client and server)", () => {
    const plain = (
      <Tooltip content="Montenegro">
        <span role="img" aria-label="Montenegro">ME</span>
      </Tooltip>
    );
    inLocale(plain);
    tap(screen.getByRole("img", { name: "Montenegro" }));
    expect(tooltip()).toBeNull();
    expect(document.querySelector("[data-slot='tooltip-touch']")).toBeNull();
    const server = (ui: React.ReactElement) => renderToStaticMarkup(<DesignSystemProvider locale="en" navigate={() => {}}>{ui}</DesignSystemProvider>);
    expect(server(<Tooltip content="Montenegro" openOnTouch={false}><span role="img" aria-label="Montenegro">ME</span></Tooltip>)).toBe(server(plain));
  });
});
