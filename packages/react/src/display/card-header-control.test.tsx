import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { SegmentedControl } from "../navigation/index";
import { DesignSystemProvider } from "../provider";
import { Card, CardHeader } from "./index";

afterEach(cleanup);
const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);
const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;

describe("CardHeader actions", () => {
  it("the header wraps: the title takes the row from 12rem, so a control that does not fit moves under it", () => {
    inLocale(
      <Card>
        <CardHeader title="Traffic" actions={<SegmentedControl label="Metric" defaultValue="a" items={[{ id: "a", label: "Visitors" }, { id: "b", label: "Views" }]} />} />
      </Card>,
    );
    expect(slot("card-header").className).toContain("flex-wrap");
    expect(slot("card-title").parentElement!.className).toContain("flex-[1_1_12rem]");
    expect(screen.getByRole("radiogroup", { name: "Metric" })).toBeTruthy();
  });

  it("only an icon button sits into the corner; a wider control lines up with the title", () => {
    inLocale(
      <Card>
        <CardHeader title="Orders" actions={<Button variant="subtle" iconOnly iconBefore="ellipsis" aria-label="Options" />} />
      </Card>,
    );
    expect(screen.getByRole("button", { name: "Options" }).getAttribute("data-icon-only")).toBe("true");
    expect(slot("card-menu").className).toContain("has-[>[data-icon-only]]:-me-ds-100");
    cleanup();
    inLocale(<Button>Export</Button>);
    expect(screen.getByRole("button", { name: "Export" }).hasAttribute("data-icon-only")).toBe(false);
  });
});
