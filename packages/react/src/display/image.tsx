"use client";

import * as React from "react";

import { cn } from "../utils";
import { radiusClass, useRadius, type ComponentRadius } from "../defaults";
import { IconGlyph } from "./icon";

export type ImageProps = {
  src: string;
  /** What the picture shows ("A red bicycle against a white wall"); `""` for a purely decorative one. */
  alt: string;
  /**
   * Width to height ("16/9", "4/3", "1/1", or a number like 1.5): the box keeps it before the picture loads, so the
   * page never jumps. Left out, the picture's own shape.
   */
  ratio?: string | number;
  /** `cover` (default) fills the box and crops; `contain` shows all of it, with space around. */
  fit?: "cover" | "contain";
  radius?: ComponentRadius;
  /** Shown when the picture cannot load; a neutral tile with an image icon by default. */
  fallback?: React.ReactNode;
  /** `lazy` (default) loads it when it nears the screen; `eager` for the picture above the fold. */
  loading?: "lazy" | "eager";
  width?: number;
  height?: number;
};

/**
 * A picture in a box that keeps its shape (`ratio`) while it loads, with a fallback when it cannot load. For a
 * person use Avatar; for a gallery, Carousel or ImageViewer.
 */
export function Image({ src, alt, ratio, fit = "cover", radius: radiusProp, fallback, loading = "lazy", width, height }: ImageProps) {
  const radius = useRadius(radiusProp);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  return (
    <span
      data-slot="image"
      data-failed={failed || undefined}
      className={cn("relative block overflow-hidden rounded-ds-medium bg-ds-background-neutral", radiusClass(radius))}
      style={ratio !== undefined ? { aspectRatio: String(ratio) } : undefined}
    >
      {failed ? (
        <span data-slot="image-fallback" role={alt ? "img" : undefined} aria-label={alt || undefined} className="absolute inset-0 grid place-items-center text-ds-icon-subtle">
          {fallback ?? <IconGlyph name="image-off" size="large" />}
        </span>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={loading}
          width={width}
          height={height}
          onError={() => setFailed(true)}
          className={cn("block size-full", ratio !== undefined && "absolute inset-0", fit === "contain" ? "object-contain" : "object-cover")}
        />
      )}
    </span>
  );
}
