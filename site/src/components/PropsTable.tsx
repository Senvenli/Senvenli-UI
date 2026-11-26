import { Badge, Text } from "@senvenli/react/display";
import { Disclosure } from "@senvenli/react/navigation";
import type { ManifestProp } from "../lib/manifest";
import { DocText } from "./DocText";

const code = "font-ds-mono text-code";

/**
 * One row per prop, at every width: the name (and a Required badge) on the start side, and beside it the type as a
 * chip with the default on the same line and the description in full below. Below 640px the two sides stack.
 * Nothing is squeezed into a narrow column, so a type breaks only between its words (a union over two lines),
 * never inside one, and a long description gets the page's measure.
 */
function Rows({ props }: { props: ManifestProp[] }) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {props.map((prop) => (
        <li
          key={prop.name}
          data-slot="prop-row"
          className="grid gap-ds-100 border-t border-ds-border py-ds-250 first:border-t-0 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-ds-400"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-ds-100 sm:flex-col sm:items-start sm:gap-ds-075">
            <code className={`${code} break-words font-medium text-ds-text`}>{prop.name}</code>
            {prop.required && <Badge>Required</Badge>}
          </div>
          <div className="flex min-w-0 flex-col gap-ds-100">
            <div className="flex flex-wrap items-baseline gap-x-ds-200 gap-y-ds-075">
              <code
                data-slot="prop-type"
                className={`${code} rounded-ds-small bg-ds-background-neutral px-ds-075 py-ds-025 break-words text-ds-text-subtle [box-decoration-break:clone]`}
              >
                {prop.type}
              </code>
              {prop.default !== undefined && (
                <span className="text-body-small text-ds-text-subtle">
                  Default <code className={`${code} text-ds-text`}>{prop.default}</code>
                </span>
              )}
            </div>
            {prop.description && (
              <div className="text-body text-ds-text-subtle [&_code]:break-words">
                <DocText text={prop.description} />
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * The component's own props first; React Aria's behavior props (onPress, isDisabled…) behind a disclosure; the plain
 * DOM and ARIA attributes only counted, since the platform documents them.
 */
export function PropsTable({ props }: { props: ManifestProp[] }) {
  const own = props.filter((prop) => prop.origin === "own");
  const aria = props.filter((prop) => prop.origin === "aria");
  const dom = props.filter((prop) => prop.origin === "dom");
  return (
    <div className="flex flex-col gap-ds-200">
      {own.length > 0 ? <Rows props={own} /> : <Text tone="subtle">No props of its own: it takes the behavior props below.</Text>}
      {aria.length > 0 && (
        <Disclosure title={`Behavior props from React Aria (${aria.length})`} headingLevel={4}>
          <Rows props={aria} />
        </Disclosure>
      )}
      {dom.length > 0 && (
        <Text size="body-small" tone="subtle">
          Also takes {dom.length} standard DOM and ARIA attributes (id, aria-label, event handlers…).
        </Text>
      )}
    </div>
  );
}
