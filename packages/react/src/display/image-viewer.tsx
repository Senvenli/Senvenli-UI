"use client";

import * as React from "react";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  Heading,
  Modal,
  ModalOverlay,
  useLocale,
} from "react-aria-components";

import { closeLabel as dsCloseLabel, imagePositionLabel, nextImageLabel, previousImageLabel } from "../i18n";
import { cn } from "../utils";
import { IconGlyph } from "./icon";

/**
 * The image renderer an app may inject (next/image's props are a superset), so the package carries no
 * framework dependency; a plain `<img>` by default.
 */
export interface ImageViewerImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  preload?: boolean;
  "aria-hidden"?: boolean | "true" | "false";
}

export type ImageViewerImage = React.ComponentType<ImageViewerImageProps>;

/** The default renderer: a plain `<img>`; `fill` covers the positioned parent. */
function PlainImage({ src, alt, className, width, height, fill, sizes, priority, preload, "aria-hidden": ariaHidden }: ImageViewerImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      aria-hidden={ariaHidden}
      loading={priority || preload ? "eager" : "lazy"}
      decoding="async"
      className={cn(fill && "absolute inset-0 size-full", className)}
    />
  );
}

/** Wrap an index into [0, total) so prev/next cycle instead of dead-ending. */
export function wrapPhotoIndex(index: number, total: number) {
  if (total <= 0) return 0;
  return (index + total) % total;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export interface ImageViewerProps {
  /** The image renderer (e.g. next/image); a plain `<img>` by default. */
  image?: ImageViewerImage;
  /** Photo paths in display order. */
  photos: string[];
  /** Resolve a stored photo path to a renderable src. Defaults to identity. */
  resolveSrc?: (path: string) => string;
  /** Index to open on; wrapped into range. */
  initialIndex?: number;
  onClose: () => void;
  /** Caption shown at the bottom and used as the accessible dialog title. */
  title: string;
  /** alt text for the photo. */
  alt: string;
  /** Builds the "N of M" caption/description; the DS string by default. */
  positionLabel?: (index: number, total: number) => string;
  /** The DS strings by default ("Close", "Previous image", "Next image"). */
  closeLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
}

/** Round controls over the photo, as the Carousel's: the overlay surface of the (always dark) viewer. */
const ROUND_BUTTON =
  "grid cursor-pointer place-items-center rounded-ds-full bg-ds-surface-overlay text-ds-icon shadow-ds-overlay outline-hidden " +
  "data-[hovered]:bg-ds-surface-hovered data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused";

/**
 * Full-screen photo viewing for the media family.
 *
 * A dark modal with the photo contained, previous/next that cycle, arrow keys, a position caption and a
 * filmstrip under the stage. The viewer is dark in both themes (`data-theme="dark"` on the modal, so every
 * color is still a `--ds-*` token). Esc and a scrim press close it; focus stays inside while open and
 * returns to what opened it. In right-to-left the controls mirror and → / ← follow the reading direction.
 *
 * An app may inject its image renderer (next/image), a src resolver and its own labels; by default it
 * renders plain `<img>` elements with the DS strings. Do not add a second public lightbox next to this.
 */
export function ImageViewer({
  image: Image = PlainImage,
  photos,
  resolveSrc = (path) => path,
  initialIndex = 0,
  onClose,
  title,
  alt,
  positionLabel: positionLabelProp,
  closeLabel: closeLabelProp,
  previousLabel: previousLabelProp,
  nextLabel: nextLabelProp,
}: ImageViewerProps) {
  const { direction, locale } = useLocale();
  const positionLabel = positionLabelProp ?? ((n: number, total: number) => imagePositionLabel(locale, n, total));
  const closeLabel = closeLabelProp ?? dsCloseLabel(locale);
  const previousLabel = previousLabelProp ?? previousImageLabel(locale);
  const nextLabel = nextLabelProp ?? nextImageLabel(locale);
  const [index, setIndex] = React.useState(() => wrapPhotoIndex(initialIndex, photos.length));
  const currentPhoto = photos[index];
  const stripRef = React.useRef<HTMLDivElement>(null);
  const descriptionId = React.useId();
  const move = React.useCallback(
    (delta: number) => setIndex((current) => wrapPhotoIndex(current + delta, photos.length)),
    [photos.length],
  );

  // Listen at document capture level while the viewer is open, so physical arrow keys never depend on where
  // focus sits in the overlay. Editable controls keep their native cursor behavior.
  React.useEffect(() => {
    if (photos.length <= 1) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const back = direction === "rtl" ? "ArrowRight" : "ArrowLeft";
      const forward = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
      if (event.key === back) {
        event.preventDefault();
        move(-1);
      } else if (event.key === forward) {
        event.preventDefault();
        move(1);
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [move, photos.length, direction]);

  // The strip follows the open photo, so on a long gallery it keeps saying where you are.
  React.useEffect(() => {
    const thumb = stripRef.current?.children[index] as HTMLElement | undefined;
    // Optional call: jsdom has no scrollIntoView.
    thumb?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }, [index]);

  if (!currentPhoto) return null;
  const position = positionLabel(index + 1, photos.length);

  return (
    <ModalOverlay
      isOpen
      isDismissable
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      data-slot="image-viewer-overlay"
      className="fixed inset-0 z-50 grid place-items-center bg-ds-blanket p-ds-100"
    >
      <Modal
        data-theme="dark"
        data-slot="image-viewer"
        className="w-full max-w-[calc(100vw-1rem)] overflow-hidden rounded-ds-xlarge bg-ds-surface text-ds-text shadow-ds-overlay outline-hidden sm:max-w-5xl"
      >
        <AriaDialog aria-describedby={descriptionId} className="flex flex-col outline-hidden">
          {({ close }) => (
            <>
              <Heading slot="title" className="sr-only">{title}</Heading>
              <p id={descriptionId} className="sr-only">{position}</p>

              <div data-slot="image-viewer-stage" className="relative flex min-h-[min(72dvh,48rem)] items-center justify-center bg-ds-surface-sunken">
                {/* Next 16 renamed next/image `priority` to `preload` (same effect: eager load plus a preload hint). Thumbnails take neither. */}
                <Image key={currentPhoto} src={resolveSrc(currentPhoto)} alt={alt} fill preload sizes="100vw" className="object-contain" />

                <AriaButton
                  data-slot="image-viewer-close"
                  aria-label={closeLabel}
                  onPress={close}
                  className={cn(ROUND_BUTTON, "absolute top-ds-150 end-ds-150 z-10 size-8")}
                >
                  <IconGlyph name="x" />
                </AriaButton>

                {photos.length > 1 && (
                  <>
                    <AriaButton
                      data-slot="image-viewer-previous"
                      aria-label={previousLabel}
                      onPress={() => move(-1)}
                      className={cn(ROUND_BUTTON, "absolute start-ds-150 z-10 size-10")}
                    >
                      <IconGlyph name="chevron-left" size="large" />
                    </AriaButton>
                    <AriaButton
                      data-slot="image-viewer-next"
                      aria-label={nextLabel}
                      onPress={() => move(1)}
                      className={cn(ROUND_BUTTON, "absolute end-ds-150 z-10 size-10")}
                    >
                      <IconGlyph name="chevron-right" size="large" />
                    </AriaButton>
                  </>
                )}

                <div
                  data-slot="image-viewer-caption"
                  className="absolute inset-x-0 bottom-0 z-10 flex items-end bg-linear-to-t from-ds-blanket to-transparent px-ds-200 pt-ds-800 pb-ds-200 sm:px-ds-250 sm:pb-ds-250"
                >
                  <div className="min-w-0">
                    <p dir="auto" className="truncate text-body-strong text-ds-text">{title}</p>
                    {/* dir="auto": the caption's own script sets its order, so "2 / 3" never reads "3 / 2" on an RTL page. */}
                    <p dir="auto" className="mt-ds-025 text-body-small text-ds-text-subtle tabular-nums">{position}</p>
                  </div>
                </div>
              </div>

              {/* The filmstrip sits under the stage rather than over it: this viewer's whole job is the photo. */}
              {photos.length > 1 && (
                <div ref={stripRef} data-slot="image-viewer-strip" className="flex gap-ds-100 overflow-x-auto bg-ds-surface px-ds-200 py-ds-150 sm:px-ds-250">
                  {photos.map((photo, thumb) => {
                    const active = thumb === index;
                    return (
                      <AriaButton
                        key={`${photo}-${thumb}`}
                        data-slot="image-viewer-thumbnail"
                        // Named by the position caption the viewer already requires, so the strip costs no new prop.
                        aria-label={positionLabel(thumb + 1, photos.length)}
                        aria-current={active}
                        onPress={() => setIndex(thumb)}
                        className={cn(
                          "relative aspect-[4/3] h-14 w-auto shrink-0 cursor-pointer overflow-hidden rounded-ds-medium bg-ds-surface-sunken p-0 outline-hidden",
                          "motion-safe:transition-opacity motion-safe:duration-(--ds-duration-fast)",
                          "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit]",
                          active ? "after:inset-ring-2 after:inset-ring-ds-border-selected" : "opacity-55 data-[hovered]:opacity-100",
                          "before:pointer-events-none before:absolute before:inset-[3px] before:z-[1] before:rounded-ds-small",
                          "data-[focus-visible]:opacity-100 data-[focus-visible]:before:inset-ring-2 data-[focus-visible]:before:inset-ring-ds-border-focused",
                        )}
                      >
                        <Image src={resolveSrc(photo)} alt="" fill sizes="96px" className="object-cover" />
                      </AriaButton>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
