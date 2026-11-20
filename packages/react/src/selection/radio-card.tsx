"use client";

import * as React from "react";
import { Radio as AriaRadio, RadioGroup as AriaRadioGroup, type RadioGroupProps as AriaRadioGroupProps } from "react-aria-components";

import { FieldDescription, FieldError, FieldLabel } from "../form/field-parts";
import { FIELD_STACK } from "../form/styles";
import type { RequiredValidation } from "../form/validation";
import { hasContent } from "./choice-text";
import { useRadioGroupRequired } from "./radio";
import { CHOICE_DESCRIPTION, RADIO_CARD, RADIO_CARD_BADGE, RADIO_DOT } from "./styles";

export type RadioCardItem = {
  value: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  price?: React.ReactNode;
  /** Marks the recommended option ("Recommended"), as a brand lozenge. */
  badge?: React.ReactNode;
  isDisabled?: boolean;
};

export type RadioCardProps = Omit<AriaRadioGroupProps, "children" | "className" | "style" | "orientation"> & {
  label: React.ReactNode;
  /** Two to four cards. */
  items: readonly RadioCardItem[];
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  /**
   * As RadioGroup's: `field` (default) or `app`. See {@link RequiredValidation}. The app's `isInvalid`
   * (`true` with its `errorMessage`, or `false`) overrides the check, as on TextField. Disabled, empty and required,
   * it still blocks a DS Form's submit and cannot take focus (as TextField).
   */
  requiredValidation?: RequiredValidation;
};

/**
 * A RadioGroup whose options are cards (insurance packages, delivery options).
 * The whole card is the hit target; arrow keys move between cards; cards in a
 * row have equal height.
 */
export function RadioCard({ label, items, description, errorMessage: errorMessageProp, requiredValidation, ...rest }: RadioCardProps) {
  const { errorMessage, groupProps } = useRadioGroupRequired({ ...rest, errorMessage: errorMessageProp, requiredValidation });
  return (
    <AriaRadioGroup {...rest} {...groupProps} data-slot="radio-card-group" className={FIELD_STACK}>
      <FieldLabel isRequired={rest.isRequired}>{label}</FieldLabel>
      <div data-slot="radio-card-items" className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-ds-150">
        {items.map((item) => (
          <RadioCardOption key={item.value} item={item} />
        ))}
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{errorMessage}</FieldError>
    </AriaRadioGroup>
  );
}

function RadioCardOption({ item }: { item: RadioCardItem }) {
  const id = React.useId();
  const titleId = `${id}-title`;
  const badgeId = hasContent(item.badge) ? `${id}-badge` : undefined;
  const detailsId = hasContent(item.description) || hasContent(item.price) ? `${id}-details` : undefined;
  const describedBy = [badgeId, detailsId].filter(Boolean).join(" ") || undefined;
  return (
    <AriaRadio
      value={item.value}
      isDisabled={item.isDisabled}
      // Named by the title alone; badge, detail and price stay visible text and describe it.
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      data-slot="radio-card"
      className={RADIO_CARD}
    >
      <span aria-hidden="true" data-slot="radio-dot" className={RADIO_DOT} />
      <span data-slot="radio-card-body" className="flex min-w-0 flex-col gap-ds-050">
        <span className="flex flex-wrap items-center gap-ds-075">
          <span id={titleId} data-slot="radio-card-title" className="text-body-strong">{item.title}</span>
          {badgeId && (
            // A brand Lozenge; swap in the Lozenge component once the display group ships it.
            <span id={badgeId} data-slot="radio-card-badge" className={RADIO_CARD_BADGE}>
              {item.badge}
            </span>
          )}
        </span>
        {detailsId && (
          <span id={detailsId} className="flex flex-col gap-ds-050">
            {hasContent(item.description) && (
              <span data-slot="radio-card-description" className={CHOICE_DESCRIPTION}>{item.description}</span>
            )}
            {hasContent(item.price) && (
              <span data-slot="radio-card-price" className="text-metric-small tabular-nums">{item.price}</span>
            )}
          </span>
        )}
      </span>
    </AriaRadio>
  );
}
