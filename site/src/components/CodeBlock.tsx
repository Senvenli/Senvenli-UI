import { CopyButton } from "./CopyButton";

/**
 * Source in the code face, with a copy button. `html` is the build-time highlight (lib/highlight.server.ts); without
 * it the plain text shows. Long lines scroll sideways rather than wrap, so indentation keeps its meaning.
 */
export function CodeBlock({ code, html, label = "Copy code", language }: { code: string; html?: string; label?: string; language?: string }) {
  return (
    <div data-slot="code-block" className="group/code relative overflow-hidden rounded-ds-medium bg-ds-surface-sunken">
      <div className="absolute end-ds-100 top-ds-100 z-10 flex items-center gap-ds-100">
        {language && <span className="text-body-small text-ds-text-subtlest">{language}</span>}
        <CopyButton text={code} label={label} />
      </div>
      {html ? (
        <div className="code-html overflow-x-auto" dir="ltr" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="m-0 overflow-x-auto p-ds-200 pe-32 font-ds-mono text-code text-ds-text" dir="ltr">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
