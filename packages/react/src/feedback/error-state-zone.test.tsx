import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DesignSystemProvider } from "../provider";
import { ErrorState } from "./index";

afterEach(cleanup);

const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en">{ui}</DesignSystemProvider>);

describe("ErrorState timeZone", () => {
  const at = new Date("2026-03-18T23:30:00Z");

  it("shows when it failed in the given zone, the same on any device", () => {
    inLocale(<ErrorState errorCode="E-42" occurredAt={at} timeZone="Asia/Tokyo" />);
    // 23:30 UTC is 08:30 the next day in Tokyo.
    expect(document.querySelector("[data-slot='error-state-time']")!.textContent).toMatch(/Mar 19, 2026.*8:30/);
  });

  it("an unknown zone falls back instead of throwing", () => {
    expect(() => inLocale(<ErrorState errorCode="E-42" occurredAt={at} timeZone="Mars/Olympus" />)).not.toThrow();
  });
});
