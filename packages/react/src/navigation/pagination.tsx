"use client";

import * as React from "react";
import { Button as AriaButton, useLocale } from "react-aria-components";

import { cn } from "../utils";
import { Button } from "../action/button";
import { IconGlyph } from "../display/icon";
import { intlLocale, nextPageLabel, pageLabel, pageOfLabel, pagesLabel, perPageLabel, previousPageLabel, rangeOfLabel } from "../i18n";
import { Menu } from "../overlay/floating";

export type PaginationProps = {
  /** 1-based. Keep it in the URL so back and refresh return to it. */
  page: number;
  pageSize: number;
  /** All items across pages. */
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  /** 20, 50 and 100 by default; the current size joins the list when it is not in it. */
  pageSizeOptions?: readonly number[];
  /**
   * The range sentence naming the items: (41, 60, 1204) → "41–60 of 1,204 orders". It gets the
   * raw numbers; format them for the locale yourself (Intl.NumberFormat).
   */
  formatRange?: (from: number, to: number, total: number) => string;
};

/** First, last, the current page and one neighbour each side; gaps of two or more become "…". */
export function pageWindow(page: number, pages: number): (number | "gap")[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    const previous = sorted[i - 1];
    if (previous !== undefined && n - previous === 2) out.push(previous + 1);
    else if (previous !== undefined && n - previous > 2) out.push("gap");
    out.push(n);
  });
  return out;
}

const PAGE =
  "grid h-8 min-w-8 cursor-default place-items-center rounded-ds-control-medium px-ds-075 text-body tabular-nums text-ds-text outline-hidden " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[pressed]:bg-ds-background-neutral-pressed " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  // The current page: a soft neutral fill, the full text color and weight (not colour alone); no rim.
  "aria-[current=page]:bg-ds-background-neutral-hovered aria-[current=page]:font-medium aria-[current=page]:text-ds-text";

/**
 * Moves through a long, server-paged list and says where the reader is: the range, the pages (first,
 * last, the current one and its neighbours) and the page size. On phones only previous and next stay,
 * with "Sayfa 3 / 61". For feeds and timelines, load more on scroll instead.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
  formatRange,
}: PaginationProps) {
  const { locale } = useLocale();
  const number = new Intl.NumberFormat(intlLocale(locale));
  const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const current = Math.min(Math.max(1, page), pages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(total, current * pageSize);
  // A size the options do not list (a saved 25) joins them, so the control never shows nothing.
  const sizes = [...new Set([...pageSizeOptions, pageSize])].sort((a, b) => a - b);
  // An empty list has no range to state ("0–0 of 0" says nothing); the list's own empty state speaks.
  const range = total === 0 ? "" : formatRange ? formatRange(from, to, total) : rangeOfLabel(locale, from, to, total);
  // Previous points to the inline start: left in LTR, right in RTL. The chevron is named for LTR and IconGlyph
  // mirrors it on an RTL page, so it is never flipped twice.
  const step = (label: string, toward: "previous" | "next", target: number) => (
    <Button
      variant="subtle"
      size="small"
      iconOnly
      iconBefore={toward === "previous" ? "chevron-left" : "chevron-right"}
      aria-label={label}
      isDisabled={target < 1 || target > pages}
      onPress={() => onPageChange(target)}
      data-slot={`pagination-${toward}`}
    />
  );
  return (
    <div data-slot="pagination" className="flex flex-wrap items-center justify-between gap-ds-200">
      <span data-slot="pagination-range" aria-live="polite" className="text-body-small tabular-nums text-ds-text-subtle">
        {range}
      </span>
      <nav aria-label={pagesLabel(locale)} data-slot="pagination-pages" className="flex items-center gap-ds-050">
        {step(previousPageLabel(locale), "previous", current - 1)}
        <ul className="hidden items-center gap-ds-050 sm:flex">
          {pageWindow(current, pages).map((entry, index) =>
            entry === "gap" ? (
              <li key={`gap-${index}`} aria-hidden data-slot="pagination-gap" className="grid h-8 min-w-8 place-items-center text-body text-ds-text-disabled">
                …
              </li>
            ) : (
              <li key={entry}>
                <AriaButton
                  data-slot="pagination-page"
                  aria-label={pageLabel(locale, entry)}
                  aria-current={entry === current ? "page" : undefined}
                  onPress={() => entry !== current && onPageChange(entry)}
                  className={PAGE}
                >
                  {number.format(entry)}
                </AriaButton>
              </li>
            ),
          )}
        </ul>
        <span data-slot="pagination-compact" className="px-ds-100 text-body-small tabular-nums text-ds-text-subtle sm:hidden">
          {pageOfLabel(locale, current, pages)}
        </span>
        {step(nextPageLabel(locale), "next", current + 1)}
      </nav>
      {onPageSizeChange && (
        <div data-slot="pagination-size" className={cn("flex items-center gap-ds-100")}>
          <span aria-hidden className="text-body-small text-ds-text-subtle">{perPageLabel(locale)}</span>
          <Menu
            aria-label={perPageLabel(locale)}
            selectionMode="single"
            selectedKeys={[String(pageSize)]}
            onAction={(key) => onPageSizeChange(Number(key))}
            items={sizes.map((size) => ({ id: String(size), label: number.format(size) }))}
            trigger={
              <Button variant="default" size="small" iconAfter="chevron-down" aria-label={`${perPageLabel(locale)}: ${number.format(pageSize)}`}>
                <span className="tabular-nums">{number.format(pageSize)}</span>
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
