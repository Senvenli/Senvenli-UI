import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Stepper } from "./index";

// The narrow form of a finished flow keeps a step's own
// status, and a finished flow with a failed or needs-you step warns in development.

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  warn.mockRestore();
  vi.unstubAllEnvs();
});

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

const JOURNEY = [
  { id: "account", label: "Account" },
  { id: "plan", label: "Plan and billing" },
  { id: "domain", label: "Domain" },
  { id: "workspace", label: "Workspace" },
  { id: "live", label: "Live" },
];

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
// React Aria's generated ids count up across renders; everything else must match byte for byte.
const markup = (html: string) => html.replace(/ id="react-aria-[^"]*"/g, "");
const compact = () => document.querySelector("[data-slot='stepper-compact']")!;
/**
 * The narrow form of the JOURNEY at "domain" (needs-you, a statusText on plan, isComplete left out), captured
 * before the finished flow's status lines were added to the narrow form.
 */
const NARROW_BASELINE =
  "<div role=\"group\" aria-label=\"Progress\" data-slot=\"stepper-compact\" class=\"flex flex-col gap-ds-100 @min-[36rem]:hidden\"><p class=\"m-0 flex flex-wrap items-center gap-x-ds-050 text-body\"><span class=\"text-ds-text-subtle\">Step 3 of 5</span><span aria-hidden=\"true\" class=\"text-ds-text-subtlest\">·</span><span class=\"font-[600] text-ds-text\">Domain</span><span aria-hidden=\"true\" class=\"text-ds-text-subtlest\">·</span><span data-slot=\"stepper-step-status\" class=\"flex items-center gap-ds-050 text-body-small text-ds-text-warning\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-circle-alert shrink-0 size-ds-icon-small\" aria-hidden=\"true\" data-slot=\"icon\" data-icon=\"circle-alert\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\"></line><line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\"></line></svg>Waiting for you</span></p><span aria-hidden=\"true\" data-slot=\"stepper-compact-bar\" class=\"h-1 overflow-hidden rounded-ds-full bg-ds-background-neutral-pressed\"><span class=\"block h-full rounded-ds-full bg-ds-background-warning-bold\" style=\"width: 60%;\"></span></span></div>";
const compactStatuses = () => Array.from(compact().querySelectorAll("[data-slot='stepper-compact-step-status']"));
const contradictionWarnings = () => warn.mock.calls.filter(([message]: unknown[]) => String(message).includes("contradicts itself"));

describe("Stepper, isComplete: the narrow form keeps a step's own status", () => {
  it("an explicit stepStatus and a statusText show under the done line, with their step's name", () => {
    inLocale(
      <Stepper steps={JOURNEY} currentStep="live" stepStatus={{ live: "with-provider" }} statusText={{ domain: "Verified" }} isComplete />,
    );
    expect(compact().querySelector("[data-slot='stepper-compact-done']")!.textContent).toBe("All steps done");
    expect(compactStatuses().map((line) => line.textContent)).toEqual(["Domain·Verified", "Live·With us"]);
    const live = compactStatuses()[1]!;
    expect(live.querySelector("[data-slot='stepper-step-status']")!.getAttribute("class")).toContain("text-ds-text-information");
    expect(live.querySelector("svg, [data-slot='icon']")).toBeTruthy();
    // The group still reads its plain name; the statuses are part of its text.
    expect(screen.getByRole("group", { name: "Progress" }).textContent).toContain("With us");
  });

  it("the derived journey words (Done on every step) are not repeated in the narrow form", () => {
    inLocale(<Stepper steps={JOURNEY} currentStep="live" stepStatus={{}} isComplete />);
    expect(compactStatuses()).toHaveLength(0);
    expect(compact().textContent).toBe("All steps done");
  });

  it("without any status the finished narrow form is the done line alone", () => {
    inLocale(<Stepper steps={JOURNEY} currentStep="live" isComplete />);
    expect(compactStatuses()).toHaveLength(0);
    expect(compact().querySelectorAll("p")).toHaveLength(1);
  });

  it("in RTL (ar) the status lines use logical sides only", () => {
    inLocale(<Stepper steps={JOURNEY} currentStep="live" stepStatus={{ plan: "with-provider" }} isComplete />, "ar", "rtl");
    expect(compactStatuses()).toHaveLength(1);
    for (const element of compact().querySelectorAll("[class]")) expect(element.getAttribute("class")).not.toMatch(PHYSICAL);
  });

  it("isComplete left out: the narrow form is byte for byte the baseline (before the status lines), and isComplete={false} renders the same", () => {
    const omitted = inLocale(<Stepper steps={JOURNEY} currentStep="domain" stepStatus={{ domain: "needs-you" }} statusText={{ plan: "Paid" }} />);
    expect(markup(compact().outerHTML)).toBe(NARROW_BASELINE);
    const before = markup(omitted.container.innerHTML);
    expect(document.querySelector("[data-slot='stepper-compact-step-status']")).toBeNull();
    expect(compact().textContent).toContain("Step 3 of 5");
    cleanup();
    const off = inLocale(<Stepper steps={JOURNEY} currentStep="domain" stepStatus={{ domain: "needs-you" }} statusText={{ plan: "Paid" }} isComplete={false} />);
    expect(markup(off.container.innerHTML)).toBe(before);
  });
});

describe("Stepper, isComplete with a failed or needs-you step warns in development", () => {
  for (const status of ["failed", "needs-you"] as const) {
    it(`${status}: one warning naming the step`, () => {
      const { rerender } = inLocale(<Stepper steps={JOURNEY} currentStep="live" stepStatus={{ domain: status }} isComplete />);
      expect(contradictionWarnings()).toHaveLength(1);
      expect(String(contradictionWarnings()[0]![0])).toContain("(domain)");
      // Not again on a re-render with the same steps.
      rerender(
        <div>
          <DesignSystemProvider locale="en" navigate={vi.fn()}>
            <Stepper steps={JOURNEY} currentStep="live" stepStatus={{ domain: status }} isComplete />
          </DesignSystemProvider>
        </div>,
      );
      expect(contradictionWarnings()).toHaveLength(1);
    });
  }

  it("with-provider and statusText alone do not warn", () => {
    inLocale(<Stepper steps={JOURNEY} currentStep="live" stepStatus={{ live: "with-provider" }} statusText={{ domain: "Verified" }} isComplete />);
    expect(contradictionWarnings()).toHaveLength(0);
  });

  it("without isComplete a failed or needs-you step does not warn", () => {
    inLocale(<Stepper steps={JOURNEY} currentStep="domain" stepStatus={{ domain: "failed", plan: "needs-you" }} />);
    expect(contradictionWarnings()).toHaveLength(0);
  });

  it("is silent in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    inLocale(<Stepper steps={JOURNEY} currentStep="live" stepStatus={{ domain: "failed" }} isComplete />);
    expect(contradictionWarnings()).toHaveLength(0);
  });
});
