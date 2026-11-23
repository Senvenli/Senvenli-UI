import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DS_STRINGS, registerDsStrings } from "../i18n";
import { Stepper } from "./index";
import type { StepStatus } from "./stepper";

/** The old per-flow maps written onto the steps (completedSteps, stepStatus, statusText → isDone, status, statusText). */
function withStatus<S extends { id: string }>(
  steps: readonly S[],
  maps: { completed?: Iterable<string>; status?: Partial<Record<string, StepStatus>>; text?: Partial<Record<string, string>> },
) {
  const completed = maps.completed ? new Set(maps.completed) : undefined;
  return steps.map((step) => ({ ...step, isDone: completed ? completed.has(step.id) : undefined, status: maps.status?.[step.id], statusText: maps.text?.[step.id] }));
}


const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  warn.mockRestore();
});

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

const FLOW = [
  { id: "profile", label: "Profile" },
  { id: "team", label: "Team" },
  { id: "addons", label: "Add-ons" },
  { id: "confirm", label: "Review and confirm" },
];

const JOURNEY = [
  { id: "account", label: "Account" },
  { id: "plan", label: "Plan and billing" },
  { id: "domain", label: "Domain" },
  { id: "workspace", label: "Workspace" },
  { id: "live", label: "Live" },
];

const ORIENTATIONS = ["horizontal", "vertical"] as const;
const steps = () => Array.from(document.querySelectorAll("[data-slot='stepper-step']"));
const states = () => steps().map((step) => step.getAttribute("data-state"));
const classesOf = (element: Element | null) => element?.getAttribute("class") ?? "";
// React Aria's generated ids count up across renders; everything else must match byte for byte.
const markup = (html: string) => html.replace(/ id="react-aria-[^"]*"/g, "");
const allClasses = () => Array.from(document.querySelectorAll("[class]")).map(classesOf).join(" ");

describe("Stepper, all steps complete", () => {
  for (const orientation of ORIENTATIONS) {
    it(`${orientation}: every step is done, none is current, the list says the flow is finished`, () => {
      inLocale(<Stepper orientation={orientation} steps={FLOW} currentStep="confirm" isComplete />);
      expect(states()).toEqual(["done", "done", "done", "done"]);
      expect(document.querySelectorAll("[aria-current]")).toHaveLength(0);
      // Each step is announced complete, not only drawn filled.
      for (const step of steps()) expect(step.textContent).toContain("Done");
      const list = screen.getByRole("list", { name: "Progress, All steps done" });
      expect(list.tagName).toBe("OL");
      expect(document.querySelector("[data-slot='stepper']")!.hasAttribute("data-complete")).toBe(true);
    });

    it(`${orientation}: the overall state follows the list's own name`, () => {
      inLocale(<Stepper orientation={orientation} aria-label="Setup" steps={FLOW} currentStep="confirm" isComplete />);
      expect(screen.getByRole("list", { name: "Setup, All steps done" })).toBeTruthy();
    });

    it(`${orientation}: currentStep and completedSteps are ignored, and an unknown currentStep does not warn`, () => {
      inLocale(<Stepper orientation={orientation} steps={withStatus(FLOW, { completed: ["profile"] })} currentStep="nope" isComplete />);
      expect(states()).toEqual(["done", "done", "done", "done"]);
      expect(warn.mock.calls.some(([message]: unknown[]) => String(message).includes("currentStep"))).toBe(false);
    });
  }

  it("horizontal, done bars on every step, whatever currentStep says", () => {
    inLocale(<Stepper steps={FLOW} currentStep="profile" isComplete />);
    for (const bar of document.querySelectorAll("[data-slot='stepper-step-bar']")) {
      expect(classesOf(bar)).toContain("bg-ds-background-brand-bold");
    }
  });

  it("vertical, a check node on every step and no ring for a current one", () => {
    inLocale(<Stepper orientation="vertical" steps={FLOW} currentStep="addons" isComplete />);
    const nodes = Array.from(document.querySelectorAll("[data-slot='stepper-step-node']"));
    expect(nodes).toHaveLength(4);
    for (const node of nodes) {
      expect(classesOf(node)).toContain("bg-ds-background-brand-bold");
      expect(classesOf(node)).not.toContain("inset-ring-ds-border-selected");
      expect(node.querySelector("svg, [data-slot='icon']")).toBeTruthy();
    }
  });

  it("the narrow one-line form reads all done over a full bar, and its group keeps the plain name", () => {
    inLocale(<Stepper steps={FLOW} currentStep="profile" isComplete />);
    const compact = screen.getByRole("group", { name: "Progress" });
    expect(compact.textContent).toContain("All steps done");
    expect(compact.textContent).not.toMatch(/Step \d/);
    expect((compact.querySelector("[data-slot='stepper-compact-bar'] span") as HTMLElement).style.width).toBe("100%");
  });

  it("the all-done words are English; a registered language replaces them and any other falls back to English", () => {
    expect(DS_STRINGS.stepsAllDone.en).toBe("All steps done");
    registerDsStrings("de", { progressSteps: "Fortschritt", stepsAllDone: "Alle Schritte erledigt" });
    inLocale(<Stepper steps={FLOW} currentStep="confirm" isComplete />, "de-DE");
    expect(screen.getByRole("list", { name: "Fortschritt, Alle Schritte erledigt" })).toBeTruthy();
    cleanup();
    inLocale(<Stepper steps={FLOW} currentStep="confirm" isComplete />, "nl");
    expect(screen.getByRole("list", { name: "Progress, All steps done" })).toBeTruthy();
  });
});

describe("Stepper, isComplete left out", () => {
  for (const orientation of ORIENTATIONS) {
    it(`${orientation}: omitted and false render the same markup, with one current step`, () => {
      const omitted = inLocale(<Stepper orientation={orientation} steps={FLOW} currentStep="addons" onStepPress={() => {}} />);
      const before = markup(omitted.container.innerHTML);
      expect(states()).toEqual(["done", "done", "current", "upcoming"]);
      expect(steps()[2]!.getAttribute("aria-current")).toBe("step");
      expect(screen.getByRole("list", { name: "Progress" })).toBeTruthy();
      expect(document.querySelector("[data-complete]")).toBeNull();
      cleanup();
      const off = inLocale(<Stepper orientation={orientation} steps={FLOW} currentStep="addons" onStepPress={() => {}} isComplete={false} />);
      expect(markup(off.container.innerHTML)).toBe(before);
    });
  }

  it("every id in completedSteps still leaves the current step current", () => {
    inLocale(<Stepper steps={withStatus(FLOW, { completed: FLOW.map((step) => step.id) })} currentStep="confirm" />);
    expect(states()).toEqual(["done", "done", "done", "current"]);
  });
});

describe("Stepper, isComplete with stepStatus: a journey", () => {
  for (const orientation of ORIENTATIONS) {
    it(`${orientation}: a finished journey says Done with a check on every step, never Now`, () => {
      inLocale(<Stepper orientation={orientation} steps={withStatus(JOURNEY, { status: {} })} showStatus currentStep="live" isComplete />);
      const words = steps().map((step) => step.querySelector("[data-slot='stepper-step-status']")?.textContent);
      expect(words).toEqual(["Done", "Done", "Done", "Done", "Done"]);
      expect(document.body.textContent).not.toContain("Now");
      for (const step of steps()) expect(step.querySelector("[data-slot='stepper-step-status'] svg, [data-slot='stepper-step-status'] [data-slot='icon']")).toBeTruthy();
    });
  }

  it("an explicit status and statusText still speak for their step", () => {
    inLocale(
      <Stepper
        steps={withStatus(JOURNEY, { status: { live: "with-provider" }, text: { domain: "Verified" } })} showStatus
        currentStep="live"
        isComplete
 />,
    );
    const status = (index: number) => steps()[index]!.querySelector("[data-slot='stepper-step-status']")!;
    expect(states()).toEqual(["done", "done", "done", "done", "done"]);
    expect(status(4).textContent).toBe("With us");
    expect(steps()[4]!.getAttribute("data-status")).toBe("with-provider");
    expect(classesOf(steps()[4]!.querySelector("[data-slot='stepper-step-bar']"))).toContain("bg-ds-background-information-bold");
    expect(status(2).textContent).toBe("Verified");
    expect(document.querySelectorAll("[aria-current]")).toHaveLength(0);
  });
});

describe("Stepper, isComplete with onStepPress: keyboard", () => {
  for (const orientation of ORIENTATIONS) {
    it(`${orientation}: every step is a button back into the flow; Enter and Space press it`, () => {
      const onStepPress = vi.fn();
      inLocale(<Stepper orientation={orientation} steps={FLOW} currentStep="confirm" onStepPress={onStepPress} isComplete />);
      const buttons = within(screen.getByRole("list")).getAllByRole("button");
      expect(buttons.map((button) => button.textContent)).toEqual(FLOW.map((step) => step.label));
      act(() => buttons[3]!.focus());
      press("Enter");
      expect(onStepPress).toHaveBeenLastCalledWith("confirm");
      act(() => buttons[0]!.focus());
      press(" ");
      expect(onStepPress).toHaveBeenLastCalledWith("profile");
    });
  }
});

describe("Stepper, isComplete in RTL (he)", () => {
  for (const orientation of ORIENTATIONS) {
    it(`${orientation}: all done, no aria-current, logical sides only`, () => {
      inLocale(<Stepper orientation={orientation} steps={FLOW} currentStep="team" isComplete />, "he", "rtl");
      expect(states()).toEqual(["done", "done", "done", "done"]);
      expect(document.querySelectorAll("[aria-current]")).toHaveLength(0);
      // he has no registered strings: the DS strings fall back to English, as everywhere else.
      expect(screen.getByRole("list", { name: "Progress, All steps done" })).toBeTruthy();
      expect(allClasses()).not.toMatch(PHYSICAL);
    });
  }
});
