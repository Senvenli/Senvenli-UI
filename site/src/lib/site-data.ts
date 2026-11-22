import { createContext, useContext } from "react";
import type { ManifestIndexEntry } from "./manifest";

/** What every page's chrome needs from the root loader: the lists for the sidebar and search, and the current path. */
export type SiteData = { components: ManifestIndexEntry[]; docs: { slug: string; title: string }[]; path: string };

export const SiteDataContext = createContext<SiteData | null>(null);

/** Null outside the app's root (a page rendered on its own in a test): the chrome that needs it renders nothing. */
export const useSiteData = () => useContext(SiteDataContext);
