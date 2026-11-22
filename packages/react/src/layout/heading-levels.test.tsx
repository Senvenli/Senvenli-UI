import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DesignSystemProvider } from "../provider";
import { ErrorState } from "../feedback";
import { AuthFormLayout, ResetSentCard } from "./index";

afterEach(cleanup);

const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en">{ui}</DesignSystemProvider>);

describe("heading levels of the auth pieces", () => {
  it("AuthFormLayout is the page's h1 by default and an h2 when the page has its own", () => {
    inLocale(<AuthFormLayout title="Sign in"><form /></AuthFormLayout>);
    expect(screen.getByRole("heading", { name: "Sign in" }).tagName).toBe("H1");
    cleanup();
    inLocale(<AuthFormLayout title="Sign in" headingLevel={2}><form /></AuthFormLayout>);
    const heading = screen.getByRole("heading", { name: "Sign in" });
    expect(heading.tagName).toBe("H2");
    // The level never changes the look.
    expect(heading.className).toContain("text-heading-large");
  });

  it("ResetSentCard takes a heading level", () => {
    inLocale(<ResetSentCard headingLevel={2} labels={{ title: "Check your inbox", description: "We sent a link.", resend: "Resend link" }} onResend={() => undefined} />);
    expect(screen.getByRole("heading", { name: "Check your inbox" }).tagName).toBe("H2");
  });
});

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
