import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DS_STRINGS, registerDsStrings } from "../i18n";
import { ErrorState } from "./index";

afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

function press(key: string, target: Element) {
  fireEvent.keyDown(target, { key });
  fireEvent.keyUp(target, { key });
}

describe("ErrorState retryLabel / isRetryPending", () => {
  it("retryLabel overrides the localized label", () => {
    inLocale(<ErrorState title="Reports could not be loaded" description="Try again." onRetry={() => {}} retryLabel="Refresh reports" />);
    const retry = screen.getByRole("button", { name: "Refresh reports" });
    expect(retry.getAttribute("data-slot")).toBe("error-state-retry");
    expect(screen.queryByRole("button", { name: DS_STRINGS.retry.en })).toBeNull();
  });

  it("without retryLabel the default stays localized: a registered language, with English as the fallback", () => {
    registerDsStrings("de", { retry: "Erneut versuchen" });
    // A regional tag uses its language's strings; a language nobody registered gets English.
    for (const [locale, label] of [["de", "Erneut versuchen"], ["de-AT", "Erneut versuchen"], ["en", DS_STRINGS.retry.en], ["nl", DS_STRINGS.retry.en]] as const) {
      const { unmount } = inLocale(<ErrorState title="Reports could not be loaded" description="Check your connection." onRetry={() => {}} />, locale);
      expect(screen.getByRole("button", { name: label }), locale).toBeTruthy();
      unmount();
    }
    expect(DS_STRINGS.retry.en).not.toBe("Erneut versuchen");
  });

  it("isRetryPending shows the retry busy and it cannot be pressed (pointer or keyboard)", () => {
    const onRetry = vi.fn();
    inLocale(<ErrorState title="Reports could not be loaded" description="Try again." onRetry={onRetry} isRetryPending />);
    const retry = screen.getByRole("button", { name: DS_STRINGS.retry.en });
    expect(retry.hasAttribute("data-pending")).toBe(true);
    expect(retry.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(retry);
    act(() => retry.focus());
    press("Enter", retry);
    press(" ", retry);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("after isRetryPending clears, the retry works again", () => {
    const onRetry = vi.fn();
    const ui = (pending: boolean) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <ErrorState title="Reports could not be loaded" description="Try again." onRetry={onRetry} isRetryPending={pending} />
      </DesignSystemProvider>
    );
    const { rerender } = render(ui(true));
    rerender(ui(false));
    const retry = screen.getByRole("button", { name: DS_STRINGS.retry.en });
    expect(retry.hasAttribute("data-pending")).toBe(false);
    act(() => retry.focus());
    press("Enter", retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("works in RTL with an overridden label", () => {
    inLocale(<ErrorState title="تعذر التحميل" description="حاول مرة أخرى." onRetry={() => {}} retryLabel="تحديث التقارير" />, "ar", "rtl");
    expect(screen.getByRole("button", { name: "تحديث التقارير" })).toBeTruthy();
  });
});
