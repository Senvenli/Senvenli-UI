import { Button } from "@senvenli/react/action";
import { cn } from "@senvenli/react";
import { useState } from "react";
import { CopyButton } from "./CopyButton";

/** Taller than this many lines: clipped at 360px with "Show all N lines" (no fade: a plain edge and a button). */
const MAX_LINES = 18;

/**
 * Source in the code face. `html` is the build-time highlight (lib/highlight.server.ts); without it the plain text
 * shows. Long lines scroll sideways (indentation keeps its meaning). The copy button sits in the header row when there
 * is a `label`, otherwise in its own end gutter, so it never covers code. `bare` is code inside an example block: no
 * background and no copy button of its own (the example's caption bar has both).
 */
export function CodeBlock({ code, html, label, copyLabel = "Copy code", bare = false }: {
  code: string;
  html?: string;
  /** A file name or language, shown in a header row ("tsx", "app.tsx"). */
  label?: string;
  copyLabel?: string;
  bare?: boolean;
}) {
  const lines = code.split("\n").length;
  const long = lines > MAX_LINES;
  const [expanded, setExpanded] = useState(false);
  const body = html ? (
    <div className="code-html overflow-x-auto" dir="ltr" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <pre className="m-0 overflow-x-auto p-ds-200 font-ds-mono text-code text-ds-text" dir="ltr">
      <code>{code}</code>
    </pre>
  );
  return (
    <div data-slot="code-block" className={cn("overflow-hidden", !bare && "rounded-ds-large bg-ds-surface-sunken")}>
      {label ? (
        <div className="flex h-9 items-center justify-between ps-ds-200 pe-ds-075">
          <span className="text-body-small text-ds-text-subtle">{label}</span>
          <CopyButton text={code} label={copyLabel} iconOnly />
        </div>
      ) : null}
      <div className="relative">
        {!label && !bare && (
          <div className="absolute end-ds-075 top-ds-075 z-10">
            <CopyButton text={code} label={copyLabel} iconOnly />
          </div>
        )}
        <div className={cn(!label && !bare && "pe-ds-500", long && !expanded && "max-h-90 overflow-hidden")}>{body}</div>
      </div>
      {long && (
        <div className="flex justify-center py-ds-075">
          <Button size="compact" variant="subtle" onPress={() => setExpanded((open) => !open)}>
            {expanded ? "Show less" : `Show all ${lines} lines`}
          </Button>
        </div>
      )}
    </div>
  );
}
