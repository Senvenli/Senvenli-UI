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

/**
 * What a SplitShow shows in each layout, per collapse width, queried on the Split's own named container
 * (container `split`) so a container inside a pane (a horizontal form group) never answers instead.
 */
const SHOW: Record<SplitCollapse, Record<"stacked" | "side-by-side", string>> = {
  "48rem": { stacked: "contents @3xl/split:hidden", "side-by-side": "hidden @3xl/split:contents" },
  "64rem": { stacked: "contents @5xl/split:hidden", "side-by-side": "hidden @5xl/split:contents" },
  "80rem": { stacked: "contents @7xl/split:hidden", "side-by-side": "hidden @7xl/split:contents" },
};

/** The nearest Split's collapse width, for SplitShow. */
const SplitContext = React.createContext<SplitCollapse | null>(null);

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
    { ...rest, ref, "data-slot": "split", className: cn("@container [container-name:split]", fullHeight && "min-h-svh") },
    <SplitContext.Provider value={collapseBelow}>
    <div
      data-slot="split-grid"
      className={cn("grid", fullHeight && "min-h-svh", COLUMNS[collapseBelow], hideOnNarrow && HIDE[collapseBelow][hideOnNarrow], space && GAP[space])}
      style={{ "--ds-split-columns": ratio } as React.CSSProperties}
    >
      {children}
    </div>
    </SplitContext.Provider>,
  );
});

export type SplitShowProps = {
  /**
   * `stacked`: only while the Split's panes stack (a phone), as a compact brand above a form whose brand pane is
   * hidden there. `side-by-side`: only while they sit side by side.
   */
  when: "stacked" | "side-by-side";
  children: React.ReactNode;
};

/**
 * Content shown in one of the Split's layouts only, decided by the Split's own width (the same container query
 * that stacks it), not the viewport's. It adds no box of its own (`display: contents`). Outside a Split it always
 * shows. Hidden content is `display: none`, so it is out of the accessibility tree too.
 */
export function SplitShow({ when, children }: SplitShowProps) {
  const collapse = React.useContext(SplitContext);
  if (collapse == null) return <>{children}</>;
  return (
    <div data-slot="split-show" data-when={when} className={SHOW[collapse][when]}>
      {children}
    </div>
  );
}

