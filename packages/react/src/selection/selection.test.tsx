import fs from "node:fs";
import * as React from "react";
import { createTheme, toCSS } from "@senvenli/tokens";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldError as AriaFieldError, Input, TextField as AriaTextField } from "react-aria-components";

import { DesignSystemProvider } from "../provider";
import { DS_STRINGS, rangeMaxLabel, rangeMinLabel, registerDsStrings } from "../i18n";
import { IconGlyph } from "../display/icon";
import { TextField } from "../form/index";
import { Checkbox, CheckboxGroup, Radio, RadioGroup, Slider, Switch } from "./index";
import * as styles from "./styles";

afterEach(cleanup);

// A helper, not an inline `new URL("…", import.meta.url)`: Vite rewrites that literal form into an asset URL.
const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|left-|right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const classesOf = (element: Element | null) => element?.getAttribute("class") ?? "";

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

/** A real mouse press: React Aria handles label presses through pointer events, not a bare click. */
function pointerPress(element: Element) {
  const pointer = { pointerType: "mouse", pointerId: 1, detail: 1, buttons: 1, width: 1, height: 1 };
  fireEvent.pointerDown(element, pointer);
  fireEvent.mouseDown(element, { detail: 1, buttons: 1 });
  fireEvent.pointerUp(element, { ...pointer, buttons: 0 });
  fireEvent.mouseUp(element, { detail: 1 });
  fireEvent.click(element, { detail: 1 });
}

/** Keyboard modality, so React Aria reports focus-visible. */
function keyboardFocus(element: HTMLElement) {
  fireEvent.keyDown(document.body, { key: "Tab" });
  act(() => element.focus());
}

describe("selection recipes", () => {
  const recipes = Object.values(styles).filter((value): value is string => typeof value === "string").join(" ").split(/\s+/);

  it("only uses design-system tokens that exist in the theme", () => {
    for (const utility of recipes) {
      const color = /(?:^|:)(?:bg|text|border|inset-ring)-(ds-[a-z-]+)$/.exec(utility);
      if (color) expect(theme, utility).toMatch(new RegExp(`--(color|text)-${color[1]}:`));
      const radius = /(?:^|:)rounded-(ds-[a-z]+)$/.exec(utility);
      if (radius) expect(theme, utility).toContain(`--radius-${radius[1]}:`);
      const shadow = /(?:^|:)shadow-(ds-[a-z]+)$/.exec(utility);
      if (shadow) expect(theme, utility).toContain(`--shadow-${shadow[1]}:`);
      const space = /(?:^|:)(?:gap|p|px|py|pe|ps)-(ds-[0-9]+)$/.exec(utility);
      if (space) expect(theme, utility).toContain(`--spacing-${space[1]}:`);
    }
  });

  it("uses logical classes only and never an outline ring", () => {
    expect(recipes.filter((utility) => PHYSICAL.test(` ${utility}`))).toEqual([]);
    expect(recipes.filter((utility) => /(^|:)(outline|ring)-/.test(utility) && utility !== "outline-hidden")).toEqual([]);
  });

  it("shows keyboard focus as a 2px inner border in a colour that reads on the fill", () => {
    for (const recipe of [styles.CHECKBOX_BOX, styles.RADIO_DOT, styles.SWITCH_TRACK]) {
      expect(recipe).toContain("group-data-[focus-visible]:inset-ring-2");
      expect(recipe).toContain("group-data-[focus-visible]:inset-ring-ds-border-focused");
    }
    // Brand fills take the on-brand colour (blue on brand is ~1.3:1).
    expect(styles.CHECKBOX_BOX).toContain("group-data-[selected]:group-data-[focus-visible]:inset-ring-ds-text-on-brand");
    expect(styles.SWITCH_TRACK).toContain("group-data-[selected]:group-data-[focus-visible]:inset-ring-ds-text-on-brand");
    expect(styles.RADIO_CARD).toContain("data-[selected]:data-[focus-visible]:inset-ring-ds-border-focused");
    expect(styles.SLIDER_THUMB).toContain("data-[focus-visible]:inset-ring-2");
  });
});

describe("Checkbox", () => {
  it("is named by its label alone; the description is attached as a description", () => {
    inLocale(<Checkbox description="Replies within one hour">Email updates</Checkbox>);
    const box = screen.getByRole("checkbox", { name: "Email updates" });
    const described = box.getAttribute("aria-describedby")?.split(" ").map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(["Replies within one hour"]);
  });

  it("toggles from anywhere on the row", () => {
    const onChange = vi.fn();
    inLocale(<Checkbox onChange={onChange} description="Sent every Monday">Weekly digest</Checkbox>);
    pointerPress(screen.getByText("Sent every Monday"));
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("checkbox").closest("label")?.getAttribute("data-slot")).toBe("checkbox");
  });

  it("indeterminate draws a minus, never a check", () => {
    inLocale(<Checkbox isIndeterminate defaultSelected>All products</Checkbox>);
    const row = document.querySelector('[data-slot="checkbox"]');
    expect(row?.querySelector('[data-slot="checkbox-minus"]')).not.toBeNull();
    expect(row?.querySelector('[data-slot="checkbox-check"]')).toBeNull();
    expect((screen.getByRole("checkbox") as HTMLInputElement).indeterminate).toBe(true);
  });

  it("shows a disabled indeterminate box as disabled, not brand", () => {
    expect(styles.CHECKBOX_BOX).toContain("group-data-[disabled]:group-data-[indeterminate]:bg-ds-background-disabled");
    expect(styles.CHECKBOX_BOX).toContain("group-data-[disabled]:group-data-[indeterminate]:border-ds-border");
  });

  it("draws a check only when selected", () => {
    inLocale(<Checkbox>Off</Checkbox>);
    expect(document.querySelector('[data-slot="checkbox-check"]')).toBeNull();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(document.querySelector('[data-slot="checkbox-check"]')).not.toBeNull();
  });

  it("describes an invalid checkbox with its error and marks it invalid", () => {
    inLocale(<Checkbox isInvalid errorMessage="Accept to continue.">I accept the terms</Checkbox>);
    const box = screen.getByRole("checkbox", { name: "I accept the terms" });
    expect(box.getAttribute("aria-invalid")).toBe("true");
    const ids = box.getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toContain("Accept to continue.");
    const row = document.querySelector('[data-slot="choice-error"] [data-slot="field-error"]');
    expect(classesOf(row)).toContain("text-ds-text-danger");
    expect(row?.querySelector('[data-slot="field-error-icon"]')).not.toBeNull();
  });

  it("keeps the error region mounted and empty until the checkbox is invalid, so it is announced", () => {
    const { rerender } = inLocale(<Checkbox errorMessage="Required">Consent</Checkbox>);
    const region = document.querySelector('[data-slot="choice-error"]');
    expect(region?.getAttribute("aria-live")).toBe("polite");
    expect(region?.textContent).toBe("");
    rerender(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <Checkbox errorMessage="Required" isInvalid>Consent</Checkbox>
      </DesignSystemProvider>,
    );
    expect(document.querySelector('[data-slot="choice-error"]')).toBe(region);
    expect(region?.textContent).toBe("Required");
  });

  it("keeps description text readable in browse mode (not aria-hidden) and out of the name", () => {
    inLocale(<Checkbox description="Sent every Monday">Weekly digest</Checkbox>);
    const box = screen.getByRole("checkbox", { name: "Weekly digest" });
    const description = document.querySelector('[data-slot="choice-description"]');
    expect(description?.closest('[aria-hidden="true"]')).toBeNull();
    expect(box.getAttribute("aria-labelledby")).toBe(document.querySelector('[data-slot="choice-label"]')?.id);
  });

  it("shows its error after a failed native required check too", () => {
    inLocale(
      <form data-testid="f">
        <Checkbox isRequired validationBehavior="native" errorMessage="Accept to continue.">Terms</Checkbox>
      </form>,
    );
    const box = screen.getByRole("checkbox") as HTMLInputElement;
    act(() => {
      (screen.getByTestId("f") as HTMLFormElement).checkValidity();
    });
    expect(box.getAttribute("aria-invalid") ?? document.querySelector('[data-slot="checkbox"]')?.getAttribute("data-invalid")).toBeTruthy();
    expect(document.querySelector('[data-slot="choice-error"]')?.textContent).toBe("Accept to continue.");
  });

  it("does not toggle when disabled", () => {
    const onChange = vi.fn();
    inLocale(<Checkbox isDisabled onChange={onChange}>Beta features</Checkbox>);
    pointerPress(screen.getByText("Beta features"));
    expect(onChange).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="checkbox"]')?.hasAttribute("data-disabled")).toBe(true);
  });

  it("reports keyboard focus on the row so the box can draw it", () => {
    inLocale(<Checkbox>Focus</Checkbox>);
    keyboardFocus(screen.getByRole("checkbox"));
    expect(document.querySelector('[data-slot="checkbox"]')?.hasAttribute("data-focus-visible")).toBe(true);
  });
});

// A lone Checkbox's error is FieldError's row (circle-alert icon + message) inside its live region.
/**
 * FieldError's row composed by hand: React Aria's FieldError with FieldError's
 * own slot and classes, holding the circle-alert IconGlyph then the message span. The icon's svg comes from IconGlyph
 * on both sides, so a React or Lucide upgrade moves both together; FieldError's own element, classes, slot and child
 * order are spelled out here, so any change to them fails the comparison.
 */
function FieldErrorBefore({ children }: { children: React.ReactNode }) {
  return (
    <AriaFieldError data-slot="field-error" className="flex items-center gap-ds-050 text-body-small text-ds-text-danger">
      {() => (
        <>
          <IconGlyph name="circle-alert" data-slot="field-error-icon" />
          <span>{children}</span>
        </>
      )}
    </AriaFieldError>
  );
}
/** Generated ids (React's useId, React Aria's react-aria-…) differ between trees and React versions: one placeholder. */
const normaliseIds = (html: string) => html.replace(/ id="[^"]*"/g, ' id="ID"');

describe("lone Checkbox error row", () => {
  const MESSAGE = "Accept to continue.";
  const ids = (element: Element) => (element.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
  /** The accessible description as a screen reader builds it from aria-describedby (the referenced texts, in order). */
  const description = (element: Element) =>
    ids(element).map((id) => document.getElementById(id)?.textContent?.trim() ?? "").filter(Boolean).join(" ");

  it.each([["en", undefined], ["ar", "rtl"]] as const)("%s: draws the icon, hidden from screen readers, before the message", (locale, dir) => {
    inLocale(<div dir={dir}><Checkbox isInvalid errorMessage={MESSAGE}>Terms</Checkbox></div>, locale);
    const row = document.querySelector('[data-slot="choice-error"] > [data-slot="field-error"]')!;
    expect(row.tagName).toBe("SPAN");
    const icon = row.querySelector('[data-slot="field-error-icon"]')!;
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(icon.getAttribute("data-icon")).toBe("circle-alert");
    expect(row.firstElementChild).toBe(icon);
    expect(row.textContent).toBe(MESSAGE);
  });

  it("the accessible description is the message alone: no icon text, the error first", () => {
    inLocale(<Checkbox isInvalid errorMessage={MESSAGE} description="Sent every Monday">Terms</Checkbox>);
    const box = screen.getByRole("checkbox", { name: "Terms" });
    const region = document.querySelector('[data-slot="choice-error"]')!;
    expect(ids(box)[0]).toBe(region.id);
    expect(region.textContent).toBe(MESSAGE);
    expect(description(box)).toBe(`${MESSAGE} Sent every Monday`);
  });

  it("the live region is the same element valid and invalid, keeps its id and aria-live, and is empty while valid", () => {
    const ui = (isInvalid: boolean) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <Checkbox errorMessage={MESSAGE} isInvalid={isInvalid}>Consent</Checkbox>
      </DesignSystemProvider>
    );
    const { rerender } = render(ui(false));
    const region = document.querySelector('[data-slot="choice-error"]')!;
    const { id } = region;
    expect(region.childElementCount).toBe(0);
    expect(region.getAttribute("class")).toBeNull();
    rerender(ui(true));
    expect(document.querySelector('[data-slot="choice-error"]')).toBe(region);
    expect(region.id).toBe(id);
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.querySelector('[data-slot="field-error-icon"]')).not.toBeNull();
    rerender(ui(false));
    expect(document.querySelector('[data-slot="choice-error"]')).toBe(region);
    expect(region.childElementCount).toBe(0);
  });

  it("FieldError's row is unchanged, byte for byte (server and client render)", () => {
    const ERROR_TEXT = "Enter a valid email.";
    const inProvider = (ui: React.ReactElement) => <DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>;
    const current = inProvider(<TextField label="Email" isInvalid errorMessage={ERROR_TEXT} />);
    const before = inProvider(
      <AriaTextField isInvalid aria-label="Email">
        <Input />
        <FieldErrorBefore>{ERROR_TEXT}</FieldErrorBefore>
      </AriaTextField>
    );
    const row = (root: ParentNode) => {
      const element = root.querySelector('[data-slot="field-error"]');
      expect(element).not.toBeNull();
      return normaliseIds(element!.outerHTML);
    };
    const server = (ui: React.ReactElement) => {
      const template = document.createElement("template");
      template.innerHTML = renderToStaticMarkup(ui);
      return row(template.content);
    };
    const client = (ui: React.ReactElement) => {
      const { container, unmount } = render(ui);
      const html = row(container);
      unmount();
      return html;
    };
    expect(server(current)).toBe(server(before));
    expect(client(current)).toBe(client(before));
    expect(server(current)).toBe(client(current));
    expect(server(current)).toContain(`<span>${ERROR_TEXT}</span></span>`);
  });
});

describe("CheckboxGroup", () => {
  it("is a group named by its visible legend and reports the chosen values", () => {
    const onChange = vi.fn();
    inLocale(
      <CheckboxGroup label="Notifications" onChange={onChange}>
        <Checkbox value="email">Email updates</Checkbox>
        <Checkbox value="digest">Weekly digest</Checkbox>
      </CheckboxGroup>,
    );
    expect(screen.getByRole("group", { name: "Notifications" })).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Weekly digest" }));
    expect(onChange).toHaveBeenLastCalledWith(["digest"]);
  });

  it("shows the group error when invalid", () => {
    inLocale(
      <CheckboxGroup label="Documents" isInvalid errorMessage="Select at least one.">
        <Checkbox value="a">Invoice</Checkbox>
      </CheckboxGroup>,
    );
    expect(screen.getByText("Select at least one.")).toBeTruthy();
  });
});

describe("RadioGroup", () => {
  const items = [
    { value: "monthly", label: "Monthly", description: "Cancel anytime" },
    { value: "yearly", label: "Yearly" },
    { value: "custom", label: "Custom", isDisabled: true },
  ];

  it("is a radiogroup named by its legend; options are named by their label alone", () => {
    inLocale(<RadioGroup label="Billing period" items={items} defaultValue="monthly" />);
    expect(screen.getByRole("radiogroup", { name: "Billing period" })).toBeTruthy();
    const now = screen.getByRole("radio", { name: "Monthly" }) as HTMLInputElement;
    expect(now.checked).toBe(true);
    expect(document.getElementById(now.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Cancel anytime");
  });

  it("focusing with Tab, Home or End never selects by itself", () => {
    const onChange = vi.fn();
    inLocale(<RadioGroup label="Billing" items={items} onChange={onChange} />);
    const first = screen.getByRole("radio", { name: "Monthly" });
    keyboardFocus(first);
    fireEvent.keyDown(first, { key: "Home" });
    fireEvent.keyDown(first, { key: "End" });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getAllByRole("radio").some((radio) => (radio as HTMLInputElement).checked)).toBe(false);
  });

  it("selects the clicked row and takes Radio children", () => {
    const onChange = vi.fn();
    inLocale(
      <RadioGroup label="Channel" onChange={onChange}>
        <Radio value="email">Email</Radio>
        <Radio value="sms" description="Carrier rates apply">Text message</Radio>
      </RadioGroup>,
    );
    fireEvent.click(screen.getByText("Carrier rates apply"));
    expect(onChange).toHaveBeenLastCalledWith("sms");
  });

  it("moves the selection with arrow keys", () => {
    const onChange = vi.fn();
    inLocale(<RadioGroup label="Billing" items={items} defaultValue="monthly" onChange={onChange} />);
    const now = screen.getByRole("radio", { name: "Monthly" });
    keyboardFocus(now);
    fireEvent.keyDown(now, { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith("yearly");
  });

  it("is one tab stop: only the selected option is in the tab order", () => {
    inLocale(<RadioGroup label="Billing" items={items} defaultValue="yearly" />);
    expect(screen.getByRole("radio", { name: "Yearly" }).getAttribute("tabindex")).toBe("0");
    expect(screen.getByRole("radio", { name: "Monthly" }).getAttribute("tabindex")).toBe("-1");
  });

  it("marks every option invalid when the group is, and invalid wins over the selected ring", () => {
    inLocale(<RadioGroup label="Billing" items={items} defaultValue="monthly" isInvalid errorMessage="Select a billing period." />);
    for (const row of Array.from(document.querySelectorAll('[data-slot="radio"]'))) expect(row.hasAttribute("data-invalid")).toBe(true);
    expect(styles.RADIO_DOT).toContain("group-data-[selected]:group-data-[invalid]:border-ds-border-danger");
    expect(screen.getByText("Select a billing period.")).toBeTruthy();
  });

  it("turns the selected ring blue on keyboard focus instead of a 2px dot against brand", () => {
    expect(styles.RADIO_DOT).toContain("group-data-[selected]:group-data-[focus-visible]:border-ds-border-focused");
    expect(styles.RADIO_DOT).toContain("group-data-[selected]:group-data-[focus-visible]:inset-ring-0");
    // Focus still shows on a selected, invalid radio.
    expect(styles.RADIO_DOT).toContain("group-data-[selected]:group-data-[invalid]:group-data-[focus-visible]:border-ds-border-focused");
  });

  it("skips a disabled option", () => {
    const onChange = vi.fn();
    inLocale(<RadioGroup label="Billing" items={items} onChange={onChange} />);
    fireEvent.click(screen.getByText("Custom"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("RadioGroup variant=card", () => {
  const plans = (props: Partial<React.ComponentProps<typeof RadioGroup>> = {}) => (
    <RadioGroup label="Choose a plan" variant="card" {...props}>
      <Radio value="basic" description="Up to 3 projects · Free">Basic</Radio>
      <Radio value="pro" description="Unlimited projects · $12 / month">Pro</Radio>
    </RadioGroup>
  );

  it("draws every option as a card in an equal-column grid, named by its words and described by its detail", () => {
    inLocale(plans({ defaultValue: "pro" }));
    expect(screen.getByRole("radiogroup", { name: "Choose a plan" })).toBeTruthy();
    const pro = screen.getByRole("radio", { name: "Pro" }) as HTMLInputElement;
    expect(pro.checked).toBe(true);
    const description = (pro.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent).join(" ");
    expect(description).toContain("Unlimited projects");
    expect(classesOf(document.querySelector('[data-slot="radio-group-items"]'))).toContain("grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))]");
    const cards = document.querySelectorAll('[data-slot="radio"][data-variant="card"]');
    expect(cards).toHaveLength(2);
    expect(classesOf(cards[0])).toContain("rounded-ds-large");
  });

  it("drops the selected fill and border on a disabled selected card, and dims it", () => {
    expect(styles.RADIO_CARD).toContain("data-[disabled]:data-[selected]:bg-ds-background-disabled");
    expect(styles.RADIO_CARD).toContain("data-[disabled]:data-[selected]:inset-ring-ds-border");
    expect(styles.RADIO_CARD).toContain("data-[disabled]:text-ds-text-disabled");
  });

  it("selects from anywhere on the card and never on focus alone", () => {
    const onChange = vi.fn();
    inLocale(plans({ onChange }));
    keyboardFocus(screen.getByRole("radio", { name: "Basic" }));
    fireEvent.keyDown(screen.getByRole("radio", { name: "Basic" }), { key: "End" });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Unlimited projects · $12 / month"));
    expect(onChange).toHaveBeenLastCalledWith("pro");
    expect(document.querySelectorAll('[data-slot="radio"][data-selected]')).toHaveLength(1);
  });

  it("keeps the default rows when no variant is given", () => {
    inLocale(<RadioGroup label="Size" items={[{ value: "s", label: "Small" }]} />);
    expect(document.querySelector('[data-slot="radio"]')!.getAttribute("data-variant")).toBe("default");
  });
});

describe("Switch", () => {
  it("is a switch named by the setting and applies on press", () => {
    const onChange = vi.fn();
    inLocale(<Switch onChange={onChange} description="Visitors can sign up from your website.">Public sign-up</Switch>);
    const toggle = screen.getByRole("switch", { name: "Public sign-up" });
    expect(document.getElementById(toggle.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Visitors can sign up from your website.");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(document.querySelector('[data-slot="switch"]')?.hasAttribute("data-selected")).toBe(true);
  });

  it("moves the thumb along the reading direction", () => {
    expect(styles.SWITCH_THUMB).toContain("start-0.5");
    expect(styles.SWITCH_THUMB).toContain("group-data-[selected]:translate-x-3");
    expect(styles.SWITCH_THUMB).toContain("rtl:group-data-[selected]:-translate-x-3");
    expect(styles.SWITCH_THUMB).toContain("motion-reduce:transition-none");
  });

  it("shows disabled with tokens, not opacity, also when on", () => {
    expect(styles.SWITCH_TRACK).toContain("group-data-[disabled]:bg-ds-background-disabled");
    expect(styles.SWITCH_TRACK).not.toMatch(/opacity-/);
    // Equal-depth variants sort alphabetically (disabled before selected), so "disabled and on" needs its own compound.
    expect(styles.SWITCH_TRACK).toContain("group-data-[disabled]:group-data-[selected]:bg-ds-background-disabled");
    expect(styles.SWITCH_THUMB).toContain("group-data-[disabled]:group-data-[selected]:bg-ds-surface-raised");
    inLocale(<Switch isDisabled defaultSelected>Multiple workspaces</Switch>);
    const row = document.querySelector('[data-slot="switch"]');
    expect(row?.hasAttribute("data-disabled") && row.hasAttribute("data-selected")).toBe(true);
  });

  it("does not toggle when disabled", () => {
    const onChange = vi.fn();
    inLocale(<Switch isDisabled onChange={onChange}>Automatic renewal</Switch>);
    pointerPress(screen.getByText("Automatic renewal"));
    expect(onChange).not.toHaveBeenCalled();
    expect((screen.getByRole("switch") as HTMLInputElement).disabled).toBe(true);
  });
});

describe("Slider", () => {
  it("shows the value in text and names its thumb by the label", () => {
    inLocale(<Slider label="Search radius" defaultValue={300} minValue={0} maxValue={600} step={50} formatOptions={{ style: "unit", unit: "kilometer" }} />);
    const thumb = screen.getByRole("slider", { name: "Search radius" });
    expect(thumb.getAttribute("aria-valuetext")).toBe("300 km");
    const output = document.querySelector('[data-slot="slider-output"]');
    expect(output?.textContent).toBe("300 km");
    expect(classesOf(output)).toContain("tabular-nums");
  });

  it("steps with arrows and moves ten steps with Page Up / Page Down", () => {
    const onChange = vi.fn();
    inLocale(<Slider label="Radius" defaultValue={300} minValue={0} maxValue={2000} step={10} onChange={onChange} />);
    const thumb = screen.getByRole("slider");
    keyboardFocus(thumb);
    fireEvent.keyDown(thumb, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(310);
    fireEvent.keyDown(thumb, { key: "PageUp" });
    expect(onChange).toHaveBeenLastCalledWith(410);
    fireEvent.keyDown(thumb, { key: "PageDown" });
    expect(onChange).toHaveBeenLastCalledWith(310);
  });

  it("reports onChangeEnd for Page Up / Page Down like the other keys", () => {
    const onChangeEnd = vi.fn();
    inLocale(<Slider label="Radius" defaultValue={300} minValue={0} maxValue={2000} step={10} onChangeEnd={onChangeEnd} />);
    const thumb = screen.getByRole("slider");
    keyboardFocus(thumb);
    fireEvent.keyDown(thumb, { key: "PageUp" });
    expect(onChangeEnd).toHaveBeenLastCalledWith(400);
    fireEvent.keyDown(thumb, { key: "ArrowLeft" });
    expect(onChangeEnd).toHaveBeenLastCalledWith(390);
  });

  it("names the two ends of a range and fills between them", () => {
    const onChange = vi.fn();
    inLocale(
      <Slider
        label="Price range"
        defaultValue={[40, 120]}
        minValue={0}
        maxValue={200}
        step={5}
        onChange={onChange}
        formatOptions={{ style: "currency", currency: "EUR", maximumFractionDigits: 0 }}
      />,
    );
    const [low, high] = screen.getAllByRole("slider");
    expect(low.getAttribute("aria-label")).toBe(DS_STRINGS.rangeMin.en);
    expect(high.getAttribute("aria-label")).toBe(DS_STRINGS.rangeMax.en);
    expect(screen.getByRole("slider", { name: new RegExp(`${DS_STRINGS.rangeMin.en}.*Price range`) })).toBe(low);
    const fill = document.querySelector('[data-slot="slider-fill"]') as HTMLElement;
    expect(fill.style.insetInlineStart).toBe("20%");
    expect(fill.style.insetInlineEnd).toBe("40%");
    keyboardFocus(high);
    fireEvent.keyDown(high, { key: "PageDown" });
    expect(onChange).toHaveBeenLastCalledWith([40, 70]);
  });

  it("keeps a range in order when Page Down pushes the high end below the low end", () => {
    const onChange = vi.fn();
    inLocale(<Slider label="Price" defaultValue={[40, 60]} minValue={0} maxValue={200} onChange={onChange} />);
    const [, high] = screen.getAllByRole("slider");
    keyboardFocus(high);
    fireEvent.keyDown(high, { key: "PageDown" });
    expect(onChange).toHaveBeenLastCalledWith([40, 50]);
    fireEvent.keyDown(high, { key: "PageDown" });
    expect(onChange).toHaveBeenLastCalledWith([40, 40]);
  });

  it("is disabled as a whole, label and value included", () => {
    inLocale(<Slider label="Volume" defaultValue={0.5} minValue={0} maxValue={1} step={0.25} isDisabled />);
    expect((screen.getByRole("slider") as HTMLInputElement).disabled).toBe(true);
    expect(document.querySelector('[data-slot="slider"]')?.hasAttribute("data-disabled")).toBe(true);
    for (const part of ["slider-label", "slider-output"]) {
      expect(classesOf(document.querySelector(`[data-slot="${part}"]`))).toContain("group-data-[disabled]:text-ds-text-disabled");
    }
    expect(styles.SLIDER_RAIL).toContain("group-data-[disabled]:bg-ds-background-disabled");
  });
});

describe("strings and direction", () => {
  it("has both range names in English; a registered language replaces them and any other falls back to English", () => {
    expect(DS_STRINGS.rangeMin.en).toBe("Minimum");
    expect(DS_STRINGS.rangeMax.en).toBe("Maximum");
    registerDsStrings("de", { rangeMin: "Kleinster Wert", rangeMax: "Maximalwert" });
    for (const locale of ["de", "de-AT"]) {
      expect(rangeMinLabel(locale), locale).toBe("Kleinster Wert");
      expect(rangeMaxLabel(locale), locale).toBe("Maximalwert");
    }
    for (const locale of ["en", "en-GB", "nl", "xx"]) {
      expect(rangeMinLabel(locale), locale).toBe("Minimum");
      expect(rangeMaxLabel(locale), locale).toBe("Maximum");
    }
    // The thumbs read the registered words from the provider locale.
    inLocale(<Slider label="Price" defaultValue={[40, 60]} minValue={0} maxValue={200} />, "de");
    expect(screen.getAllByRole("slider").map((thumb) => thumb.getAttribute("aria-label"))).toEqual(["Kleinster Wert", "Maximalwert"]);
  });

  it("renders every part with logical classes in a right-to-left page", () => {
    const { container } = inLocale(
      <div dir="rtl">
        <Checkbox description="و">ا</Checkbox>
        <RadioGroup label="ب" items={[{ value: "a", label: "ج" }]} />
        <RadioGroup label="د" variant="card" items={[{ value: "a", label: "ه", description: "1" }]} />
        <Switch>ز</Switch>
        <Slider label="ح" defaultValue={[1, 5]} minValue={0} maxValue={10} />
      </div>,
      "he",
    );
    const parts = Array.from(container.querySelectorAll("[data-slot]"));
    expect(parts.length).toBeGreaterThan(15);
    for (const part of parts) expect(classesOf(part), part.getAttribute("data-slot") ?? "").not.toMatch(PHYSICAL);
    expect(screen.getAllByRole("slider")[0].getAttribute("aria-label")).toBe(DS_STRINGS.rangeMin.en);
  });
});
