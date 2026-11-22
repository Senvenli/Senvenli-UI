import { Button } from "@senvenli/react/action";
import { cn } from "@senvenli/react";
import { Heading, Text } from "@senvenli/react/display";
import { Suspense, useId, useState } from "react";
import { exampleComponent } from "../examples/registry";
import type { ExampleData } from "../examples/types";
import { CodeBlock } from "./CodeBlock";
import { CopyButton } from "./CopyButton";

/** Families whose examples fill the stage's width; the rest are centered. */
const STRETCH_FAMILIES = new Set(["charts", "collection", "form", "layout", "navigation"]);

/**
 * One example as one unit: a sunken block holding a raised, shadowless stage with the live render, a caption bar
 * ("Show code" and copy, which works while the code is closed), and the code, which opens inside the same block.
 * The hero (the first example) carries its title in the caption bar; the others have an h3 above the block.
 */
export function ExampleBlock({ slug, family, example, isHero = false }: { slug: string; family: string; example: ExampleData; isHero?: boolean }) {
  const Live = exampleComponent(slug, example.id);
  const [open, setOpen] = useState(false);
  const codeId = useId();
  const stretch = (example.align ?? (STRETCH_FAMILIES.has(family) ? "stretch" : "center")) === "stretch";
  return (
    <section id={`example-${example.id}`} data-slot="example" aria-label={isHero ? example.title : undefined} className="flex scroll-mt-24 flex-col gap-ds-150">
      {!isHero && (
        <div className="flex flex-col gap-ds-050">
          <Heading level={3} size="heading-small">
            {example.title}
          </Heading>
          {example.description && <Text tone="subtle">{example.description}</Text>}
        </div>
      )}
      <div data-slot="example-block" className="flex flex-col gap-ds-100 rounded-ds-xlarge bg-ds-surface-sunken p-ds-100">
        <div
          data-slot="example-stage"
          className={cn(
            "flex min-h-40 overflow-x-auto rounded-ds-large bg-ds-surface-raised p-ds-250 sm:p-ds-500",
            stretch ? "items-center" : "items-center justify-center",
          )}
        >
          <div className={cn("min-w-0", stretch && "w-full")}>
            {/* The prerender waits for the chunk; in the browser the server HTML stays until it has loaded. */}
            <Suspense fallback={null}>{Live && <Live />}</Suspense>
          </div>
        </div>
        <div className="flex min-h-9 items-center justify-between gap-ds-200 ps-ds-150">
          <span className="min-w-0 truncate text-body-small text-ds-text-subtle">{isHero ? example.title : ""}</span>
          <span className="flex shrink-0 items-center gap-ds-050">
            <Button size="compact" variant="subtle" iconAfter={open ? "chevron-up" : "chevron-down"} aria-expanded={open} aria-controls={codeId} onPress={() => setOpen((value) => !value)}>
              {open ? "Hide code" : "Show code"}
            </Button>
            <CopyButton text={example.code} label="Copy code" iconOnly />
          </span>
        </div>
        <div id={codeId} hidden={!open}>
          <CodeBlock code={example.code} html={example.html} bare />
        </div>
      </div>
    </section>
  );
}
