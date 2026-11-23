import { Link } from "@senvenli/react/action";
import { Calendar } from "@senvenli/react/date";
import { Heading, Icon, Kbd, Text, type IconName } from "@senvenli/react/display";
import { SegmentedControl, Tab, TabList, TabPanel, Tabs } from "@senvenli/react/navigation";
import { DesignSystemProvider } from "@senvenli/react";
import { ComboBox } from "@senvenli/react/selection";
import { CalendarDate } from "@internationalized/date";
import type { Theme } from "@senvenli/tokens";
import { useState } from "react";
import { CodeBlock } from "../CodeBlock";

/**
 * One proof: an icon and a small label, a claim, one sentence, something live on a raised panel, one way in. The card
 * is the sunken ground and the demo the raised surface on it, so the live part is what the eye lands on; cards in a
 * row share a height and the panels line up at the bottom.
 */
function Proof({ icon, eyebrow, title, children, demo, link, className = "" }: { icon: IconName; eyebrow: string; title: string; children: React.ReactNode; demo: React.ReactNode; link: React.ReactNode; className?: string }) {
  return (
    <article className={`flex min-w-0 flex-col gap-ds-300 rounded-ds-xlarge bg-ds-surface-sunken p-ds-150 sm:p-ds-300 lg:p-ds-400 ${className}`}>
      <div className="flex flex-col gap-ds-150 max-sm:px-ds-050 max-sm:pt-ds-050">
        <span className="flex items-center gap-ds-100 text-body-small font-medium text-ds-text-subtle">
          <span aria-hidden className="grid size-7 place-items-center rounded-ds-medium bg-ds-surface-raised text-ds-text-brand">
            <Icon name={icon} />
          </span>
          {eyebrow}
        </span>
        <Heading level={3} size="heading-large">
          {title}
        </Heading>
        <div className="max-w-xl">
          <Text tone="subtle" elementType="p">
            {children}
          </Text>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center rounded-ds-large bg-ds-surface-raised p-ds-100 sm:p-ds-300">{demo}</div>
      <div className="max-sm:px-ds-050 max-sm:pb-ds-050">{link}</div>
    </article>
  );
}

/** Pairs worth seeing: each is drawn with its own two tokens, so it is the theme and the mode on the page right now. */
const PAIRS = [
  ["ds-text", "ds-surface", "Text"],
  ["ds-text-subtle", "ds-surface", "Subtle text"],
  ["ds-text-brand", "ds-surface", "Brand text"],
  ["ds-text-on-brand", "ds-background-brand-bold", "On brand"],
  ["ds-text-success", "ds-background-success", "Success"],
  ["ds-text-danger", "ds-background-danger", "Danger"],
] as const;

/**
 * The theme in view, measured: six pairs drawn with their own tokens, each with the ratio the engine measured for the
 * mode on screen (both are rendered; styles.css shows the one that matches), and the tightest pair of the whole theme.
 */
function Contrast({ theme }: { theme: Theme }) {
  const find = (mode: "light" | "dark", foreground: string, background: string) => theme.checks.find((check) => check.mode === mode && check.foreground === foreground && check.background === background);
  const tightest = (mode: "light" | "dark") => theme.checks.filter((check) => check.mode === mode).reduce((low, check) => (check.ratio / check.required < low.ratio / low.required ? check : low));
  const ratio = (value: number | undefined) => (value === undefined ? "" : `${value.toFixed(2)}:1`);
  return (
    <div className="flex flex-1 flex-col gap-ds-200">
      <ul className="m-0 grid flex-1 list-none auto-rows-fr grid-cols-2 gap-ds-100 p-0 sm:grid-cols-3">
        {PAIRS.map(([foreground, background, name]) => (
          <li
            key={name}
            className="flex min-w-0 flex-col justify-between gap-ds-200 rounded-ds-medium border border-ds-border p-ds-200"
            style={{ backgroundColor: `var(--${background})`, color: `var(--${foreground})` }}
          >
            <span aria-hidden className="text-display-medium font-medium">
              Aa
            </span>
            <span className="flex flex-col text-body-small">
              <span className="truncate font-medium">{name}</span>
              <span className="tabular-nums">
                <span className="home-light-only">{ratio(find("light", foreground, background)?.ratio)}</span>
                <span className="home-dark-only">{ratio(find("dark", foreground, background)?.ratio)}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-x-ds-200 gap-y-ds-050 text-body-small text-ds-text-subtle">
        {(["light", "dark"] as const).map((mode) => {
          const low = tightest(mode);
          return (
            <span key={mode} className={mode === "light" ? "home-light-only" : "home-dark-only"}>
              {`Tightest pair in ${mode}: `}
              <span className="font-ds-mono text-code text-ds-text">{`${low.foreground.replace(/^ds-/, "")} on ${low.background.replace(/^ds-/, "")}`}</span>
            </span>
          );
        })}
        {(["light", "dark"] as const).map((mode) => {
          const low = tightest(mode);
          return (
            <span key={mode} className={`${mode === "light" ? "home-light-only" : "home-dark-only"} tabular-nums`}>
              {`${low.ratio.toFixed(2)}:1, needs ${low.required}:1`}
            </span>
          );
        })}
      </div>
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

const BUILT_IN = ["Keyboard support on every control", "Focus managed in menus and dialogs", "Names and roles for screen readers", "AA contrast in every theme"];

/** Try it with the keyboard: a real combobox, the keys it answers to, and what every component brings with it. */
function KeyboardDemo() {
  return (
    <div className="flex flex-col gap-ds-300">
      <div className="flex flex-col gap-ds-150">
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
      <ul className="m-0 flex list-none flex-col gap-ds-100 border-t border-ds-border p-0 pt-ds-200">
        {BUILT_IN.map((item) => (
          <li key={item} className="flex items-center gap-ds-100 text-body text-ds-text">
            <Icon name="check" color="success" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const LOCALES = [
  { id: "en-US", label: "English" },
  { id: "es-ES", label: "Español" },
  { id: "ar-EG", label: "العربية" },
];

const SAMPLE_DAY = new Date(Date.UTC(2026, 2, 18, 12));

/**
 * The same calendar in three languages, beside what the locale alone changed: the direction, the date and the digits.
 * Arabic mirrors it right to left, with its own digits and month names.
 */
function LocaleDemo() {
  const [locale, setLocale] = useState("ar-EG");
  const rtl = locale.startsWith("ar");
  const facts = [
    ["Direction", rtl ? "Right to left" : "Left to right"],
    ["Date", new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(SAMPLE_DAY)],
    ["Number", new Intl.NumberFormat(locale).format(1234567.89)],
  ] as const;
  return (
    <div className="flex min-w-0 flex-col gap-ds-300">
      <SegmentedControl label="Language" items={LOCALES} value={locale} onChange={(id) => setLocale(String(id))} />
      <div className="flex min-w-0 flex-col items-center gap-ds-300 sm:flex-row sm:items-start sm:justify-between">
        <dl className="m-0 flex w-full min-w-0 flex-col sm:w-auto sm:flex-1">
          {facts.map(([name, value]) => (
            <div key={name} className="flex flex-col gap-ds-025 border-t border-ds-border py-ds-150 first:border-t-0 first:pt-0">
              <dt className="text-body-small text-ds-text-subtle">{name}</dt>
              <dd className="m-0 text-body text-ds-text">
                <bdi lang={locale}>{value}</bdi>
              </dd>
            </div>
          ))}
        </dl>
        <div dir={rtl ? "rtl" : "ltr"} lang={locale} className="home-fit">
          <DesignSystemProvider locale={locale}>
            <Calendar aria-label="Delivery day" defaultValue={new CalendarDate(2026, 3, 18)} />
          </DesignSystemProvider>
        </div>
      </div>
    </div>
  );
}

export type ProofsData = { markdown: string; markdownHtml?: string; json: string; jsonHtml?: string };

/**
 * Four claims, each proved by something live. Twelve columns from 1024px, in two uneven rows (7 + 5, then 5 + 7) so
 * the wide demos get the room; one column below.
 */
export function Proofs({ theme, data }: { theme: Theme; data: ProofsData }) {
  return (
    <div className="grid gap-ds-200 lg:grid-cols-12">
      <Proof
        className="lg:col-span-7"
        icon="swatch-book"
        eyebrow="Theme engine"
        title="Three colors in. A checked theme out."
        demo={<Contrast theme={theme} />}
        link={<Link href="/create">Open the theme builder</Link>}
      >
        Every text and border pair is measured in light and in dark. These are the numbers for the theme on this page, right now.
      </Proof>
      <Proof className="lg:col-span-5" icon="bot" eyebrow="For agents" title="Your agent already knows the API." demo={<AgentTabs {...data} />} link={<Link href="/docs/agents">Connect the MCP server</Link>}>
        Every page ships as Markdown and JSON. The MCP server finds components, writes themes and checks them.
      </Proof>
      <Proof className="lg:col-span-5" icon="keyboard" eyebrow="Accessibility" title="Accessible by construction." demo={<KeyboardDemo />} link={<Link href="/docs/accessibility">How components stay accessible</Link>}>
        Built on React Aria: keyboard, focus and screen reader behavior come with every component. Try it with the keys.
      </Proof>
      <Proof className="lg:col-span-7" icon="languages" eyebrow="Languages" title="Right to left, built in." demo={<LocaleDemo />} link={<Link href="/docs/languages-and-rtl">Languages and RTL</Link>}>
        Logical properties, mirrored icons, localized dates and numbers. Switch the language.
      </Proof>
    </div>
  );
}
