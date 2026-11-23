import { Button, CopyButton, Link, Pressable } from "@senvenli/react/action";
import { ColorSwatchPicker } from "@senvenli/react/color";
import { Badge, Heading, Icon, Text } from "@senvenli/react/display";
import { SegmentedControl } from "@senvenli/react/navigation";
import { Select } from "@senvenli/react/selection";
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
/** The presets as choices; with your own color picked, none of them is selected (the swatch picker shows it). */
const PRESET_ITEMS = PRESETS.map((item) => ({ id: item.id, label: item.name }));

/** A few brand colors to try; any of them is checked like the presets. */
const COLORS = [
  { value: "#996a00", name: "Gold" },
  { value: "#c2410c", name: "Orange" },
  { value: "#be123c", name: "Rose" },
  { value: "#6e56cf", name: "Violet" },
  { value: "#1268ae", name: "Ocean" },
  { value: "#0f766e", name: "Teal" },
  { value: "#2f6f4f", name: "Forest" },
];

/** Reduced motion from the device or the site's own motion setting. */
function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  const setting = document.documentElement.getAttribute("data-ds-motion");
  if (setting === "reduce" || setting === "none") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Runs a page-wide change as a cross-fade where the browser can, and at once where it cannot or motion is reduced. */
function withTransition(change: () => void) {
  const start = (document as Document & { startViewTransition?: (update: () => void) => unknown }).startViewTransition;
  if (!start || prefersReducedMotion()) change();
  else start.call(document, change);
}

/** One section: a heading, one line under it, then the content. */
function Section({ id, title, lead, action, children }: { id: string; title: string; lead: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="home-reveal mt-ds-800 flex flex-col gap-ds-400 lg:mt-ds-1000">
      <div className="flex flex-wrap items-end justify-between gap-ds-200">
        <div className="flex max-w-2xl flex-col gap-ds-100">
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
 * The home page, built from the library's own components. A short hero; right under it, on the first screen, the
 * theme studio (presets, your own color, the AA count) over a board of real components that the whole page re-themes
 * with; then four proofs (the engine, agents, accessibility, languages), the families, and one command to start.
 */
export function HomePage({ data }: { data: HomeData }) {
  // The prerender is the neutral theme; the visitor's stored theme is read after mount, before paint.
  const [input, setInput] = useState<ThemeInput>({});
  const [ready, setReady] = useState(false);
  const code = encodePreset(input);
  const presetId = PRESETS.find((item) => encodePreset(item.input) === code)?.id;
  const custom = presetId ? undefined : input.primary;
  const theme = useMemo(() => createTheme(input), [input]);
  const passing = theme.checks.filter((check) => check.pass).length;
  const applied = useRef(false);

  useLayoutEffect(() => {
    const stored = readStoredPreset();
    const restored = stored ? decodePreset(stored.code) : null;
    if (restored) setInput(restored);
    setReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!ready) return;
    // The first application restores what the visitor had: no fade for that.
    if (applied.current) withTransition(() => applyTheme(theme, code));
    else applyTheme(theme, code);
    applied.current = true;
  }, [theme, code, ready]);

  return (
    <main id="main" className={`${SITE_CONTAINER} flex flex-col pb-ds-1000`}>
      {/* Short and centred, as shadcn's: a pill, the claim, one sentence, two ways in, the install line. */}
      <section aria-labelledby="home-title" className="home-hero mx-auto flex max-w-3xl flex-col items-center gap-ds-300 pt-ds-500 text-center md:pt-ds-800">
        <div className="w-fit">
          <Pressable href="/docs/agents" background="neutral" radius="full" paddingInline="space-150" fullWidth={false}>
            <span className="flex h-7 items-center gap-ds-075 text-body-small font-medium text-ds-text">
              New: an MCP server for your coding agent
              <Icon name="arrow-right" size="small" color="subtle" />
            </span>
          </Pressable>
        </div>
        <div className="max-md:[&_h1]:text-display-medium">
          <Heading id="home-title" level={1} size="display-large">
            A design system that themes itself.
          </Heading>
        </div>
        <Text size="body-large" tone="subtle">
          {`Give it up to three colors, or none. Senvenli UI derives a full light and dark theme, checks every color pair against WCAG AA, and ships ${data.componentCount} accessible React components your coding agent can read.`}
        </Text>
        <div className="flex w-full flex-col items-stretch justify-center gap-ds-150 sm:w-auto sm:flex-row sm:items-center">
          <Button variant="primary" size="large" href="/docs/getting-started">
            Get started
          </Button>
          <Button size="large" href="/create">
            Open the theme builder
          </Button>
        </div>
        <div className="flex items-center gap-ds-100 rounded-ds-full bg-ds-surface-sunken ps-ds-200 pe-ds-050 py-ds-050">
          <code className="font-ds-mono text-code text-ds-text">{INSTALL}</code>
          <CopyButton value={INSTALL} aria-label="Copy the install command" />
        </div>
      </section>

      {/* The studio: what the page is about, on the first screen. */}
      <section aria-labelledby="studio-title" className="home-hero mt-ds-600 flex flex-col gap-ds-200 md:mt-ds-800">
        <h2 id="studio-title" className="sr-only">
          Try a theme
        </h2>
        <div data-slot="home-theme-bar" className="flex flex-col gap-ds-200 rounded-ds-xlarge bg-ds-surface-sunken p-ds-200 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-ds-200 md:flex-row md:items-center md:gap-ds-300">
            {/* Five presets fit a segmented row from 640px; on a phone they are a select, so none is cut off. */}
            <div className="sm:hidden">
              <Select
                label="Theme preset"
                items={PRESET_ITEMS}
                selectedKey={presetId ?? null}
                onSelectionChange={(id) => {
                  const preset = PRESETS.find((item) => item.id === id);
                  if (preset) setInput(preset.input);
                }}
              />
            </div>
            <div className="hidden sm:block">
              <SegmentedControl
                label="Theme preset"
                items={PRESET_ITEMS}
                value={presetId ?? ""}
                onChange={(id) => {
                  const preset = PRESETS.find((item) => item.id === id);
                  if (preset) setInput(preset.input);
                }}
              />
            </div>
            <ColorSwatchPicker label="Or your color" items={COLORS} value={custom ?? ""} onChange={(value) => setInput({ primary: value })} />
          </div>
          <div className="flex flex-wrap items-center gap-ds-200">
            <Badge tone="success" hasDot>
              <span aria-live="polite">{`${passing} / ${theme.checks.length} pairs pass AA`}</span>
            </Badge>
            <Link href={code ? `/create?p=${code}` : "/create"}>Customize in the builder</Link>
          </div>
        </div>
        <Text size="body-small" tone="subtle">
          The whole page re-themes as you choose: color, corner radius and density change together.
        </Text>
        <Bento />
      </section>

      <Section id="proofs-title" title="Built to be trusted, by people and agents." lead="Four claims, each proved live on this page.">
        <Proofs theme={theme} data={{ markdown: data.agentCode, markdownHtml: data.agentHtml, json: data.agentJson, jsonHtml: data.agentJsonHtml }} />
      </Section>

      <Section
        id="families-title"
        title={`${data.componentCount} components in ${data.families.length} families`}
        lead="From a keycap to a data table, all on React Aria, all themed by the same few inputs."
        action={<Link href="/docs/components">See all components</Link>}
      >
        <Families families={data.families} />
      </Section>

      <section aria-labelledby="start-title" className="home-reveal mt-ds-800 flex flex-col items-center gap-ds-300 rounded-ds-xlarge bg-ds-surface-sunken px-ds-300 py-ds-800 text-center lg:mt-ds-1000">
        <Heading id="start-title" level={2} size="heading-xxlarge">
          Start with one command.
        </Heading>
        <Text size="body-large" tone="subtle">
          Install the package, add the stylesheet, wrap your app. Your agent can take it from there.
        </Text>
        <div className="w-full max-w-sm text-start">
          <CodeBlock code={INSTALL} html={data.installHtml} variants={data.installVariants} copyLabel="Copy install command" />
        </div>
        <div className="flex flex-wrap justify-center gap-ds-150">
          <Button variant="primary" href="/docs/getting-started">
            Get started
          </Button>
          <Button href="/docs/agents">Connect the MCP server</Button>
        </div>
      </section>
    </main>
  );
}
