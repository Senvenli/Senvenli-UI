"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { Form as AriaForm, type FormProps as AriaFormProps } from "react-aria-components";

import { FormSubmittedContext } from "./validation";

export type FormProps = Omit<AriaFormProps, "className" | "style"> & {
  children: React.ReactNode;
  /** `narrow` (default) caps single-column forms at 560px. */
  width?: "narrow" | "full";
};

/**
 * Arranges sections and one action footer. `validationBehavior` defaults to
 * `aria`: errors show on blur and on submit without blocking native submit.
 * On submit, if any field is invalid the first one gets focus and
 * `onSubmit` is not called (a Select or MultiSelect too, at its trigger); entered values are always kept. A required
 * field left empty is invalid from the first submit on, the selection fields included, unless it
 * leaves that to the app (`requiredValidation="app"`). Server errors
 * passed as `validationErrors` mark their fields invalid until the user
 * edits them (React Aria), so the same data cannot be resubmitted unchanged.
 * Native behaviour (`validationBehavior="native"`) leaves blocking to the browser.
 *
 * A reset (a reset button, or `form.reset()`) puts the values back and clears what the fields show. Under native
 * behaviour React Aria clears a field's message only on a reset from a user event, and keeps it after a programmatic
 * `form.reset()` outside one (to keep a form action's server errors); the date and time fields clear theirs on
 * every reset, except a server error the form holds.
 */
export function Form({ children, width = "narrow", validationBehavior = "aria", onSubmit, onReset, ...rest }: FormProps) {
  const [state, setState] = React.useState({ submitted: false, resetCount: 0, inForm: true });
  return (
    <FormSubmittedContext.Provider value={state}>
    <AriaForm
      {...rest}
      validationBehavior={validationBehavior}
      data-slot="form"
      onReset={(event) => {
        setState((current) => ({ ...current, submitted: false, resetCount: current.resetCount + 1 }));
        onReset?.(event);
      }}
      className={width === "narrow" ? "flex w-full max-w-[560px] flex-col gap-ds-300" : "flex w-full flex-col gap-ds-300"}
      onSubmit={(event) => {
        // Every field shows its errors from the first submit on; render that before looking for them.
        flushSync(() => setState((current) => ({ ...current, submitted: true })));
        const invalid = event.currentTarget.querySelectorAll<HTMLElement>(INVALID);
        if (invalid.length > 0) {
          event.preventDefault();
          focusTarget(invalid)?.focus();
          return;
        }
        onSubmit?.(event);
      }}
    >
      {children}
    </AriaForm>
    </FormSubmittedContext.Provider>
  );
}

/** An invalid field: its own mark (`aria-invalid` on the input) or its root's (`data-invalid`, React Aria's and the DS's). */
const INVALID = '[aria-invalid="true"], [data-invalid]';
const FOCUSABLE = "input:not([type='hidden']), textarea, select, button, [tabindex]";

/** Something the user can reach: enabled, in the tab order, not in a part hidden from assistive tech (React Aria's hidden select). */
function reachable(element: HTMLElement) {
  return element.matches(FOCUSABLE) && !element.matches(":disabled") && element.tabIndex >= 0 && !element.closest("[aria-hidden='true']");
}

/**
 * Where focus goes for the first invalid field, in the form's order: the element marked `aria-invalid` (a text input,
 * a ComboBox input, a date segment), else its typed input, else the button that opens its list (a Select's or
 * MultiSelect's trigger, whose own button carries no `aria-invalid` and whose hidden native select is not focusable;
 * a MultiSelect's tag buttons come before it), else the first control the user can reach in it.
 */
function focusTarget(invalid: NodeListOf<HTMLElement>): HTMLElement | null {
  for (const root of invalid) {
    const within = (selector: string) =>
      [...(root.matches(selector) ? [root] : []), ...root.querySelectorAll<HTMLElement>(selector)].find(reachable);
    const target = within('[aria-invalid="true"]') ?? within("input, textarea") ?? within("[aria-haspopup]") ?? within(FOCUSABLE);
    if (target) return target;
  }
  return null;
}

export type FormSectionProps = {
  /** The section title (`heading-small`). */
  legend: React.ReactNode;
  children: React.ReactNode;
  isDisabled?: boolean;
};

/** A titled group of related fields; a real `fieldset` with a `legend`. */
export function FormSection({ legend, children, isDisabled }: FormSectionProps) {
  return (
    <fieldset disabled={isDisabled} data-slot="form-section" className="m-0 flex min-w-0 flex-col gap-ds-200 border-0 p-0">
      <legend data-slot="form-section-legend" className="heading-small mb-ds-200 p-0 text-ds-text">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

/** Two fields read together (first and last name); stacks when the row is narrower than 360px. */
export function FormRow({ children }: { children: React.ReactNode }) {
  return (
    <div data-slot="form-row" className="@container">
      <div className="grid grid-cols-1 gap-ds-200 @min-[360px]:grid-cols-2">{children}</div>
    </div>
  );
}

/** The action footer on a `ds-border` rule: subtle cancel, then primary, aligned to the end. */
export function FormFooter({ children }: { children: React.ReactNode }) {
  return (
    <div data-slot="form-footer" className="flex flex-wrap items-center justify-end gap-ds-100 border-t border-ds-border pt-ds-200">
      {children}
    </div>
  );
}
