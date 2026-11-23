"use client";

import * as React from "react";

import { StackList, type StackListProps } from "./list";
import { TileGrid, type TileGridProps } from "./grid-list";

/** `layout="stack"` (default): rows with a leading visual, a title, a description and trailing status. */
export type GridListStackProps<T = never> = StackListProps<T> & { layout?: "stack" };

/** `layout="grid"`: selectable tiles in a responsive grid, with tile actions and drag reordering. */
export type GridListGridProps<T extends object> = TileGridProps<T> & { layout: "grid" };

export type GridListProps<T extends object = never> = GridListStackProps<T> | GridListGridProps<T>;

/**
 * A list people move through with arrow keys and select from, as React Aria's GridList: `layout="stack"` (default)
 * for rows (people, deliveries, a conversation list), `layout="grid"` for tiles (photos, documents). Rows take
 * `GridListItem` and `GridListSection` children or `items` with `renderItem`; tiles take `items` with `renderItem`.
 */
export function GridList<T extends object = never>(props: GridListProps<T>) {
  if (props.layout === "grid") {
    const { layout: _layout, ...grid } = props;
    return <TileGrid {...(grid as TileGridProps<T>)} />;
  }
  const { layout: _layout, ...stack } = props as GridListStackProps<T>;
  return <StackList {...(stack as StackListProps<T>)} />;
}
