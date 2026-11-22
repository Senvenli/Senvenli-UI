"use client";

import * as React from "react";

import { cn } from "../utils";
import { IconGlyph, type IconName } from "../display/icon";

export type StateSize = "small" | "medium";

const FRAME: Record<StateSize, string> = {
  medium: "gap-ds-150 px-ds-300 py-ds-600",
  small: "gap-ds-100 px-ds-200 py-ds-300",
};
const GAP: Record<StateSize, string> = {
  medium: "gap-ds-150",
  small: "gap-ds-100",
};
const TITLE: Record<StateSize, string> = {
  medium: "text-heading-small",
  small: "text-body-strong",
};
const DESCRIPTION: Record<StateSize, string> = {
  medium: "text-body",
  small: "text-body-small",
};

/** 1 where the state is the whole page (a 404, a page-level error); 2–4 inside a page. */
export type StateHeadingLevel = 1 | 2 | 3 | 4;

type FrameProps = {
  slot: "empty-state";
  icon: IconName;
  isDanger?: boolean;
  size: StateSize;
  title: React.ReactNode;
  headingLevel?: StateHeadingLevel;
  description?: React.ReactNode;
  /** Extra message lines (the error code), inside the announced part. */
  details?: React.ReactNode;
  /** Announces the message (title, description, details) as an alert; the actions stay outside it. */
  announce?: boolean;
  children?: React.ReactNode;
};

/** The shared layout: icon tile, the message (title, one or two sentences), then the actions. */
function StateFrame({ slot, icon, isDanger, size, title, headingLevel, description, details, announce, children }: FrameProps) {
  const Title = headingLevel ? (`h${headingLevel}` as const) : "span";
  return (
    <div
      data-slot={slot}
      data-size={size}
      // 420px is the design's measure for the message; there is no size token for it.
      className={cn("mx-auto flex w-full max-w-[420px] flex-col items-center text-center text-ds-text", FRAME[size])}
    >
      <div
        data-slot={`${slot}-icon`}
        className={cn(
          // 24px glyph in the 48px tile; a descendant rule so it outranks the glyph’s own size class.
          "grid size-ds-600 shrink-0 place-items-center rounded-ds-xlarge [&_svg]:size-ds-300",
          isDanger ? "bg-ds-background-danger" : "bg-ds-surface-sunken",
        )}
      >
        <IconGlyph name={icon} color={isDanger ? "danger" : "subtle"} />
      </div>
      <div role={announce ? "alert" : undefined} data-slot={`${slot}-message`} className={cn("flex flex-col items-center", GAP[size])}>
        <Title data-slot={`${slot}-title`} className={cn("m-0", TITLE[size])}>{title}</Title>
        {description != null && (
          <p data-slot={`${slot}-description`} className={cn("m-0 text-ds-text-subtle", DESCRIPTION[size])}>{description}</p>
        )}
        {details}
      </div>
      {children}
    </div>
  );
}

export type EmptyStateProps = {
  /** One Lucide icon; no illustrations. */
  icon: IconName;
  /** First use: what will appear here. No results: repeat the query. Cleared: the calm confirmation. */
  title: React.ReactNode;
  /** Renders the title as a heading where the state is the page's main content; a plain line by default. */
  headingLevel?: StateHeadingLevel;
  /** How the content gets here, or the fix; one or two sentences. Never blame the user. */
  description?: React.ReactNode;
  /** The action that fills the view (`Button variant="primary"`), or "Clear filters" for no results. */
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  /** `compact` inside tables and cards. */
  size?: StateSize;
  /** `danger` for a load that failed or a page that is not allowed: the icon in the danger tone. */
  tone?: "neutral" | "danger";
  /** Extra lines inside the message, under the description: an error code and when it happened, for support. */
  details?: React.ReactNode;
  /**
   * Announce the message (title, description, details) as an alert; the actions stay outside it. For a state that
   * replaces content the user was waiting for (a failed load); not for a first-use or no-results state.
   */
  announce?: boolean;
};

/**
 * Explains why a view has no content, or why it could not be shown, and offers the action that changes that: first
 * use, no results, cleared, or (with `tone="danger"`) a load that failed and its retry. Use it instead of an empty
 * table with only headers.
 */
export function EmptyState({ icon, title, headingLevel, description, primaryAction, secondaryAction, size = "medium", tone = "neutral", details, announce }: EmptyStateProps) {
  return (
    <StateFrame
      slot="empty-state"
      icon={icon}
      isDanger={tone === "danger"}
      size={size}
      title={title}
      headingLevel={headingLevel}
      description={description}
      details={details}
      announce={announce}
    >
      {(primaryAction != null || secondaryAction != null) && (
        <div data-slot="empty-state-actions" className="flex flex-wrap items-center justify-center gap-ds-100">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </StateFrame>
  );
}
