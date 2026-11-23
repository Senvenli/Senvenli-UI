"use client";

import * as React from "react";

import { cn } from "../utils";

// 20px including a 1px ds-border, whose bottom edge is ds-border-bold.
const KEYCAP =
  "box-border inline-grid h-5 min-w-5 place-items-center rounded-ds-xsmall border border-ds-border border-b-ds-border-bold " +
  "bg-ds-surface-raised px-[5px] font-ds-mono text-[11px] leading-none text-ds-text-subtle";

export type KbdProps = {
  /** One key per Kbd; a shortcut is several Kbd separated by a space. Left out with `isModifier`. */
  children?: React.ReactNode;
  /** The platform's shortcut modifier: ⌘ on Apple platforms, Ctrl elsewhere (Ctrl on the server, settled after mount). */
  isModifier?: boolean;
  /** What a screen reader says instead of a glyph it may skip ("Command" for ⌘); the glyph is then hidden. */
  label?: string;
};

/** A key or shortcut as a small keycap in help text, menus and tooltips. */
export function Kbd({ children, label, isModifier }: KbdProps) {
  const apple = useApple(isModifier === true);
  // Key names as printed on the keys; Apple labels ⌘ "command" in every language.
  if (isModifier) return apple ? <Kbd label="Command">⌘</Kbd> : <Kbd>Ctrl</Kbd>;
  return (
    <kbd data-slot="kbd" className={KEYCAP}>
      {label ? (
        // aria-label is not allowed on <kbd>, so the spoken name is text.
        <>
          <span aria-hidden>{children}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        children
      )}
    </kbd>
  );
}

function isApple() {
  if (typeof navigator === "undefined") return false;
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** Apple or not, settled after mount so the server and the first client render agree (both say Ctrl). */
function useApple(enabled: boolean) {
  const [apple, setApple] = React.useState(false);
  React.useEffect(() => {
    if (enabled) setApple(isApple());
  }, [enabled]);
  return apple;
}
