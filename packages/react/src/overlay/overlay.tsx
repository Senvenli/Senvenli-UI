"use client";

import * as React from "react";
import {
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  OverlayTriggerStateContext,
  useLocale,
  type DialogTriggerProps,
} from "react-aria-components";

import { cn } from "../utils";
import { Button, type ButtonActionProps } from "../action/button";
import { CloseButton } from "../action/close-button";
import { IconGlyph, type IconName } from "../display/icon";
import { TextField } from "../form/text-field";
import {
  // The prop of the same name (AlertDialog's `cancelLabel`) takes the plain name in this file.
  cancelLabel as defaultCancelLabel,
  collapseSheetLabel,
  discardCloseLabel,
  expandSheetLabel,
  keepEditingLabel,
  typeToConfirmLabel,
  unsavedBodyLabel,
  unsavedTitleLabel,
} from "../i18n";

/**
 * One size dictionary for Dialog and Drawer: small, medium, large. A dialog is 440, 600 or
 * 800px wide; a drawer is 380 or 560px (it has no medium; medium reads as large).
 */
export type OverlaySize = "small" | "medium" | "large";

/**
 * `xlarge` is Dialog's only: 1152px, for a two- or three-column form over the page it edits
 * (an order edit). Below that it takes the viewport less the frame's padding, as every size does.
 */
type DialogWidth = OverlaySize | "xlarge";

const DIALOG_WIDTH: Record<DialogWidth, string> = {
  small: "max-w-110",
  medium: "max-w-150",
  large: "max-w-200",
  xlarge: "max-w-288",
};
const DRAWER_WIDTH: Record<OverlaySize, string> = {
  small: "w-95",
  medium: "w-140",
  large: "w-140",
};

/** The scrim: `ds-blanket`, fading in `ds-duration-slow`; still for reduced motion. */
const BLANKET =
  "fixed inset-0 z-50 bg-ds-blanket transition-opacity duration-(--ds-duration-slow) ease-ds-enter " +
  "data-[entering]:opacity-0 data-[exiting]:opacity-0 data-[exiting]:ease-ds-exit motion-reduce:transition-none";

/** Every overlay's inner focus target: React Aria's dialog element, never outlined itself. */
const DIALOG_ELEMENT = "flex min-h-0 flex-1 flex-col outline-hidden";

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

type OpenProps = {
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
function useOverlayOpen({ isOpen, defaultOpen, onOpenChange }: OpenProps) {
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
 * `isDisabled`: the action cannot be pressed yet, e.g. until the form is valid.
 * `iconBefore` / `iconAfter`: a Lucide icon beside the label ("Continue" with `arrow-right`), as on
 * Button. The label is always shown and is the button's name, so the icon is decorative (`aria-hidden`); the
 * button keeps its size and focus ring. Left out, the button's DOM is unchanged.
 */
export type DialogAction = Pick<ButtonActionProps, "isPending" | "isDisabled" | "iconBefore" | "iconAfter"> & DataAttributes & {
  /** The verb of the title: "Cancel order", never "OK". */
  label: string;
  variant?: "primary" | "danger";
  onPress?: () => void;
  /**
   * The `id` of the form this action submits: the button becomes `type="submit"` with that `form`
   * attribute, so it submits the form from the footer, outside the form element, and Enter in one of the form's
   * fields submits it too (the browser's implicit submission). Handle the submit in the form's `onSubmit`;
   * `onPress`, when given, still runs first. `isDisabled` keeps the form from submitting (click or Enter), and
   * so does `isPending`: while pending, a submit of that form is stopped before it reaches `onSubmit`, so the
   * action never runs twice. Left out, the button is `type="button"` as before.
   *
   * The id must be unique on the page. With two forms of that id, the browser's `form=` targets the first one in
   * document order, and the pending block also stops a submit of a same-id form outside the dialog.
   */
  form?: string;
};

/**
 * `data-*` attributes, such as `data-testid`, passed through to a part of the dialog. `data-slot`
 * (and the footer's `data-layout`) is the DS's own and is never overridden. Not exported: the props that take it name it.
 */
type DataAttributes = { [name: `data-${string}`]: string | number | boolean | undefined };

/** The `data-*` entries of a props object, without the DS's own `data-slot`. */
function dataAttributes(source: object | null | undefined): DataAttributes {
  const picked: DataAttributes = {};
  if (!source) return picked;
  for (const [name, value] of Object.entries(source)) {
    if (name.startsWith("data-") && name !== "data-slot") picked[name as `data-${string}`] = value as DataAttributes[`data-${string}`];
  }
  return picked;
}

/** The secondary action: "Cancel" (closing) unless given a label or a handler. Not exported: DialogProps["secondaryAction"] names it. */
type DialogSecondaryAction = Pick<ButtonActionProps, "iconBefore" | "iconAfter"> & DataAttributes & {
  label?: string;
  onPress?: () => void;
  isDisabled?: boolean;
};

export type DialogProps = OpenProps & DataAttributes & {
  title: React.ReactNode;
  /**
   * One short line under the title: what the dialog is about. When given, the dialog is
   * described by it (`aria-describedby`); without it (or with `""`, `false`, `null`) nothing is rendered.
   */
  description?: React.ReactNode;
  children: React.ReactNode;
  primaryAction?: DialogAction;
  /**
   * "Cancel" by default, closing the dialog; pass a label or a handler to change it. `isDisabled`
   * blocks it, e.g. while the primary action runs; `iconBefore` / `iconAfter` add a
   * decorative icon. `null` leaves it out: a
   * full-screen dialog whose steps carry their own buttons, or a locked completion view, has no secondary action,
   * and with no `primaryAction` either it has no footer at all (the body then takes the bottom padding, and on
   * `fullscreen` reaches down to the home indicator). With `null` and a `danger` primary there is no safe button
   * to focus first, so focus goes to the body's first field (as for any other dialog), or to the dialog itself
   * when the body has none. `data-*` keys reach the button.
   */
  secondaryAction?: DialogSecondaryAction | null;
  /**
   * Leaves out the close button in the header, and does nothing else: Esc and a press outside
   * still follow `isDismissable`. A locked view the user must not dismiss before the flow ends, such as a
   * completion step, sets both: `isCloseButtonHidden` and `isDismissable={false}`. It then closes only when the
   * app closes it (`isOpen`/`onOpenChange`, or an action whose handler does) or through the secondary action, when
   * there is one; a locked dialog inside a DialogTrigger has no close handle, so control it with `isOpen`. Focus
   * stays trapped inside and the title still names the dialog. Give it a way on (a `primaryAction` or a control
   * in the body): with the close button hidden and nothing a keyboard can reach inside, the dialog warns in
   * development (with `isDismissable` Esc still closes it, but a touch user on `fullscreen` has no press outside).
   */
  isCloseButtonHidden?: boolean;
  /**
   * The element that takes focus when the dialog opens, in place of the DS rule (the first field,
   * or the secondary action before a `danger` primary). Pass a ref to an element inside the dialog. Left
   * out, or empty when the dialog opens, the rule applies as before.
   *
   * The ref keeps focus only if, once the dialog calls its `focus()`, focus is on that element or inside it;
   * otherwise the rule applies after all. So a ref to an element that cannot take focus (a container without a
   * `tabIndex`, a hidden title) falls through to the rule, and so does a ref whose own focus handler moves focus
   * to an element outside it: the rule then moves focus again, to the safe action or the first field (with
   * neither, focus stays where the handler put it). A handler that moves focus to an element inside the ref keeps
   * it there. To open on a container, give it `tabIndex={-1}`; to open on another element, pass that element's ref.
   */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /**
   * Where focus goes when the dialog closes, in place of the element that opened it (the
   * trigger): the next step's heading, or a control that stays when the trigger is gone. Read when the dialog
   * closes, so it may point at an element mounted by then. If the app has already moved focus elsewhere on
   * close, it stays there; if the ref is empty, focus returns to the trigger as before.
   */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  /**
   * A ref to the title's heading, for an app that puts focus on the title: on open (a completion view,
   * "Password saved"), or when the dialog's content moves to its next step. Given, the heading takes
   * `tabIndex={-1}`: focusable from code (`titleRef.current.focus()`), never a Tab stop, and a pointer press on it
   * focuses it. It stays the dialog's heading (`role` heading, level 2) and its name (`aria-labelledby`), so a screen
   * reader reads "heading" with the title when focus lands on it.
   *
   * To open on the title, pass the same ref as `initialFocusRef` (`initialFocusRef={titleRef}`): that ref comes first
   * on open, before the first field and the safe secondary action, as for any other element. The title shows the DS
   * focus ring only for keyboard focus (`:focus-visible`), never for a pointer user's; focus on close returns as
   * before (`returnFocusRef`, or the trigger). Left out, the heading renders exactly as before.
   *
   * A hidden title (`isTitleHidden`, fullscreen) is never a focus target: it is `sr-only`, so focus on it would show
   * no indicator. With `isTitleHidden` the ref still holds the heading, but it takes no `tabIndex` and no focus ring,
   * so `titleRef.current.focus()` does nothing and `initialFocusRef={titleRef}` falls through to the dialog's own
   * rule (the first field, or the safe secondary action). To land on something there, aim at a visible element
   * instead: the first field (the default), or a visible heading or control in the body via `initialFocusRef`.
   */
  titleRef?: React.Ref<HTMLHeadingElement>;
  /**
   * `data-*` attributes for the dialog's parts: `header`, `title`, `body`, `footer` and the
   * `close` button. The dialog itself (`role="dialog"`, `data-slot="dialog"`) takes the `data-*` props given to
   * Dialog (`data-testid="set-password"`); the actions take theirs on `primaryAction` / `secondaryAction`. The
   * footer's `data-layout` (`spread`) is the DS's own, like `data-slot`: `partData.footer` cannot set it.
   */
  partData?: Partial<Record<"header" | "title" | "body" | "footer" | "close", DataAttributes>>;
  /**
   * `small` (default, 440px), `medium` (600px) or `large` (800px); `xlarge` (1152px) for a form in two
   * or three columns over the page it edits, such as an order edit; or `fullscreen` for a long
   * task that needs the whole screen, such as a signup: it fills the viewport at every width, slides up as a sheet
   * on phones (below 640px) and fades in above. The header (title, close) and the footer (actions) stay put, clear
   * of the notch and the home indicator, while the body scrolls between them. Below its width every size but
   * `fullscreen` takes the viewport less 24px a side, and its body scrolls inside 100dvh less 48px. Focus, Esc and
   * naming are the same at every size.
   */
  size?: OverlaySize | "xlarge" | "fullscreen";
  /**
   * Scrim click and Esc close it (default). Off for destructive flows with typed input. A `fullscreen`
   * dialog has no scrim, so a press outside it (a toast or banner layered above) never closes it; there
   * this prop controls Esc only. It is independent of `isCloseButtonHidden`: a locked view sets
   * both, `isCloseButtonHidden` and `isDismissable={false}`; a locked dialog inside a DialogTrigger has no close
   * handle, so control it with `isOpen`.
   */
  isDismissable?: boolean;
  /**
   * `fullscreen` only. How the footer places its actions: `end` (default) groups them at the
   * inline end; `spread` puts the secondary action at the inline start and the primary at the inline end
   * ("Back" … "Continue"), mirrored in RTL. A lone primary action stays at the end; a lone secondary action
   * (no `primaryAction`) sits at the inline start.
   */
  footerLayout?: "end" | "spread";
  /**
   * `fullscreen` only. Shown before the title in the header, such as the product's logo. The
   * title then keeps to one line and truncates with an ellipsis (its full text is still the dialog's name);
   * the close button keeps its place at the inline end.
   */
  headerStart?: React.ReactNode;
  /**
   * `fullscreen` only. Hides the title visually, for a frame whose header shows a logo instead;
   * the title stays in the DOM and still names the dialog (`aria-labelledby`), so `title` is still required.
   * A description, when given, stays visible. An empty title (`""`, blank, `null`, `false`) would leave the dialog
   * unnamed, and warns in development.
   */
  isTitleHidden?: boolean;
};

/**
 * Focus on open: the first field of the body, or the secondary action when the primary one destroys
 * something. Runs after React Aria's own first-focus, so it wins. A destructive primary with no secondary
 * (`secondaryAction={null}` on a full-screen dialog) has no safe button to start on, so focus goes to the first
 * field as it does for any other dialog, and to the dialog itself when the body has none. The
 * app's `initialFocusRef`, when it holds an element, comes before every rule.
 */
function useInitialFocus(
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
function useReturnFocus(target: React.RefObject<HTMLElement | null> | undefined) {
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
function useBlockedSubmit(formId: string | undefined, blocked: boolean) {
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
function useStrandedWarning(closeHidden: boolean, body: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || !closeHidden) return;
    const dialog = body.current?.closest("[data-slot='dialog']");
    if (dialog && !dialog.querySelector(TABBABLE)) {
      console.warn("Dialog: isCloseButtonHidden leaves no close button, and the dialog has no control a keyboard can reach, so a user may be unable to go on or leave. Give it a primaryAction or a control in the body.");
    }
  }, [closeHidden]);
}

function DialogFrame({ size, children, role, isDismissable, escapeCloses, isOpen, onClose, describedBy, rootData }: {
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

/**
 * The full-screen frame: the modal covers the viewport, edge to edge, at every width. On a phone
 * (below 640px, Drawer's query) it is presented as a sheet sliding up from the bottom edge; above, it fades in.
 * The side insets (landscape notch) pad the modal; the top and bottom ones pad the header and the footer.
 * Small, medium and large never come here: their frame above is unchanged.
 */
function FullScreenFrame({ children, isDismissable, isOpen, onClose, describedBy, rootData }: {
  children: React.ReactNode; isDismissable: boolean; isOpen: boolean; onClose: () => void; describedBy?: string; rootData?: DataAttributes;
}) {
  const sheet = useNarrow();
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      // No scrim to press: a press on something layered above the frame (a toast, a cookie banner) must not
      // close it, so outside presses never dismiss; `isDismissable` decides Esc alone.
      isDismissable={false}
      isKeyboardDismissDisabled={!isDismissable}
      data-slot="dialog-overlay"
      className={BLANKET}
    >
      <Modal
        data-slot="dialog-modal"
        data-size="fullscreen"
        data-presentation={sheet ? "sheet" : "fullscreen"}
        className={cn(
          "fixed inset-0 flex flex-col overflow-hidden bg-ds-surface-overlay text-ds-text outline-hidden",
          "ps-[env(safe-area-inset-left,0px)] pe-[env(safe-area-inset-right,0px)] rtl:ps-[env(safe-area-inset-right,0px)] rtl:pe-[env(safe-area-inset-left,0px)]",
          "duration-(--ds-duration-slow) ease-ds-enter data-[exiting]:ease-ds-exit motion-reduce:transition-none",
          sheet
            ? "transition-[translate] data-[entering]:translate-y-full data-[exiting]:translate-y-full"
            : "transition-opacity data-[entering]:opacity-0 data-[exiting]:opacity-0",
        )}
      >
        <AriaDialog {...rootData} aria-describedby={describedBy} data-slot="dialog" className={DIALOG_ELEMENT}>
          <OverlayContents>{children}</OverlayContents>
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}

/** Pulled into the corner so its icon lines up with the padding, not its 32px hit area. */
function CornerClose({ onPress, slot, data }: { onPress: () => void; slot: string; data?: DataAttributes }) {
  return (
    <span data-slot={`${slot}-wrap`} className="-me-ds-100 -mt-ds-050 flex">
      <CloseButton {...data} data-slot={slot} onPress={onPress} />
    </span>
  );
}

/**
 * The full-screen parts. Header and footer never shrink and the body is the one scroll container
 * between them, so they stay at the top and bottom; the header clears the notch, the footer the home indicator.
 */
const FULL_HEADER =
  "flex shrink-0 items-start justify-between gap-ds-200 border-b border-ds-border px-ds-300 pb-ds-200 pt-[max(var(--ds-space-300),env(safe-area-inset-top,0px))]";
const FULL_BODY = "min-h-0 flex-1 overflow-y-auto overscroll-contain px-ds-300 py-ds-300 text-body text-ds-text-subtle";
const FULL_FOOTER =
  "flex shrink-0 flex-wrap items-center justify-end gap-ds-100 border-t border-ds-border px-ds-300 pt-ds-200 pb-[max(var(--ds-space-300),env(safe-area-inset-bottom,0px))]";

/** An empty description (`""`, `false`, `true`, `null`) renders nothing, so it is the same as none. */
function hasDescription(description: React.ReactNode) {
  return description != null && typeof description !== "boolean" && description !== "";
}

/** A node that renders something: the `headerStart` test (`null`, `false`, `true`, `""` count as none). */
const isRenderable = hasDescription;

// The full-screen options, each added to the classes above only when used, so a full-screen
// dialog without them renders exactly as before.

/** No footer: the body is the last part, so it clears the home indicator itself (as Drawer's body does). */
const FULL_BODY_NO_FOOTER = "min-h-0 flex-1 overflow-y-auto overscroll-contain px-ds-300 pt-ds-300 pb-[max(var(--ds-space-300),env(safe-area-inset-bottom,0px))] text-body text-ds-text-subtle";
/** `footerLayout="spread"`: the secondary takes the free space after it, so it sits at the start and the primary at the end. */
const FOOTER_SPREAD = "[&>[data-slot=dialog-secondary]]:me-auto";
/** A hidden title is out of flow, so the close button is held at the inline end on its own. */
const HEADER_CLOSE_END = "[&>[data-slot=dialog-close-wrap]]:ms-auto";
/** With `headerStart` the title side takes the room left between the slot and the close button. */
const TITLE_SIDE = "min-w-0 flex-1";

type FullScreenOptions = Pick<DialogProps, "footerLayout" | "headerStart" | "isTitleHidden">;

/** Small, medium and large without a footer (`secondaryAction={null}` and no primary): the body takes the footer's bottom padding. */
const BODY = "min-h-0 flex-1 overflow-y-auto px-ds-300 py-ds-200 text-body text-ds-text-subtle";
const BODY_NO_FOOTER = "min-h-0 flex-1 overflow-y-auto px-ds-300 pt-ds-200 pb-ds-300 text-body text-ds-text-subtle";

type ContentOptions = Pick<DialogProps, "isCloseButtonHidden" | "initialFocusRef" | "returnFocusRef" | "partData" | "titleRef">;

/**
 * The title with `titleRef`: the DS focus ring, a 2px ds-border-focused inset ring, for keyboard focus
 * only (`:focus-visible`), as on the drawer grip and the scroll area, so a pointer user never sees one. The browser's
 * own outline is hidden; no outline or external ring is hand-written (focus-outline.test.ts, focus-state.test.ts).
 * The heading's box reaches 4px past its text on each side (`-mx-ds-050 px-ds-050`), so the ring clears the first and
 * last letters while the text stays exactly where it was. Added only with `titleRef`, and only to a visible title: a
 * hidden one (`isTitleHidden`) keeps `sr-only` alone, takes no tabIndex and is never a focus target (its margin and
 * padding would also partly override `sr-only`'s).
 */
const TITLE_FOCUSABLE =
  "-mx-ds-050 px-ds-050 outline-hidden focus-visible:rounded-ds-small focus-visible:inset-ring-2 focus-visible:inset-ring-ds-border-focused";

function DialogContent({
  title, description, descriptionId, children, primaryAction, secondaryAction, close, fullScreen, footerLayout, headerStart, isTitleHidden,
  isCloseButtonHidden, initialFocusRef, returnFocusRef, partData, titleRef,
}: Pick<DialogProps, "title" | "description" | "children" | "primaryAction" | "secondaryAction"> & FullScreenOptions & ContentOptions & { descriptionId: string; close: () => void; fullScreen?: boolean }) {
  const { locale } = useLocale();
  const body = React.useRef<HTMLDivElement>(null);
  const secondary = React.useRef<HTMLButtonElement>(null);
  const destructive = primaryAction?.variant === "danger";
  const closeHidden = isCloseButtonHidden === true;
  useInitialFocus(body, secondary, destructive, initialFocusRef);
  useReturnFocus(returnFocusRef);
  useBlockedSubmit(primaryAction?.form, primaryAction?.isPending === true);
  useStrandedWarning(closeHidden, body);
  // The full-screen options below reach this component only for `fullscreen` (Dialog drops them for the other sizes).
  const hasStart = isRenderable(headerStart);
  const hasSecondary = secondaryAction !== null;
  const hasFooter = hasSecondary || primaryAction != null;
  // A hidden title keeps only `sr-only` (its own margin and size would fight it); with a start slot it truncates.
  const titleClass = isTitleHidden ? "sr-only" : hasStart ? "m-0 truncate text-heading-medium" : "m-0 text-heading-medium";
  // The app's data-* attributes come first in every part, so the DS's own data-slot wins.
  // With `titleRef` the heading takes the ref, tabIndex -1 and the focus ring; without it, nothing changes.
  // A hidden title takes the ref only: an sr-only heading would show no focus indicator, so it is never a focus target.
  const hasTitleRef = titleRef !== undefined && titleRef !== null;
  const titleText = hasTitleRef && isTitleHidden ? (
    <Heading {...partData?.title} ref={titleRef} slot="title" data-slot="dialog-title" className={titleClass}>{title}</Heading>
  ) : hasTitleRef ? (
    <Heading {...partData?.title} ref={titleRef} tabIndex={-1} slot="title" data-slot="dialog-title" className={`${titleClass} ${TITLE_FOCUSABLE}`}>{title}</Heading>
  ) : (
    <Heading {...partData?.title} slot="title" data-slot="dialog-title" className={titleClass}>{title}</Heading>
  );
  const headerClass = fullScreen ? FULL_HEADER : "flex items-start justify-between gap-ds-200 px-ds-300 pt-ds-300";
  return (
    <>
      <div {...partData?.header} data-slot="dialog-header" className={isTitleHidden ? `${headerClass} ${HEADER_CLOSE_END}` : headerClass}>
        {hasStart && (
          <div data-slot="dialog-header-start" className="flex shrink-0 items-center">{headerStart}</div>
        )}
        {hasDescription(description) ? (
          <div data-slot="dialog-heading" className={hasStart ? `flex flex-col gap-ds-050 ${TITLE_SIDE}` : "flex min-w-0 flex-col gap-ds-050"}>
            {titleText}
            <div id={descriptionId} data-slot="dialog-description" className="text-body text-ds-text-subtle">{description}</div>
          </div>
        ) : hasStart && !isTitleHidden ? (
          <div data-slot="dialog-heading" className={TITLE_SIDE}>{titleText}</div>
        ) : (
          titleText
        )}
        {!closeHidden && <CornerClose slot="dialog-close" onPress={close} data={partData?.close} />}
      </div>
      <div
        {...partData?.body}
        ref={body}
        data-slot="dialog-body"
        className={fullScreen ? (hasFooter ? FULL_BODY : FULL_BODY_NO_FOOTER) : hasFooter ? BODY : BODY_NO_FOOTER}
      >
        {children}
      </div>
      {hasFooter && (
        <div
          {...partData?.footer}
          data-slot="dialog-footer"
          data-layout={footerLayout === "spread" ? "spread" : undefined}
          className={fullScreen ? (footerLayout === "spread" ? `${FULL_FOOTER} ${FOOTER_SPREAD}` : FULL_FOOTER) : "flex flex-wrap items-center justify-end gap-ds-100 px-ds-300 pb-ds-300 pt-ds-100"}
        >
          {hasSecondary && (
            <Button
              {...dataAttributes(secondaryAction)}
              ref={secondary}
              variant="subtle"
              data-slot="dialog-secondary"
              isDisabled={secondaryAction?.isDisabled}
              iconBefore={secondaryAction?.iconBefore}
              iconAfter={secondaryAction?.iconAfter}
              onPress={() => (secondaryAction?.onPress ? secondaryAction.onPress() : close())}
            >
              {secondaryAction?.label ?? defaultCancelLabel(locale)}
            </Button>
          )}
          {primaryAction && (
            <Button
              {...dataAttributes(primaryAction)}
              variant="primary"
              tone={primaryAction.variant === "danger" ? "danger" : "neutral"}
              isPending={primaryAction.isPending}
              isDisabled={primaryAction.isDisabled}
              iconBefore={primaryAction.iconBefore}
              iconAfter={primaryAction.iconAfter}
              onPress={primaryAction.onPress}
              // A form-submit action; without `form` the Button stays type="button".
              type={primaryAction.form ? "submit" : undefined}
              form={primaryAction.form}
              data-slot="dialog-primary"
            >
              {primaryAction.label}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Development only: the full-screen options a smaller size was given, which it ignores. Only values that would
 * change a full-screen dialog count: `isTitleHidden={false}`, `footerLayout="end"` or an empty
 * `headerStart` are the defaults there too, so nothing is lost and nothing is said.
 */
function useFullScreenOnlyWarning(size: DialogWidth | "fullscreen", props: FullScreenOptions) {
  const ignored =
    size === "fullscreen"
      ? []
      : [
          props.footerLayout === "spread" && "footerLayout",
          isRenderable(props.headerStart) && "headerStart",
          props.isTitleHidden === true && "isTitleHidden",
        ].filter((name): name is string => typeof name === "string");
  const signature = ignored.join(", ");
  // One option named takes the singular ("isTitleHidden only applies … ignores it"), several the plural.
  const one = ignored.length === 1;
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || !signature) return;
    console.warn(`Dialog: ${signature} only ${one ? "applies" : "apply"} to size="fullscreen"; size="${size}" ignores ${one ? "it" : "them"}.`);
  }, [signature, size, one]);
}

/** A title that names nothing: empty, blank or not text at all (`""`, `"  "`, `null`, `false`, `true`). */
function isEmptyTitle(title: React.ReactNode) {
  return title === null || typeof title === "boolean" || (typeof title === "string" && title.trim() === "");
}

/**
 * Development only: `isTitleHidden` with an empty title leaves the dialog without a name, since the
 * hidden title is what names it. A left-out title (`undefined`) is already a TypeScript error, so only the empty
 * values that type-check are said here. Fullscreen only: the other sizes ignore `isTitleHidden` (the fullscreen-only
 * warning names it), so their title shows and names the dialog.
 */
function useHiddenEmptyTitleWarning(isTitleHidden: boolean | undefined, title: React.ReactNode, fullScreen: boolean) {
  const unnamed = fullScreen && isTitleHidden === true && isEmptyTitle(title);
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || !unnamed) return;
    console.warn("Dialog: isTitleHidden hides the title, but the title is empty, so the dialog has no accessible name. Give it a title; it stays visually hidden.");
  }, [unnamed]);
}

/**
 * A decision or a short input that must be resolved before the user goes on. Put it inside a DialogTrigger
 * after its button, or control it with `isOpen`. Focus moves to the first field (to "Cancel" when the
 * primary action is destructive and "Cancel" is there), stays inside, and returns to the trigger on close; Esc closes it.
 * `size="fullscreen"` covers the viewport, a sheet on phones, for a long task like a signup; it
 * also takes a logo before the title (`headerStart`), a visually hidden title (`isTitleHidden`) and a spread footer
 * (`footerLayout`). Every size: a primary action that submits a form
 * (`primaryAction.form`), no secondary action (`secondaryAction={null}`; with no primary either, no footer), no
 * close button (`isCloseButtonHidden`; a locked view adds `isDismissable={false}`), `data-*` attributes on the
 * dialog and its parts (`partData`, the actions' own), and focus hooks (`initialFocusRef`, `returnFocusRef`). A
 * focusable title (`titleRef`), which `initialFocusRef` can name to open on it.
 */
export function Dialog({
  size = "small", isDismissable = true, isOpen, defaultOpen, onOpenChange, footerLayout, headerStart, isTitleHidden, ...content
}: DialogProps) {
  const state = useOverlayOpen({ isOpen, defaultOpen, onOpenChange });
  const descriptionId = React.useId();
  // Described only when there is a description; otherwise the dialog's DOM is unchanged.
  const describedBy = hasDescription(content.description) ? descriptionId : undefined;
  // The app's data-* props go to the dialog element; none given, nothing is added.
  const rootData = dataAttributes(content);
  useFullScreenOnlyWarning(size, { footerLayout, headerStart, isTitleHidden });
  useHiddenEmptyTitleWarning(isTitleHidden, content.title, size === "fullscreen");
  if (size === "fullscreen") {
    return (
      <FullScreenFrame isDismissable={isDismissable} isOpen={state.isOpen} onClose={state.close} describedBy={describedBy} rootData={rootData}>
        <DialogContent
          {...content}
          footerLayout={footerLayout}
          headerStart={headerStart}
          isTitleHidden={isTitleHidden}
          descriptionId={descriptionId}
          close={state.close}
          fullScreen
        />
      </FullScreenFrame>
    );
  }
  return (
    <DialogFrame size={size} isDismissable={isDismissable} escapeCloses={isDismissable} isOpen={state.isOpen} onClose={state.close} describedBy={describedBy} rootData={rootData}>
      {/* The full-screen options stay with `fullscreen`. */}
      <DialogContent {...content} descriptionId={descriptionId} close={state.close} />
    </DialogFrame>
  );
}

export type AlertDialogProps = OpenProps & {
  /**
   * `danger` (default: a delete, `trash-2`, a danger button), `warning` (`triangle-alert`, a primary button), or
   * `neutral` for a confirm that neither destroys nor risks anything, such as reactivating an account
   * (`info` on a neutral ground, a primary button).
   */
  tone?: "danger" | "warning" | "neutral";
  /** The action as a question with the object's name: "PG AB 482 filodan silinsin mi?" */
  title: React.ReactNode;
  /** The consequence, and what to do first. */
  children: React.ReactNode;
  /** The verb again: "Delete item". */
  confirmLabel: string;
  /**
   * The cancel button's text, and so its accessible name ("No, keep it"), in place of the library's "Cancel"
   *. The app passes it already localized; the DS does not translate it. Left out (or `""`), the
   * locale's "Cancel" renders and the DOM is unchanged. A long label wraps inside the button, which takes at
   * most the footer's width; focus, Esc and the pending lock are the same either way.
   */
  cancelLabel?: string;
  /**
   * May be async: the button shows pending until it settles, and while it runs the dialog cannot be cancelled
   * (the action is under way); it closes when the action succeeds and stays open when it fails.
   */
  onConfirm: () => void | Promise<void>;
  /** For irreversible deletes: the text the user types before the button enables ("PG AB 482"). */
  requireTypedConfirmation?: string;
  /**
   * Holds the confirm back while the app loads what it needs ("Loading linked orders"). The
   * button keeps its name and stays in the dialog, disabled as with `requireTypedConfirmation`: it cannot be pressed
   * (pointer, Enter or Space) and Tab passes it, so "Cancel" stays the one control; screen readers list it as
   * unavailable. Say why in the description or in the element `aria-describedby` names. Esc and "Cancel" still work.
   */
  isConfirmDisabled?: boolean;
  /**
   * More of what the alert says, by id: an element the app renders, inside the alert (a Banner in its
   * body) or outside it (a page notice). Added to the alert's own description in `aria-describedby`, after it, so
   * the alert is announced with both when it opens.
   */
  "aria-describedby"?: string;
  /** The field's label; "Type ORD-482 to confirm" by default. */
  typedConfirmationLabel?: string;
  /** Overrides the tone's icon (danger `trash-2`, warning `triangle-alert`). */
  icon?: IconName;
  /**
   * Where focus goes when the alert closes and React Aria's return would leave it on the page or on the
   * opener, as on Dialog. Needed when the element React Aria returns to is gone by the close: an alert
   * opened from a menu whose trigger unmounts when it closes (pass a stable button), or a confirmed action that removes the row
   * with its Menu (pass a stable element). Opened from a DS Menu item it is not needed: React Aria returns focus to
   * the Menu button itself, and a ref naming another element does not override that. Read when the alert closes; if
   * the app has already moved focus elsewhere on close, it stays there; if the ref is empty, focus returns as before.
   * There is no `initialFocusRef`: the alert's controls are its own, and "Cancel" takes the first focus. Nor is there a
   * `titleRef`: the alert is announced with its title and consequence when it opens (`aria-labelledby`,
   * `aria-describedby`), and focus starts on the safe answer, never on its text.
   */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
};

const ALERT_ICON: Record<NonNullable<AlertDialogProps["tone"]>, { name: IconName; className: string }> = {
  danger: { name: "trash-2", className: "bg-ds-background-danger text-ds-icon-danger" },
  warning: { name: "triangle-alert", className: "bg-ds-background-warning text-ds-icon-warning" },
  neutral: { name: "info", className: "bg-ds-background-neutral text-ds-icon" },
};

/**
 * Only with a custom `cancelLabel`: the cancel button may wrap its text and grow in height, at most
 * as wide as the footer, so a long app label never overflows a 320px screen. The default "Cancel" is short and
 * keeps the footer's classes unchanged, and so does a blank label (`"  "`), which counts as unset. A word breaks only
 * when it is too long for a line (`break-words`).
 */
const CUSTOM_CANCEL_FOOTER =
  "[&>[data-slot=alert-dialog-cancel]]:h-auto [&>[data-slot=alert-dialog-cancel]]:min-h-ds-control [&>[data-slot=alert-dialog-cancel]]:max-w-full " +
  "[&>[data-slot=alert-dialog-cancel]]:py-ds-075 [&>[data-slot=alert-dialog-cancel]]:whitespace-normal [&>[data-slot=alert-dialog-cancel]]:text-center " +
  "[&>[data-slot=alert-dialog-cancel]]:break-words";
const ALERT_FOOTER = "flex flex-wrap items-center justify-end gap-ds-100 px-ds-300 pb-ds-300 pt-ds-200";

function AlertContent({
  tone = "danger", title, children, confirmLabel, cancelLabel, onConfirm, requireTypedConfirmation, typedConfirmationLabel, icon, returnFocusRef, isConfirmDisabled, descriptionId, close, pending, setPending,
}: Omit<AlertDialogProps, keyof OpenProps | "aria-describedby"> & { descriptionId: string; close: () => void; pending: boolean; setPending: (pending: boolean) => void }) {
  const { locale } = useLocale();
  const cancel = React.useRef<HTMLButtonElement>(null);
  const [typed, setTyped] = React.useState("");
  // "Cancel" first: the destructive button never has default focus.
  React.useEffect(() => cancel.current?.focus(), []);
  // Without the ref nothing runs, so React Aria returns focus to the opener as before.
  useReturnFocus(returnFocusRef);
  const ready = requireTypedConfirmation === undefined || typed.trim() === requireTypedConfirmation;
  const confirm = async () => {
    setPending(true);
    let done = false;
    try {
      await onConfirm();
      done = true;
    } catch {
      // The action failed: the dialog stays open so the user can retry or cancel. Saying what went wrong
      // (a Toast, an inline Banner) is the caller's, which knows the error.
    } finally {
      setPending(false);
    }
    if (done) close();
  };
  const glyph = ALERT_ICON[tone];
  return (
    <>
      <div data-slot="alert-dialog-header" className="flex items-start gap-ds-200 px-ds-300 pt-ds-300">
        <span data-slot="alert-dialog-icon" className={cn("grid size-10 shrink-0 place-items-center rounded-ds-full", glyph.className)}>
          <IconGlyph name={icon ?? glyph.name} />
        </span>
        <div data-slot="alert-dialog-text" className="flex min-w-0 flex-col gap-ds-050">
          <Heading slot="title" data-slot="alert-dialog-title" className="m-0 text-heading-medium">{title}</Heading>
          <div id={descriptionId} data-slot="alert-dialog-description" className="text-body text-ds-text-subtle">{children}</div>
        </div>
      </div>
      {requireTypedConfirmation !== undefined && (
        <div data-slot="alert-dialog-body" className="px-ds-300 pt-ds-200">
          <TextField
            label={typedConfirmationLabel ?? typeToConfirmLabel(locale, requireTypedConfirmation)}
            value={typed}
            onChange={setTyped}
            placeholder={requireTypedConfirmation}
            variant="code"
            autoComplete="off"
            isDisabled={pending}
          />
        </div>
      )}
      <div data-slot="alert-dialog-footer" className={cancelLabel?.trim() ? `${ALERT_FOOTER} ${CUSTOM_CANCEL_FOOTER}` : ALERT_FOOTER}>
        <Button ref={cancel} variant="subtle" onPress={close} isDisabled={pending} data-slot="alert-dialog-cancel">{cancelLabel?.trim() || defaultCancelLabel(locale)}</Button>
        <Button
          variant="primary"
          tone={tone === "danger" ? "danger" : "neutral"}
          isDisabled={!ready || Boolean(isConfirmDisabled)}
          isPending={pending}
          onPress={confirm}
          data-slot="alert-dialog-confirm"
        >
          {confirmLabel}
        </Button>
      </div>
    </>
  );
}

/**
 * Confirms an action that destroys data, costs money or cannot be undone (role="alertdialog"). Not closed
 * by a scrim click; Esc cancels (not while the action runs); "Cancel" (or the app's `cancelLabel`) has the first focus. With
 * `requireTypedConfirmation` the action enables only once the text is typed. If the action can be undone,
 * skip it and offer "Undo" in a Toast. Opened from a menu whose trigger unmounts, or when the confirmed action
 * removes the opener, pass `returnFocusRef` so focus has somewhere to go back to.
 */
export function AlertDialog({ isOpen, defaultOpen, onOpenChange, "aria-describedby": ariaDescribedBy, ...content }: AlertDialogProps) {
  const state = useOverlayOpen({ isOpen, defaultOpen, onOpenChange });
  const descriptionId = React.useId();
  const [pending, setPending] = React.useState(false);
  const describedBy = ariaDescribedBy?.trim() ? `${descriptionId} ${ariaDescribedBy.trim()}` : descriptionId;
  return (
    // No scrim click (a stray tap must not answer it); Esc cancels, except while the action is running.
    <DialogFrame size="small" role="alertdialog" isDismissable={false} escapeCloses={!pending} describedBy={describedBy} isOpen={state.isOpen} onClose={state.close}>
      <AlertContent {...content} descriptionId={descriptionId} close={state.close} pending={pending} setPending={setPending} />
    </DialogFrame>
  );
}

export type DrawerProps = OpenProps & {
  title: React.ReactNode;
  /**
   * Under the title: "Ana Petrović · 14–18 Eki". When given, the drawer is described by it
   * (`aria-describedby`); without it (or with `""`, `false`, `null`) nothing is rendered.
   */
  subtitle?: React.ReactNode;
  /** Beside the close button: a status lozenge, a menu. */
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

/** Below 640px: the full-screen dialog's sheet presentation; decided after mount. */
function useNarrow() {
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
 * title, subtitle and status; a scrolling body; a sticky footer; both keep clear of notches and the home
 * indicator. With unsaved edits every way of closing asks first. The title names the drawer and the
 * subtitle, when there is one, describes it.
 */
export function Drawer({
  size = "small", position = "end", isOpen, defaultOpen, onOpenChange, hasUnsavedChanges,
  title, subtitle, headerActions, children, footer,
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
