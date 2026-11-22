/**
 * Class recipes for the selection controls, written out in full
 * so Tailwind finds them. React Aria sets `data-selected`, `data-indeterminate`,
 * `data-invalid`, `data-disabled`, `data-focus-visible`, `data-hovered`,
 * `data-pressed` on the control's root; the indicator reads them with
 * `group-data-[…]` variants.
 *
 * Keyboard focus (a design rule): a 2px inner border on the
 * indicator, never an outer ring; pointer focus shows nothing. The colour
 * contrasts with what is under it: `ds-border-focused` on the light input
 * fill, `ds-text-on-brand` on a filled (selected) gold box or track.
 */

/** The whole row is the hit target: indicator, label and description. */
export const CHOICE_ROW =
  "group inline-flex items-start gap-ds-100 text-body text-ds-text cursor-pointer select-none outline-hidden " +
  "data-[disabled]:cursor-not-allowed data-[disabled]:text-ds-text-disabled";

export const CHOICE_TEXT = "flex min-w-0 flex-col";
export const CHOICE_DESCRIPTION = "text-body-small text-ds-text-subtlest group-data-[disabled]:text-ds-text-disabled";

const INDICATOR_BASE =
  "mt-0.5 grid size-4 shrink-0 place-items-center border-[1.5px] border-ds-border-bold bg-ds-background-input text-ds-text-on-brand " +
  "transition-colors duration-(--ds-duration-fast) ease-ds-standard " +
  "group-data-[invalid]:border-ds-border-danger group-data-[selected]:group-data-[invalid]:border-ds-border-danger " +
  "group-data-[disabled]:border-ds-border group-data-[disabled]:bg-ds-background-disabled";

export const CHECKBOX_BOX =
  INDICATOR_BASE +
  " rounded-ds-xsmall " +
  "group-data-[selected]:border-ds-border-selected group-data-[selected]:bg-ds-border-selected " +
  "group-data-[indeterminate]:border-ds-border-selected group-data-[indeterminate]:bg-ds-border-selected " +
  "group-data-[indeterminate]:group-data-[invalid]:border-ds-border-danger " +
  "group-data-[focus-visible]:inset-ring-2 group-data-[focus-visible]:inset-ring-ds-border-focused " +
  "group-data-[selected]:group-data-[focus-visible]:inset-ring-ds-text-on-brand " +
  "group-data-[indeterminate]:group-data-[focus-visible]:inset-ring-ds-text-on-brand " +
  "group-data-[disabled]:group-data-[selected]:border-ds-border group-data-[disabled]:group-data-[selected]:bg-ds-background-disabled " +
  "group-data-[disabled]:group-data-[selected]:text-ds-text-disabled " +
  "group-data-[disabled]:group-data-[indeterminate]:border-ds-border group-data-[disabled]:group-data-[indeterminate]:bg-ds-background-disabled " +
  "group-data-[disabled]:group-data-[indeterminate]:text-ds-text-disabled";

/** Selected draws a 5px ring; the light centre keeps the blue focus border readable. */
export const RADIO_DOT =
  INDICATOR_BASE +
  " rounded-ds-full " +
  "group-data-[selected]:border-[5px] group-data-[selected]:border-ds-border-selected " +
  "group-data-[focus-visible]:inset-ring-2 group-data-[focus-visible]:inset-ring-ds-border-focused " +
  // Selected: the 5px ring itself turns blue (an inner border would leave a 2px dot against gold).
  "group-data-[selected]:group-data-[focus-visible]:border-ds-border-focused group-data-[selected]:group-data-[focus-visible]:inset-ring-0 " +
  // ...also when invalid: the three-part variant sorts after the invalid ring.
  "group-data-[selected]:group-data-[invalid]:group-data-[focus-visible]:border-ds-border-focused " +
  "group-data-[disabled]:group-data-[selected]:border-ds-border-bold";

/** The recommended-option mark on a RadioCard: a brand Lozenge (20px, `ds-radius-xsmall`, 12/16 semibold). */
export const RADIO_CARD_BADGE =
  "inline-flex h-5 items-center rounded-ds-xsmall bg-ds-background-brand-subtle px-ds-075 text-body-small font-medium whitespace-nowrap text-ds-text-brand " +
  "group-data-[disabled]:bg-ds-background-disabled group-data-[disabled]:text-ds-text-disabled";

export const SWITCH_TRACK =
  "relative mt-0.5 h-5 w-8 shrink-0 rounded-ds-full bg-ds-background-neutral-pressed " +
  "transition-colors duration-(--ds-duration-fast) ease-ds-standard motion-reduce:transition-none " +
  "group-data-[selected]:bg-ds-background-brand-bold " +
  "group-data-[focus-visible]:inset-ring-2 group-data-[focus-visible]:inset-ring-ds-border-focused " +
  "group-data-[selected]:group-data-[focus-visible]:inset-ring-ds-text-on-brand " +
  "group-data-[disabled]:bg-ds-background-disabled group-data-[disabled]:inset-ring-1 group-data-[disabled]:inset-ring-ds-border " +
  // Disabled must also win over "on" (equal-depth variants sort alphabetically, so selected would).
  "group-data-[disabled]:group-data-[selected]:bg-ds-background-disabled";

export const SWITCH_THUMB =
  "absolute top-0.5 start-0.5 size-4 rounded-ds-full bg-ds-surface-raised shadow-ds-raised " +
  "transition-transform duration-(--ds-duration-fast) ease-ds-standard motion-reduce:transition-none " +
  "group-data-[selected]:translate-x-3 group-data-[selected]:bg-ds-text-on-brand rtl:group-data-[selected]:-translate-x-3 " +
  "group-data-[disabled]:bg-ds-surface-raised group-data-[disabled]:shadow-none group-data-[disabled]:inset-ring-1 group-data-[disabled]:inset-ring-ds-border " +
  "group-data-[disabled]:group-data-[selected]:bg-ds-surface-raised";

export const RADIO_CARD =
  "group flex min-w-0 items-start gap-ds-150 rounded-ds-large bg-ds-surface-raised p-ds-200 cursor-pointer select-none outline-hidden " +
  "inset-ring-1 inset-ring-ds-border-bold " +
  "data-[selected]:bg-ds-background-selected data-[selected]:inset-ring-2 data-[selected]:inset-ring-ds-border-selected " +
  "data-[invalid]:inset-ring-ds-border-danger " +
  // Keyboard focus wins over the selected and invalid borders (stacked variants sort later).
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  "data-[selected]:data-[focus-visible]:inset-ring-ds-border-focused data-[invalid]:data-[focus-visible]:inset-ring-ds-border-focused " +
  "data-[disabled]:cursor-not-allowed data-[disabled]:bg-ds-background-disabled data-[disabled]:text-ds-text-disabled data-[disabled]:inset-ring-ds-border " +
  "data-[disabled]:data-[selected]:bg-ds-background-disabled data-[disabled]:data-[selected]:inset-ring-1 data-[disabled]:data-[selected]:inset-ring-ds-border";

export const SLIDER_TRACK = "relative flex h-5 w-full items-center";
export const SLIDER_RAIL = "absolute inset-x-0 h-1 rounded-ds-full bg-ds-background-neutral-pressed group-data-[disabled]:bg-ds-background-disabled";
export const SLIDER_FILL = "absolute h-1 rounded-ds-full bg-ds-background-brand-bold group-data-[disabled]:bg-ds-background-disabled";
export const SLIDER_THUMB =
  // React Aria positions the thumb inline (left + translate(-50%, -50%)); only the vertical anchor is set here.
  "top-1/2 size-5 rounded-ds-full border-2 border-ds-background-brand-bold bg-ds-surface-raised shadow-ds-raised " +
  "cursor-grab outline-hidden data-[dragging]:cursor-grabbing " +
  // Focus turns the gold border blue as well, so no blue edge sits against gold.
  "data-[focus-visible]:border-ds-border-focused data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  "data-[disabled]:cursor-not-allowed data-[disabled]:border-ds-border data-[disabled]:shadow-none";
