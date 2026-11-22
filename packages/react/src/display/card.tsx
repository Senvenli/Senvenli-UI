"use client";

import type { Density } from "../density";
import * as React from "react";
import { Button as AriaButton, Link as AriaLink, type LinkProps as AriaLinkProps } from "react-aria-components";

import { cn } from "../utils";
import { radiusClass, useRadius, type ComponentRadius } from "../defaults";
import { IconGlyph, type IconName } from "./icon";

export type CardVariant = "raised" | "outline" | "sunken";
export type CardHeadingLevel = 2 | 3 | 4 | 5 | 6;

const VARIANT: Record<CardVariant, string> = {
  raised: "bg-ds-surface-raised shadow-ds-raised",
  // Drawn on a positioned pseudo-element: above a flush CardMedia (not positioned), under the link overlay
  // and its focus border (z-[1]) and the menu (z-[2]).
  outline:
    "bg-ds-surface-raised after:pointer-events-none after:absolute after:inset-0 after:z-0 after:rounded-[inherit] after:inset-ring-1 after:inset-ring-ds-border",
  sunken: "bg-ds-surface-sunken",
};

type CardContextValue = { isCompact: boolean; titleId: string; registerTitle: () => () => void };
const CardContext = React.createContext<CardContextValue>({ isCompact: false, titleId: "", registerTitle: () => () => {} });

const PAD_X = { compact: "px-ds-200", default: "px-ds-300" } as const;
const PAD_Y = { compact: "py-ds-200", default: "py-ds-300" } as const;
const PAD_TOP = { compact: "pt-ds-200", default: "pt-ds-300" } as const;

type CardBase = {
  /** `raised` on the page · `outline` inside cards and settings groups · `sunken` for summaries and code. */
  variant?: CardVariant;
  /** `compact`: 16px padding instead of 24px. */
  density?: Density;
  /** Corner radius: `none` to `full`; the design's `large` (or the provider's default) otherwise. */
  radius?: ComponentRadius;
  /** Header, media, body and footer parts. */
  children: React.ReactNode;
  /** The card's name when it is interactive and has no CardHeader title. */
  "aria-label"?: string;
};

/*
 * The interactive card is a stretched link: one Link/Button overlays the whole card, named by the
 * CardHeader title. Text under it cannot be selected and controls under it cannot be reached, so an
 * interactive card holds no control except the header menu, which sits above the overlay.
 */
export type CardProps = CardBase &
  (
    | {
        /** The whole card is a link (the interactive card): one focusable element named by its title. */
        href: AriaLinkProps["href"];
        routerOptions?: AriaLinkProps["routerOptions"];
        onPress?: never;
      }
    | {
        /** The whole card is a button (opens a panel rather than a page). */
        onPress: () => void;
        href?: never;
        routerOptions?: never;
      }
    | { href?: never; routerOptions?: never; onPress?: never }
  );

/** Shared card frame; `isSelected` draws the 2px selected outline of a selectable card. */
export function CardFrame({
  variant = "raised", density = "comfortable", radius: radiusProp, children, href, routerOptions, onPress, "aria-label": ariaLabel, isSelected,
}: CardProps & { isSelected?: boolean }) {
  const radius = useRadius(radiusProp);
  const titleId = React.useId();
  // CardHeader registers its title so the overlay is never labelled by an id that is not there.
  const titles = React.useRef(0);
  const [hasNoTitle, setHasNoTitle] = React.useState(false);
  const registerTitle = React.useCallback(() => {
    titles.current += 1;
    setHasNoTitle(false);
    return () => {
      titles.current -= 1;
      // The last header went away: stop pointing at its id.
      if (titles.current === 0) setHasNoTitle(true);
    };
  }, []);
  const isCompact = density === "compact";
  const context = React.useMemo(() => ({ isCompact, titleId, registerTitle }), [isCompact, titleId, registerTitle]);
  const interactive = href !== undefined || onPress !== undefined;
  // Children's layout effects have run by now: no header means no title to point at.
  React.useEffect(() => {
    if (!interactive || ariaLabel || titles.current > 0) return;
    setHasNoTitle(true);
    console.warn("Card: an interactive card needs a CardHeader title or an aria-label to name its link.");
  }, [interactive, ariaLabel]);
  // `aria-label` names an interactive card only; a static card is not a landmark and ignores it.
  const naming = ariaLabel ? { "aria-label": ariaLabel } : hasNoTitle ? {} : { "aria-labelledby": titleId };
  // Over the whole card, under a trailing header menu; the focus border is drawn on it so a flush image never covers it.
  const overlay = "absolute inset-0 z-[1] rounded-[inherit] cursor-pointer outline-hidden data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused";

  return (
    <CardContext.Provider value={context}>
      <div
        data-slot="card"
        data-variant={interactive ? "interactive" : variant}
        data-selected={isSelected || undefined}
        className={cn(
          "relative flex flex-col overflow-hidden rounded-ds-large text-ds-text",
          VARIANT[variant],
          radiusClass(radius),
          interactive && variant === "raised" &&
            "transition-shadow duration-(--ds-duration-instant) ease-ds-standard has-[[data-slot=card-link][data-hovered]]:shadow-ds-overlay has-[[data-slot=card-link][data-pressed]]:shadow-ds-raised",
          interactive && variant !== "raised" && "has-[[data-slot=card-link][data-hovered]]:bg-ds-surface-hovered",
          isSelected && "ring-2 ring-ds-border-selected",
        )}
      >
        {children}
        {href !== undefined && <AriaLink data-slot="card-link" href={href} routerOptions={routerOptions} {...naming} className={overlay} />}
        {onPress !== undefined && <AriaButton data-slot="card-link" onPress={onPress} {...naming} className={overlay} />}
      </div>
    </CardContext.Provider>
  );
}

/**
 * Groups content about one object or topic. A card is one thing: inside a
 * raised card use `outline`, never another raised card. An interactive card
 * (`href` or `onPress`) holds no other control except a trailing header menu.
 */
export function Card(props: CardProps) {
  return <CardFrame {...props} />;
}

export type CardHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Heading level of the title; default 3. */
  headingLevel?: CardHeadingLevel;
  /** At the header's end: a subtle menu button (`Button variant="subtle" iconOnly`); stays clickable above an interactive card. */
  actions?: React.ReactNode;
};

/** Title in `heading-small`, an optional subtitle, and an optional trailing menu. */
export function CardHeader({ title, subtitle, headingLevel = 3, actions: menu }: CardHeaderProps) {
  const { isCompact, titleId, registerTitle } = React.useContext(CardContext);
  React.useLayoutEffect(registerTitle, [registerTitle]);
  const Heading = `h${headingLevel}` as const;
  const pad = isCompact ? "compact" : "default";
  return (
    <div data-slot="card-header" className={cn("flex items-start justify-between gap-ds-150", PAD_X[pad], PAD_TOP[pad])}>
      <div className="flex min-w-0 flex-col gap-ds-025">
        <Heading id={titleId} data-slot="card-title" className="m-0 text-heading-small">{title}</Heading>
        {subtitle != null && <span data-slot="card-subtitle" className="text-body-small text-ds-text-subtlest">{subtitle}</span>}
      </div>
      {menu != null && <div data-slot="card-menu" className="relative z-[2] -me-ds-100 -mt-ds-050 shrink-0">{menu}</div>}
    </div>
  );
}

export function CardBody({ children }: { children: React.ReactNode }) {
  const { isCompact } = React.useContext(CardContext);
  const pad = isCompact ? "compact" : "default";
  return <div data-slot="card-body" className={cn("flex flex-col gap-ds-150 text-body", PAD_X[pad], PAD_Y[pad])}>{children}</div>;
}

/** Actions on a `ds-border` rule, aligned to the end. */
export function CardFooter({ children }: { children: React.ReactNode }) {
  const { isCompact } = React.useContext(CardContext);
  return (
    <div data-slot="card-footer" className={cn("flex items-center justify-end gap-ds-100 border-t border-ds-border py-ds-150", PAD_X[isCompact ? "compact" : "default"])}>
      {children}
    </div>
  );
}

export type CardMediaProps = {
  /** The photo, flush to the card edges at 16:9 and covering the frame. */
  src?: string;
  /** Describes the photo; "" when the title already says what it shows. */
  alt?: string;
  /** Shown on `ds-surface-sunken` when there is no photo. */
  fallbackIcon?: IconName;
};

/** A flush 16:9 photo frame; the icon on `ds-surface-sunken` when there is none. */
export function CardMedia({ src, alt = "", fallbackIcon = "image" }: CardMediaProps) {
  // Keyed by source, so a new src never inherits the last one's failure.
  const [failedSrc, setFailedSrc] = React.useState<string>();
  const failed = src !== undefined && failedSrc === src;
  // An image that failed before hydration never fires onError for React; read its state on mount.
  const check = React.useCallback(
    (image: HTMLImageElement | null) => {
      if (image?.complete && image.currentSrc && image.naturalWidth === 0) setFailedSrc(src);
    },
    [src],
  );
  return (
    <div data-slot="card-media" className="grid aspect-video w-full place-items-center overflow-hidden bg-ds-surface-sunken text-ds-icon-subtle [&_svg]:size-10">
      {src && !failed ? (
        <img ref={check} src={src} alt={alt} onError={() => setFailedSrc(src)} className="size-full object-cover" />
      ) : (
        <IconGlyph name={fallbackIcon} strokeWidth={1.25} />
      )}
    </div>
  );
}
