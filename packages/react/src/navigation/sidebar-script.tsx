// No client directive: the head script is rendered by Server Components (a Next App Router layout), like
// themeScript. The Sidebar (a client component) imports the attribute from here.
import * as React from "react";

/** The attribute the head script and the sidebar keep on <html> when the choice is remembered. */
export const ROOT_ATTRIBUTE = "data-ds-sidebar";

/**
 * The inline script for <head> that sets the remembered collapsed state on <html> before the first paint,
 * so a sidebar persisted with `storageKey` never jumps on load. Pass the page's CSP nonce. Server-safe: it
 * lives outside the client Sidebar module, so a Server Component layout can render it.
 */
export function sidebarScript(storageKey: string, { defaultCollapsed = false, nonce }: { defaultCollapsed?: boolean; nonce?: string } = {}) {
  const key = JSON.stringify(storageKey).replace(/</g, "\\u003c");
  const fallback = defaultCollapsed ? "collapsed" : "expanded";
  const source =
    "(function(){var v;try{v=window.localStorage.getItem(" + key + ")}catch(e){}" +
    'if(v!=="collapsed"&&v!=="expanded"){v="' + fallback + '"}' +
    'try{document.documentElement.setAttribute("' + ROOT_ATTRIBUTE + '",v)}catch(e){}})();';
  return <script nonce={nonce} data-slot="sidebar-script" dangerouslySetInnerHTML={{ __html: source }} />;
}
