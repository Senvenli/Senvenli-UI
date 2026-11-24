import { Button } from "@senvenli/react/action";
import { SegmentedControl } from "@senvenli/react/navigation";
import { cn } from "@senvenli/react";
import { useState, type ReactNode } from "react";
import { MANAGERS, setManager, useManager, type CommandVariant, type Manager } from "../lib/package-managers";
import { CopyButton } from "./CopyButton";

/** Taller than this many lines: clipped at 360px with "Show all N lines" (no fade: a plain edge and a button). */
const MAX_LINES = 18;

/**
 * Source in the code face, drawn so it reads as code at a glance: a sunken frame, and on it the code as its own
 * raised panel in the mono face; a `label` (a file name or language) or the package-manager switch sits on the frame
 * above the panel, with the copy button at its end. `html` is the build-time highlight (lib/highlight.server.ts);
 * without it the plain text shows. Long lines scroll sideways (indentation keeps its meaning). With no label the copy
 * button has its own end gutter in the panel, so it never covers code. `bare` is code inside an example block: no
 * frame and no copy button of its own (the example's caption bar has both). With `variants` (one per package manager)
 * the header holds the npm / pnpm / yarn / bun switch, and the choice holds page-wide. Shell commands (`prompt`, and
 * always with `variants`) start with a `$` that is drawn, not text: selecting or copying the command never includes
 * it. A block with a comment or a command that runs over several lines has no prompt, since not every line is one.
 */
export function CodeBlock({ variants, prompt = false, ...props }: CodeBlockProps & { variants?: CommandVariant[] }) {
  const manager = useManager();
  const lines = props.code.split("\n");
  const commands = prompt && !lines.some((line) => /^\s*#|^\s+\S|\\$/.test(line));
  if (!variants?.length) return <Block {...props} prompt={commands} />;
  const shown = variants.find((variant) => variant.id === manager) ?? variants[0]!;
  const header = (
    <SegmentedControl
      label="Package manager"
      items={MANAGERS.map((id) => ({ id, label: id }))}
      value={shown.id}
      onChange={(id) => setManager(id as Manager)}
    />
  );
  return <Block {...props} code={shown.code} html={shown.html} header={header} prompt />;
}

type CodeBlockProps = {
  code: string;
  html?: string;
  /** A file name or language, shown in a header row ("tsx", "app.tsx"). */
  label?: string;
  copyLabel?: string;
  bare?: boolean;
  /** The code is shell commands, one per line. */
  prompt?: boolean;
};

function Block({ code, html, label, copyLabel = "Copy code", bare = false, header, prompt = false }: CodeBlockProps & { header?: ReactNode }) {
  const lines = code.split("\n").length;
  const long = lines > MAX_LINES;
  const [expanded, setExpanded] = useState(false);
  const body = html ? (
    <div className="code-html overflow-x-auto" dir="ltr" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <pre className="m-0 overflow-x-auto p-ds-200 font-ds-mono text-code text-ds-text" dir="ltr">
      <code>
        {prompt
          ? code.split("\n").map((line, index, all) => (
              <span key={index} className="line">
                {line}
                {index < all.length - 1 ? "\n" : ""}
              </span>
            ))
          : code}
      </code>
    </pre>
  );
  return (
    <div data-slot="code-block" className={cn(!bare && "rounded-ds-xlarge bg-ds-surface-sunken p-ds-050", prompt && "code-prompt")}>
      {label || header ? (
        <div className={cn("flex items-center justify-between gap-ds-100 pe-ds-025", header ? "min-h-10 pb-ds-050 ps-ds-025" : "h-9 ps-ds-150")}>
          {header ?? <span className="min-w-0 truncate font-ds-mono text-code text-ds-text-subtle">{label}</span>}
          <CopyButton text={code} label={copyLabel} iconOnly />
        </div>
      ) : null}
      <div className={cn("relative overflow-hidden", !bare && "rounded-[max(0px,calc(var(--ds-radius-xlarge)-var(--ds-space-050)))] bg-ds-surface-raised")}>
        {!label && !header && !bare && (
          <div className="absolute end-ds-075 top-ds-075 z-10">
            <CopyButton text={code} label={copyLabel} iconOnly />
          </div>
        )}
        <div className={cn(!label && !header && !bare && "pe-ds-500", long && !expanded && "max-h-90 overflow-hidden")}>{body}</div>
      </div>
      {long && (
        <div className="flex justify-center py-ds-075">
          <Button size="small" variant="subtle" onPress={() => setExpanded((open) => !open)}>
            {expanded ? "Show less" : `Show all ${lines} lines`}
          </Button>
        </div>
      )}
    </div>
  );
}
