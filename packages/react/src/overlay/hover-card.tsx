"use client";

import * as React from "react";
import { Popover as AriaPopover, type Placement } from "react-aria-components";
import { cn } from "../utils";
import { useMotionAttribute } from "../defaults";
import { SURFACE } from "./floating";

export type HoverCardProps = {
  /** A link (or a focusable element) whose preview the card shows: a person's name, a record reference. */
  trigger: React.ReactElement;
  /** The preview: an avatar and a line about the person, a record's key fields. Supplementary, never essential. */
  children: React.ReactNode;
  /** Before it opens (ms); default 500, so moving across the page does not flash cards. */
  openDelay?: number;
  /** Before it closes after the pointer leaves (ms); default 200, enough to reach the card. */
  closeDelay?: number;
  placement?: Placement;
};

/**
 * A preview card that opens when the pointer rests on its trigger, or the trigger gets keyboard focus, and stays
 * while the pointer is over the card. Esc closes it. The trigger must make sense without it (a link to the full
 * page), since touch screens and screen readers may never see the card.
 */
export function HoverCard({ trigger, children, openDelay = 500, closeDelay = 200, placement = "bottom" }: HoverCardProps) {
  const [isOpen, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);
  const timer = React.useRef<number | undefined>(undefined);
  const motion = useMotionAttribute();
  const schedule = (open: boolean) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(open), open ? openDelay : closeDelay);
  };
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <>
      <span
        ref={ref}
        data-slot="hover-card-trigger"
        className="inline-flex"
        onPointerEnter={(event) => event.pointerType !== "touch" && schedule(true)}
        onPointerLeave={(event) => event.pointerType !== "touch" && schedule(false)}
        onFocus={() => schedule(true)}
        onBlur={() => schedule(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        {trigger}
      </span>
      <AriaPopover
        {...motion}
        triggerRef={ref}
        isOpen={isOpen}
        onOpenChange={setOpen}
        isNonModal
        placement={placement}
        offset={8}
        data-slot="hover-card"
        className={cn(SURFACE, "w-80 max-w-[calc(100vw-2rem)] p-ds-200")}
      >
        <div
          onPointerEnter={() => window.clearTimeout(timer.current)}
          onPointerLeave={() => schedule(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          {children}
        </div>
      </AriaPopover>
    </>
  );
}
