"use client";

import * as React from "react";
import { Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Focusable, Heading, Header, Keyboard, Menu as AriaMenu, MenuItem as AriaMenuItem, MenuSection as AriaMenuSection, MenuTrigger, OverlayArrow, Popover as AriaPopover, Separator, SubmenuTrigger, Tooltip as AriaTooltip, TooltipTrigger, type Key, type Placement, type Selection } from "react-aria-components";
import { cn } from "../utils";
import { MotionScope, type WithMotion, useMotionAttribute } from "../defaults";
import { Button, CloseButton, Fab, Link, ToggleButton } from "../action/index";
import { IconGlyph, type IconName } from "../display/icon";
import { Kbd } from "../display/kbd";
import { OverlayContents } from "./overlay-base";

/**
 * One floating surface for Popover and Menu: `ds-surface-overlay`, `ds-shadow-overlay`, `ds-radius-large`,
 * anchored to its trigger by React Aria (flips and shifts at the viewport edge, mirrors in RTL). React Aria
 * caps its height to the space left on screen; the panel's content scrolls inside (SCROLL) instead of running
 * off it. The surface itself does not clip, or it would hide the arrow React Aria places outside it.
 */
export const SURFACE =
  "flex flex-col rounded-ds-large [--ds-surface-radius:var(--ds-radius-large)] bg-ds-surface-overlay text-ds-text shadow-ds-overlay outline-hidden " +
  "transition-[opacity,translate] duration-(--ds-duration-medium) ease-ds-enter data-[exiting]:ease-ds-exit motion-reduce:transition-none " +
  "data-[entering]:opacity-0 data-[exiting]:opacity-0 " +
  "data-[placement=bottom]:data-[entering]:-translate-y-1 data-[placement=top]:data-[entering]:translate-y-1";

/** The scrolling inside a floating surface: as tall as React Aria lets the surface be, no taller. */
export const SCROLL = "min-h-0 max-h-[inherit] overflow-auto";

/** The 12px arrow pointing at the trigger, turned to whichever side the panel opened on. */
function Arrow() {
  return (
    <OverlayArrow data-slot="popover-arrow" className="group">
      <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden className="block fill-ds-surface-overlay group-data-[placement=bottom]:rotate-180 group-data-[placement=left]:-rotate-90 group-data-[placement=right]:rotate-90">
        <path d="M0 0 L6 6 L12 0" />
      </svg>
    </OverlayArrow>
  );
}

export type PopoverProps = {
  /** The pressable that opens it (a DS Button: "Filtre"). */
  trigger: React.ReactElement;
  children: React.ReactNode;
  /** "bottom start" by default; React Aria flips it when there is no room. */
  placement?: Placement;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** A heading that also names the panel ("Filters"); without it, give `aria-label`. */
  title?: React.ReactNode;
  "aria-label"?: string;
};

/**
 * A small non-modal panel anchored to its trigger: filters, a quick edit, extra details. 240–360px wide,
 * with an arrow to the trigger. Esc and an outside click close it; focus moves in on open and back to the
 * trigger on close. One small task; more than about four fields belongs in a Drawer.
 */
function PopoverBody({ trigger, children, placement = "bottom start", isOpen, defaultOpen, onOpenChange, title, "aria-label": ariaLabel }: PopoverProps) {
  return (
    <AriaDialogTrigger isOpen={isOpen} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger}
      <AriaPopover {...useMotionAttribute()} data-slot="popover" placement={placement} offset={10} className={cn(SURFACE, "min-w-60 max-w-90")}>
        <Arrow />
        <AriaDialog aria-label={title ? undefined : ariaLabel} data-slot="popover-dialog" className={cn(SCROLL, "flex flex-col gap-ds-150 p-ds-200 outline-hidden")}>
          <OverlayContents>
            {title && <Heading slot="title" data-slot="popover-title" className="m-0 text-heading-xsmall">{title}</Heading>}
            {children}
          </OverlayContents>
        </AriaDialog>
      </AriaPopover>
    </AriaDialogTrigger>
  );
}

export type TooltipProps = {
  /** Plain text only: the same words as the control's `aria-label`, or a truncated value in full. */
  content: string;
  /** The trigger. It must be focusable; a non-interactive element (a truncated lozenge) is made focusable. */
  children: React.ReactElement;
  placement?: Placement;
  /** A keyboard shortcut shown as a chip ("F"). */
  shortcut?: string;
  /**
   * Readable on touch screens: a tap on the trigger opens the tooltip and a second tap closes it;
   * a tap anywhere else, or Esc, closes it. Mouse hover and keyboard focus work exactly as without it. For a
   * trigger that does nothing on its own (a country flag, a truncated value); on a button the tap still presses it.
   */
  openOnTouch?: boolean;
};

/** DS controls built on React Aria: they take a tooltip as they are. */
const ARIA_TRIGGERS = new Set<unknown>([Button, CloseButton, ToggleButton, Link, Fab]);

/**
 * The tooltip's trigger. A DS button or link is used as it is. A plain element gets a tab stop (keeping one it
 * already has). Any other component (a Badge, a truncated value) is wrapped in a focusable span, since React
 * Aria can only attach to an element it can reach; the wrapper takes no tab stop of its own when what it holds
 * is already focusable (a raw React Aria button), so keyboard users still meet one stop. For a Menu or a
 * Popover, put the Tooltip on its trigger button, not around the whole component.
 */
function TooltipTarget({ children }: { children: React.ReactElement }) {
  const wrapper = React.useRef<HTMLSpanElement>(null);
  const [holdsFocusable, setHoldsFocusable] = React.useState(false);
  React.useLayoutEffect(() => {
    setHoldsFocusable(!!wrapper.current?.querySelector("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])"));
  });
  if (ARIA_TRIGGERS.has(children.type)) return children;
  type Focus = React.ComponentProps<typeof Focusable>["children"];
  if (typeof children.type === "string") {
    const props = children.props as { tabIndex?: number };
    return <Focusable>{React.cloneElement(children as React.ReactElement<{ tabIndex?: number }>, { tabIndex: props.tabIndex ?? 0 }) as Focus}</Focusable>;
  }
  return (
    // React Aria gives a Focusable child tabIndex 0 unless it is excluded from the tab order.
    <Focusable excludeFromTabOrder={holdsFocusable}>
      <span
        ref={wrapper}
        tabIndex={holdsFocusable ? -1 : 0}
        data-slot="tooltip-target"
        className="inline-flex rounded-ds-small outline-hidden focus-visible:inset-ring-2 focus-visible:inset-ring-ds-border-focused"
      >
        {children}
      </span>
    </Focusable>
  );
}

/**
 * Names an icon-only control or shows a truncated value in full. Shows after 300ms of hover and at once on
 * keyboard focus; Esc hides it. The control keeps its own `aria-label` (the tooltip only describes it), and
 * touch users never see a tooltip, so it never holds anything needed to finish a task. With `openOnTouch` a tap
 * toggles it, for a value that a touch user should also be able to read. No provider needed.
 */
function TooltipBody(props: TooltipProps) {
  return <TooltipFor {...props} children={<TooltipTarget>{props.children}</TooltipTarget>} />;
}

/**
 * Inside the design system only (not exported from the package): a tooltip on a child that is itself a
 * React Aria focusable (a `Link`, a `Button slot="trigger"`), so it takes the trigger props directly.
 */
export function TooltipFor({ content, children, placement = "top", shortcut, openOnTouch }: TooltipProps) {
  if (openOnTouch) return <TouchTooltipFor content={content} placement={placement} shortcut={shortcut}>{children}</TouchTooltipFor>;
  return (
    <TooltipTrigger delay={300} closeDelay={0}>
      {children}
      <TooltipBubble content={content} placement={placement} shortcut={shortcut} />
    </TooltipTrigger>
  );
}

const TooltipBubble = React.forwardRef<HTMLDivElement, Pick<TooltipProps, "content" | "placement" | "shortcut">>(function TooltipBubble(
  { content, placement, shortcut },
  ref,
) {
  return (
    <AriaTooltip
      {...useMotionAttribute()}
      ref={ref}
      data-slot="tooltip"
      placement={placement}
      offset={6}
      className={cn(
        "flex max-w-60 items-center gap-ds-075 rounded-ds-small bg-ds-background-neutral-bold px-ds-100 py-ds-050 text-body-small text-ds-text-inverse",
        // A shortcut's keycaps take the bubble's colours (a clear cap with a faint edge), not the page's surface,
        // which read as a loud white chip in the dark bubble.
        "[&_[data-slot=kbd]]:border-current/30 [&_[data-slot=kbd]]:bg-transparent [&_[data-slot=kbd]]:text-ds-text-inverse",
        "transition-opacity duration-(--ds-duration-fast) data-[entering]:opacity-0 data-[exiting]:opacity-0 motion-reduce:transition-none",
      )}
    >
      <span data-slot="tooltip-content">{content}</span>
      {shortcut && (
        <span data-slot="tooltip-shortcut" className="flex">
          <Kbd>{shortcut}</Kbd>
        </span>
      )}
    </AriaTooltip>
  );
});

/**
 * `openOnTouch`. The tooltip is controlled: React Aria still opens it on hover and keyboard focus and
 * closes it on press, blur and Esc through `onOpenChange`. A touch tap is decided on pointerdown, from the state
 * the finger found (React Aria's own close-on-press runs in the same event), and applied on pointerup, so a tap
 * toggles it; a scroll that cancels the touch changes nothing. While it is open, a pointer down outside the trigger
 * and the bubble closes it. The trigger sits in a `display: contents` span, which adds no box to the layout.
 */
function TouchTooltipFor({ content, children, placement, shortcut }: Omit<TooltipProps, "openOnTouch">) {
  const [isOpen, setOpen] = React.useState(false);
  const zone = React.useRef<HTMLSpanElement>(null);
  const bubble = React.useRef<HTMLDivElement>(null);
  const tap = React.useRef<boolean | null>(null);
  React.useEffect(() => {
    if (!isOpen) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (zone.current?.contains(target) || bubble.current?.contains(target))) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [isOpen]);
  return (
    <span
      ref={zone}
      data-slot="tooltip-touch"
      className="contents"
      onPointerDownCapture={(event) => {
        // React events bubble through the portal: a tap on the bubble is not a tap on the trigger.
        const onTrigger = zone.current?.contains(event.target as Node) ?? false;
        tap.current = event.pointerType === "touch" && onTrigger ? !isOpen : null;
      }}
      onPointerUp={(event) => {
        const next = tap.current;
        tap.current = null;
        if (event.pointerType === "touch" && next !== null) setOpen(next);
      }}
      onPointerCancel={() => {
        tap.current = null;
      }}
    >
      <TooltipTrigger delay={300} closeDelay={0} isOpen={isOpen} onOpenChange={setOpen}>
        {children}
        <TooltipBubble ref={bubble} content={content} placement={placement} shortcut={shortcut} />
      </TooltipTrigger>
    </span>
  );
}

export type MenuItemDef = {
  id: Key;
  /** A verb ("Edit"); a disabled item says why ("Send invoice (payment pending)"). */
  label: string;
  icon?: IconName;
  /** Shown in mono at the end ("E"). */
  shortcut?: string;
  isDisabled?: boolean;
  /** `danger` for the destructive action; it is placed last, after a separator. */
  tone?: "danger";
  /** A submenu: opens on hover and on → (← in RTL). */
  children?: readonly MenuItemDef[];
  /** Makes the item a link (a language of the page, another page); it goes through the host router. */
  href?: string;
  /** The language of the label, when it differs from the page ("English" in a Turkish language list). */
  lang?: string;
};

export type MenuSectionDef = {
  id: Key;
  /** "Share". */
  title: string;
  items: readonly MenuItemDef[];
};

export type MenuEntry = MenuItemDef | MenuSectionDef;

export type MenuProps = {
  /** The pressable that opens it: the row "…" button, the account button. */
  trigger: React.ReactElement;
  /** Items, or sections of items with a title. Leave it out to compose the menu as children instead. */
  items?: readonly MenuEntry[];
  /**
   * With no `items`: `MenuItem`, `MenuSection`, `MenuSubmenu` and `MenuSeparator`, in the order given (put the
   * destructive item last yourself; with `items` the menu moves it there).
   */
  children?: React.ReactNode;
  onAction?: (id: Key) => void;
  disabledKeys?: Iterable<Key>;
  /** "bottom end" by default: under the trigger, aligned to its inline end, as row menus sit. */
  placement?: Placement;
  /** For menus that also hold a choice (a view option): checkmarks on the selected items. */
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: Iterable<Key>;
  defaultSelectedKeys?: Iterable<Key>;
  onSelectionChange?: (keys: Selection) => void;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** Names the menu when the trigger's own name is not enough. */
  "aria-label"?: string;
};

const ITEM =
  "group flex min-h-8 cursor-default items-center gap-ds-100 rounded-[max(var(--ds-radius-small),calc(var(--ds-surface-radius,var(--ds-radius-large))-var(--ds-space-050)))] px-ds-100 text-body outline-hidden select-none " +
  "data-[focused]:bg-ds-background-neutral-subtle-hovered data-[pressed]:bg-ds-background-neutral-pressed " +
  "data-[disabled]:cursor-not-allowed data-[disabled]:text-ds-text-disabled";

function isSection(entry: MenuEntry): entry is MenuSectionDef {
  return "items" in entry;
}

type Group = { kind: "section"; section: MenuSectionDef; items: MenuItemDef[] } | { kind: "run"; key: string; items: MenuItemDef[] };

/**
 * The menu as rendered: entries in the order given, consecutive loose items as one group, and every
 * destructive item pulled out of its group and placed once at the end. Separators go between the groups that
 * actually render, and before the destructive ones.
 */
function layout(entries: readonly MenuEntry[]) {
  const groups: Group[] = [];
  const danger: MenuItemDef[] = [];
  for (const entry of entries) {
    if (isSection(entry)) {
      const items = entry.items.filter((item) => (item.tone === "danger" ? (danger.push(item), false) : true));
      if (items.length) groups.push({ kind: "section", section: entry, items });
    } else if (entry.tone === "danger") {
      danger.push(entry);
    } else {
      const last = groups[groups.length - 1];
      if (last?.kind === "run") last.items.push(entry);
      else groups.push({ kind: "run", key: `run-${String(entry.id)}`, items: [entry] });
    }
  }
  return { groups, danger };
}

/** A line between groups of items. */
export function MenuSeparator() {
  return <Separator data-slot="menu-separator" className="my-ds-050 border-t border-ds-border" />;
}

/** Phones (below 640px): a submenu opens under its item, inside the menu's width, not beside it off-screen. */
function useNarrow() {
  return React.useSyncExternalStore(
    (notify) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const query = window.matchMedia("(max-width: 639px)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => typeof window.matchMedia === "function" && window.matchMedia("(max-width: 639px)").matches,
    () => false,
  );
}

function Submenu({ children }: { children: React.ReactNode }) {
  const narrow = useNarrow();
  return (
    <AriaPopover
      {...useMotionAttribute()}
      data-slot="menu-submenu"
      placement={narrow ? "bottom end" : "end top"}
      offset={narrow ? 2 : -4}
      crossOffset={narrow ? 0 : -4}
      className={cn(SURFACE, "min-w-48 max-w-[min(22.5rem,calc(100vw-1.5rem))]")}
    >
      <AriaMenu data-slot="menu-list" className={cn(SCROLL, "p-ds-050 outline-hidden")}>
        {children}
      </AriaMenu>
    </AriaPopover>
  );
}

/** Groups in order, separators between them, the destructive items last after one more separator. */
export function MenuBody({ entries }: { entries: readonly MenuEntry[] }) {
  const { groups, danger } = layout(entries);
  return (
    <>
      {groups.map((group, index) => (
        <React.Fragment key={group.kind === "section" ? String(group.section.id) : group.key}>
          {index > 0 && <MenuSeparator />}
          {group.kind === "section" ? (
            <MenuSection id={group.section.id} title={group.section.title}>
              {group.items.map((item) => <Item key={String(item.id)} item={item} />)}
            </MenuSection>
          ) : (
            group.items.map((item) => <Item key={String(item.id)} item={item} />)
          )}
        </React.Fragment>
      ))}
      {danger.length > 0 && groups.length > 0 && <MenuSeparator />}
      {danger.map((item) => <Item key={String(item.id)} item={item} />)}
    </>
  );
}

function Item({ item }: { item: MenuItemDef }) {
  const row = { id: item.id, textValue: item.label, icon: item.icon, shortcut: item.shortcut, isDisabled: item.isDisabled, tone: item.tone, href: item.href, lang: item.lang };
  if (!item.children) return <ItemRow {...row}>{item.label}</ItemRow>;
  return (
    <SubmenuTrigger>
      <ItemRow {...row} hasSubmenu>
        {item.label}
      </ItemRow>
      <Submenu>
        <MenuBody entries={item.children} />
      </Submenu>
    </SubmenuTrigger>
  );
}

type ItemRowProps = Omit<MenuItemProps, "textValue"> & { textValue: string; hasSubmenu?: boolean };

/** One 32px row: a check when the menu selects, an icon, the label, then a shortcut or a submenu chevron. */
function ItemRow({ id, children, textValue, icon, shortcut, isDisabled, tone, href, lang, hasSubmenu }: ItemRowProps) {
  return (
    <AriaMenuItem
      id={id}
      textValue={textValue}
      isDisabled={isDisabled}
      href={href}
      data-slot="menu-item"
      data-tone={tone}
      className={cn(ITEM, tone === "danger" && "text-ds-text-danger")}
    >
      {({ isSelected, selectionMode }) => (
        <>
          {selectionMode !== "none" && (
            <span data-slot="menu-item-check" className="grid size-4 shrink-0 place-items-center">
              {isSelected && <IconGlyph name="check" size="small" />}
            </span>
          )}
          {icon && (
            <IconGlyph
              name={icon}
              size="small"
              data-slot="menu-item-icon"
              className={cn(tone === "danger" ? "text-ds-icon-danger" : "text-ds-icon-subtle", "group-data-[disabled]:text-ds-text-disabled")}
            />
          )}
          <span data-slot="menu-item-label" lang={lang} className="min-w-0 flex-1 truncate">{children}</span>
          {shortcut && (
            <Keyboard data-slot="menu-item-shortcut" className="font-ds-mono text-code text-ds-text-subtlest">{shortcut}</Keyboard>
          )}
          {hasSubmenu && <IconGlyph name="chevron-right" size="small" data-slot="menu-item-submenu" className="text-ds-icon-subtle" />}
        </>
      )}
    </AriaMenuItem>
  );
}

// ---- Composed from parts ---------------------------------------------------------------------------------------

export type MenuItemProps = {
  id: Key;
  /** The label: a verb ("Edit"). It may hold more than text (an avatar, two lines); then give `textValue`. */
  children: React.ReactNode;
  /** The words typing jumps to; the label itself when it is plain text. */
  textValue?: string;
  icon?: IconName;
  /** Shown in mono at the end ("E"). */
  shortcut?: string;
  isDisabled?: boolean;
  /** `danger` for the destructive action; put it last, after a `MenuSeparator`. */
  tone?: "danger";
  /** Makes the item a link; it goes through the host router. */
  href?: string;
  /** The language of the label, when it differs from the page. */
  lang?: string;
};

function textOf(children: React.ReactNode, textValue: string | undefined, part: string): string {
  if (textValue !== undefined) return textValue;
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (process.env.NODE_ENV !== "production") console.warn(`${part}: give textValue when the label is not plain text, so typing can jump to it.`);
  return "";
}

/** One action in a Menu or ContextMenu composed from parts. */
export function MenuItem({ children, textValue, ...rest }: MenuItemProps) {
  return (
    <ItemRow {...rest} textValue={textOf(children, textValue, "MenuItem")}>
      {children}
    </ItemRow>
  );
}

export type MenuSectionProps = {
  id?: Key;
  /** The section's title ("Share"); it names the group. */
  title: string;
  /** `MenuItem`s and `MenuSubmenu`s. */
  children: React.ReactNode;
};

/** A titled group of items. */
export function MenuSection({ id, title, children }: MenuSectionProps) {
  return (
    <AriaMenuSection data-slot="menu-section" id={id}>
      <Header data-slot="menu-section-title" className="px-ds-100 pt-ds-100 pb-ds-050 text-heading-xxsmall text-ds-text-subtle">
        {title}
      </Header>
      {children}
    </AriaMenuSection>
  );
}

export type MenuSubmenuProps = Omit<MenuItemProps, "href" | "children" | "textValue" | "tone"> & {
  /** The item that opens the submenu ("Move to"). */
  label: string;
  /** The submenu's `MenuItem`s. */
  children: React.ReactNode;
};

/** An item that opens a submenu: on hover and on → (← in RTL); under the item on phones. */
export function MenuSubmenu({ label, children, ...rest }: MenuSubmenuProps) {
  return (
    <SubmenuTrigger>
      <ItemRow {...rest} textValue={label} hasSubmenu>
        {label}
      </ItemRow>
      <Submenu>{children}</Submenu>
    </SubmenuTrigger>
  );
}

/**
 * The actions for an object behind a trigger: the row "…" menu, the account menu. 32px items with an icon,
 * a label and a shortcut or a submenu chevron; the destructive action last, after a separator. Anchored to
 * its trigger on every viewport and in RTL. Arrows move, typing jumps, Home/End go to the ends,
 * Enter acts, Esc closes and returns focus to the trigger. Choosing a value is a Select, not a Menu.
 */
function MenuRoot({
  trigger, items, children, onAction, disabledKeys, placement = "bottom end", selectionMode = "none", selectedKeys, defaultSelectedKeys,
  onSelectionChange, isOpen, onOpenChange, "aria-label": ariaLabel,
}: MenuProps) {
  return (
    <MenuTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      {trigger}
      <AriaPopover {...useMotionAttribute()} data-slot="menu-popover" placement={placement} offset={4} className={cn(SURFACE, "min-w-60 max-w-90")}>
        <AriaMenu
          aria-label={ariaLabel}
          onAction={onAction}
          disabledKeys={disabledKeys}
          selectionMode={selectionMode}
          selectedKeys={selectedKeys}
          defaultSelectedKeys={defaultSelectedKeys}
          onSelectionChange={onSelectionChange}
          data-slot="menu"
          className={cn(SCROLL, "p-ds-050 outline-hidden")}
        >
          {items ? <MenuBody entries={items} /> : children}
        </AriaMenu>
      </AriaPopover>
    </MenuTrigger>
  );
}

/** Popover with its own `motion` (auto, reduce or none); see PopoverBody for the component itself. */
export function Popover({ motion, ...props }: PopoverProps & WithMotion) {
  return (
    <MotionScope motion={motion}>
      <PopoverBody {...(props as PopoverProps)} />
    </MotionScope>
  );
}

/** Menu with its own `motion` (auto, reduce or none); see MenuRoot for the component itself. */
export function Menu({ motion, ...props }: MenuProps & WithMotion) {
  return (
    <MotionScope motion={motion}>
      <MenuRoot {...(props as MenuProps)} />
    </MotionScope>
  );
}

/** Tooltip with its own `motion` (auto, reduce or none); see TooltipBody for the component itself. */
export function Tooltip({ motion, ...props }: TooltipProps & WithMotion) {
  return (
    <MotionScope motion={motion}>
      <TooltipBody {...(props as TooltipProps)} />
    </MotionScope>
  );
}

/* ── ContextMenu ─────────────────────────────────────────────────────────── */
