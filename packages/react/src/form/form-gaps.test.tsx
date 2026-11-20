import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { hidePasswordLabel, showPasswordLabel } from "../i18n";
import { PasswordField, TextField } from "./index";

afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

const input = (container: HTMLElement, slot: string) => container.querySelector(`[data-slot="${slot}"]`) as HTMLInputElement;

describe("PasswordField gaps", () => {
  it("stays uncontrolled by default and still reports the toggle", () => {
    const onRevealChange = vi.fn();
    const { container } = inLocale(<PasswordField label="Password" autoComplete="new-password" onRevealChange={onRevealChange} />);
    const field = input(container, "password-field-input");
    expect(field.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: showPasswordLabel("en") }));
    expect(field.type).toBe("text");
    expect(onRevealChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: hidePasswordLabel("en") }));
    expect(field.type).toBe("password");
    expect(onRevealChange).toHaveBeenLastCalledWith(false);
  });

  it("follows isRevealed when controlled: a Generate button can reveal what it writes", () => {
    function Generator() {
      const [value, setValue] = React.useState("");
      const [revealed, setRevealed] = React.useState(false);
      return (
        <>
          <PasswordField label="Password" autoComplete="new-password" value={value} onChange={setValue} isRevealed={revealed} onRevealChange={setRevealed} />
          <button type="button" onClick={() => { setValue("Kx7!pQ2m#vR9"); setRevealed(true); }}>Generate</button>
        </>
      );
    }
    const { container } = inLocale(<Generator />);
    const field = input(container, "password-field-input");
    expect(field.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    expect(field.type).toBe("text");
    expect(field.value).toBe("Kx7!pQ2m#vR9");
    expect(screen.getByRole("button", { name: hidePasswordLabel("en") })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: hidePasswordLabel("en") }));
    expect(field.type).toBe("password");
  });

  it("does not change visibility on its own while controlled", () => {
    const onRevealChange = vi.fn();
    const { container } = inLocale(<PasswordField label="Password" autoComplete="current-password" isRevealed={false} onRevealChange={onRevealChange} />);
    fireEvent.click(screen.getByRole("button", { name: showPasswordLabel("en") }));
    expect(onRevealChange).toHaveBeenCalledWith(true);
    expect(input(container, "password-field-input").type).toBe("password");
  });

  it("passes a placeholder to the input, and renders none without one", () => {
    const { container, unmount } = inLocale(<PasswordField label="Password" autoComplete="new-password" placeholder="At least 10 characters" />);
    expect(input(container, "password-field-input").getAttribute("placeholder")).toBe("At least 10 characters");
    unmount();
    const plain = inLocale(<PasswordField label="Password" autoComplete="new-password" />);
    expect(input(plain.container, "password-field-input").hasAttribute("placeholder")).toBe(false);
  });

  it("toggles by keyboard and in RTL", () => {
    for (const locale of ["en", "ar"]) {
      const { container } = inLocale(
        <div dir={locale === "ar" ? "rtl" : "ltr"}><PasswordField label="Password" autoComplete="new-password" /></div>,
        locale,
      );
      const toggle = screen.getByRole("button", { name: showPasswordLabel(locale) });
      act(() => toggle.focus());
      fireEvent.keyDown(toggle, { key: "Enter" });
      fireEvent.keyUp(toggle, { key: "Enter" });
      expect(input(container, "password-field-input").type, locale).toBe("text");
      cleanup();
    }
  });
});

describe("TextField gaps", () => {
  it("passes autoCapitalize to the input", () => {
    const { container } = inLocale(<TextField label="Promo code" autoCapitalize="characters" />);
    expect(input(container, "text-field-input").getAttribute("autocapitalize")).toBe("characters");
  });

  it("passes min, max and step for type=number", () => {
    const { container } = inLocale(<TextField label="Quantity" type="number" min={1} max={9} step={1} />);
    const field = input(container, "text-field-input");
    expect(field.type).toBe("number");
    expect(field.getAttribute("min")).toBe("1");
    expect(field.getAttribute("max")).toBe("9");
    expect(field.getAttribute("step")).toBe("1");
  });

  it("adds no new attributes when the props are omitted", () => {
    const { container } = inLocale(<TextField label="Name" />);
    const field = input(container, "text-field-input");
    for (const name of ["autocapitalize", "min", "max", "step"]) expect(field.hasAttribute(name), name).toBe(false);
    expect(field.type).toBe("text");
  });

  it("keeps the attributes in RTL", () => {
    const { container } = inLocale(<div dir="rtl"><TextField label="Quantity" type="number" min={0} autoCapitalize="none" /></div>, "ar");
    const field = input(container, "text-field-input");
    expect(field.getAttribute("min")).toBe("0");
    expect(field.getAttribute("autocapitalize")).toBe("none");
  });
});
