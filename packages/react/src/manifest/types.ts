/** Types for the component manifest. The JSON Schema is manifest/component.schema.json. */

export type ManifestStatus = "alpha" | "beta" | "stable" | "deprecated";

export type JsonSchema = {
  type?: "string" | "number" | "boolean" | "object" | "array";
  items?: JsonSchema;
  enum?: Array<string | number | boolean>;
  pattern?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
};

export interface HandManifest {
  $schema: string;
  kind: "component" | "pattern";
  name: string;
  title: string;
  family: string;
  description: string;
  keywords: string[];
  status: ManifestStatus;
  replacedBy?: string | null;
  /** Components documented on this page; the first is the main one. */
  exports: string[];
  import: string;
  usage: { when: string[]; instead?: Array<{ use: string; when: string }> };
  guidance?: Array<{ rule: string; do?: string; avoid?: string }>;
  a11y: { keyboard?: Array<{ keys: string; does: string }>; builtIn: string[]; youProvide: string[] };
  related?: string[];
  genui?: {
    expose: boolean;
    description?: string;
    props?: string[];
    children?: "none" | "text" | string[];
    events?: Array<"press" | "change" | "submit">;
    examples?: object[];
  };
}

export type PropOrigin = "own" | "aria" | "dom";

export interface PropDoc {
  name: string;
  type: string;
  required: boolean;
  /**
   * Where the prop is declared: `own` in this library's source, `aria` in React Aria (behavior such as
   * `onPress`, `isDisabled`), `dom` in React's DOM and ARIA attribute types.
   */
  origin: PropOrigin;
  default?: string;
  description?: string;
  /** Present when the type is plain data a model can write. */
  schema?: JsonSchema;
}

export interface Quality {
  tests: boolean;
  a11y: boolean;
  docs: boolean;
  visual: boolean;
  dark: boolean;
  rtl: boolean;
  mcp: boolean;
  generic: boolean;
}

export interface ComponentManifest extends Omit<HandManifest, "genui"> {
  /** Generated: files that declare the exports, relative to the package. */
  source: string[];
  /** Generated: props per export, from the TypeScript source. */
  props: Record<string, PropDoc[]>;
  /** Generated: theme tokens the source uses. */
  tokens: string[];
  /** Generated: component string keys (registerDsStrings keys) the source uses. */
  strings: string[];
  /** Generated: only what is checked today; nothing is set by hand. */
  quality: Quality;
  genui?: HandManifest["genui"] & { schema?: JsonSchema };
}

export interface ManifestIndexEntry {
  name: string;
  title: string;
  family: string;
  status: ManifestStatus;
  description: string;
  keywords: string[];
  import: string;
  exports: string[];
  genui: boolean;
}
