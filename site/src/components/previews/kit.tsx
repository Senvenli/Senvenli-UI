import { Icon, type IconName } from "@senvenli/react/display";
import type { ReactNode } from "react";

/**
 * The pieces the drawn previews share. Everything is a div or an SVG in the theme's own tokens (color, radius,
 * space), so a preview follows the theme, its corners and its density, in light and dark, without rendering the
 * component it stands for. Nothing here holds state or reads the clock.
 */
const join = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ");

/** A line of text, as a bar. `strong` for a title or a value, soft for running text. */
export function Line({ w = "w-full", strong, className }: { w?: string; strong?: boolean; className?: string }) {
  return <span className={join("block h-1.5 shrink-0 rounded-ds-full", strong ? "bg-ds-text-subtlest" : "bg-ds-background-neutral-pressed", w, className)} />;
}

/** A short word in the small text size. */
export function Word({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "subtle" | "subtlest"; className?: string }) {
  const color = tone === "default" ? "text-ds-text" : tone === "subtle" ? "text-ds-text-subtle" : "text-ds-text-subtlest";
  return <span className={join("whitespace-nowrap text-body-small leading-none", color, className)}>{children}</span>;
}

/** A button, drawn: `primary` in the brand color, else the neutral fill. */
export function Btn({ children, primary, danger, small, className }: { children?: ReactNode; primary?: boolean; danger?: boolean; small?: boolean; className?: string }) {
  const fill = danger
    ? "bg-ds-background-danger-bold text-ds-text-on-danger"
    : primary
      ? "bg-ds-background-brand-bold text-ds-text-on-brand"
      : "bg-ds-background-neutral text-ds-text";
  return (
    <span className={join("inline-flex shrink-0 items-center justify-center gap-ds-050 whitespace-nowrap rounded-ds-control-small px-ds-100 text-body-small leading-none", small ? "h-5" : "h-6", fill, className)}>
      {children}
    </span>
  );
}

/** An icon button, drawn. */
export function IconBtn({ name, fill = "neutral" }: { name: IconName; fill?: "neutral" | "selected" | "none" }) {
  const ground = fill === "neutral" ? "bg-ds-background-neutral" : fill === "selected" ? "bg-ds-background-selected" : "";
  return (
    <span className={join("inline-flex size-6 shrink-0 items-center justify-center rounded-ds-control-small text-ds-text", ground)}>
      <Icon name={name} size="small" />
    </span>
  );
}

/** A text field's box, with whatever sits inside it. */
export function FieldBox({ children, className, focused, small }: { children?: ReactNode; className?: string; focused?: boolean; small?: boolean }) {
  return (
    <span
      className={join(
        "flex min-w-0 items-center gap-ds-075 rounded-ds-control-small border bg-ds-background-input px-ds-100",
        small ? "h-5" : "h-7",
        focused ? "border-ds-border-focused" : "border-ds-border",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A floating surface: a menu, a popover, a dialog. */
export function Float({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={join("rounded-ds-medium bg-ds-surface-overlay shadow-ds-overlay", className)}>{children}</div>;
}

/** The page behind a modal: a few lines under the blanket. */
export function Backdrop({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className="relative h-24 w-44 overflow-hidden rounded-ds-medium">
      <div className="flex flex-col gap-ds-100 p-ds-150">
        <Line w="w-16" strong />
        <Line />
        <Line w="w-3/4" />
        <Line w="w-5/6" />
        <Line w="w-2/3" />
      </div>
      <div className={join("absolute inset-0 flex bg-ds-blanket", className)}>{children}</div>
    </div>
  );
}

/** A row in a menu or a list. */
export function Row({ children, selected, small, className }: { children?: ReactNode; selected?: boolean | "accent"; small?: boolean; className?: string }) {
  const ground = selected === "accent" ? "bg-ds-background-selected" : selected ? "bg-ds-background-neutral" : "";
  return (
    <span className={join("flex items-center gap-ds-075 rounded-ds-small px-ds-075", small ? "h-4" : "h-5", ground, className)}>{children}</span>
  );
}

/** A block of color standing for content: a pane, a photo, a cell. */
export function Block({ className }: { className?: string }) {
  return <span className={join("block rounded-ds-small bg-ds-background-neutral", className)} />;
}

/** A photo, drawn: a hill and a sun on a quiet ground. The caller gives the size and the corner. */
export function Photo({ className }: { className?: string }) {
  return (
    <span className={join("relative block overflow-hidden bg-ds-background-neutral", className)}>
      <svg viewBox="0 0 40 30" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full fill-ds-background-neutral-pressed">
        <circle cx="29" cy="9" r="3.5" />
        <path d="M0 30 13 13l8 9 5-5 14 13Z" />
      </svg>
    </span>
  );
}

export { join };
