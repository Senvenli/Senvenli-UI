"use client";

import type { Density } from "../density";
import * as React from "react";
import { Link as AriaLink, useLocale } from "react-aria-components";

import { cn } from "../utils";
import { BrandLinkContext } from "./brand-link-context";
import { Button } from "../action/button";
import { mainNavigationLabel, openMenuLabel } from "../i18n";
import { LAYER } from "../layers";
import { NavPanel } from "./nav-panel";

export type NavbarLink = {
  /** Unique; `currentKey` matches it. */
  id: string;
  /** A noun for the place ("Pricing"), never a verb. */
  label: string;
  /** A page or an in-page anchor ("/#pricing"); it goes through the host router. */
  href: string;
};

export type NavbarProps = {
  /** The logo and wordmark (the site's logo). It links to `brandHref`. Or a `NavbarBrand` child. */
  brand?: React.ReactNode;
  /** Where the brand goes: the home page. */
  brandHref?: string;
  /** The brand link's name when the brand alone does not say where it goes ("Acme home"). */
  brandLabel?: string;
  /** Up to five destinations. Leave it out to compose `NavbarItem`s as children instead. */
  links?: readonly NavbarLink[];
  /**
   * With no `links`: `NavbarItem`s (the destinations), plus an optional `NavbarBrand` (instead of `brand`) and
   * `NavbarActions` (instead of `actions`).
   */
  children?: React.ReactNode;
  /** The link of the page (or section) in view: marked `aria-current="page"`. */
  currentKey?: string;
  /**
   * At the end: a language switcher, sign-in (subtle), then the one primary action, the same on every page. On
   * phones they move into the menu panel, under the links. Or a `NavbarActions` child.
   */
  actions?: React.ReactNode;
  /** Pinned to the top while the page scrolls. */
  isSticky?: boolean;
  /** `compact`: 48px instead of 56px, the bar after the hero. */
  density?: Density;
  /** Names the navigation landmark; "Main menu" by default. */
  "aria-label"?: string;
};

const LINK =
  "inline-flex h-8 items-center gap-ds-075 rounded-ds-medium px-ds-100 text-body font-[500] text-ds-text-subtle outline-hidden transition-colors duration-(--ds-duration-fast) motion-reduce:transition-none " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[hovered]:text-ds-text data-[pressed]:bg-ds-background-neutral-pressed " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  "aria-[current=page]:bg-ds-background-neutral aria-[current=page]:text-ds-text";

/**
 * The top bar of public sites. Brand at the start, up to
 * five links (the current one on `ds-background-neutral`), then the language switch and the actions.
 * Under 768px the links, language switch and actions move into a menu panel from the end edge.
 */
export function Navbar({
  brand: brandProp,
  brandHref = "/",
  brandLabel,
  links,
  children,
  currentKey,
  actions: actionsProp,
  isSticky,
  density = "comfortable",
  "aria-label": label,
}: NavbarProps) {
  const { locale } = useLocale();
  const [open, setOpen] = React.useState(false);
  const name = label ?? mainNavigationLabel(locale);
  const { brand, actions: endActions, items } = splitSlots(children, brandProp, actionsProp);
  const renderLinks = () =>
    links ? (
      links.map((link) => (
        <NavbarItem key={link.id} id={link.id} href={link.href}>
          {link.label}
        </NavbarItem>
      ))
    ) : (
      items
    );
  const brandLink = (
    <AriaLink
      href={brandHref}
      aria-label={brandLabel}
      data-slot="navbar-brand"
      className="flex min-w-0 items-center gap-ds-100 rounded-ds-medium text-body-strong text-ds-text outline-hidden data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused"
    >
      <BrandLinkContext.Provider value>{brand}</BrandLinkContext.Provider>
    </AriaLink>
  );
  return (
    <header
      data-slot="navbar"
      data-density={density}
      className={cn(
        "border-b border-ds-border bg-ds-surface-raised text-ds-text",
        isSticky && cn("sticky top-0 pt-[env(safe-area-inset-top,0px)]", LAYER.stickyBar),
      )}
    >
      <div
        className={cn(
          "flex items-center gap-ds-300 transition-[height] duration-(--ds-duration-medium) motion-reduce:transition-none",
          // Safe-area insets are physical edges, so they pair with physical padding.
          "[padding-left:max(var(--ds-space-200),env(safe-area-inset-left,0px))] [padding-right:max(var(--ds-space-200),env(safe-area-inset-right,0px))]",
          "md:[padding-left:max(var(--ds-space-300),env(safe-area-inset-left,0px))] md:[padding-right:max(var(--ds-space-300),env(safe-area-inset-right,0px))]",
          density === "compact" ? "h-12" : "h-14",
        )}
      >
        {brandLink}
        <nav aria-label={name} data-slot="navbar-links" className="hidden md:block">
          <ul className="flex items-center gap-ds-100">
            <NavbarContext.Provider value={{ currentKey, inPanel: false }}>{renderLinks()}</NavbarContext.Provider>
          </ul>
        </nav>
        <div data-slot="navbar-end" className="ms-auto flex items-center gap-ds-100">
          <div className="hidden items-center gap-ds-100 md:flex">
            {endActions}
          </div>
          <div className="md:hidden">
            <Button
              variant="subtle"
              iconOnly
              iconBefore="menu"
              aria-label={openMenuLabel(locale)}
              aria-expanded={open}
              onPress={() => setOpen(true)}
              data-slot="navbar-menu-button"
            />
          </div>
        </div>
      </div>
      <NavPanel isOpen={open} onOpenChange={setOpen} label={name} side="end" slot="navbar" header={brand}>
        {/* The dialog already carries the name; a second landmark name would be read twice. */}
        <nav>
          <ul className="flex flex-col gap-ds-025">
            <NavbarContext.Provider value={{ currentKey, inPanel: true }}>{renderLinks()}</NavbarContext.Provider>
          </ul>
        </nav>
        {endActions && (
          <div data-slot="navbar-panel-actions" className="flex flex-col items-stretch gap-ds-100 border-t border-ds-border pt-ds-200">
            {endActions}
          </div>
        )}
      </NavPanel>
    </header>
  );
}

// ---- Composed from parts ---------------------------------------------------------------------------------------

/** Where a `NavbarItem` renders: the bar, or the phone menu panel (a full-width 44px row). */
const NavbarContext = React.createContext<{ currentKey?: string; inPanel: boolean } | null>(null);

export type NavbarItemProps = {
  /** Matches the Navbar's `currentKey`. */
  id: string;
  /** A page or an in-page anchor ("/#pricing"); it goes through the host router. */
  href: string;
  /** A noun for the place ("Pricing"), never a verb. */
  children: React.ReactNode;
  /** Marks this link as the page in view, instead of the Navbar's `currentKey`. */
  isCurrent?: boolean;
};

/** One destination. It shows in the bar from 768px up and in the menu panel below that. */
export function NavbarItem({ id, href, children, isCurrent }: NavbarItemProps) {
  const context = React.useContext(NavbarContext);
  if (!context) throw new Error("NavbarItem must be inside a Navbar.");
  return (
    <li>
      <AriaLink
        href={href}
        data-slot={context.inPanel ? "navbar-panel-link" : "navbar-link"}
        aria-current={isCurrent || id === context.currentKey ? "page" : undefined}
        className={context.inPanel ? cn(LINK, "flex h-11 w-full") : LINK}
      >
        {children}
      </AriaLink>
    </li>
  );
}

export type NavbarBrandProps = {
  /** The logo and wordmark; it links to the Navbar's `brandHref`. */
  children: React.ReactNode;
};

/** The brand at the start, as a child instead of the `brand` prop. */
export function NavbarBrand({ children }: NavbarBrandProps) {
  return <>{children}</>;
}

export type NavbarActionsProps = {
  /** A language switcher, sign-in (subtle), then the one primary action. */
  children: React.ReactNode;
};

/** The actions at the end, as a child instead of the `actions` prop; on phones they move into the menu panel. */
export function NavbarActions({ children }: NavbarActionsProps) {
  return <>{children}</>;
}

/** Pulls `NavbarBrand` and `NavbarActions` out of the children; the rest are the items. Props win over children. */
function splitSlots(children: React.ReactNode, brand: React.ReactNode, actions: React.ReactNode) {
  let brandSlot: React.ReactNode;
  let actionsSlot: React.ReactNode;
  const items: React.ReactNode[] = [];
  for (const child of React.Children.toArray(children)) {
    if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.type === NavbarBrand) brandSlot = child.props.children;
    else if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.type === NavbarActions) actionsSlot = child.props.children;
    else items.push(child);
  }
  return { brand: brand ?? brandSlot, actions: actions ?? actionsSlot, items };
}
