import * as React from "react";

/**
 * Set by the Navbar's brand link. A logo component inside one is that link's content: it should
 * render no link of its own and name the link through its image's `alt` ("Acme home") rather than being
 * decorative under an aria-label; screen readers announce the same name either way. An app's own logo reads it
 * with `React.useContext(BrandLinkContext)`.
 */
export const BrandLinkContext = React.createContext(false);
