import { Badge, Text } from "@senvenli/react/display";
import { Disclosure } from "@senvenli/react/navigation";
import type { ManifestProp } from "../lib/manifest";
import { DocText } from "./DocText";

const code = "font-ds-mono text-code";

/**
 * Props as a table from 640px (Prop, Type, Default, Description at 14px), and as one stacked block per prop below it,
 * so a phone never scrolls sideways through a type. Code in the type and description cells may break anywhere, and a
 * prop name longer than its column scrolls inside the table, never the page.
 */
function Rows({ props }: { props: ManifestProp[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
      <table className="w-full border-collapse text-start text-body">
        <thead>
          <tr className="text-ds-text-subtle">
            <th scope="col" className="py-ds-100 pe-ds-300 text-start font-medium">Prop</th>
            <th scope="col" className="py-ds-100 pe-ds-300 text-start font-medium">Type</th>
            <th scope="col" className="py-ds-100 pe-ds-300 text-start font-medium">Default</th>
            <th scope="col" className="py-ds-100 text-start font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((prop) => (
            <tr key={prop.name} className="border-t border-ds-border align-top">
              <th scope="row" className="py-ds-150 pe-ds-300 text-start font-normal">
                <span className="flex flex-col items-start gap-ds-050">
                  <code className={`${code} text-ds-text`}>{prop.name}</code>
                  {prop.required && <Badge>Required</Badge>}
                </span>
              </th>
              <td className="max-w-60 py-ds-150 pe-ds-300">
                <code className={`${code} [overflow-wrap:anywhere] text-ds-text-subtle`}>{prop.type}</code>
              </td>
              <td className="py-ds-150 pe-ds-300">
                {prop.default !== undefined ? <code className={`${code} text-ds-text-subtle`}>{prop.default}</code> : <span className="text-ds-text-subtlest">–</span>}
              </td>
              <td className="py-ds-150 text-ds-text [&_code]:[overflow-wrap:anywhere]">{prop.description && <DocText text={prop.description} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <dl className="m-0 flex flex-col sm:hidden">
        {props.map((prop) => (
          <div key={prop.name} className="flex flex-col gap-ds-075 border-t border-ds-border py-ds-200">
            <dt className="flex items-center gap-ds-100">
              <code className={`${code} text-ds-text`}>{prop.name}</code>
              {prop.required && <Badge>Required</Badge>}
            </dt>
            <dd className="m-0 flex flex-col gap-ds-075 text-body">
              <code className={`${code} [overflow-wrap:anywhere] text-ds-text-subtle`}>{prop.type}</code>
              {prop.default !== undefined && (
                <span className="text-ds-text-subtle">
                  Default <code className={code}>{prop.default}</code>
                </span>
              )}
              {prop.description && (
                <span className="text-ds-text">
                  <DocText text={prop.description} />
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </>
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
