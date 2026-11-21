import { DesignSystemProvider } from "@senvenli/react";
import { themeScript } from "@senvenli/react/action";
import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useLocation, useNavigate, type LinksFunction } from "react-router";
import type { Route } from "./+types/root";
import { orderComponents } from "./lib/manifest";
import { loadIndex } from "./lib/manifest.server";
import { useRestoreVisitedUrl } from "./lib/not-found-document";
import { presetScriptSource } from "./lib/theme-head";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SiteShell } from "./pages/SiteShell";
import "./tailwind.css";
import "./styles.css";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono:wght@400;500&display=swap" },
];

/** The document. The two head scripts run before the first paint: light or dark first, the preset after the stylesheets. */
export function Layout({ children }: { children: ReactNode }) {
  return (
    // The head scripts set data-theme (and data-preset-pending) before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {themeScript()}
        <Meta />
        <Links />
        {/* After the stylesheets: the preset's variables have the same specificity as the default theme's, so order decides. */}
        <script data-slot="preset-script" dangerouslySetInnerHTML={{ __html: presetScriptSource }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/** Every component, for the site search: prerendered into each page's data. */
export async function loader() {
  return { components: orderComponents(await loadIndex()) };
}

export default function Root({ loaderData }: Route.ComponentProps) {
  // The library's links (Link, Breadcrumbs, Navbar…) route through the host router.
  // No `useHref`: the site has no basename, and the router's useHref resolves every href against the
  // current location. That turns "#" into the page path and "https://example.com" into a path under it,
  // and the page path differs between the prerender ("/create/") and the browser ("/create").
  const navigate = useNavigate();
  useRestoreVisitedUrl();
  // The first path segment only: the prerender renders "/components/" and the browser "/components", the same key.
  const section = useLocation().pathname.split("/").filter(Boolean)[0];
  return (
    <DesignSystemProvider locale="en" navigate={navigate}>
      <SiteShell section={section} components={loaderData.components} onNavigate={(href) => navigate(href)}>
        <Outlet />
      </SiteShell>
    </DesignSystemProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <DesignSystemProvider locale="en">
      {/* The boundary replaces the route, its meta included: it names the page itself. */}
      <title>{notFound ? "Page not found · Senvenli UI" : "Something went wrong · Senvenli UI"}</title>
      <SiteShell>{notFound ? <NotFoundPage /> : <p role="alert">Something went wrong. Reload the page.</p>}</SiteShell>
    </DesignSystemProvider>
  );
}
