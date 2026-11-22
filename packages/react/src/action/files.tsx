"use client";

import * as React from "react";
import {
  Button as AriaButton,
  DropZone as AriaDropZone,
  FileTrigger as AriaFileTrigger,
  useLocale,
  type DropItem,
  type FileTriggerProps as AriaFileTriggerProps,
} from "react-aria-components";
import { IconGlyph } from "../display/icon";

import { cn } from "../utils";
import {
  cancelUploadLabel, chooseFilesLabel, onlyOneLabel, orChooseTemplate, removeFileLabel, replaceLabel, tooLargeLabel, upToLabel,
  uploadedLabel, wrongTypeLabel,
} from "../i18n";
import { Button } from "./button";
import { LINK_FOCUS } from "./styles";

/** Bytes as the locale writes them: "2.4 MB", "980 kB". */
export function formatFileSize(bytes: number, locale: string): string {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
  let value = bytes;
  let unit = 0;
  // Round the way the unit will print before choosing it, so 999,600 bytes is "1 MB", not "1.000 kB".
  const rounded = () => (unit < 2 ? Math.round(value) : Math.round(value * 10) / 10);
  while (rounded() >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: units[unit],
    unitDisplay: "short",
    maximumFractionDigits: unit < 2 ? 0 : 1,
  }).format(value);
}

export type FileRules = {
  /** MIME types or extensions: "image/jpeg", "image/*", ".heic", "application/pdf". */
  acceptedFileTypes?: readonly string[];
  /** Bytes. */
  maxSize?: number;
};

export type RejectedFile = { file: File; reason: string };

function accepts(file: File, types: readonly string[] | undefined) {
  if (!types || types.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return types.some((rule) => {
    const pattern = rule.toLowerCase().trim();
    if (pattern.startsWith(".")) return name.endsWith(pattern);
    if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1));
    return type === pattern;
  });
}

/**
 * Checks each file on its own: a wrong type or a file over `maxSize` is
 * rejected with the reason, and the others are kept (design rule).
 */
export function validateFiles(files: readonly File[], rules: FileRules, locale: string) {
  const accepted: File[] = [];
  const rejected: RejectedFile[] = [];
  for (const file of files) {
    if (!accepts(file, rules.acceptedFileTypes)) rejected.push({ file, reason: wrongTypeLabel(locale) });
    else if (rules.maxSize !== undefined && file.size > rules.maxSize) {
      rejected.push({ file, reason: tooLargeLabel(locale, formatFileSize(rules.maxSize, locale)) });
    } else accepted.push(file);
  }
  return { accepted, rejected };
}

export type FileTriggerProps = Omit<AriaFileTriggerProps, "onSelect" | "acceptedFileTypes"> &
  FileRules & {
    /** Files that passed the rules. */
    onSelect?: (files: File[]) => void;
    /** Files that did not, each with its reason. */
    onReject?: (rejected: RejectedFile[]) => void;
    /** The control that opens the picker: a DS Button or Link. */
    children: React.ReactElement;
  };

/**
 * Hands the picked files on, then empties the picker's hidden input, so the same file picked again is
 * a change and reaches the app again, however the input was filled. The files are copied
 * out of the FileList before the callbacks run; clearing the input empties that list, not the copies.
 */
function pickThenClear(input: React.RefObject<HTMLInputElement | null>, list: FileList | null, handle: (files: File[]) => void) {
  const files = Array.from(list ?? []);
  try {
    handle(files);
  } finally {
    if (input.current) input.current.value = "";
  }
}

/** Opens the system file picker from any button. */
export function FileTrigger({ onSelect, onReject, acceptedFileTypes, maxSize, children, ...rest }: FileTriggerProps) {
  const { locale } = useLocale();
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <AriaFileTrigger
      {...rest}
      ref={inputRef}
      acceptedFileTypes={acceptedFileTypes ? [...acceptedFileTypes] : undefined}
      onSelect={(list) =>
        pickThenClear(inputRef, list, (files) => {
          const { accepted, rejected } = validateFiles(files, { acceptedFileTypes, maxSize }, locale);
          if (accepted.length) onSelect?.(accepted);
          if (rejected.length) onReject?.(rejected);
        })
      }
    >
      {children}
    </AriaFileTrigger>
  );
}

export type DropZoneProps = FileRules & {
  /** What to drop, as a call to action: "Drag your photos here". */
  label: string;
  /** The accepted types as people read them ("JPG, PNG, HEIC"); the size limit is added. */
  typesLabel?: string;
  allowsMultiple?: boolean;
  onSelect?: (files: File[]) => void;
  onReject?: (rejected: RejectedFile[]) => void;
  isDisabled?: boolean;
};

/** The files among dropped items; folders, text and files the browser cannot read are skipped. */
export async function filesFrom(items: readonly DropItem[]) {
  const reads = items.flatMap((item) => (item.kind === "file" ? [item.getFile()] : []));
  const results = await Promise.allSettled(reads);
  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

/**
 * A drop target with the picker inside: states the accepted types and the
 * size limit before the user picks; while a file is over it the zone takes
 * the selected fill and border.
 */
export function DropZone({ label, typesLabel, allowsMultiple, acceptedFileTypes, maxSize, onSelect, onReject, isDisabled }: DropZoneProps) {
  const { locale } = useLocale();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const handle = (files: File[]) => {
    const list = allowsMultiple ? files : files.slice(0, 1);
    const { accepted, rejected } = validateFiles(list, { acceptedFileTypes, maxSize }, locale);
    // Extra files on a single-file zone are rejected with a reason, never dropped silently.
    if (!allowsMultiple) for (const file of files.slice(1)) rejected.push({ file, reason: onlyOneLabel(locale) });
    if (accepted.length) onSelect?.(accepted);
    if (rejected.length) onReject?.(rejected);
  };
  const [before, after] = orChooseTemplate(locale).split("{choose}");
  const details = [typesLabel, maxSize !== undefined ? upToLabel(locale, formatFileSize(maxSize, locale)) : undefined]
    .filter(Boolean)
    .join(" · ");

  return (
    <AriaDropZone
      // Names the zone's keyboard and paste target (React Aria's own fallback is the untranslated "DropZone").
      aria-label={label}
      isDisabled={isDisabled}
      onDrop={async (event) => handle(await filesFrom(event.items))}
      data-slot="drop-zone"
      className={cn(
        "flex flex-col items-center justify-center gap-ds-100 rounded-ds-large border-[1.5px] border-dashed border-ds-border-bold bg-ds-surface-sunken p-ds-400 text-center outline-hidden",
        "data-[drop-target]:border-ds-border-selected data-[drop-target]:bg-ds-background-selected",
        // Keyboard focus: the 2px inner border every DS control uses.
        "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused",
        "data-[disabled]:cursor-not-allowed data-[disabled]:border-ds-border data-[disabled]:bg-ds-background-disabled",
      )}
    >
      <IconGlyph name="image-up" size="large" color="subtle" data-slot="drop-zone-icon" />
      <span data-slot="drop-zone-label" className="text-body-strong text-ds-text">{label}</span>
      <span data-slot="drop-zone-help" className="text-body-small text-ds-text-subtlest">
        {before}
        <AriaFileTrigger
          ref={inputRef}
          allowsMultiple={allowsMultiple}
          acceptedFileTypes={acceptedFileTypes ? [...acceptedFileTypes] : undefined}
          onSelect={(list) => pickThenClear(inputRef, list, handle)}
        >
          <AriaButton
            isDisabled={isDisabled}
            data-slot="drop-zone-choose"
            className={cn(
              "cursor-pointer text-ds-link underline-offset-3 data-[hovered]:underline",
              "data-[disabled]:cursor-not-allowed data-[disabled]:text-ds-text-disabled data-[disabled]:no-underline",
              LINK_FOCUS,
            )}
          >
            {chooseFilesLabel(locale)}
          </AriaButton>
        </AriaFileTrigger>
        {after}
        {details && ` · ${details}`}
      </span>
    </AriaDropZone>
  );
}

/** A thumbnail URL for an image file, created in an effect and revoked on change or unmount. */
function useObjectUrl(file: File | undefined) {
  const [url, setUrl] = React.useState<string>();
  React.useEffect(() => {
    if (!file || !file.type.startsWith("image/") || typeof URL.createObjectURL !== "function") {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

export type FileRowProps = {
  /** The picked file; photos get a thumbnail at once, before upload ends. */
  file?: File;
  /** Shown name and size when there is no File object (a stored document). */
  name?: string;
  size?: number;
  /** 0–1 while uploading; omit when done. */
  progress?: number;
  error?: string;
  onCancel?: () => void;
  onRemove?: () => void;
  onReplace?: () => void;
};

/** One picked or stored file: thumbnail, name, progress or size, per-file error, one trailing action. */
export function FileRow({ file, name, size, progress, error, onCancel, onRemove, onReplace }: FileRowProps) {
  const { locale } = useLocale();
  const url = useObjectUrl(file);
  // A type the browser cannot draw (HEIC on most browsers) falls back to the file icon.
  const [broken, setBroken] = React.useState<string>();
  const thumbnail = url && url !== broken ? url : undefined;
  const total = size ?? file?.size;
  const uploading = progress !== undefined && progress < 1 && !error;

  return (
    <li
      data-slot="file-row"
      data-state={error ? "error" : uploading ? "uploading" : "done"}
      className="flex items-center gap-ds-150 rounded-ds-large bg-ds-surface-raised p-ds-100 pe-ds-150 shadow-ds-raised"
    >
      <span data-slot="file-thumbnail" className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-ds-medium bg-ds-surface-sunken">
        {thumbnail ? <img src={thumbnail} alt="" onError={() => setBroken(thumbnail)} className="size-full object-cover" /> : <IconGlyph name={error ? "file-exclamation-point" : "file"} color="subtle" data-slot="file-row-icon" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-ds-050">
        <span data-slot="file-name" className="truncate text-body text-ds-text">{name ?? file?.name}</span>
        {uploading && (
          <span
            role="progressbar"
            aria-label={name ?? file?.name}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((progress ?? 0) * 100)}
            aria-valuetext={total !== undefined ? `${formatFileSize(total * (progress ?? 0), locale)} / ${formatFileSize(total, locale)}` : undefined}
            data-slot="file-progress"
            className="h-1 overflow-hidden rounded-ds-full bg-ds-background-neutral"
          >
            <span className="block h-full rounded-ds-full bg-ds-background-brand-bold" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
          </span>
        )}
        {error ? (
          <span role="status" data-slot="file-error" className="text-body-small text-ds-text-danger">{error}</span>
        ) : total !== undefined ? (
          <span data-slot="file-meta" className="text-body-small tabular-nums text-ds-text-subtlest">
            {uploading
              ? `${formatFileSize(total * (progress ?? 0), locale)} / ${formatFileSize(total, locale)}`
              : `${formatFileSize(total, locale)} · ${uploadedLabel(locale)}`}
          </span>
        ) : null}
      </span>
      {error && onReplace ? (
        <Button variant="link" size="small" onPress={onReplace}>{replaceLabel(locale)}</Button>
      ) : uploading && onCancel ? (
        <Button variant="subtle" size="small" iconOnly iconBefore="x" aria-label={cancelUploadLabel(locale)} onPress={onCancel} />
      ) : onRemove ? (
        <Button variant="subtle" size="small" iconOnly iconBefore="trash-2" aria-label={removeFileLabel(locale)} onPress={onRemove} />
      ) : null}
    </li>
  );
}

/** The list of picked or stored files. */
export function FileUploadList({ children, "aria-label": ariaLabel }: { children: React.ReactNode; "aria-label"?: string }) {
  return (
    // role="list": Safari drops the list role from a `list-none` list.
    <ul role="list" aria-label={ariaLabel} data-slot="file-list" className="m-0 flex list-none flex-col gap-ds-100 p-0">
      {children}
    </ul>
  );
}

