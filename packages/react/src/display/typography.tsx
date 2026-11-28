import * as React from "react";

import { cn } from "../utils";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingSize =
  | "display-large" | "display-medium"
  | "heading-xxlarge" | "heading-xlarge" | "heading-large" | "heading-medium" | "heading-small" | "heading-xsmall" | "heading-xxsmall";

const HEADING_SIZE: Record<HeadingSize, string> = {
  // Display steps down by width: below 768px large → medium, below 480px medium → heading-xxlarge.
  "display-large": "text-heading-xxlarge min-[480px]:text-display-medium min-[768px]:text-display-large",
  "display-medium": "text-heading-xxlarge min-[480px]:text-display-medium",
  "heading-xxlarge": "text-heading-xxlarge",
  "heading-xlarge": "text-heading-xlarge",
  "heading-large": "text-heading-large",
  "heading-medium": "text-heading-medium",
  "heading-small": "text-heading-small",
  "heading-xsmall": "text-heading-xsmall",
  "heading-xxsmall": "text-heading-xxsmall",
};
const DEFAULT_SIZE: Record<HeadingLevel, HeadingSize> = {
  1: "heading-xlarge", 2: "heading-large", 3: "heading-medium", 4: "heading-small", 5: "heading-xsmall", 6: "heading-xxsmall",
};

export type HeadingProps = {
  /** The place in the document outline (h1–h6). */
  level: HeadingLevel;
  /** The look, set apart from the level. `display-*` is for a marketing hero and section titles only. */
  size?: HeadingSize;
  children: React.ReactNode;
  id?: string;
};

/** Set inside a Heading, so a Text there that keeps its own body size can say so. */
const InHeadingContext = React.createContext(false);

/** A heading whose semantic level and visual size are set separately; wraps balanced. */
export function Heading({ level, size, children, id }: HeadingProps) {
  const Element = `h${level}` as const;
  return (
    <Element id={id} data-slot="heading" data-size={size ?? DEFAULT_SIZE[level]} className={cn("m-0 text-ds-text text-balance", HEADING_SIZE[size ?? DEFAULT_SIZE[level]])}>
      <InHeadingContext.Provider value>{children}</InHeadingContext.Provider>
    </Element>
  );
}

export type TextSize = "body-large" | "body" | "body-small" | "code" | "inherit";
export type TextTone = "default" | "subtle" | "subtlest" | "brand" | "information" | "success" | "warning" | "danger";

const TEXT_SIZE: Record<TextSize, string> = {
  "body-large": "text-body-large",
  body: "text-body",
  "body-small": "text-body-small",
  code: "text-code font-ds-mono",
  // No type step: size, line height, weight and letter spacing come from the parent (a toned run inside a heading).
  inherit: "",
};
const TEXT_TONE: Record<TextTone, string> = {
  default: "text-ds-text",
  subtle: "text-ds-text-subtle",
  subtlest: "text-ds-text-subtlest",
  brand: "text-ds-text-brand",
  information: "text-ds-text-information",
  success: "text-ds-text-success",
  warning: "text-ds-text-warning",
  danger: "text-ds-text-danger",
};

export type TextProps = {
  /**
   * The step on the type scale; `body` by default. `inherit` takes the parent's size, line height, weight and letter
   * spacing, for a run that only changes tone: an accent inside a Heading (`<Text tone="brand" size="inherit">`).
   */
  size?: TextSize;
  tone?: TextTone;
  /** `medium` sets medium; `regular` (the default) adds nothing, so with `size="inherit"` the parent's weight shows. */
  weight?: "regular" | "medium";
  /** `p` for a paragraph (kept under ~70 characters a line), `span` inline, `div` for a block. */
  elementType?: "span" | "p" | "div";
  /** Lines up figures in columns and changing values. */
  isNumeric?: boolean;
  /** One line, cut with an ellipsis where its container ends (a table cell, a card title). */
  truncate?: boolean;
  children: React.ReactNode;
};

/** One run of app text on the type scale. Legal text keeps `body`; never smaller. */
export function Text({ size: sizeProp, tone = "default", weight = "regular", elementType = "span", isNumeric, truncate, children }: TextProps) {
  const Element = elementType;
  const size = sizeProp ?? "body";
  const inHeading = React.useContext(InHeadingContext);
  const warned = React.useRef(false);
  React.useEffect(() => {
    if (!inHeading || sizeProp !== undefined || warned.current) return;
    warned.current = true;
    console.warn(
      'Senvenli Text: a Text inside a Heading keeps the body size. Pass size="inherit" to take the heading\'s size ' +
        '(for a toned run such as an accent), or set the size you mean.',
    );
  }, [inHeading, sizeProp]);
  return (
    <Element
      data-slot="text"
      className={cn(
        TEXT_SIZE[size],
        TEXT_TONE[tone],
        weight === "medium" && "font-medium",
        elementType === "p" && "m-0 max-w-[70ch]",
        isNumeric && "tabular-nums",
        truncate && "block max-w-full truncate",
      )}
    >
      {children}
    </Element>
  );
}

/**
 * Long-form text styled from the type tokens: help pages, terms of service, email
 * bodies. 62ch measure, body-large; h2/h3, lists, quotes, inline code and
 * links inside follow the design. Children are rendered HTML or Markdown output.
 */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-slot="prose"
      className={cn(
        "max-w-[62ch] text-body-large text-ds-text",
        "[&>*:last-child]:mb-0",
        "[&_h2]:mt-ds-400 [&_h2]:mb-ds-100 [&_h2]:text-heading-medium [&_h2]:text-balance [&>h2:first-child]:mt-0",
        "[&_h3]:mt-ds-300 [&_h3]:mb-ds-100 [&_h3]:text-heading-small [&_h3]:text-balance [&>h3:first-child]:mt-0",
        "[&_p]:mt-0 [&_p]:mb-ds-200",
        "[&_ul]:mt-0 [&_ul]:mb-ds-200 [&_ul]:list-disc [&_ul]:ps-ds-250 [&_ol]:mt-0 [&_ol]:mb-ds-200 [&_ol]:list-decimal [&_ol]:ps-ds-250",
        "[&_li+li]:mt-ds-050 [&_li>p:last-child]:mb-0 [&_blockquote>p:last-child]:mb-0",
        "[&_blockquote]:mx-0 [&_blockquote]:mt-0 [&_blockquote]:mb-ds-200 [&_blockquote]:border-s-2 [&_blockquote]:border-ds-border-bold [&_blockquote]:ps-ds-200 [&_blockquote]:text-ds-text-subtle",
        "[&_code]:rounded-ds-xsmall [&_code]:bg-ds-background-neutral [&_code]:px-ds-050 [&_code]:py-px [&_code]:font-ds-mono [&_code]:text-code",
        "[&_strong]:font-medium",
        "[&_a]:text-ds-link [&_a]:underline [&_a]:underline-offset-3",
      )}
    >
      {children}
    </div>
  );
}
