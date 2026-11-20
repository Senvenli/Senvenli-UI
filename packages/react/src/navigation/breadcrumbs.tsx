"use client";

import * as React from "react";
import { Breadcrumb, Breadcrumbs as AriaBreadcrumbs, Link as AriaLink, useLocale } from "react-aria-components";

import { Button } from "../action/button";
import { IconGlyph } from "../display/icon";
import { locationLabel, showHiddenLevelsLabel } from "../i18n";
import { Menu } from "../overlay/floating";

export type BreadcrumbItem = {
  label: string;
  /** Every level but the last; the last item is the current page and is not a link. */
  href?: string;
};

export type BreadcrumbsProps = {
  /** From the section root ("Filo"), never "Ana sayfa", to the current page. */
  items: readonly BreadcrumbItem[];
  /** Names the navigation landmark; "Konum" by default. */
  "aria-label"?: string;
};

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
export function Breadcrumbs({ items, "aria-label": label }: BreadcrumbsProps) {
  const { locale } = useLocale();
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
            <Breadcrumb key={item ? `${index}-${item.label}` : "fold"} data-slot="breadcrumb" className="flex items-center gap-ds-050">
              {item === null && hidden.length === 0 ? (
                <span aria-hidden data-slot="breadcrumbs-fold" className="text-body text-ds-text-subtle">…</span>
              ) : item === null ? (
                <Menu
                  aria-label={showHiddenLevelsLabel(locale)}
                  placement="bottom start"
                  items={hidden.map((level, i) => ({ id: `level-${i}`, label: level.label, href: level.href }))}
                  trigger={
                    <Button variant="subtle" size="compact" iconOnly iconBefore="ellipsis" aria-label={showHiddenLevelsLabel(locale)} data-slot="breadcrumbs-fold" />
                  }
                />
              ) : last ? (
                <span aria-current="page" data-slot="breadcrumb-current" className="text-body font-[500] text-ds-text">
                  {item.label}
                </span>
              ) : (
                <AriaLink href={item.href} data-slot="breadcrumb-link" className={LINK}>
                  {item.label}
                </AriaLink>
              )}
              {!last && <Separator />}
            </Breadcrumb>
          );
        })}
      </AriaBreadcrumbs>
    </nav>
  );
}
