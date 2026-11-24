"use client";

import * as React from "react";
import {
  SelectionIndicator,
  Tab as AriaTab,
  TabList as AriaTabList,
  TabListStateContext,
  TabPanel as AriaTabPanel,
  Tabs as AriaTabs,
  ToggleButton as AriaToggleButton,
  ToggleButtonGroup as AriaToggleButtonGroup,
  type Key,
} from "react-aria-components";

import { cn } from "../utils";
import { MotionScope, useComponentDefaults, type ComponentSize, type WithMotion } from "../defaults";
import { Badge } from "../display/badge";

export type TabItem = {
  id: Key;
  /** A noun, one or two words ("Orders"). */
  label: string;
  /** A count after the label (a Badge), e.g. open damage records. */
  count?: number;
  isDisabled?: boolean;
  panel: React.ReactNode;
};

export type TabsProps = {
  /**
   * Two to six tabs as data. Leave it out and compose `TabList`, `Tab` and `TabPanel` as children instead,
   * for a tab with an icon, a panel built elsewhere, or tabs rendered from your own components.
   */
  items?: readonly TabItem[];
  /** With no `items`: a `TabList` of `Tab`s followed by one `TabPanel` per tab, matched by `id`. */
  children?: React.ReactNode;
  selectedKey?: Key;
  defaultSelectedKey?: Key;
  onSelectionChange?: (key: Key) => void;
  /** Names the tab list when no heading above it does (with `items`; on `TabList` otherwise). */
  "aria-label"?: string;
  /** `underline` (default): a line under the selected tab; `pills`: a filled tab; `outline`: a framed tab. */
  variant?: TabsVariant;
  /** `horizontal` (default), or `vertical`: the tabs in a column beside the panels (settings pages). */
  orientation?: "horizontal" | "vertical";
  /** `small`, `medium` (default) or `large`; the provider default otherwise. */
  size?: ComponentSize;
};

export type TabsVariant = "underline" | "pills" | "outline";

export type TabListProps = {
  /** `Tab` elements. */
  children: React.ReactNode;
  /** Names the tab list when no heading above it does. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

export type TabProps = {
  /** Matches the `TabPanel` with the same `id`. */
  id: Key;
  /** The label: a noun, one or two words, optionally with an Icon before it. */
  children: React.ReactNode;
  /** A count after the label (a Badge); hidden at 0. */
  count?: number;
  isDisabled?: boolean;
};

export type TabPanelProps = {
  /** Matches the `Tab` with the same `id`. */
  id: Key;
  children: React.ReactNode;
};

/** The selected tab's 2px underline (never colour alone); React Aria slides it to the next tab (no slide under reduced motion). */
const SLIDE = "transition-[translate,width,height] duration-(--ds-duration-medium) ease-ds-standard motion-reduce:transition-none";
const FILL = "absolute inset-0 -z-10 rounded-ds-control-medium bg-ds-background-neutral";
const FRAME = "absolute inset-0 -z-10 rounded-ds-control-medium inset-ring-1 inset-ring-ds-border-bold";

/** The selected mark, which React Aria slides to the next tab: a line, a fill or a frame (never colour alone). */
const TAB_INDICATOR: Record<TabsVariant, Record<TabsOrientation, string>> = {
  underline: {
    horizontal: `absolute inset-x-0 -bottom-px h-0.5 rounded-t-ds-small bg-ds-border-selected ${SLIDE}`,
    vertical: `absolute inset-y-0 -end-px w-0.5 rounded-s-ds-small bg-ds-border-selected ${SLIDE}`,
  },
  pills: { horizontal: `${FILL} ${SLIDE}`, vertical: `${FILL} ${SLIDE}` },
  outline: { horizontal: `${FRAME} ${SLIDE}`, vertical: `${FRAME} ${SLIDE}` },
};

/** The row (or column) of tabs per variant: a rule along it for `underline`, nothing for the boxed ones. */
const TAB_LIST: Record<TabsVariant, Record<TabsOrientation, string>> = {
  underline: {
    horizontal: "flex gap-ds-300 overflow-x-auto border-b border-ds-border",
    vertical: "flex w-48 shrink-0 flex-col gap-ds-050 border-e border-ds-border pe-ds-200",
  },
  pills: { horizontal: "flex gap-ds-050 overflow-x-auto", vertical: "flex w-48 shrink-0 flex-col gap-ds-050" },
  outline: { horizontal: "flex gap-ds-050 overflow-x-auto", vertical: "flex w-48 shrink-0 flex-col gap-ds-050" },
};

/** Tab height and type per size; the boxed variants (pills, outline) add inline padding. */
const TAB_SIZE: Record<ComponentSize, string> = { small: "h-8 text-body-small", medium: "h-10", large: "h-12 text-body-large" };
const TAB_BOXED: Record<ComponentSize, string> = { small: "px-ds-100", medium: "px-ds-150", large: "px-ds-200" };

type TabsOrientation = "horizontal" | "vertical";

/** What a TabList and its Tabs draw, from Tabs, so composed tabs look the same as `items`. */
const TabsLook = React.createContext<{ variant: TabsVariant; orientation: TabsOrientation; size: ComponentSize }>({
  variant: "underline",
  orientation: "horizontal",
  size: "medium",
});

const TAB =
  "relative isolate inline-flex h-10 shrink-0 cursor-default items-center gap-ds-075 rounded-ds-small text-body font-[500] whitespace-nowrap text-ds-text-subtle outline-hidden " +
  "transition-colors duration-(--ds-duration-fast) motion-reduce:transition-none " +
  "data-[hovered]:text-ds-text data-[selected]:text-ds-text " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused data-[disabled]:text-ds-text-disabled";

/**
 * The row of tabs. On a narrow screen it scrolls sideways and keeps the selected tab in view, by scrolling
 * the row alone, never the page (scrollIntoView would scroll every ancestor, the window included).
 */
export function TabList({ children, "aria-label": label, "aria-labelledby": labelledBy }: TabListProps) {
  const list = React.useRef<HTMLDivElement>(null);
  const selected = React.useContext(TabListStateContext)?.selectedKey;
  const look = React.useContext(TabsLook);
  React.useEffect(() => {
    const row = list.current;
    const tab = row?.querySelector<HTMLElement>("[data-selected]");
    if (!row || !tab) return;
    // Rect deltas work the same in RTL.
    const outer = row.getBoundingClientRect();
    const inner = tab.getBoundingClientRect();
    if (inner.left < outer.left) row.scrollLeft -= outer.left - inner.left;
    else if (inner.right > outer.right) row.scrollLeft += inner.right - outer.right;
  }, [selected]);
  return (
    <AriaTabList
      ref={list}
      aria-label={label}
      aria-labelledby={labelledBy}
      data-slot="tabs-list"
      className={cn(TAB_LIST[look.variant][look.orientation], "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden")}
    >
      {children}
    </AriaTabList>
  );
}

/** One tab: its label, an optional count, and the sliding underline when selected. */
export function Tab({ id, children, count, isDisabled }: TabProps) {
  const look = React.useContext(TabsLook);
  const boxed = look.variant !== "underline" && cn("rounded-ds-control-medium", TAB_BOXED[look.size]);
  return (
    <AriaTab
      id={id}
      isDisabled={isDisabled}
      data-slot="tab"
      className={cn(TAB, TAB_SIZE[look.size], boxed, look.orientation === "vertical" && "w-full justify-start")}
    >
      <SelectionIndicator data-slot="tab-indicator" className={TAB_INDICATOR[look.variant][look.orientation]} />
      {children}
      {count !== undefined && count > 0 && (
        <span data-slot="tab-count" className="flex">
          <Badge variant="count" value={count} />
        </span>
      )}
    </AriaTab>
  );
}

/** A tab's view. It stays mounted while hidden, so its state (a scroll position, a half-filled filter) survives switching. */
export function TabPanel({ id, children }: TabPanelProps) {
  return (
    <AriaTabPanel
      id={id}
      shouldForceMount
      data-slot="tab-panel"
      className="outline-hidden data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused data-[inert]:hidden [&[inert]]:hidden"
    >
      {children}
    </AriaTabPanel>
  );
}

/**
 * Switches between views of the same object without leaving the page. Arrow keys (mirrored in RTL),
 * Home and End move between tabs; the selected tab holds focus. Give `items`, or compose `TabList`,
 * `Tab` and `TabPanel` as children; both render the same parts.
 */
function TabsBody({
  items, children, selectedKey, defaultSelectedKey, onSelectionChange, "aria-label": label, variant = "underline", orientation = "horizontal", size: ownSize,
}: TabsProps) {
  const defaults = useComponentDefaults();
  const size = ownSize ?? defaults.size ?? "medium";
  const look = React.useMemo(() => ({ variant, orientation, size }), [variant, orientation, size]);
  return (
    <TabsLook.Provider value={look}>
      <AriaTabs
        selectedKey={selectedKey}
        defaultSelectedKey={defaultSelectedKey}
        onSelectionChange={onSelectionChange}
        orientation={orientation}
        data-slot="tabs"
        data-variant={variant}
        className={orientation === "vertical" ? "flex gap-ds-400" : "flex flex-col gap-ds-200"}
      >
        {items ? (
          <>
            <TabList aria-label={label}>
              {items.map((item) => (
                <Tab key={item.id} id={item.id} count={item.count} isDisabled={item.isDisabled}>
                  {item.label}
                </Tab>
              ))}
            </TabList>
            {items.map((item) => (
              <TabPanel key={item.id} id={item.id}>
                {item.panel}
              </TabPanel>
            ))}
          </>
        ) : (
          children
        )}
      </AriaTabs>
    </TabsLook.Provider>
  );
}

export type SegmentedControlItem = { id: Key; label: string };

export type SegmentedControlProps = {
  /** Names the group for assistive tech ("Period"); it is not shown. */
  label: string;
  /** Two to five short options ("Day", "Week", "Month"). */
  items: readonly SegmentedControlItem[];
  value?: Key;
  defaultValue?: Key;
  onChange?: (value: Key) => void;
  isDisabled?: boolean;
};

/**
 * The selected segment's lifted surface (surface and shadow, not only colour); it slides to the next segment. Segments
 * sit in the 2px-padded track, so their corner is the track's minus that padding: concentric at every radius.
 */
const SEGMENT_INDICATOR =
  "absolute inset-0 -z-10 rounded-[max(0px,calc(var(--ds-radius-control-medium,var(--ds-radius-medium))-2px))] bg-ds-background-segment-selected shadow-ds-raised " +
  "transition-[translate,width] duration-(--ds-duration-medium) ease-ds-standard motion-reduce:transition-none";

const SEGMENT =
  "inline-flex h-7 cursor-default items-center rounded-[max(0px,calc(var(--ds-radius-control-medium,var(--ds-radius-medium))-2px))] px-ds-150 text-body font-[500] whitespace-nowrap text-ds-text-subtle outline-hidden " +
  "transition-[background-color,color,box-shadow] duration-(--ds-duration-fast) motion-reduce:transition-none " +
  "data-[hovered]:text-ds-text " +
  "relative isolate data-[selected]:text-ds-text " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused data-[disabled]:text-ds-text-disabled";

/**
 * Tabs' compact sibling for switching a filter or a scale (day · week · month), not for views. One
 * option is always chosen; arrow keys move between them.
 */
export function SegmentedControl({ label, items, value, defaultValue, onChange, isDisabled }: SegmentedControlProps) {
  const [own, setOwn] = React.useState<Key | undefined>(defaultValue ?? items[0]?.id);
  const current = value ?? own;
  return (
    <AriaToggleButtonGroup
      aria-label={label}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={current === undefined ? [] : [current]}
      onSelectionChange={(keys) => {
        const next = [...keys][0];
        if (next === undefined) return;
        if (value === undefined) setOwn(next);
        onChange?.(next);
      }}
      isDisabled={isDisabled}
      data-slot="segmented-control"
      className={cn("inline-flex w-fit max-w-full self-start gap-0.5 overflow-x-auto rounded-ds-control-medium bg-ds-background-neutral p-0.5", "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden")}
    >
      {items.map((item) => (
        <AriaToggleButton key={item.id} id={item.id} data-slot="segment" className={SEGMENT}>
          <SelectionIndicator data-slot="segment-indicator" className={SEGMENT_INDICATOR} />
          {item.label}
        </AriaToggleButton>
      ))}
    </AriaToggleButtonGroup>
  );
}

/** Tabs with its own `motion` (auto, reduce or none); see TabsBody for the component itself. */
export function Tabs({ motion, ...props }: TabsProps & WithMotion) {
  return (
    <MotionScope motion={motion}>
      <TabsBody {...(props as TabsProps)} />
    </MotionScope>
  );
}
