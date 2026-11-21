import { Fragment } from "react";

function withCode(text: string) {
  return text.split(/(`[^`]+`)/).map((part, at) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
      <code key={at} className="rounded-ds-small bg-ds-surface-sunken px-ds-050 font-ds-mono text-[0.875em]">
        {part.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={at}>{part}</Fragment>
    ),
  );
}

/**
 * A manifest or JSDoc text as prose: single line breaks join (they are the source's wrapping), blank lines start a
 * new paragraph, and `backticks` become inline code. `inline` renders one run of text with no paragraph element,
 * for a bullet or a table cell. Nothing else of Markdown is read.
 */
export function DocText({ text, inline = false }: { text: string; inline?: boolean }) {
  if (inline) return <>{withCode(text.replace(/\s*\n\s*/g, " ").trim())}</>;
  const paragraphs = text.split(/\n\s*\n/).map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="m-0 [&+&]:mt-ds-100">
          {withCode(paragraph)}
        </p>
      ))}
    </>
  );
}
