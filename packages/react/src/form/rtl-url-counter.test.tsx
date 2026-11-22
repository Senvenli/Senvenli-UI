import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { TextArea } from "./index";
import { TextField } from "./text-field";

/**
 * URLs, domains and character counts read left to right inside an RTL UI: on a `dir="rtl"`
 * page "https://shop.example.com" must not show as "com.example. shop //:https", nor the
 * counter "89 / 500" as "500 / 89". Label, help text and error keep following the page.
 */

afterEach(cleanup);

function inRtl(ui: React.ReactElement, locale = "ar") {
  return render(
    <div dir="rtl" lang={locale}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

/** The direction an element inherits: its own `dir`, else its nearest ancestor's. */
function directionOf(element: Element) {
  return element.closest("[dir]")?.getAttribute("dir");
}

describe("InputGroup URL addons on an RTL page", () => {
  it("keeps https://, the domain and .example.com in visual LTR order; the label and help text follow the page", () => {
    inRtl(<TextField label="Domain" prefix="https://" suffix=".example.com" valueDir="ltr" defaultValue="shop" description="Your public page." />);
    const frame = document.querySelector("[data-slot='input-group']")!;
    expect(frame.getAttribute("dir")).toBe("ltr");
    // DOM order is visual order in an LTR frame: prefix, value, suffix.
    const parts = Array.from(frame.children).map((part) => part.getAttribute("data-slot") === "text-field-input" ? (part as HTMLInputElement).value : part.textContent);
    expect(parts.join("")).toBe("https://shop.example.com");
    for (const part of Array.from(frame.children)) expect(directionOf(part)).toBe("ltr");
    expect(directionOf(screen.getByText("Domain"))).toBe("rtl");
    expect(directionOf(screen.getByText("Your public page."))).toBe("rtl");
  });

  it.each(["url", "email", "tel"] as const)("type=%s reads LTR without valueDir", (type) => {
    inRtl(<TextField label="Value" type={type} defaultValue="name@example.com" errorMessage="Error" />);
    expect(document.querySelector("[data-slot='input-group']")!.getAttribute("dir")).toBe("ltr");
    expect(screen.getByRole("textbox").getAttribute("type")).toBe(type);
    expect(directionOf(screen.getByText("Value"))).toBe("rtl");
  });

  it('valueDir="inherit" keeps an e-mail field on the page direction', () => {
    inRtl(<TextField label="البريد" type="email" valueDir="inherit" placeholder="name@example.com" />);
    expect(document.querySelector("[data-slot='input-group']")!.getAttribute("dir")).toBeNull();
    expect(directionOf(screen.getByRole("textbox"))).toBe("rtl");
  });

  it("a plain text field still follows the page", () => {
    inRtl(<TextField label="Name" defaultValue="Ana" />);
    expect(document.querySelector("[data-slot='input-group']")!.getAttribute("dir")).toBeNull();
    expect(directionOf(screen.getByRole("textbox"))).toBe("rtl");
  });
});

describe("TextArea counter on an RTL page", () => {
  it("reads value / max in LTR order", () => {
    inRtl(<TextArea label="Delivery note" maxLength={500} defaultValue={"x".repeat(89)} description="Shown to the customer." />, "en");
    const counter = document.querySelector("[data-slot='text-area-counter']")!;
    expect(counter.getAttribute("dir")).toBe("ltr");
    expect(counter.textContent).toBe("89 / 500");
    expect(directionOf(screen.getByText("Shown to the customer."))).toBe("rtl");
  });

  it("keeps LTR order with Arabic-Indic digits", () => {
    inRtl(<TextArea label="ملاحظة" maxLength={500} defaultValue={"x".repeat(89)} />, "ar-EG");
    const counter = document.querySelector("[data-slot='text-area-counter']")!;
    expect(counter.getAttribute("dir")).toBe("ltr");
    expect(counter.textContent).toBe(`${new Intl.NumberFormat("ar-EG").format(89)} / ${new Intl.NumberFormat("ar-EG").format(500)}`);
  });
});
