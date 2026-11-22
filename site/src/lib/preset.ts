import { toCSS, type Theme, type ThemeInput } from "@senvenli/tokens";
import { PRESET_FORMAT, PRESET_STORAGE_KEY, type StoredPreset } from "./theme-head";

/** The stock presets the builder and the home page offer. */
export const PRESETS: Array<{ id: string; name: string; input: ThemeInput }> = [
  { id: "neutral", name: "Neutral", input: {} },
  { id: "gold", name: "Gold", input: { primary: "#996a00" } },
  { id: "ocean", name: "Ocean", input: { primary: "#1268ae", secondary: "#e3edf7" } },
  { id: "violet", name: "Violet", input: { primary: "#6e56cf", tertiary: "#e9e3fb", radius: 1 } },
  { id: "forest", name: "Forest", input: { primary: "#2f6f4f", radius: 0.375, density: "compact" } },
];

/** The visitor's stored preset, when it is of the current format. */
export function readStoredPreset(): StoredPreset | null {
  try {
    const stored = JSON.parse(window.localStorage.getItem(PRESET_STORAGE_KEY) ?? "null") as StoredPreset | null;
    return stored?.v === PRESET_FORMAT ? stored : null;
  } catch {
    return null;
  }
}

/** Keeps the compiled CSS for the head script (lib/theme-head.ts), so the next page paints with the preset. */
export function storePreset(preset: StoredPreset | null) {
  try {
    if (preset) window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(preset));
    else window.localStorage.removeItem(PRESET_STORAGE_KEY);
  } catch {
    // Storage blocked: the preset lasts this page only.
  }
}

/**
 * Applies a theme to the whole page (the `theme-vars` style element the head script also writes) and remembers it,
 * so every page the visitor opens next paints with it. A theme with no input clears the stored preset.
 */
export function applyTheme(theme: Theme, code: string) {
  const el = (document.getElementById("theme-vars") as HTMLStyleElement | null) ?? document.createElement("style");
  el.id = "theme-vars";
  // Last in <head> every time: the theme's variables tie with the default theme's in specificity, so order decides,
  // and a stylesheet injected after the head script (Vite's dev styles) would otherwise win.
  document.head.appendChild(el);
  el.textContent = toCSS(theme);
  storePreset(Object.keys(theme.input).length ? { v: PRESET_FORMAT, code, css: el.textContent } : null);
}
