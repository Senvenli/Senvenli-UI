import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};

/** False on the server and during hydration, true from the first client render after it. */
export function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

/**
 * The escape hatch for an example that cannot be the same at build time and in the browser (a live
 * clock, "today", a measured size). The fallback is prerendered and must reserve the final box
 * (`minHeight`), so nothing moves when the real content arrives.
 */
export function ClientOnly({ children, fallback = null, minHeight }: { children: () => ReactNode; fallback?: ReactNode; minHeight?: number }) {
  const isClient = useIsClient();
  return (
    <div data-slot="client-only" style={minHeight ? { minHeight } : undefined}>
      {isClient ? children() : fallback}
    </div>
  );
}
