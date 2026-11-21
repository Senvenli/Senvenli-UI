import { Fragment } from "react";

/**
 * A JSDoc description as prose: single line breaks join (they are the source's wrapping), blank lines start a new
 * paragraph, and `backticks` become inline code. Nothing else of Markdown is read.
 */
export function DocText({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/).map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="m-0 [&+&]:mt-ds-100">
          {paragraph.split(/(`[^`]+`)/).map((part, at) =>
            part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
              <code key={at} className="font-ds-mono text-code">
                {part.slice(1, -1)}
              </code>
            ) : (
              <Fragment key={at}>{part}</Fragment>
            ),
          )}
        </p>
      ))}
    </>
  );
}
