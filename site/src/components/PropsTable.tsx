import { Text } from "@senvenli/react/display";
import { Disclosure } from "@senvenli/react/navigation";
import type { ManifestProp } from "../lib/manifest";
import { DocText } from "./DocText";

function Rows({ props }: { props: ManifestProp[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-start text-body-small">
        <thead>
          <tr className="border-b border-ds-border text-ds-text-subtle">
            <th scope="col" className="py-ds-100 pe-ds-200 text-start font-medium">Prop</th>
            <th scope="col" className="py-ds-100 pe-ds-200 text-start font-medium">Type</th>
            <th scope="col" className="py-ds-100 text-start font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((prop) => (
            <tr key={prop.name} className="border-b border-ds-border align-top">
              <th scope="row" className="py-ds-100 pe-ds-200 text-start font-normal">
                <code className="font-ds-mono text-code text-ds-text">{prop.name}</code>
                {prop.required && <span className="ms-ds-050 text-ds-text-subtle">required</span>}
              </th>
              <td className="max-w-64 py-ds-100 pe-ds-200">
                <code className="font-ds-mono text-code break-words text-ds-text-subtle">{prop.type}</code>
                {prop.default !== undefined && (
                  <div className="mt-ds-050 text-ds-text-subtlest">
                    Default <code className="font-ds-mono text-code">{prop.default}</code>
                  </div>
                )}
              </td>
              <td className="py-ds-100 text-ds-text">{prop.description && <DocText text={prop.description} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The component's own props first; React Aria's behavior props (onPress, isDisabled…) behind a disclosure; the
 * plain DOM and ARIA attributes only counted, since the platform documents them.
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
