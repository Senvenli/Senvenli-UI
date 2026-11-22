"use client";

import * as React from "react";
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay, useLocale } from "react-aria-components";
import { cn } from "../utils";
import { MotionScope, type WithMotion, useMotionAttribute } from "../defaults";
import { Button } from "../action/button";
import { CloseButton } from "../action/close-button";
import { collapseSheetLabel, discardCloseLabel, expandSheetLabel, keepEditingLabel, unsavedBodyLabel, unsavedTitleLabel } from "../i18n";
import { BLANKET, DIALOG_ELEMENT, DRAWER_WIDTH, type OpenProps, OverlayContents, type OverlaySize, hasDescription, useOverlayOpen } from "./overlay-base";

export type DrawerProps = OpenProps & {
  title: React.ReactNode;
  /**
   * Under the title: "Jordan Lee · 14–18 Oct". When given, the drawer is described by it
   * (`aria-describedby`); without it (or with `""`, `false`, `null`) nothing is rendered.
   */
  description?: React.ReactNode;
  /** Beside the close button: a status Badge, a menu. */
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  /** Sticky at the bottom: the record's actions. */
  footer?: React.ReactNode;
  /** small 380px, large 560px (medium reads as large). */
  size?: OverlaySize;
  /**
   * The edge it slides in from, at every width (the app decides, e.g. `bottom` on phones): `end` (default) and
   * `start` are the inline sides and mirror in right-to-left; `bottom` is a sheet that snaps between half and full
   * height; `top` drops down from above.
   */
  position?: DrawerPosition;
  /** Closing (button, Esc, scrim, useDrawerClose) asks first: "Unsaved changes". */
  hasUnsavedChanges?: boolean;
};

export type DrawerPosition = "start" | "end" | "top" | "bottom";

export type DrawerClose = (options?: {
  /**
   * Close without the unsaved question: after a save ("Save and close"), when the parent's
   * `hasUnsavedChanges` has not re-rendered yet.
   */
  force?: boolean;
}) => void;

const DrawerCloseContext = React.createContext<DrawerClose>(() => {});

/**
 * The drawer's close, for its footer or body. By default it asks first with unsaved edits, like the close
 * button, Esc and the scrim; after saving call `close({ force: true })`.
 */
export function useDrawerClose(): DrawerClose {
  return React.useContext(DrawerCloseContext);
}

/** Where each position sits and the way it slides; the sides use logical edges, so right-to-left mirrors them. */
const DRAWER_POSITION: Record<DrawerPosition, string> = {
  end: cn(
    // Clear of a notch at the top and, in landscape, at the inline end.
    "inset-y-0 end-0 max-w-full pt-[env(safe-area-inset-top,0px)] pe-[env(safe-area-inset-right,0px)] rtl:pe-[env(safe-area-inset-left,0px)]",
    "data-[entering]:translate-x-full data-[exiting]:translate-x-full rtl:data-[entering]:-translate-x-full rtl:data-[exiting]:-translate-x-full",
  ),
  start: cn(
    "inset-y-0 start-0 max-w-full pt-[env(safe-area-inset-top,0px)] ps-[env(safe-area-inset-left,0px)] rtl:ps-[env(safe-area-inset-right,0px)]",
    "data-[entering]:-translate-x-full data-[exiting]:-translate-x-full rtl:data-[entering]:translate-x-full rtl:data-[exiting]:translate-x-full",
  ),
  bottom: "inset-x-0 bottom-0 rounded-t-ds-xlarge data-[entering]:translate-y-full data-[exiting]:translate-y-full",
  top: "inset-x-0 top-0 max-h-[85dvh] rounded-b-ds-xlarge pt-[env(safe-area-inset-top,0px)] data-[entering]:-translate-y-full data-[exiting]:-translate-y-full",
};

/** Drag distance on the grip that counts as a swipe rather than a tap (px). */
const SWIPE = 40;

/** The sheet's grip: tap toggles half/full; swipe up expands, swipe down collapses (or closes from half). */
function Grip({ expanded, onExpand, onCollapse, onDismiss }: { expanded: boolean; onExpand: () => void; onCollapse: () => void; onDismiss: () => void }) {
  const { locale } = useLocale();
  const start = React.useRef<number | null>(null);
  const moved = React.useRef(false);
  return (
    <button
      type="button"
      data-slot="drawer-grip"
      aria-label={expanded ? collapseSheetLabel(locale) : expandSheetLabel(locale)}
      aria-expanded={expanded}
      onPointerDown={(event) => {
        start.current = event.clientY;
        moved.current = false;
        // Keep the pointer while it drags past the 24px grip (touch is captured anyway; a mouse is not).
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerUp={(event) => {
        if (start.current === null) return;
        const dy = event.clientY - start.current;
        start.current = null;
        if (Math.abs(dy) < SWIPE) return;
        moved.current = true;
        if (dy < 0) onExpand();
        else if (expanded) onCollapse();
        else onDismiss();
      }}
      onClick={() => {
        if (moved.current) {
          moved.current = false;
          return;
        }
        if (expanded) onCollapse();
        else onExpand();
      }}
      className="mx-auto mt-ds-100 grid h-6 w-full shrink-0 cursor-grab touch-none place-items-center outline-hidden focus-visible:inset-ring-2 focus-visible:inset-ring-ds-border-focused"
    >
      <span aria-hidden className="h-1 w-9 rounded-ds-full bg-ds-border-bold" />
    </button>
  );
}

/** "Unsaved changes": a real nested modal (focus kept inside, the drawer behind it inert, Esc = keep editing). */
function UnsavedPrompt({ isOpen, onKeep, onDiscard }: { isOpen: boolean; onKeep: () => void; onDiscard: () => void }) {
  const { locale } = useLocale();
  return (
    <ModalOverlay
      {...useMotionAttribute()}
      isOpen={isOpen}
      onOpenChange={(next) => {
        if (!next) onKeep();
      }}
      isDismissable
      data-slot="drawer-unsaved-overlay"
      className={cn(BLANKET, "grid place-items-center p-ds-300")}
    >
      <Modal data-slot="drawer-unsaved-modal" className="w-full max-w-90 rounded-ds-xlarge bg-ds-surface-overlay text-ds-text shadow-ds-overlay outline-hidden">
        <AriaDialog role="alertdialog" data-slot="drawer-unsaved" className="flex flex-col gap-ds-150 p-ds-300 outline-hidden">
          <Heading slot="title" data-slot="drawer-unsaved-title" className="m-0 text-heading-small">{unsavedTitleLabel(locale)}</Heading>
          <span data-slot="drawer-unsaved-body" className="text-body text-ds-text-subtle">{unsavedBodyLabel(locale)}</span>
          <div data-slot="drawer-unsaved-actions" className="flex flex-wrap justify-end gap-ds-100">
            <Button variant="subtle" autoFocus onPress={onKeep} data-slot="drawer-keep-editing">{keepEditingLabel(locale)}</Button>
            <Button variant="primary" tone="danger" onPress={onDiscard} data-slot="drawer-discard">{discardCloseLabel(locale)}</Button>
          </div>
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}

/**
 * A panel over the page to show or edit one record without losing the list behind it, from the edge `position`
 * names: an inline side (380 or 560px, full height), the bottom (a sheet that snaps between half and full height)
 * or the top. Header with
 * title, description and status; a scrolling body; a sticky footer; both keep clear of notches and the home
 * indicator. With unsaved edits every way of closing asks first. The title names the drawer and the
 * description, when there is one, describes it.
 */
function DrawerBody({
  size = "small", position = "end", isOpen, defaultOpen, onOpenChange, hasUnsavedChanges,
  title, description: subtitle, headerActions, children, footer,
}: DrawerProps) {
  const state = useOverlayOpen({ isOpen, defaultOpen, onOpenChange });
  const subtitleId = React.useId();
  // Described only when there is a subtitle, as Dialog's description; otherwise the drawer's DOM is unchanged.
  const describedBy = hasDescription(subtitle) ? subtitleId : undefined;
  const bottom = position === "bottom";
  const [expanded, setExpanded] = React.useState(false);
  // A sheet opens at half height every time. Reset as it opens, not as it closes, so the closing slide does
  // not also animate the height down.
  const [wasOpen, setWasOpen] = React.useState(state.isOpen);
  if (wasOpen !== state.isOpen) {
    setWasOpen(state.isOpen);
    if (state.isOpen) setExpanded(false);
  }
  const [asking, setAsking] = React.useState(false);
  // Every close request (button, Esc, scrim, grip swipe, useDrawerClose) comes through here.
  const request = () => (hasUnsavedChanges ? setAsking(true) : state.close());
  const close: DrawerClose = (options) => (options?.force ? state.close() : request());
  return (
    <ModalOverlay
      {...useMotionAttribute()}
      isOpen={state.isOpen}
      onOpenChange={(next) => {
        if (!next) request();
      }}
      isDismissable
      data-slot="drawer-overlay"
      data-position={position}
      className={BLANKET}
    >
      <Modal
        data-slot="drawer"
        className={cn(
          "fixed flex flex-col overflow-hidden bg-ds-surface-overlay text-ds-text shadow-ds-overlay outline-hidden",
          "transition-[translate,height] duration-(--ds-duration-slow) ease-ds-enter data-[exiting]:ease-ds-exit motion-reduce:transition-none",
          DRAWER_POSITION[position],
          bottom && (expanded ? "h-[calc(100dvh-env(safe-area-inset-top,0px)-var(--ds-space-200))]" : "h-[50dvh]"),
          (position === "start" || position === "end") && DRAWER_WIDTH[size],
        )}
      >
        <AriaDialog aria-describedby={describedBy} data-slot="drawer-dialog" className={DIALOG_ELEMENT}>
          <OverlayContents>
          <DrawerCloseContext.Provider value={close}>
            {bottom && (
              <Grip expanded={expanded} onExpand={() => setExpanded(true)} onCollapse={() => setExpanded(false)} onDismiss={request} />
            )}
            <div data-slot="drawer-header" className="flex items-start justify-between gap-ds-200 border-b border-ds-border px-ds-300 py-ds-200">
              <div data-slot="drawer-heading" className="flex min-w-0 flex-col gap-ds-025">
                <Heading slot="title" data-slot="drawer-title" className="m-0 text-heading-medium">{title}</Heading>
                {describedBy && <span id={describedBy} data-slot="drawer-subtitle" className="text-body-small text-ds-text-subtle">{subtitle}</span>}
              </div>
              <div data-slot="drawer-header-actions" className="flex shrink-0 items-center gap-ds-100">
                {headerActions}
                <CloseButton data-slot="drawer-close" onPress={request} />
              </div>
            </div>
            <div
              data-slot="drawer-body"
              className={cn(
                "min-h-0 flex-1 overflow-y-auto px-ds-300 pt-ds-200 text-body",
                // Without a footer the body is the last thing above the home indicator.
                footer ? "pb-ds-200" : "pb-[max(var(--ds-space-200),env(safe-area-inset-bottom,0px))]",
              )}
            >
              {children}
            </div>
            {footer && (
              <div
                data-slot="drawer-footer"
                className="flex flex-wrap items-center justify-end gap-ds-100 border-t border-ds-border px-ds-300 pt-ds-150 pb-[max(var(--ds-space-150),env(safe-area-inset-bottom,0px))]"
              >
                {footer}
              </div>
            )}
          </DrawerCloseContext.Provider>
          </OverlayContents>
          <UnsavedPrompt
            isOpen={asking}
            onKeep={() => setAsking(false)}
            onDiscard={() => {
              setAsking(false);
              state.close();
            }}
          />
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}

/** Drawer with its own `motion` (auto, reduce or none); see DrawerBody for the component itself. */
export function Drawer({ motion, ...props }: DrawerProps & WithMotion) {
  return (
    <MotionScope motion={motion}>
      <DrawerBody {...(props as DrawerProps)} />
    </MotionScope>
  );
}
