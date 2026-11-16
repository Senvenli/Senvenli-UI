"use client";

import * as React from "react";
import type { RouterProvider } from "react-aria-components";

type Navigate = React.ComponentProps<typeof RouterProvider>["navigate"];

/**
 * @internal The host router's `navigate` from DesignSystemProvider, for parts
 * that write the URL themselves (a data table's view state). Apps pass
 * `navigate` to the provider once.
 */
export const NavigateContext = React.createContext<Navigate | null>(null);

/** @internal The provider's `navigate`; null outside a DesignSystemProvider. */
export function useDesignSystemNavigate(): Navigate | null {
  return React.useContext(NavigateContext);
}
