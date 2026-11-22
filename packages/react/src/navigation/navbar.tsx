"use client";

import * as React from "react";
import { Link as AriaLink, useLocale } from "react-aria-components";

import { cn } from "../utils";
import { BrandLinkContext } from "./brand-link-context";
import { Button } from "../action/button";
import { languageLabel, mainNavigationLabel, openMenuLabel } from "../i18n";
import { LAYER } from "../layers";
import { Menu } from "../overlay/floating";
import { NavPanel } from "./nav-panel";

export type NavbarLink = {
  key: string;
  /** A noun for the place ("Pricing"), never a verb. */
  label: string;
  /** A page or an in-page anchor ("/#pricing"); it goes through the host router. */
  href: string;
};

export type NavbarLanguage = {
  /** The locale code shown on the switch ("tr" reads "TR"). */
  code: string;
  /** The language in itself ("English"). */
  label: string;
  /** The current page in that language. */
  href: string;
};

export type NavbarProps = {
  /** The logo and wordmark (the site's logo). It links to `brandHref`. */
  brand: React.ReactNode;
  /** Where the brand goes: the home page. */
  brandHref?: string;
  /** The brand link's name when the brand alone does not say where it goes ("Acme home"). */
  brandLabel?: string;
  /** Up to five destinations. */
  links: readonly NavbarLink[];
  /** The link of the page (or section) in view: marked `aria-current="page"`. */
  currentKey?: string;
  /** At the end: sign-in (subtle), then the one primary action, the same on every page. */
  endActions?: React.ReactNode;
  /** The language switch: shows the current code and keeps the page in the other language. */
  languages?: { current: string; items: readonly NavbarLanguage[] };
  /** Pinned to the top while the page scrolls. */
  isSticky?: boolean;
  /** 48px instead of 56px: the compact bar after the hero. */
  isCompact?: boolean;
  /** Names the navigation landmark; "Main menu" by default. */
  "aria-label"?: string;
};

const LINK =
  "inline-flex h-8 items-center rounded-ds-medium px-ds-100 text-body font-[500] text-ds-text-subtle outline-hidden transition-colors duration-(--ds-duration-fast) motion-reduce:transition-none " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[hovered]:text-ds-text data-[pressed]:bg-ds-background-neutral-pressed " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  "aria-[current=page]:bg-ds-background-neutral aria-[current=page]:text-ds-text";

/**
 * The top bar of public sites. Brand at the start, up to
 * five links (the current one on `ds-background-neutral`), then the language switch and the actions.
 * Under 768px the links, language switch and actions move into a menu panel from the end edge.
 */
export function Navbar({
  brand,
  brandHref = "/",
  brandLabel,
  links,
  currentKey,
  endActions,
  languages,
  isSticky,
  isCompact,
  "aria-label": label,
}: NavbarProps) {
  const { locale } = useLocale();
  const [open, setOpen] = React.useState(false);
  const name = label ?? mainNavigationLabel(locale);
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
  const switcher = languages && <LanguageSwitch {...languages} />;
  return (
    <header
      data-slot="navbar"
      data-compact={isCompact ? "" : undefined}
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
          isCompact ? "h-12" : "h-14",
        )}
      >
        {brandLink}
        <nav aria-label={name} data-slot="navbar-links" className="hidden md:block">
          <ul className="flex items-center gap-ds-100">
            {links.map((link) => (
              <li key={link.key}>
                <AriaLink
                  href={link.href}
                  data-slot="navbar-link"
                  aria-current={link.key === currentKey ? "page" : undefined}
                  className={LINK}
                >
                  {link.label}
                </AriaLink>
              </li>
            ))}
          </ul>
        </nav>
        <div data-slot="navbar-end" className="ms-auto flex items-center gap-ds-100">
          <div className="hidden items-center gap-ds-100 md:flex">
            {switcher}
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
            {links.map((link) => (
              <li key={link.key}>
                <AriaLink
                  href={link.href}
                  data-slot="navbar-panel-link"
                  aria-current={link.key === currentKey ? "page" : undefined}
                  className={cn(LINK, "flex h-11 w-full")}
                >
                  {link.label}
                </AriaLink>
              </li>
            ))}
          </ul>
        </nav>
        {(switcher || endActions) && (
          <div data-slot="navbar-panel-actions" className="flex flex-col items-stretch gap-ds-100 border-t border-ds-border pt-ds-200">
            {switcher && <div className="flex">{switcher}</div>}
            {endActions}
          </div>
        )}
      </NavPanel>
    </header>
  );
}

/** The current language code on a subtle button; the menu lists each language in itself, as links. */
function LanguageSwitch({ current, items }: { current: string; items: readonly NavbarLanguage[] }) {
  const { locale } = useLocale();
  const active = items.find((item) => item.code === current);
  return (
    <Menu
      aria-label={languageLabel(locale)}
      selectionMode="single"
      selectedKeys={[current]}
      items={items.map((item) => ({ id: item.code, label: item.label, href: item.href, lang: item.code }))}
      trigger={
        <Button
          variant="subtle"
          size="compact"
          iconBefore="globe"
          // The visible code is part of the name (label in name, WCAG 2.5.3): "Language: English (EN)".
          aria-label={`${languageLabel(locale)}: ${active?.label ?? current} (${current.toUpperCase()})`}
          data-slot="navbar-language"
        >
          <span aria-hidden>{current.toUpperCase()}</span>
        </Button>
      }
    />
  );
}
