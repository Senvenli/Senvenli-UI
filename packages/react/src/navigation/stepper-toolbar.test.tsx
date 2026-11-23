import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { DesignSystemProvider } from "../provider";
import { SkipLink, Stepper } from "./index";
import { BulkBar, Toolbar, ToolbarSpacer } from "../layout/index";

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  const ariaWarnings = warn.mock.calls.map(([message]: unknown[]) => String(message)).filter((message: string) => /aria-label|accessible|provider/i.test(message));
  warn.mockRestore();
  expect(ariaWarnings).toEqual([]);
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

const classesOf = (element: Element | null) => element?.getAttribute("class") ?? "";
const allClasses = () => Array.from(document.querySelectorAll("[class]")).map(classesOf).join(" ");

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

const steps = () => Array.from(document.querySelectorAll("[data-slot='stepper-step']"));

describe("Stepper, horizontal", () => {
  it("an ordered list named by default; each step says its number; the current one is aria-current=step", () => {
    inLocale(<Stepper steps={FLOW} currentStep="addons" />);
    const list = screen.getByRole("list", { name: "Progress" });
    expect(list.tagName).toBe("OL");
    expect(steps().map((step) => step.getAttribute("data-state"))).toEqual(["done", "done", "current", "upcoming"]);
    expect(steps()[2]!.getAttribute("aria-current")).toBe("step");
    expect(steps()[2]!.textContent).toContain("Step 3");
    // Done steps are said done, not only shown with a filled bar.
    expect(steps()[0]!.textContent).toContain("Done");
  });

  it("done steps are pressable only when the flow allows going back", () => {
    const onStepPress = vi.fn();
    const { unmount } = inLocale(<Stepper steps={FLOW} currentStep="addons" />);
    expect(screen.queryByRole("button")).toBeNull();
    unmount();
    inLocale(<Stepper steps={FLOW} currentStep="addons" onStepPress={onStepPress} />);
    const buttons = within(screen.getByRole("list")).getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual(["Profile", "Team"]);
    fireEvent.click(buttons[1]!);
    expect(onStepPress).toHaveBeenCalledWith("team");
  });

  it("explicit completed steps win over position", () => {
    inLocale(<Stepper steps={FLOW} currentStep="addons" completedSteps={["profile"]} />);
    expect(steps().map((step) => step.getAttribute("data-state"))).toEqual(["done", "upcoming", "current", "upcoming"]);
  });

  it("never breaks a name letter by letter: below 36rem of container it is one line over one bar", () => {
    inLocale(<Stepper steps={FLOW} currentStep="addons" />);
    const root = document.querySelector("[data-slot='stepper']")!;
    expect(classesOf(root)).toContain("@container");
    expect(classesOf(screen.getByRole("list"))).toContain("@min-[36rem]:flex");
    const compact = document.querySelector("[data-slot='stepper-compact']")!;
    expect(classesOf(compact)).toContain("@min-[36rem]:hidden");
    expect(compact.textContent).toContain("Step 3 of 4");
    expect(compact.textContent).toContain("Add-ons");
    expect((compact.querySelector("[data-slot='stepper-compact-bar'] span") as HTMLElement).style.width).toBe("75%");
    expect(allClasses()).not.toMatch(/break-all|break-words/);
  });

  it("a journey says each status in words and an icon, not colour alone", () => {
    inLocale(
      <Stepper
        steps={JOURNEY}
        currentStep="domain"
        stepStatus={{ domain: "needs-you" }}
        statusText={{ workspace: "With us · 1–2 business days" }}
      />,
    );
    const status = (index: number) => steps()[index]!.querySelector("[data-slot='stepper-step-status']");
    expect(status(0)!.textContent).toBe("Done");
    expect(status(2)!.textContent).toBe("Waiting for you");
    expect(status(2)!.querySelector("[data-slot='icon'], svg")).toBeTruthy();
    expect(classesOf(steps()[2]!.querySelector("[data-slot='stepper-step-bar']"))).toContain("bg-ds-background-warning-bold");
    expect(status(3)!.textContent).toBe("With us · 1–2 business days");
    // The compact line carries the current status too.
    expect(document.querySelector("[data-slot='stepper-compact']")!.textContent).toContain("Waiting for you");
  });

  it("with-provider and failed read in their own words", () => {
    inLocale(<Stepper steps={JOURNEY} currentStep="workspace" stepStatus={{ workspace: "with-provider", domain: "failed" }} />);
    expect(steps()[3]!.textContent).toContain("With us");
    expect(steps()[2]!.textContent).toContain("Something went wrong");
  });

  it("uses logical sides only (RTL)", () => {
    inLocale(<Stepper steps={FLOW} currentStep="team" />, "ar", "rtl");
    expect(allClasses()).not.toMatch(PHYSICAL);
  });
});

describe("Stepper, vertical", () => {
  it("nodes on a rail: a check for done, a ring for current, the number for upcoming; descriptions under names", () => {
    inLocale(
      <Stepper
        orientation="vertical"
        steps={[
          { id: "company", label: "Company details" },
          { id: "team", label: "Invite your first teammate", description: "Name, role and email" },
          { id: "domain", label: "Connect your domain" },
        ]}
        currentStep="team"
      />,
    );
    const nodes = Array.from(document.querySelectorAll("[data-slot='stepper-step-node']"));
    expect(classesOf(nodes[0]!)).toContain("bg-ds-background-brand-bold");
    expect(classesOf(nodes[1]!)).toContain("inset-ring-ds-border-selected");
    expect(nodes[2]!.textContent).toBe("3");
    expect(steps()[1]!.getAttribute("aria-current")).toBe("step");
    expect(screen.getByText("Name, role and email")).toBeTruthy();
  });
});

describe("Stepper, status contrast, the compact line and warnings", () => {
  it("a status node uses its own on-colour (contrast on warning, danger)", () => {
    inLocale(<Stepper orientation="vertical" steps={JOURNEY} currentStep="domain" stepStatus={{ domain: "needs-you", plan: "failed" }} />);
    const nodes = Array.from(document.querySelectorAll("[data-slot='stepper-step-node']"));
    expect(classesOf(nodes[2]!)).toContain("text-ds-text-on-warning");
    expect(classesOf(nodes[1]!)).toContain("text-ds-text-on-danger");
  });

  it("the compact line carries statusText on the current step too, and is named", () => {
    inLocale(<Stepper steps={JOURNEY} currentStep="workspace" statusText={{ workspace: "With us · 1–2 business days" }} />);
    const compact = screen.getByRole("group", { name: "Progress" });
    expect(compact.textContent).toContain("With us · 1–2 business days");
  });

  it("warns when currentStep is not one of the steps", () => {
    inLocale(<Stepper steps={FLOW} currentStep="nope" />);
    expect(warn.mock.calls.some(([message]: unknown[]) => String(message).includes('currentStep "nope"'))).toBe(true);
  });

  it("warns once for an unknown currentStep, not on every render", () => {
    const view = inLocale(<Stepper steps={FLOW} currentStep="nope" />);
    view.rerender(
      <div>
        <DesignSystemProvider locale="en" navigate={vi.fn()}>
          <Stepper steps={FLOW} currentStep="nope" />
        </DesignSystemProvider>
      </div>,
    );
    expect(warn.mock.calls.filter(([message]: unknown[]) => String(message).includes('currentStep "nope"'))).toHaveLength(1);
  });

  it("warns once under StrictMode too", () => {
    render(
      <React.StrictMode>
        <DesignSystemProvider locale="en" navigate={vi.fn()}>
          <Stepper steps={FLOW} currentStep="nope" />
        </DesignSystemProvider>
      </React.StrictMode>,
    );
    expect(warn.mock.calls.filter(([message]: unknown[]) => String(message).includes('currentStep "nope"'))).toHaveLength(1);
  });

  it("the step number label uses the body-small type token", () => {
    inLocale(<Stepper steps={FLOW} currentStep="team" />);
    expect(allClasses()).not.toContain("text-[12px]");
  });
});

describe("Toolbar and BulkBar", () => {
  function Bar() {
    return (
      <Toolbar aria-label="Record tools">
        <Button size="small" iconBefore="filter">Filter</Button>
        <Button size="small" iconBefore="calendar">This week</Button>
        <ToolbarSpacer />
        <Button size="small" variant="subtle" iconOnly iconBefore="download" aria-label="Export" />
      </Toolbar>
    );
  }

  it("a named toolbar with one tab stop; arrows move between controls (mirrored in RTL)", () => {
    inLocale(<Bar />);
    const toolbar = screen.getByRole("toolbar", { name: "Record tools" });
    const [filter, week, exportButton] = within(toolbar).getAllByRole("button");
    act(() => filter!.focus());
    press("ArrowRight");
    expect(document.activeElement).toBe(week);
    press("ArrowRight");
    expect(document.activeElement).toBe(exportButton);
    press("ArrowLeft");
    expect(document.activeElement).toBe(week);
    expect(document.querySelector("[data-slot='toolbar-spacer']")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("Tab leaves the toolbar from any control: focus goes to the last one, Shift+Tab to the first", () => {
    inLocale(<Bar />);
    const buttons = within(screen.getByRole("toolbar")).getAllByRole("button");
    act(() => buttons[1]!.focus());
    fireEvent.keyDown(buttons[1]!, { key: "Tab" });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    act(() => buttons[1]!.focus());
    fireEvent.keyDown(buttons[1]!, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("in RTL the arrows follow the reading direction", () => {
    inLocale(<Bar />, "ar", "rtl");
    const [filter, week] = within(screen.getByRole("toolbar")).getAllByRole("button");
    act(() => filter!.focus());
    press("ArrowLeft");
    expect(document.activeElement).toBe(week);
    expect(allClasses()).not.toMatch(PHYSICAL);
  });

  it("the bulk bar announces the selected count, holds the actions and clears", () => {
    const onClear = vi.fn();
    const { rerender } = inLocale(
      <BulkBar aria-label="Selected records" selectedCount={3} actions={<Button size="small">Export</Button>} onClear={onClear} />,
    );
    const bar = screen.getByRole("toolbar", { name: "Selected records" });
    const count = bar.querySelector("[data-slot='bulk-bar-count']")!;
    expect(count.textContent).toBe("3 selected");
    // The live region is filled after it mounts, so the first count is announced too.
    const announcer = bar.querySelector("[data-slot='bulk-bar-announcer']")!;
    expect(announcer.getAttribute("role")).toBe("status");
    expect(announcer.textContent).toBe("3 selected");
    expect(classesOf(bar)).toContain("bg-ds-background-neutral-bold");
    fireEvent.click(within(bar).getByRole("button", { name: "Clear selection" }));
    expect(onClear).toHaveBeenCalled();
    rerender(
      <div>
        <DesignSystemProvider locale="en" navigate={vi.fn()}>
          <BulkBar aria-label="Selected records" selectedCount={4} actions={<Button size="small">Export</Button>} onClear={onClear} />
        </DesignSystemProvider>
      </div>,
    );
    expect(document.querySelector("[data-slot='bulk-bar-count']")!.textContent).toBe("4 selected");
    expect(document.querySelector("[data-slot='bulk-bar-announcer']")!.textContent).toBe("4 selected");
  });

  it("the live region is empty on the first render and filled right after (announced on appear)", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(
      <DesignSystemProvider locale="en" navigate={() => {}}>
        <BulkBar aria-label="Selected" selectedCount={1} actions={null} onClear={() => {}} />
      </DesignSystemProvider>,
    );
    expect(html).toMatch(/data-slot="bulk-bar-announcer"[^>]*><\/span>/);
  });

  it("a bulk action keeps readable text while pressed", () => {
    inLocale(<BulkBar aria-label="Selected" selectedCount={2} actions={null} onClear={() => {}} />);
    expect(classesOf(screen.getByRole("toolbar"))).toContain("[&_[data-slot=button][data-pressed]]:text-ds-text");
  });
});

describe("SkipLink", () => {
  it("is named in the locale and moves focus to the page's main", () => {
    inLocale(
      <>
        <SkipLink />
        <main>Content</main>
      </>,
    );
    const skip = screen.getByRole("link", { name: "Skip to content" });
    expect(classesOf(skip)).toContain("sr-only");
    expect(classesOf(skip)).toContain("focus:not-sr-only");
    fireEvent.click(skip);
    expect(document.activeElement?.tagName).toBe("MAIN");
  });

  it("an id target is a real fragment link; the region leaves the tab order again on blur", () => {
    inLocale(
      <>
        <SkipLink target="#results">Skip to results</SkipLink>
        <section id="results">Results</section>
        <button>Later</button>
      </>,
    );
    const skip = screen.getByRole("link", { name: "Skip to results" });
    expect(skip.getAttribute("href")).toBe("#results");
    fireEvent.click(skip);
    const results = document.getElementById("results")!;
    expect(results.getAttribute("tabindex")).toBe("-1");
    act(() => screen.getByRole("button", { name: "Later" }).focus());
    expect(results.hasAttribute("tabindex")).toBe(false);
  });

  it("can aim at another region", () => {
    inLocale(
      <>
        <SkipLink target="#results">Skip to results</SkipLink>
        <section id="results">Results</section>
      </>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Skip to results" }));
    expect(document.activeElement?.id).toBe("results");
  });
});
