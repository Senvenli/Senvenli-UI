/** The parts of a generated manifest (packages/react/manifests/<slug>.json) the site reads. */
export type PropOrigin = "own" | "aria" | "dom";

export type ManifestProp = {
  name: string;
  type: string;
  required: boolean;
  /** `own` in the library, `aria` React Aria behavior, `dom` plain DOM and ARIA attributes. */
  origin: PropOrigin;
  default?: string;
  description?: string;
};

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
  /** A rule, optionally with what to do and what to avoid. */
  guidance?: { rule: string; do?: string; avoid?: string }[];
  a11y: { keyboard?: { keys: string; does: string }[]; builtIn?: string[]; youProvide?: string[] };
  related?: string[];
  source: string[];
  props: Record<string, ManifestProp[]>;
  tokens: string[];
  strings: string[];
};

export type ManifestIndexEntry = Pick<Manifest, "name" | "title" | "family" | "status" | "description">;

/** The order families appear in: from the smallest pieces to the composed ones. */
export const FAMILY_ORDER = ["display", "action", "layout", "feedback", "form", "selection", "overlay", "navigation", "date", "color", "collection", "charts"];

const FAMILY_TITLES: Record<string, string> = { charts: "Charts" };
export const familyTitle = (family: string) => FAMILY_TITLES[family] ?? family.charAt(0).toUpperCase() + family.slice(1);

/** Every component in reading order: families in FAMILY_ORDER, then by title within each. */
export function orderComponents<T extends Pick<ManifestIndexEntry, "family" | "title">>(items: readonly T[]): T[] {
  const rank = (family: string) => {
    const at = FAMILY_ORDER.indexOf(family);
    return at < 0 ? FAMILY_ORDER.length : at;
  };
  return [...items].sort((a, b) => rank(a.family) - rank(b.family) || a.family.localeCompare(b.family) || a.title.localeCompare(b.title, "en"));
}

/**
 * A component's import statement, laid out as Prettier would at 80 columns: one line when it fits, else one name
 * per line. The docs code block then shows the whole statement without a sideways scrollbar.
 */
export function importStatement(names: readonly string[], from: string): string {
  const line = `import { ${names.join(", ")} } from "${from}";`;
  return line.length <= 80 ? line : `import {\n${names.map((name) => `  ${name},`).join("\n")}\n} from "${from}";`;
}
