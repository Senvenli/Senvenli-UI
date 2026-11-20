/**
 * Where a text field's `data-*` attributes go. Password managers and autofill read their markers on
 * the control itself (`data-1p-ignore`, `data-lpignore`, `data-bwignore`, `data-form-type`), and a TextField's
 * wrapper is a `<div>`, so every `data-*` attribute goes to the `<input>` (or `<textarea>`), except `data-testid`,
 * which stays on the field's wrapper, where it has always been (a test finds the whole field by it and the input
 * inside it by role or label). The DS's own `data-slot` on the input is never replaced.
 */
export function splitDataAttributes<P extends object>(props: P): { wrapperProps: P; controlData: Record<string, unknown> } {
  let controlData: Record<string, unknown> | undefined;
  let wrapperProps: Record<string, unknown> | undefined;
  for (const key of Object.keys(props)) {
    if (!key.startsWith("data-") || key === "data-testid" || key === "data-slot") continue;
    wrapperProps ??= { ...(props as Record<string, unknown>) };
    controlData ??= {};
    controlData[key] = wrapperProps[key];
    delete wrapperProps[key];
  }
  return { wrapperProps: (wrapperProps ?? props) as P, controlData: controlData ?? NO_DATA };
}

const NO_DATA: Record<string, unknown> = Object.freeze({}) as Record<string, unknown>;
