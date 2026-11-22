"use client";

import * as React from "react";
import { Heading, useLocale } from "react-aria-components";
import { cn } from "../utils";
import { MotionScope, type WithMotion } from "../defaults";
import { Button } from "../action/button";
import { IconGlyph, type IconName } from "../display/icon";
import { TextField } from "../form/text-field";
import { cancelLabel as defaultCancelLabel, typeToConfirmLabel } from "../i18n";
import { DialogFrame, type OpenProps, useOverlayOpen, useReturnFocus } from "./overlay-base";

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
function AlertDialogBody({ isOpen, defaultOpen, onOpenChange, "aria-describedby": ariaDescribedBy, ...content }: AlertDialogProps) {
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

/** AlertDialog with its own `motion` (auto, reduce or none); see AlertDialogBody for the component itself. */
export function AlertDialog({ motion, ...props }: AlertDialogProps & WithMotion) {
  return (
    <MotionScope motion={motion}>
      <AlertDialogBody {...(props as AlertDialogProps)} />
    </MotionScope>
  );
}
