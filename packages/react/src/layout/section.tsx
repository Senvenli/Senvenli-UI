"use client";

import * as React from "react";
import { useLocale } from "react-aria-components";

import { cn } from "../utils";
import { Heading, type HeadingLevel } from "../display/typography";
import { contentLang } from "../i18n";

type SectionContextValue = { headingId: string; owner: symbol | undefined; registerHeading: (key: symbol) => () => void };
const SectionContext = React.createContext<SectionContextValue | null>(null);

export type SectionProps = {
  children: React.ReactNode;
  /** `default` on ds-surface; `sunken` for an alternate or CTA band. Never two sunken bands in a row. */
  tone?: "default" | "sunken";
  /** Vertical padding: ds-space-1000 from 768px and ds-space-600 below; `compact` keeps ds-space-600 throughout. */
  density?: "default" | "compact";
  /** Anchor target for the Navbar; scrolling to it leaves room for the 56px sticky Navbar. */
  id?: string;
  /** Names the section; defaults to its SectionHead title. */
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
  progressive?: boolean;
};

/**
 * A full-width band of the Website: a background and vertical rhythm around
 * a Container. Spacing is padding and gap from ds-space tokens, never
 * margins between sibling sections; logical properties only.
 */
export function Section({ children, tone = "default", density = "default", id, "aria-labelledby": labelledBy, progressive }: SectionProps) {
  const headingId = React.useId();
  // Heads in registration order; the first one carries the id that names the section, so two heads
  // never share an id, and the next one takes over when the first goes away.
  const [heads, setHeads] = React.useState<symbol[]>([]);
  const registerHeading = React.useCallback((key: symbol) => {
    setHeads((current) => [...current, key]);
    return () => setHeads((current) => current.filter((head) => head !== key));
  }, []);
  const owner = heads[0];
  const hasHeading = owner !== undefined;
  const context = React.useMemo(() => ({ headingId, owner, registerHeading }), [headingId, owner, registerHeading]);
  return (
    <SectionContext.Provider value={context}>
      <section
        id={id}
        aria-labelledby={labelledBy ?? (hasHeading ? headingId : undefined)}
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
    </SectionContext.Provider>
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

export type SectionHeadProps = {
  /** A short kicker above the title ("How it works"). */
  overline?: React.ReactNode;
  title: React.ReactNode;
  /** `display-medium` for a marketing site's section titles (default), `heading-xxlarge` for a quieter band. */
  titleSize?: "display-medium" | "heading-xxlarge";
  /** The title's place in the outline; default 2. */
  titleLevel?: HeadingLevel;
  /** One or two sentences under the title, kept under 60 characters a line. */
  lead?: React.ReactNode;
  align?: "start" | "center";
};

/**
 * The overline, title and lead of a Section; names the Section it sits in. With more than one head,
 * the first to mount names it (registration order, not position on the page).
 */
export function SectionHead({ overline, title, titleSize = "display-medium", titleLevel = 2, lead, align = "start" }: SectionHeadProps) {
  const { locale } = useLocale();
  const section = React.useContext(SectionContext);
  const [key] = React.useState(() => Symbol("section-head"));
  const register = section?.registerHeading;
  React.useLayoutEffect(() => register?.(key), [register, key]);
  return (
    <div
      data-slot="section-head"
      data-align={align}
      // At most 720px, like the design; centred heads sit in the middle of the column.
      className={cn("flex max-w-[720px] flex-col gap-ds-150", align === "center" ? "mx-auto items-center text-center" : "items-start text-start")}
    >
      {overline != null && (
        // Sentence case like every label (no uppercase); lang keeps the locale's own rules for the text.
        <span lang={contentLang(locale)} data-slot="section-overline" className="text-heading-xxsmall text-ds-text-brand">{overline}</span>
      )}
      <Heading level={titleLevel} size={titleSize} id={section?.owner === key ? section.headingId : undefined}>{title}</Heading>
      {lead != null && (
        <p data-slot="section-lead" className="m-0 max-w-[60ch] text-body-large text-ds-text-subtle">{lead}</p>
      )}
    </div>
  );
}
