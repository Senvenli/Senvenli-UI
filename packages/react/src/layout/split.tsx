import * as React from "react";

import { cn } from "../utils";
import { boxClasses, type BoxProps, type LayoutHTMLProps } from "./box";
import { GAP, type Space } from "./tokens";

/** The layout's own width below which the panes stack (a container query, so it holds inside a dialog or a shell). */
export type SplitCollapse = "48rem" | "64rem" | "80rem";

// Static class names per width: Tailwind only generates what it can read.
const COLUMNS: Record<SplitCollapse, string> = {
  "48rem": "@3xl:grid-cols-(--ds-split-columns)",
  "64rem": "@5xl:grid-cols-(--ds-split-columns)",
  "80rem": "@7xl:grid-cols-(--ds-split-columns)",
};
const HIDE: Record<SplitCollapse, Record<"start" | "end", string>> = {
  "48rem": { start: "@max-3xl:[&>[data-slot=split-pane]:first-child]:hidden", end: "@max-3xl:[&>[data-slot=split-pane]:last-child]:hidden" },
  "64rem": { start: "@max-5xl:[&>[data-slot=split-pane]:first-child]:hidden", end: "@max-5xl:[&>[data-slot=split-pane]:last-child]:hidden" },
  "80rem": { start: "@max-7xl:[&>[data-slot=split-pane]:first-child]:hidden", end: "@max-7xl:[&>[data-slot=split-pane]:last-child]:hidden" },
};

export type SplitProps = LayoutHTMLProps & {
  as?: BoxProps["as"];
  /** The columns side by side, as a CSS grid template: `"1fr 1fr"` (default), `"1.05fr 1fr"`, `"20rem 1fr"`. */
  ratio?: string;
  /** Below this width of the layout itself the panes stack in one column. Default `"48rem"`. */
  collapseBelow?: SplitCollapse;
  /** The pane that is left out when stacked (a brand or picture pane that adds nothing on a phone). Default: none. */
  hideOnNarrow?: "start" | "end";
  /** The gap between the panes. Default none: panes meet edge to edge, each with its own ground. */
  space?: Space;
  /** At least as tall as the viewport: a screen of its own, like a sign-in page. */
  fullHeight?: boolean;
  children?: React.ReactNode;
};

export type SplitPaneProps = BoxProps & {
  /** `stretch` (default): content fills the pane. `center`: content sits in the middle, both ways. */
  align?: "stretch" | "center";
};

/** One side of a Split: a Box that is a flex column, so its content can fill it or sit centered. */
export const SplitPane = React.forwardRef<HTMLElement, SplitPaneProps>(function SplitPane(
  { as = "div", align = "stretch", padding, paddingInline, paddingBlock, background, radius, shadow, border, children, ...rest },
  ref,
) {
  return React.createElement(
    as,
    {
      ...rest,
      ref,
      "data-slot": "split-pane",
      className: cn(
        "relative flex min-w-0 flex-col",
        align === "center" && "items-center justify-center",
        boxClasses({ padding, paddingInline, paddingBlock, background, radius, shadow, border }),
      ),
    },
    children,
  );
});

/**
 * Two or more panes side by side that stack below a width, measured on the layout itself, not the viewport. The
 * pattern under split screens (sign-in beside a brand pane), list and detail, media and text. Every pane is a
 * `SplitPane`; what goes in it, and how it looks, is the app's.
 */
export const Split = React.forwardRef<HTMLElement, SplitProps>(function Split(
  { as = "div", ratio = "1fr 1fr", collapseBelow = "48rem", hideOnNarrow, space, fullHeight = false, children, ...rest },
  ref,
) {
  // The container is the outer box: an element cannot query its own width, so the grid is one level in.
  return React.createElement(
    as,
    { ...rest, ref, "data-slot": "split", className: cn("@container", fullHeight && "min-h-svh") },
    <div
      data-slot="split-grid"
      className={cn("grid", fullHeight && "min-h-svh", COLUMNS[collapseBelow], hideOnNarrow && HIDE[collapseBelow][hideOnNarrow], space && GAP[space])}
      style={{ "--ds-split-columns": ratio } as React.CSSProperties}
    >
      {children}
    </div>,
  );
});

