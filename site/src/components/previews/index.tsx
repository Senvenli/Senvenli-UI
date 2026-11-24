import type { ReactNode } from "react";
import { BASICS } from "./basics";
import { CHARTS } from "./charts";
import { INPUTS } from "./inputs";
import { SURFACES } from "./surfaces";

/** One preview per component, by manifest name. */
const PREVIEWS: Record<string, ReactNode> = { ...BASICS, ...INPUTS, ...SURFACES, ...CHARTS };

/**
 * The small picture on a component's card (pages/ComponentsIndexPage.tsx). Every preview is laid out for one stage of
 * 208 × 128px, and the stage scales down with the card (styles.css, .component-preview), so nothing reflows or is cut
 * off on a narrow card. The card's link sits beside this, never around it: the preview is inert and hidden from
 * assistive tech, as the family panels on the landing are. A component without a preview yet gets a quiet placeholder.
 */
export function ComponentPreview({ name }: { name: string }) {
  const preview = Object.hasOwn(PREVIEWS, name) ? PREVIEWS[name] : undefined;
  return (
    <div aria-hidden inert className="component-preview pointer-events-none" data-preview={preview ? "ready" : "fallback"}>
      <div className="component-preview-stage">
        {preview ?? (
          <div className="flex w-28 flex-col gap-ds-100">
            <span className="block h-1.5 w-16 rounded-ds-full bg-ds-text-subtlest" />
            <span className="block h-1.5 rounded-ds-full bg-ds-background-neutral-pressed" />
            <span className="block h-1.5 w-2/3 rounded-ds-full bg-ds-background-neutral-pressed" />
          </div>
        )}
      </div>
    </div>
  );
}
