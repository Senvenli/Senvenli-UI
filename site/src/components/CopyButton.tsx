import { Button } from "@senvenli/react/action";
import { useEffect, useState } from "react";

/**
 * Copies text (or what `getText` resolves to) and says so for a moment. Site-local: the library has no copy
 * button of its own. A failed copy (no permission, an insecure origin) reads "Copy failed" instead.
 */
export function CopyButton({ text, getText, label = "Copy", copiedLabel = "Copied" }: {
  text?: string;
  getText?: () => Promise<string>;
  label?: string;
  copiedLabel?: string;
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
  return (
    <Button size="compact" variant="subtle" iconBefore={state === "copied" ? "check" : "copy"} onPress={copy}>
      {state === "copied" ? copiedLabel : state === "failed" ? "Copy failed" : label}
    </Button>
  );
}
