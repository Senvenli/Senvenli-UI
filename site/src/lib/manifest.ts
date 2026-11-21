/** The parts of a generated manifest (packages/react/manifests/<slug>.json) the site reads. */
export type ManifestProp = { name: string; type: string; required: boolean; description?: string };

export type Manifest = {
  $schema: string;
  name: string;
  title: string;
  family: string;
  status: string;
  description: string;
  import: string;
  exports: string[];
  keywords: string[];
  usage: { when: string[]; instead?: { use: string; when: string }[] };
  a11y: { keyboard?: { keys: string; does: string }[]; builtIn?: string[]; youProvide?: string[] };
  related?: string[];
  props: Record<string, ManifestProp[]>;
  tokens: string[];
};

export type ManifestIndexEntry = Pick<Manifest, "name" | "title" | "family" | "status" | "description">;

export const familyTitle = (family: string) => family.charAt(0).toUpperCase() + family.slice(1);
