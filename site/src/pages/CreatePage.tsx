import { Button, useThemePreference } from "@senvenli/react/action";
import { ColorField, ColorSwatch, ColorSwatchPicker } from "@senvenli/react/color";
import { Heading, Text } from "@senvenli/react/display";
import { Banner } from "@senvenli/react/feedback";
import { Accordion, Disclosure, SegmentedControl, Tabs } from "@senvenli/react/navigation";
import { Dialog, DialogTrigger, Drawer } from "@senvenli/react/overlay";
import { Slider } from "@senvenli/react/selection";
import {
  BRAND_ROLES,
  createTheme,
  decodePreset,
  encodePreset,
  formatHex,
  toCSS,
  toNative,
  type BorderWidth,
  type BrandRole,
  type ControlShape,
  type Density,
  type Theme,
  type ThemeInput,
} from "@senvenli/tokens";
import { useLayoutEffect, useMemo, useState } from "react";
import { AuthPreview } from "../components/create/AuthBoard";
import { ChartsPreview } from "../components/create/ChartsBoard";
import { CollectionPreview } from "../components/create/DataBoard";
import { CodeBlock } from "../components/CodeBlock";
import { CopyButton } from "../components/CopyButton";
import { FormsBoard } from "../components/create/FormsBoard";
import { Bento } from "../components/home/Bento";
import { applyTheme, PRESETS, readStoredPreset } from "../lib/preset";
import { SITE_CONTAINER } from "../lib/layout";

const ROLE_LABEL: Record<BrandRole, string> = { primary: "Primary", secondary: "Secondary", tertiary: "Tertiary" };

/** The bold fill token each brand role drives. */
const ROLE_TOKEN: Record<BrandRole, string> = {
  primary: "ds-background-brand-bold",
  secondary: "ds-background-secondary-bold",
  tertiary: "ds-background-tertiary-bold",
};

const SWATCHES = [
  "ds-surface",
  "ds-surface-raised",
  "ds-surface-sunken",
  "ds-background-neutral",
  "ds-text",
  "ds-text-subtle",
  "ds-border-focused",
  "ds-background-brand-bold",
  "ds-background-selected",
  "ds-text-brand",
  "ds-background-secondary-bold",
  "ds-background-tertiary-bold",
  "ds-background-success-bold",
  "ds-background-warning-bold",
  "ds-background-danger-bold",
  "ds-background-information-bold",
];

const DENSITIES: Density[] = ["compact", "default", "comfortable"];
const BORDERS: BorderWidth[] = [0, 1, 2];

/** The origin in the prerendered HTML; the browser's own replaces it after mount (localhost, a preview host). */
const SITE_ORIGIN = "https://design.senvenli.com";

const presetSwatch = (input: ThemeInput) => formatHex(createTheme(input).light[ROLE_TOKEN.primary]!).toUpperCase();

/** The builder's controls: presets, colors, shape and the contrast proof. Shown beside the preview, or in a drawer on phones. */
function Controls({ input, theme, setInput }: { input: ThemeInput; theme: Theme; setInput: (next: ThemeInput | ((prev: ThemeInput) => ThemeInput)) => void }) {
  const set = (patch: Partial<ThemeInput>) => setInput((prev) => ({ ...prev, ...patch }));
  const clearRole = (role: BrandRole) =>
    setInput((prev) => {
      const next = { ...prev };
      delete next[role];
      return next;
    });
  const code = encodePreset(input);
  const preset = PRESETS.find((item) => encodePreset(item.input) === code);
  const failing = theme.checks.filter((check) => !check.pass);

  return (
    <div className="flex flex-col gap-ds-500">
      <ColorSwatchPicker
        label="Start from"
        items={PRESETS.map((item) => ({ value: presetSwatch(item.input), name: item.name }))}
        value={preset ? presetSwatch(preset.input) : ""}
        onChange={(hex) => {
          const match = PRESETS.find((item) => presetSwatch(item.input) === hex.toUpperCase());
          if (match) setInput(match.input);
        }}
      />

      {/* Sections open and close, so the panel stays short and the preview beside it stays in view. */}
      <Accordion allowsMultipleExpanded defaultExpandedKeys={["colors", "shape"]} headingLevel={2}>
      <Disclosure id="colors" title="Colors">
      <div className="flex flex-col gap-ds-200 pb-ds-200">
        <Text size="body-small" tone="subtle">
          All optional. Leave one empty to keep the neutral default.
        </Text>
        {BRAND_ROLES.map((role) => {
          const adjusted = theme.adjusted.includes(role);
          const used = formatHex(theme.light[ROLE_TOKEN[role]]!).toUpperCase();
          return (
            <div key={role} className="flex items-end gap-ds-100">
              <div className="min-w-0 flex-1">
                <ColorField
                  label={ROLE_LABEL[role]}
                  value={input[role] ?? null}
                  onChange={(hex) => (hex ? set({ [role]: hex }) : clearRole(role))}
                  description={adjusted ? `Moved to ${used} so text on it passes AA.` : input[role] ? undefined : "Neutral default"}
                />
              </div>
              {input[role] && (
                <Button size="small" variant="subtle" onPress={() => clearRole(role)}>
                  Reset
                </Button>
              )}
            </div>
          );
        })}
      </div>
      </Disclosure>

      <Disclosure id="shape" title="Shape">
      <div className="flex flex-col gap-ds-300 pb-ds-200">
        <Slider
          label="Radius (px)"
          minValue={0}
          maxValue={24}
          step={2}
          value={Math.round(theme.layout.radius * 16)}
          onChange={(px) => set({ radius: (px as number) / 16 })}
        />
        <div className="flex flex-col gap-ds-075">
          <Text size="body-small" weight="medium" tone="subtle">
            Controls
          </Text>
          <SegmentedControl
            label="Controls"
            items={[
              { id: "rounded", label: "Rounded" },
              { id: "pill", label: "Pill" },
            ]}
            value={theme.layout.controlShape}
            onChange={(value) => set({ controlShape: value as ControlShape })}
          />
        </div>
        <div className="flex flex-col gap-ds-075">
          <Text size="body-small" weight="medium" tone="subtle">
            Density
          </Text>
          <SegmentedControl
            label="Density"
            items={DENSITIES.map((value) => ({ id: value, label: value.charAt(0).toUpperCase() + value.slice(1) }))}
            value={theme.layout.density}
            onChange={(value) => set({ density: value as Density })}
          />
        </div>
        <div className="flex flex-col gap-ds-075">
          <Text size="body-small" weight="medium" tone="subtle">
            Border width
          </Text>
          <SegmentedControl
            label="Border width"
            items={BORDERS.map((value) => ({ id: String(value), label: `${value}px` }))}
            value={String(theme.layout.borderWidth)}
            onChange={(value) => set({ borderWidth: Number(value) as BorderWidth })}
          />
        </div>
      </div>
      </Disclosure>
      </Accordion>

      <Banner
        tone={failing.length ? "warning" : "success"}
        title={failing.length ? `${failing.length} of ${theme.checks.length} pairs are below AA.` : `${theme.checks.length} of ${theme.checks.length} color pairs pass WCAG AA.`}
      >
        <span className="flex flex-col items-start gap-ds-100">
          <span>In light and dark.</span>
          <DialogTrigger>
            <Button size="small" variant="subtle">
              {failing.length ? "See which" : "See pairs"}
            </Button>
            <Drawer title="Contrast pairs" description="Every text and border pair the engine checks, with its ratio.">
              <ContrastTable theme={theme} />
            </Drawer>
          </DialogTrigger>
        </span>
      </Banner>
    </div>
  );
}

/** Every checked pair: mode, the two tokens, the ratio against what it needs. Failing pairs first. */
function ContrastTable({ theme }: { theme: Theme }) {
  const rows = [...theme.checks].sort((a, b) => Number(a.pass) - Number(b.pass));
  return (
    <table className="w-full border-collapse text-start text-body-small">
      <thead>
        <tr className="text-ds-text-subtle">
          <th scope="col" className="py-ds-100 pe-ds-200 text-start font-medium">Pair</th>
          <th scope="col" className="py-ds-100 pe-ds-200 text-start font-medium">Mode</th>
          <th scope="col" className="py-ds-100 text-end font-medium">Ratio</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((check, index) => (
          <tr key={index} className="border-t border-ds-border align-top">
            <td className="py-ds-100 pe-ds-200">
              <code className="font-ds-mono text-code text-ds-text">{check.foreground.replace(/^ds-/, "")}</code>
              <span className="text-ds-text-subtlest"> on </span>
              <code className="font-ds-mono text-code text-ds-text-subtle">{check.background.replace(/^ds-/, "")}</code>
            </td>
            <td className="py-ds-100 pe-ds-200 text-ds-text-subtle">{check.mode === "light" ? "Light" : "Dark"}</td>
            <td className={check.pass ? "py-ds-100 text-end whitespace-nowrap tabular-nums text-ds-text" : "py-ds-100 text-end whitespace-nowrap tabular-nums text-ds-text-danger"}>
              {`${check.ratio.toFixed(2)} / ${check.required}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The theme builder: pick a preset or up to three colors and the shape; the whole page re-themes live, every pair is
 * checked, and "Get code" hands over CSS, native hex or the preset code. Built from the library's own components.
 */
export function CreatePage() {
  // The server render and the hydration render are the neutral theme: the build knows no visitor's URL,
  // storage or device. Everything read from the browser arrives in the layout effect below.
  const [input, setInput] = useState<ThemeInput>({});
  const [ready, setReady] = useState(false);
  const [origin, setOrigin] = useState(SITE_ORIGIN);
  // Light or dark belongs to the library (ThemeSwitcher in the site header, themeScript in <head>).
  const dark = useThemePreference().resolved === "dark";

  const theme = useMemo(() => createTheme(input), [input]);
  const css = useMemo(() => toCSS(theme, { tailwind: true }), [theme]);
  const code = useMemo(() => encodePreset(input), [input]);
  const native = useMemo(() => `${JSON.stringify(toNative(theme), null, 2)}\n`, [theme]);
  const shareUrl = `${origin}/create${Object.keys(theme.input).length ? `?p=${code}` : ""}`;

  // After hydration, before the browser paints again: `?p=` wins, then the visitor's stored preset.
  useLayoutEffect(() => {
    const stored = new URLSearchParams(window.location.search).get("p") ?? readStoredPreset()?.code;
    const preset = stored ? decodePreset(stored) : null;
    if (preset) setInput(preset);
    setOrigin(window.location.origin);
    setReady(true);
  }, []);

  useLayoutEffect(() => {
    // Not before the URL is read: the neutral first render must not wipe `?p=` or the stored preset.
    if (!ready) return;
    applyTheme(theme, code);
    const url = new URL(window.location.href);
    if (Object.keys(theme.input).length) url.searchParams.set("p", code);
    else url.searchParams.delete("p");
    // The router keeps its entry key and scroll position in history.state: pass it through.
    window.history.replaceState(window.history.state, "", url);
    // The head script hid the preview while a `?p=` it had no CSS for was pending.
    document.documentElement.removeAttribute("data-preset-pending");
  }, [theme, code, ready]);

  const mode = dark ? theme.dark : theme.light;
  const controls = <Controls input={input} theme={theme} setInput={setInput} />;
  const tokenList = (
<ul className="m-0 grid list-none gap-ds-150 p-0 sm:grid-cols-2 xl:grid-cols-4">
              {SWATCHES.map((token) => {
                const hex = formatHex(mode[token]!).toUpperCase();
                return (
                  <li key={token} className="flex items-center gap-ds-150">
                    <ColorSwatch color={hex} name={token} />
                    <span className="flex min-w-0 flex-col">
                      <code className="truncate font-ds-mono text-code text-ds-text">{token.replace(/^ds-/, "")}</code>
                      <span className="font-ds-mono text-code text-ds-text-subtle">{hex}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
  );

  return (
    // From lg up the page is an editor that fills the screen under the 57px navbar: the controls and the preview sit
    // side by side, each scrolling on its own, so a change is visible next to the control that made it.
    <main id="main" className={`${SITE_CONTAINER} flex flex-col gap-ds-500 py-ds-600 lg:h-[calc(100dvh-57px)] lg:gap-ds-300 lg:py-ds-300`}>
      <header className="flex flex-wrap items-end justify-between gap-ds-300">
        <div className="flex max-w-2xl flex-col gap-ds-075">
          <Heading level={1} size="heading-large">
            Create a theme
          </Heading>
          <Text tone="subtle">
            Pick up to three colors, or none. The engine derives the rest and checks every pair against WCAG AA in light and dark.
          </Text>
        </div>
        <div className="flex items-center gap-ds-100">
          <CopyButton text={shareUrl} label="Share link" copiedLabel="Link copied" />
          <DialogTrigger>
            <Button variant="primary" iconBefore="code">
              Get code
            </Button>
            <Dialog size="large" title="Your theme" description="Paste the CSS into your app, give the hex to native apps, or keep the preset code." secondaryAction={{ label: "Close" }}>
              <Tabs
                aria-label="Output"
                items={[
                  { id: "css", label: "CSS", panel: <CodeBlock code={css} label="theme.css" copyLabel="Copy CSS" /> },
                  { id: "native", label: "Native", panel: <CodeBlock code={native} label="theme.json" copyLabel="Copy JSON" /> },
                  {
                    id: "preset",
                    label: "Preset code",
                    panel: <CodeBlock code={`npx @senvenli/cli theme ${code}\n\n${shareUrl}\n`} label="CLI and link" copyLabel="Copy" />,
                  },
                ]}
              />
            </Dialog>
          </DialogTrigger>
        </div>
      </header>

      <div className="grid gap-ds-500 lg:min-h-0 lg:flex-1 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-ds-300">
        <aside aria-label="Theme controls" className="hidden min-h-0 lg:block">
          <div className="h-full overflow-y-auto overscroll-contain rounded-ds-xlarge bg-ds-surface-sunken p-ds-300">{controls}</div>
        </aside>

        {/* data-preset-pending (set by the head script) keeps the preview hidden until a shared preset applies. */}
        <section aria-label="Preview" className="preview flex min-w-0 flex-col gap-ds-400 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pe-ds-100">
          <Tabs
            aria-label="Preview"
            items={[
              { id: "overview", label: "Overview", panel: <div className="pt-ds-200"><Bento /></div> },
              { id: "forms", label: "Forms", panel: <div className="pt-ds-200"><FormsBoard /></div> },
              { id: "data", label: "Data", panel: <div className="grid gap-ds-200 pt-ds-200"><CollectionPreview /></div> },
              { id: "charts", label: "Charts", panel: <div className="grid gap-ds-200 pt-ds-200 md:grid-cols-2"><ChartsPreview /></div> },
              { id: "auth", label: "Sign in", panel: <div className="grid gap-ds-200 pt-ds-200 md:grid-cols-2"><AuthPreview /></div> },
              { id: "tokens", label: "Tokens", panel: <div className="pt-ds-200">{tokenList}</div> },
            ]}
          />

        </section>
      </div>

      {/* Phones: the preview comes first; the controls open in a bottom drawer from a sticky button. The spacer before
          it is as tall as the button, so at the end of the page the button never covers the last control. */}
      <div aria-hidden className="h-ds-800 lg:hidden" />
      <div className="sticky bottom-ds-200 flex justify-center lg:hidden">
        <DialogTrigger>
          <Button variant="primary" iconBefore="palette">
            Edit theme
          </Button>
          <Drawer position="bottom" title="Edit theme">
            {controls}
          </Drawer>
        </DialogTrigger>
      </div>
    </main>
  );
}
