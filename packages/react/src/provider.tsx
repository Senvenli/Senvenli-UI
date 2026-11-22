"use client";

import * as React from "react";
import { I18nProvider, RouterProvider } from "react-aria-components";

import { ComponentDefaultsProvider, type ComponentDefaults } from "./defaults";
import { intlLocale } from "./intl-locale";
import { NavigateContext } from "./navigate-context";
import { ToasterRoot } from "./overlay/toast";

type RouterProviderProps = React.ComponentProps<typeof RouterProvider>;

export type DesignSystemProviderProps = {
  /** BCP 47 locale for dates, numbers and component strings ("en", "en-GB", "tr"…). */
  locale?: string;
  /** Client-side navigation from the host router; links use it instead of a full page load. */
  navigate?: RouterProviderProps["navigate"];
  /** Turns a route into an `href` the host router understands (base paths, locale prefixes). */
  useHref?: RouterProviderProps["useHref"];
  /**
   * App-wide defaults: `size` (small | medium | large) and `radius` (none | small | medium | large | full) for every
   * component that has them. A component's own prop always wins.
   */
  defaults?: ComponentDefaults;
  children: React.ReactNode;
};

/**
 * Root provider. Gives every component the locale (React Aria `I18nProvider`)
 * and, when `navigate` is passed, the host router (`RouterProvider`).
 * Component strings for other languages come from `registerDsStrings`. The toast region
 * is mounted once here, so `toast(...)` works anywhere under the provider.
 */
export function DesignSystemProvider({ locale = "en", navigate, useHref, defaults, children }: DesignSystemProviderProps) {
  const content = (
    <I18nProvider locale={intlLocale(locale)}>
      <ComponentDefaultsProvider value={defaults ?? {}}>
        <ToasterRoot>{children}</ToasterRoot>
      </ComponentDefaultsProvider>
    </I18nProvider>
  );
  if (!navigate) return content;
  return (
    <NavigateContext.Provider value={navigate}>
      <RouterProvider navigate={navigate} useHref={useHref}>
        {content}
      </RouterProvider>
    </NavigateContext.Provider>
  );
}
