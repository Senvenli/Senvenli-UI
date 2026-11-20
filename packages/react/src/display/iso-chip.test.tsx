import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { IsoChip, type IsoChipProps } from "./index";
import { IsoChipMark } from "./iso-chip";

// The ISO/region code chip, exported from ./display for country and language pickers.

afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

describe("IsoChip", () => {
  it("is a named export of ./display: one span with its own data-slot and the code as text", () => {
    const props: IsoChipProps = { code: "ME" };
    const { container } = inLocale(<IsoChip {...props} />);
    const chip = container.querySelector("[data-slot='iso-chip']")!;
    expect(chip.tagName).toBe("SPAN");
    expect(chip.textContent).toBe("ME");
    expect(chip.children).toHaveLength(0);
    // No role or name of its own: beside a country's name it is decoration; alone, the app names it.
    expect(chip.getAttributeNames().sort()).toEqual(["class", "data-slot"]);
  });

  it("looks exactly like the chip a DS part draws under its own data-slot (the same classes)", () => {
    const { container } = inLocale(
      <>
        <IsoChip code="DE" />
        <IsoChipMark code="DE" slot="phone-field-iso" />
      </>,
    );
    const exported = container.querySelector("[data-slot='iso-chip']")!;
    const part = container.querySelector("[data-slot='phone-field-iso']")!;
    expect(part.textContent).toBe("DE");
    expect(exported.className).toBe(part.className);
    const classes = exported.className.split(/\s+/);
    expect(classes).toContain("bg-ds-background-neutral");
    expect(classes).toContain("text-ds-text-subtle");
    expect(classes).toContain("font-medium");
    expect(classes).not.toContain("font-semibold");
    // The part draws no second chip and no iso-chip slot of its own.
    expect(container.querySelectorAll("[data-slot='iso-chip']")).toHaveLength(1);
  });

  it("renders the same on the server, and the code is shown as given (no casing, no lookup)", () => {
    const html = renderToStaticMarkup(<IsoChip code="xk" />);
    expect(html).toMatch(/^<span data-slot="iso-chip" class="[^"]+">xk<\/span>$/);
  });

  it("RTL: the code reads left to right in an Arabic page and the chip keeps logical spacing only", () => {
    const { container } = inLocale(<IsoChip code="ME" />, "ar", "rtl");
    const chip = container.querySelector<HTMLElement>("[data-slot='iso-chip']")!;
    expect(chip.closest("[dir='rtl']")).not.toBeNull();
    expect(chip.textContent).toBe("ME");
    expect(chip.className).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-/);
  });

  it("is not focusable and not announced as a control (a screen reader reads the code only where it is shown alone)", () => {
    const { container } = inLocale(
      <span role="img" aria-label="Montenegro">
        <IsoChip code="ME" />
      </span>,
    );
    const chip = container.querySelector<HTMLElement>("[data-slot='iso-chip']")!;
    expect(chip.tabIndex).toBe(-1);
    expect(chip.hasAttribute("tabindex")).toBe(false);
    expect(container.querySelector("[role='img']")!.getAttribute("aria-label")).toBe("Montenegro");
  });
});
