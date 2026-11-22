import { Button } from "@senvenli/react/action";
import { SegmentedControl } from "@senvenli/react/navigation";
import { cn } from "@senvenli/react";
import { useState, type ReactNode } from "react";
import { MANAGERS, setManager, useManager, type CommandVariant, type Manager } from "../lib/package-managers";
import { CopyButton } from "./CopyButton";

/** Taller than this many lines: clipped at 360px with "Show all N lines" (no fade: a plain edge and a button). */
const MAX_LINES = 18;

/**
 * Source in the code face. `html` is the build-time highlight (lib/highlight.server.ts); without it the plain text
 * shows. Long lines scroll sideways (indentation keeps its meaning). The copy button sits in the header row when there
 * is a `label`, otherwise in its own end gutter, so it never covers code. `bare` is code inside an example block: no
 * background and no copy button of its own (the example's caption bar has both). With `variants` (one per package
 * manager) the header holds the npm / pnpm / yarn / bun switch instead of a label, and the choice holds page-wide.
 */
export function CodeBlock({ variants, ...props }: CodeBlockProps & { variants?: CommandVariant[] }) {
  const manager = useManager();
  if (!variants?.length) return <Block {...props} />;
  const shown = variants.find((variant) => variant.id === manager) ?? variants[0]!;
  const header = (
    <SegmentedControl
      label="Package manager"
      items={MANAGERS.map((id) => ({ id, label: id }))}
      value={shown.id}
      onChange={(id) => setManager(id as Manager)}
    />
  );
  return <Block {...props} code={shown.code} html={shown.html} header={header} />;
}

type CodeBlockProps = {
  code: string;
  html?: string;
  /** A file name or language, shown in a header row ("tsx", "app.tsx"). */
  label?: string;
  copyLabel?: string;
  bare?: boolean;
};

function Block({ code, html, label, copyLabel = "Copy code", bare = false, header }: CodeBlockProps & { header?: ReactNode }) {
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
      {label || header ? (
        <div className={cn("flex items-center justify-between pe-ds-075", header ? "min-h-10 ps-ds-075 pt-ds-075" : "h-9 ps-ds-200")}>
          {header ?? <span className="text-body-small text-ds-text-subtle">{label}</span>}
          <CopyButton text={code} label={copyLabel} iconOnly />
        </div>
      ) : null}
      <div className="relative">
        {!label && !header && !bare && (
          <div className="absolute end-ds-075 top-ds-075 z-10">
            <CopyButton text={code} label={copyLabel} iconOnly />
          </div>
        )}
        <div className={cn(!label && !header && !bare && "pe-ds-500", long && !expanded && "max-h-90 overflow-hidden")}>{body}</div>
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
