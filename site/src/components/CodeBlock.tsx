import { CopyButton } from "./CopyButton";

/** Source text in the code face, scrolling sideways rather than wrapping, with a copy button at the top. */
export function CodeBlock({ code, label = "Copy code" }: { code: string; label?: string }) {
  return (
    <div data-slot="code-block" className="relative rounded-ds-medium bg-ds-surface-sunken">
      <div className="absolute end-ds-100 top-ds-100">
        <CopyButton text={code} label={label} />
      </div>
      <pre className="m-0 overflow-x-auto p-ds-200 pe-28 font-ds-mono text-code text-ds-text" dir="ltr">
        <code>{code}</code>
      </pre>
    </div>
  );
}
