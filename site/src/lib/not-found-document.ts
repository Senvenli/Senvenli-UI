import { useEffect } from "react";

/** The marker the not-found route puts in <head>; postbuild copies that page to 404.html. */
export const NOT_FOUND_META = "ds-not-found";

/** The path the not-found page is prerendered at. */
export const NOT_FOUND_PATH = "/404";

let visited: string | null = null;

/**
 * Call before hydrating. 404.html holds the page prerendered at /404, and nginx serves it at any
 * unknown URL. The router must hydrate the page the file holds: at "/components/nope" it would match
 * the component route instead, find no build-time data and fail hydration. So on that document the
 * router starts at /404, and `useRestoreVisitedUrl` gives the address bar the visitor's URL back.
 */
export function startAtNotFoundPath() {
  if (document.querySelector(`meta[name="${NOT_FOUND_META}"]`) === null) return;
  visited = window.location.pathname + window.location.search + window.location.hash;
  window.history.replaceState(null, "", NOT_FOUND_PATH);
}

/** In the root route (not beside the router in entry.client: a sibling there shifts every `useId`). */
export function useRestoreVisitedUrl() {
  useEffect(() => {
    if (visited === null) return;
    window.history.replaceState(window.history.state, "", visited);
    visited = null;
  }, []);
}
