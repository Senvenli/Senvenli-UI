"use client";

import * as React from "react";

import { FieldErrorContent, hasContent } from "../form/field-parts";
import { ERROR } from "../form/styles";
import { CHOICE_DESCRIPTION, CHOICE_TEXT } from "./styles";

/** Content worth rendering; the same check as FieldError's (one helper, in field-parts). */
export { hasContent };

/**
 * Label, description and error inside a choice row. The row is the `<label>`,
 * so the whole row is the hit target. The control is named by the label part
 * alone (`aria-labelledby`) and described by the description and error, which
 * stay visible text, so browse mode and swipe reading reach them too. The
 * error lives in a polite live region that is always mounted, so it is
 * announced when it appears; while shown it is FieldError's row (icon + message).
 *
 * `keepErrorRegion` mounts that region, empty, before any message exists: a lone Checkbox whose DS required check
 * applies has no `errorMessage` while valid, and its "Fill in this field." must still appear inside a region that was
 * already there.
 */
export function useChoiceText(description: React.ReactNode, errorMessage?: React.ReactNode, keepErrorRegion = false) {
  const id = React.useId();
  const labelId = `${id}-label`;
  const descriptionId = hasContent(description) ? `${id}-description` : undefined;
  const errorId = hasContent(errorMessage) || keepErrorRegion ? `${id}-error` : undefined;
  const describedBy = [errorId, descriptionId].filter(Boolean).join(" ") || undefined;
  const render = (label: React.ReactNode, showError = false) => (
    <span data-slot="choice-text" className={CHOICE_TEXT}>
      <span id={labelId} data-slot="choice-label">{label}</span>
      {descriptionId && (
        <span id={descriptionId} data-slot="choice-description" className={CHOICE_DESCRIPTION}>
          {description}
        </span>
      )}
      {errorId && (
        <span id={errorId} aria-live="polite" data-slot="choice-error">
          {showError && (
            // FieldError's row (icon + message, its classes and slots), drawn while invalid. A span:
            // the row sits inside the checkbox's <label>, which takes phrasing content only.
            <span data-slot="field-error" className={ERROR}>
              <FieldErrorContent>{errorMessage}</FieldErrorContent>
            </span>
          )}
        </span>
      )}
    </span>
  );
  return { labelId, describedBy, render };
}
