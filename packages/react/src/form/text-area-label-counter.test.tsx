import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { TextArea } from "./index";

/**
 * A TextArea whose purpose the surface already shows (a chat reply box) keeps its
 * label for screen readers only, and can leave out the visible "89 / 500" count while the limit still
 * marks the field invalid. Both defaults are unchanged.
 */
afterEach(cleanup);

function Reply(props: Partial<React.ComponentProps<typeof TextArea>>) {
  const [value, setValue] = React.useState(props.defaultValue ?? "");
  return (
    <DesignSystemProvider locale="en-US" navigate={vi.fn()}>
      <TextArea label="Reply" value={value} onChange={setValue} {...props} />
    </DesignSystemProvider>
  );
}

const label = () => document.querySelector('[data-slot="field-label"]')!;
const counter = () => document.querySelector('[data-slot="text-area-counter"]');

describe("TextArea isLabelHidden and showCounter", () => {
  it("shows its label by default", () => {
    render(<Reply />);
    expect(label().className).not.toContain("sr-only");
    expect(screen.getByRole("textbox", { name: "Reply" })).toBeTruthy();
  });

  it("isLabelHidden keeps the label as the field's name, for screen readers only", () => {
    render(<Reply isLabelHidden />);
    expect(label().className).toContain("sr-only");
    expect(label().textContent).toBe("Reply");
    expect(screen.getByRole("textbox", { name: "Reply" })).toBeTruthy();
  });

  it("shows the count by default whenever maxLength is set, and the field reads it", () => {
    render(<Reply maxLength={10} defaultValue="abc" />);
    expect(counter()?.textContent).toBe("3 / 10");
    const field = screen.getByRole("textbox", { name: "Reply" });
    expect(field.getAttribute("aria-describedby") ?? "").toContain(counter()!.id);
  });

  it("showCounter={false} hides only the count: past the limit the field is still invalid and announced", () => {
    render(<Reply maxLength={5} showCounter={false} />);
    expect(counter()).toBeNull();
    const field = screen.getByRole("textbox", { name: "Reply" }) as HTMLTextAreaElement;
    expect(field.getAttribute("aria-describedby")).toBeNull();
    fireEvent.change(field, { target: { value: "too long now" } });
    // Announced at once; marked invalid on leaving the field, as with the count shown.
    fireEvent.blur(field);
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(document.querySelector('[data-slot="text-area-limit-status"]')?.textContent).not.toBe("");
  });
});
