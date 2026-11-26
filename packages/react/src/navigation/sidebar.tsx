"use client";

import * as React from "react";
import {
  Button as AriaButton,
  Disclosure,
  DisclosurePanel,
  Link as AriaLink,
  useLocale,
} from "react-aria-components";

import { cn } from "../utils";
import { MotionScope, type WithMotion } from "../defaults";
import { Button } from "../action/button";
import { Badge, type BadgeCountTone } from "../display/badge";
import { IconGlyph, type IconName } from "../display/icon";
import { collapseSidebarLabel, expandSidebarLabel, mainNavigationLabel } from "../i18n";
import { Menu, Tooltip, TooltipFor, type MenuEntry } from "../overlay/floating";
import { Avatar } from "../display/avatar";
import { NavPanel } from "./nav-panel";
import { ROOT_ATTRIBUTE } from "./sidebar-script";

export type SidebarItemData = {
  id: string;
  /** A noun for the section ("Orders"). */
  label: string;
  /** Lucide name; top-level items carry one (it is all a collapsed sidebar shows). */
  icon?: IconName;
  /** The page; an item with `children` is a group and has none. */
  href?: string;
  /** A count ("4 new"): a Badge after the label, on the icon when collapsed. */
  badge?: { value: number; tone?: BadgeCountTone };
  /** Nested items, shown indented on a rail under the group. */
  children?: readonly SidebarItemData[];
};

/**
 * A labelled block of items: an overline ("Filo") over its own list, not collapsible. The group is
 * named by its label (role="group" + aria-labelledby), also when the sidebar is collapsed: the label is then
 * visually hidden and a thin separator marks where the section starts.
 */
export type SidebarSectionData = {
  /** Stable key for the section; also on the DOM as `data-section`. Unique among the sections. */
  id: string;
  /** The heading over the items, already translated by the app; it is the group's accessible name. */
  label: string;
  /**
   * The section's items: links or groups with `children`, exactly as in `items`. Icons are Lucide names. Item
   * ids are unique across `items` and every section: `currentKey` marks each item with that id, so a
   * repeated id gives two `aria-current="page"` items (a development warning names it).
   */
  items: readonly SidebarItemData[];
};

export type SidebarProps = {
  /** The product name, after `logo` (or the logo and name together). It links to `brandHref`. Or a `SidebarHeader` child. */
  brand?: React.ReactNode;
  /**
   * The app's mark (an Icon or an image) before `brand`. Collapsed, the rail shows it alone, centred; the
   * name stays the link's accessible name. Without it, collapsed shows the start of `brand`.
   */
  logo?: React.ReactNode;
  brandHref?: string;
  /**
   * The top-level items (links, or groups with `children`); five to eight is the comfortable range. With
   * `sections`, these are the unlabelled items above the labelled sections (a dashboard) and may be empty. Ids
   * are unique across `items` and `sections` (a repeated id marks two items as the current page).
   * Leave it out to compose the navigation as children instead.
   */
  items?: readonly SidebarItemData[];
  /**
   * With no `items`: the navigation composed from `SidebarItem`, `SidebarSubmenu` and `SidebarSection`
   * (loose items first, then the sections), plus an optional `SidebarHeader` (instead of `brand`) and
   * `SidebarFooter` (instead of `footer`).
   */
  children?: React.ReactNode;
  /**
   * Labelled sections under `items`, in order. Each is a named group with an overline; collapsed,
   * the overline is visually hidden (the group keeps its name) and a separator stands in for it. Not
   * collapsible. Left out (or empty), the Sidebar renders exactly as before.
   */
  sections?: readonly SidebarSectionData[];
  /** The id of the page's item: marked `aria-current="page"`; its group stays open. */
  currentKey?: string;
  /** The account at the bottom: name and role after `avatar` (or Avatar, name and role together). Or a `SidebarFooter` child. */
  footer?: React.ReactNode;
  /**
   * The account's Avatar before `footer`. Collapsed, the rail shows it alone, centred, and `footer` is hidden.
   * Without it, collapsed shows the start of `footer`.
   */
  avatar?: React.ReactNode;
  /**
   * Keeps the account (`footer`) and the collapse toggle in view at the bottom: the brand stays at
   * the top and only the navigation (`items`, then `sections`) scrolls between them, expanded and
   * collapsed. In the phone panel the account stays at the bottom the same way. The DOM order, and so the Tab
   * order, is the same as without it. Off by default: the whole sidebar scrolls as one, as before.
   */
  isFooterPinned?: boolean;
  /**
   * Where the collapse toggle sits on wide screens. `footer` (default): at the end of the bottom row, beside the
   * account. `header`: beside the brand at the top; collapsed, it takes the brand's place, so the rail opens from
   * where the eye starts. The phone panel has no toggle either way.
   */
  togglePlacement?: "header" | "footer";
  /** Icons only (56px), labels in tooltips. Controlled; or `defaultCollapsed` + `onCollapsedChange`. */
  isCollapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (isCollapsed: boolean) => void;
  /**
   * Remembers the collapsed choice in localStorage under this key. Render `sidebarScript(storageKey,
   * { defaultCollapsed })` in <head> as well, with the same `defaultCollapsed`, so the first frame already
   * has the remembered width (no layout jump). Uncontrolled only: with `isCollapsed` the app owns the state.
   */
  storageKey?: string;
  /** Under 1024px the sidebar is a menu panel from the start edge; the app's menu button opens it. */
  isMobileOpen?: boolean;
  onMobileOpenChange?: (isOpen: boolean) => void;
  /** Names the navigation landmark; "Main menu" by default. */
  "aria-label"?: string;
};

function readStored(storageKey: string): boolean | undefined {
  try {
    const value = window.localStorage.getItem(storageKey);
    return value === "collapsed" ? true : value === "expanded" ? false : undefined;
  } catch {
    return undefined;
  }
}

function writeStored(storageKey: string, collapsed: boolean) {
  try {
    window.localStorage.setItem(storageKey, collapsed ? "collapsed" : "expanded");
  } catch {
    // Storage can be full or blocked: the choice lasts for this page only.
  }
}

/**
 * Collapsed styling has two sources so the first frame is right in both modes: the sidebar's own
 * `data-collapsed`, or (remembered choice) the <html> attribute the head script set before React ran.
 * Classes are written out in full so Tailwind finds them.
 */
const WHEN_COLLAPSED = {
  root: "data-[collapsed]:w-14 [:root[data-ds-sidebar=collapsed]_&]:w-14",
  label:
    "group-data-[collapsed]/sidebar:sr-only [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:sr-only",
  hidden:
    "group-data-[collapsed]/sidebar:hidden [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:hidden",
  /** Shown only collapsed (the section separator). */
  shown:
    "hidden group-data-[collapsed]/sidebar:block [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:block",
  badge:
    "group-data-[collapsed]/sidebar:absolute group-data-[collapsed]/sidebar:-top-1 group-data-[collapsed]/sidebar:end-0 " +
    "[:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:absolute [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:-top-1 [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:end-0",
  /**
   * The account in the 56px rail: exactly the 32px avatar, no padding around it, centred. The 8px
   * padding it kept before cut the avatar in half.
   */
  clip:
    "group-data-[collapsed]/sidebar:w-8 group-data-[collapsed]/sidebar:flex-none group-data-[collapsed]/sidebar:justify-start group-data-[collapsed]/sidebar:overflow-hidden group-data-[collapsed]/sidebar:p-0 " +
    "[:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:w-8 [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:flex-none [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:justify-start [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:overflow-hidden [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:p-0",
  /** With a `logo` or `avatar`: only that mark is left, so the 32px box centres it. */
  centre:
    "group-data-[collapsed]/sidebar:justify-center [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:justify-center",
} as const;

/**
 * The scrollbar on the sidebar's link list, as on ScrollArea: thin, no track, its thumb shown
 * only on hover, keyboard focus inside the list, or while scrolling. A long list no longer shows a grey bar the full
 * height of the panel. Native underneath, so wheel, touch and keyboard scroll as before.
 */
const SCROLLBAR =
  "[scrollbar-width:thin] [scrollbar-color:transparent_transparent] " +
  "hover:[scrollbar-color:color-mix(in_oklab,var(--ds-border-bold)_70%,transparent)_transparent] " +
  "focus-within:[scrollbar-color:color-mix(in_oklab,var(--ds-border-bold)_70%,transparent)_transparent]";

/**
 * The bottom block: a two-column grid, so the account and the collapse toggle share one row (the
 * account takes the room, the toggle sits at its end) A divider sets
 * the account row off from the links. Collapsed, the rail is one column: the account above the toggle, both centred.
 * The children and their order are unchanged.
 */
const BOTTOM =
  // No column gap: the divider over the account and the toggle reads as one line.
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-0 gap-y-ds-100 " +
  "group-data-[collapsed]/sidebar:grid-cols-1 group-data-[collapsed]/sidebar:justify-items-center " +
  "[:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:grid-cols-1 [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:justify-items-center";
/** The account: the room of the row. Square, so the divider over it ends straight; its Pressable keeps its own radius. */
const FOOTER = "flex min-w-0 items-center gap-ds-100 p-ds-050";
/** The divider runs the full width of the account row: over the account and the toggle alike. */
const FOOTER_RULE = "border-t border-ds-border pt-ds-150";

/**
 * `isFooterPinned`: the scrolling part between the brand and the pinned bottom. It reaches out over
 * the sidebar's padding (and takes it back inside), so the scrollbar sits on the sidebar's edge; its scroll padding
 * matches that inset, so a row that focus scrolls into view stops short of the edge and its ring is never clipped. Collapsed, the 56px rail has no room for a scrollbar beside the icons,
 * so it is hidden there (wheel, touch and focus still scroll). Written out in full so Tailwind finds them.
 */
const PINNED = {
  scroll:
    "-mx-ds-150 -my-ds-050 flex min-h-0 flex-1 flex-col gap-ds-200 overflow-x-hidden overflow-y-auto overscroll-contain px-ds-150 py-ds-050 scroll-py-ds-050 " + SCROLLBAR + " " +
    "group-data-[collapsed]/sidebar:[scrollbar-width:none] [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:[scrollbar-width:none]",
  /** The phone panel: its content box has 16px padding; the list scrolls, the account stays below it. */
  panelScroll: "-mx-ds-200 -my-ds-050 flex min-h-0 flex-1 flex-col gap-ds-200 overflow-y-auto overscroll-contain px-ds-200 py-ds-050 scroll-py-ds-050 " + SCROLLBAR,
} as const;

/** The overline over a labelled section. */
const OVERLINE = "px-ds-100 pt-ds-100 pb-ds-050 text-heading-xxsmall text-ds-text-subtlest";

const ROW =
  "relative flex h-8 w-full items-center gap-ds-100 rounded-ds-medium px-ds-100 text-body font-medium text-ds-text-subtle outline-hidden " +
  "transition-colors duration-(--ds-duration-fast) motion-reduce:transition-none " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[hovered]:text-ds-text data-[pressed]:bg-ds-background-neutral-pressed " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  // The page in view: a soft neutral fill and the full text color, no edge marker (a 2px inset bent into a bracket on
  // the rounded row). One step darker than the sunken sidebar ground, which equals ds-background-neutral.
  "aria-[current=page]:bg-ds-background-neutral-hovered aria-[current=page]:text-ds-text aria-[current=page]:data-[hovered]:bg-ds-background-neutral-hovered " +
  // Collapsed: the icon alone, centred in the 56px rail.
  "group-data-[collapsed]/sidebar:justify-center [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:justify-center";

const ICON = "text-ds-icon-subtle group-aria-[current=page]/row:text-ds-icon-brand";

const contains = (item: SidebarItemData, key: string | undefined): boolean =>
  !!key && (item.id === key || !!item.children?.some((child) => contains(child, key)));

type Shared = { currentKey?: string; collapsed: boolean; expand: () => void };

/** Every item id in the trees, depth first, repeats included. */
function itemIds(items: readonly SidebarItemData[], into: string[] = []): string[] {
  for (const item of items) {
    into.push(item.id);
    if (item.children) itemIds(item.children, into);
  }
  return into;
}

/**
 * Item ids that repeat across `items` and `sections`, said once per set of ids, in development only
 * (the Table's repeated-id warning does the same). A repeated id would mark two items `aria-current="page"`.
 *
 */
function repeatedIds(items: readonly SidebarItemData[], sections: readonly SidebarSectionData[] | undefined) {
  const ids = itemIds(items);
  for (const section of sections ?? []) itemIds(section.items, ids);
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) (seen.has(id) ? repeated : seen).add(id);
  return [...repeated].map((id) => JSON.stringify(id)).join(", ");
}

function useRepeatedIdWarning(items: readonly SidebarItemData[], sections: readonly SidebarSectionData[] | undefined) {
  // Production never warns, so it never walks the trees either; the hooks below still run in order.
  const signature = process.env.NODE_ENV === "production" ? "" : repeatedIds(items, sections);
  const warned = React.useRef<Set<string> | null>(null);
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || !signature) return;
    warned.current ??= new Set();
    if (warned.current.has(signature)) return;
    warned.current.add(signature);
    console.warn(`Sidebar: the item ids ${signature} repeat across items and sections. Give every item its own id; currentKey marks each item with that id as the current page.`);
  }, [signature]);
}

/**
 * The main navigation of admin apps: brand, sections with nested items, optional
 * labelled `sections` and the account. Collapses to 56px icons
 * (tooltips carry the labels); under 1024px it is a menu panel from the start edge.
 */
function SidebarBody({
  brand: brandProp,
  logo: logoProp,
  brandHref = "/",
  items,
  children,
  sections,
  currentKey,
  footer: footerProp,
  avatar: avatarProp,
  isFooterPinned = false,
  togglePlacement = "footer",
  isCollapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  storageKey,
  isMobileOpen = false,
  onMobileOpenChange,
  "aria-label": label,
}: SidebarProps) {
  const { locale, direction } = useLocale();
  const slots = splitSlots(children);
  const { nav } = slots;
  const brand = brandProp ?? slots.header;
  const logo = logoProp ?? slots.logo;
  const footer = footerProp ?? slots.footer;
  const avatar = avatarProp ?? slots.avatar;
  const hasBrand = brand != null || logo != null;
  const hasFooter = footer != null || avatar != null;
  const name = label ?? mainNavigationLabel(locale);
  const [own, setOwn] = React.useState(defaultCollapsed);
  // The remembered choice is read after hydration (the head script already painted it).
  React.useLayoutEffect(() => {
    if (!storageKey) return;
    const stored = readStored(storageKey);
    if (stored !== undefined) setOwn(stored);
  }, [storageKey]);
  const collapsed = isCollapsed ?? own;
  React.useLayoutEffect(() => {
    if (storageKey) document.documentElement.setAttribute(ROOT_ATTRIBUTE, collapsed ? "collapsed" : "expanded");
  }, [storageKey, collapsed]);
  const setCollapsed = (next: boolean) => {
    if (isCollapsed === undefined) setOwn(next);
    if (storageKey) writeStored(storageKey, next);
    onCollapsedChange?.(next);
  };
  const toggleLabel = collapsed ? expandSidebarLabel(locale) : collapseSidebarLabel(locale);
  const shared: Shared = { currentKey, collapsed, expand: () => setCollapsed(false) };
  const labelled = sections && sections.length > 0 ? sections : undefined;
  useRepeatedIdWarning(items ?? [], labelled);
  const toggle = (
    <Tooltip content={toggleLabel} placement="end">
      <Button
        variant="subtle"
        size="small"
        iconOnly
        // The panel edge is the inline start: left in LTR, right in RTL.
        iconBefore={
          direction === "rtl"
            ? collapsed ? "panel-right-open" : "panel-right-close"
            : collapsed ? "panel-left-open" : "panel-left-close"
        }
        aria-label={toggleLabel}
        aria-expanded={!collapsed}
        onPress={() => setCollapsed(!collapsed)}
      />
    </Tooltip>
  );

  return (
    <>
      <nav
        aria-label={name}
        data-slot="sidebar"
        // Remembered choice: the <html> attribute styles it, so the server and first client render agree.
        data-collapsed={!storageKey && collapsed ? "" : undefined}
        className={cn(
          "group/sidebar sticky top-0 hidden h-dvh max-h-full w-60 shrink-0 flex-col gap-ds-200 overflow-x-hidden overflow-y-auto border-e border-ds-border bg-ds-surface-sunken px-ds-150 py-ds-200 lg:flex",
          "transition-[width] duration-(--ds-duration-medium) ease-ds-standard motion-reduce:transition-none",
          WHEN_COLLAPSED.root,
          // Pinned: the nav no longer scrolls as one; its middle part does.
          isFooterPinned ? "overflow-y-hidden" : SCROLLBAR,
        )}
        data-footer-pinned={isFooterPinned ? "" : undefined}
      >
        {togglePlacement === "header" ? (
          // The brand, then the toggle at the row's end; collapsed, the toggle alone takes the brand's place.
          <div data-slot="sidebar-header" className={cn("flex min-h-8 shrink-0 items-center justify-between gap-ds-100", WHEN_COLLAPSED.centre)}>
            {hasBrand && (
              <div className={cn("flex min-w-0 flex-1", WHEN_COLLAPSED.hidden)}>
                <Brand brand={brand} logo={logo} href={brandHref} />
              </div>
            )}
            <div data-slot="sidebar-toggle" className="flex shrink-0">
              {toggle}
            </div>
          </div>
        ) : (
          hasBrand && <Brand brand={brand} logo={logo} href={brandHref} />
        )}
        {isFooterPinned ? (
          <div data-slot="sidebar-scroll" className={PINNED.scroll}>
            <Navigation items={items} nodes={nav} sections={labelled} shared={shared} />
          </div>
        ) : (
          <Navigation items={items} nodes={nav} sections={labelled} shared={shared} />
        )}
        {(hasFooter || togglePlacement === "footer") && (
          <div className={cn(BOTTOM, isFooterPinned ? "shrink-0" : "mt-auto")}>
            {hasFooter && (
              <SharedContext.Provider value={shared}>
                <Account footer={footer} avatar={avatar} className={cn(FOOTER_RULE, WHEN_COLLAPSED.clip, avatar != null && WHEN_COLLAPSED.centre)} />
              </SharedContext.Provider>
            )}
            {togglePlacement === "footer" && (
            <div
              data-slot="sidebar-toggle"
              className={cn(
                "flex justify-end group-data-[collapsed]/sidebar:justify-center [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:justify-center",
                // Beside the account, under the same divider; alone, it keeps the row's end.
                hasFooter ? cn(FOOTER_RULE, "self-stretch items-center ps-ds-050 group-data-[collapsed]/sidebar:border-t-0 group-data-[collapsed]/sidebar:pt-0 [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:border-t-0 [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:pt-0") : "col-span-full",
              )}
            >
              {toggle}
            </div>
            )}
          </div>
        )}
      </nav>
      <NavPanel
        isOpen={isMobileOpen}
        onOpenChange={(open) => onMobileOpenChange?.(open)}
        label={name}
        side="start"
        slot="sidebar"
        header={hasBrand ? <Brand brand={brand} logo={logo} href={brandHref} /> : undefined}
      >
        {/* The dialog already carries the name; a second landmark name would be read twice. */}
        {isFooterPinned ? (
          // Pinned: the list scrolls inside the panel and the account stays at its bottom edge.
          <nav className="flex min-h-0 flex-1 flex-col gap-ds-200" data-footer-pinned="">
            <div data-slot="sidebar-scroll" className={PINNED.panelScroll}>
              <Navigation items={items} nodes={nav} sections={labelled} shared={{ ...shared, collapsed: false }} />
            </div>
            {hasFooter && <Account footer={footer} avatar={avatar} className={cn(FOOTER_RULE, "shrink-0")} />}
          </nav>
        ) : (
          <nav className="flex flex-1 flex-col gap-ds-200">
            <Navigation items={items} nodes={nav} sections={labelled} shared={{ ...shared, collapsed: false }} />
            {hasFooter && <Account footer={footer} avatar={avatar} className={cn(FOOTER_RULE, "mt-auto")} />}
          </nav>
        )}
      </NavPanel>
    </>
  );
}

/**
 * The brand link. With a `logo`, the name is a separate span that collapses to visually hidden, so the rail
 * shows the logo alone and the link keeps the name. Without one, the content is kept as given and the 32px box
 * shows its start.
 */
function Brand({ brand, logo, href }: { brand: React.ReactNode; logo: React.ReactNode; href: string }) {
  return (
    <AriaLink
      href={href}
      data-slot="sidebar-brand"
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-ds-100 rounded-ds-medium px-ds-100 text-body-strong text-ds-text outline-hidden data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused",
        WHEN_COLLAPSED.clip,
        logo != null && WHEN_COLLAPSED.centre,
      )}
    >
      {logo == null ? (
        brand
      ) : (
        <>
          <span data-slot="sidebar-brand-logo" className="flex shrink-0 items-center">{logo}</span>
          {brand != null && <span data-slot="sidebar-brand-name" className={cn("min-w-0 truncate", WHEN_COLLAPSED.label)}>{brand}</span>}
        </>
      )}
    </AriaLink>
  );
}

/**
 * The account block. With an `avatar`, the rest of the account is hidden collapsed (it may hold controls, so
 * not merely visually hidden) and the rail shows the Avatar alone.
 */
function Account({ footer, avatar, className }: { footer: React.ReactNode; avatar: React.ReactNode; className?: string }) {
  return (
    <div data-slot="sidebar-footer" className={cn(FOOTER, className)}>
      {avatar == null ? (
        footer
      ) : (
        <>
          <span data-slot="sidebar-footer-avatar" className="flex shrink-0">{avatar}</span>
          {footer != null && <div data-slot="sidebar-footer-content" className={cn("flex min-w-0 flex-1 items-center gap-ds-100", WHEN_COLLAPSED.hidden)}>{footer}</div>}
        </>
      )}
    </div>
  );
}

/**
 * The top list, then the labelled sections. One child in its parent either way, so without sections the tree
 * (and the server's useId ids) is exactly what it was before sections existed.
 */
function Navigation({ items, nodes, sections, shared }: { items?: readonly SidebarItemData[]; nodes: React.ReactNode[]; sections?: readonly SidebarSectionData[]; shared: Shared }) {
  if (!items) return <ComposedNavigation nodes={nodes} shared={shared} />;
  if (!sections) return <Tree items={items} shared={shared} />;
  return (
    <>
      {/* With sections, an empty top list is left out; without them it renders (also empty), as before. */}
      {items.length > 0 && <Tree items={items} shared={shared} />}
      <Sections sections={sections} shared={shared} />
    </>
  );
}

function Sections({ sections, shared }: { sections: readonly SidebarSectionData[]; shared: Shared }) {
  return (
    <div data-slot="sidebar-sections" className="flex flex-col gap-ds-100">
      {sections.map((section) => (
        <Section key={section.id} section={section} shared={shared} />
      ))}
    </div>
  );
}

/** A labelled section: an overline that names the group, plus a separator that shows only collapsed. */
function Section({ section, shared }: { section: SidebarSectionData; shared: Shared }) {
  return (
    <SectionBlock id={section.id} label={section.label}>
      <Tree items={section.items} shared={shared} />
    </SectionBlock>
  );
}

function SectionBlock({ id: sectionId, label, children }: { id?: string; label: string; children: React.ReactNode }) {
  const id = React.useId();
  return (
    <div role="group" aria-labelledby={id} data-slot="sidebar-nav-section" data-section={sectionId} className="flex flex-col gap-0.5">
      <span aria-hidden="true" data-slot="sidebar-nav-section-separator" className={cn("mx-ds-050 mb-ds-100 border-t border-ds-border", WHEN_COLLAPSED.shown)} />
      <span id={id} data-slot="sidebar-nav-section-label" className={cn(OVERLINE, WHEN_COLLAPSED.label)}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Tree({ items, shared, nested }: { items: readonly SidebarItemData[]; shared: Shared; nested?: boolean }) {
  return (
    <ul data-slot={nested ? "sidebar-subtree" : "sidebar-tree"} className="flex flex-col gap-0.5">
      {items.map((item) => (
        <li key={item.id}>
          {item.children ? (
            <GroupItem item={item} shared={shared} holdsCurrent={contains(item, shared.currentKey)}>
              <Tree items={item.children} shared={shared} nested />
            </GroupItem>
          ) : (
            <LinkItem item={item} shared={shared} nested={nested} />
          )}
        </li>
      ))}
    </ul>
  );
}

/** What a row shows, from data or from a `SidebarItem`/`SidebarSubmenu`. */
type Entry = Pick<SidebarItemData, "id" | "label" | "icon" | "href" | "badge"> & { isCurrent?: boolean };

function Label({ item }: { item: Entry }) {
  return (
    <>
      {item.icon && <IconGlyph name={item.icon} data-slot="sidebar-item-icon" className={ICON} />}
      <span data-slot="sidebar-item-label" className={cn("min-w-0 flex-1 truncate text-start", WHEN_COLLAPSED.label)}>
        {item.label}
      </span>
      {item.badge && item.badge.value > 0 && (
        <span data-slot="sidebar-item-badge" className={cn("ms-auto", WHEN_COLLAPSED.badge)}>
          <Badge variant="count" value={item.badge.value} tone={item.badge.tone} />
        </span>
      )}
    </>
  );
}

function LinkItem({ item, shared, nested }: { item: Entry; shared: Shared; nested?: boolean }) {
  const link = (
    <AriaLink
      href={item.href}
      data-slot="sidebar-item"
      aria-current={item.isCurrent || item.id === shared.currentKey ? "page" : undefined}
      className={cn("group/row", ROW)}
    >
      <Label item={item} />
    </AriaLink>
  );
  return shared.collapsed && !nested ? (
    <TooltipFor content={item.label} placement="end">
      {link}
    </TooltipFor>
  ) : (
    link
  );
}

function GroupItem({ item, shared, holdsCurrent, children }: { item: Entry; shared: Shared; holdsCurrent: boolean; children: React.ReactNode }) {
  const [expanded, setExpanded] = React.useState(holdsCurrent);
  // The group of the page's item stays open as the page changes.
  const [wasHolding, setWasHolding] = React.useState(holdsCurrent);
  if (wasHolding !== holdsCurrent) {
    setWasHolding(holdsCurrent);
    if (holdsCurrent) setExpanded(true);
  }
  const trigger = (
    <AriaButton
      slot="trigger"
      data-slot="sidebar-group-trigger"
      // Collapsed, the group holding the page is the only mark of where the reader is.
      data-current={holdsCurrent ? "" : undefined}
      // Collapsed, a group's icon opens the sidebar on that group.
      onPress={shared.collapsed ? shared.expand : undefined}
      className={cn(
        "group/row",
        ROW,
        "group-data-[collapsed]/sidebar:data-[current]:bg-ds-background-neutral-hovered [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:data-[current]:bg-ds-background-neutral-hovered",
      )}
    >
      <Label item={item} />
      <IconGlyph
        name="chevron-down"
        size="small"
        data-slot="sidebar-group-chevron"
        className={cn("text-ds-icon-subtle transition-transform duration-(--ds-duration-fast) group-aria-expanded/row:rotate-180 motion-reduce:transition-none", WHEN_COLLAPSED.hidden)}
      />
    </AriaButton>
  );
  return (
    <Disclosure
      // Collapsed, the panel is hidden, so it reports closed; pressing it opens the sidebar on the group.
      isExpanded={!shared.collapsed && expanded}
      onExpandedChange={(next) => setExpanded(shared.collapsed ? true : next)}
      data-slot="sidebar-group"
    >
      {shared.collapsed ? (
        <TooltipFor content={item.label} placement="end">
          {trigger}
        </TooltipFor>
      ) : (
        trigger
      )}
      <DisclosurePanel data-slot="sidebar-group-panel" className={WHEN_COLLAPSED.hidden}>
        <div className="mt-0.5 ps-ds-400">{children}</div>
      </DisclosurePanel>
    </Disclosure>
  );
}


// ---- Composed from parts ---------------------------------------------------------------------------------------

/** The sidebar's state for its parts: the page's item, collapsed or not (never collapsed in the phone panel). */
const SharedContext = React.createContext<Shared | null>(null);
/** True inside a `SidebarSubmenu`: its items are indented rows with no tooltip of their own. */
const NestedContext = React.createContext(false);

function useShared(part: string): Shared {
  const shared = React.useContext(SharedContext);
  if (!shared) throw new Error(`${part} must be inside a Sidebar.`);
  return shared;
}

export type SidebarHeaderProps = {
  /** The product name (or the logo and name together); it links to the Sidebar's `brandHref`. */
  children?: React.ReactNode;
  /** The app's mark before the name; collapsed, the rail shows it alone. As the Sidebar's `logo`. */
  logo?: React.ReactNode;
};

/**
 * The account row's trigger: the nav row's hover, press, focus and radius, so it reads as one of them. Expanded it is
 * the avatar with the name over a second line; collapsed it is a 32px square, exactly a collapsed nav item, with the
 * 24px avatar centred where an icon sits.
 */
const ACCOUNT_TRIGGER =
  "relative flex min-h-8 w-full cursor-pointer items-center gap-ds-100 rounded-ds-medium px-ds-100 py-ds-050 text-start outline-hidden " +
  "transition-colors duration-(--ds-duration-fast) motion-reduce:transition-none " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[pressed]:bg-ds-background-neutral-pressed " +
  "aria-expanded:bg-ds-background-neutral-hovered " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  "group-data-[collapsed]/sidebar:size-8 group-data-[collapsed]/sidebar:min-h-0 group-data-[collapsed]/sidebar:justify-center group-data-[collapsed]/sidebar:p-0 " +
  "[:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:size-8 [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:min-h-0 [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:justify-center [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:p-0";

export type SidebarAccountProps = {
  /** The person's name: the row's first line, the trigger's name and, collapsed, its tooltip. */
  name: string;
  /** The second line: an email or a role. */
  description?: string;
  /** A photo; the name's initials otherwise. */
  avatarSrc?: string;
  /** The account menu: profile, settings, sign out (a `danger` item goes last). */
  items: readonly MenuEntry[];
  onAction?: (id: React.Key) => void;
};

/**
 * The signed-in person at the bottom of the sidebar, as the `footer` (or in a `SidebarFooter`): a row that opens the
 * account menu. Collapsed it stays reachable as a square the size of a nav icon, its avatar centred, with the name
 * as its tooltip, so sign-out is never hidden behind expanding the sidebar.
 */
export function SidebarAccount({ name, description, avatarSrc, items, onAction }: SidebarAccountProps) {
  // In the footer, outside the navigation's context; the phone panel never collapses.
  const collapsed = React.useContext(SharedContext)?.collapsed ?? false;
  const trigger = (
    <AriaButton data-slot="sidebar-account" aria-label={name} className={ACCOUNT_TRIGGER}>
      {/* The button is named by the person alone; the avatar's own name would say it twice. */}
      <span aria-hidden className="flex shrink-0">
        <Avatar name={name} src={avatarSrc} size="small" />
      </span>
      <span data-slot="sidebar-account-text" className={cn("flex min-w-0 flex-1 flex-col", WHEN_COLLAPSED.label)}>
        <span className="truncate text-body font-medium text-ds-text">{name}</span>
        {description && <span className="truncate text-body-small text-ds-text-subtle">{description}</span>}
      </span>
      <IconGlyph name="chevrons-up-down" size="small" className={cn("shrink-0 text-ds-icon-subtle", WHEN_COLLAPSED.hidden)} />
    </AriaButton>
  );
  return (
    <Menu
      trigger={collapsed ? <TooltipFor content={name} placement="end">{trigger}</TooltipFor> : trigger}
      items={items}
      onAction={onAction && ((id) => onAction(id))}
      placement={collapsed ? "end bottom" : "top start"}
    />
  );
}

/** The brand at the top, as a child instead of the `brand` prop. */
export function SidebarHeader({ children }: SidebarHeaderProps) {
  return <>{children}</>;
}

export type SidebarFooterProps = {
  /** The account's name and role (or Avatar, name and role together). */
  children?: React.ReactNode;
  /** The account's Avatar before the rest; collapsed, the rail shows it alone. As the Sidebar's `avatar`. */
  avatar?: React.ReactNode;
};

/** The account at the bottom, as a child instead of the `footer` prop; it shares a row with the collapse toggle. */
export function SidebarFooter({ children }: SidebarFooterProps) {
  return <>{children}</>;
}

export type SidebarItemProps = {
  /** Unique in the sidebar; `currentKey` matches it. */
  id: string;
  /** A noun for the page ("Orders"); also the tooltip when the sidebar is collapsed. */
  label: string;
  /** Lucide name; top-level items carry one (it is all a collapsed sidebar shows). */
  icon?: IconName;
  href?: string;
  /** A count ("4 new"): a Badge after the label, on the icon when collapsed. */
  badge?: { value: number; tone?: BadgeCountTone };
  /** Marks this item as the page in view, instead of the Sidebar's `currentKey`. */
  isCurrent?: boolean;
};

/** One link in the navigation: at the top, in a `SidebarSection`, or nested in a `SidebarSubmenu`. */
export function SidebarItem(props: SidebarItemProps) {
  const shared = useShared("SidebarItem");
  const nested = React.useContext(NestedContext);
  return (
    <li>
      <LinkItem item={props} shared={shared} nested={nested} />
    </li>
  );
}

export type SidebarSubmenuProps = Omit<SidebarItemProps, "href" | "isCurrent"> & {
  /** The nested `SidebarItem`s, shown indented when it is open. */
  children: React.ReactNode;
};

/** An item that opens to nested items. It starts open, and stays open, while it holds the page in view. */
export function SidebarSubmenu({ children, ...item }: SidebarSubmenuProps) {
  const shared = useShared("SidebarSubmenu");
  return (
    <li>
      <GroupItem item={item} shared={shared} holdsCurrent={holdsKey(children, shared.currentKey)}>
        <NestedContext.Provider value={true}>
          <ul data-slot="sidebar-subtree" className="flex flex-col gap-0.5">
            {children}
          </ul>
        </NestedContext.Provider>
      </GroupItem>
    </li>
  );
}

export type SidebarSectionProps = {
  /** Also on the DOM as `data-section`. */
  id?: string;
  /** The overline over the items, already translated; it names the group, also when collapsed. */
  label: string;
  /** `SidebarItem`s and `SidebarSubmenu`s. */
  children: React.ReactNode;
};

/** A labelled block of items with an overline; collapsed, a thin separator stands in for the overline. */
export function SidebarSection({ id, label, children }: SidebarSectionProps) {
  useShared("SidebarSection");
  return (
    <SectionBlock id={id} label={label}>
      <ul data-slot="sidebar-tree" className="flex flex-col gap-0.5">
        {children}
      </ul>
    </SectionBlock>
  );
}

/** Whether an item among these elements (at any depth) is the page in view. */
function holdsKey(children: React.ReactNode, key: string | undefined): boolean {
  return React.Children.toArray(children).some((child) => {
    if (!React.isValidElement<{ id?: string; isCurrent?: boolean; children?: React.ReactNode }>(child)) return false;
    return (!!key && child.props.id === key) || !!child.props.isCurrent || holdsKey(child.props.children, key);
  });
}

/** Pulls the `SidebarHeader` and `SidebarFooter` out of the children; the rest is the navigation. */
function splitSlots(children: React.ReactNode) {
  let header: React.ReactNode;
  let logo: React.ReactNode;
  let footer: React.ReactNode;
  let avatar: React.ReactNode;
  const nav: React.ReactNode[] = [];
  for (const child of React.Children.toArray(children)) {
    if (React.isValidElement<SidebarHeaderProps>(child) && child.type === SidebarHeader) {
      header = child.props.children;
      logo = child.props.logo;
    } else if (React.isValidElement<SidebarFooterProps>(child) && child.type === SidebarFooter) {
      footer = child.props.children;
      avatar = child.props.avatar;
    } else nav.push(child);
  }
  return { header, logo, footer, avatar, nav };
}

/** The composed navigation: loose items in one list, then the sections, as with `items` and `sections`. */
function ComposedNavigation({ nodes, shared }: { nodes: React.ReactNode[]; shared: Shared }) {
  const isSection = (node: React.ReactNode) => React.isValidElement(node) && node.type === SidebarSection;
  const loose = nodes.filter((node) => !isSection(node));
  const sections = nodes.filter(isSection);
  return (
    <SharedContext.Provider value={shared}>
      {loose.length > 0 && (
        <ul data-slot="sidebar-tree" className="flex flex-col gap-0.5">
          {loose}
        </ul>
      )}
      {sections.length > 0 && (
        <div data-slot="sidebar-sections" className="flex flex-col gap-ds-100">
          {sections}
        </div>
      )}
    </SharedContext.Provider>
  );
}

/** Sidebar with its own `motion` (auto, reduce or none); see SidebarBody for the component itself. */
export function Sidebar({ motion, ...props }: SidebarProps & WithMotion) {
  return (
    <MotionScope motion={motion}>
      <SidebarBody {...(props as SidebarProps)} />
    </MotionScope>
  );
}
