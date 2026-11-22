"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "../utils";

/**
 * Form field wrapper: consistent label + control spacing, optional hint and
 * error message, around a control the app brings (a native input or a
 * library control).
 *
 * Wires label↔control (`htmlFor` / `id`) and hint/error copy onto the control
 * via `aria-describedby` / `aria-invalid` so screen readers hear validation.
 * Prefer passing `htmlFor` (and matching control `id`) for native inputs; when
 * omitted, Field generates an id and injects it onto a single-element child.
 * The label's own id is `{controlId}-label`, so a composite control can point
 * `aria-labelledby` at it (the DS ComboBox does with an external label); a DS
 * control handed `aria-invalid` shows its invalid state, and with no
 * `errorMessage` of its own no second error row. That state is
 * for assistive tech and styling only: it never becomes the control's native
 * validity, so a form without `noValidate` still submits.
 */
export function Field({
  label,
  htmlFor,
  errorMessage: error,
  description: hint,
  isRequired: required,
  requiredClassName,
  children,
  className,
}: {
  label?: ReactNode;
  /** Control id for the label. Optional: when omitted, Field generates one and
   * injects it onto a single-element child. Field is for a control the library does not
   * provide (a native input, a third-party widget) and for `InputGroup` with `InputGroupInput`,
   * which forwards it to its input. The library's own fields (TextField, Select…) carry their
   * own label, hint and error, so they do not go inside a Field. */
  htmlFor?: string;
  /** What went wrong and what to do; shown under the control and announced. */
  errorMessage?: ReactNode;
  /** A line of help under the control (hidden while there is an error). */
  description?: ReactNode;
  isRequired?: boolean;
  /** Class for the required "*" asterisk. Defaults to the danger text token; a brand
   * marketing form can override it without forking this component. */
  requiredClassName?: string;
  children: ReactNode;
  className?: string;
}) {
  const autoId = useId();
  const controlId = htmlFor ?? (label ? autoId : undefined);
  const hintId = hint && !error ? `${autoId}-hint` : undefined;
  const errorId = error ? `${autoId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-ds-075", className)}>
      {label && (
        // `{controlId}-label`, so a control can name itself by the label with aria-labelledby.
        <FieldRowLabel htmlFor={controlId} id={controlId ? `${controlId}-label` : undefined}>
          {label}
          {required && (
            <span className={cn("ms-0.5", requiredClassName ?? "text-ds-text-danger")}>*</span>
          )}
        </FieldRowLabel>
      )}
      {enhanceControl(children, {
        controlId,
        describedBy,
        invalid: Boolean(error),
      })}
      {hint && !error && hintId ? (
        <p id={hintId} className="text-body-small text-ds-text-subtle">
          {hint}
        </p>
      ) : null}
      {error && errorId ? (
        <p id={errorId} className="text-body-small text-ds-text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Field's label. A double click on the label text does not select it (a click
 * on a control inside the label is left alone).
 */
const FIELD_LABEL_CLASS =
  "flex items-center gap-ds-100 text-body-strong text-ds-text select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50";

function FieldRowLabel({ htmlFor, id, children }: { htmlFor?: string; id?: string; children: ReactNode }) {
  return (
    <label
      data-slot="label"
      className={cn(FIELD_LABEL_CLASS)}
      htmlFor={htmlFor}
      id={id}
      onMouseDown={(event: MouseEvent<HTMLLabelElement>) => {
        if ((event.target as HTMLElement).closest("button, input, select, textarea")) return;
        if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
      }}
    >
      {children}
    </label>
  );
}

function enhanceControl(
  children: ReactNode,
  {
    controlId,
    describedBy,
    invalid,
  }: {
    controlId?: string;
    describedBy?: string;
    invalid: boolean;
  },
): ReactNode {
  const child = Children.count(children) === 1 ? Children.only(children) : null;
  if (!isValidElement(child)) return children;

  const element = child as ReactElement<Record<string, unknown>>;
  const existingDescribedBy =
    typeof element.props["aria-describedby"] === "string"
      ? element.props["aria-describedby"]
      : undefined;
  const mergedDescribedBy = [existingDescribedBy, describedBy]
    .filter(Boolean)
    .join(" ") || undefined;

  return cloneElement(element, {
    ...(controlId && element.props.id == null ? { id: controlId } : null),
    ...(mergedDescribedBy ? { "aria-describedby": mergedDescribedBy } : null),
    ...(invalid ? { "aria-invalid": true } : null),
  });
}
