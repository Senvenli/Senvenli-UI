import { Button, useThemePreference } from "@senvenli/react/action";
import { ColorField, ColorSwatch, ColorSwatchPicker } from "@senvenli/react/color";
import { Badge, Heading, Text } from "@senvenli/react/display";
import { Banner } from "@senvenli/react/feedback";
import { SegmentedControl, Tabs } from "@senvenli/react/navigation";
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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AuthPreview } from "../components/create/AuthBoard";
import { ChartsBoard } from "../components/create/ChartsBoard";
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

type SetInput = (next: ThemeInput | ((prev: ThemeInput) => ThemeInput)) => void;

/** "Start from": the presets as swatches. In the toolbar on wide screens, first in the drawer on narrow ones. */
function Presets({ input, setInput }: { input: ThemeInput; setInput: SetInput }) {
  const code = encodePreset(input);
  const preset = PRESETS.find((item) => encodePreset(item.input) === code);
  return (
    <ColorSwatchPicker
      label="Start from"
      items={PRESETS.map((item) => ({ value: presetSwatch(item.input), name: item.name }))}
      value={preset ? presetSwatch(preset.input) : ""}
      onChange={(hex) => {
        const match = PRESETS.find((item) => presetSwatch(item.input) === hex.toUpperCase());
        if (match) setInput(match.input);
      }}
    />
  );
}

/** The contrast proof in one line: how many pairs pass, and the drawer that lists every one. */
function ContrastStatus({ theme }: { theme: Theme }) {
  const failing = theme.checks.filter((check) => !check.pass);
  return (
    <div className="flex items-center gap-ds-075">
      <Badge tone={failing.length ? "warning" : "success"}>
        {failing.length ? `${failing.length} of ${theme.checks.length} pairs below AA` : `${theme.checks.length} of ${theme.checks.length} pairs pass AA`}
      </Badge>
      <DialogTrigger>
        <Button size="small" variant="subtle">
          {failing.length ? "See which" : "See pairs"}
        </Button>
        <Drawer title="Contrast pairs" description="Every text and border pair the engine checks, in light and dark, with its ratio.">
          <ContrastTable theme={theme} />
        </Drawer>
      </DialogTrigger>
    </div>
  );
}

/** A group of controls under its name. Always open: the rail is short enough to show both groups at once. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-ds-150">
      <Heading level={2} size="heading-xsmall">
        {title}
      </Heading>
      {children}
    </section>
  );
}

/** The builder's controls: colors and shape. A sticky rail beside the preview, or in a drawer on narrow screens. */
function Controls({ input, theme, setInput }: { input: ThemeInput; theme: Theme; setInput: SetInput }) {
  const set = (patch: Partial<ThemeInput>) => setInput((prev) => ({ ...prev, ...patch }));
  const clearRole = (role: BrandRole) =>
    setInput((prev) => {
      const next = { ...prev };
      delete next[role];
      return next;
    });

  return (
    <div className="flex flex-col gap-ds-300">
      <Group title="Colors">
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
      </Group>

      <Group title="Shape">
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
      </Group>
    </div>
  );
}

/**
 * What the sticky layout needs to know and CSS cannot: how tall the toolbar is (the rail sticks under it), and whether
 * the rail fits in the screen under it. A rail that fits sticks; one that does not (a short window) stays in the page
 * and scrolls with it. Either way nothing scrolls inside the page but the page.
 */
function useStudioLayout(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const studio = ref.current;
    const toolbar = studio?.querySelector<HTMLElement>('[data-slot="create-toolbar"]');
    const rail = studio?.querySelector<HTMLElement>('[data-slot="create-rail"]');
    if (!studio || !toolbar || !rail || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const styles = getComputedStyle(studio);
      const nav = parseFloat(styles.getPropertyValue("--create-nav")) || 0;
      const gap = parseFloat(getComputedStyle(rail).marginBlockStart) || 0;
      const bar = toolbar.offsetHeight;
      studio.style.setProperty("--create-toolbar", `${bar}px`);
      const fits = rail.offsetHeight > 0 && rail.offsetHeight <= window.innerHeight - nav - bar - 2 * gap;
      rail.toggleAttribute("data-sticky", fits);
    };
    const sizes = new ResizeObserver(measure);
    sizes.observe(toolbar);
    sizes.observe(rail);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      sizes.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);
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
 *
 * A studio with one scrollbar, the page's. From lg up the toolbar (presets, the contrast proof, share, code) sticks
 * under the navbar and the controls stick beside the preview, so a change is always visible next to the control that
 * made it and nothing scrolls inside anything else. Below lg the preview takes the width and the controls open in a
 * bottom drawer.
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

  const studio = useRef<HTMLElement>(null);
  useStudioLayout(studio);

  const mode = dark ? theme.dark : theme.light;
  const failing = theme.checks.filter((check) => !check.pass);
  const presets = <Presets input={input} setInput={setInput} />;
  const controls = <Controls input={input} theme={theme} setInput={setInput} />;
  const tokenList = (
    <ul className="m-0 grid list-none gap-ds-150 p-0 @lg:grid-cols-2 @4xl:grid-cols-3">
      {SWATCHES.map((token) => {
        const hex = formatHex(mode[token]!).toUpperCase();
        return (
          <li key={token} className="flex min-w-0 items-center gap-ds-150">
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
    <main ref={studio} id="main" className={`create-studio ${SITE_CONTAINER} flex flex-col pt-ds-400 pb-ds-600`}>
      <header className="flex max-w-2xl flex-col gap-ds-075 pb-ds-200">
        <Heading level={1} size="heading-large">
          Create a theme
        </Heading>
        <Text tone="subtle">
          Pick up to three colors, or none. The engine derives the rest and checks every pair against WCAG AA in light and dark.
        </Text>
      </header>

      {/* The toolbar: where a theme starts and where it leaves. Sticky from lg, under the navbar. */}
      <div data-slot="create-toolbar" className="create-toolbar flex flex-wrap items-center justify-between gap-x-ds-300 gap-y-ds-200 border-b border-ds-border bg-ds-surface py-ds-150">
        <div className="min-w-0">{presets}</div>
        <div className="flex flex-wrap items-center gap-x-ds-200 gap-y-ds-100">
          <ContrastStatus theme={theme} />
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
        </div>
      </div>

      <div className="grid items-start gap-ds-300 lg:grid-cols-[19rem_minmax(0,1fr)]">
        {/* Sticky, never a scroller: it is as tall as its controls, and sticks only where the screen can show them all. */}
        <aside aria-label="Theme controls" data-slot="create-rail" className="create-rail hidden rounded-ds-xlarge bg-ds-surface-sunken p-ds-200 lg:block">
          {controls}
        </aside>

        {/* data-preset-pending (set by the head script) keeps the preview hidden until a shared preset applies. */}
        <section aria-label="Preview" data-slot="create-preview" className="preview flex min-w-0 flex-col gap-ds-200 pt-ds-200">
          {failing.length > 0 && (
            <Banner tone="warning" title={`${failing.length} of ${theme.checks.length} pairs are below AA.`}>
              In light and dark. Open “See which” for the pairs and their ratios.
            </Banner>
          )}
          <div className="@container min-w-0">
            <Tabs
              aria-label="Preview"
              items={[
                { id: "overview", label: "Overview", panel: <div className="pt-ds-200"><Bento /></div> },
                { id: "forms", label: "Forms", panel: <div className="pt-ds-200"><FormsBoard /></div> },
                { id: "data", label: "Data", panel: <div className="grid gap-ds-200 pt-ds-200"><CollectionPreview /></div> },
                { id: "charts", label: "Charts", panel: <div className="pt-ds-200"><ChartsBoard /></div> },
                { id: "auth", label: "Sign in", panel: <div className="grid items-start gap-ds-200 pt-ds-200 @[40rem]:grid-cols-2"><AuthPreview /></div> },
                { id: "tokens", label: "Tokens", panel: <div className="pt-ds-200">{tokenList}</div> },
              ]}
            />
          </div>
        </section>
      </div>

      {/* Below lg: the preview comes first; the controls open in a bottom drawer from a sticky button. The spacer before
          it is as tall as the button, so at the end of the page the button never covers the last control. */}
      <div aria-hidden className="h-ds-800 lg:hidden" />
      <div className="sticky bottom-ds-200 flex justify-center lg:hidden">
        <DialogTrigger>
          <Button variant="primary" iconBefore="palette">
            Edit theme
          </Button>
          <Drawer position="bottom" title="Edit theme">
            <div className="flex flex-col gap-ds-300">
              {presets}
              {controls}
            </div>
          </Drawer>
        </DialogTrigger>
      </div>
    </main>
  );
}
