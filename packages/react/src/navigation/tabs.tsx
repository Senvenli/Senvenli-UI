"use client";

import * as React from "react";
import {
  Tab,
  TabList,
  TabPanel,
  Tabs as AriaTabs,
  ToggleButton as AriaToggleButton,
  ToggleButtonGroup as AriaToggleButtonGroup,
  type Key,
} from "react-aria-components";

import { cn } from "../utils";
import { Badge } from "../display/badge";

export type TabItem = {
  id: Key;
  /** A noun, one or two words ("Orders"). */
  label: string;
  /** A count after the label (a Badge), e.g. open damage records. */
  count?: number;
  panel: React.ReactNode;
};

export type TabsProps = {
  /** Two to six tabs. */
  items: readonly TabItem[];
  selectedKey?: Key;
  defaultSelectedKey?: Key;
  onSelectionChange?: (key: Key) => void;
  /** Names the tab list when no heading above it does. */
  "aria-label"?: string;
};

const TAB =
  "relative inline-flex h-10 shrink-0 cursor-default items-center gap-ds-075 rounded-ds-small text-body font-[500] whitespace-nowrap text-ds-text-subtle outline-hidden " +
  "transition-colors duration-(--ds-duration-fast) motion-reduce:transition-none " +
  "data-[hovered]:text-ds-text data-[selected]:text-ds-text " +
  // The selected tab carries a 2px underline, so it never relies on colour alone.
  "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-t-ds-small after:bg-transparent data-[selected]:after:bg-ds-border-selected " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused data-[disabled]:text-ds-text-disabled";

/**
 * Switches between views of the same object without leaving the page. Arrow keys (mirrored in RTL),
 * Home and End move between tabs; the selected tab holds focus. Every panel stays mounted, so its state
 * (a scroll position, a half-filled filter) survives switching. On a narrow screen the row scrolls
 * sideways and the selected tab scrolls into view.
 */
export function Tabs({ items, selectedKey, defaultSelectedKey, onSelectionChange, "aria-label": label }: TabsProps) {
  const list = React.useRef<HTMLDivElement>(null);
  const [own, setOwn] = React.useState<Key | undefined>(defaultSelectedKey ?? items[0]?.id);
  const current = selectedKey ?? own;
  React.useEffect(() => {
    // Bring the selected tab into the row's view by scrolling the row alone, never the page (scrollIntoView
    // would scroll every ancestor, the window included). Rect deltas work the same in RTL.
    const row = list.current;
    const tab = row?.querySelector<HTMLElement>("[data-selected]");
    if (!row || !tab) return;
    const outer = row.getBoundingClientRect();
    const inner = tab.getBoundingClientRect();
    if (inner.left < outer.left) row.scrollLeft -= outer.left - inner.left;
    else if (inner.right > outer.right) row.scrollLeft += inner.right - outer.right;
  }, [current]);
  return (
    <AriaTabs
      selectedKey={current}
      onSelectionChange={(key) => {
        if (selectedKey === undefined) setOwn(key);
        onSelectionChange?.(key);
      }}
      data-slot="tabs"
      className="flex flex-col gap-ds-200"
    >
      <TabList
        ref={list}
        aria-label={label}
        data-slot="tabs-list"
        className="flex gap-ds-300 overflow-x-auto border-b border-ds-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <Tab key={item.id} id={item.id} data-slot="tab" className={TAB}>
            {item.label}
            {item.count !== undefined && item.count > 0 && (
              <span data-slot="tab-count" className="flex">
                <Badge variant="count" value={item.count} />
              </span>
            )}
          </Tab>
        ))}
      </TabList>
      {items.map((item) => (
        <TabPanel
          key={item.id}
          id={item.id}
          shouldForceMount
          data-slot="tab-panel"
          className="outline-hidden data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused data-[inert]:hidden [&[inert]]:hidden"
        >
          {item.panel}
        </TabPanel>
      ))}
    </AriaTabs>
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

const SEGMENT =
  "inline-flex h-7 cursor-default items-center rounded-ds-small px-ds-150 text-body font-[500] whitespace-nowrap text-ds-text-subtle outline-hidden " +
  "transition-[background-color,color,box-shadow] duration-(--ds-duration-fast) motion-reduce:transition-none " +
  "data-[hovered]:text-ds-text " +
  // The selected segment lifts (surface and shadow), not only recolours.
  "data-[selected]:bg-ds-background-segment-selected data-[selected]:text-ds-text data-[selected]:shadow-ds-raised " +
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
      className={cn("inline-flex w-fit max-w-full self-start gap-0.5 overflow-x-auto rounded-ds-medium bg-ds-background-neutral p-0.5", "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden")}
    >
      {items.map((item) => (
        <AriaToggleButton key={item.id} id={item.id} data-slot="segment" className={SEGMENT}>
          {item.label}
        </AriaToggleButton>
      ))}
    </AriaToggleButtonGroup>
  );
}
