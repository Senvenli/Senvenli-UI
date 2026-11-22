"use client";

import * as React from "react";
import { Button as AriaButton, Tree as AriaTree, TreeItem, TreeItemContent, type Key, type Selection } from "react-aria-components";

import { cn } from "../utils";
import { IconGlyph, type IconName } from "../display/icon";

export type TreeNode = {
  id: Key;
  label: string;
  icon?: IconName;
  /** Nested items; a node with children can be expanded. */
  children?: readonly TreeNode[];
  isDisabled?: boolean;
};

export type TreeProps = {
  /** Names the tree for screen readers ("Files", "Categories"). */
  "aria-label": string;
  items: readonly TreeNode[];
  /** `none` (default) for navigation with `onAction`, `single` or `multiple` to pick nodes. */
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: Iterable<Key>;
  defaultSelectedKeys?: Iterable<Key>;
  onSelectionChange?: (keys: Selection) => void;
  expandedKeys?: Iterable<Key>;
  defaultExpandedKeys?: Iterable<Key>;
  onExpandedChange?: (keys: Set<Key>) => void;
  /** What pressing a node does (open the file, go to the category). */
  onAction?: (key: Key) => void;
};

const ROW =
  "group relative flex min-h-8 cursor-default items-center gap-ds-075 rounded-ds-small pe-ds-100 text-body text-ds-text outline-hidden select-none " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[selected]:bg-ds-background-selected " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused data-[disabled]:text-ds-text-disabled";

function Node({ node }: { node: TreeNode }) {
  return (
    <TreeItem id={node.id} textValue={node.label} isDisabled={node.isDisabled} data-slot="tree-item" className={ROW}>
      <TreeItemContent>
        {({ hasChildItems, isExpanded, level }) => (
          // Each level steps in by 20px (logical padding, so RTL steps the other way).
          <span className="flex min-w-0 flex-1 items-center gap-ds-075" style={{ paddingInlineStart: `calc(${level - 1} * 20px + 4px)` }}>
            {hasChildItems ? (
              <AriaButton slot="chevron" data-slot="tree-chevron" className="grid size-6 shrink-0 place-items-center rounded-ds-small text-ds-icon-subtle outline-hidden data-[hovered]:bg-ds-background-neutral-hovered">
                {/* Points the reading way when closed (left in RTL), down when open. */}
                <IconGlyph
                  name="chevron-right"
                  className={cn("transition-transform duration-(--ds-duration-fast) motion-reduce:transition-none", isExpanded ? "rotate-90" : "rtl:rotate-180")}
                />
              </AriaButton>
            ) : (
              <span className="size-6 shrink-0" aria-hidden />
            )}
            {node.icon && <IconGlyph name={node.icon} color="subtle" />}
            <span className="truncate">{node.label}</span>
          </span>
        )}
      </TreeItemContent>
      {node.children?.map((child) => <Node key={child.id} node={child} />)}
    </TreeItem>
  );
}

/**
 * A hierarchy to browse: folders and files, categories. Arrow keys move, Right opens and Left closes a node, Home
 * and End jump; the chevron and Enter expand. For a flat list use List; for nested navigation pages, Sidebar.
 */
export function Tree({ "aria-label": ariaLabel, items, selectionMode = "none", selectedKeys, defaultSelectedKeys, onSelectionChange, expandedKeys, defaultExpandedKeys, onExpandedChange, onAction }: TreeProps) {
  return (
    <AriaTree
      aria-label={ariaLabel}
      selectionMode={selectionMode}
      selectedKeys={selectedKeys}
      defaultSelectedKeys={defaultSelectedKeys}
      onSelectionChange={onSelectionChange}
      expandedKeys={expandedKeys}
      defaultExpandedKeys={defaultExpandedKeys}
      onExpandedChange={onExpandedChange}
      onAction={onAction}
      data-slot="tree"
      className="flex flex-col gap-ds-025 outline-hidden"
    >
      {items.map((node) => (
        <Node key={node.id} node={node} />
      ))}
    </AriaTree>
  );
}
