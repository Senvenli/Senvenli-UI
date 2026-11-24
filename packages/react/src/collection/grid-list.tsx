"use client";

import * as React from "react";
import {
  Button as AriaButton,
  GridList as AriaGridList,
  GridListItem as AriaGridListItem,
  useDragAndDrop,
  type Key,
  type Selection,
} from "react-aria-components";

import { cn } from "../utils";
import { TouchTarget } from "../action/touch-target";
import { IconGlyph, type IconName } from "../display/icon";
import { SelectionCheckbox } from "./selection-checkbox";

export type GridTileContent = {
  /** The tile's name ("Front view"); also its text for typeahead and screen readers. */
  title: string;
  /** One line of context under the title ("1.9 MB"). */
  meta?: React.ReactNode;
  /** The 4:3 media area: an image or an icon. */
  media?: React.ReactNode;
  /**
   * The tile's own buttons (remove, earlier, later), in reading order at the bottom end of the media area.
   * Always shown, so they need no hover and work on touch (40px under a coarse pointer, hit at 44px
   * like a compact Button: `TouchTarget`). Tab moves
   * from the focused tile through its drag handle and actions, then out of the grid; the arrows still
   * move between tiles, and Enter or Space on an action presses it without opening or selecting the tile.
   */
  actions?: readonly GridTileAction[];
};

export type GridTileAction = {
  /** Unique within the tile ("remove"). */
  id: string;
  /**
   * The button's name for screen readers and voice control. Name the tile in it ("Remove photo: Front view"),
   * so each tile's button reads differently in a list of buttons.
   */
  label: string;
  icon: IconName;
  /** A remove action opens the app's confirm (AlertDialog); the tile does not open or toggle. */
  onPress: () => void;
  /** `danger` for a destructive action: the icon and its hover take the danger colours. */
  tone?: "danger";
  /** Earlier on the first tile, later on the last, or while a save runs. */
  isDisabled?: boolean;
};

export type TileGridProps<T> = {
  /** Names the grid ("Product photos"). */
  "aria-label": string;
  items: readonly T[];
  /** The item's stable id; `item.id` by default. */
  itemKey?: (item: T) => Key;
  renderItem: (item: T) => GridTileContent;
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: "all" | Iterable<Key>;
  defaultSelectedKeys?: "all" | Iterable<Key>;
  onSelectionChange?: (keys: Selection) => void;
  /** Enter, or a press, opens the tile. */
  onAction?: (key: Key) => void;
  /**
   * Reordering (photos): drag a tile, or focus its handle and use the keyboard. `onReorder` gets the moved
   * keys and the tile they go before or after.
   */
  dragAndDrop?: { onReorder: (keys: Set<Key>, target: { key: Key; position: "before" | "after" }) => void };
  /** Shown when there are no items: an `EmptyState` or a sentence. */
  emptyState?: React.ReactNode;
  /**
   * The grid element. Focusing it focuses the tile React Aria keeps as focused (the next one after a removed tile),
   * so it is the `returnFocusRef` for a confirm whose action removes the tile it was opened from.
   */
  ref?: React.Ref<HTMLDivElement>;
};

/**
 * A tile action: 28px, 40px under a coarse pointer, where its invisible `TouchTarget` (the compact Button's)
 * takes the hit area to 44px, 2px past each side. Side by side 4px apart (`gap-ds-050`), two neighbours' hit areas meet
 * in the middle of the gap and do not overlap, so no ButtonGroup-style trade-off is needed and none takes a tap on the
 * other's box. `relative` holds the target; the visible box is unchanged.
 */
const TILE_ACTION =
  "relative grid size-7 place-items-center rounded-ds-control-small bg-ds-surface-raised text-ds-text-subtle shadow-ds-raised outline-hidden cursor-pointer " +
  "pointer-coarse:size-10 data-[hovered]:bg-ds-surface-hovered data-[pressed]:bg-ds-surface-hovered " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  "data-[disabled]:cursor-not-allowed data-[disabled]:text-ds-text-disabled";
const TILE_ACTION_DANGER = "text-ds-icon-danger data-[hovered]:bg-ds-background-danger data-[pressed]:bg-ds-background-danger";

/**
 * Selectable tiles in a responsive grid (photos, documents, cards), with arrow keys in
 * both directions, Space to select and Enter to open. Tiles on `ds-surface-raised`, at least 150px
 * wide, a 4:3 media area on `ds-surface-sunken`; a checkbox at the top start when selection is on and a
 * 2px `ds-border-selected` ring on selected tiles.
 */
export function TileGrid<T extends object>({
  "aria-label": label,
  items,
  itemKey = (item) => (item as { id: Key }).id,
  renderItem,
  selectionMode = "none",
  selectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
  onAction,
  dragAndDrop,
  emptyState,
  ref,
}: TileGridProps<T>) {
  const onReorder = dragAndDrop?.onReorder;
  const entries = items.map((item) => ({ key: itemKey(item), item }));
  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((key) => ({ "text/plain": String(key) })),
    onReorder: (event) => onReorder?.(event.keys, { key: event.target.key, position: event.target.dropPosition === "before" ? "before" : "after" }),
  });
  return (
    <AriaGridList
      ref={ref}
      aria-label={label}
      layout="grid"
      items={entries}
      selectionMode={selectionMode}
      selectionBehavior="toggle"
      selectedKeys={selectedKeys}
      defaultSelectedKeys={defaultSelectedKeys}
      onSelectionChange={onSelectionChange}
      onAction={onAction}
      dragAndDropHooks={onReorder ? dragAndDropHooks : undefined}
      renderEmptyState={emptyState != null && emptyState !== false ? () => <div className="col-span-full py-ds-500 text-center text-body text-ds-text-subtle">{emptyState}</div> : undefined}
      data-slot="grid-list"
      className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-ds-200 outline-hidden"
    >
      {({ key, item }) => {
        const tile = renderItem(item);
        return (
          <AriaGridListItem
            id={key}
            textValue={tile.title}
            data-slot="grid-list-tile"
            className={cn(
              "group/tile relative flex flex-col overflow-hidden rounded-ds-large bg-ds-surface-raised shadow-ds-raised outline-hidden",
              (onAction || selectionMode !== "none") && "cursor-pointer data-[hovered]:bg-ds-surface-hovered",
              "data-[selected]:ring-2 data-[selected]:ring-ds-border-selected",
              // Focus is an inset ring (no outer ring); a selected tile also shows its checkbox, so the two never rely on color alone.
              "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused",
              "data-[dragging]:opacity-60 data-[drop-target]:ring-2 data-[drop-target]:ring-ds-border-focused",
            )}
          >
            {({ selectionMode: mode, allowsDragging }) => (
              <>
                <div data-slot="grid-list-media" className="grid aspect-[4/3] place-items-center overflow-hidden bg-ds-surface-sunken text-ds-text-subtle [&>img]:size-full [&>img]:object-cover">
                  {tile.media}
                </div>
                {mode !== "none" && (
                  <span className="absolute start-ds-100 top-ds-100 rounded-ds-small bg-ds-surface-raised p-ds-025">
                    <SelectionCheckbox />
                  </span>
                )}
                {allowsDragging && (
                  // No TouchTarget: React Aria sets `pointer-events: none` on a GridList's drag button, so
                  // a mouse or a finger never lands on it but on the tile under it, which is what drags; the handle is
                  // the keyboard's and assistive tech's way in. The touch target of a drag is the whole tile (150px+).
                  <AriaButton
                    slot="drag"
                    data-slot="grid-list-drag"
                    className="absolute end-ds-100 top-ds-100 grid size-7 place-items-center rounded-ds-control-small bg-ds-surface-raised text-ds-text-subtle outline-hidden data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused"
                  >
                    <IconGlyph name="grip-vertical" size="small" />
                  </AriaButton>
                )}
                {tile.actions?.length ? (
                  // Over the media area (the same 4:3 box), after the checkbox and the handle so Tab reaches them last.
                  <span className="pointer-events-none absolute inset-x-0 top-0 flex aspect-[4/3] items-end justify-end p-ds-100">
                    <span data-slot="grid-list-actions" className="pointer-events-auto flex gap-ds-050">
                      {tile.actions.map((action) => (
                        <AriaButton
                          key={action.id}
                          aria-label={action.label}
                          onPress={action.onPress}
                          isDisabled={action.isDisabled}
                          data-slot="grid-list-action"
                          data-action={action.id}
                          className={cn(TILE_ACTION, action.tone === "danger" && TILE_ACTION_DANGER)}
                        >
                          <IconGlyph name={action.icon} size="small" />
                          <TouchTarget />
                        </AriaButton>
                      ))}
                    </span>
                  </span>
                ) : null}
                <div className="flex min-w-0 flex-col items-start gap-ds-025 p-ds-150">
                  <bdi data-slot="grid-list-title" className="max-w-full truncate text-body-strong text-ds-text">{tile.title}</bdi>
                  {tile.meta && <bdi data-slot="grid-list-meta" className="max-w-full truncate text-body-small text-ds-text-subtle">{tile.meta}</bdi>}
                </div>
              </>
            )}
          </AriaGridListItem>
        );
      }}
    </AriaGridList>
  );
}
