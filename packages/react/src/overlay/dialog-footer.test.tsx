import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "../action/index";
import { DesignSystemProvider } from "../provider";
import { Dialog, useDialogClose } from "./index";

// Dialog's `footer`: custom content in the footer, in place of primaryAction / secondaryAction, as Drawer's footer.

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function CloseFromFooter() {
  const close = useDialogClose();
  return <Button onPress={close}>Done</Button>;
}

describe("Dialog footer", () => {
  it("renders the footer content in place of the actions, and closes through useDialogClose", () => {
    const onOpenChange = vi.fn();
    render(
      <DesignSystemProvider>
        <Dialog title="Share" defaultOpen onOpenChange={onOpenChange} footer={<CloseFromFooter />}>
          <p>Body</p>
        </Dialog>
      </DesignSystemProvider>,
    );
    const footer = document.querySelector('[data-slot="dialog-footer"]') as HTMLElement;
    expect(within(footer).getByRole("button", { name: "Done" })).toBeTruthy();
    expect(within(footer).queryByRole("button", { name: "Cancel" })).toBeNull();
    act(() => {
      fireEvent.click(within(footer).getByRole("button", { name: "Done" }));
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("warns once when footer and an action are both given", () => {
    render(
      <DesignSystemProvider>
        <Dialog title="Share" defaultOpen footer={<span>Custom</span>} primaryAction={{ label: "Save", onPress: () => {} }}>
          <p>Body</p>
        </Dialog>
      </DesignSystemProvider>,
    );
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(warn.mock.calls.filter(([message]: unknown[]) => String(message).includes("`footer` replaces")).length).toBe(1);
  });
});
