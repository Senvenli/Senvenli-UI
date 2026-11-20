import * as React from "react";

/** 16px high, at least 24px wide, on `ds-radius-xsmall`: a country or language code beside its name. */
const ISO_CHIP =
  "inline-grid h-4 min-w-6 shrink-0 place-items-center rounded-ds-xsmall bg-ds-background-neutral px-ds-050 text-[11px] leading-4 font-medium text-ds-text-subtle";

export type IsoChipProps = {
  /** The two-letter ISO 3166 code ("DE", "US") or another short region code, shown as given. */
  code: string;
};

/**
 * The chip under a DS part's own `data-slot`, for DS components that show a code inside themselves.
 * Package-internal (not in the display index); apps use `IsoChip`.
 */
export function IsoChipMark({ code, slot }: IsoChipProps & { slot: string }) {
  return (
    <span data-slot={slot} className={ISO_CHIP}>
      {code}
    </span>
  );
}

/**
 * A country or region as its two-letter code in a small neutral chip, never an emoji flag nor a colour alone:
 * the mark PhoneField shows before each country. Decorative beside the country's name, as in
 * a ComboBox or MultiSelect item's `icon` (which hides it from assistive technology); shown alone, give it a
 * name around it (a `role="img"` wrapper with the country's `aria-label`, a tooltip trigger's label).
 */
export function IsoChip({ code }: IsoChipProps) {
  return <IsoChipMark code={code} slot="iso-chip" />;
}
