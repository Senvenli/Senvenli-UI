"use client";

import * as React from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";

import { cn } from "../utils";
import { CloseButton } from "../action/close-button";

/**
 * What a press inside the panel does to it: a link ("link") or a plain action button ("action") closes it;
 * a button that opens or switches something in place (a menu trigger, a toggle, a radio, a tab) keeps it.
 */
function closesPanel(target: Element | null): "link" | "action" | null {
  if (target?.closest?.("a[href]")) return "link";
  const button = target?.closest?.("button");
  if (!button) return null;
  const opensInPlace =
    button.hasAttribute("aria-haspopup") ||
    button.hasAttribute("aria-expanded") ||
    button.hasAttribute("aria-pressed") ||
    ["radio", "checkbox", "switch", "tab", "menuitemradio"].includes(button.getAttribute("role") ?? "");
  return opensInPlace ? null : "action";
}

const BLANKET =
  "fixed inset-0 z-50 bg-ds-blanket transition-opacity duration-(--ds-duration-slow) ease-ds-enter " +
  "data-[entering]:opacity-0 data-[exiting]:opacity-0 data-[exiting]:ease-ds-exit motion-reduce:transition-none";

/**
 * The phone menu of Navbar and Sidebar: a panel from the inline start or end edge, never a bottom sheet
 * (a menu reads top to bottom). A React Aria Modal: focus moves in and is trapped, Esc and the scrim
 * close it, and focus returns to the menu button.
 */
export function NavPanel({
  isOpen,
  onOpenChange,
  label,
  side,
  slot,
  header,
  children,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Names the dialog ("Main menu"). */
  label: string;
  side: "start" | "end";
  /** `data-slot` prefix: "navbar" gives navbar-panel, navbar-panel-overlay. */
  slot: string;
  /** Beside the close button: the brand. */
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable data-slot={`${slot}-panel-overlay`} className={BLANKET}>
      <Modal
        data-slot={`${slot}-panel`}
        className={cn(
          "fixed inset-y-0 flex w-[min(20rem,85vw)] flex-col bg-ds-surface-overlay text-ds-text shadow-ds-overlay outline-hidden",
          // Safe-area insets are physical edges, so they pair with physical padding (RTL keeps them right).
          "pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] [padding-left:env(safe-area-inset-left,0px)] [padding-right:env(safe-area-inset-right,0px)]",
          "transition-[translate] duration-(--ds-duration-slow) ease-ds-enter data-[exiting]:ease-ds-exit motion-reduce:transition-none",
          side === "start"
            ? "start-0 data-[entering]:-translate-x-full data-[exiting]:-translate-x-full rtl:data-[entering]:translate-x-full rtl:data-[exiting]:translate-x-full"
            : "end-0 data-[entering]:translate-x-full data-[exiting]:translate-x-full rtl:data-[entering]:-translate-x-full rtl:data-[exiting]:-translate-x-full",
        )}
      >
        <Dialog aria-label={label} data-slot={`${slot}-panel-dialog`} className="flex min-h-0 flex-1 flex-col outline-hidden">
          {/* Any link chosen in the panel (its own, an action, a language in a menu portalled from it) closes
              it: the layout around a menu usually stays mounted across a client-side navigation. So does a
              plain action button ("Get started" opening a signup dialog would otherwise open under the panel);
              buttons that open or switch something in place (a menu trigger, a toggle, a radio) keep it open. */}
          <div
            className="flex min-h-0 flex-1 flex-col"
            onClickCapture={(event) => {
              // A modified or middle click opens the link elsewhere: the reader stays here, so does the panel.
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
              if (closesPanel(event.target as Element | null)) onOpenChange(false);
            }}
            // From the keyboard React Aria presses a button on Enter/Space without a native click; the key-up
            // reaches this capture before the button acts, so the panel closes first here too.
            onKeyUpCapture={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              if (closesPanel(event.target as Element | null) === "action") onOpenChange(false);
            }}
          >
          <div className="flex h-14 shrink-0 items-center gap-ds-100 border-b border-ds-border px-ds-200">
            <div className="flex min-w-0 flex-1 items-center">{header}</div>
            <CloseButton onPress={() => onOpenChange(false)} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-ds-200 overflow-y-auto p-ds-200">{children}</div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
