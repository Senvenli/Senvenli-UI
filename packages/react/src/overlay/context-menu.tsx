"use client";

import * as React from "react";
import { Menu as AriaMenu, Popover as AriaPopover, type Key } from "react-aria-components";
import { cn } from "../utils";
import { useMotionAttribute } from "../defaults";
import { MenuBody, SCROLL, SURFACE, type MenuEntry } from "./floating";

export type ContextMenuProps = {
  /**
   * The region a right-click, a long press or Shift+F10 opens the menu on: a row, a card, a canvas. Or, to compose
   * the menu from parts: a `ContextMenuTrigger` holding that region, followed by `MenuItem`, `MenuSection`,
   * `MenuSubmenu` and `MenuSeparator`.
   */
  children: React.ReactNode;
  /** The menu as data; leave it out when composing with a `ContextMenuTrigger`. */
  items?: readonly MenuEntry[];
  onAction?: (id: Key) => void;
  disabledKeys?: Iterable<Key>;
  /** Names the menu ("Actions for ORD-482"). */
  "aria-label": string;
};

/** How long a touch must rest to open the menu (ms). */
const LONG_PRESS = 500;

/**
 * The actions for what is under the pointer, opened where it was pressed: right-click, a long press on touch, or
 * Shift+F10 / the Menu key on whatever has keyboard focus inside. The same menu as Menu (sections, a destructive
 * item last); focus goes back where it was on close. Never the only way to an action: put it in a visible Menu too.
 */
export type ContextMenuTriggerProps = {
  /** The region that opens the menu. */
  children: React.ReactNode;
};

/** The region of a ContextMenu composed from parts; the ContextMenu's other children are the menu. */
export function ContextMenuTrigger({ children }: ContextMenuTriggerProps) {
  return <>{children}</>;
}

/** The target and the menu: from a `ContextMenuTrigger` and the parts after it, or the children and `items`. */
function splitTarget(children: React.ReactNode, items: readonly MenuEntry[] | undefined) {
  const nodes = React.Children.toArray(children);
  const trigger = nodes.find((node) => React.isValidElement(node) && node.type === ContextMenuTrigger) as React.ReactElement<ContextMenuTriggerProps> | undefined;
  if (!trigger) return { target: children, menu: <MenuBody entries={items ?? []} /> };
  return { target: trigger.props.children, menu: nodes.filter((node) => node !== trigger) };
}

export function ContextMenu({ children, items, onAction, disabledKeys, "aria-label": ariaLabel }: ContextMenuProps) {
  const { target, menu } = splitTarget(children, items);
  const [point, setPoint] = React.useState<{ x: number; y: number } | null>(null);
  const anchor = React.useRef<HTMLSpanElement>(null);
  const returnTo = React.useRef<HTMLElement | null>(null);
  const timer = React.useRef<number | undefined>(undefined);
  const motion = useMotionAttribute();
  const openAt = (x: number, y: number) => {
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPoint({ x, y });
  };
  const close = () => {
    setPoint(null);
    returnTo.current?.focus();
  };
  const cancelPress = () => window.clearTimeout(timer.current);
  return (
    <>
      <span
        data-slot="context-menu-target"
        className="contents"
        onContextMenu={(event) => {
          event.preventDefault();
          openAt(event.clientX, event.clientY);
        }}
        onKeyDown={(event) => {
          if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
            event.preventDefault();
            const rect = (event.target as HTMLElement).getBoundingClientRect();
            openAt(rect.left, rect.bottom);
          }
        }}
        onPointerDown={(event) => {
          if (event.pointerType !== "touch") return;
          const { clientX, clientY } = event;
          cancelPress();
          timer.current = window.setTimeout(() => openAt(clientX, clientY), LONG_PRESS);
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onPointerMove={cancelPress}
      >
        {target}
      </span>
      {point && <span ref={anchor} aria-hidden data-slot="context-menu-anchor" style={{ position: "fixed", left: point.x, top: point.y, width: 0, height: 0 }} />}
      <AriaPopover
        {...motion}
        triggerRef={anchor}
        isOpen={point !== null}
        onOpenChange={(open) => !open && close()}
        placement="bottom start"
        offset={2}
        data-slot="context-menu-popover"
        className={cn(SURFACE, "min-w-60 max-w-90")}
      >
        <AriaMenu
          aria-label={ariaLabel}
          autoFocus="first"
          onAction={(id) => {
            onAction?.(id);
            close();
          }}
          onClose={close}
          disabledKeys={disabledKeys}
          data-slot="context-menu"
          className={cn(SCROLL, "p-ds-050 outline-hidden")}
        >
          {menu}
        </AriaMenu>
      </AriaPopover>
    </>
  );
}

/* ── HoverCard ───────────────────────────────────────────────────────────── */
