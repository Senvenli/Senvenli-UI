// No "use client": the head script is rendered by Server Components (a Next App Router layout).
import * as React from "react";

/** Where the theme choice lives: localStorage, never a cookie (a browser preference needs no consent). */
export const DEFAULT_THEME_STORAGE_KEY = "ds-theme";

export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The script's source: read the stored choice (or the device setting) and set data-theme. Nothing else. */
export function themeScriptSource(storageKey: string = DEFAULT_THEME_STORAGE_KEY) {
  // "<" escaped so a key can never close the script element.
  const key = JSON.stringify(storageKey).replace(/</g, "\\u003c");
  return (
    "(function(){var t;try{t=window.localStorage.getItem(" + key + ")}catch(e){}" +
    'if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("' + DARK_QUERY + '").matches?"dark":"light"}' +
    'try{document.documentElement.setAttribute("data-theme",t)}catch(e){}})();'
  );
}

/**
 * The inline script for <head>, before the stylesheets paint, so the first frame already has the
 * visitor's theme (no flash). Pass the page's CSP nonce. It sets data-theme on <html> before React
 * hydrates, so put `suppressHydrationWarning` on the <html> element.
 */
export function themeScript(nonce?: string, storageKey: string = DEFAULT_THEME_STORAGE_KEY) {
  return <script nonce={nonce} data-slot="theme-script" dangerouslySetInnerHTML={{ __html: themeScriptSource(storageKey) }} />;
}
