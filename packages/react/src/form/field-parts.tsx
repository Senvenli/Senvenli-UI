"use client";

import * as React from "react";
import { FieldError as AriaFieldError, FieldErrorContext, Label, Text, useLocale } from "react-aria-components";
import { IconGlyph } from "../display/icon";

import { optionalLabel } from "../i18n";
import { DESCRIPTION, ERROR, LABEL, OPTIONAL_MARK, REQUIRED_MARK } from "./styles";

export type FieldLabelProps = {
  children: React.ReactNode;
  /** Shows `*` in `ds-text-danger` (hidden from screen readers: the control is `aria-required`). */
  isRequired?: boolean;
  /** Shows "(optional)" in the provider locale; use it when most fields of the form are required. */
  isOptional?: boolean;
};

/**
 * The visible label above a field. Inside a React Aria field it is wired to
 * the control automatically (`aria-labelledby` / `for`).
 */
export function FieldLabel({ children, isRequired, isOptional }: FieldLabelProps) {
  const { locale } = useLocale();
  return (
    <Label data-slot="field-label" className={LABEL}>
      {children}
      {isRequired && (
        <span aria-hidden="true" data-slot="field-required" className={REQUIRED_MARK}>
          *
        </span>
      )}
      {isOptional && !isRequired && (
        <span data-slot="field-optional" className={OPTIONAL_MARK}>
          {optionalLabel(locale)}
        </span>
      )}
    </Label>
  );
}

/** `aria-invalid` as a form row hands it down (`true` or `"true"`); anything else leaves the field as it is. */
export function isAriaInvalid(value: unknown): boolean {
  return value === true || value === "true";
}

type RootRender<V> = (props: React.JSX.IntrinsicElements["div"], values: V) => React.ReactElement;

/**
 * A form row's `aria-invalid` (the shared `Field` hands it down) is the row's verdict, not the field's own: it
 * marks the field for assistive tech and draws it invalid, and stays out of React Aria's validation state
 *. As React Aria's `isInvalid` it became the field's custom validity ("Invalid value.") under
 * `validationBehavior="native"`, React Aria's default outside a DS Form, so a form without `noValidate` silently
 * refused every submit until the row's error went away. The field's own validation (`isRequired`, `validate`,
 * `requiredValidation`) and an explicit `isInvalid` are untouched and keep their own native behaviour.
 *
 * The control spreads `fieldProps` on its React Aria field (after its own props; a consumer's `render` is kept),
 * draws its frame and input invalid when `invalid` is set, and renders its error row through
 * {@link ControlFieldError}; together they give the DOM `isInvalid` gave.
 */
export function forwardedInvalid<V>(ariaInvalid: unknown, render?: RootRender<V>) {
  const invalid = isAriaInvalid(ariaInvalid);
  if (!invalid) return { invalid, fieldProps: null };
  // The root's `data-invalid` (the `group-data-[invalid]` styles), set where React Aria sets it from its own state.
  const markInvalid: RootRender<V> = (props, values) => {
    const marked = { ...props, "data-invalid": true };
    return render ? render(marked, values) : <div {...marked} />;
  };
  // The error row it shows or hides is linked by {@link useErrorRowLink}, which the control spreads after these.
  return { invalid, fieldProps: { render: markInvalid } };
}

/**
 * Keeps the control's own error row in `aria-describedby` whenever it shows (,
 *). React Aria re-reads which description and error ids are in the DOM (useField → useSlotId) only when
 * its `description`, `errorMessage` or own invalid state changes. The DS draws the error row itself, from its
 * `errorMessage` prop and a forwarded `aria-invalid`, neither of which React Aria sees (its `errorMessage` flag is
 * always set, by its own empty error list), so a message that came or went while the field stayed invalid (a
 * forwarded `aria-invalid`, or `isInvalid`) was shown unlinked, never read. The control spreads the result on its
 * React Aria field: `description` flips each time the forwarded state or the presence of a message changes, which
 * makes React Aria re-read the ids. React Aria renders nothing from `description` (the DS draws its own) and only
 * its truth is read, so the DOM is the one React Aria gives for the row as it stands.
 */
export function useErrorRowLink(forwarded: boolean, errorMessage: React.ReactNode) {
  const signature = `${forwarded}:${hasContent(errorMessage)}`;
  const seen = React.useRef({ signature, flip: false });
  if (seen.current.signature !== signature) seen.current = { signature, flip: !seen.current.flip };
  return { description: seen.current.flip };
}

/**
 * Content worth rendering (a message, a description, an icon): `0` counts; `null`, `undefined`, a boolean,
 * `""`, and an array or fragment holding only those (`<></>`) do not. The one check FieldError and the
 * choice rows, list items and tags share.
 */
export function hasContent(node: React.ReactNode): boolean {
  if (node === undefined || node === null || typeof node === "boolean" || node === "") return false;
  if (Array.isArray(node)) return node.some(hasContent);
  if (React.isValidElement<{ children?: React.ReactNode }>(node) && node.type === React.Fragment) return hasContent(node.props.children);
  return true;
}

/**
 * The text a label shows a screen reader: its text without what is hidden from one (an `aria-hidden` required
 * mark, a `hidden` or `display: none` / `visibility: hidden` part), so "Country <span aria-hidden>*</span>" names
 * the field "Country".
 */
function visibleText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const element = node as HTMLElement;
  if (element.getAttribute("aria-hidden") === "true" || element.hidden) return "";
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  if (style && (style.display === "none" || style.visibility === "hidden")) return "";
  let text = "";
  for (const child of element.childNodes) text += visibleText(child);
  return text;
}

/**
 * The field's name, as Select does it: a non-empty `aria-label` names the input and no
 * visible label renders; an empty one counts as absent (no empty attribute), so a given `label` shows.
 * With no name at all a development warning says so. With a visible label the DOM is as before.
 * Neither of them but an `id`: an external `<label htmlFor={id}>` names the input, so no label
 * of the field's own renders (an empty one would take over the name through aria-labelledby). React Aria only
 * knows a name from its own label, aria-label or aria-labelledby (and warns otherwise), so the input also gets
 * that name in React Aria's terms: aria-labelledby the external label when it has an id, else an aria-label of
 * the label's text. The app's label is never changed. Before the label is read (the server render) the input
 * points at `{id}-label`, which names nothing, so the native `for` binding names it until then. The warning
 * comes only when nothing on the page labels the input.
 *
 * Shared by the DS controls that a form row may name from outside: ComboBox and PhoneField. `component` names the control in the warning. Not a public export.
 */
export function useFieldName(
  component: string,
  label: React.ReactNode,
  ariaLabel: string | undefined,
  labelledBy: string | undefined,
  id: string | undefined,
  input: React.RefObject<HTMLInputElement | null>,
) {
  const named = ariaLabel ? ariaLabel : undefined;
  const external = named === undefined && label == null && !labelledBy && id !== undefined;
  const showLabel = named === undefined && (ariaLabel === undefined || label != null) && !external;
  const unnamed = named === undefined && label == null && !labelledBy;
  // The external label's name for React Aria, read after render; `{id}-label` until it is known.
  const [externalName, setExternalName] = React.useState<{ "aria-labelledby"?: string; "aria-label"?: string } | undefined>();
  React.useLayoutEffect(() => {
    if (!external) return;
    const labels = [...(input.current?.labels ?? [])];
    const next = labels.length === 0
      ? undefined
      : labels.every((element) => element.id)
        ? { "aria-labelledby": labels.map((element) => element.id).join(" ") }
        : { "aria-label": labels.map((element) => visibleText(element).replace(/\s+/g, " ").trim()).filter(Boolean).join(" ") || undefined };
    setExternalName((current) =>
      current?.["aria-labelledby"] === next?.["aria-labelledby"] && current?.["aria-label"] === next?.["aria-label"] ? current : next,
    );
  });
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || !unnamed) return;
    if (external && (input.current?.labels?.length ?? 0) > 0) return;
    console.warn(`${component}: no accessible name. Give a label, or a non-empty aria-label where the context names the field.`);
  }, [component, unnamed, external]);
  const externalNameProps = external ? (externalName ?? { "aria-labelledby": `${id}-label` }) : {};
  return { named, showLabel, externalNameProps };
}

/** Help text under a field; React Aria adds it to the control's `aria-describedby`. */
export function FieldDescription({ children }: { children: React.ReactNode }) {
  return (
    <Text slot="description" data-slot="field-description" className={DESCRIPTION}>
      {children}
    </Text>
  );
}

/**
 * The inline error: what happened and what to do. Renders only while the
 * field is invalid; React Aria adds it to `aria-describedby`. A specific
 * message from `validate`, `isRequired` or the server wins over the field's
 * static `errorMessage`, which is the fallback for `isInvalid`.
 *
 * Invalid with no message at all (`isInvalid`, or a form row's `aria-invalid`, whose own error text sits
 * outside the field) renders no row: no lone icon, and nothing for `aria-describedby` to point at
 *. With a message it renders and is announced as before.
 */
export function FieldError({ children }: { children?: React.ReactNode }) {
  const validation = React.useContext(FieldErrorContext);
  const hasMessage = Boolean(validation?.validationErrors.length) || hasContent(children);
  if (validation?.isInvalid && !hasMessage) return null;
  return (
    <AriaFieldError data-slot="field-error" className={ERROR}>
      {(validation) => <FieldErrorContent>{validation.validationErrors.length ? validation.validationErrors.join(" ") : children}</FieldErrorContent>}
    </AriaFieldError>
  );
}

/**
 * The error row's content: the circle-alert icon (hidden from screen readers) and the message. FieldError and a lone
 * Checkbox's error row (choice-text.tsx) draw it the same way. Not a public export.
 */
export function FieldErrorContent({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <IconGlyph name="circle-alert" data-slot="field-error-icon" />
      <span>{children}</span>
    </>
  );
}

/**
 * A control's own error row ({@link FieldError}) that a form row's forwarded `aria-invalid` also shows, as
 * `isInvalid` would, without entering React Aria's validation state.
 * Not a public export: the DS controls that honour the forwarded state use it.
 */
export function ControlFieldError({ forwardedInvalid, children }: { forwardedInvalid: boolean; children?: React.ReactNode }) {
  const validation = React.useContext(FieldErrorContext);
  if (!forwardedInvalid || !validation || validation.isInvalid) return <FieldError>{children}</FieldError>;
  return (
    <FieldErrorContext.Provider value={{ ...validation, isInvalid: true }}>
      <FieldError>{children}</FieldError>
    </FieldErrorContext.Provider>
  );
}
