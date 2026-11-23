"use client";

import * as React from "react";
import { Breadcrumb as AriaBreadcrumb, Breadcrumbs as AriaBreadcrumbs, Link as AriaLink, useLocale } from "react-aria-components";

import { Button } from "../action/button";
import { IconGlyph, type IconName } from "../display/icon";
import { locationLabel, showHiddenLevelsLabel } from "../i18n";
import { Menu } from "../overlay/floating";

export type BreadcrumbItem = {
  label: string;
  /** Every level but the last; the last item is the current page and is not a link. */
  href?: string;
  /** A Lucide icon before the label (a folder, a home). */
  icon?: IconName;
};

export type BreadcrumbsProps = {
  /**
   * From the section root ("Projects"), never "Home", to the current page. Leave it out to compose `Breadcrumb`s
   * as children instead.
   */
  items?: readonly BreadcrumbItem[];
  /** With no `items`: `Breadcrumb`s from the root to the current page (the last one). */
  children?: React.ReactNode;
  /** Names the navigation landmark; "Location" by default. */
  "aria-label"?: string;
};

export type BreadcrumbProps = {
  /** A page; leave it out on the last one, the current page. */
  href?: string;
  icon?: IconName;
  /** The level's name. It may hold more than text; then give `textValue` for the folded "…" menu. */
  children: React.ReactNode;
  /** The words for the "…" menu when this level folds; the label itself when it is plain text. */
  textValue?: string;
};

/** One level of a Breadcrumbs composed from parts; the last one is the current page. */
export function Breadcrumb({ children }: BreadcrumbProps) {
  return <>{children}</>;
}

type Level = { label: React.ReactNode; text: string; href?: string; icon?: IconName };

function levelsOf(items: readonly BreadcrumbItem[] | undefined, children: React.ReactNode): Level[] {
  if (items) return items.map((item) => ({ label: item.label, text: item.label, href: item.href, icon: item.icon }));
  return React.Children.toArray(children)
    .filter((child): child is React.ReactElement<BreadcrumbProps> => React.isValidElement(child) && child.type === Breadcrumb)
    .map(({ props }) => ({
      label: props.children,
      text: props.textValue ?? (typeof props.children === "string" ? props.children : ""),
      href: props.href,
      icon: props.icon,
    }));
}

function Label({ level }: { level: Level }) {
  if (!level.icon) return <>{level.label}</>;
  return (
    <span className="inline-flex items-center gap-ds-050">
      <IconGlyph name={level.icon} size="small" data-slot="breadcrumb-icon" className="text-ds-icon-subtle" />
      {level.label}
    </span>
  );
}

const LINK =
  "rounded-ds-small text-body text-ds-text-subtle no-underline outline-hidden data-[hovered]:text-ds-text data-[hovered]:underline " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused";

function Separator() {
  return <IconGlyph name="chevron-right" data-slot="breadcrumbs-separator" className="size-3.5 text-ds-icon-subtle" />;
}

/**
 * The path from a section root to the current page, for detail pages two or more levels deep. With more
 * than four levels the middle ones fold into a "…" menu: the root, the parent and the page stay.
 */
export function Breadcrumbs({ items: itemsProp, children, "aria-label": label }: BreadcrumbsProps) {
  const { locale } = useLocale();
  const items = levelsOf(itemsProp, children);
  const folds = items.length > 4;
  // A folded level without a page to go to would be an inert menu item: leave it out.
  const hidden = folds ? items.slice(1, -2).filter((level) => level.href) : [];
  const shown = folds ? [items[0]!, null, ...items.slice(-2)] : [...items];
  return (
    <nav aria-label={label ?? locationLabel(locale)} data-slot="breadcrumbs">
      <AriaBreadcrumbs className="flex flex-wrap items-center gap-ds-050">
        {shown.map((item, index) => {
          const last = index === shown.length - 1;
          return (
            <AriaBreadcrumb key={item ? `${index}-${item.text}` : "fold"} data-slot="breadcrumb" className="flex items-center gap-ds-050">
              {item === null && hidden.length === 0 ? (
                <span aria-hidden data-slot="breadcrumbs-fold" className="text-body text-ds-text-subtle">…</span>
              ) : item === null ? (
                <Menu
                  aria-label={showHiddenLevelsLabel(locale)}
                  placement="bottom start"
                  items={hidden.map((level, i) => ({ id: `level-${i}`, label: level.text, href: level.href }))}
                  trigger={
                    <Button variant="subtle" size="small" iconOnly iconBefore="ellipsis" aria-label={showHiddenLevelsLabel(locale)} data-slot="breadcrumbs-fold" />
                  }
                />
              ) : last ? (
                <span aria-current="page" data-slot="breadcrumb-current" className="text-body font-[500] text-ds-text">
                  <Label level={item} />
                </span>
              ) : (
                <AriaLink href={item.href} data-slot="breadcrumb-link" className={LINK}>
                  <Label level={item} />
                </AriaLink>
              )}
              {!last && <Separator />}
            </AriaBreadcrumb>
          );
        })}
      </AriaBreadcrumbs>
    </nav>
  );
}
