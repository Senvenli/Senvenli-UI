import * as React from "react";

export type VisuallyHiddenProps = {
  children: React.ReactNode;
  /** `span` (default) inside a line, `div` for a block (a hidden heading that names a region). */
  elementType?: "span" | "div" | "h2" | "h3" | "label";
  /** Shown while it, or something in it, has keyboard focus: a skip link, a hidden "edit" action. */
  isFocusable?: boolean;
  id?: string;
};

/**
 * Text that screen readers read but the page does not show: the name of an icon-only control's context, a heading
 * for a region the layout already makes obvious. Never hide something a sighted user needs.
 */
export function VisuallyHidden({ children, elementType: Element = "span", isFocusable, id }: VisuallyHiddenProps) {
  return (
    <Element id={id} data-slot="visually-hidden" className={isFocusable ? "sr-only focus-within:not-sr-only focus:not-sr-only" : "sr-only"}>
      {children}
    </Element>
  );
}
