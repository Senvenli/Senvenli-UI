"use client";

import * as React from "react";
import { Link as AriaLink } from "react-aria-components";

import { cn } from "../utils";
import { BrandLinkContext } from "./brand-link-context";
import { Link } from "../action/link";

export type FooterLink = {
  /** Names the destination ("Privacy policy"), never "Click here". */
  label: string;
  href: string;
  /** Another site: opens in a new tab with the 12px `arrow-up-right`. */
  isExternal?: boolean;
};

export type FooterColumn = {
  /** The column's title ("Product"); it also names the column's navigation. */
  title: string;
  /** At most six. */
  links: readonly FooterLink[];
};

export type FooterProps = {
  /** The logo and wordmark (the site's logo and name). It links to `brandHref`. */
  brand: React.ReactNode;
  /** Where the brand goes: the home page. */
  brandHref?: string;
  /** The brand link's name when the brand alone does not say where it goes ("Acme home"). */
  brandLabel?: string;
  /** One line about the product, under the brand. */
  about?: React.ReactNode;
  /** A contact link under the about line (a subtle `Link` to the support address). */
  contact?: React.ReactNode;
  /** Two to four columns of links. */
  columns: readonly FooterColumn[];
  /** The copyright line ("© 2026 Acme"); a platform credit can go here too. */
  legal: React.ReactNode;
  /** The language switch at the end of the legal row (a subtle compact Button or Menu). */
  languageSwitch?: React.ReactNode;
  /** The column titles' heading level: 2 by default, a level below the page's h1. */
  headingLevel?: 2 | 3 | 4;
};

const MAX_COLUMNS = 4;
const MAX_LINKS = 6;

/** From 48rem: the brand block, then one track per column (static classes: no inline style to strip). */
const GRID: Record<number, string> = {
  0: "",
  1: "@min-[48rem]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]",
  2: "@min-[48rem]:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,1fr))]",
  3: "@min-[48rem]:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]",
  4: "@min-[48rem]:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]",
};

/**
 * Closes every public page: the brand block, two to four
 * columns of subtle links, and the legal row with the copyright and the language switch. It holds no
 * primary action; the page's one primary action lives in the Navbar and the CTA band. Narrower than
 * 48rem (a phone) everything stacks in one column; it measures its own width, not the viewport's.
 * Render it at the page root, outside `main`, `section` and `article`: only there is it the page's
 * `contentinfo` landmark.
 */
export function Footer({ brand, brandHref = "/", brandLabel, about, contact, columns, legal, languageSwitch, headingLevel = 2 }: FooterProps) {
  const Title = `h${headingLevel}` as const;
  const id = React.useId();
  const tooMany = columns.length > MAX_COLUMNS || columns.some((column) => column.links.length > MAX_LINKS);
  // Once, not on every render, nor twice under StrictMode's re-run of effects.
  const warned = React.useRef(false);
  React.useEffect(() => {
    if (!tooMany || warned.current) return;
    warned.current = true;
    console.warn(`Footer: at most ${MAX_COLUMNS} columns of at most ${MAX_LINKS} links each.`);
  }, [tooMany]);
  return (
    <footer data-slot="footer" className="@container border-t border-ds-border bg-ds-surface-sunken text-ds-text">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-ds-500 px-ds-200 pt-ds-500 pb-ds-200 @min-[48rem]:px-ds-300 @min-[48rem]:pt-ds-600 @min-[48rem]:pb-ds-300">
        <div
          data-slot="footer-top"
          className={cn("grid grid-cols-1 gap-ds-400 @min-[48rem]:gap-ds-300", GRID[Math.min(columns.length, MAX_COLUMNS)])}
        >
          <div data-slot="footer-brand" className="flex flex-col items-start gap-ds-100">
            <AriaLink
              href={brandHref}
              aria-label={brandLabel}
              data-slot="footer-brand-link"
              className="flex min-w-0 items-center gap-ds-100 rounded-ds-medium text-body-strong text-ds-text outline-hidden data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused"
            >
              <BrandLinkContext.Provider value>{brand}</BrandLinkContext.Provider>
            </AriaLink>
            {about && <p className="m-0 max-w-[36ch] text-body text-ds-text-subtle">{about}</p>}
            {contact && <div data-slot="footer-contact" className="text-body">{contact}</div>}
          </div>
          {columns.map((column, index) => {
            const titleId = `${id}-column-${index}`;
            return (
              <nav key={`${index}-${column.title}`} aria-labelledby={titleId} data-slot="footer-column" className="flex flex-col gap-ds-150">
                <Title id={titleId} className="m-0 heading-xxsmall text-ds-text">
                  {column.title}
                </Title>
                <ul className="m-0 flex list-none flex-col gap-ds-100 p-0">
                  {column.links.map((link, linkIndex) => (
                    <li key={`${linkIndex}-${link.href}`} className="text-body">
                      <Link href={link.href} variant="subtle" isExternal={link.isExternal}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            );
          })}
        </div>
        <div
          data-slot="footer-legal"
          className="flex flex-wrap items-center justify-between gap-x-ds-300 gap-y-ds-100 border-t border-ds-border pt-ds-200"
        >
          <div className="text-body-small text-ds-text-subtlest">{legal}</div>
          {languageSwitch && <div data-slot="footer-language" className="ms-auto">{languageSwitch}</div>}
        </div>
      </div>
    </footer>
  );
}
