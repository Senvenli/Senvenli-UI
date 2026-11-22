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
import { Tooltip, TooltipFor } from "../overlay/floating";
import { NavPanel } from "./nav-panel";
import { ROOT_ATTRIBUTE } from "./sidebar-script";

export type SidebarItem = {
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
  children?: readonly SidebarItem[];
};

/**
 * A labelled block of items: an overline ("Filo") over its own list, not collapsible. The group is
 * named by its label (role="group" + aria-labelledby), also when the sidebar is collapsed: the label is then
 * visually hidden and a thin separator marks where the section starts.
 */
export type SidebarSection = {
  /** Stable key for the section; also on the DOM as `data-section`. Unique among the sections. */
  id: string;
  /** The heading over the items, already translated by the app; it is the group's accessible name. */
  label: string;
  /**
   * The section's items: links or groups with `children`, exactly as in `items`. Icons are Lucide names. Item
   * ids are unique across `items`, every section and `settings`: `currentKey` marks each item with that id, so a
   * repeated id gives two `aria-current="page"` items (a development warning names it).
   */
  items: readonly SidebarItem[];
};

export type SidebarProps = {
  /** The logo and product name (the app's logo). It links to `brandHref`. */
  brand: React.ReactNode;
  brandHref?: string;
  /**
   * The top-level items (links, or groups with `children`); five to eight is the comfortable range. With
   * `sections`, these are the unlabelled items above the labelled sections (a dashboard) and may be empty. Ids
   * are unique across `items`, `sections` and `settings` (a repeated id marks two items as the current page).
   */
  items: readonly SidebarItem[];
  /**
   * Labelled sections under `items`, in order. Each is a named group with an overline; collapsed,
   * the overline is visually hidden (the group keeps its name) and a separator stands in for it. Not
   * collapsible. Left out (or empty), the Sidebar renders exactly as before.
   */
  sections?: readonly SidebarSection[];
  /** Settings, in their own group at the bottom, under an overline ("Settings"). */
  settings?: { label: string; items: readonly SidebarItem[] };
  /** The id of the page's item: marked `aria-current="page"`; its group stays open. */
  currentKey?: string;
  /** The account at the bottom: Avatar, name and role. */
  footer?: React.ReactNode;
  /**
   * Keeps the account (`footer`) and the collapse toggle in view at the bottom: the brand stays at
   * the top and only the navigation (`items`, `sections`, then `settings`) scrolls between them, expanded and
   * collapsed. In the phone panel the account stays at the bottom the same way. The DOM order, and so the Tab
   * order, is the same as without it. Off by default: the whole sidebar scrolls as one, as before.
   */
  isFooterPinned?: boolean;
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
    "group-data-[collapsed]/sidebar:w-8 group-data-[collapsed]/sidebar:flex-none group-data-[collapsed]/sidebar:justify-center group-data-[collapsed]/sidebar:overflow-hidden group-data-[collapsed]/sidebar:p-0 " +
    "[:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:w-8 [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:flex-none [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:justify-center [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:overflow-hidden [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:p-0",
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
 * account takes the room, the toggle sits at its end) while settings, when there, span the row above. A divider sets
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

/** The overline over a labelled group (settings, sections). */
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

const contains = (item: SidebarItem, key: string | undefined): boolean =>
  !!key && (item.id === key || !!item.children?.some((child) => contains(child, key)));

type Shared = { currentKey?: string; collapsed: boolean; expand: () => void };

/** Every item id in the trees, depth first, repeats included. */
function itemIds(items: readonly SidebarItem[], into: string[] = []): string[] {
  for (const item of items) {
    into.push(item.id);
    if (item.children) itemIds(item.children, into);
  }
  return into;
}

/**
 * Item ids that repeat across `items`, `sections` and `settings`, said once per set of ids, in development only
 * (the Table's repeated-id warning does the same). A repeated id would mark two items `aria-current="page"`.
 *
 */
function repeatedIds(items: readonly SidebarItem[], sections: readonly SidebarSection[] | undefined, settings: readonly SidebarItem[] | undefined) {
  const ids = itemIds(items);
  for (const section of sections ?? []) itemIds(section.items, ids);
  if (settings) itemIds(settings, ids);
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) (seen.has(id) ? repeated : seen).add(id);
  return [...repeated].map((id) => JSON.stringify(id)).join(", ");
}

function useRepeatedIdWarning(items: readonly SidebarItem[], sections: readonly SidebarSection[] | undefined, settings: readonly SidebarItem[] | undefined) {
  // Production never warns, so it never walks the trees either; the hooks below still run in order.
  const signature = process.env.NODE_ENV === "production" ? "" : repeatedIds(items, sections, settings);
  const warned = React.useRef<Set<string> | null>(null);
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || !signature) return;
    warned.current ??= new Set();
    if (warned.current.has(signature)) return;
    warned.current.add(signature);
    console.warn(`Sidebar: the item ids ${signature} repeat across items, sections and settings. Give every item its own id; currentKey marks each item with that id as the current page.`);
  }, [signature]);
}

/**
 * The main navigation of admin apps: brand, sections with nested items, optional
 * labelled `sections`, settings at the bottom and the account. Collapses to 56px icons
 * (tooltips carry the labels); under 1024px it is a menu panel from the start edge.
 */
function SidebarBody({
  brand,
  brandHref = "/",
  items,
  sections,
  settings,
  currentKey,
  footer,
  isFooterPinned = false,
  isCollapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  storageKey,
  isMobileOpen = false,
  onMobileOpenChange,
  "aria-label": label,
}: SidebarProps) {
  const { locale, direction } = useLocale();
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
  useRepeatedIdWarning(items, labelled, settings?.items);

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
        <Brand brand={brand} href={brandHref} />
        {isFooterPinned ? (
          <div data-slot="sidebar-scroll" className={PINNED.scroll}>
            <Navigation items={items} sections={labelled} shared={shared} />
            {/* Settings close the list, held at its bottom (above the account) while the list is short. */}
            {settings && <Group label={settings.label} items={settings.items} shared={shared} className="mt-auto" />}
          </div>
        ) : (
          <Navigation items={items} sections={labelled} shared={shared} />
        )}
        <div className={cn(BOTTOM, isFooterPinned ? "shrink-0" : "mt-auto")}>
          {settings && !isFooterPinned && <Group label={settings.label} items={settings.items} shared={shared} className="col-span-full" />}
          {footer && <div data-slot="sidebar-footer" className={cn(FOOTER, FOOTER_RULE, WHEN_COLLAPSED.clip)}>{footer}</div>}
          <div
            data-slot="sidebar-toggle"
            className={cn(
              "flex justify-end group-data-[collapsed]/sidebar:justify-center [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:justify-center",
              // Beside the account, under the same divider; alone, it keeps the row's end.
              footer ? cn(FOOTER_RULE, "self-stretch items-center ps-ds-050 group-data-[collapsed]/sidebar:border-t-0 group-data-[collapsed]/sidebar:pt-0 [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:border-t-0 [:root[data-ds-sidebar=collapsed]_[data-slot=sidebar]_&]:pt-0") : "col-span-full",
            )}
          >
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
          </div>
        </div>
      </nav>
      <NavPanel
        isOpen={isMobileOpen}
        onOpenChange={(open) => onMobileOpenChange?.(open)}
        label={name}
        side="start"
        slot="sidebar"
        header={<Brand brand={brand} href={brandHref} />}
      >
        {/* The dialog already carries the name; a second landmark name would be read twice. */}
        {isFooterPinned ? (
          // Pinned: the list scrolls inside the panel and the account stays at its bottom edge.
          <nav className="flex min-h-0 flex-1 flex-col gap-ds-200" data-footer-pinned="">
            <div data-slot="sidebar-scroll" className={PINNED.panelScroll}>
              <Navigation items={items} sections={labelled} shared={{ ...shared, collapsed: false }} />
              {settings && <Group label={settings.label} items={settings.items} shared={{ ...shared, collapsed: false }} />}
            </div>
            {footer && <div data-slot="sidebar-footer" className={cn(FOOTER, FOOTER_RULE, "shrink-0")}>{footer}</div>}
          </nav>
        ) : (
          <nav className="flex flex-1 flex-col gap-ds-200">
            <Navigation items={items} sections={labelled} shared={{ ...shared, collapsed: false }} />
            {settings && <Group label={settings.label} items={settings.items} shared={{ ...shared, collapsed: false }} />}
            {footer && <div data-slot="sidebar-footer" className={cn(FOOTER, FOOTER_RULE, "mt-auto")}>{footer}</div>}
          </nav>
        )}
      </NavPanel>
    </>
  );
}

function Brand({ brand, href }: { brand: React.ReactNode; href: string }) {
  return (
    <AriaLink
      href={href}
      data-slot="sidebar-brand"
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-ds-100 rounded-ds-medium px-ds-100 text-body-strong text-ds-text outline-hidden data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused",
        WHEN_COLLAPSED.clip,
      )}
    >
      {brand}
    </AriaLink>
  );
}

function Group({ label, items, shared, className }: { label: string; items: readonly SidebarItem[]; shared: Shared; className?: string }) {
  const id = React.useId();
  return (
    <div role="group" aria-labelledby={id} data-slot="sidebar-section" className={className ? cn("flex flex-col gap-0.5", className) : "flex flex-col gap-0.5"}>
      <span id={id} data-slot="sidebar-section-label" className={cn(OVERLINE, WHEN_COLLAPSED.label)}>
        {label}
      </span>
      <Tree items={items} shared={shared} />
    </div>
  );
}

/**
 * The top list, then the labelled sections. One child in its parent either way, so without sections the tree
 * (and the server's useId ids) is exactly what it was before sections existed.
 */
function Navigation({ items, sections, shared }: { items: readonly SidebarItem[]; sections?: readonly SidebarSection[]; shared: Shared }) {
  if (!sections) return <Tree items={items} shared={shared} />;
  return (
    <>
      {/* With sections, an empty top list is left out; without them it renders (also empty), as before. */}
      {items.length > 0 && <Tree items={items} shared={shared} />}
      <Sections sections={sections} shared={shared} />
    </>
  );
}

function Sections({ sections, shared }: { sections: readonly SidebarSection[]; shared: Shared }) {
  return (
    <div data-slot="sidebar-sections" className="flex flex-col gap-ds-100">
      {sections.map((section) => (
        <Section key={section.id} section={section} shared={shared} />
      ))}
    </div>
  );
}

/**
 * A labelled section: the settings group's overline and naming, plus a separator that shows only collapsed. Its
 * own slots (`sidebar-nav-section`, `-label`, `-separator`), so a selector for the settings group
 * (`sidebar-section`) never matches a section.
 */
function Section({ section, shared }: { section: SidebarSection; shared: Shared }) {
  const id = React.useId();
  return (
    <div role="group" aria-labelledby={id} data-slot="sidebar-nav-section" data-section={section.id} className="flex flex-col gap-0.5">
      <span aria-hidden="true" data-slot="sidebar-nav-section-separator" className={cn("mx-ds-050 mb-ds-100 border-t border-ds-border", WHEN_COLLAPSED.shown)} />
      <span id={id} data-slot="sidebar-nav-section-label" className={cn(OVERLINE, WHEN_COLLAPSED.label)}>
        {section.label}
      </span>
      <Tree items={section.items} shared={shared} />
    </div>
  );
}

function Tree({ items, shared, nested }: { items: readonly SidebarItem[]; shared: Shared; nested?: boolean }) {
  return (
    <ul data-slot={nested ? "sidebar-subtree" : "sidebar-tree"} className="flex flex-col gap-0.5">
      {items.map((item) => (
        <li key={item.id}>{item.children ? <GroupItem item={item} shared={shared} /> : <LinkItem item={item} shared={shared} nested={nested} />}</li>
      ))}
    </ul>
  );
}

function Label({ item }: { item: SidebarItem }) {
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

function LinkItem({ item, shared, nested }: { item: SidebarItem; shared: Shared; nested?: boolean }) {
  const link = (
    <AriaLink
      href={item.href}
      data-slot="sidebar-item"
      aria-current={item.id === shared.currentKey ? "page" : undefined}
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

function GroupItem({ item, shared }: { item: SidebarItem; shared: Shared }) {
  const holdsCurrent = contains(item, shared.currentKey);
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
        <div className="mt-0.5 ps-ds-400">
          <Tree items={item.children ?? []} shared={shared} nested />
        </div>
      </DisclosurePanel>
    </Disclosure>
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
