import * as React from "react";
import { renderToString } from "react-dom/server";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Form } from "./index";
import { TextField } from "./text-field";

/**
 * TextField displayCase="uppercase": a promo code shows in capitals while the value stays exactly as typed.
 */

afterEach(cleanup);

function inLocale(ui: React.ReactElement, dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={dir ? "ar-EG" : "en"} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}
const inputOf = (container: HTMLElement) => container.querySelector("[data-slot='text-field-input']") as HTMLInputElement;
const classesOf = (element: Element) => (element.getAttribute("class") ?? "").split(/\s+/);

describe("TextField displayCase", () => {
  it("draws the value in capitals (CSS), the placeholder in its own case", () => {
    const { container } = inLocale(<TextField label="Promo code" displayCase="uppercase" placeholder="AB 123" defaultValue="ab 123" />);
    expect(classesOf(inputOf(container))).toEqual(expect.arrayContaining(["uppercase", "placeholder:normal-case"]));
  });

  it("onChange, the input's value and the submitted form value stay exactly as typed", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      return Object.fromEntries(new FormData(event.currentTarget));
    });
    const { container } = inLocale(
      <Form onSubmit={onSubmit}>
        <TextField label="Promo code" name="code" displayCase="uppercase" onChange={onChange} />
        <button type="submit">Save</button>
      </Form>,
    );
    const input = inputOf(container);
    fireEvent.change(input, { target: { value: "ab 123" } });
    expect(onChange).toHaveBeenLastCalledWith("ab 123");
    expect(input.value).toBe("ab 123");
    act(() => (container.querySelector("button[type='submit']") as HTMLButtonElement).click());
    expect(onSubmit).toHaveBeenCalled();
    expect(onSubmit.mock.results[0]!.value).toEqual({ code: "ab 123" });
  });

  it("controlled: the app's value is shown as given, not rewritten; the caret stays where it was put", () => {
    function Code() {
      const [value, setValue] = React.useState("ab");
      return <TextField label="Promo code" displayCase="uppercase" value={value} onChange={setValue} />;
    }
    const { container } = inLocale(<Code />);
    const input = inputOf(container);
    act(() => input.focus());
    input.setSelectionRange(1, 1);
    fireEvent.change(input, { target: { value: "aXb", selectionStart: 2, selectionEnd: 2 } });
    expect(input.value).toBe("aXb");
    // The value is never re-set by the field, so the browser's caret is not moved to the end.
    expect(input.selectionStart).toBe(2);
  });

  it("works with appearance code and in RTL: the mono code style and capitals together, no physical classes", () => {
    const { container } = inLocale(<TextField label="رمز" appearance="code" displayCase="uppercase" defaultValue="ab 123" />, "rtl");
    const classes = classesOf(inputOf(container));
    expect(classes).toEqual(expect.arrayContaining(["font-ds-mono", "text-code", "uppercase"]));
    expect(classes.some((name) => /(^|:)(text-left|text-right|ml-|mr-|pl-|pr-)/.test(name))).toBe(false);
  });

  it("server render: the same markup as the client's first render, the value as typed", () => {
    const ui = (
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <TextField id="code" label="Promo code" displayCase="uppercase" defaultValue="ab 123" />
      </DesignSystemProvider>
    );
    const html = renderToString(ui);
    expect(html).toContain('value="ab 123"');
    expect(html).toMatch(/class="[^"]*\buppercase placeholder:normal-case\b/);
  });

  it("without displayCase nothing changes: no capitals class", () => {
    const { container } = inLocale(<TextField label="Promo code" defaultValue="ab 123" />);
    expect(classesOf(inputOf(container))).not.toContain("uppercase");
  });
});
