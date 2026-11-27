"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { Form as AriaForm, type FormProps as AriaFormProps } from "react-aria-components";

import { FormSubmittedContext } from "./validation";
import { FieldOrientationContext, type FieldOrientation } from "./field-orientation";
import { cn } from "../utils";

export type FormProps = Omit<AriaFormProps, "className" | "style"> & {
  children: React.ReactNode;
  /**
   * `narrow` (default) caps a single-column form at 560px; `wide` at 800px, for settings with split sections or
   * horizontal rows; `full` takes the container. All start-aligned.
   */
  width?: "narrow" | "wide" | "full";
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
      data-width={width}
      // Sections sit further apart (48px) than a section's own parts, so each heading reads as the start of a group.
      className={cn("flex w-full flex-col gap-ds-300 [&>[data-slot=form-section]+[data-slot=form-section]]:mt-ds-300", width === "narrow" && "max-w-[560px]", width === "wide" && "max-w-[800px]")}
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
  /** One line under the title on what the section covers ("How dates and numbers look"). */
  description?: React.ReactNode;
  children: React.ReactNode;
  isDisabled?: boolean;
  /**
   * `stacked` (default): the title over the fields. `split`: the title and description in a start column and the
   * fields beside them (a settings page); it stacks when the section is narrower than 36rem.
   */
  layout?: "stacked" | "split";
  /** A full-width rule under the title (and description), before the fields, as a settings page heads each group. */
  separator?: boolean;
  /** `horizontal` lays every field in the section out as a row: label and description first, the control at the end. */
  orientation?: FieldOrientation;
};

/**
 * Laid out as a settings row: from 28rem of the group's own width, each field is a grid with its label and
 * description in the start column and its control at the end at its own width (10rem to 20rem), its error under it.
 * The DOM order stays label, control, description, error, so the labelling React Aria wires is untouched. Below
 * 28rem the field stacks as usual. Written out in full so Tailwind finds the classes.
 */
const HORIZONTAL =
  "@container " +
  "@min-[28rem]:[&_.ds-field-stack]:grid @min-[28rem]:[&_.ds-field-stack]:grid-cols-[minmax(0,1fr)_auto] " +
  "@min-[28rem]:[&_.ds-field-stack]:items-center @min-[28rem]:[&_.ds-field-stack]:gap-x-ds-300 @min-[28rem]:[&_.ds-field-stack]:gap-y-ds-050 " +
  "@min-[28rem]:[&_.ds-field-stack>*]:col-start-2 @min-[28rem]:[&_.ds-field-stack>*]:row-start-1 @min-[28rem]:[&_.ds-field-stack>*]:row-span-2 @min-[28rem]:[&_.ds-field-stack>*]:m-0 " +
  // The control keeps its own width at the row's end (a compact select), between 10rem and 20rem.
  "@min-[28rem]:[&_.ds-field-stack>*]:justify-self-end @min-[28rem]:[&_.ds-field-stack>*]:min-w-40 @min-[28rem]:[&_.ds-field-stack>*]:max-w-80 " +
  "@min-[28rem]:[&_.ds-field-stack>:is([data-slot=field-label],[data-slot=field-description])]:justify-self-start @min-[28rem]:[&_.ds-field-stack>:is([data-slot=field-label],[data-slot=field-description])]:min-w-0 @min-[28rem]:[&_.ds-field-stack>:is([data-slot=field-label],[data-slot=field-description])]:max-w-none " +
  "@min-[28rem]:[&_.ds-field-stack>[data-slot=field-label]]:col-start-1 @min-[28rem]:[&_.ds-field-stack>[data-slot=field-label]]:row-span-1 @min-[28rem]:[&_.ds-field-stack>[data-slot=field-label]]:self-end " +
  "@min-[28rem]:[&_.ds-field-stack>[data-slot=field-description]]:col-start-1 @min-[28rem]:[&_.ds-field-stack>[data-slot=field-description]]:row-start-2 @min-[28rem]:[&_.ds-field-stack>[data-slot=field-description]]:row-span-1 @min-[28rem]:[&_.ds-field-stack>[data-slot=field-description]]:self-start " +
  "@min-[28rem]:[&_.ds-field-stack>[data-slot=field-error]]:col-start-2 @min-[28rem]:[&_.ds-field-stack>[data-slot=field-error]]:row-start-3 @min-[28rem]:[&_.ds-field-stack>[data-slot=field-error]]:row-span-1 " +
  // No description: the label centres on the control instead of sitting over an empty line.
  "@min-[28rem]:[&_.ds-field-stack:not(:has(>[data-slot=field-description]))>[data-slot=field-label]]:row-span-2 " +
  "@min-[28rem]:[&_.ds-field-stack:not(:has(>[data-slot=field-description]))>[data-slot=field-label]]:self-center " +
  // One label style for every row, as a settings list reads.
  "@min-[28rem]:[&_.ds-field-stack>[data-slot=field-label]]:text-body @min-[28rem]:[&_.ds-field-stack>[data-slot=field-label]]:font-medium @min-[28rem]:[&_.ds-field-stack>[data-slot=field-label]]:text-ds-text " +
  // A custom control in a Field (a language switcher) keeps its own width at the row's end.
  "@min-[28rem]:[&_[data-slot=field]>:not([data-slot=field-label],[data-slot=field-description],[data-slot=field-error])]:justify-self-end";

/** Rows set off by a rule between them (a settings list); without it, space alone separates them. */
const SEPARATED = "divide-y divide-ds-border [&>*]:py-ds-200 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0";

/**
 * A titled group of related fields; a real `fieldset` with a `legend`. With a `description`, the fieldset is
 * described by it. `layout="split"` and `orientation="horizontal"` make a settings section.
 */
export function FormSection({ legend, description, children, isDisabled, layout = "stacked", separator = false, orientation = "vertical" }: FormSectionProps) {
  const descriptionId = React.useId();
  const fields = (
    <FieldOrientationContext.Provider value={orientation}>
      <div data-slot="form-section-fields" className={cn("flex min-w-0 flex-col gap-ds-200", orientation === "horizontal" && HORIZONTAL)}>
        {children}
      </div>
    </FieldOrientationContext.Provider>
  );
  const describe = description != null && (
    <p id={descriptionId} data-slot="form-section-description" className="m-0 text-body text-ds-text-subtle">
      {description}
    </p>
  );
  return (
    <fieldset
      disabled={isDisabled}
      aria-describedby={description != null ? descriptionId : undefined}
      data-slot="form-section"
      data-layout={layout}
      className={cn("m-0 flex min-w-0 flex-col border-0 p-0", layout === "split" && "@container")}
    >
      {layout === "split" ? (
        <>
          {/* A legend will not take a grid cell: it names the fieldset for screen readers, the heading beside it is seen. */}
          <legend className="sr-only">{legend}</legend>
          <div className="grid grid-cols-1 gap-ds-200 @min-[36rem]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] @min-[36rem]:gap-ds-400">
            <div aria-hidden className={cn("flex min-w-0 flex-col gap-ds-050 self-start", separator && "w-full border-b border-ds-border pb-ds-150")}>
              <span data-slot="form-section-legend" className="heading-small text-ds-text">{legend}</span>
              {description != null && <span className="text-body text-ds-text-subtle">{description}</span>}
            </div>
            {/* The described-by target stays in the tree, read once through the fieldset. */}
            {description != null && <span id={descriptionId} className="sr-only">{description}</span>}
            {fields}
          </div>
        </>
      ) : (
        <>
          {/* Floated, the legend leaves the fieldset's border alone (no notch in the separator) and sits under its padding. */}
          <legend data-slot="form-section-legend" className={cn("heading-small float-left w-full p-0 text-ds-text", description != null ? "mb-ds-050" : separator ? "mb-ds-150" : "mb-ds-200")}>
            {legend}
          </legend>
          {describe && <div className={cn("clear-both", separator ? "mb-ds-150" : "mb-ds-200")}>{describe}</div>}
          {separator && <div aria-hidden data-slot="form-section-separator" className="clear-both mb-ds-150 border-t border-ds-border" />}
          <div className="clear-both">{fields}</div>
        </>
      )}
    </fieldset>
  );
}

export type FormGroupProps = {
  children: React.ReactNode;
  /** `horizontal` lays each field out as a row: label and description first, the control at the end. */
  orientation?: FieldOrientation;
  /** A rule between the rows. Space alone separates them without it. */
  separated?: boolean;
};

/**
 * Fields that belong together without a title of their own, inside a FormSection or alone: a settings list of
 * rows with `orientation="horizontal"` and `separated`.
 */
export function FormGroup({ children, orientation = "vertical", separated = false }: FormGroupProps) {
  return (
    <FieldOrientationContext.Provider value={orientation}>
      <div
        role="group"
        data-slot="form-group"
        data-orientation={orientation}
        className={cn("flex min-w-0 flex-col", separated ? SEPARATED : "gap-ds-200", orientation === "horizontal" && HORIZONTAL)}
      >
        {children}
      </div>
    </FieldOrientationContext.Provider>
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
