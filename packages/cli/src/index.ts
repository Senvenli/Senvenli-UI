#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { createTheme, decodePreset, toCSS, toNative, type ThemeInput } from "@senvenli/tokens";

const USAGE = `Usage: npx @senvenli/cli theme [preset-code] [options]

Options:
  --primary, --secondary, --tertiary <color>   Brand colors (#hex or oklch()); all optional
  --radius <rem>                               Base radius, e.g. 0.5
  --control-shape <rounded|pill>               Single-line controls follow the radius, or are fully round
  --density <compact|default|comfortable>
  --border-width <0|1|2>
  --out <file>                                 Default: theme.css (or theme.ts with --native)
  --native                                     Write theme.json (hex colors) for native apps instead of CSS
  --tailwind                                   Add a Tailwind v4 @theme inline block`;

function main(argv: string[]): number {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      primary: { type: "string" },
      secondary: { type: "string" },
      tertiary: { type: "string" },
      radius: { type: "string" },
      "control-shape": { type: "string" },
      density: { type: "string" },
      "border-width": { type: "string" },
      out: { type: "string" },
      native: { type: "boolean" },
      tailwind: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [command, code] = positionals;
  if (values.help || command !== "theme") {
    console.log(USAGE);
    return values.help ? 0 : 1;
  }
  let input: ThemeInput = {};
  if (code) {
    const decoded = decodePreset(code);
    if (!decoded) {
      console.error(`Invalid preset code: ${code}`);
      return 1;
    }
    input = decoded;
  }
  for (const role of ["primary", "secondary", "tertiary"] as const) {
    if (values[role]) input[role] = values[role];
  }
  if (values.radius) input.radius = Number(values.radius);
  if (values["control-shape"]) input.controlShape = values["control-shape"] as ThemeInput["controlShape"];
  if (values.density) input.density = values.density as ThemeInput["density"];
  if (values["border-width"]) input.borderWidth = Number(values["border-width"]) as ThemeInput["borderWidth"];

  const theme = createTheme(input);
  const out = values.out ?? (values.native ? "theme.json" : "theme.css");
  const body = values.native
    ? `${JSON.stringify(toNative(theme), null, 2)}\n`
    : toCSS(theme, { tailwind: values.tailwind });
  writeFileSync(out, body);
  const failing = theme.checks.filter((c) => !c.pass).length;
  console.log(`Wrote ${out}. ${failing ? `${failing} pairs below AA.` : "All pairs meet WCAG AA."}`);
  if (theme.adjusted.length) console.log(`Adjusted for contrast: ${theme.adjusted.join(", ")}`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
