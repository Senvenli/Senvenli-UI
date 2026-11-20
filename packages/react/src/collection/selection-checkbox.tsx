"use client";

import { Checkbox as AriaCheckbox } from "react-aria-components";

import { IconGlyph } from "../display/icon";
import { CHECKBOX_BOX } from "../selection/styles";

/**
 * The row and header checkbox of a selectable collection. React Aria wires it through `slot="selection"`:
 * it selects its row (or every row, with an indeterminate state when some are), and names itself.
 */
export function SelectionCheckbox() {
  return (
    <AriaCheckbox slot="selection" data-slot="selection-checkbox" className="group inline-flex cursor-pointer outline-hidden">
      {({ isIndeterminate, isSelected }) => (
        <span aria-hidden="true" className={CHECKBOX_BOX}>
          {isIndeterminate ? (
            <IconGlyph name="minus" size="small" strokeWidth={3} />
          ) : isSelected ? (
            <IconGlyph name="check" size="small" strokeWidth={3} />
          ) : null}
        </span>
      )}
    </AriaCheckbox>
  );
}
