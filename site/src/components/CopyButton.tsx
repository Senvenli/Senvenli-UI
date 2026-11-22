import { Button } from "@senvenli/react/action";
import { useEffect, useState } from "react";

/**
 * Copies text (or what `getText` resolves to) and says so for a moment. Site-local: the library has no copy button
 * of its own. `iconOnly` keeps it to an icon with `label` as its name (code blocks); the change is announced either way.
 */
export function CopyButton({ text, getText, label = "Copy", copiedLabel = "Copied", iconOnly = false }: {
  text?: string;
  getText?: () => Promise<string>;
  label?: string;
  copiedLabel?: string;
  iconOnly?: boolean;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 1600);
    return () => window.clearTimeout(timer);
  }, [state]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(getText ? await getText() : (text ?? ""));
      setState("copied");
    } catch {
      setState("failed");
    }
  };
  const said = state === "copied" ? copiedLabel : state === "failed" ? "Copy failed" : label;
  return (
    <>
      {iconOnly ? (
        <Button size="small" variant="subtle" iconOnly iconBefore={state === "copied" ? "check" : "copy"} aria-label={label} onPress={copy} />
      ) : (
        <Button size="small" variant="subtle" iconBefore={state === "copied" ? "check" : "copy"} onPress={copy}>
          {said}
        </Button>
      )}
      <span className="sr-only" aria-live="polite">
        {state === "idle" ? "" : said}
      </span>
    </>
  );
}
