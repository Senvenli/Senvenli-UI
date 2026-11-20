"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { Button } from "../action/button";
import { Heading, Text } from "../display/typography";
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";

type Slots = {
  titleNode: HTMLElement | null;
  actionsNode: HTMLElement | null;
  setTitleNode: (node: HTMLElement | null) => void;
  setActionsNode: (node: HTMLElement | null) => void;
};

const PanelHeaderContext = React.createContext<Slots | null>(null);

/**
 * Owns the bar's two regions. It sits above both the bar and the page, because the shell renders them as
 * siblings: the bar outside the scrolling box (so content never runs under it) and the page inside it.
 */
export function PanelHeaderProvider({ children }: { children: React.ReactNode }) {
  const [titleNode, setTitleNode] = React.useState<HTMLElement | null>(null);
  const [actionsNode, setActionsNode] = React.useState<HTMLElement | null>(null);
  const value = React.useMemo(() => ({ titleNode, actionsNode, setTitleNode, setActionsNode }), [titleNode, actionsNode]);
  return <PanelHeaderContext.Provider value={value}>{children}</PanelHeaderContext.Provider>;
}

export type PanelHeaderBarProps = {
  /** The menu button's name ("Open menu"); it opens the Sidebar, which is a panel under 1024px. */
  menuLabel: string;
  onMenuPress: () => void;
};

/**
 * The panel's top bar (admin apps): the menu button under 1024px, then the page's title and its
 * actions, which the page passes through `PanelHeader`. The shell renders it outside the box that scrolls.
 * Below 640px the actions take their own row, so a search field and a primary button never squeeze the title.
 */
export function PanelHeaderBar({ menuLabel, onMenuPress }: PanelHeaderBarProps) {
  const slots = React.useContext(PanelHeaderContext);
  return (
    <header
      data-slot="panel-header-bar"
      className="flex shrink-0 flex-col gap-ds-100 border-b border-ds-border bg-ds-surface px-ds-200 py-ds-100 sm:min-h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-ds-150 sm:px-ds-400"
    >
      <div className="flex min-w-0 flex-1 items-center gap-ds-150">
        <span data-slot="panel-header-menu" className="flex lg:hidden">
          <Button variant="subtle" iconOnly iconBefore="menu" aria-label={menuLabel} onPress={onMenuPress} />
        </span>
        <div ref={slots?.setTitleNode} data-slot="panel-header-title" className="min-w-0 flex-1" />
      </div>
      {/* Hidden while empty, so a page without actions pays no gap for them. */}
      <div
        ref={slots?.setActionsNode}
        data-slot="panel-header-actions"
        className="flex shrink-0 flex-wrap items-center gap-ds-100 empty:hidden sm:flex-nowrap sm:justify-end"
      />
    </header>
  );
}

export type PanelHeaderProps = {
  /** The page's name; the page's one h1. */
  title: React.ReactNode;
  /** One line under the title. */
  description?: React.ReactNode;
  /** Where the page sits, above the title (a detail page under its list). */
  breadcrumbs?: readonly BreadcrumbItem[];
  /** The page's actions: filters, a search field, one primary button. */
  actions?: React.ReactNode;
};

function TitleBlock({ title, description, breadcrumbs }: Omit<PanelHeaderProps, "actions">) {
  return (
    <div data-slot="panel-header-text" className="flex min-w-0 flex-col gap-ds-025">
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <Heading level={1} size="heading-medium">{title}</Heading>
      {description != null && (
        <Text size="body-small" tone="subtle" elementType="p">{description}</Text>
      )}
    </div>
  );
}

/**
 * A panel page's header: the page says what it is and what it can do, and the
 * shell's `PanelHeaderBar` shows it, outside the scrolling content. Outside a `PanelHeaderProvider` (a page
 * rendered on its own, a test), it renders in place, so such a page keeps its title. A provider must always
 * render a bar.
 */
export function PanelHeader({ title, description, breadcrumbs, actions }: PanelHeaderProps) {
  const slots = React.useContext(PanelHeaderContext);
  const text = <TitleBlock title={title} description={description} breadcrumbs={breadcrumbs} />;
  if (slots?.titleNode) {
    return (
      <>
        {createPortal(text, slots.titleNode)}
        {actions != null && slots.actionsNode && createPortal(actions, slots.actionsNode)}
      </>
    );
  }
  // Under a provider the header belongs in the bar: on the first commit the bar's regions are not set yet and
  // they arrive in the same layout pass, so nothing paints without it. A provider must always render a
  // PanelHeaderBar; without one the header shows nowhere, as with the old slots.
  if (slots) return null;
  return (
    <div data-slot="panel-header-inline" className="mb-ds-300 flex flex-col gap-ds-150 sm:flex-row sm:items-center sm:justify-between">
      {text}
      {actions != null && <div data-slot="panel-header-inline-actions" className="flex shrink-0 flex-wrap items-center gap-ds-100">{actions}</div>}
    </div>
  );
}
