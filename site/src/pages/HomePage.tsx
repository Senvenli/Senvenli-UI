import { Link, LinkButton } from "@senvenli/react/action";
import { ColorSwatch } from "@senvenli/react/color";
import { Heading, Icon, Lozenge, Text } from "@senvenli/react/display";
import { Pressable } from "@senvenli/react/layout";
import { SegmentedControl } from "@senvenli/react/navigation";
import { createTheme, encodePreset, formatHex } from "@senvenli/tokens";
import { useLayoutEffect, useMemo, useState } from "react";
import { CodeBlock } from "../components/CodeBlock";
import type { CommandVariant } from "../lib/package-managers";
import { HomeBoard } from "../components/HomeBoard";
import { familyTitle } from "../lib/manifest";
import { applyTheme, PRESETS, readStoredPreset } from "../lib/preset";

export type HomeData = {
  componentCount: number;
  families: { family: string; count: number }[];
  /** Build-time highlighted snippets. */
  installHtml?: string;
  installVariants?: CommandVariant[];
  agentHtml?: string;
  agentCode: string;
};

const INSTALL = "npm i @senvenli/react";
const SWATCH_TOKENS = ["ds-background-brand-bold", "ds-text-brand", "ds-background-selected", "ds-border-focused", "ds-background-success-bold", "ds-background-warning-bold", "ds-background-danger-bold", "ds-background-information-bold"];

/** A differentiator: a small heading, two lines, one proof, one way in. */
function Feature({ title, children, proof, link, planned = false }: { title: string; children: React.ReactNode; proof: React.ReactNode; link?: React.ReactNode; planned?: boolean }) {
  return (
    <div className="flex flex-col gap-ds-200">
      <div className="flex flex-col gap-ds-075">
        <div className="flex items-center gap-ds-100">
          <Heading level={3} size="heading-small">
            {title}
          </Heading>
          {planned && <Lozenge>Planned</Lozenge>}
        </div>
        <Text tone="subtle">{children}</Text>
      </div>
      {proof}
      {link}
    </div>
  );
}

/**
 * The home page: a left-aligned claim with the install line, then the hook (pick a preset and the whole page
 * re-themes, with the AA count), a board of real components, the three differentiators, the families and install.
 */
export function HomePage({ data }: { data: HomeData }) {
  // The prerender is the neutral theme; the visitor's stored preset is read after mount, before paint.
  const [presetId, setPresetId] = useState("neutral");
  const [ready, setReady] = useState(false);
  const preset = PRESETS.find((item) => item.id === presetId) ?? PRESETS[0]!;
  const theme = useMemo(() => createTheme(preset.input), [preset]);
  const passing = theme.checks.filter((check) => check.pass).length;

  useLayoutEffect(() => {
    const stored = readStoredPreset();
    const match = stored && PRESETS.find((item) => encodePreset(item.input) === stored.code);
    if (match) setPresetId(match.id);
    setReady(true);
  }, []);

  useLayoutEffect(() => {
    if (ready) applyTheme(theme, encodePreset(preset.input));
  }, [theme, preset, ready]);

  return (
    <main id="main" className="mx-auto flex w-full max-w-[1360px] flex-col px-ds-200 pb-ds-1000 sm:px-ds-300">
      {/* Centered, as shadcn's: a quiet "what's new" pill, the claim, one sentence, two ways in, the install line. */}
      <section aria-labelledby="home-title" className="mx-auto flex max-w-3xl flex-col items-center gap-ds-300 pt-ds-1000 text-center">
        <div className="w-fit">
          <Pressable href="/docs/agents" background="neutral" radius="full" paddingInline="space-150" width="content">
            <span className="flex h-7 items-center gap-ds-075 text-body-small font-medium text-ds-text">
              An MCP server for coding agents
              <Icon name="arrow-right" size="small" color="subtle" />
            </span>
          </Pressable>
        </div>
        <Heading id="home-title" level={1} size="display-large">
          A design system that themes itself.
        </Heading>
        <Text size="body-large" tone="subtle">
          {`Pick up to three colors, or none. Senvenli UI derives the whole theme and checks every color pair against WCAG AA in light and dark. ${data.componentCount} accessible React components, built on React Aria.`}
        </Text>
        <div className="flex flex-wrap items-center justify-center gap-ds-150">
          <LinkButton variant="primary" href="/docs">
            Get started
          </LinkButton>
          <LinkButton href="/docs/components">View components</LinkButton>
        </div>
        <div className="w-full max-w-sm text-start">
          <CodeBlock code={INSTALL} html={data.installHtml} variants={data.installVariants} copyLabel="Copy install command" />
        </div>
      </section>

      <section aria-labelledby="try-title" className="mt-ds-800 flex flex-col gap-ds-300">
        <div className="flex flex-wrap items-end justify-between gap-ds-200">
          <div className="flex flex-col gap-ds-075">
            <Heading id="try-title" level={2} size="heading-large">
              Try a theme
            </Heading>
            <Text tone="subtle">Choose one: this page re-themes itself. So will your app.</Text>
          </div>
          <div className="flex flex-wrap items-center gap-ds-200">
            <SegmentedControl label="Theme preset" items={PRESETS.map((item) => ({ id: item.id, label: item.name }))} value={presetId} onChange={(id) => setPresetId(String(id))} />
            <Text size="body-small" tone="subtle">
              <span aria-live="polite">{`${passing} of ${theme.checks.length} color pairs pass AA`}</span>
            </Text>
          </div>
        </div>
        <HomeBoard />
      </section>

      <section aria-labelledby="why-title" className="mt-ds-1000 flex flex-col gap-ds-400">
        <Heading id="why-title" level={2} size="heading-large">
          What sets it apart
        </Heading>
        <div className="grid gap-ds-500 md:grid-cols-3">
          <Feature
            title="A theme engine"
            proof={
              <div className="flex flex-wrap gap-ds-075">
                {SWATCH_TOKENS.map((token) => (
                  <ColorSwatch key={token} color={formatHex(theme.light[token]!)} name={token.replace(/^ds-/, "")} />
                ))}
              </div>
            }
            link={<Link href="/create">Open the theme builder</Link>}
          >
            Zero to three colors in, a full light and dark theme out, every text and border pair checked for contrast.
          </Feature>
          <Feature title="Built for agents" proof={<CodeBlock code={data.agentCode} html={data.agentHtml} label="button.md" copyLabel="Copy excerpt" />} link={<Link href="/llms.txt">Read llms.txt</Link>}>
            Every page is also Markdown and JSON, with examples and the full API, and an MCP server answers your agent.
          </Feature>
          <Feature title="Generative UI" planned proof={<Text size="body-small" tone="subtlest">A curated catalog of these components, rendered from a JSON spec a model writes.</Text>}>
            Models describe an interface; the same components render it, themed and accessible.
          </Feature>
        </div>
      </section>

      <section aria-labelledby="families-title" className="mt-ds-1000 flex flex-col gap-ds-300">
        <div className="flex flex-wrap items-baseline justify-between gap-ds-200">
          <Heading id="families-title" level={2} size="heading-large">
            {`${data.componentCount} components in ${data.families.length} families`}
          </Heading>
          <Link href="/docs/components">See all components</Link>
        </div>
        <ul className="m-0 grid list-none gap-x-ds-400 gap-y-ds-150 p-0 text-body-large sm:grid-cols-2 lg:grid-cols-4">
          {data.families.map((item) => (
            <li key={item.family} className="flex items-baseline justify-between gap-ds-200">
              <Link href={`/docs/components#family-${item.family}`}>{familyTitle(item.family)}</Link>
              <span className="text-body text-ds-text-subtlest">{item.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
