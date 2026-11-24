import { CalendarDate } from "@internationalized/date";
import { Button, CopyButton, Link } from "@senvenli/react/action";
import { Sparkline } from "@senvenli/react/charts";
import { GridList, GridListItem } from "@senvenli/react/collection";
import { ColorSwatch } from "@senvenli/react/color";
import { DateField } from "@senvenli/react/date";
import { Avatar, AvatarGroup, Badge, Heading, Icon, Kbd, Text } from "@senvenli/react/display";
import { ProgressBar, Spinner } from "@senvenli/react/feedback";
import { Input } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { SegmentedControl } from "@senvenli/react/navigation";
import { Checkbox, Switch } from "@senvenli/react/selection";
import { familyTitle } from "../../lib/manifest";

export type Family = {
  family: string;
  count: number;
  /** The titles of the family's components, in reading order. */
  names?: string[];
};

/** What a family is for, in one line. */
const ABOUT: Record<string, string> = {
  display: "Text, media and status: the pieces every screen starts with.",
  action: "Buttons, links and toggles, with one press model on every device.",
  layout: "Stack, grid and split primitives that space content from tokens.",
  feedback: "Progress, loading and empty states that say what is going on.",
  form: "Fields with their label, help and error already wired up.",
  selection: "Pick one, pick many or pick from a list, keyboard first.",
  overlay: "Dialogs, menus and toasts that manage focus and dismissal.",
  navigation: "Tabs, sidebars and steppers for moving around an app.",
  date: "Calendars and fields that follow the visitor's locale.",
  color: "Swatches, fields and a picker for choosing a color.",
  collection: "Tables, lists and trees with selection built in.",
  charts: "From a sparkline to a radar, drawn in the theme's own colors.",
};

/** How many component names a row shows before "+N": more where the row is wide (from 1024px). */
const NAMES_SHOWN = 4;
const NAMES_SHOWN_WIDE = 6;

/** A few live components per family, sized for the panel at the end of a row. */
const PREVIEW: Record<string, React.ReactNode> = {
  display: (
    <Stack direction="horizontal" space="space-150">
      <AvatarGroup aria-label="Team">
        <Avatar name="Ada Lovelace" src="/avatars/01.webp" />
        <Avatar name="Sofia Marin" src="/avatars/05.webp" />
        <Avatar name="Alan Turing" />
      </AvatarGroup>
      <Badge tone="success">Paid</Badge>
      <Badge tone="warning">Pending</Badge>
    </Stack>
  ),
  action: (
    <Stack direction="horizontal" space="space-100">
      <Button variant="primary" size="small">
        Save
      </Button>
      <Button size="small">Cancel</Button>
      <CopyButton value="" aria-label="Copy" />
    </Stack>
  ),
  layout: (
    <div className="grid w-full max-w-52 grid-cols-4 gap-ds-075">
      {["col-span-2", "", "", "", "col-span-3"].map((span, index) => (
        <span key={index} className={`h-6 rounded-ds-small bg-ds-surface-raised ${span}`} />
      ))}
    </div>
  ),
  feedback: (
    <div className="flex w-full max-w-56 items-end gap-ds-200">
      <div className="min-w-0 flex-1">
        <ProgressBar label="Uploading" value={64} />
      </div>
      <Spinner aria-label="Loading" />
    </div>
  ),
  form: (
    <div className="w-full max-w-56">
      <Input label="Email" placeholder="you@example.com" size="small" />
    </div>
  ),
  selection: (
    <Stack space="space-100">
      <Switch defaultSelected size="small">
        Notifications
      </Switch>
      <Checkbox defaultSelected size="small">
        Remember me
      </Checkbox>
    </Stack>
  ),
  overlay: (
    <span className="flex items-center gap-ds-100 rounded-ds-medium bg-ds-surface-overlay px-ds-150 py-ds-100 text-body-small text-ds-text-subtle shadow-ds-overlay">
      <Icon name="search" size="small" color="subtle" />
      Search
      <Kbd isModifier />
      <Kbd>K</Kbd>
    </span>
  ),
  navigation: (
    <div className="flex">
      <SegmentedControl
        label="View"
        defaultValue="overview"
        items={[
          { id: "overview", label: "Overview" },
          { id: "activity", label: "Activity" },
          { id: "files", label: "Files" },
        ]}
      />
    </div>
  ),
  date: (
    <div className="w-full max-w-44">
      <DateField label="Due" defaultValue={new CalendarDate(2026, 3, 18)} />
    </div>
  ),
  color: (
    <Stack direction="horizontal" space="space-075">
      {["#996a00", "#c2410c", "#6e56cf", "#1268ae", "#2f6f4f"].map((color) => (
        <ColorSwatch key={color} color={color} name={color} />
      ))}
    </Stack>
  ),
  collection: (
    <div className="w-full max-w-56">
      <GridList aria-label="People">
        <GridListItem id="ada" title="Ada Lovelace" description="Owner" />
      </GridList>
    </div>
  ),
  charts: (
    <div className="w-full max-w-56">
      <Sparkline aria-label="Orders this week" data={[4, 6, 5, 8, 7, 10, 9, 12]} />
    </div>
  ),
};

/**
 * Every family as a row of one stack: its name and count, what it is for, the first few of its components by name,
 * and a panel of live components at the end. The whole row is the link (the name carries it, stretched over the row
 * in styles.css), so the live panel is inert and hidden from assistive tech. Three columns from 1024px (name, text,
 * panel), two from 640px (text, panel); under 640px a row is text alone, since the panel would be too narrow for a
 * whole component and is never shown cut off.
 */
export function Families({ families }: { families: Family[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-ds-100 rounded-ds-xlarge bg-ds-surface-sunken p-ds-100 sm:p-ds-200">
      {families.map(({ family, count, names = [] }) => {
        return (
          <li
            key={family}
            className="home-family relative grid min-w-0 items-center gap-x-ds-300 gap-y-ds-150 rounded-ds-large bg-ds-surface-raised p-ds-200 sm:grid-cols-[minmax(0,1fr)_15rem] sm:p-ds-250 lg:grid-cols-[11rem_minmax(0,1fr)_19rem] lg:gap-x-ds-400"
          >
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-ds-150 gap-y-ds-025 lg:flex-col lg:justify-start">
              <Heading level={3} size="heading-medium">
                <Link href={`/docs/components#family-${family}`} variant="subtle">
                  {familyTitle(family)}
                </Link>
              </Heading>
              <Text size="body-small" tone="subtle">{`${count} ${count === 1 ? "component" : "components"}`}</Text>
            </div>
            <div className="flex min-w-0 flex-col gap-ds-150 sm:col-start-1 lg:col-start-2">
              {ABOUT[family] ? <Text elementType="p">{ABOUT[family]}</Text> : null}
              {names.length > 0 ? (
                <div className="flex flex-wrap items-center gap-ds-075">
                  {names.slice(0, NAMES_SHOWN_WIDE).map((name, index) => (
                    <span key={name} className={index < NAMES_SHOWN ? "inline-flex" : "inline-flex max-lg:hidden"}>
                      <Badge>{name}</Badge>
                    </span>
                  ))}
                  {names.length > NAMES_SHOWN ? (
                    <span className="lg:hidden">
                      <Text size="body-small" tone="subtle">{`+${names.length - NAMES_SHOWN} more`}</Text>
                    </span>
                  ) : null}
                  {names.length > NAMES_SHOWN_WIDE ? (
                    <span className="max-lg:hidden">
                      <Text size="body-small" tone="subtle">{`+${names.length - NAMES_SHOWN_WIDE} more`}</Text>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div
              aria-hidden
              inert
              className="home-family-preview pointer-events-none flex min-h-24 min-w-0 items-center justify-center self-stretch rounded-ds-medium bg-ds-surface-sunken p-ds-150 max-sm:hidden sm:col-start-2 sm:row-span-2 sm:row-start-1 lg:col-start-3 lg:row-span-1"
            >
              {PREVIEW[family] ?? null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
