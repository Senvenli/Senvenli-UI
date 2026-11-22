"use client";

import * as React from "react";
import {
  Button as AriaButton,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuTrigger,
  Popover as AriaPopover,
  ToggleButton as AriaToggleButton,
  ToggleButtonGroup as AriaToggleButtonGroup,
  Tooltip as AriaTooltip,
  TooltipTrigger,
  useLocale,
  type Key,
} from "react-aria-components";

import { cn } from "../utils";
import { IconGlyph, type IconName } from "../display/icon";
import { contentLang, themeLabels } from "../i18n";
import { DARK_QUERY, DEFAULT_THEME_STORAGE_KEY } from "./theme-script";

export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
export type ThemeLabels = ReturnType<typeof themeLabels>;

const CHOICES: { id: ThemeChoice; icon: IconName }[] = [
  { id: "system", icon: "monitor" },
  { id: "light", icon: "sun" },
  { id: "dark", icon: "moon" },
];

function readStored(key: string): ThemeChoice {
  try {
    const value = window.localStorage.getItem(key);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    // Storage blocked (privacy mode, sandboxed frame): the choice lasts the session only.
    return "system";
  }
}

/** Writes the choice; false when storage is unusable (the in-memory choice is then the only copy). */
function writeStored(key: string, choice: ThemeChoice): boolean {
  try {
    if (choice === "system") window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, choice);
    return true;
  } catch {
    // As above: without storage the control still works for this page.
    return false;
  }
}

/**
 * One choice per storage key for the whole page: every toggle and hook reading the key sees the same
 * value (the Navbar segments and the phone-menu list stay in step), and other tabs reach it through
 * the storage event.
 */
type ChoiceStore = {
  value: ThemeChoice | undefined;
  listeners: Set<() => void>;
  onStorage?: (event: StorageEvent) => void;
  /** This key's last write could not reach storage, so its in-memory choice is the only copy. */
  writeFailed?: boolean;
};
const stores = new Map<string, ChoiceStore>();

/** Test isolation only (not exported from the package): forget every page-wide choice and write failure. */
export function resetThemeStoresForTests() {
  for (const store of stores.values()) if (store.onStorage) window.removeEventListener("storage", store.onStorage);
  stores.clear();
}
function storeFor(key: string): ChoiceStore {
  let store = stores.get(key);
  if (!store) {
    store = { value: undefined, listeners: new Set() };
    stores.set(key, store);
  }
  return store;
}
function notify(store: ChoiceStore) {
  for (const listener of store.listeners) listener();
}
function getChoice(key: string): ThemeChoice {
  const store = storeFor(key);
  if (store.value === undefined) store.value = readStored(key);
  return store.value;
}
function setStoredChoice(key: string, next: ThemeChoice) {
  const store = storeFor(key);
  store.writeFailed = !writeStored(key, next);
  store.value = next;
  notify(store);
}
function subscribeChoice(key: string, listener: () => void) {
  const store = storeFor(key);
  store.listeners.add(listener);
  if (!store.onStorage) {
    store.onStorage = (event: StorageEvent) => {
      // A key cleared everywhere (event.key === null) or this key changed in another tab.
      if (event.key !== key && event.key !== null) return;
      store.value = readStored(key);
      notify(store);
    };
    window.addEventListener("storage", store.onStorage);
  }
  return () => {
    store.listeners.delete(listener);
    if (store.listeners.size === 0 && store.onStorage) {
      window.removeEventListener("storage", store.onStorage);
      store.onStorage = undefined;
      // Read fresh next time something mounts, unless storage is unusable: then the in-memory choice
      // is all there is, and it must survive the last toggle unmounting (a phone drawer closing).
      if (!store.writeFailed) store.value = undefined;
    }
  };
}

function systemIsDark() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches;
}
function subscribeSystem(listener: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia(DARK_QUERY);
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }
  // Safari 13 and older only have the deprecated listener API.
  media.addListener?.(listener);
  return () => media.removeListener?.(listener);
}

/** Freezes transitions for one frame while the theme swaps; a constructable sheet, so a strict CSP style-src allows it. */
let freezeSheet: CSSStyleSheet | undefined;
function freezeTransitions() {
  if (typeof CSSStyleSheet === "undefined" || !("adoptedStyleSheets" in document)) return () => {};
  try {
    if (!freezeSheet) {
      freezeSheet = new CSSStyleSheet();
      freezeSheet.replaceSync("*,*::before,*::after{transition:none!important}");
    }
    const sheet = freezeSheet;
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    return () => {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter((item) => item !== sheet);
    };
  } catch {
    return () => {};
  }
}

/** Sets data-theme on <html>, recolouring at once: no page transition runs on the swap. */
function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  if (root.getAttribute("data-theme") === theme) return;
  const thaw = freezeTransitions();
  root.setAttribute("data-theme", theme);
  // Flush the styles with transitions off, then let them run again.
  void window.getComputedStyle(root).color;
  window.requestAnimationFrame(thaw);
}

/**
 * The visitor's theme: `system` (the default, following prefers-color-scheme live) or a stored
 * `light` / `dark`. One value per storage key across the page, followed across tabs; applies
 * data-theme on <html>. Renders `system` on the server and during hydration, then the stored value;
 * the theme is applied only once the real value is known, so nothing writes a wrong theme on mount.
 */
export function useThemePreference(
  storageKey: string = DEFAULT_THEME_STORAGE_KEY,
  /** `false` when someone else owns the theme (a controlled ThemeSwitcher): no storage, no data-theme. */
  { manage = true }: { manage?: boolean } = {},
) {
  const choice = React.useSyncExternalStore<ThemeChoice>(
    React.useCallback((listener) => (manage ? subscribeChoice(storageKey, listener) : () => {}), [storageKey, manage]),
    () => (manage ? getChoice(storageKey) : "system"),
    () => "system",
  );
  const prefersDark = React.useSyncExternalStore(subscribeSystem, systemIsDark, () => false);
  const [mounted, setMounted] = React.useState(false);
  React.useLayoutEffect(() => setMounted(true), []);

  const resolved: ResolvedTheme = choice === "system" ? (prefersDark ? "dark" : "light") : choice;
  React.useEffect(() => {
    if (manage && mounted) applyTheme(resolved);
  }, [resolved, manage, mounted]);

  const setChoice = React.useCallback(
    (next: ThemeChoice) => {
      if (manage) setStoredChoice(storageKey, next);
    },
    [storageKey, manage],
  );
  return { choice, setChoice, resolved, systemTheme: (prefersDark ? "dark" : "light") as ResolvedTheme };
}

export type ThemeSwitcherProps = {
  /** Controlled choice; leave out to let the toggle manage, store and apply it. */
  value?: ThemeChoice;
  onChange?: (choice: ThemeChoice) => void;
  /** Localized names; the locale's built-in strings by default. */
  labels?: Partial<ThemeLabels>;
  storageKey?: string;
  /**
   * `segmented`: three icon buttons. `menu`: one icon button (the theme in effect) that opens System / Light / Dark,
   * the compact form for a busy header. `list`: a three-option list with a check, for the phone menu.
   */
  variant?: "segmented" | "menu" | "list";
};

const SEGMENT =
  "grid size-7 cursor-pointer place-items-center rounded-ds-small text-ds-icon-subtle outline-hidden " +
  "data-[hovered]:text-ds-icon data-[selected]:bg-ds-background-segment-selected data-[selected]:text-ds-icon data-[selected]:shadow-ds-raised " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused";

const ROW =
  "flex h-ds-control w-full cursor-pointer items-center gap-ds-150 rounded-ds-small px-ds-150 text-start text-body text-ds-text outline-hidden " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused";

/**
 * System, Light or Dark for a public site, as a radio group: Tab enters and leaves once, arrow keys
 * move and select. System is the default and follows the device; a choice is kept in localStorage.
 * One per page, in the Navbar's end area (`segmented` or `menu`); `variant="list"` in the phone menu. Put
 * `themeScript(nonce)` in <head> so the first paint already has the theme.
 */
export function ThemeSwitcher({ value, onChange, labels: given, storageKey, variant: appearance = "segmented" }: ThemeSwitcherProps) {
  const { locale, direction } = useLocale();
  const labelId = `${React.useId()}-label`;
  const labels = { ...themeLabels(locale), ...given };
  // Controlled, the parent owns the theme (and usually calls useThemePreference itself).
  const preference = useThemePreference(storageKey, { manage: value === undefined });
  const choice = value ?? preference.choice;
  const choose = (next: ThemeChoice) => {
    if (value === undefined) preference.setChoice(next);
    onChange?.(next);
  };
  const name = (id: ThemeChoice) => labels[id];
  const onSelectionChange = (keys: Set<Key>) => {
    const [next] = Array.from(keys) as ThemeChoice[];
    if (next) choose(next);
  };

  // A radio group: Tab enters at the checked option and leaves (the others are out of the tab order).
  // React Aria's group moves focus with the arrow keys in the reading direction; a radio reached that
  // way is selected. Focus from anywhere else (a screen reader's cursor, focus coming back to the page,
  // a click) never changes the theme by itself.
  const arrowed = React.useRef(false);
  const buttons = React.useRef(new Map<ThemeChoice, HTMLElement>());
  const register = (id: ThemeChoice) => (element: HTMLElement | null) => {
    if (element) buttons.current.set(id, element);
    else buttons.current.delete(id);
  };
  // The radio pattern, handled here for both orientations: Right/Down move forward and Left/Up back
  // (Left forward in RTL), wrapping at the ends; Home and End jump. React Aria's own toolbar keys only
  // follow the group's orientation and stop at the ends, so they never see these keys.
  const onKeyDownCapture = (event: React.KeyboardEvent) => {
    const forward = ["ArrowDown", direction === "rtl" ? "ArrowLeft" : "ArrowRight"];
    const backward = ["ArrowUp", direction === "rtl" ? "ArrowRight" : "ArrowLeft"];
    const at = CHOICES.findIndex(({ id }) => buttons.current.get(id) === document.activeElement);
    const last = CHOICES.length - 1;
    let target: number | undefined;
    if (event.key === "Home") target = 0;
    else if (event.key === "End") target = last;
    else if (forward.includes(event.key)) target = at === last ? 0 : at + 1;
    else if (backward.includes(event.key)) target = at <= 0 ? last : at - 1;
    if (target === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    arrowed.current = true;
    buttons.current.get(CHOICES[target].id)?.focus();
    arrowed.current = false;
  };
  const selectOnFocus = (id: ThemeChoice) => () => {
    if (!arrowed.current) return;
    arrowed.current = false;
    if (id !== choice) choose(id);
  };

  if (appearance === "menu") {
    // The menu is React Aria's, styled as the library's Menu (overlay/floating.tsx), which this file cannot import
    // without a cycle (overlay imports the action family).
    const shown = choice === "system" ? (preference.systemTheme === "dark" ? "moon" : "sun") : CHOICES.find(({ id }) => id === choice)!.icon;
    return (
      <MenuTrigger>
        <AriaButton
          aria-label={`${labels.theme}: ${name(choice)}`}
          data-slot="theme-switcher"
          data-variant="menu"
          className={
            "grid size-8 cursor-pointer place-items-center rounded-ds-medium text-ds-icon-subtle outline-hidden " +
            "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[hovered]:text-ds-icon data-[pressed]:bg-ds-background-neutral-pressed " +
            "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused"
          }
        >
          <IconGlyph name={shown} />
        </AriaButton>
        <AriaPopover
          placement="bottom end"
          offset={4}
          data-slot="theme-switcher-popover"
          className={
            "min-w-40 rounded-ds-xlarge bg-ds-surface-overlay p-ds-050 text-ds-text shadow-ds-overlay outline-hidden " +
            "transition-opacity duration-(--ds-duration-medium) data-[entering]:opacity-0 data-[exiting]:opacity-0 motion-reduce:transition-none"
          }
        >
          <AriaMenu
            aria-label={labels.theme}
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[choice]}
            onSelectionChange={(keys) => keys !== "all" && onSelectionChange(keys as Set<Key>)}
            className="flex flex-col outline-hidden"
          >
            {CHOICES.map(({ id, icon }) => (
              <AriaMenuItem
                key={id}
                id={id}
                textValue={name(id)}
                data-slot="theme-switcher-option"
                className={
                  "flex min-h-8 cursor-default items-center gap-ds-100 rounded-ds-small px-ds-100 text-body outline-hidden select-none " +
                  "data-[focused]:bg-ds-background-neutral-subtle-hovered data-[pressed]:bg-ds-background-neutral-pressed"
                }
              >
                {({ isSelected }) => (
                  <>
                    <IconGlyph name={icon} color="subtle" />
                    <span className="flex-1">{name(id)}</span>
                    {isSelected && <IconGlyph name="check" data-slot="theme-switcher-check" />}
                  </>
                )}
              </AriaMenuItem>
            ))}
          </AriaMenu>
        </AriaPopover>
      </MenuTrigger>
    );
  }

  if (appearance === "list") {
    return (
      <div data-slot="theme-switcher" data-variant="list" className="flex flex-col gap-ds-050">
        <span id={labelId} lang={contentLang(locale)} data-slot="theme-switcher-label" className="px-ds-150 text-heading-xxsmall text-ds-text-subtle uppercase">
          {labels.theme}
        </span>
        <div className="contents" onKeyDownCapture={onKeyDownCapture}>
        <AriaToggleButtonGroup
          aria-labelledby={labelId}
          selectionMode="single"
          disallowEmptySelection
          orientation="vertical"
          selectedKeys={[choice]}
          onSelectionChange={onSelectionChange}
          className="flex flex-col"
        >
          {CHOICES.map(({ id, icon }) => (
            <AriaToggleButton key={id} id={id} ref={register(id)} excludeFromTabOrder={id !== choice} onFocus={selectOnFocus(id)} data-slot="theme-switcher-option" className={ROW}>
              <IconGlyph name={icon} color="subtle" />
              <span className="flex-1">{name(id)}</span>
              {choice === id && <IconGlyph name="check" data-slot="theme-switcher-check" />}
            </AriaToggleButton>
          ))}
        </AriaToggleButtonGroup>
        </div>
      </div>
    );
  }

  return (
    <div className="contents" onKeyDownCapture={onKeyDownCapture}>
    <AriaToggleButtonGroup
      aria-label={labels.theme}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[choice]}
      onSelectionChange={onSelectionChange}
      data-slot="theme-switcher"
      data-variant="segmented"
      className="inline-flex gap-0.5 rounded-ds-medium bg-ds-background-neutral p-0.5"
    >
      {CHOICES.map(({ id, icon }) => {
        // System says what is in effect right now ("Theme: System · now dark").
        const tip =
          id === "system"
            ? `${labels.theme}: ${labels.system} · ${preference.systemTheme === "dark" ? labels.nowDark : labels.nowLight}`
            : `${labels.theme}: ${name(id)}`;
        return (
          <TooltipTrigger key={id} delay={300} closeDelay={0}>
            <AriaToggleButton
              id={id}
              ref={register(id)}
              excludeFromTabOrder={id !== choice}
              onFocus={selectOnFocus(id)}
              // The group already says "Tema"; the tooltip keeps "Tema: …" for sighted users.
              aria-label={name(id)}
              data-slot="theme-switcher-option"
              className={SEGMENT}
            >
              <IconGlyph name={icon} />
            </AriaToggleButton>
            {/* React Aria's Tooltip styled per the Tooltip README; swap to the DS Tooltip when F2 exports it. */}
            <AriaTooltip
              offset={6}
              data-slot="theme-switcher-tooltip"
              className="max-w-[240px] rounded-ds-small bg-ds-background-neutral-bold px-ds-100 py-ds-050 text-body-small text-ds-text-inverse"
            >
              {tip}
            </AriaTooltip>
          </TooltipTrigger>
        );
      })}
    </AriaToggleButtonGroup>
    </div>
  );
}
