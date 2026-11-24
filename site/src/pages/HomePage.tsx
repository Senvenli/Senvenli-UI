import { Button, Link, Pressable, ThemeSwitcher } from "@senvenli/react/action";
import { ColorSwatchPicker } from "@senvenli/react/color";
import { Heading, Icon, Text } from "@senvenli/react/display";
import { SegmentedControl } from "@senvenli/react/navigation";
import { Select } from "@senvenli/react/selection";
import { createTheme, decodePreset, encodePreset, type Density, type ThemeInput } from "@senvenli/tokens";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Ambient } from "../components/home/Ambient";
import { Bento } from "../components/home/Bento";
import { Connect } from "../components/home/Connect";
import { Families, type Family } from "../components/home/Families";
import { Proofs } from "../components/home/Proofs";
import { SITE_CONTAINER } from "../lib/layout";
import { applyTheme, readStoredPreset } from "../lib/preset";

export type HomeData = {
  componentCount: number;
  families: Family[];
  /** Build-time highlighted snippets. */
  agentHtml?: string;
  agentCode: string;
  agentJson: string;
  agentJsonHtml?: string;
};

/**
 * The value that stands for "no brand color"; picking it clears the brand color. The swatch itself is painted in the
 * neutral theme's ink (near black in light, near white in dark) by the dock's Neutral rule in styles.css, since a
 * swatch's color is one value for both modes.
 */
const NEUTRAL = "#85827c";

/**
 * The one color choice: no brand color, or a few to try (the plus takes any other). The checked one is always the
 * page's real brand color, whichever way it was chosen.
 */
const COLORS = [
  { value: NEUTRAL, name: "Neutral" },
  { value: "#996a00", name: "Gold" },
  { value: "#c2410c", name: "Orange" },
  { value: "#be123c", name: "Rose" },
  { value: "#6e56cf", name: "Violet" },
  { value: "#1268ae", name: "Ocean" },
  { value: "#0f766e", name: "Teal" },
  { value: "#2f6f4f", name: "Forest" },
];

/** The engine's default base corner radius in rem; it is left out of the input. */
const MEDIUM = 0.625;
/**
 * The library's radius scale as theme inputs: each step is a base radius in rem (the theme derives every other radius
 * from it). None is square; Large is clearly rounder than Medium while a 36px control still has straight sides; Full
 * is the engine's `controlShape: "pill"`: every single-line control (buttons, fields, badges, segments) is fully round
 * while cards keep a large radius. A stored theme with any other radius (the builder's slider, an older preset) shows
 * as the nearest of the first four steps.
 */
const CORNERS = [
  { id: "none", label: "None", radius: 0 },
  { id: "small", label: "Small", radius: 0.3125 },
  { id: "medium", label: "Medium", radius: MEDIUM },
  { id: "large", label: "Large", radius: 0.8125 },
  { id: "full", label: "Full", radius: 0.8125, controlShape: "pill" as const },
];

const DENSITIES: { id: Density; label: string }[] = [
  { id: "compact", label: "Compact" },
  { id: "default", label: "Default" },
  { id: "comfortable", label: "Comfortable" },
];

/** An input with nothing undefined and no default restated, so the neutral theme stays `{}` and a preset is recognized. */
function tidy(input: ThemeInput): ThemeInput {
  const out: ThemeInput = {};
  for (const [key, value] of Object.entries(input)) if (value !== undefined) Object.assign(out, { [key]: value });
  if (out.radius === MEDIUM) delete out.radius;
  if (out.density === "default") delete out.density;
  if (out.controlShape === "rounded") delete out.controlShape;
  return out;
}

/** Reduced motion from the device or the site's own motion setting. */
function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  const setting = document.documentElement.getAttribute("data-ds-motion");
  if (setting === "reduce" || setting === "none") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * Runs a page-wide change as a view transition where the browser can, and at once where it cannot or motion is
 * reduced: a cross-fade at the theme's own pace (styles.css).
 *
 * While a transition runs the browser shows a picture of the page, so a click lands on the root, not on what is under
 * the pointer. Someone trying presets one after another would lose every second click: such a click ends the
 * transition and is passed on to the element at that point.
 */
function withTransition(change: () => void) {
  const doc = document as Document & { startViewTransition?: (update: () => void) => { finished: Promise<unknown>; skipTransition: () => void } };
  if (!doc.startViewTransition || prefersReducedMotion()) return change();
  const root = document.documentElement;
  const transition = doc.startViewTransition(change);
  let missed: { x: number; y: number } | null = null;
  const onClick = (event: MouseEvent) => {
    if (event.target !== root || !event.isTrusted) return;
    missed = { x: event.clientX, y: event.clientY };
    transition.skipTransition();
  };
  root.addEventListener("click", onClick);
  const done = () => {
    root.removeEventListener("click", onClick);
    if (!missed) return;
    const under = document.elementFromPoint(missed.x, missed.y);
    const target = under?.closest<HTMLElement>("button, a, input, label, [role='radio'], [role='option'], [role='tab']") ?? (under instanceof HTMLElement ? under : null);
    target?.click();
  };
  transition.finished.then(done, done);
}

/** A labelled group of the theme bar: the label names the control under it. */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-ds-100">
      <span aria-hidden className="text-body-small font-medium text-ds-text-subtle">
        {label}
      </span>
      {children}
    </div>
  );
}

/** One section: a heading, one line under it, then the content. */
function Section({ id, title, lead, action, children }: { id: string; title: string; lead: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="home-reveal mt-ds-1000 flex flex-col gap-ds-500 pt-ds-300 lg:pt-ds-800">
      <div className="flex flex-wrap items-end justify-between gap-ds-200">
        <div className="flex max-w-2xl flex-col gap-ds-150 lg:[&_h2]:text-display-medium">
          <Heading id={id} level={2} size="heading-xxlarge">
            {title}
          </Heading>
          <Text size="body-large" tone="subtle">
            {lead}
          </Text>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * The home page, built from the library's own components. A centred hero; right under it, on the first screen, the
 * theme bar (a color, corners, density, light and dark) over a stage of real components that the
 * whole page re-themes with; then four proofs (the engine, agents, accessibility, languages), the families, and how
 * the library reaches an agent.
 */
export function HomePage({ data }: { data: HomeData }) {
  // The prerender is the neutral theme; the visitor's stored theme is read after mount, before paint.
  const [input, setInput] = useState<ThemeInput>({});
  const [ready, setReady] = useState(false);
  const code = encodePreset(input);
  const radius = input.radius ?? MEDIUM;
  const corner =
    input.controlShape === "pill"
      ? "full"
      : CORNERS.filter((item) => !item.controlShape).reduce((near, item) => (Math.abs(item.radius - radius) < Math.abs(near.radius - radius) ? item : near)).id;
  const density = input.density ?? "default";
  const setCorner = (id: string) =>
    setInput((prev) => {
      const step = CORNERS.find((item) => item.id === id);
      return step ? tidy({ ...prev, radius: step.radius, controlShape: step.controlShape }) : prev;
    });
  const setDensity = (id: string) => setInput((prev) => tidy({ ...prev, density: DENSITIES.find((item) => item.id === id)?.id ?? prev.density }));
  const theme = useMemo(() => createTheme(input), [input]);
  const applied = useRef(false);

  useLayoutEffect(() => {
    const stored = readStoredPreset();
    const restored = stored ? decodePreset(stored.code) : null;
    if (restored) setInput(tidy(restored));
    setReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!ready) return;
    // The first application restores what the visitor had: no transition for that.
    if (applied.current) {
      withTransition(() => applyTheme(theme, code));
    } else applyTheme(theme, code);
    applied.current = true;
  }, [theme, code, ready]);

  return (
    <main id="main" className="relative isolate overflow-x-clip pb-ds-1000">
      {/* The one decorative layer of the page: a dot grid that fades out, with a faint wash of the brand color. */}
      <Ambient />
      <div className={`${SITE_CONTAINER} flex flex-col`}>
        <section aria-labelledby="home-title" className="home-hero mx-auto flex max-w-3xl flex-col items-center gap-ds-300 pt-ds-600 text-center md:pt-ds-800">
          <div className="w-fit">
            <Pressable href="/docs/agents" background="surface-raised" shadow="raised" radius={corner === "none" ? "none" : "full"} paddingInline="space-150" fullWidth={false}>
              <span className="flex min-h-8 items-center gap-ds-100 text-body-small font-medium text-ds-text">
                <span aria-hidden className="size-1.5 rounded-ds-full bg-ds-background-brand-bold" />
                New: an MCP server for your coding agent
                <Icon name="arrow-right" size="small" color="subtle" />
              </span>
            </Pressable>
          </div>
          <div className="home-title">
            <Heading id="home-title" level={1} size="display-large">
              A design system <span className="home-title-accent">that themes itself.</span>
            </Heading>
          </div>
          <div className="max-w-2xl">
            <Text size="body-large" tone="subtle" elementType="p">
              {`Give it up to three colors, or none. Senvenli UI derives a full light and dark theme, checks every color pair against WCAG AA, and ships ${data.componentCount} accessible React components your coding agent can read.`}
            </Text>
          </div>
          <div className="flex w-full flex-col items-stretch justify-center gap-ds-150 pt-ds-100 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Button variant="primary" size="large" href="/docs/getting-started">
              Get started
            </Button>
            <Button size="large" href="/docs/components">
              Browse components
            </Button>
          </div>
        </section>

        {/* The studio: what the page is about, on the first screen. The bar stays in reach while the stage scrolls. */}
        <section aria-labelledby="studio-title" className="home-hero mt-ds-600 flex flex-col gap-ds-200 md:mt-ds-800">
          <div
            data-slot="home-theme-bar"
            className="home-dock z-10 flex flex-col gap-ds-200 rounded-ds-xlarge bg-ds-surface-raised p-ds-200 shadow-ds-overlay md:p-ds-250 xl:sticky xl:top-[4.25rem]"
          >
            <div className="flex flex-wrap items-baseline gap-x-ds-150 gap-y-ds-025">
              <h2 id="studio-title" className="m-0 text-body-large font-medium text-ds-text">
                Theme this page
              </h2>
              <Text tone="subtle">Color, corners and density change everywhere at once.</Text>
            </div>
            <div className="flex flex-wrap items-start gap-x-ds-300 gap-y-ds-200 xl:gap-x-ds-400">
              {/* A color pick changes the color alone: corners and density stay as they are set beside it. */}
              <ColorSwatchPicker
                label="Color"
                items={COLORS}
                allowsCustom
                description="Any color works: use the plus"
                value={input.primary ?? NEUTRAL}
                onChange={(value) => {
                  const primary = value.toLowerCase();
                  setInput((prev) => tidy({ primary: primary === NEUTRAL ? undefined : primary, radius: prev.radius, controlShape: prev.controlShape, density: prev.density }));
                }}
              />
              {/* Five steps do not fit a phone as one segmented row: under 640px corners and density are two selects. */}
              <div className="grid w-full gap-ds-150 min-[360px]:grid-cols-2 sm:hidden">
                <Select label="Corners" items={CORNERS} selectedKey={corner} onSelectionChange={(id: unknown) => setCorner(String(id))} />
                <Select label="Density" items={DENSITIES} selectedKey={density} onSelectionChange={(id: unknown) => setDensity(String(id))} />
              </div>
              <div className="max-sm:hidden">
                <Group label="Corners">
                  <SegmentedControl label="Corners" items={CORNERS} value={corner} onChange={(id) => setCorner(String(id))} />
                </Group>
              </div>
              <div className="max-sm:hidden">
                <Group label="Density">
                  <SegmentedControl label="Density" items={DENSITIES} value={density} onChange={(id) => setDensity(String(id))} />
                </Group>
              </div>
              <Group label="Mode">
                <ThemeSwitcher variant="segmented" />
              </Group>
            </div>
          </div>
          <div data-slot="home-stage" className="rounded-ds-xlarge bg-ds-surface-sunken p-ds-100 sm:p-ds-200">
            <Bento />
          </div>
        </section>

        {/* What it is, in four figures. */}
        <dl className="home-reveal m-0 mt-ds-600 grid grid-cols-2 gap-x-ds-300 gap-y-ds-400 lg:grid-cols-4">
          {[
            [String(data.componentCount), "React components"],
            [String(data.families.length), "families, one vocabulary"],
            [String(theme.checks.length), "color pairs checked per theme"],
            ["2", "modes from the same inputs"],
          ].map(([figure, label]) => (
            <div key={label} className="flex flex-col gap-ds-050 border-s border-ds-border ps-ds-200">
              <dt className="order-2 text-body text-ds-text-subtle">{label}</dt>
              <dd className="m-0 text-heading-xxlarge font-medium tabular-nums text-ds-text">{figure}</dd>
            </div>
          ))}
        </dl>

        <Section id="proofs-title" title="Built to be trusted, by people and agents." lead="Four claims, each one proved live on this page.">
          <Proofs theme={theme} data={{ markdown: data.agentCode, markdownHtml: data.agentHtml, json: data.agentJson, jsonHtml: data.agentJsonHtml }} />
        </Section>

        <Section
          id="families-title"
          title={`${data.componentCount} components in ${data.families.length} families.`}
          lead="From a keycap to a data table, all on React Aria, all themed by the same few inputs."
          action={<Link href="/docs/components">See all components</Link>}
        >
          <Families families={data.families} />
        </Section>

        <section aria-labelledby="start-title" className="home-reveal home-cta relative isolate mt-ds-1000 flex flex-col items-center gap-ds-300 overflow-hidden rounded-ds-xlarge bg-ds-surface-sunken px-ds-200 py-ds-800 text-center max-[359px]:px-ds-100 md:px-ds-300 lg:mt-[9rem] lg:py-ds-1000">
          <Ambient className="home-ambient-cta" />
          <div className="lg:[&_h2]:text-display-medium">
            <Heading id="start-title" level={2} size="heading-xxlarge">
              Plug it into your agent.
            </Heading>
          </div>
          <div className="max-w-xl">
            <Text size="body-large" tone="subtle" elementType="p">
              One MCP server and a manifest for every component: your editor or coding agent reads the real props, not a guess.
            </Text>
          </div>
          <div className="w-full pt-ds-200">
            <Connect />
          </div>
          <div className="flex flex-wrap justify-center gap-ds-150">
            <Button variant="primary" size="large" href="/docs/getting-started">
              Get started
            </Button>
            <Button size="large" href="/docs/agents">
              Connect MCP
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
