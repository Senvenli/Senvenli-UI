import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { checkThemeCss, createTheme, decodePreset, encodePreset, formatHex, parseColor, toCSS, toNative, type ContrastCheck, type Theme, type ThemeInput } from "@senvenli/tokens";
import { z } from "zod";
import { findComponent, findDoc, registry, type Component } from "./registry.js";
import { searchComponents } from "./search.js";

const SITE = "https://design.senvenli.com";

const text = (value: string) => ({ content: [{ type: "text" as const, text: value }] });
const fail = (value: string) => ({ content: [{ type: "text" as const, text: value }], isError: true });

/** A component that does not exist: say so, and name the closest ones so the agent can retry. */
function unknownComponent(name: string) {
  const near = searchComponents(registry().components, name, 5).map((hit) => hit.component.name);
  return fail(`No component named "${name}".${near.length ? ` Did you mean: ${near.join(", ")}?` : " Use search_components or list_components."}`);
}

const COLOR_FORMATS = 'a hex "#rrggbb" (or "#rgb") or "oklch(L C H)", like "oklch(0.55 0.15 250)"';

const themeInputShape = {
  preset: z.string().optional().describe("A preset code from the theme builder (the ?p= value). The other fields override it."),
  primary: z.string().optional().describe(`The brand color: ${COLOR_FORMATS}. Leave out for the neutral default.`),
  secondary: z.string().optional().describe("A second brand color, same formats."),
  tertiary: z.string().optional().describe("A third brand color, same formats."),
  primaryDark: z.string().optional().describe(`A hand-picked brand color for dark mode, same formats. Leave out to derive it from primary.`),
  radius: z.number().min(0).max(2).optional().describe("Base corner radius in rem (default 0.375)."),
  controlShape: z.enum(["rounded", "pill"]).optional().describe('Single-line controls (buttons, fields, badges, segmented controls) follow the radius ("rounded", default) or are fully round ("pill"); cards keep the radius.'),
  density: z.enum(["compact", "default", "comfortable"]).optional(),
  borderWidth: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
};
type ThemeArgs = { preset?: string; primary?: string; secondary?: string; tertiary?: string; primaryDark?: string; radius?: number; controlShape?: ThemeInput["controlShape"]; density?: ThemeInput["density"]; borderWidth?: ThemeInput["borderWidth"] };

/** The engine's input from the tool's arguments, or why it cannot be made (a bad preset code, a color it cannot read). */
function themeInput(args: ThemeArgs): ThemeInput | string {
  let input: ThemeInput = {};
  if (args.preset) {
    const decoded = decodePreset(args.preset);
    if (!decoded) return `Invalid preset code "${args.preset}". Copy it from the builder's address (?p=…), or pass the colors instead.`;
    input = decoded;
  }
  for (const key of ["primary", "secondary", "tertiary"] as const) {
    const value = args[key];
    if (value === undefined) continue;
    if (!parseColor(value)) return `${key} "${value}" is not a color the engine reads. Use ${COLOR_FORMATS}; names, rgb() and hsl() are not read.`;
    input[key] = value;
  }
  if (args.primaryDark !== undefined) {
    if (!parseColor(args.primaryDark)) return `primaryDark "${args.primaryDark}" is not a color the engine reads. Use ${COLOR_FORMATS}.`;
    input.darkColors = { ...input.darkColors, primary: args.primaryDark };
  }
  for (const key of ["radius", "controlShape", "density", "borderWidth"] as const) {
    if (args[key] !== undefined) (input as Record<string, unknown>)[key] = args[key];
  }
  return input;
}

const failLine = (check: ContrastCheck) => `- FAIL ${check.mode}: ${check.foreground} on ${check.background} = ${check.ratio.toFixed(2)} (needs ${check.required})`;

/** The contrast summary: the count, the failing pairs, and the colors the engine moved. */
function report(theme: Theme): string {
  const failing = theme.checks.filter((check) => !check.pass);
  const lines = [`Contrast: ${theme.checks.length - failing.length} of ${theme.checks.length} pairs pass WCAG AA (light and dark).`, ...failing.map(failLine)];
  for (const role of theme.adjusted) {
    lines.push(`- ${role} was moved to ${formatHex(theme.light[role === "primary" ? "ds-background-brand-bold" : `ds-background-${role === "info" ? "information" : role}-bold`]!)} so text on it passes AA.`);
  }
  return lines.join("\n");
}

/** The most one component answer should cost an agent's context, in characters (about 5k tokens). */
const PAGE_BUDGET = 20_000;

/** The sections of a component page, by the `## ` heading that opens each. The title and intro always come first. */
const SECTIONS = {
  example: /^## Example:/,
  examples: /^## Examples(\n|$)/,
  guidelines: /^## Guidelines(\n|$)/,
  accessibility: /^## Accessibility(\n|$)/,
  api: /^## API reference(\n|$)/,
  related: /^## Related(\n|$)/,
} as const;
type Section = keyof typeof SECTIONS;

function pageSections(markdown: string, wanted: Section[]): string {
  const parts = markdown.split(/\n(?=## )/);
  const keep = parts.filter((part, index) => index === 0 || wanted.some((section) => SECTIONS[section].test(part)));
  return keep.join("\n");
}

/** A manifest's props by export, with the React Aria behavior props or the DOM attributes left out, as asked. */
function manifestFor(manifest: Component["manifest"], props: "own" | "own+aria" | "all", minified: boolean) {
  const origins = props === "own" ? ["own"] : props === "own+aria" ? ["own", "aria"] : ["own", "aria", "dom"];
  const byExport = (manifest.props ?? {}) as Record<string, (Record<string, unknown> & { origin?: string })[]>;
  const kept: Record<string, unknown[]> = {};
  let dropped = 0;
  for (const [name, list] of Object.entries(byExport)) {
    const shown = list.filter((prop) => origins.includes(prop.origin ?? "own"));
    dropped += list.length - shown.length;
    kept[name] = minified ? shown.map(({ schema: _schema, ...rest }) => rest) : shown;
  }
  const { quality: _quality, source: _source, ...rest } = manifest as Record<string, unknown>;
  const out = { ...(minified ? rest : manifest), props: kept, ...(dropped ? { propsLeftOut: `${dropped} ${props === "own" ? "React Aria and DOM" : "DOM and ARIA attribute"} props; pass props: "all" for them.` } : {}) };
  return minified ? JSON.stringify(out) : JSON.stringify(out, null, 2);
}

/**
 * The Senvenli UI MCP server: components (search, pages, manifests, examples), docs and themes, from data bundled at
 * build time. Read-only: it never touches files or the network. One definition serves stdio and Streamable HTTP.
 */
export function createServer(): McpServer {
  const data = registry();
  const docSlugs = data.docs.map((doc) => doc.slug) as [string, ...string[]];
  const server = new McpServer(
    { name: "senvenli-ui", version: data.reactVersion },
    {
      instructions:
        "Senvenli UI is a React design system on React Aria (`npm i @senvenli/react`). Find components with search_components, " +
        "then read one with get_component before writing code: it has the import, example code, guidelines, accessibility and props. " +
        "Use only the props it lists. Setup is get_doc('getting-started'). Themes: create_theme from up to three colors, " +
        "validate_theme to check a theme.css for WCAG AA contrast.",
    },
  );

  server.registerTool(
    "list_components",
    {
      title: "List components",
      description: "List every Senvenli UI component (name, family, one-line description), or one family's. To browse; search_components finds one by purpose.",
      inputSchema: { family: z.string().optional().describe(`A family: ${[...new Set(data.components.map((item) => item.family))].join(", ")}.`) },
      annotations: { readOnlyHint: true },
    },
    async ({ family }) => {
      const items = data.components.filter((item) => !family || item.family === family.trim().toLowerCase());
      if (!items.length) return fail(`No family "${family}". Families: ${[...new Set(data.components.map((item) => item.family))].join(", ")}.`);
      return text(items.map((item) => `${item.name} (${item.family}): ${item.description}`).join("\n"));
    },
  );

  server.registerTool(
    "search_components",
    {
      title: "Search components",
      description: 'Find components by what they are for ("date range", "upload a file", "confirm a delete") or by export name ("DatePicker"). Returns names for get_component, with the import.',
      inputSchema: { query: z.string().min(1), limit: z.number().int().min(1).max(20).optional().describe("Default 8.") },
      annotations: { readOnlyHint: true },
    },
    async ({ query, limit }) => {
      const hits = searchComponents(data.components, query, limit ?? 8);
      if (!hits.length) return text(`No component matches "${query}". Try a shorter phrase of what it is for, or list_components.`);
      return text(hits.map(({ component }) => `${component.name} (${component.family}): ${component.description}\n  import { ${component.exports.join(", ")} } from "${component.import}";`).join("\n"));
    },
  );

  server.registerTool(
    "get_component",
    {
      title: "Get a component",
      description:
        "Read one component's page as Markdown: import, example code, when to use it (and what instead), do and avoid, accessibility, and props. " +
        "Read it before using a component. Pass sections to read less of a long page.",
      inputSchema: {
        name: z.string().describe('The component name, as search_components gives it: "date-picker".'),
        sections: z
          .array(z.enum(Object.keys(SECTIONS) as [Section, ...Section[]]))
          .optional()
          .describe("Only these parts (the title, import and intro always come): example (the main one), examples, guidelines, accessibility, api, related. Default: all."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ name, sections }) => {
      const component = findComponent(name);
      if (!component) return unknownComponent(name);
      if (sections?.length) return text(pageSections(component.markdown, sections));
      // A page too long for one answer (a component with several shapes, such as Input) comes without its API
      // reference, and says how to read it; nothing is cut silently.
      if (component.markdown.length <= PAGE_BUDGET) return text(component.markdown);
      const rest = (Object.keys(SECTIONS) as Section[]).filter((section) => section !== "api");
      return text(
        `${pageSections(component.markdown, rest)}\n\n> The API reference is long: read it with get_component({ name: "${component.name}", sections: ["api"] }) or get_component_manifest.`,
      );
    },
  );

  server.registerTool(
    "get_component_manifest",
    {
      title: "Get a component's manifest",
      description:
        "The component's manifest as JSON: exports, usage, a11y, every prop with type, default and origin, tokens and strings. For tools that need structured data; to read, prefer get_component.",
      inputSchema: {
        name: z.string(),
        props: z.enum(["own", "own+aria", "all"]).optional().describe('Which props: own; own+aria (default: also React Aria behavior props like onPress); all (also DOM and ARIA attributes).'),
        minified: z.boolean().optional().describe("Default true: one line, without the JSON Schema of each prop or the build fields."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ name, props, minified }) => {
      const component = findComponent(name);
      if (!component) return unknownComponent(name);
      const answer = manifestFor(component.manifest, props ?? "own+aria", minified ?? true);
      // Over the budget by default (a component with several shapes): its own props only, and the note in the JSON
      // (propsLeftOut) says how to ask for the rest.
      if (props === undefined && answer.length > PAGE_BUDGET) return text(manifestFor(component.manifest, "own", minified ?? true));
      return text(answer);
    },
  );

  server.registerTool(
    "get_doc",
    {
      title: "Get a doc",
      description: `Read a doc as Markdown. ${data.docs.map((doc) => `${doc.slug}: ${doc.description}`).join(" ")}`,
      inputSchema: { name: z.enum(docSlugs) },
      annotations: { readOnlyHint: true },
    },
    async ({ name }) => {
      const doc = findDoc(name);
      return doc ? text(doc.markdown) : fail(`No doc "${name}". Docs: ${docSlugs.join(", ")}.`);
    },
  );

  server.registerTool(
    "create_theme",
    {
      title: "Create a theme",
      description:
        "Make a theme from up to three colors (all optional) and layout settings. Every text pair is checked against WCAG AA in light and dark, " +
        "and the engine moves a color that would fail. The default answer is the contrast report and the CLI command that writes theme.css; " +
        "ask for format tailwind, css or native to get the file's contents instead.",
      inputSchema: {
        ...themeInputShape,
        format: z
          .enum(["command", "tailwind", "css", "native"])
          .optional()
          .describe("command (default): the report and a command to run; tailwind: the CSS with a Tailwind v4 @theme block; css: the variables only; native: hex JSON for React Native."),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const input = themeInput(args);
      if (typeof input === "string") return fail(input);
      const theme = createTheme(input);
      const code = encodePreset(input);
      const format = args.format ?? "command";
      const head = [report(theme), `Preset code: ${code}\nBuilder: ${SITE}/create?p=${code}`];
      if (format === "command") {
        return text(
          [...head, `Write theme.css (with the Tailwind block) in the app:\n\nnpx @senvenli/cli theme ${code} --tailwind`, "Then import it after Tailwind: get_doc('getting-started')."].join("\n\n"),
        );
      }
      const output = format === "native" ? JSON.stringify(toNative(theme), null, 2) : toCSS(theme, { tailwind: format === "tailwind" });
      return text([...head, format === "native" ? "Save as theme.json:" : "Save as theme.css and import it after Tailwind (get_doc('getting-started')):", output].join("\n\n"));
    },
  );

  server.registerTool(
    "validate_theme",
    {
      title: "Validate a theme",
      description:
        "Check a theme.css (as create_theme or the CLI wrote it, edited or not) against WCAG AA: every text, icon and border pair, light and dark. " +
        "Lists the failing pairs and any token the CSS lacks.",
      inputSchema: { css: z.string().min(1).describe("The theme's CSS: the :root block and the [data-theme=\"dark\"] block.") },
      annotations: { readOnlyHint: true },
    },
    async ({ css }) => {
      const { checks, missing } = checkThemeCss(css);
      if (!checks.length && missing.length) return fail("No Senvenli UI tokens (--ds-…) found in this CSS. Pass the theme.css that create_theme or the CLI wrote.");
      const failing = checks.filter((check) => !check.pass);
      const lines = [`Contrast: ${checks.length - failing.length} of ${checks.length} checked pairs pass WCAG AA.`, ...failing.map(failLine)];
      if (missing.length) lines.push(`Missing or not a color (${missing.length}), so their pairs were not checked: ${missing.map((item) => `${item.token} (${item.mode})`).join(", ")}.`);
      if (failing.length) lines.push("Fix: regenerate with create_theme from the brand colors, or darken (light) / lighten (dark) the failing foreground.");
      return text(lines.join("\n"));
    },
  );

  server.registerPrompt(
    "build_form",
    {
      title: "Build a form",
      description: "Build a form with Senvenli UI components, the way the system wants it: labels, validation, errors and the submit flow.",
      argsSchema: { form: z.string().describe('What the form is for: "sign up with email and password", "shipping address".') },
    },
    ({ form }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Build this form with Senvenli UI (@senvenli/react): ${form}\n\n` +
              "1. get_component('form') and get_component('field'), then search_components for each input it needs (dates, phone, password, choices).\n" +
              "2. Read every component you use with get_component before writing it; use only the props it lists.\n" +
              "3. Every field has a visible label; required fields say so; errors are shown on the field and announced, not only in color.\n" +
              "4. One primary submit button; it shows pending state while submitting.\n" +
              "5. Use the design tokens (ds- classes), never raw colors or pixel sizes.",
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "theme_app",
    {
      title: "Theme an app",
      description: "Set up Senvenli UI's theme in an app from its brand colors, checked against WCAG AA.",
      argsSchema: { colors: z.string().optional().describe('The brand colors, "#1268ae" or "oklch(…)", up to three. Leave out for the neutral default.') },
    },
    ({ colors }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Theme this app with Senvenli UI${colors ? ` from these brand colors: ${colors}` : ""}.\n\n` +
              "1. get_doc('getting-started') for install and where the theme CSS goes; get_doc('theming') for what the colors drive.\n" +
              "2. create_theme with the colors (primary first); run the command it gives, or save its CSS.\n" +
              "3. If a color was moved for contrast, say which and why.\n" +
              "4. If the app's theme.css is edited by hand later, check it with validate_theme.",
          },
        },
      ],
    }),
  );

  server.registerResource(
    "component",
    new ResourceTemplate("senvenli://components/{name}", {
      list: async () => ({ resources: data.components.map((item) => ({ uri: `senvenli://components/${item.name}`, name: item.title, description: item.description, mimeType: "text/markdown" })) }),
    }),
    { title: "Component page", description: "A component's page as Markdown.", mimeType: "text/markdown" },
    async (uri, { name }) => {
      const component = findComponent(String(name));
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: component?.markdown ?? `No component named "${name}".` }] };
    },
  );

  server.registerResource(
    "doc",
    new ResourceTemplate("senvenli://docs/{name}", {
      list: async () => ({ resources: data.docs.map((doc) => ({ uri: `senvenli://docs/${doc.slug}`, name: doc.title, description: doc.description, mimeType: "text/markdown" })) }),
    }),
    { title: "Doc", description: "A doc as Markdown.", mimeType: "text/markdown" },
    async (uri, { name }) => {
      const doc = findDoc(String(name));
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: doc?.markdown ?? `No doc named "${name}".` }] };
    },
  );

  return server;
}
