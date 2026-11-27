"use client";

import * as React from "react";

import { cn } from "../utils";
import { Heading, Text } from "../display/typography";

export type PageProps = {
  children: React.ReactNode;
  /**
   * The content's widest: `default` 1200px for most panel pages, `narrow` 800px for a form or settings page that
   * reads as one column, `full` for wide tables and boards. Always centred; gutters included.
   */
  width?: "default" | "narrow" | "full";
};

const WIDTH = { default: "max-w-[1200px]", narrow: "max-w-[800px]", full: "max-w-none" } as const;

/**
 * A panel page's frame: its width, its gutters (16px, 24px from 768px) and its rhythm. Children (a
 * `PageHeader`, then `PageSection`s) sit 32px apart, so pages never set their own widths or gaps. Under a
 * `PageHeaderProvider` the header shows in the shell's bar and the first section starts the page.
 */
export function Page({ children, width = "default" }: PageProps) {
  return (
    <div
      data-slot="page"
      data-width={width}
      className={cn(
        "mx-auto flex w-full min-w-0 flex-col gap-ds-400 px-ds-200 py-ds-300 min-[768px]:px-ds-300",
        // The inline header's own bottom margin gives way to the page's gap.
        "[&>[data-slot=page-header-inline]]:mb-0",
        WIDTH[width],
      )}
    >
      {children}
    </div>
  );
}

export type PageSectionProps = {
  children: React.ReactNode;
  /** The section's name, an h2 ("Active customers"); leave it out for a section the page header already names. */
  title?: React.ReactNode;
  /** One line under the title. */
  description?: React.ReactNode;
  /** At the header's end: a link to everything, a small button, a filter. */
  actions?: React.ReactNode;
  /** An anchor for in-page links. */
  id?: string;
};

/**
 * One part of a `Page`: an optional header (title, description, actions) 16px above its content. A titled
 * section is a named region; sections sit 32px apart in the page.
 */
export function PageSection({ children, title, description, actions, id }: PageSectionProps) {
  const headingId = React.useId();
  const hasHeader = title != null || actions != null;
  return (
    <section id={id} data-slot="page-section" aria-labelledby={title != null ? headingId : undefined} className="flex min-w-0 flex-col gap-ds-200">
      {hasHeader && (
        <div data-slot="page-section-header" className="flex flex-col gap-ds-100 sm:flex-row sm:items-end sm:justify-between">
          {title != null && (
            <div className="flex min-w-0 flex-col gap-ds-025">
              <Heading level={2} size="heading-small" id={headingId}>{title}</Heading>
              {description != null && (
                <Text size="body-small" tone="subtle" elementType="p">{description}</Text>
              )}
            </div>
          )}
          {actions != null && <div data-slot="page-section-actions" className="flex shrink-0 flex-wrap items-center gap-ds-100">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
