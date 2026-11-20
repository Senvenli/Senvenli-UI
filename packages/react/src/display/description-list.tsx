"use client";

import * as React from "react";
import { useLocale } from "react-aria-components";

import { cn } from "../utils";
import { Button } from "../action/button";
import { copiedLabel, copyFailedLabel, copyValueLabel, notSetLabel } from "../i18n";

export type DescriptionListItem = {
  /** Stable key; defaults to the label when it is a string. */
  id?: string;
  label: string;
  /** null, undefined or "" shows "—" (said as "Not set"), never a blank. */
  value?: React.ReactNode;
  /** A trailing action for this field ("Edit"). */
  action?: React.ReactNode;
  /** Text a user may copy (an ID, a reference): adds an inline copy button. */
  copyValue?: string;
};

export type DescriptionListProps = {
  items: DescriptionListItem[];
  /** `rows` (label beside value, rules between) for detail pages and side panels; `stacked` for summaries and cards. */
  layout?: "rows" | "stacked";
  /** Columns for `stacked`; default fills 150px+ columns. */
  columns?: 2 | 3 | 4;
};

const STACKED_COLUMNS = {
  auto: "@min-[480px]:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]",
  2: "@min-[480px]:grid-cols-2",
  3: "@min-[480px]:grid-cols-3",
  4: "@min-[480px]:grid-cols-4",
} as const;

function CopyButton({ text, label }: { text: string; label: string }) {
  const { locale } = useLocale();
  // Each press gets its own result, so pressing again re-announces even when the words are the same.
  const [result, setResult] = React.useState<{ ok: boolean; press: number } | null>(null);
  React.useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => setResult(null), 2000);
    return () => window.clearTimeout(timer);
  }, [result]);
  const message = result ? (result.ok ? copiedLabel(locale) : copyFailedLabel(locale)) : "";
  return (
    <>
      <span
        data-slot="description-list-copy-control"
        // Shown on hover or keyboard focus of the field; always on touch screens, which have no hover.
        className="opacity-0 transition-opacity group-hover/field:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100 data-[result]:opacity-100"
        data-result={result ? (result.ok ? "copied" : "failed") : undefined}
      >
        <Button
          variant="subtle"
          size="compact"
          iconOnly
          iconBefore={result ? (result.ok ? "check" : "x") : "copy"}
          aria-label={copyValueLabel(locale, label)}
          data-slot="description-list-copy"
          onPress={async () => {
            const press = (result?.press ?? 0) + 1;
            try {
              await navigator.clipboard.writeText(text);
              setResult({ ok: true, press });
            } catch {
              // No permission, an insecure context or no clipboard API at all: say so.
              setResult({ ok: false, press });
            }
          }}
        />
      </span>
      <span role="status" data-slot="description-list-copied" className="sr-only">
        {message}
        {/* An invisible change per press makes screen readers read the same words again. */}
        {result && result.press % 2 === 0 ? "\u200b" : ""}
      </span>
    </>
  );
}

const isEmpty = (value: React.ReactNode) => value === null || value === undefined || value === "";

/**
 * The fields of one record as label–value pairs on <dl>/<dt>/<dd>. Rows
 * collapse to stacked below 480px of container width. Values line up their
 * figures (tabular).
 */
export function DescriptionList({ items, layout = "rows", columns }: DescriptionListProps) {
  const { locale } = useLocale();
  const rows = layout === "rows";
  return (
    <div data-slot="description-list-container" className="@container w-full">
      <dl
        data-slot="description-list"
        data-layout={layout}
        className={cn(
          "m-0 grid text-body text-ds-text",
          rows ? "grid-cols-1 @min-[480px]:grid-cols-[minmax(120px,180px)_1fr] @min-[480px]:gap-x-ds-200" : cn("grid-cols-1 gap-ds-200", STACKED_COLUMNS[columns ?? "auto"]),
        )}
      >
        {items.map((item, index) => (
          <div
            key={item.id ?? `${index}-${item.label}`}
            data-slot="description-list-item"
            className={cn(
              "group/field min-w-0",
              rows
                // A rule between rows, not above the first; the label sits on the value's first baseline.
                ? "flex flex-col gap-ds-025 border-t border-ds-border py-ds-100 first:border-t-0 @min-[480px]:col-span-2 @min-[480px]:grid @min-[480px]:grid-cols-subgrid @min-[480px]:items-baseline @min-[480px]:gap-x-ds-200 @min-[480px]:gap-y-0"
                : "flex flex-col gap-ds-025",
            )}
          >
            <dt data-slot="description-list-label" className={cn("m-0 text-ds-text-subtle", !rows && "text-body-small")}>{item.label}</dt>
            <dd data-slot="description-list-value" className="m-0 flex min-w-0 items-center gap-ds-100 tabular-nums">
              {isEmpty(item.value) ? (
                <span data-slot="description-list-empty" className="text-ds-text-subtlest">
                  <span aria-hidden>—</span>
                  <span className="sr-only">{notSetLabel(locale)}</span>
                </span>
              ) : (
                <span data-slot="description-list-value-text" className="min-w-0">{item.value}</span>
              )}
              {item.copyValue && <CopyButton text={item.copyValue} label={item.label} />}
              {item.action != null && <span data-slot="description-list-action" className="ms-auto shrink-0">{item.action}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
