import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Tour, type TourProps } from "./index";
import { placePanel } from "./tour";

afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

const press = (key: string, target: Element) => {
  fireEvent.keyDown(target, { key });
  fireEvent.keyUp(target, { key });
};

/** A page with two targets and a tour over them; the targets are found through functions (jsdom has no layout). */
function Page(props: Partial<TourProps>) {
  const orders = React.useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={orders} type="button">
        Orders
      </button>
      <Tour
        defaultOpen
        steps={[
          { id: "orders", target: () => orders.current, title: "Your orders", description: "Every order, newest first." },
          { id: "search", target: orders, title: "Find anything", description: "Search by name or number." },
          { id: "done", title: "That's it" },
        ]}
        {...props}
      />
    </>
  );
}

const panel = () => document.querySelector<HTMLElement>('[data-slot="tour"]')!;
const nextButton = () => document.querySelector<HTMLElement>('[data-slot="tour-next"]')!;

describe("Tour", () => {
  it("a modal dialog named by the step's title, with its progress, Next, Back and Done", async () => {
    const onStepChange = vi.fn();
    const onFinish = vi.fn();
    const onSkip = vi.fn();
    inLocale(<Page onStepChange={onStepChange} onFinish={onFinish} onSkip={onSkip} />);
    const dialog = await screen.findByRole("dialog", { name: "Your orders" });
    expect(dialog).toBe(panel());
    expect(document.querySelector('[data-slot="tour-overlay"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="tour-spotlight"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="tour-progress"]')!.textContent).toBe("Step 1 of 3");
    expect(document.querySelector('[data-slot="tour-back"]')).toBeNull();
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    expect(document.getElementById(dialog.getAttribute("aria-describedby")!)!.textContent).toBe("Every order, newest first.");

    fireEvent.click(nextButton());
    expect(onStepChange).toHaveBeenLastCalledWith(1);
    await screen.findByRole("dialog", { name: "Find anything" });
    expect(document.querySelector('[data-slot="tour-progress"]')!.textContent).toBe("Step 2 of 3");

    fireEvent.click(document.querySelector<HTMLElement>('[data-slot="tour-back"]')!);
    expect(onStepChange).toHaveBeenLastCalledWith(0);
    await screen.findByRole("dialog", { name: "Your orders" });

    fireEvent.click(nextButton());
    fireEvent.click(nextButton());
    // The last step has no target: a centred panel on a full dimming, Done instead of Next.
    await screen.findByRole("dialog", { name: "That's it" });
    expect(panel().dataset.side).toBe("center");
    expect(document.querySelector('[data-slot="tour-spotlight"]')).toBeNull();
    expect(nextButton().textContent).toBe("Done");
    fireEvent.click(nextButton());
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();
    await waitFor(() => expect(panel()).toBeNull());
  });

  it("Skip, the close button and Esc skip the tour, never finish it", async () => {
    for (const leave of ["skip", "close", "escape"] as const) {
      const onFinish = vi.fn();
      const onSkip = vi.fn();
      const onOpenChange = vi.fn();
      inLocale(<Page onFinish={onFinish} onSkip={onSkip} onOpenChange={onOpenChange} />);
      await screen.findByRole("dialog", { name: "Your orders" });
      if (leave === "skip") fireEvent.click(screen.getByRole("button", { name: "Skip" }));
      else if (leave === "close") fireEvent.click(screen.getByRole("button", { name: "Close" }));
      else press("Escape", document.querySelector('[data-slot="tour-title"]')!);
      expect(onSkip, leave).toHaveBeenCalledTimes(1);
      expect(onFinish, leave).not.toHaveBeenCalled();
      expect(onOpenChange, leave).toHaveBeenLastCalledWith(false);
      cleanup();
    }
  });

  it("each step's heading takes focus; the arrow keys move between steps, mirrored right to left", async () => {
    inLocale(<Page />);
    await screen.findByRole("dialog", { name: "Your orders" });
    await waitFor(() => expect(document.activeElement).toBe(document.querySelector('[data-slot="tour-title"]')));
    press("ArrowRight", document.activeElement!);
    await screen.findByRole("dialog", { name: "Find anything" });
    await waitFor(() => expect(document.activeElement?.textContent).toBe("Find anything"));
    press("ArrowLeft", document.activeElement!);
    await screen.findByRole("dialog", { name: "Your orders" });
    cleanup();

    inLocale(<Page />, "ar");
    await screen.findByRole("dialog", { name: "Your orders" });
    await waitFor(() => expect(document.activeElement).toBe(document.querySelector('[data-slot="tour-title"]')));
    press("ArrowLeft", document.activeElement!);
    await screen.findByRole("dialog", { name: "Find anything" });
  });

  it("isKeyboardNavigationDisabled leaves the arrow keys alone", async () => {
    inLocale(<Page isKeyboardNavigationDisabled />);
    await screen.findByRole("dialog", { name: "Your orders" });
    press("ArrowRight", document.querySelector('[data-slot="tour-title"]')!);
    expect(screen.getByRole("dialog", { name: "Your orders" })).toBeTruthy();
  });

  it("mask={false}: no dimming, the page stays usable, and Esc in the panel still skips", async () => {
    const onSkip = vi.fn();
    const onPage = vi.fn();
    inLocale(
      <>
        <button type="button" onClick={onPage}>
          Elsewhere
        </button>
        <Page mask={false} onSkip={onSkip} />
      </>,
    );
    await screen.findByRole("dialog", { name: "Your orders" });
    expect(document.querySelector('[data-slot="tour-overlay"]')).toBeNull();
    expect(document.querySelector('[data-slot="tour-spotlight"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(onPage).toHaveBeenCalledTimes(1);
    press("Escape", document.querySelector('[data-slot="tour-title"]')!);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("a target that never appears: centred after the timeout, or skipped in the direction of travel", async () => {
    inLocale(<Tour defaultOpen targetTimeout={150} steps={[{ target: "#nowhere", title: "Missing" }, { title: "Second" }]} />);
    // Hidden while it waits, so it never shows in the wrong place.
    await waitFor(() => expect(panel()?.className).toContain("invisible"));
    await waitFor(() => expect(panel().className).not.toContain("invisible"), { timeout: 1000 });
    expect(panel().dataset.side).toBe("center");
    expect(screen.getByRole("dialog", { name: "Missing" })).toBeTruthy();
    cleanup();

    const onStepChange = vi.fn();
    inLocale(<Tour defaultOpen targetTimeout={150} missingTarget="skip" onStepChange={onStepChange} steps={[{ target: "#nowhere", title: "Missing" }, { title: "Second" }]} />);
    await waitFor(() => expect(onStepChange).toHaveBeenCalledWith(1), { timeout: 1000 });
    await screen.findByRole("dialog", { name: "Second" });
  });

  it("controlled: step and isOpen come from the app", async () => {
    function Controlled() {
      const [step, setStep] = React.useState(2);
      const [open, setOpen] = React.useState(true);
      return (
        <>
          <span data-testid="state">{`${open}:${step}`}</span>
          <Tour isOpen={open} onOpenChange={setOpen} step={step} onStepChange={setStep} steps={[{ title: "One" }, { title: "Two" }, { title: "Three" }]} />
        </>
      );
    }
    inLocale(<Controlled />);
    await screen.findByRole("dialog", { name: "Three" });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await screen.findByRole("dialog", { name: "Two" });
    expect(screen.getByTestId("state").textContent).toBe("true:1");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Skip" })));
    expect(screen.getByTestId("state").textContent).toBe("false:1");
    expect(panel()).toBeNull();
  });

  it("one step has no progress line; showProgress={false} hides it", async () => {
    inLocale(<Tour defaultOpen steps={[{ title: "Only" }]} />);
    await screen.findByRole("dialog", { name: "Only" });
    expect(document.querySelector('[data-slot="tour-progress"]')).toBeNull();
    cleanup();
    inLocale(<Tour defaultOpen showProgress={false} steps={[{ title: "One" }, { title: "Two" }]} />);
    await screen.findByRole("dialog", { name: "One" });
    expect(document.querySelector('[data-slot="tour-progress"]')).toBeNull();
  });
});

describe("placePanel", () => {
  const viewport = { width: 1024, height: 768 };
  const panelSize = { width: 320, height: 160 };
  const box = (top: number, left: number, width = 100, height = 40) => ({ top, left, width, height, bottom: top + height, right: left + width });

  it("the preferred side when it has room, centred on the target along the other axis", () => {
    expect(placePanel(box(100, 400), panelSize, "bottom", viewport)).toEqual({ side: "bottom", top: 152, left: 290 });
  });

  it("flips to the opposite side, then the others, when there is no room", () => {
    expect(placePanel(box(650, 400), panelSize, "bottom", viewport)?.side).toBe("top");
    expect(placePanel(box(20, 20, 100, 730), panelSize, "bottom", viewport)?.side).toBe("right");
  });

  it("keeps the panel on screen along the cross axis", () => {
    expect(placePanel(box(100, 0, 40), panelSize, "bottom", viewport)?.left).toBe(16);
    expect(placePanel(box(100, 1000, 20), panelSize, "bottom", viewport)?.left).toBe(1024 - 320 - 16);
  });

  it("null (a centred panel) when no side has room, as for a full-screen target on a phone", () => {
    expect(placePanel(box(0, 0, 320, 640), panelSize, "bottom", { width: 320, height: 640 })).toBeNull();
  });
});
