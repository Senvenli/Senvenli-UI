"use client";

import * as React from "react";
import { useLocale } from "react-aria-components";

import { cn } from "../utils";
import { Button } from "../action/button";
import { IconGlyph, type IconName } from "../display/icon";
import { actionFailedLabel, errorCodeLabel, retryLabel } from "../i18n";

export type StateSize = "default" | "compact";

const FRAME: Record<StateSize, string> = {
  default: "gap-ds-150 px-ds-300 py-ds-600",
  compact: "gap-ds-100 px-ds-200 py-ds-300",
};
const GAP: Record<StateSize, string> = {
  default: "gap-ds-150",
  compact: "gap-ds-100",
};
const TITLE: Record<StateSize, string> = {
  default: "text-heading-small",
  compact: "text-body-strong",
};
const DESCRIPTION: Record<StateSize, string> = {
  default: "text-body",
  compact: "text-body-small",
};

/** 1 where the state is the whole page (a 404, a page-level error); 2–4 inside a page. */
export type StateHeadingLevel = 1 | 2 | 3 | 4;

type FrameProps = {
  slot: "empty-state" | "error-state";
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
};

/**
 * Explains why a view has no content and offers the action that changes that:
 * first use, no results, or cleared. Use it instead of an empty table with only
 * headers; for a load that failed, use ErrorState.
 */
export function EmptyState({ icon, title, headingLevel, description, primaryAction, secondaryAction, size = "default" }: EmptyStateProps) {
  return (
    <StateFrame slot="empty-state" icon={icon} size={size} title={title} headingLevel={headingLevel} description={description}>
      {(primaryAction != null || secondaryAction != null) && (
        <div data-slot="empty-state-actions" className="flex flex-wrap items-center justify-center gap-ds-100">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </StateFrame>
  );
}

export type ErrorStateKind = "load-failed" | "not-allowed" | "not-found";

const KIND_ICON: Record<ErrorStateKind, IconName> = {
  "load-failed": "cloud-off",
  "not-allowed": "lock",
  "not-found": "file-question",
};

type ErrorStateBase = {
  /** Load failed (cloud-off, retry) · not allowed (lock, who to ask) · not found (file-question, way back). */
  kind?: ErrorStateKind;
  /** What failed: "Reports could not be loaded". */
  title: React.ReactNode;
  /** Renders the title as a heading where the state replaces the page's main content. */
  headingLevel?: StateHeadingLevel;
  /** What the user can do. Required: never "Something went wrong" alone. */
  description: React.ReactNode;
  /** Shown as "Hata kodu: RPT-504" for support. */
  errorCode?: string;
  /** When it failed, shown next to the code in the user's locale. */
  occurredAt?: Date;
  /**
   * The time zone `occurredAt` is shown in ("Europe/Berlin"). Left out, the device's: then the server and the
   * browser can print different times, so a prerendered page passes one.
   */
  timeZone?: string;
  /** `compact` for an inline failure inside a card or table cell. */
  size?: StateSize;
  /**
   * Announce the message as an alert. Default: on for `load-failed` (it replaces content the
   * user was waiting for), off for `not-allowed` and `not-found`, which are usually the page itself.
   */
  announce?: boolean;
};

export type ErrorStateProps = ErrorStateBase &
  (
    | {
        /**
         * Runs the failed load again; the region keeps the user's filters and scroll. A promise
         * shows the button busy; if it rejects while this state stays on screen, a short
         * "did not work" line is shown and announced.
         */
        onRetry: () => unknown;
        /** Overrides the localized "Retry" label; the default stays localized. */
        retryLabel?: string;
        /**
         * Shows the retry busy and unpressable while a retry the caller runs itself is under way
         *, e.g. a query's `isFetching`. A promise from `onRetry` still does this on its own.
         */
        isRetryPending?: boolean;
        action?: never;
      }
    | {
        onRetry?: never;
        retryLabel?: never;
        isRetryPending?: never;
        /**
         * The one way forward when retrying will not help ("Back to dashboard", who to ask).
         * A `load-failed` state without `onRetry` should still offer a way out here.
         */
        action: React.ReactNode;
      }
  );

/**
 * Replaces the smallest region that failed to load or is not allowed, keeps the
 * page chrome around it, and gives one way forward: a retry or one action.
 */
export function ErrorState({
  kind = "load-failed", title, headingLevel, description, errorCode, occurredAt, timeZone, size = "default", announce, onRetry, action,
  retryLabel: retryLabelOverride, isRetryPending = false,
}: ErrorStateProps) {
  const { locale } = useLocale();
  const formatter = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone });
    } catch {
      // An unknown zone is not a reason to lose the message: the device's zone instead.
      return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
    }
  }, [locale, timeZone]);
  const [isPending, setPending] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const pending = React.useRef(false);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const retry = async () => {
    // One retry at a time, whatever the button's own state.
    if (!onRetry || pending.current || isRetryPending) return;
    pending.current = true;
    setPending(true);
    setFailed(false);
    try {
      await onRetry();
    } catch {
      // Nothing escapes unhandled; if this state stays on screen, say the retry failed.
      if (mounted.current) setFailed(true);
    } finally {
      pending.current = false;
      if (mounted.current) setPending(false);
    }
  };

  // Codes and timestamps are isolated so an RTL page does not reorder their digits and dashes.
  const [before, after = ""] = errorCodeLabel(locale).split("{code}");
  const parts: React.ReactNode[] = [];
  if (errorCode !== undefined) {
    parts.push(<React.Fragment key="code">{before}<bdi data-slot="error-state-code-value">{errorCode}</bdi>{after}</React.Fragment>);
  }
  if (occurredAt) parts.push(<bdi key="time" data-slot="error-state-time">{formatter.format(occurredAt)}</bdi>);

  return (
    <StateFrame
      slot="error-state"
      icon={KIND_ICON[kind]}
      isDanger
      size={size}
      title={title}
      headingLevel={headingLevel}
      description={description}
      announce={announce ?? kind === "load-failed"}
      details={parts.length > 0 && (
        <span data-slot="error-state-code" className="font-ds-mono text-body-small text-ds-text-subtlest">
          {parts.map((part, index) => (
            <React.Fragment key={index}>{index > 0 && " · "}{part}</React.Fragment>
          ))}
        </span>
      )}
    >
      {onRetry ? (
        <>
          <Button data-slot="error-state-retry" size={size === "compact" ? "compact" : "default"} iconBefore="rotate-cw" isPending={isPending || isRetryPending} onPress={() => void retry()}>
            {retryLabelOverride ?? retryLabel(locale)}
          </Button>
          {/* Always mounted so a failed retry is announced; while empty it leaves the flex flow. */}
          <span role="status" data-slot="error-state-retry-status" className="text-body-small text-ds-text-danger empty:absolute">
            {failed ? actionFailedLabel(locale) : null}
          </span>
        </>
      ) : (
        <div data-slot="error-state-action">{action}</div>
      )}
    </StateFrame>
  );
}
