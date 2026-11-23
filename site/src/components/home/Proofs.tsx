import { Link } from "@senvenli/react/action";
import { Calendar } from "@senvenli/react/date";
import { ColorSwatch } from "@senvenli/react/color";
import { Badge, Heading, Kbd, Text } from "@senvenli/react/display";
import { SegmentedControl, Tab, TabList, TabPanel, Tabs } from "@senvenli/react/navigation";
import { DesignSystemProvider } from "@senvenli/react";
import { ComboBox } from "@senvenli/react/selection";
import { CalendarDate } from "@internationalized/date";
import { formatHex, type Theme } from "@senvenli/tokens";
import { useState } from "react";
import { CodeBlock } from "../CodeBlock";

/** One proof: a small label, a claim, one sentence, something live, one way in. Cards in a row share a height. */
function Proof({ eyebrow, title, children, demo, link, framed = false }: { eyebrow: string; title: string; children: React.ReactNode; demo: React.ReactNode; link: React.ReactNode; framed?: boolean }) {
  return (
    <article className="flex min-w-0 flex-col gap-ds-300 rounded-ds-xlarge bg-ds-surface-raised p-ds-200 md:p-ds-400">
      <div className="flex flex-col gap-ds-100">
        <Text size="body-small" weight="medium" tone="subtle">
          {eyebrow}
        </Text>
        <Heading level={3} size="heading-medium">
          {title}
        </Heading>
        <Text tone="subtle">{children}</Text>
      </div>
      {/* A framed demo fills the card on a sunken ground, so a short demo next to a tall one does not float. */}
      <div className={framed ? "flex min-w-0 flex-1 flex-col justify-center rounded-ds-large bg-ds-surface-sunken p-ds-150 md:p-ds-300" : "flex min-w-0 flex-1 flex-col justify-center"}>{demo}</div>
      <div>{link}</div>
    </article>
  );
}

const SWATCHES = [
  ["ds-background-brand-bold", "Brand"],
  ["ds-text-brand", "Brand text"],
  ["ds-background-selected", "Selected"],
  ["ds-border-focused", "Focus"],
  ["ds-background-success-bold", "Success"],
] as const;

/** The first light-mode checks of the theme in view: two tokens, the measured ratio, what it needs. */
function Contrast({ theme }: { theme: Theme }) {
  const rows = theme.checks.filter((check) => check.mode === "light").slice(0, 5);
  return (
    <div className="flex flex-col gap-ds-300">
      <div className="flex flex-wrap gap-ds-150">
        {SWATCHES.map(([token, name]) => (
          <span key={token} className="flex items-center gap-ds-075">
            <ColorSwatch color={formatHex(theme.light[token]!)} name={name} />
            <Text size="body-small" tone="subtle">
              {name}
            </Text>
          </span>
        ))}
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((check) => (
          <li key={`${check.foreground}-${check.background}`} className="flex items-center justify-between gap-ds-200 border-t border-ds-border py-ds-100 first:border-t-0">
            <span className="min-w-0 truncate font-ds-mono text-code">
              <span className="text-ds-text">{check.foreground.replace(/^ds-/, "")}</span>
              <span className="text-ds-text-subtlest"> on </span>
              <span className="text-ds-text-subtle">{check.background.replace(/^ds-/, "")}</span>
            </span>
            <span className="flex shrink-0 items-center gap-ds-100 tabular-nums text-body-small text-ds-text">
              {`${check.ratio.toFixed(2)} / ${check.required}`}
              <Badge tone={check.pass ? "success" : "danger"}>{check.pass ? "Pass" : "Fail"}</Badge>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const MCP_TOOLS = [
  ["search_components", "Finds components by name or purpose."],
  ["get_component", "The page as Markdown: API, examples, guidance."],
  ["create_theme", "A theme from up to three colors, as CSS."],
  ["validate_theme", "Checks a hand-edited theme against AA."],
] as const;

/** What an agent reads: the Markdown twin of a page, its JSON, and the MCP tools. Code wraps; nothing scrolls sideways. */
function AgentTabs({ markdown, markdownHtml, json, jsonHtml }: { markdown: string; markdownHtml?: string; json: string; jsonHtml?: string }) {
  return (
    <Tabs aria-label="What an agent reads" size="small" variant="pills">
      <TabList aria-label="What an agent reads">
        <Tab id="md">button.md</Tab>
        <Tab id="json">button.json</Tab>
        <Tab id="mcp">MCP tools</Tab>
      </TabList>
      <TabPanel id="md">
        <div className="home-wrap">
          <CodeBlock code={markdown} html={markdownHtml} copyLabel="Copy Markdown" />
        </div>
      </TabPanel>
      <TabPanel id="json">
        <div className="home-wrap">
          <CodeBlock code={json} html={jsonHtml} copyLabel="Copy JSON" />
        </div>
      </TabPanel>
      <TabPanel id="mcp">
        <ul className="m-0 flex list-none flex-col p-0">
          {MCP_TOOLS.map(([name, does]) => (
            <li key={name} className="flex flex-col gap-ds-025 border-t border-ds-border py-ds-150 first:border-t-0">
              <code className="font-ds-mono text-code text-ds-text">{name}</code>
              <Text size="body-small" tone="subtle">
                {does}
              </Text>
            </li>
          ))}
        </ul>
      </TabPanel>
    </Tabs>
  );
}

const PEOPLE = ["Ada Lovelace", "Alan Turing", "Grace Hopper", "Katherine Johnson", "Margaret Hamilton"].map((name) => ({ id: name, label: name }));

/** Try it with the keyboard: a real combobox and the keys it answers to. */
function KeyboardDemo() {
  return (
    <div className="flex flex-col gap-ds-200">
      <ComboBox label="Assign to" items={PEOPLE} placeholder="Type a name" />
      <div className="flex flex-wrap items-center gap-x-ds-300 gap-y-ds-100 text-body-small text-ds-text-subtle">
        <span className="flex items-center gap-ds-050">
          <Kbd label="Up">↑</Kbd>
          <Kbd label="Down">↓</Kbd> move
        </span>
        <span className="flex items-center gap-ds-050">
          <Kbd>Enter</Kbd> choose
        </span>
        <span className="flex items-center gap-ds-050">
          <Kbd>Esc</Kbd> close
        </span>
      </div>
    </div>
  );
}

const LOCALES = [
  { id: "en-US", label: "English" },
  { id: "es-ES", label: "Español" },
  { id: "ar-EG", label: "العربية" },
];

/** The same calendar in three languages: Arabic mirrors it right to left, with its own digits and month names. */
function LocaleDemo() {
  const [locale, setLocale] = useState("ar-EG");
  const rtl = locale.startsWith("ar");
  return (
    <div className="flex flex-col items-center gap-ds-200">
      <SegmentedControl label="Language" items={LOCALES} value={locale} onChange={(id) => setLocale(String(id))} />
      <div dir={rtl ? "rtl" : "ltr"} lang={locale}>
        <DesignSystemProvider locale={locale}>
          <Calendar aria-label="Delivery day" defaultValue={new CalendarDate(2026, 3, 18)} />
        </DesignSystemProvider>
      </div>
    </div>
  );
}

export type ProofsData = { markdown: string; markdownHtml?: string; json: string; jsonHtml?: string };

/** Four claims, each proved by something live. Two columns from 1024px, one below. */
export function Proofs({ theme, data }: { theme: Theme; data: ProofsData }) {
  return (
    <div className="grid gap-ds-200 lg:grid-cols-2">
      <Proof
        eyebrow="Theme engine"
        title="Three colors in. A checked theme out."
        demo={<Contrast theme={theme} />}
        link={<Link href="/create">Open the theme builder</Link>}
      >
        Every text and border pair is measured in light and in dark, for the theme on this page right now.
      </Proof>
      <Proof eyebrow="For agents" title="Your agent already knows the API." demo={<AgentTabs {...data} />} link={<Link href="/docs/agents">Connect the MCP server</Link>}>
        Every page ships as Markdown and JSON. The MCP server finds components, writes themes and checks them.
      </Proof>
      <Proof eyebrow="Accessibility" title="Accessible by construction." framed demo={<KeyboardDemo />} link={<Link href="/docs/accessibility">How components stay accessible</Link>}>
        Built on React Aria: keyboard, focus and screen reader behavior come with every component. Try it with the keys.
      </Proof>
      <Proof eyebrow="Languages" title="Right to left, built in." framed demo={<LocaleDemo />} link={<Link href="/docs/languages-and-rtl">Languages and RTL</Link>}>
        Logical properties, mirrored icons, localized dates and numbers. Switch the language.
      </Proof>
    </div>
  );
}
