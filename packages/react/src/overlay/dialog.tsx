"use client";

import * as React from "react";
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay, useLocale } from "react-aria-components";
import { cn } from "../utils";
import { MotionScope, type WithMotion, useMotionAttribute } from "../defaults";
import { Button, type ButtonActionProps } from "../action/button";
import { CloseButton } from "../action/close-button";
import { cancelLabel as defaultCancelLabel } from "../i18n";
import { BLANKET, DIALOG_ELEMENT, type DataAttributes, DialogFrame, type DialogWidth, type OpenProps, OverlayContents, type OverlaySize, dataAttributes, hasDescription, useBlockedSubmit, useInitialFocus, useNarrow, useOverlayOpen, useReturnFocus, useStrandedWarning } from "./overlay-base";

/**
 * `isDisabled`: the action cannot be pressed yet, e.g. until the form is valid.
 * `iconBefore` / `iconAfter`: a Lucide icon beside the label ("Continue" with `arrow-right`), as on
 * Button. The label is always shown and is the button's name, so the icon is decorative (`aria-hidden`); the
 * button keeps its size and focus ring. Left out, the button's DOM is unchanged.
 */
export type DialogAction = Pick<ButtonActionProps, "isPending" | "isDisabled" | "iconBefore" | "iconAfter"> & DataAttributes & {
  /** The verb of the title: "Cancel order", never "OK". */
  label: string;
  /** `danger` for a destructive action (delete, discard): the button turns red. */
  tone?: "neutral" | "danger";
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
  headerLeading?: React.ReactNode;
  /**
   * `fullscreen` only. Hides the title visually, for a frame whose header shows a logo instead;
   * the title stays in the DOM and still names the dialog (`aria-labelledby`), so `title` is still required.
   * A description, when given, stays visible. An empty title (`""`, blank, `null`, `false`) would leave the dialog
   * unnamed, and warns in development.
   */
  isTitleHidden?: boolean;
};

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
      {...useMotionAttribute()}
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

/** A node that renders something: the `headerLeading` test (`null`, `false`, `true`, `""` count as none). */
const isRenderable = hasDescription;

// The full-screen options, each added to the classes above only when used, so a full-screen
// dialog without them renders exactly as before.

/** No footer: the body is the last part, so it clears the home indicator itself (as Drawer's body does). */
const FULL_BODY_NO_FOOTER = "min-h-0 flex-1 overflow-y-auto overscroll-contain px-ds-300 pt-ds-300 pb-[max(var(--ds-space-300),env(safe-area-inset-bottom,0px))] text-body text-ds-text-subtle";

/** `footerLayout="spread"`: the secondary takes the free space after it, so it sits at the start and the primary at the end. */
const FOOTER_SPREAD = "[&>[data-slot=dialog-secondary]]:me-auto";

/** A hidden title is out of flow, so the close button is held at the inline end on its own. */
const HEADER_CLOSE_END = "[&>[data-slot=dialog-close-wrap]]:ms-auto";

/** With `headerLeading` the title side takes the room left between the slot and the close button. */
const TITLE_SIDE = "min-w-0 flex-1";

type FullScreenOptions = Pick<DialogProps, "footerLayout" | "headerLeading" | "isTitleHidden">;

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
  title, description, descriptionId, children, primaryAction, secondaryAction, close, fullScreen, footerLayout, headerLeading, isTitleHidden,
  isCloseButtonHidden, initialFocusRef, returnFocusRef, partData, titleRef,
}: Pick<DialogProps, "title" | "description" | "children" | "primaryAction" | "secondaryAction"> & FullScreenOptions & ContentOptions & { descriptionId: string; close: () => void; fullScreen?: boolean }) {
  const { locale } = useLocale();
  const body = React.useRef<HTMLDivElement>(null);
  const secondary = React.useRef<HTMLButtonElement>(null);
  const destructive = primaryAction?.tone === "danger";
  const closeHidden = isCloseButtonHidden === true;
  useInitialFocus(body, secondary, destructive, initialFocusRef);
  useReturnFocus(returnFocusRef);
  useBlockedSubmit(primaryAction?.form, primaryAction?.isPending === true);
  useStrandedWarning(closeHidden, body);
  // The full-screen options below reach this component only for `fullscreen` (Dialog drops them for the other sizes).
  const hasStart = isRenderable(headerLeading);
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
          <div data-slot="dialog-header-start" className="flex shrink-0 items-center">{headerLeading}</div>
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
              tone={primaryAction.tone === "danger" ? "danger" : "neutral"}
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
 * `headerLeading` are the defaults there too, so nothing is lost and nothing is said.
 */
function useFullScreenOnlyWarning(size: DialogWidth | "fullscreen", props: FullScreenOptions) {
  const ignored =
    size === "fullscreen"
      ? []
      : [
          props.footerLayout === "spread" && "footerLayout",
          isRenderable(props.headerLeading) && "headerLeading",
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
 * also takes a logo before the title (`headerLeading`), a visually hidden title (`isTitleHidden`) and a spread footer
 * (`footerLayout`). Every size: a primary action that submits a form
 * (`primaryAction.form`), no secondary action (`secondaryAction={null}`; with no primary either, no footer), no
 * close button (`isCloseButtonHidden`; a locked view adds `isDismissable={false}`), `data-*` attributes on the
 * dialog and its parts (`partData`, the actions' own), and focus hooks (`initialFocusRef`, `returnFocusRef`). A
 * focusable title (`titleRef`), which `initialFocusRef` can name to open on it.
 */
function DialogBody({
  size = "small", isDismissable = true, isOpen, defaultOpen, onOpenChange, footerLayout, headerLeading, isTitleHidden, ...content
}: DialogProps) {
  const state = useOverlayOpen({ isOpen, defaultOpen, onOpenChange });
  const descriptionId = React.useId();
  // Described only when there is a description; otherwise the dialog's DOM is unchanged.
  const describedBy = hasDescription(content.description) ? descriptionId : undefined;
  // The app's data-* props go to the dialog element; none given, nothing is added.
  const rootData = dataAttributes(content);
  useFullScreenOnlyWarning(size, { footerLayout, headerLeading, isTitleHidden });
  useHiddenEmptyTitleWarning(isTitleHidden, content.title, size === "fullscreen");
  if (size === "fullscreen") {
    return (
      <FullScreenFrame isDismissable={isDismissable} isOpen={state.isOpen} onClose={state.close} describedBy={describedBy} rootData={rootData}>
        <DialogContent
          {...content}
          footerLayout={footerLayout}
          headerLeading={headerLeading}
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

/** Dialog with its own `motion` (auto, reduce or none); see DialogBody for the component itself. */
export function Dialog({ motion, ...props }: DialogProps & WithMotion) {
  return (
    <MotionScope motion={motion}>
      <DialogBody {...(props as DialogProps)} />
    </MotionScope>
  );
}
