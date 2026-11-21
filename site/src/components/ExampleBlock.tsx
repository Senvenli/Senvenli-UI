import { Heading, Text } from "@senvenli/react/display";
import { Disclosure } from "@senvenli/react/navigation";
import { Suspense } from "react";
import { exampleComponent } from "../examples/registry";
import type { ExampleData } from "../examples/types";
import { CodeBlock } from "./CodeBlock";

/** One example: its title and note, the live render on a raised surface, and its source behind "Show code". */
export function ExampleBlock({ slug, example, headingLevel = 3 }: { slug: string; example: ExampleData; headingLevel?: 2 | 3 }) {
  const Live = exampleComponent(slug, example.id);
  return (
    <section id={`example-${example.id}`} data-slot="example" className="flex scroll-mt-20 flex-col gap-ds-150">
      <div className="flex flex-col gap-ds-050">
        <Heading level={headingLevel} size="heading-small">
          {example.title}
        </Heading>
        {example.description && (
          <Text size="body-small" tone="subtle">
            {example.description}
          </Text>
        )}
      </div>
      <div data-slot="example-stage" className="flex min-h-28 items-center justify-center overflow-x-auto rounded-ds-large bg-ds-surface-raised p-ds-400 shadow-ds-raised">
        <div className="w-full min-w-0">
          {/* The prerender waits for the chunk; in the browser the server HTML stays until it has loaded. */}
          <Suspense fallback={null}>{Live && <Live />}</Suspense>
        </div>
      </div>
      <Disclosure title="Show code" headingLevel={headingLevel === 2 ? 3 : 4}>
        <CodeBlock code={example.code} />
      </Disclosure>
    </section>
  );
}
