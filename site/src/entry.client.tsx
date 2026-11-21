import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { startAtNotFoundPath } from "./lib/not-found-document";

// The hydration check's hook (scripts/build-all.sh builds with VITE_SITE_CHECK=1): every console.error and
// uncaught error lands in `window.__siteErrors`, so a check reads it after load. Absent from the real build.
if (import.meta.env.VITE_SITE_CHECK === "1") {
  const seen: string[] = ((window as unknown as { __siteErrors: string[] }).__siteErrors = []);
  const original = console.error;
  console.error = (...args: unknown[]) => {
    seen.push(args.map(String).join(" ").slice(0, 20000));
    original(...args);
  };
  window.addEventListener("error", (event) => seen.push(`uncaught: ${event.message}`));
}

startAtNotFoundPath();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
    {
      // A hydration mismatch React recovers from is silent in production: say it, so the smoke test sees it.
      onRecoverableError(error, info) {
        console.error("[hydration]", error, info.componentStack);
      },
    },
  );
});
