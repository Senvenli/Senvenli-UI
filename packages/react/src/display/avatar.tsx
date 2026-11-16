"use client";

import * as React from "react";
import { useLocale } from "react-aria-components";

import { cn } from "../utils";
import { morePeopleLabel, onlineLabel } from "../i18n";
import { IconGlyph } from "./icon";

export type AvatarSize = "small" | "medium" | "large";
export type AvatarShape = "circle" | "square";

const SIZE: Record<AvatarSize, string> = {
  small: "size-ds-300 text-[10px]",
  medium: "size-ds-400 text-[12px]",
  large: "size-ds-600 text-[16px]",
};
const ICON_SIZE = { small: "small", medium: "default", large: "large" } as const;

// Initials sit on one of four tints, chosen from the name so a person keeps their colour.
const TINTS = [
  "bg-ds-background-brand-subtle text-ds-text-brand",
  "bg-ds-background-information text-ds-text-information",
  "bg-ds-background-success text-ds-text-success",
  "bg-ds-background-neutral text-ds-text-subtle",
] as const;
const NEUTRAL = TINTS[3];

function tintOf(name: string) {
  let sum = 0;
  for (const char of name) sum = (sum + (char.codePointAt(0) ?? 0)) % 997;
  return TINTS[sum % TINTS.length];
}

/** First letter of the first and last word, upper-cased with the locale ("lena đukić" → "LĐ", "ilker yılmaz" → "İY" in tr). */
export function initialsOf(name: string, locale: string): string {
  // NFC first, so a decomposed "É" keeps its accent as one letter.
  const firstLetter = (word: string) => Array.from(word).find((char) => /\p{L}/u.test(char)) ?? "";
  const words = name.normalize("NFC").trim().split(/\s+/).filter((word) => firstLetter(word));
  if (words.length === 0) return "";
  const letters = words.length === 1 ? firstLetter(words[0]) : firstLetter(words[0]) + firstLetter(words[words.length - 1]);
  return letters.toLocaleUpperCase(locale);
}


const GroupContext = React.createContext<AvatarSize | null>(null);

export type AvatarProps = {
  /** The person's or company's name: the initials and the accessible name. */
  name: string;
  /** Photo or company logo; initials (or the icon) show until it loads and if it fails. */
  src?: string;
  size?: AvatarSize;
  /** `circle` for people, `square` for companies and logos (contained, never stretched). */
  shape?: AvatarShape;
  /** Shows the 10px online dot and says "online" in the name. */
  presence?: "online";
};

/** A person (circle) or a company (rounded square) by photo, initials or icon. */
export function Avatar({ name, src, size: ownSize, shape = "circle", presence }: AvatarProps) {
  const { locale } = useLocale();
  const groupSize = React.useContext(GroupContext);
  const size = ownSize ?? groupSize ?? "medium";
  // The status belongs to a source: a new src starts over at once, never showing the last one's state.
  const [loadedSrc, setLoadedSrc] = React.useState<string>();
  const [failedSrc, setFailedSrc] = React.useState<string>();
  const status = !src ? "none" : failedSrc === src ? "failed" : loadedSrc === src ? "loaded" : "loading";
  // An image that settled before hydration fired its events before React listened; read it on mount.
  const check = React.useCallback(
    (image: HTMLImageElement | null) => {
      if (!image?.complete || !image.currentSrc) return;
      if (image.naturalWidth > 0) setLoadedSrc(src);
      else setFailedSrc(src);
    },
    [src],
  );
  const initials = initialsOf(name, locale);
  const label = presence === "online" ? `${name} (${onlineLabel(locale)})` : name;
  // Without a name there is nothing to say: decorative, never an unnamed image.
  const named = name.trim() !== "";

  return (
    <span
      role={named ? "img" : undefined}
      aria-label={named ? label : undefined}
      aria-hidden={named ? undefined : true}
      data-slot="avatar"
      data-shape={shape}
      data-size={size}
      data-status={status}
      className={cn(
        "relative inline-grid shrink-0 place-items-center font-medium leading-none select-none",
        shape === "square" ? "rounded-ds-medium" : "rounded-ds-full",
        SIZE[size],
        initials ? tintOf(name) : NEUTRAL,
        groupSize && "ring-2 ring-ds-surface",
      )}
    >
      {status !== "loaded" && (
        <span data-slot="avatar-fallback" aria-hidden className="col-start-1 row-start-1">
          {initials || <IconGlyph name={shape === "square" ? "building-2" : "user"} size={ICON_SIZE[size]} />}
        </span>
      )}
      {src && status !== "failed" && (
        <img
          ref={check}
          src={src}
          alt=""
          data-slot="avatar-image"
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
          className={cn(
            "col-start-1 row-start-1 size-full overflow-hidden",
            shape === "square" ? "rounded-ds-medium bg-ds-surface-sunken object-contain" : "rounded-ds-full object-cover",
            status !== "loaded" && "opacity-0",
          )}
        />
      )}
      {presence === "online" && (
        <span data-slot="avatar-presence" aria-hidden className="absolute -end-px -bottom-px size-2.5 rounded-ds-full bg-ds-icon-success ring-2 ring-ds-surface" />
      )}
    </span>
  );
}

export type AvatarGroupProps = {
  /** Avatars; past `max` they fold into a "+N" avatar. */
  children: React.ReactNode;
  /** How many show before the "+N"; default 4. */
  max?: number;
  size?: AvatarSize;
  /** Names the group ("Team members"). */
  "aria-label"?: string;
};

/** Several people as overlapping avatars (8px overlap, 2px surface ring), ending in "+N". */
export function AvatarGroup({ children, max = 4, size = "medium", "aria-label": ariaLabel }: AvatarGroupProps) {
  const { locale } = useLocale();
  const items = React.Children.toArray(children);
  const shown = items.length > max ? items.slice(0, max) : items;
  const rest = items.length - shown.length;
  return (
    <GroupContext.Provider value={size}>
      <span role="group" aria-label={ariaLabel} data-slot="avatar-group" className="inline-flex items-center [&>*+*]:-ms-ds-100">
        {shown}
        {rest > 0 && (
          <span
            role="img"
            aria-label={morePeopleLabel(locale, rest)}
            data-slot="avatar-group-more"
            className={cn("relative inline-grid shrink-0 place-items-center rounded-ds-full font-medium leading-none tabular-nums ring-2 ring-ds-surface", SIZE[size], NEUTRAL)}
          >
            {/* Isolated so an RTL page keeps "+4" rather than "4+". */}
            <bdi aria-hidden>+{new Intl.NumberFormat(locale).format(rest)}</bdi>
          </span>
        )}
      </span>
    </GroupContext.Provider>
  );
}
