import schema from "../../../packages/react/manifest/component.full.schema.json";

/** Generated manifests point their `$schema` here (https://design.senvenli.com/schema/component.full.json). */
export function loader() {
  return new Response(`${JSON.stringify(schema, null, 2)}\n`, { headers: { "Content-Type": "application/schema+json" } });
}
