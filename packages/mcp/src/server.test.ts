import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeAll, describe, expect, it } from "vitest";
import { createServer } from "./server.js";

// A helper, not inline `new URL(…, import.meta.url)`: Vite rewrites the inline form into an asset URL.
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Every component the library ships: the manifests index is the source of truth.
const COMPONENTS = (JSON.parse(readFileSync(here("../../react/manifests/index.json"), "utf8")) as unknown[]).length;

let client: Client;

beforeAll(async () => {
  // The bundled data is a build output: rebuild it from the current manifests, examples and docs.
  execFileSync(process.execPath, [here("../scripts/build-data.ts")], { stdio: "ignore" });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  client = new Client({ name: "test", version: "0" });
  await client.connect(clientSide);
});

async function call(name: string, args: Record<string, unknown> = {}) {
  const result = (await client.callTool({ name, arguments: args })) as { content: { type: string; text: string }[]; isError?: boolean };
  return { text: result.content.map((part) => part.text).join("\n"), isError: !!result.isError };
}

/** The most an answer should cost an agent's context, in characters (about 5k tokens). */
const BUDGET = 20_000;

describe("@senvenli/mcp", () => {
  it("lists its seven tools, each read-only and described", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(
      ["create_theme", "get_component", "get_component_manifest", "get_doc", "list_components", "search_components", "validate_theme"].sort(),
    );
    for (const tool of tools) {
      expect(tool.description!.length, tool.name).toBeGreaterThan(30);
      expect(tool.annotations?.readOnlyHint, tool.name).toBe(true);
    }
  });

  it("lists every component, and one family", async () => {
    expect((await call("list_components")).text.split("\n")).toHaveLength(COMPONENTS);
    const charts = (await call("list_components", { family: "charts" })).text.split("\n");
    expect(charts.every((line) => line.includes("(charts)"))).toBe(true);
    expect((await call("list_components", { family: "nope" })).isError).toBe(true);
  });

  // What an agent types, and the component that must come first (or, after a "|", within the top three).
  const golden: [string, string][] = [
    ["upload a file", "file-upload"],
    ["date range", "date-range-picker"],
    ["confirm a delete", "alert-dialog"],
    ["DatePicker", "date-picker"],
    ["date picker", "date-picker"],
    ["pick a color", "color-picker"],
    ["show a toast notification", "toast"],
    ["one time code", "otp-field"],
    ["sidebar navigation", "sidebar"],
    ["loading placeholder", "skeleton"],
    ["table with sorting", "table"],
    ["phone number", "input"],
    ["tooltip", "tooltip"],
    ["modal dialog", "dialog"],
    ["keyboard shortcut", "kbd"],
    ["button", "button"],
    ["I need a component that lets users choose several options from a long list", "|multi-select"],
  ];
  it.each(golden)("search: %s → %s", async (query, expected) => {
    const names = (await call("search_components", { query })).text
      .split("\n")
      .filter((line) => !line.startsWith(" "))
      .map((line) => line.split(" ")[0]);
    if (expected.startsWith("|")) expect(names.slice(0, 3)).toContain(expected.slice(1));
    else expect(names[0]).toBe(expected);
  });

  it("search says so when nothing matches", async () => {
    expect((await call("search_components", { query: "zzqx" })).text).toContain("No component matches");
  });

  it("get_component is the site's Markdown page, with the example code", async () => {
    const { text } = await call("get_component", { name: "Button" });
    expect(text).toMatch(/^# Button/);
    expect(text).toContain('import { Button } from "@senvenli/react/action";');
    expect(text).toContain("```tsx");
    expect(text).toContain("## API reference");
  });

  it("get_component reads only the sections asked for, always with the title and import", async () => {
    const { text } = await call("get_component", { name: "date-picker", sections: ["api"] });
    expect(text).toMatch(/^# Date picker/);
    expect(text).toContain("Import: `import { DatePicker }");
    expect(text).toContain("## API reference");
    expect(text).not.toContain("## Examples");
    expect(text).not.toContain("## Guidelines");
    const examples = (await call("get_component", { name: "date-picker", sections: ["example", "examples"] })).text;
    expect(examples).toContain("## Example:");
    expect(examples).toContain("## Examples");
    expect(examples).not.toContain("## API reference");
  });

  it("an unknown component names the closest ones", async () => {
    const result = await call("get_component", { name: "date" });
    expect(result.isError).toBe(true);
    expect(result.text).toContain("Did you mean");
  });

  it("returns a manifest: own and React Aria props by default, minified, the rest counted", async () => {
    const raw = (await call("get_component_manifest", { name: "button" })).text;
    expect(raw).not.toContain("\n");
    const manifest = JSON.parse(raw);
    expect(manifest.name).toBe("button");
    const props = Object.values(manifest.props).flat() as { origin: string; schema?: unknown }[];
    expect(props.every((prop) => prop.origin !== "dom" && prop.schema === undefined)).toBe(true);
    expect(props.some((prop) => prop.origin === "aria")).toBe(true);
    expect(manifest.propsLeftOut).toMatch(/props: "all"/);
    const all = JSON.parse((await call("get_component_manifest", { name: "button", props: "all", minified: false })).text);
    expect((Object.values(all.props).flat() as { origin: string }[]).some((prop) => prop.origin === "dom")).toBe(true);
  });

  it("a manifest over the budget by default gives the component's own props, and says how to ask for the rest", async () => {
    const manifest = JSON.parse((await call("get_component_manifest", { name: "input" })).text);
    const origins = new Set((Object.values(manifest.props).flat() as { origin: string }[]).map((prop) => prop.origin));
    expect([...origins]).toEqual(["own"]);
    expect(manifest.propsLeftOut).toMatch(/props: "all"/);
  });

  it("a page over the budget comes without its API reference, and says how to read it", async () => {
    const { text } = await call("get_component", { name: "input" });
    expect(text).not.toContain("## API reference");
    expect(text).toContain('sections: ["api"]');
    expect((await call("get_component", { name: "input", sections: ["api"] })).text).toContain("## API reference");
  });

  it(`keeps every component answer under ${BUDGET} characters`, async () => {
    const names = (await call("list_components")).text.split("\n").map((line) => line.split(" ")[0]!);
    for (const name of names) {
      expect((await call("get_component", { name })).text.length, `get_component ${name}`).toBeLessThan(BUDGET);
      expect((await call("get_component_manifest", { name })).text.length, `get_component_manifest ${name}`).toBeLessThan(BUDGET);
    }
  });

  it("serves the docs, named by an enum", async () => {
    const { tools } = await client.listTools();
    const schema = tools.find((tool) => tool.name === "get_doc")!.inputSchema as { properties: { name: { enum: string[] } } };
    expect(schema.properties.name.enum).toContain("getting-started");
    expect((await call("get_doc", { name: "getting-started" })).text).toContain("npm i @senvenli/react");
    expect((await call("get_doc", { name: "nope" })).isError).toBe(true);
  });

  it("creates a theme: by default the AA report, the preset code and the command to write it", async () => {
    const { text } = await call("create_theme", { primary: "#1268ae" });
    expect(text).toMatch(/Contrast: (\d+) of \1 pairs pass/);
    const code = text.match(/Preset code: (\S+)/)![1]!;
    expect(text).toContain(`npx @senvenli/cli theme ${code} --tailwind`);
    expect(text).not.toContain("--ds-background-brand-bold");
    expect(text.length).toBeLessThan(1_000);
  });

  it("creates the theme's CSS or native JSON when asked", async () => {
    const css = (await call("create_theme", { primary: "#1268ae", format: "tailwind" })).text;
    expect(css).toContain("--ds-background-brand-bold");
    expect(css).toContain("@theme inline");
    expect((await call("create_theme", { primary: "#1268ae", format: "css" })).text).not.toContain("@theme inline");
    const native = (await call("create_theme", { primary: "#1268ae", format: "native" })).text;
    expect(native).toContain('"ds-background-brand-bold": "#1268ae"');
  });

  it("refuses a color it cannot read, and a bad preset, instead of ignoring them", async () => {
    for (const primary of ["red", "rgb(255, 0, 0)", "hsl(0 100% 50%)", "#12345"]) {
      const result = await call("create_theme", { primary });
      expect(result.isError, primary).toBe(true);
      expect(result.text).toContain("not a color the engine reads");
    }
    expect((await call("create_theme", { preset: "not-a-code" })).isError).toBe(true);
  });

  it("validates a theme.css: all pass as written, a hand edit that breaks contrast is named", async () => {
    const css = (await call("create_theme", { primary: "#1268ae", format: "tailwind" })).text.split("\n\n").slice(3).join("\n\n");
    expect((await call("validate_theme", { css })).text).toMatch(/^Contrast: (\d+) of \1 checked pairs pass/);
    const edited = css.replace(/(:root[^{]*\{[^}]*--ds-text-subtle:\s*)[^;]+;/, "$1#d0d0d0;");
    const { text } = await call("validate_theme", { css: edited });
    expect(text).toMatch(/- FAIL light: ds-text-subtle on /);
    expect((await call("validate_theme", { css: "body { color: red; }" })).isError).toBe(true);
  });

  it("offers prompts for building a form and theming an app", async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts.map((prompt) => prompt.name).sort()).toEqual(["build_form", "theme_app"]);
    const form = await client.getPrompt({ name: "build_form", arguments: { form: "sign up" } });
    expect((form.messages[0]!.content as { text: string }).text).toContain("sign up");
  });

  it("offers components and docs as resources", async () => {
    const { resources } = await client.listResources();
    expect(resources.filter((item) => item.uri.startsWith("senvenli://components/"))).toHaveLength(COMPONENTS);
    const read = await client.readResource({ uri: "senvenli://docs/theming" });
    expect((read.contents[0] as { text: string }).text).toContain("title: Theming");
  });

  it("bundles the same Markdown the site serves for a component", async () => {
    const registry = JSON.parse(readFileSync(here("../data/registry.json"), "utf8"));
    expect(registry.components).toHaveLength(COMPONENTS);
    expect(registry.docs.length).toBeGreaterThanOrEqual(8);
  });
});
