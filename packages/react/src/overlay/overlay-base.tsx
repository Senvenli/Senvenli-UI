"use client";

import * as React from "react";
import { Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Modal, ModalOverlay, OverlayTriggerStateContext, type DialogTriggerProps } from "react-aria-components";
import { cn } from "../utils";
import { useMotionAttribute } from "../defaults";

/**
 * One size dictionary for Dialog and Drawer: small, medium, large. A dialog is 440, 600 or
 * 800px wide; a drawer is 380 or 560px (it has no medium; medium reads as large).
 */
export type OverlaySize = "small" | "medium" | "large";

/**
 * `xlarge` is Dialog's only: 1152px, for a two- or three-column form over the page it edits
 * (an order edit). Below that it takes the viewport less the frame's padding, as every size does.
 */
export type DialogWidth = OverlaySize | "xlarge";

const DIALOG_WIDTH: Record<DialogWidth, string> = {
  small: "max-w-110",
  medium: "max-w-150",
  large: "max-w-200",
  xlarge: "max-w-288",
};

export const DRAWER_WIDTH: Record<OverlaySize, string> = {
  small: "w-95",
  medium: "w-140",
  large: "w-140",
};

/** The scrim: `ds-blanket`, fading in `ds-duration-slow`; still for reduced motion. */
export const BLANKET =
  "fixed inset-0 z-50 bg-ds-blanket transition-opacity duration-(--ds-duration-slow) ease-ds-enter " +
  "data-[entering]:opacity-0 data-[exiting]:opacity-0 data-[exiting]:ease-ds-exit motion-reduce:transition-none";

/** Every overlay's inner focus target: React Aria's dialog element, never outlined itself. */
export const DIALOG_ELEMENT = "flex min-h-0 flex-1 flex-col outline-hidden";

type TriggerState = NonNullable<React.ContextType<typeof OverlayTriggerStateContext>>;

/**
 * The state of the DialogTrigger an overlay belongs to. React Aria's own context is also provided by every
 * open modal, so a Dialog nested in a Drawer would bind to the drawer; this one is set by DialogTrigger only
 * and cleared inside every overlay.
 */
const OwnTriggerContext = React.createContext<TriggerState | null>(null);

function TriggerBridge({ children }: { children: React.ReactNode }) {
  const state = React.useContext(OverlayTriggerStateContext);
  return <OwnTriggerContext.Provider value={state}>{children}</OwnTriggerContext.Provider>;
}

/** True inside an open overlay's contents, where React Aria's trigger context is that overlay's own. */
const InsideOverlayContext = React.createContext(false);

/** Overlay contents: a nested overlay must not see the outer one's trigger. */
export function OverlayContents({ children }: { children: React.ReactNode }) {
  return (
    <InsideOverlayContext.Provider value>
      <OwnTriggerContext.Provider value={null}>{children}</OwnTriggerContext.Provider>
    </InsideOverlayContext.Provider>
  );
}

/**
 * The button that opens a Dialog, AlertDialog or Drawer: put it first, the overlay after it. Inside another
 * overlay (a Dialog in a Drawer) use this one, not React Aria's own DialogTrigger, which there only sees the
 * outer overlay's state.
 */
export function DialogTrigger({ children, ...props }: DialogTriggerProps) {
  return (
    <AriaDialogTrigger {...props}>
      <TriggerBridge>{children}</TriggerBridge>
    </AriaDialogTrigger>
  );
}

export type OpenProps = {
  /**
   * Open without a DialogTrigger (a URL, a row click). Inside a DialogTrigger, put `onOpenChange` on the
   * trigger instead: the trigger owns the state there.
   */
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
};

/**
 * Open state for an overlay that can sit in a DialogTrigger or stand alone. Inside a trigger the trigger's
 * state is used; otherwise `isOpen`/`defaultOpen`. `close` is the one way to close, so `onOpenChange(false)`
 * fires once whichever control asked (button, Esc, scrim).
 */
export function useOverlayOpen({ isOpen, defaultOpen, onOpenChange }: OpenProps) {
  const ownTrigger = React.useContext(OwnTriggerContext);
  const ariaTrigger = React.useContext(OverlayTriggerStateContext);
  const inside = React.useContext(InsideOverlayContext);
  // Our DialogTrigger first; React Aria's own DialogTrigger also works, except inside another overlay, where
  // that context belongs to the outer overlay.
  const trigger = ownTrigger ?? (inside ? null : ariaTrigger);
  const [own, setOwn] = React.useState(defaultOpen ?? false);
  const open = trigger ? trigger.isOpen : (isOpen ?? own);
  const set = (next: boolean) => {
    if (trigger) {
      if (next) trigger.open();
      else trigger.close();
      return;
    }
    if (isOpen === undefined) setOwn(next);
    onOpenChange?.(next);
  };
  return { isOpen: open, open: () => set(true), close: () => set(false) };
}

/**
 * `data-*` attributes, such as `data-testid`, passed through to a part of the dialog. `data-slot`
 * (and the footer's `data-layout`) is the DS's own and is never overridden. Not exported: the props that take it name it.
 */
export type DataAttributes = { [name: `data-${string}`]: string | number | boolean | undefined };

/** The `data-*` entries of a props object, without the DS's own `data-slot`. */
export function dataAttributes(source: object | null | undefined): DataAttributes {
  const picked: DataAttributes = {};
  if (!source) return picked;
  for (const [name, value] of Object.entries(source)) {
    if (name.startsWith("data-") && name !== "data-slot") picked[name as `data-${string}`] = value as DataAttributes[`data-${string}`];
  }
  return picked;
}

/**
 * Focus on open: the first field of the body, or the secondary action when the primary one destroys
 * something. Runs after React Aria's own first-focus, so it wins. A destructive primary with no secondary
 * (`secondaryAction={null}` on a full-screen dialog) has no safe button to start on, so focus goes to the first
 * field as it does for any other dialog, and to the dialog itself when the body has none. The
 * app's `initialFocusRef`, when it holds an element, comes before every rule.
 */
export function useInitialFocus(
  body: React.RefObject<HTMLElement | null>,
  secondary: React.RefObject<HTMLElement | null>,
  safeFirst: boolean,
  initial?: React.RefObject<HTMLElement | null>,
) {
  React.useEffect(() => {
    if (initial?.current) {
      initial.current.focus();
      // An element that cannot take focus (a hidden title, which has no tabIndex; UI#528 review, or a
      // container without one) leaves focus where it was, and a focus handler on the ref may move it
      // outside: in both cases the dialog's own rule below picks the target instead (UI#529 review).
      if (initial.current.contains(document.activeElement)) return;
    }
    if (safeFirst && secondary.current) {
      secondary.current.focus();
      return;
    }
    const field = [...(body.current?.querySelectorAll<HTMLElement>(FIRST_FIELD) ?? [])].find(isReachableField);
    field?.focus();
  }, []);
}

/**
 * A field the dialog may start on: a text input, a text area, a native select, a combobox, a date or time segment,
 * or a Select or MultiSelect's button (it opens a listbox). In document order.
 */
const FIRST_FIELD =
  "input:not([type='hidden']):not([disabled]), textarea:not([disabled]), select:not([disabled]), [role='combobox'], [role='spinbutton'][tabindex], " +
  "button[aria-haspopup='listbox']:not([disabled])";

/**
 * Not the native fields React Aria keeps for forms and autofill behind a Select (its hidden `<select>` and input),
 * which are hidden from assistive tech, marked to take no focus and out of the tab order: the dialog
 * started on that `<select>` and not on the Select's button. Anything under `aria-hidden` or `inert`, or with a
 * negative tabindex on a native field, is passed over.
 */
function isReachableField(element: HTMLElement) {
  if (element.closest("[aria-hidden='true'], [inert], [data-react-aria-prevent-focus]")) return false;
  if (element.matches("input, textarea, select") && element.tabIndex < 0) return false;
  return true;
}

/** React Aria's FocusScope dispatches this on the element it is about to give focus back to; cancelling it stops that. */
const RESTORE_FOCUS_EVENT = "react-aria-focus-scope-restore";

/**
 * `returnFocusRef`: when the dialog's contents unmount (it closed), focus goes to the ref's element
 * instead of the opener. React Aria's own return to the opener is cancelled for that one close, so the opener
 * never flashes focus (and its focus handlers never run). Focus the app moved elsewhere on purpose is left alone.
 * Without the ref, or with it empty, nothing here runs and React Aria returns focus to the opener as before.
 */
export function useReturnFocus(target: React.RefObject<HTMLElement | null> | undefined) {
  const latest = React.useRef(target);
  latest.current = target;
  // The element focused as the dialog opens is the one React Aria would return to.
  const [opener] = React.useState(() => (typeof document === "undefined" ? null : document.activeElement));
  // Strict Mode unmounts and remounts effects once in development: that is not a close.
  const mounted = React.useRef(false);
  React.useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (!latest.current) return;
      const ref = latest.current;
      const cancel = (event: Event) => {
        if (!mounted.current && ref.current && event.target === opener) event.preventDefault();
      };
      document.addEventListener(RESTORE_FOCUS_EVENT, cancel, true);
      requestAnimationFrame(() => {
        document.removeEventListener(RESTORE_FOCUS_EVENT, cancel, true);
        if (mounted.current) return;
        const element = ref.current;
        const active = document.activeElement;
        const unclaimed = !active || active === document.body || active === opener || !active.isConnected;
        if (element?.isConnected && unclaimed) element.focus();
      });
    };
  }, [opener]);
}

/**
 * A form-submit primary while pending: React Aria turns the button into `type="button"`, so a click
 * no longer submits, but Enter in a form with one field still would (HTML's implicit submission needs no
 * button). Every submit of that form is stopped here until the action settles, before React's `onSubmit` sees it.
 * The listener sits on `document` (capture) and matches the form by its id when the submit happens, so a form
 * remounted with the same id while pending is stopped too; another form still submits. React's capture
 * handlers on the form (`onSubmitCapture`) still run while pending: the event is cancelled on `document` but
 * stopped only on the form itself, after React's root has seen its capture phase and before its bubble.
 */
export function useBlockedSubmit(formId: string | undefined, blocked: boolean) {
  React.useEffect(() => {
    if (!formId || !blocked) return;
    const stopAtForm = (event: Event) => event.stopPropagation();
    const block = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.id !== formId) return;
      event.preventDefault();
      // Added while the event is on its way down, so it runs when the event reaches the form; taken off after this
      // dispatch in case something above stopped the event first (a task, so never in the middle of it).
      form.addEventListener("submit", stopAtForm, { capture: true, once: true });
      setTimeout(() => form.removeEventListener("submit", stopAtForm, { capture: true }), 0);
    };
    document.addEventListener("submit", block, true);
    return () => document.removeEventListener("submit", block, true);
  }, [formId, blocked]);
}

const TABBABLE = [
  "button:not([disabled])",
  "[href]",
  "input:not([type='hidden']):not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable]:not([contenteditable='false'])",
  "summary",
  "audio[controls]",
  "video[controls]",
].join(", ");

/**
 * Development only: with the close button hidden and no control a keyboard can reach inside, a
 * keyboard user can neither go on nor, without `isDismissable`, leave; even with it (Esc), a touch user on
 * `fullscreen` has no press outside. So it warns whenever the close button is hidden and nothing inside is
 * tabbable, whatever `isDismissable` says. Checked once it opens.
 */
export function useStrandedWarning(closeHidden: boolean, body: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || !closeHidden) return;
    const dialog = body.current?.closest("[data-slot='dialog']");
    if (dialog && !dialog.querySelector(TABBABLE)) {
      console.warn("Dialog: isCloseButtonHidden leaves no close button, and the dialog has no control a keyboard can reach, so a user may be unable to go on or leave. Give it a primaryAction or a control in the body.");
    }
  }, [closeHidden]);
}

export function DialogFrame({ size, children, role, isDismissable, escapeCloses, isOpen, onClose, describedBy, rootData }: {
  size: DialogWidth; children: React.ReactNode; role?: "dialog" | "alertdialog"; isDismissable: boolean; escapeCloses: boolean;
  isOpen: boolean;
  /** The app's `data-*` attributes for the dialog element; its own `data-slot` comes after them. */
  rootData?: DataAttributes;
  /** Every close request (Esc, scrim, the parts' buttons) comes here. */
  onClose: () => void;
  /** The element whose text describes the dialog (an alert's consequence). */
  describedBy?: string;
}) {
  return (
    <ModalOverlay
      {...useMotionAttribute()}
      // Always controlled here: closing goes through `onClose` only, so it is reported once.
      isOpen={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable={isDismissable}
      isKeyboardDismissDisabled={!escapeCloses}
      data-slot="dialog-overlay"
      className={cn(BLANKET, "grid place-items-center overflow-y-auto p-ds-300 pt-[max(var(--ds-space-300),env(safe-area-inset-top,0px))] pb-[max(var(--ds-space-300),env(safe-area-inset-bottom,0px))]")}
    >
      <Modal
        data-slot="dialog-modal"
        // Every size names itself, as fullscreen already did: an app's test reads it, never the width class.
        data-size={size}
        className={cn(
          // A default max height with the body scrolling inside, so a small screen never pushes the footer away.
          "flex max-h-[calc(100dvh-2*var(--ds-space-300))] w-full flex-col overflow-hidden rounded-ds-xlarge bg-ds-surface-overlay text-ds-text shadow-ds-overlay outline-hidden",
          "transition-[opacity,translate] duration-(--ds-duration-slow) ease-ds-enter data-[entering]:translate-y-2 data-[entering]:opacity-0 data-[exiting]:opacity-0 data-[exiting]:ease-ds-exit motion-reduce:transition-none",
          DIALOG_WIDTH[size],
        )}
      >
        <AriaDialog {...rootData} role={role} aria-describedby={describedBy} data-slot="dialog" className={DIALOG_ELEMENT}>
          <OverlayContents>{children}</OverlayContents>
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}

/** An empty description (`""`, `false`, `true`, `null`) renders nothing, so it is the same as none. */
export function hasDescription(description: React.ReactNode) {
  return description != null && typeof description !== "boolean" && description !== "";
}

/** Below 640px: the full-screen dialog's sheet presentation; decided after mount. */
export function useNarrow() {
  return React.useSyncExternalStore(
    (notify) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const query = window.matchMedia("(max-width: 639px)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => typeof window.matchMedia === "function" && window.matchMedia("(max-width: 639px)").matches,
    () => false,
  );
}
