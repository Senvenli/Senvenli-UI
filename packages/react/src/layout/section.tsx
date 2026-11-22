"use client";

import type { Density } from "../density";
import * as React from "react";

import { cn } from "../utils";

export type SectionProps = {
  children: React.ReactNode;
  /** `default` on ds-surface; `sunken` for an alternate or CTA band. Never two sunken bands in a row. */
  tone?: "default" | "sunken";
  /** Vertical padding: ds-space-1000 from 768px and ds-space-600 below; `compact` keeps ds-space-600 throughout. */
  density?: Density;
  /** Anchor target for the Navbar; scrolling to it leaves room for the 56px sticky Navbar. */
  id?: string;
  /** The id of the heading that names the band (a landmark needs a name to be listed). */
  "aria-labelledby"?: string;
  /**
   * Skip painting until the band is near the viewport (`content-visibility: auto` with a 720px
   * intrinsic size): the content stays in the server HTML (find-in-page and anchors still work),
   * nothing animates, and the reserved size keeps the layout from shifting.
   *
   * It also contains the band (layout, paint and style containment): overflowing children are
   * clipped at its edge, and fixed or floating children position against it instead of the
   * viewport. So a progressive band holds no fixed, floating or bleeding content (portal overlays
   * and floating banners to <body>), and the first, above-the-fold band is never progressive. The
   * 720px is a desktop-tuned estimate; once painted, the browser remembers the real height.
   */
  isProgressive?: boolean;
};

/**
 * A full-width band of a marketing or content page: a background and vertical rhythm around
 * a Container. Spacing is padding and gap from ds-space tokens, never
 * margins between sibling sections; logical properties only.
 */
export function Section({ children, tone = "default", density = "comfortable", id, "aria-labelledby": labelledBy, isProgressive: progressive }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-slot="section"
      data-tone={tone}
      data-density={density}
      data-progressive={progressive || undefined}
      className={cn(
        "w-full text-ds-text",
        tone === "sunken" ? "bg-ds-surface-sunken" : "bg-ds-surface",
        density === "compact" ? "py-ds-600" : "py-ds-600 min-[768px]:py-ds-1000",
        // The sticky Navbar is 56px tall: ds-space-600 + ds-space-100.
        "scroll-mt-[calc(var(--ds-space-600)+var(--ds-space-100))]",
        progressive && "[content-visibility:auto] [contain-intrinsic-size:auto_720px]",
      )}
    >
      {children}
    </section>
  );
}

export type ContainerProps = {
  children: React.ReactNode;
  /** 1200px (default) or 800px (`narrow`) at most, centred. */
  width?: "default" | "narrow";
};

/**
 * The centred, width-capped column inside a Section; children stacked with a ds-space-400 gap. The
 * cap is the outer width (border-box, gutters included), as in the design.
 */
export function Container({ children, width = "default" }: ContainerProps) {
  return (
    <div
      data-slot="container"
      data-width={width}
      className={cn(
        "mx-auto flex w-full flex-col gap-ds-400 px-ds-200 min-[768px]:px-ds-300",
        width === "narrow" ? "max-w-[800px]" : "max-w-[1200px]",
      )}
    >
      {children}
    </div>
  );
}
