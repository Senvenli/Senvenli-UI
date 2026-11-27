import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { PageHeader } from "../navigation/index";
import { Page, PageSection } from "./index";

afterEach(cleanup);
const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);
const page = () => document.querySelector<HTMLElement>("[data-slot='page']")!;

describe("Page", () => {
  it("caps the width by preset (1200px by default, 800px narrow, none full), centred with gutters", () => {
    for (const [width, cap] of [[undefined, "max-w-[1200px]"], ["narrow", "max-w-[800px]"], ["full", "max-w-none"]] as const) {
      inLocale(<Page width={width}>x</Page>);
      expect(page().className).toContain(cap);
      expect(page().className).toContain("mx-auto");
      expect(page().className).toContain("px-ds-200");
      expect(page().getAttribute("data-width")).toBe(width ?? "default");
      cleanup();
    }
  });

  it("owns the rhythm: children 32px apart, the inline header's own margin given way", () => {
    inLocale(
      <Page>
        <PageHeader title="Customers" />
        <PageSection title="Active">rows</PageSection>
      </Page>,
    );
    expect(page().className).toContain("gap-ds-400");
    expect(page().className).toContain("[&>[data-slot=page-header-inline]]:mb-0");
    expect(page().firstElementChild!.getAttribute("data-slot")).toBe("page-header-inline");
  });
});

describe("PageSection", () => {
  it("a titled section is a region named by its h2, with description and actions in its header", () => {
    inLocale(
      <PageSection title="Active" description="Signed in this month." actions={<button type="button">Export</button>}>
        rows
      </PageSection>,
    );
    const region = screen.getByRole("region", { name: "Active" });
    expect(screen.getByRole("heading", { level: 2, name: "Active" })).toBeTruthy();
    expect(region.textContent).toContain("Signed in this month.");
    expect(region.querySelector("[data-slot='page-section-actions']")!.textContent).toBe("Export");
    expect(region.className).toContain("gap-ds-200");
  });

  it("without a title or actions it is a plain section with no header", () => {
    inLocale(<PageSection id="form">fields</PageSection>);
    const section = document.querySelector("[data-slot='page-section']")!;
    expect(section.getAttribute("id")).toBe("form");
    expect(section.hasAttribute("aria-labelledby")).toBe(false);
    expect(section.querySelector("[data-slot='page-section-header']")).toBeNull();
  });
});
