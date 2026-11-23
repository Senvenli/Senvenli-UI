import { Button, CopyButton, Link, Pressable, ThemeSwitcher, ToggleButton, ToggleGroup } from "@senvenli/react/action";
import { ColorSwatchPicker } from "@senvenli/react/color";
import { Badge, Heading, Icon, Text } from "@senvenli/react/display";
import { SegmentedControl } from "@senvenli/react/navigation";
import { createTheme, decodePreset, encodePreset, type ThemeInput } from "@senvenli/tokens";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { Bento } from "../components/home/Bento";
import { Families } from "../components/home/Families";
import { Proofs } from "../components/home/Proofs";
import type { CommandVariant } from "../lib/package-managers";
import { SITE_CONTAINER } from "../lib/layout";
import { applyTheme, PRESETS, readStoredPreset } from "../lib/preset";

export type HomeData = {
  componentCount: number;
  families: { family: string; count: number }[];
  /** Build-time highlighted snippets. */
  installHtml?: string;
  installVariants?: CommandVariant[];
  agentHtml?: string;
  agentCode: string;
  agentJson: string;
  agentJsonHtml?: string;
};

const INSTALL = "npm i @senvenli/react";

/** A few brand colors to try. The checked one is always the page's real brand color, whichever way it was chosen. */
const COLORS = [
  { value: "#996a00", name: "Gold" },
  { value: "#c2410c", name: "Orange" },
  { value: "#be123c", name: "Rose" },
  { value: "#6e56cf", name: "Violet" },
  { value: "#1268ae", name: "Ocean" },
  { value: "#0f766e", name: "Teal" },
  { value: "#2f6f4f", name: "Forest" },
];

/** The base corner radius in rem; "Soft" is the engine's default, so it is left out of the input. */
const SOFT = 0.625;
const CORNERS = [
  { id: "0.375", label: "Sharp" },
  { id: String(SOFT), label: "Soft" },
  { id: "1", label: "Round" },
];

/** An input with nothing undefined and no default restated, so the neutral theme stays `{}` and a preset is recognized. */
function tidy(input: ThemeInput): ThemeInput {
  const out: ThemeInput = {};
  for (const [key, value] of Object.entries(input)) if (value !== undefined) Object.assign(out, { [key]: value });
  if (out.radius === SOFT) delete out.radius;
  if (out.density === "default") delete out.density;
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
 * theme bar (presets, a brand color, corners, light and dark, the AA count) over a stage of real components that the
 * whole page re-themes with; then four proofs (the engine, agents, accessibility, languages), the families, and one
 * command to start.
 */
export function HomePage({ data }: { data: HomeData }) {
  // The prerender is the neutral theme; the visitor's stored theme is read after mount, before paint.
  const [input, setInput] = useState<ThemeInput>({});
  const [ready, setReady] = useState(false);
  const code = encodePreset(input);
  const presetId = PRESETS.find((item) => encodePreset(item.input) === code)?.id;
  const corner = String(input.radius ?? SOFT);
  const theme = useMemo(() => createTheme(input), [input]);
  const passing = theme.checks.filter((check) => check.pass).length;
  const allPass = passing === theme.checks.length;
  const applied = useRef(false);
  const count = useRef<HTMLSpanElement>(null);
  // The swatch picker keeps the last color it was given when its value goes back to none, so going back to a theme
  // with no brand color starts it afresh: nothing stays checked that is not the page's color.
  const [cleared, setCleared] = useState(0);

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
      // The count answers the change with a small nod.
      if (!prefersReducedMotion()) count.current?.animate?.([{ scale: "1" }, { scale: "1.08" }, { scale: "1" }], { duration: 320, easing: "ease-out" });
    } else applyTheme(theme, code);
    applied.current = true;
  }, [theme, code, ready]);

  return (
    <main id="main" className="relative isolate overflow-x-clip pb-ds-1000">
      {/* The one decorative layer of the page: a dot grid that fades out, with a faint wash of the brand color. */}
      <div aria-hidden className="home-ambient" />
      <div className={`${SITE_CONTAINER} flex flex-col`}>
        <section aria-labelledby="home-title" className="home-hero mx-auto flex max-w-3xl flex-col items-center gap-ds-300 pt-ds-600 text-center md:pt-ds-800">
          <div className="w-fit">
            <Pressable href="/docs/agents" background="surface-raised" shadow="raised" radius="full" paddingInline="space-150" fullWidth={false}>
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
            <div className="flex h-ds-control-large min-w-0 items-center justify-between gap-ds-100 rounded-ds-medium bg-ds-surface-sunken ps-ds-200 pe-ds-050">
              <code className="min-w-0 font-ds-mono text-code text-ds-text">{INSTALL}</code>
              <CopyButton value={INSTALL} aria-label="Copy the install command" />
            </div>
          </div>
        </section>

        {/* The studio: what the page is about, on the first screen. The bar stays in reach while the stage scrolls. */}
        <section aria-labelledby="studio-title" className="home-hero mt-ds-600 flex flex-col gap-ds-200 md:mt-ds-800">
          <div
            data-slot="home-theme-bar"
            className="home-dock z-10 flex flex-col gap-ds-200 rounded-ds-xlarge bg-ds-surface-raised p-ds-200 shadow-ds-overlay md:p-ds-250 xl:sticky xl:top-[4.25rem]"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-ds-300 gap-y-ds-100">
              <div className="flex flex-wrap items-baseline gap-x-ds-150 gap-y-ds-025">
                <h2 id="studio-title" className="m-0 text-body-large font-medium text-ds-text">
                  Theme this page
                </h2>
                <Text tone="subtle">Color, corners and density change everywhere at once.</Text>
              </div>
              <div className="flex flex-wrap items-center gap-x-ds-200 gap-y-ds-100">
                <span ref={count} className="inline-flex">
                  <Badge tone={allPass ? "success" : "danger"} hasDot>
                    <span aria-live="polite">{`${passing} / ${theme.checks.length} pairs pass AA`}</span>
                  </Badge>
                </span>
                <Link href={code ? `/create?p=${code}` : "/create"}>Open in the builder</Link>
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-x-ds-300 gap-y-ds-200 xl:gap-x-ds-400">
              <Group label="Preset">
                <ToggleGroup
                  label="Theme preset"
                  selectionMode="single"
                  selectedKeys={presetId ? [presetId] : []}
                  onSelectionChange={(keys) => {
                    const preset = PRESETS.find((item) => keys.has(item.id));
                    if (!preset) return;
                    if (!preset.input.primary) setCleared((times) => times + 1);
                    setInput(preset.input);
                  }}
                >
                  {PRESETS.map((preset) => (
                    <ToggleButton key={preset.id} id={preset.id}>
                      {/* Illustrative: the preset's own brand color (the neutral one is ink on paper). */}
                      <span aria-hidden className="size-3 shrink-0 rounded-ds-full bg-ds-text" style={preset.input.primary ? { backgroundColor: preset.input.primary } : undefined} />
                      {preset.name}
                    </ToggleButton>
                  ))}
                </ToggleGroup>
              </Group>
              <ColorSwatchPicker
                key={cleared}
                label="Brand color"
                items={COLORS}
                allowsCustom
                description="Any color works: use the plus"
                value={input.primary}
                onChange={(value) => setInput((prev) => tidy({ primary: value.toLowerCase(), radius: prev.radius, density: prev.density }))}
              />
              <Group label="Corners">
                <SegmentedControl
                  label="Corners"
                  items={CORNERS}
                  value={CORNERS.some((item) => item.id === corner) ? corner : ""}
                  onChange={(id) => setInput((prev) => tidy({ ...prev, radius: Number(id) }))}
                />
              </Group>
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
          <div aria-hidden className="home-ambient home-ambient-cta" />
          <div className="lg:[&_h2]:text-display-medium">
            <Heading id="start-title" level={2} size="heading-xxlarge">
              Start with one command.
            </Heading>
          </div>
          <div className="max-w-xl">
            <Text size="body-large" tone="subtle" elementType="p">
              Install the package, add the stylesheet, wrap your app. Your agent can take it from there.
            </Text>
          </div>
          <div className="w-full max-w-sm text-start">
            <CodeBlock code={INSTALL} html={data.installHtml} variants={data.installVariants} copyLabel="Copy install command" />
          </div>
          <div className="flex flex-wrap justify-center gap-ds-150">
            <Button variant="primary" size="large" href="/docs/getting-started">
              Get started
            </Button>
            <Button size="large" href="/docs/agents">
              Connect the MCP server
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
