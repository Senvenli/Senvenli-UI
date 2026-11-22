import * as React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { ResetSentCard } from "./index";

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: ResizeObserverMock,
  });
});

afterEach(cleanup);

const sentLabels = {
  title: "Check your inbox",
  description: "If an account exists we've sent a link.",
  resend: "Resend link",
  resendIn: (s: number) => `Resend in ${s}s`,
};

describe("ResetSentCard", () => {
  it("rate-limits resend behind a cooldown, then enables it", () => {
    vi.useFakeTimers();
    try {
      const onResend = vi.fn();
      render(<ResetSentCard labels={sentLabels} onResend={onResend} cooldownSeconds={2} />);

      const cooling = screen.getByRole("button", { name: "Resend in 2s" }) as HTMLButtonElement;
      expect(cooling.disabled).toBe(true);

      React.act(() => {
        vi.advanceTimersByTime(2000);
      });

      const ready = screen.getByRole("button", { name: "Resend link" }) as HTMLButtonElement;
      expect(ready.disabled).toBe(false);
      fireEvent.click(ready);
      expect(onResend).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("takes all its copy from the app, and sets the title in the DS heading type style", () => {
    render(
      <ResetSentCard labels={sentLabels} onResend={vi.fn()} backSlot={<a href="/sign-in">Back to sign in</a>} />,
    );

    const title = screen.getByRole("heading", { level: 1, name: "Check your inbox" });
    const utilities = title.className.split(/\s+/);
    expect(utilities).toContain("text-heading-large");
    expect(utilities).toContain("text-ds-text");
    expect(utilities.filter((utility) => /^(?:font-|tracking-|text-(?:xs|sm|base|lg|\d?xl)$)/.test(utility))).toEqual([]);
    expect(screen.getByText("If an account exists we've sent a link.")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Back to sign in" })).not.toBeNull();
  });

  it("starts ready when the send was long ago (initialCooldown 0)", () => {
    render(<ResetSentCard labels={sentLabels} onResend={vi.fn()} initialCooldown={0} />);
    expect((screen.getByRole("button", { name: "Resend link" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("sends once at a time, then waits; a failed send starts no wait and says so", async () => {
    vi.useFakeTimers();
    try {
      let reject!: (error: Error) => void;
      const onResend = vi.fn(() => new Promise<void>((_, fail) => (reject = fail)));
      render(<ResetSentCard labels={{ ...sentLabels, resendFailed: "Couldn't resend." }} onResend={onResend} cooldownSeconds={5} initialCooldown={0} />);

      const button = screen.getByRole("button", { name: "Resend link" });
      fireEvent.click(button);
      fireEvent.click(button);
      expect(onResend).toHaveBeenCalledTimes(1);

      await act(async () => reject(new Error("offline")));
      expect(screen.getByRole("alert").textContent).toBe("Couldn't resend.");
      expect((screen.getByRole("button", { name: "Resend link" }) as HTMLButtonElement).disabled).toBe(false);

      onResend.mockImplementationOnce(() => Promise.resolve());
      await act(async () => fireEvent.click(screen.getByRole("button", { name: "Resend link" })));
      expect(screen.queryByRole("alert")).toBeNull();
      expect((screen.getByRole("button", { name: "Resend in 5s" }) as HTMLButtonElement).disabled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
